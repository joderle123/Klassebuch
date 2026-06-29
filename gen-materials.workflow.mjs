// ---------------------------------------------------------------------------
// Lean, crash-safe ISA material generator (Workflow tool script).
//
// WHY THIS EXISTS: the earlier run lost ~601k tokens of work because the
// pipeline crashed on a null agent result (session limit) and discarded even
// the batches that HAD succeeded. This version cannot do that:
//
//   * Disk is the source of truth, not the return value. Each generation agent
//     WRITES its batch to <outDir>/batch-NN.json with the Write tool BEFORE it
//     returns. A mid-run session-limit / crash leaves every finished batch on
//     disk to be picked up later.
//   * NO per-item LLM verification. scripts/integrate.mjs already validates
//     themes / ELDiB ids / age / type / participants / worksheet and drops
//     duplicates MECHANICALLY — cheaper and deterministic. These materials are
//     drafts for human review anyway.
//   * The script only collects status strings and null-guards everything
//     (.filter(Boolean)); it never dereferences an agent result.
//
// RUN (after the session limit resets — see scripts/GENERATION.md):
//   Workflow({ scriptPath: 'scripts/gen-materials.workflow.mjs',
//              args: { batches: 6, perBatch: 4, outDir: 'tmp/gen-batches' } })
// THEN integrate everything produced (recovers a partial run too):
//   node scripts/integrate.mjs tmp/gen-batches --append
// ---------------------------------------------------------------------------

export const meta = {
  name: 'gen-isa-materials',
  description: 'Generate ISA library materials into per-batch JSON files on disk (lean, crash-safe, no LLM verify)',
  phases: [{ title: 'Generieren', detail: 'one agent per (Thema × Altersstufe) batch — each writes batch-NN.json' }],
}

const A = typeof args === 'string'
  ? (() => { try { return JSON.parse(args) } catch { return {} } })()
  : ((typeof args === 'object' && args) ? args : {})
const PER_BATCH = Math.max(1, Math.min(8, A.perBatch || 4))
const N_BATCHES = Math.max(1, Math.min(40, A.batches || 20))
const OUT_DIR = String(A.outDir || 'tmp/gen-batches').replace(/\/+$/, '')

// Coverage grid: spread batches across Thema × Altersstufe × Typ so the library
// broadens and batches rarely overlap (integrate.mjs dedups whatever remains).
const THEMES = [
  'selbstwahrnehmung', 'kommunikation', 'beziehungsaufbau', 'kooperation', 'fremdwahrnehmung',
  'achtsamkeit', 'konfliktloesung', 'resilienz', 'selbstwertgefuehl', 'impulskontrolle',
  'emotionen', 'identitaet', 'stressbewaeltigung', 'kreativitaet', 'grenzen',
  'mobbing', 'motivation', 'gerechtigkeit', 'medien', 'spiel-spass',
]
const AGES = [['C1', 'C2'], ['C2', 'C3'], ['C3', 'C4'], ['C4', 'ES'], ['ES']]
const TYPES = ['Aktivitéit', 'ganz Stonn', 'Projet']

// Condensed source-of-truth schema so each agent is self-contained (no file reads).
const SCHEMA_DOC = `interface Material {
  title: string                 // prägnant, deutsch, EINZIGARTIG
  author?: string
  ageLevels: ('C1'|'C2'|'C3'|'C4'|'ES')[]
  type: ('Aktivitéit'|'ganz Stonn'|'Projet'|'Hospi')[]
  participants: { mode:'Individuel'|'Grupp'|'Klass', note?:string }[]
  themes: string[]              // 1–3 ids aus: selbstwahrnehmung kommunikation beziehungsaufbau
                                //   kooperation fremdwahrnehmung achtsamkeit konfliktloesung bewegung
                                //   spiel-spass resilienz selbstwertgefuehl impulskontrolle emotionen
                                //   identitaet stressbewaeltigung ressourcen kreativitaet grenzen
                                //   disziplin mobbing motivation gerechtigkeit gewalt medien sexualitaet etep-epu
  tags: string[]                // 4–8, ohne '#'
  shortDescription: string      // 2–4 Sätze
  ablauf: { title?:string, text:string }[]   // 3–5 Phasen, konkrete anleitende Texte
  duration?: string
  materialsNeeded?: string
  remark?: string
  etepStufen: (1|2|3|4|5)[]
  eldibGoals: string[]          // 6–14 gültige ids: V-1..V-33, K-1..K-35, SOZ-1..SOZ-41, KOG-1..KOG-62
  worksheet?: { title?:string, intro?:string, blocks: {
      kind:'heading'|'instruction'|'question'|'lines'|'box'|'checklist'|'table'|'scale',
      text?:string, lines?:number, items?:string[] }[] }   // v.a. für ältere/ES sinnvoll
  language: 'de'                // immer "de"
}`

