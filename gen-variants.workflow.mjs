export const meta = {
  name: 'gen-variants',
  description: 'Author selectable setting-variants for narrative ISA materials',
  phases: [{ title: 'Varianten texten', detail: 'ein Agent pro 8er-Batch' }],
}

// args: { batchDir, outDir, count }
const A = typeof args === 'string' ? JSON.parse(args) : args || {}
const batchDir = A.batchDir
const outDir = A.outDir
const count = A.count || 0

if (!batchDir || !outDir || !count) {
  log('FEHLER: batchDir/outDir/count fehlen in args')
  return { error: 'missing args' }
}

phase('Varianten texten')

function prompt(idx) {
  const nn = String(idx).padStart(2, '0')
  const inPath = `${batchDir}/batch-${nn}.json`
  const outPath = `${outDir}/vout-${nn}.json`
  return `Du bist Pädagogik- und Sprach-Profi für die ISA-Material-Bibliothek (Luxemburg, sozial-emotionales Lernen / Förderpädagogik). Deine Aufgabe: für narrative Materialien wählbare **Setting-Varianten ("Einkleidungen")** texten – damit aus einem Material mehrere druckbare Versionen werden (z.B. ein Piraten-Rollenspiel auch als Astronauten- oder Dino-Version), OHNE die Pädagogik zu ändern.

SCHRITT 1 – Lies die Eingabedatei mit dem Read-Tool:
${inPath}
Sie enthält ein JSON-Array von bis zu 8 Materialien (Felder: id, title, language, themes, tags, shortDescription, ablauf[{title,text}], materialsNeeded, remark, worksheet{title,intro,blocks[{text,items}]}).

SCHRITT 2 – Beurteile JEDES Material: Hat es eine AUSTAUSCHBARE erzählerische EINKLEIDUNG?
- ✅ GEEIGNET = ein fiktiver Rahmen (Geschichte / Abenteuer / Rollenspiel / themenbezogenes Spiel), dessen Setting man komplett austauschen kann, ohne die Aktivität oder das Lernziel zu verändern.
  Beispiele: "Inselrettung" (→ Weltall, Lava, Arktis); "Lauschpiraten-Hörfahrt" (→ Astronauten, Urzeit-Forscher); ein Detektiv-Rahmen; eine Dschungel-Reise; ein Ritter-Abenteuer.
- ❌ NICHT GEEIGNET (dann suitable:false) = wenn das fiktive Element das LEHRMITTEL selbst ist (integrale Metapher) oder das Material abstrakt ist. Ein Austausch würde die Metapher/Aktivität zerstören.
  Beispiele die du ABLEHNEN musst: Wut als "Hitze-Regler"/"Thermometer"/"Vulkan im Bauch"; Ruhe als "Schatztruhe"; Resilienz als "Rucksack"; "Schildkröten-Trick" (Stopp-Denk-Mach); Gefühls-Barometer; Ich-Botschaften; Atemübungen; Stärkenbaum; reine Gesprächs-/Reflexionsrunden. Im Zweifel: suitable:false.

SCHRITT 3 – Für GEEIGNETE Materialien: erstelle ein "base"-Label (Emoji + Original-Setting, z.B. "🏴‍☠️ Piraten (Original)") und 2–3 alternative "settings". Jedes Setting: label (Emoji + kurzer Name, z.B. "🚀 Weltall"), description (ein Satz), und "replace"-Paare {from, to}.

REGELN für replace-Paare (SEHR WICHTIG, sonst unbrauchbar):
1. "from" MUSS ein WÖRTLICHER Teilstring sein, der TATSÄCHLICH im Material-Text vorkommt (Titel/Beschreibung/ablauf/worksheet/material/remark). Kopiere exakt – inкл. Rechtschreibung und Luxemburgisch.
2. Lege für JEDE vorkommende Beugung ein eigenes Paar an (Singular/Plural/Dativ), z.B. {"from":"Trittsteine"}, {"from":"Trittstein"}, {"from":"Steinen"}. Längere Formen zuerst (die Engine ersetzt längste zuerst, ein Durchlauf).
3. "to" in DERSELBEN SPRACHE wie die Quelle (Deutsch→Deutsch, Lëtzebuergesch→Lëtzebuergesch) und GENUS-passend, damit Artikel stimmen (das Ufer→das Festland; die Insel→die Eisscholle; der Stein→der Brocken). Schreibe "to" in natürlicher Groß-/Kleinschreibung; die Engine überträgt die Schreibung automatisch.
4. Tausche NUR Setting-/Kostüm-Wörter (den fiktiven Rahmen). Ändere NIEMALS pädagogische bzw. Kompetenz-Wörter (z.B. "Lauschen/Hören", "Kooperation", "Gefühle", "Atem", "Streit") und keine echten Requisiten in Klammern (Teppichfliesen, Reifen, Glöckchen …).
5. Wähle kindgerechte, lebendige Settings, die zur Aktivität passen (Weltall, Dinosaurier/Urzeit, Dschungel, Unterwasser/U-Boot, Arktis, Ritter/Burg, Zirkus, Wilder Westen, Märchen/Zauberwald, Wikinger). Pro Material 2–3 Stück.
6. Pro Setting ca. 5–14 Paare. Decke alle wichtigen Vorkommen ab (Titel + Beschreibung + jede ablauf-Phase + worksheet).

SCHRITT 4 – Schreibe das Ergebnis mit dem Write-Tool als JSON nach:
${outPath}
Format (genau so):
{"results":[
  {"id":"<material-id>","suitable":true,"language":"de","base":"🏴‍☠️ Piraten (Original)","settings":[
    {"label":"🚀 Astronauten","description":"…","replace":[{"from":"Piraten","to":"Astronauten"},{"from":"Hörfahrt","to":"Hör-Mission"}]},
    {"label":"🦕 Urzeit-Forscher","description":"…","replace":[{"from":"Piraten","to":"Forscher"}]}
  ]},
  {"id":"<andere-id>","suitable":false}
]}
Jedes Material aus der Eingabe MUSS in results auftauchen (entweder mit settings oder suitable:false). Gültiges JSON, nichts außer der Datei.

SCHRITT 5 – Gib als finale Antwort NUR eine Zeile zurück: "batch ${nn}: <X> geeignet von <Y>".`
}

const items = Array.from({ length: count }, (_, i) => i)
const summaries = await parallel(
  items.map((i) => () =>
    agent(prompt(i), { label: `vbatch-${String(i).padStart(2, '0')}`, phase: 'Varianten texten' }),
  ),
)

const ok = summaries.filter(Boolean).length
log(`Fertig: ${ok}/${count} Batches abgeschlossen. Ausgabe in ${outDir}/vout-*.json`)
return { batches: count, completed: ok }
