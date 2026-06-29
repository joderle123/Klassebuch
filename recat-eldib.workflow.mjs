export const meta = {
  name: 'recat-eldib',
  description: 'Re-categorise every material\'s ELDiB goals using the official CDSE catalogue',
  phases: [{ title: 'ELDiB neu zuordnen', detail: '20 Materialien pro Agent' }],
}

const A = typeof args === 'string' ? JSON.parse(args) : args || {}
const { refPath, batchDir, outDir, count } = A
if (!refPath || !batchDir || !outDir || !count) {
  log('FEHLER: refPath/batchDir/outDir/count fehlen')
  return { error: 'missing args' }
}

phase('ELDiB neu zuordnen')

function prompt(idx) {
  const nn = String(idx).padStart(3, '0')
  const inPath = `${batchDir}/batch-${nn}.json`
  const outPath = `${outDir}/eldibout-${nn}.json`
  return `Du bist ETEP/ELDiB-Expert:in. Aufgabe: für jedes Material die ELDiB-Entwicklungsziele KORREKT neu zuordnen – streng nach den offiziellen Definitionen. Die bisherigen Zuordnungen sind oft zu lose/falsch.

SCHRITT 0 – Versuche zuerst, ${outPath} zu lesen (Read). Existiert sie als gültiges JSON mit "results", antworte nur "batch ${nn}: bereits fertig" und stoppe.

SCHRITT 1 – Lies den ELDiB-Zielkatalog (Read): ${refPath}
Das ist die offizielle CDSE-Definition jedes Ziels (FR) mit deutschem Label. Maßgeblich ist die DEFINITION, nicht das Label.

SCHRITT 2 – Lies die Materialien (Read): ${inPath}
(bis zu 20 Materialien: id, title, ageLevels, themes, shortDescription, ablauf, currentGoals)

SCHRITT 3 – Wähle für JEDES Material 4–9 Ziel-IDs, deren Definition WIRKLICH zu dem passt, was das Material tatsächlich übt/entwickelt. Regeln:
- Entwicklungsniveau ans Alter anpassen: C1/C2 = niedrige Nummern (frühe Fertigkeiten); C3/C4 = mittlere; ES/Jugendliche = hohe/abstrakte Ziele (z. B. V-22..33, K-26..35, SOZ-30..41, KOG-49..62). Ein ES-Material darf NICHT Ziele wie V-1 (Wahrnehmung) oder SOZ-4 (Spiel allein) bekommen.
- Über alle vier Bereiche (V/K/SOZ/KOG) hinweg wählen, soweit inhaltlich passend – aber nur, was wirklich vorkommt. Lieber wenige PASSENDE als viele vage.
- Nur gültige IDs: V-1..33, K-1..35, SOZ-1..41, KOG-1..62.
- currentGoals kritisch prüfen: Falsches entfernen, Passendes behalten, Fehlendes ergänzen.

SCHRITT 4 – Schreibe mit dem Write-Tool als JSON nach ${outPath}:
{"results":[{"id":"<material-id>","eldibGoals":["SOZ-31","K-27","V-25","KOG-55"]}, ...]}
Jedes Material aus der Eingabe MUSS vorkommen. Gültiges JSON, sonst nichts.

SCHRITT 5 – Finale Antwort: NUR "batch ${nn}: fertig".`
}

const items = Array.from({ length: count }, (_, i) => i)
const summaries = await parallel(
  items.map((i) => () =>
    agent(prompt(i), { label: `recat-${String(i).padStart(3, '0')}`, phase: 'ELDiB neu zuordnen' }),
  ),
)
const ok = summaries.filter(Boolean).length
log(`Fertig: ${ok}/${count} Batches.`)
return { batches: count, completed: ok }