function batchFile(n) {
  return `${OUT_DIR}/batch-${String(n).padStart(2, '0')}.json`
}

function promptFor(a) {
  const file = batchFile(a.n)
  return [
    `Du bist Autor:in für die ISA-Toolbox (Luxemburg, sozial-emotionales Lernen, Förderpädagogik ETEP/ELDiB).`,
    `Erzeuge ${PER_BATCH} NEUE, voneinander unabhängige Förder-Materialien auf Deutsch — praxistauglich und sofort einsetzbar.`,
    `Schwerpunkt-Thema: "${a.theme}".  Zielstufen (ageLevels): ${JSON.stringify(a.ages)}.  Bevorzugter Typ: "${a.type}".`,
    ``,
    `Jedes Material ist ein JSON-Objekt nach DIESEM Schema (Feldnamen exakt so):`,
    SCHEMA_DOC,
    ``,
    `Qualität:`,
    `- ablauf mit klaren Phasen (Einstieg / Hauptteil / Abschluss) und konkreten Anleitungen, nicht nur Stichworten.`,
    `- eldibGoals fachlich passend zum Thema und zur Altersstufe wählen (gültige ids!).`,
    `- duration, materialsNeeded und remark (z. B. Sicherheits-/Differenzierungshinweis) konkret füllen.`,
    `- titles dürfen sich NICHT wiederholen und keine offensichtlichen Standard-Dubletten sein.`,
    `- source NICHT setzen — das vergibt das Integrationsskript.`,
    ``,
    `WICHTIG: Führe KEINE Shell-Kommandos oder Skripte aus (kein node, kein integrate.mjs, keine eigene Validierung) — das macht hinterher das Hauptprogramm. Schreibe NUR die JSON-Datei und gib die OK-Zeile zurück. Wähle einzigartige, spezifische Titel (keine generischen Standard-Titel).`,
    `  ${file}`,
    `Reines JSON in die Datei (kein Markdown, keine Code-Fences). Gib danach NUR diese eine Zeile zurück:`,
    `  OK ${file}`,
  ].join('\n')
}

phase('Generieren')

const assignments = []
for (let i = 0; i < N_BATCHES; i++) {
  assignments.push({
    n: i + 1,
    theme: THEMES[i % THEMES.length],
    ages: AGES[i % AGES.length],
    type: TYPES[i % TYPES.length],
  })
}

log(`Generiere ${N_BATCHES} Batches × ${PER_BATCH} = ${N_BATCHES * PER_BATCH} Material-Entwürfe → ${OUT_DIR}/`)

// parallel() is a barrier, but every batch is independent and — crucially —
// has already persisted its file before resolving, so the barrier only gates
// the final summary, never the saved work.
const results = await parallel(assignments.map((a) => () =>
  agent(promptFor(a), { label: `gen:${a.theme}/${a.ages[0]}`, phase: 'Generieren' })
))

const reported = results.filter(Boolean)
log(`${reported.length}/${assignments.length} Batches gemeldet. Integrieren mit:  node scripts/integrate.mjs ${OUT_DIR} --append`)

return {
  requested: assignments.length,
  reported: reported.length,
  perBatch: PER_BATCH,
  outDir: OUT_DIR,
  integrateCmd: `node scripts/integrate.mjs ${OUT_DIR} --append`,
  statuses: reported,
}
