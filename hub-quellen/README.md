# Quelltexte des CDSE Hub

`hub.html` im Hauptordner wird aus diesen Dateien gebaut – nicht von Hand ändern.

| Datei | Inhalt |
|---|---|
| `hub.vor-arbeit.html` | Grundgerüst des Hubs (Seitenleiste, Kacheln, Anleitung, Hub-Skript) |
| `konto3.js` | Konten, Anmeldung, verschlüsselter Tresor |
| `team.js` | Gemeinsamer Bereich: verschlüsselte Schülerdossiers, Rechte, Einsatzpläne |
| `arbeit.js`, `arbeit.css` | Oberfläche: Schülerliste, Dossier (Überblick, Fiche, Entwicklung & Ziele, Einträge mit Vorfall-/Krisenprotokoll, Übergabeblatt mit Kompass und Begleitplan …), Einsatzplan, Team, Verwaltung |
| `fiche.js` + `fiche/vorlage.docx` | Fiche de renseignement lesen (Upload) und ausfüllen (Download); die leere Vorlage wird beim Bauen eingebettet |
| `datenbank.js`, `datenbank.css` | Datenbank-Bereich (nur Responsables und Verwaltung) – optional |
| `screening.js`, `screening-bogen.js`, `screening.css` | Screening im Dossier (Beobachtungsbogen, keine Diagnose) und Übersicht aller Schüler; übernimmt auch frühere Screenings aus dem alten Klassenbuch. Ist der DS ausgefüllt, sind gleichbedeutende Aussagen im neuen Bogen schon beantwortet (Zuordnung `ausDs` im Bogen, markiert „DS“) |
| `kompass.js`, `kompass-wissen.js`, `kompass.css` | Reiter „Kompass“ im Dossier: liest das Profil (Diagnosen und Verdacht aus DS, Datenbank und vom Team, Arbeitshypothesen und Anlass aus dem DS, Screenings, Warnsignale, Vorfälle, ELDiB-Stufen, Lebenslage) und zeigt dazu Verstehen, Umgang, Konkretes, Was eher schadet, Krise, Zusammenarbeit, Material in der Fassung für die Schulstufe und Lernmodule – jeder Punkt mit „Warum?“ und nummerierten Fachquellen. Die Wissensbasis (`kompass-wissen.js`) nennt Quellen nur über Schlüssel aus `lern-app/quellen.js`; beim Bauen werden genau diese Literaturangaben eingebettet. Datenbank-Angaben sieht wie in der Datenbank nur, wer Responsable oder Verwaltung ist. Keine Diagnose |
| `begleitplan.js`, `begleitplan.css` | Reiter „Begleitplan“ im Dossier: leitet die Schritte der Begleitung jedes Mal neu aus dem Dossier ab (Fiche, DS, ELDiB, Screening, Kompass, Einträge, Vorfälle) – fünf Phasen (Ankommen, Verstehen, Planen, Umsetzen, Überprüfen) plus „Sofort“ bei Warnsignalen, je Schritt Grund, Fälligkeit, passende Aktion und Material. „Als Nächstes“ zeigt den wichtigsten offenen Schritt. Automatisch erledigt, was sich aus den Daten ablesen lässt; das Team entscheidet erledigt, später, passt nicht, wählt bis zu drei Fokusziele aus der ELDiB, ergänzt eigene Schritte und trägt alle sechs Wochen eine Überprüfung mit Kennzahlen ein (gespeichert nur die Entscheidungen, `d.begleitplan`) |
| `berichte.js`, `berichte.css` | Berichte und Arztbriefe (im Kompass): PDF, Word (.docx) oder eingefügten Text auslesen – PDF ohne Bibliothek (Flate, Objekt-Streams, ToUnicode, echte Zeichenbreiten); Scans enthalten keinen Text. Erkennt Diagnosen, Verdacht und Verneinung („kein Hinweis auf …“), vorausgewählt nur im Diagnose-Zusammenhang (nie bei Familienangehörigen), dazu ICD-Codes, Medikation, Datum, Absender und Empfehlungen. Übernommen wird nur, was das Team abhakt: Profile in den Kompass („laut Arztbrief …“), Empfehlungen als Schritte in den Begleitplan. Die Originaldatei liegt auf Wunsch verschlüsselt in `gemeinsam/anhaenge` (eine Datei je Anhang, damit die Dossiers klein bleiben) |
| `kb-uebernahme.js` | Assistent auf der Schülerseite: Einträge, Wochenziele, Helfernetz und frühere Screenings aus Klassenbuch und Journal verlustfrei ins Hub-Dossier übernehmen |
| `kb-texte.cjs` | erzeugt `apps/kb-screening-texte.js` (Wortlaut der alten Klassenbuch-Aussagen, für die Übernahme und zum Nachlesen) aus einem Galileo-Stand mit SAVOIR: `node hub-quellen/kb-texte.cjs <index.html oder SAVOIR.html>` – eingefrorener Stand, nur nötig, falls sich die alten Texte ändern |

Bauen: `python3 hub-quellen/baue-hub.py` → schreibt `hub.html` (anderes Ziel: Umgebungsvariable `CDSE_HUB_ZIEL`).

Tests (Playwright, Chromium) liegen in `tests/`; sie erwarten einen Webserver auf Port 8099, der den Hauptordner ausliefert
(`npx http-server . -p 8099 -s`), und legen nur erfundene Personen an.
