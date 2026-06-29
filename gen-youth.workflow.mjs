export const meta = {
  name: 'gen-youth',
  description: 'Generate 100 high-quality adolescent (ES) ISA materials across all youth themes',
  phases: [{ title: 'Jugend-Materialien', detail: '25 Themenbündel × 4 Materialien' }],
}

const A = typeof args === 'string' ? JSON.parse(args) : args || {}
const outDir = A.outDir
if (!outDir) {
  log('FEHLER: outDir fehlt')
  return { error: 'missing args' }
}

// 25 Themenbündel à 2 Schwerpunkte → je 4 Materialien = 100, breite Abdeckung.
const BUNDLES = [
  'Identität & Werte | Selbstwert & innerer Kritiker',
  'Körperbild & Selbstakzeptanz | Pubertät & Körperveränderung',
  'Geschlechtsidentität & LGBTQ+ | Stärken & Selbstwirksamkeit',
  'Stress & Prüfungsangst | Schlaf, Pausen & Wohlbefinden',
  'Angst & Panikgefühle verstehen | Niedergeschlagenheit/Depression erkennen & Hilfe holen',
  'Emotionsregulation für Teens | Wut & Impulskontrolle',
  'Achtsamkeit & Selbstfürsorge | Umgang mit Überforderung und Druck',
  'Selbstverletzung & Krisen – Hilfe holen | Resilienz nach Rückschlägen',
  'Trauer & Verlust | Einsamkeit & Zugehörigkeit',
  'Freundschaft & Loyalität | Konflikte fair lösen',
  'Verliebtsein & Dating | Liebeskummer & Zurückweisung',
  'Gesunde vs. toxische Beziehungen | Eifersucht & Kontrolle',
  'Konsens & Grenzen | Sexualität & Aufklärung (ES)',
  'Familie & Ablösung/Autonomie | Konflikte zu Hause',
  'Kommunikation & aktives Zuhören | Empathie & Perspektivwechsel',
  'Nein sagen & Gruppendruck | Mitläufer:in vs. Zivilcourage',
  'Social Media: Vergleich & Selbstdarstellung | Likes, Anerkennung & Selbstwert',
  'Cybermobbing | Hate Speech & Zivilcourage online',
  'Sexting, Bildrechte & Risiken | Datenschutz & digitale Identität',
  'Fake News & Meinungsbildung | Bildschirmzeit, Gaming & Online-Sucht',
  'Alkohol – Konsum & Risiken | Nikotin & Vapes',
  'Cannabis & andere Drogen | Risikoentscheidungen & Gruppendruck bei Substanzen',
  'Diskriminierung & Rassismus | Vielfalt, Vorurteile & Inklusion',
  'Mobbing in der Klasse (ES) | Demokratie, Mitbestimmung & Werte',
  'Geld, Konsum & Werbung | Zukunft, Berufsorientierung & Ziele',
]

const THEME_IDS = [
  'selbstwahrnehmung', 'kommunikation', 'beziehungsaufbau', 'kooperation', 'fremdwahrnehmung',
  'achtsamkeit', 'konfliktloesung', 'bewegung', 'spiel-spass', 'resilienz', 'selbstwertgefuehl',
  'impulskontrolle', 'emotionen', 'identitaet', 'stressbewaeltigung', 'ressourcen', 'kreativitaet',
  'grenzen', 'disziplin', 'mobbing', 'motivation', 'gerechtigkeit', 'gewalt', 'medien', 'sexualitaet',
  'liebe-beziehungen', 'koerper-selbstbild', 'psychische-gesundheit', 'sucht-praevention', 'gruppendruck',
  'diskriminierung-vielfalt', 'demokratie-engagement', 'zukunft-beruf', 'geld-konsum',
].join(', ')

phase('Jugend-Materialien')

