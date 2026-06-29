export const meta = {
  name: 'gen-variants-more',
  description: 'Add extra setting-variants to materials that already have some',
  phases: [{ title: 'Mehr Kostüme', detail: 'je 3 zusätzliche Settings' }],
}

const A = typeof args === 'string' ? JSON.parse(args) : args || {}
const batchDir = A.batchDir
const outDir = A.outDir
const count = A.count || 0
if (!batchDir || !outDir || !count) {
  log('FEHLER: batchDir/outDir/count fehlen')
  return { error: 'missing args' }
}

phase('Mehr Kostüme')

function prompt(idx) {
  const nn = String(idx).padStart(2, '0')
  const inPath = `${batchDir}/batch-${nn}.json`
  const outPath = `${outDir}/vout-${nn}.json`
  return `Du textest zusätzliche **Setting-Varianten ("Einkleidungen")** für ISA-Materialien (Luxemburg, sozial-emotionales Lernen). Diese Materialien haben BEREITS Varianten – du sollst je 3 WEITERE, ANDERE Settings ergänzen, damit es mehr Kostüm-Auswahl gibt (z.B. zusätzlich Ritter, Zirkus, Unterwasser, Wilder Westen, Märchen-Zauberwald, Wikinger, Eisenbahn).

SCHRITT 1 – Lies die Eingabedatei mit dem Read-Tool:
${inPath}
Sie enthält bis zu 5 Materialien. Jedes hat: id, title, language, base, existingLabels (schon vergebene Setting-Namen – NICHT wiederholen!), shortDescription, ablauf, materialsNeeded, remark, worksheet, tags.

SCHRITT 2 – Erzeuge für JEDES Material genau 3 NEUE settings, die sich klar von existingLabels und voneinander unterscheiden (anderes Thema/Emoji). Jedes Setting: label (Emoji + kurzer Name), description (ein Satz), replace-Paare {from, to}.

REGELN (zwingend, sonst unbrauchbar):
1. "from" MUSS WÖRTLICH im Material-Text vorkommen (Titel/Beschreibung/ablauf/worksheet/material/remark). Exakt kopieren, inkl. Rechtschreibung/Luxemburgisch.
2. Für JEDE vorkommende Beugung ein eigenes Paar (Singular/Plural/Dativ); längere Formen zuerst.
3. "to" in DERSELBEN Sprache wie die Quelle und GENUS-passend (das Ufer→das Festland; die Insel→die Eisscholle; der Stein→der Brocken). Natürliche Groß-/Kleinschreibung; die Engine überträgt die Schreibung.
4. Tausche NUR Setting-/Kostüm-Wörter (den fiktiven Rahmen). Pädagogische bzw. Kompetenz-Wörter NIE ändern (Lauschen/Hören, Kooperation, Gefühle, Streit, Atem) und keine echten Requisiten in Klammern.
5. Kindgerecht und passend zur Aktivität. Pro Setting ca. 5–14 Paare, decke Titel + Beschreibung + jede ablauf-Phase + worksheet ab.
6. Wenn ein Material partout keine 3 sinnvollen weiteren Settings hergibt, gib so viele wie sinnvoll (mind. 1) – erfinde nichts Erzwungenes.

SCHRITT 3 – Schreibe mit dem Write-Tool als JSON nach:
${outPath}
Format (genau so; nur die NEUEN settings, base nicht nötig):
{"results":[
  {"id":"<material-id>","settings":[
    {"label":"🏰 Ritter","description":"…","replace":[{"from":"Detektive","to":"Ritter"},{"from":"Lupe","to":"Schwert"}]},
    {"label":"🎪 Zirkus","description":"…","replace":[{"from":"Detektive","to":"Artisten"}]},
    {"label":"🤿 Unterwasser","description":"…","replace":[{"from":"Detektive","to":"Taucher"}]}
  ]}
]}
Jedes Material aus der Eingabe MUSS in results auftauchen. Gültiges JSON, nichts außer der Datei.

SCHRITT 4 – Finale Antwort: NUR eine Zeile "batch ${nn}: fertig".`
}

const items = Array.from({ length: count }, (_, i) => i)
const summaries = await parallel(
  items.map((i) => () =>
    agent(prompt(i), { label: `more-${String(i).padStart(2, '0')}`, phase: 'Mehr Kostüme' }),
  ),
)
const ok = summaries.filter(Boolean).length
log(`Fertig: ${ok}/${count} Batches. Ausgabe in ${outDir}/vout-*.json`)
return { batches: count, completed: ok }
