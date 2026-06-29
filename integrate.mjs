// Integrate generated materials into src/data/materials/generated.ts
//
//   node scripts/integrate.mjs <input.json> [--append]
//
// <input.json> may be either an array of Material objects, or the workflow
// result shape { items: [{ material, verdict, concept }] }.
// Assigns stable ids, marks source:'generated', validates themes/ELDiB ids,
// and drops titles that duplicate the 316 existing materials (or each other).

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const THEME_IDS = new Set([
  'selbstwahrnehmung','kommunikation','beziehungsaufbau','kooperation','fremdwahrnehmung',
  'achtsamkeit','konfliktloesung','bewegung','spiel-spass','resilienz','selbstwertgefuehl',
  'impulskontrolle','emotionen','identitaet','stressbewaeltigung','ressourcen','kreativitaet',
  'grenzen','disziplin','mobbing','motivation','gerechtigkeit','gewalt','medien','sexualitaet','etep-epu',
])
const ELDIB_MAX = { V: 33, K: 35, SOZ: 41, KOG: 62 }
const AGE = new Set(['C1','C2','C3','C4','ES'])
const TYPE = new Set(['Aktivitéit','ganz Stonn','Projet','Hospi'])
const MODE = new Set(['Individuel','Grupp','Klass'])
const WS_KINDS = new Set(['heading','instruction','question','lines','box','checklist','table','scale'])

function sanitizeWorksheet(w) {
  if (!w || !Array.isArray(w.blocks)) return undefined
  const blocks = w.blocks
    .filter((b) => b && WS_KINDS.has(b.kind))
    .map((b) => ({
      kind: b.kind,
      text: typeof b.text === 'string' ? b.text : undefined,
      lines: Number.isFinite(b.lines) ? Math.min(12, Math.max(1, b.lines)) : undefined,
      items: Array.isArray(b.items) ? b.items.filter((x) => typeof x === 'string') : undefined,
    }))
  if (!blocks.length) return undefined
  return { title: w.title || undefined, intro: w.intro || undefined, blocks }
}

function slug(s) {
  return String(s).toLowerCase()
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .replace(/[ëèé]/g,'e').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
}
function normTitle(s) {
  return String(s).toLowerCase()
    .replace(/^toolbox backup/,'')
    .replace(/_\d+$/,'')
    .replace(/[^a-z0-9äöüëéè]+/g,' ')
    .trim()
}
function validEldib(id) {
  const m = /^(V|K|SOZ|KOG)-(\d+)$/.exec(id)
  return m && Number(m[2]) >= 1 && Number(m[2]) <= ELDIB_MAX[m[1]]
}

// --- load inputs (one or more JSON files and/or directories) ---
const argv = process.argv.slice(2)
const append = argv.includes('--append')
const inputs = argv.filter((a) => !a.startsWith('--'))
if (!inputs.length) { console.error('usage: integrate.mjs <input.json|dir> [more…] [--append]'); process.exit(1) }

// Expand any directory to its *.json files. A crashed/limited generation run
// leaves several batch-*.json behind — pointing at the directory recovers ALL
// of them in one call, so finished batches are never lost.
const files = []
for (const p of inputs) {
  let st
  try { st = statSync(p) } catch { console.error(`skip (not found): ${p}`); continue }
  if (st.isDirectory()) {
    for (const f of readdirSync(p).sort()) if (f.endsWith('.json')) files.push(join(p, f))
  } else { files.push(p) }
}

// One corrupt batch must not sink the rest: skip unparseable files, keep going.
let incoming = []
for (const f of files) {
  let raw
  try { raw = JSON.parse(readFileSync(f, 'utf8')) }
  catch (e) { console.error(`skip (bad JSON): ${f} — ${e.message}`); continue }
  const arr = Array.isArray(raw) ? raw : raw.items || raw.materials || []
  for (const x of arr) { const m = x && x.material ? x.material : x; if (m) incoming.push(m) }
}
if (!incoming.length) { console.error('no materials found in inputs'); process.exit(1) }
console.error(`Loaded ${incoming.length} material(s) from ${files.length} file(s).`)

// existing titles (dedup reference)
const existingTitles = new Set()
const refTitles = join(ROOT, 'reference/existing-titles.txt')
if (existsSync(refTitles)) {
  for (const line of readFileSync(refTitles, 'utf8').split('\n')) {
    const t = normTitle(line); if (t) existingTitles.add(t)
  }
}

// keep existing generated (append mode) by re-reading the JSON sidecar
const sidecar = join(ROOT, 'src/data/materials/generated.data.json')
let kept = []
if (append && existsSync(sidecar)) kept = JSON.parse(readFileSync(sidecar, 'utf8'))

const seen = new Set(kept.map((m) => normTitle(m.title)))
const usedIds = new Set(kept.map((m) => m.id))
let dropped = 0
const cleaned = []

for (const m of incoming) {
  if (!m.title || !m.shortDescription || !Array.isArray(m.ablauf) || m.ablauf.length < 1) { dropped++; continue }
  const nt = normTitle(m.title)
  if (existingTitles.has(nt) || seen.has(nt)) { dropped++; continue }
  seen.add(nt)

  let id = slug(m.title) || 'material'
  let base = id, n = 2
  while (usedIds.has(id)) id = `${base}-${n++}`
  usedIds.add(id)

  cleaned.push({
    id,
    title: m.title.trim(),
    author: m.author || undefined,
    ageLevels: (m.ageLevels || []).filter((a) => AGE.has(a)),
    type: (m.type || []).filter((t) => TYPE.has(t)),
    participants: (m.participants || []).filter((p) => p && MODE.has(p.mode)),
    themes: (m.themes || []).filter((t) => THEME_IDS.has(t)).slice(0, 3),
    tags: (m.tags || []).map((t) => String(t).replace(/^#/,'')).filter(Boolean),
    shortDescription: m.shortDescription.trim(),
    ablauf: m.ablauf.filter((p) => p && p.text).map((p) => ({ title: p.title || undefined, text: p.text })),
    duration: m.duration || undefined,
    materialsNeeded: m.materialsNeeded || undefined,
    remark: m.remark || undefined,
    etepStufen: (m.etepStufen || []).filter((s) => s >= 1 && s <= 5),
    eldibGoals: [...new Set((m.eldibGoals || []).filter(validEldib))],
    attachments: m.attachments || undefined,
    worksheet: sanitizeWorksheet(m.worksheet),
    language: m.language === 'lb' ? 'lb' : 'de',
    source: 'generated',
  })
}

const all = [...kept, ...cleaned]
// sidecar (machine-readable accumulation) + the TS module
writeFileSync(sidecar, JSON.stringify(all, null, 2) + '\n')
const ts = `import type { Material } from '../../types/material'

// AI-generated library materials (one-time generation; offline thereafter).
// Auto-written by scripts/integrate.mjs — do not edit by hand.
// Each is a draft for human review before classroom use.
export const generated: Material[] = ${JSON.stringify(all, null, 2)}
`
writeFileSync(join(ROOT, 'src/data/materials/generated.ts'), ts)

console.log(`Integrated ${cleaned.length} new (dropped ${dropped} dup/invalid). Total generated: ${all.length}.`)