function prompt(idx) {
  const nn = String(idx).padStart(2, '0')
  const bundle = BUNDLES[idx]
  const outPath = `${outDir}/youth-${nn}.json`
  return `Du bist erfahrene:r Förderpädagog:in/Schulpsycholog:in und gestaltest HOCHWERTIGE Unterrichtsmaterialien für JUGENDLICHE (Enseignement secondaire, ES, ca. 12–18 Jahre) in Luxemburg, für eine sozial-emotionale Lern-Bibliothek (ISA, ETEP/ELDiB). Sprache: Deutsch.

SCHRITT 0 – Versuche zuerst, die Ausgabedatei zu lesen (Read-Tool): ${outPath}
Existiert sie bereits als gültiges JSON-Array, ist dieser Batch fertig: antworte nur "batch ${nn}: bereits fertig" und stoppe. Sonst weiter.

AUFGABE: Erstelle GENAU 4 eigenständige, exzellente Materialien zu diesem Themen-Bündel:
» ${bundle} «
(2 Materialien pro Schwerpunkt, aus verschiedenen Blickwinkeln/Formaten.) Die Materialien sollen jugendgerecht, ernsthaft und respektvoll sein (KEINE kindliche Sprache), realitätsnah für Teenager, sofort einsetzbar und qualitativ hochwertig. Sie dürfen/sollen ruhig länger und tiefgehend sein.

ANFORDERUNGEN pro Material:
- Jugendgerechter, konkreter Titel (kein Kinderton).
- ageLevels: ["ES"] (bei jüngeren Teens auch ["C4","ES"]).
- type: eines/mehrere aus ["Aktivitéit","ganz Stonn","Projet"] (variiere; ganze Stunden für tiefere Themen).
- participants: realistische Einträge, z. B. [{"mode":"Klass","note":"…"},{"mode":"Grupp","note":"Kleingruppen 3–4"}].
- themes: 1–3 passende IDs NUR aus: ${THEME_IDS}
- tags: 4–8 Stichwörter, IMMER inkl. "Jugend".
- shortDescription: 3–6 Sätze, was, warum, wie – fachlich fundiert.
- ablauf: 4–6 Phasen [{title, text}] (Einstieg → Erarbeitung/Aktivität → Vertiefung/Übung → Reflexion/Transfer). Jede Phase konkret, mit Leitfragen, Beispielen, Moderationshinweisen.
- duration, materialsNeeded: realistisch.
- remark: didaktische Hinweise + Differenzierung. WICHTIG bei heiklen Themen (psych. Gesundheit, Selbstverletzung, Sucht, Sexualität, Gewalt, Diskriminierung): sensibel rahmen, Freiwilligkeit betonen, KEINE Bloßstellung, und Hilfe-Hinweis aufnehmen: "Bei Belastung/Krise: Vertrauensperson, SePAS/Schulpsychologie, Kanner- a Jugendtelefon 116 111, im Notfall 112."
- etepStufen: Teilmenge aus [3,4,5] (Jugendliche).
- eldibGoals: 4–10 GÜLTIGE IDs, eher abstraktere/höhere: V-(1..33), K-(1..35), SOZ-(1..41), KOG-(1..62) – passend zum Inhalt (für Teens v. a. V-22..33, K-26..35, SOZ-30..41, KOG-49..62).
- worksheet: ein durchdachtes, jugendgerechtes Arbeitsblatt {title, intro, blocks[]}. Nutze die Block-Typen sinnvoll und abwechslungsreich:
  · heading(text) · instruction(text) · question(text,lines 2–4) · lines(lines,+text) · box(text,lines = Platz zum Schreiben/Skizzieren) · checklist(items[]) · scale(text,items[]) · table(text,items[]=Spalten,lines=Zeilen)
  Mind. 5 Aufgaben, gegliedert mit headings, mit Selbsteinschätzungs-Skala wo passend, genug Schreibraum, an die Aktivität angebunden.

SCHRITT – Schreibe das Ergebnis mit dem Write-Tool als JSON-ARRAY (genau 4 Objekte) nach:
${outPath}
Objekt-Form: {"title","author":"ISA-Toolbox","ageLevels","type","participants","themes","tags","shortDescription","ablauf","duration","materialsNeeded","remark","etepStufen","eldibGoals","worksheet","language":"de"}
Gültiges JSON, nichts außer der Datei. (Keine id, kein source – wird später vergeben.)

ABSCHLUSS: Antworte mit EINER Zeile: "batch ${nn}: 4 Materialien zu [${bundle}]".`
}

const items = Array.from({ length: BUNDLES.length }, (_, i) => i)
const summaries = await parallel(
  items.map((i) => () =>
    agent(prompt(i), { label: `youth-${String(i).padStart(2, '0')}`, phase: 'Jugend-Materialien' }),
  ),
)
const ok = summaries.filter(Boolean).length
log(`Fertig: ${ok}/${BUNDLES.length} Bündel. Ausgabe in ${outDir}/youth-*.json`)
return { bundles: BUNDLES.length, completed: ok }
