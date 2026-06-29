export const meta = {
  name: 'improve-worksheets',
  description: 'Review every generated worksheet; keep the good ones, rewrite the weak ones',
  phases: [{ title: 'Arbeitsblätter prüfen', detail: 'behalten oder neu schreiben' }],
}

const A = typeof args === 'string' ? JSON.parse(args) : args || {}
const batchDir = A.batchDir
const outDir = A.outDir
const count = A.count || 0
if (!batchDir || !outDir || !count) {
  log('FEHLER: batchDir/outDir/count fehlen')
  return { error: 'missing args' }
}

phase('Arbeitsblätter prüfen')

function prompt(idx) {
  const nn = String(idx).padStart(2, '0')
  const inPath = `${batchDir}/batch-${nn}.json`
  const outPath = `${outDir}/wsout-${nn}.json`
  return `Du bist Förderpädagog:in und gestaltest druckbare Schüler-Arbeitsblätter für die ISA-Bibliothek (Luxemburg, sozial-emotionales Lernen, ETEP/ELDiB). Aufgabe: jedes Arbeitsblatt im Batch INHALTLICH prüfen und – wenn es dünn, zu kurz oder schwach ist – durch ein besseres ersetzen.

SCHRITT 0 – Versuche zuerst, die Ausgabedatei zu lesen (Read-Tool): ${outPath}
Wenn sie schon existiert und gültiges JSON mit einem "results"-Array enthält, ist dieser Batch BEREITS fertig: mache NICHTS weiter, antworte nur "batch ${nn}: bereits fertig" und stoppe. Sonst weiter mit Schritt 1.

SCHRITT 1 – Lies die Eingabedatei mit dem Read-Tool:
${inPath}
Sie enthält bis zu 6 Materialien mit: id, title, language, ageLevels, themes, eldibGoals, type, shortDescription, ablauf (gekürzt), materialsNeeded und dem aktuellen worksheet.

SCHRITT 2 – Beurteile jedes worksheet. Ein GUTES Arbeitsblatt:
- ist an die konkrete Aktivität (ablauf) UND die Ziele angebunden – es lässt das Kind das Erlebte festhalten/reflektieren/üben (nicht generisch).
- ist altersgerecht:
  · C1/C2 (klein): 3–5 kurze, große Aufgaben, viel MALEN (box), einfache Wörter, kurze Prompts, eine bildhafte Skala (Gefühls-/Wetter-/Farbwörter).
  · C3/C4: 4–7 Aufgaben, Mischung aus Schreibfragen (2–3 Zeilen), einer Selbsteinschätzungs-Skala und ggf. checklist/box/table.
  · C4/ES: 5–8 Aufgaben, tiefere Reflexion (3–4 Zeilen), Skala, oft eine Tabelle zum Strukturieren und eine Transfer-/Vorsatz-Frage.
- hat genug Schreibraum (Fragen 2–4 Zeilen, nicht 1) und Block-Vielfalt; nutzt heading(s) zum Gliedern.
- ist kindgerecht formuliert, selbsterklärend, in DERSELBEN Sprache wie das Material (de bleibt de, lb bleibt lb), mit klarem title + kurzem, motivierendem intro.

SCHRITT 3 – Entscheide pro Material:
- Ist das aktuelle worksheet bereits gut, reich und passend → action "keep" (NICHT neu schreiben, gute Inhalte bewahren).
- Ist es dünn (< 4 Aufgaben), zu wenig Schreibraum, generisch, unpassend oder schwach → action "improve" und liefere ein KOMPLETT neues, besseres worksheet.

Block-Typen (kind) und Felder:
- "heading": text (Abschnittstitel) · "instruction": text (kurze Anleitung)
- "question": text (Frage) + lines (Schreibzeilen, 2–4) · "lines": lines (+ optional text)
- "box": text (Label) + lines (Höhe, zum Malen/Zeichnen)
- "checklist": items[] (Häkchen-Optionen) · "scale": text + items[] (Auswahl-Skala)
- "table": text + items[] (Spaltenköpfe) + lines (Zeilenzahl)
HINWEIS zur Skala: items mit Farbwörtern (grün/gelb/orange/rot), Wetter (Sonne/Wolke/Regen/Gewitter) oder Intensität (gar nicht…sehr) werden automatisch als Icons/Smileys gezeichnet – nutze sie für Stimmungs-/Selbst-Checks.

SCHRITT 4 – Schreibe das Ergebnis mit dem Write-Tool als JSON nach:
${outPath}
Format (genau so):
{"results":[
  {"id":"<id>","action":"keep"},
  {"id":"<id>","action":"improve","worksheet":{"title":"…","intro":"…","blocks":[
    {"kind":"heading","text":"…"},
    {"kind":"question","text":"…","lines":3},
    {"kind":"scale","text":"…","items":["…","…","…"]},
    {"kind":"box","text":"…","lines":6}
  ]}}
]}
Jedes Material aus der Eingabe MUSS in results auftauchen. Gültiges JSON, nichts außer der Datei. Erfinde keine fremden Themen – bleib beim Inhalt des Materials.

SCHRITT 5 – Finale Antwort: NUR eine Zeile "batch ${nn}: <X> verbessert, <Y> behalten".`
}

const items = Array.from({ length: count }, (_, i) => i)
const summaries = await parallel(
  items.map((i) => () =>
    agent(prompt(i), { label: `ws-${String(i).padStart(2, '0')}`, phase: 'Arbeitsblätter prüfen' }),
  ),
)
const ok = summaries.filter(Boolean).length
log(`Fertig: ${ok}/${count} Batches. Ausgabe in ${outDir}/wsout-*.json`)
return { batches: count, completed: ok }
