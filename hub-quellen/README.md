# Quelltexte des CDSE Hub

`hub.html` im Hauptordner wird aus diesen Dateien gebaut – nicht von Hand ändern.

| Datei | Inhalt |
|---|---|
| `hub.vor-arbeit.html` | Grundgerüst des Hubs (Seitenleiste, Kacheln, Anleitung, Hub-Skript) |
| `konto3.js` | Konten, Anmeldung, verschlüsselter Tresor; Zugriff auf den Hub-Ordner mit Wiederholung bei kurz belegten Dateien und Schreibsperren (`sperren/<ziel>.lock` mit Lebenszeichen, siehe unten) |
| `team.js` | Gemeinsamer Bereich: verschlüsselte Schülerdossiers, Rechte, Einsatzpläne; sicheres Ändern gemeinsamer Dateien und Schlüssel erneuern (siehe unten) |
| `arbeit.js`, `arbeit.css` | Oberfläche: Schülerliste, Dossier (Überblick, Fiche, Entwicklung & Ziele, Einträge mit Vorfall-/Krisenprotokoll und Wiedervorlage, Übergabeblatt mit Kompass und Begleitplan …), Einsatzplan, Team, Verwaltung. Auf der Startseite „Fällig diese Woche“: je Kind eine Zeile mit dem Wichtigsten (dringend, fällig, in den nächsten sieben Tagen) – nur eigene Fälle und eigene Fristen, ohne Passwortabfrage, Warnsignale ohne Inhalt |
| `fiche.js` + `fiche/vorlage.docx` | Fiche de renseignement lesen (Upload) und ausfüllen (Download); die leere Vorlage wird beim Bauen eingebettet |
| `datenbank.js`, `datenbank.css` | Datenbank-Bereich (nur Responsables und Verwaltung) – optional |
| `screening.js`, `screening-bogen.js`, `screening.css` | Screening im Dossier (Beobachtungsbogen, keine Diagnose) und Übersicht aller Schüler; übernimmt auch frühere Screenings aus dem alten Klassenbuch. Ist der DS ausgefüllt, sind gleichbedeutende Aussagen im neuen Bogen schon beantwortet (Zuordnung `ausDs` im Bogen, markiert „DS“) |
| `kompass.js`, `kompass-wissen.js`, `kompass.css` | Reiter „Kompass“ im Dossier: liest das Profil (Diagnosen und Verdacht aus DS, Datenbank und vom Team, Arbeitshypothesen und Anlass aus dem DS, Screenings, Warnsignale, Vorfälle, ELDiB-Stufen, Lebenslage) und zeigt dazu Verstehen, Umgang, Konkretes, Was eher schadet, Krise, Zusammenarbeit, Material in der Fassung für die Schulstufe und Lernmodule – jeder Punkt mit „Warum?“ und nummerierten Fachquellen. Die Wissensbasis (`kompass-wissen.js`) nennt Quellen nur über Schlüssel aus `lern-app/quellen.js`; beim Bauen werden genau diese Literaturangaben eingebettet. Datenbank-Angaben sieht wie in der Datenbank nur, wer Responsable oder Verwaltung ist. Keine Diagnose |
| `begleitplan.js`, `begleitplan.css` | Reiter „Begleitplan“ im Dossier: leitet die Schritte der Begleitung jedes Mal neu aus dem Dossier ab (Fiche, DS, ELDiB, Screening, Kompass, Einträge, Vorfälle) – fünf Phasen (Ankommen, Verstehen, Planen, Umsetzen, Überprüfen) plus „Sofort“ bei Warnsignalen, je Schritt Grund, Fälligkeit, passende Aktion und Material. „Als Nächstes“ zeigt den wichtigsten offenen Schritt. Automatisch erledigt, was sich aus den Daten ablesen lässt; das Team entscheidet erledigt, später, passt nicht, wählt bis zu drei Fokusziele aus der ELDiB, ergänzt Fristen und eigene Schritte (Schnellauswahl wie „Eltern zurückrufen“, zuständige Person, Datum; auch als Wiedervorlage beim Eintrag) und trägt alle sechs Wochen eine Überprüfung mit Kennzahlen ein (gespeichert nur die Entscheidungen, `d.begleitplan`) |
| `berichte.js`, `berichte.css` | Berichte und Arztbriefe (im Kompass): PDF, Word (.docx) oder eingefügten Text auslesen – PDF ohne Bibliothek (Flate, Objekt-Streams, ToUnicode, echte Zeichenbreiten); Scans enthalten keinen Text. Erkennt Diagnosen, Verdacht und Verneinung („kein Hinweis auf …“), vorausgewählt nur im Diagnose-Zusammenhang (nie bei Familienangehörigen), dazu ICD-Codes, Medikation, Datum, Absender und Empfehlungen. Übernommen wird nur, was das Team abhakt: Profile in den Kompass („laut Arztbrief …“), Empfehlungen als Schritte in den Begleitplan. Die Originaldatei liegt auf Wunsch verschlüsselt in `gemeinsam/anhaenge` (eine Datei je Anhang, damit die Dossiers klein bleiben) |
| `tageskarte.js`, `tageskarte.css` | Tageskarte im Begleitplan (Check-in/Check-out): ein bis drei Ziele in der Sprache des Kindes (vorbelegt aus den Fokuszielen), Tagesabschnitte, je Abschnitt 0, 1 oder 2 Punkte, Stimmung am Morgen, Rückmeldung am Nachmittag, Tagesziel in Prozent und Belohnung; Balken der letzten Tage, Wochenkarte zum Drucken (auf Wunsch mit Unterschrift der Eltern). Der Begleitplan nutzt die Karte: Verstärkerplan erledigt, „Fortschritt beobachten“ läuft, nach zwei schwachen Wochen „Ziele kleiner machen“, nach vier guten Wochen „ausschleichen“; Kennzahl in der Überprüfung (`d.tageskarte`, gestrichene Ziele bleiben lesbar) |
| `verlauf.js`, `verlauf.css` | „Verlauf auf einen Blick“ oben im Reiter „Profil & Verlauf“: Zeitachse (3, 6 oder 12 Monate) mit Bahnen für Tageskarte (Tage und Wochenschnitt, Tagesziel), Vorfälle je Woche (Schwere, Time-out im Tooltip), Screening-Ergebnisse, Gespräche und Beobachtungen; Maßnahmen als nummerierte Linien mit Legende (Fokusziele und Tageskarte aus dem Protokoll, Überprüfungen, Berichte mit Medikation, Weitergaben). Darunter „Vorher – nachher“ je Maßnahme (vier Wochen davor und danach, ab zwei Wochen) mit dem Hinweis, dass das eine Richtung zeigt und keinen Beweis. Im Überblick eine Zeile zu den Vorfällen mit Sprung zum Verlauf. Liest nur |
| `kindmodus.js`, `kindmodus.css` | Kindmodus (S1–S3), Karte im Begleitplan: ein Vollbild für das Kind ohne Menüs und ohne Dossierdaten (Spitzname, Spielfigur, Wochenziel in Kindersprache). Ziel-Quest: Kind und Erwachsene schätzen den Tag ein (0–2), Sterne = Einschätzung der Erwachsenen plus Extra-Stern bei gleicher Einschätzung, Baum, Burg oder Raumschiff wachsen in 12 Stufen, Belohnung ab dem Wochenziel. Stopp-Ampel: 12 gezeichnete Szenen, Thermometer und Körpersignale, Rot anhalten, Gelb eine Strategie des Teams wählen, Grün sofort üben (Atem-Raumschiff mit sechs Atemzügen pro Minute, zählen, weggehen, Pausenkarte, Hilfe holen, drücken, Wasser, eigene), danach Thermometer. Beenden nur mit vierstelligem Code (nur Prüfwert im Sitzungsspeicher), nach dem Neuladen zuerst die Code-Eingabe. Gespeichert in `d.kindmodus` (Einstellungen, Sterne je Tag, geübte Runden, keine Freitexte des Kindes); Zeile im Überblick, Kennzahl in der Überprüfung, Bahn im Verlauf |
| `kb-uebernahme.js` | Assistent auf der Schülerseite: Einträge, Wochenziele, Helfernetz und frühere Screenings aus Klassenbuch und Journal verlustfrei ins Hub-Dossier übernehmen |
| `kb-texte.cjs` | erzeugt `apps/kb-screening-texte.js` (Wortlaut der alten Klassenbuch-Aussagen, für die Übernahme und zum Nachlesen) aus einem Galileo-Stand mit SAVOIR: `node hub-quellen/kb-texte.cjs <index.html oder SAVOIR.html>` – eingefrorener Stand, nur nötig, falls sich die alten Texte ändern |

Bauen: `python3 hub-quellen/baue-hub.py` → schreibt `hub.html` (anderes Ziel: Umgebungsvariable `CDSE_HUB_ZIEL`).

## Mehrere Personen gleichzeitig (ohne Server)

Alle arbeiten auf demselben Ordner (O:\). Damit keine Änderung verloren geht:

- **Schreibsperre** je gemeinsamer Datei (`sperren/dossier-<id>.lock`, `mitglieder`, `schluessel`, `teamliste`, `anhang-…`): lesen – eigene Sperre schreiben – kurz warten – nachlesen. Wer arbeitet, gibt alle 4 s ein Lebenszeichen (`puls`). Eine Sperre, die sich 15 s nicht ändert (gemessen mit der eigenen Uhr, nicht mit der Uhrzeit anderer PCs), gilt als verwaist. Vor dem Schreiben prüft der Hub, ob er die Sperre noch hat – ein zugeklappter Laptop überschreibt beim Aufwachen nichts.
- **Stempel und Nachprüfen** (`sicherAendern` in `team.js`): immer den neuesten Stand lesen, Änderung anwenden, mit `rev`, `sid` und `kette` stempeln, schreiben, nachlesen. Fehlt die eigene Fassung, wird die Änderung auf den neuen Stand noch einmal angewendet.
- **Wiederholen** bei kurz belegten Dateien (`nochmal` in `konto3.js`), statt eine Fehlermeldung zu zeigen.
- **Liste**: Nur Dossiers mit neuer Änderungszeit oder Größe werden neu gelesen. Im offenen Dossier prüft der Hub alle 20 s den Datei-Stand und zeigt „… hat dieses Dossier gerade geändert – Neuen Stand anzeigen“.
- **Schlüssel erneuern** (Verwaltung, nach „Zugang entziehen“): neue Generation im Schlüsselring (`gen`), ältere Schlüssel mit dem neuen verschlossen in `alt`, alle Dateien werden neu verschlüsselt; die anderen PCs übernehmen den neuen Schlüssel beim nächsten Speichern. Im Dateikopf steht die Generation, mit der verschlüsselt wurde.
- **`HUB_STAND`** (`team.js`) erhöhen, wenn sich das Schreiben gemeinsamer Dateien ändert: Ältere, noch offene Hub-Fenster speichern dann nicht mehr, sondern bitten um Neuladen (F5).

## Konten mit Startcode (Verwaltung)

Verwaltung → Teamliste → **„Konten vorbereiten“**: Für jede ausgewählte Person ohne Konto legt der Hub
`konten/<id>.json` ohne Schlüssel an (Name, Team, Funktion, Responsable aus der Teamliste) und darin den gemeinsamen
Schlüssel des Schülerbereichs, verschlossen mit einem Schlüssel aus dem **Startcode** (12 Zeichen, PBKDF2 200 000
Runden, `start` im Konto). Die Codes stehen nur auf den gedruckten Zetteln (drei pro A4-Seite) – gespeichert werden
sie nirgends; „Neuer Code“ macht den alten ungültig, ein Code gilt 60 Tage. Beim ersten Anmelden klickt die Person auf
ihren Namen, gibt den Code ein und wählt ihr eigenes Passwort: Der Browser erzeugt das Schlüsselpaar (gleiche Konto-ID),
trägt die Person selbst in den Schlüsselring ein (`per:'startcode'`, Rolle aus der Teamliste, „Verwaltung“ nie
automatisch) und entfernt den verschlossenen Schlüssel aus der Datei. Nach einem Schlüsselwechsel passt ein offener
Startcode nicht mehr zum Ring: Das Konto entsteht trotzdem, freigeschaltet wird dann wie gewohnt von der Verwaltung.

## Sperre, Formulare und Entwürfe

- **Sperren**: nach `sperreNachMinuten` (hub-apps.js) ohne Eingabe oder über Konto-Menü → **Hub sperren**. Als Aktivität
  zählen nur echte Eingaben (Maus, Tastatur, Touch – auch in eingebetteten Apps), nicht das Speichern einer App im
  Hintergrund. Eine Minute vorher erscheint „Noch da?“. Gesperrt öffnet die Adresse (`#/…`) keine Seite; der Tab-Speicher
  der Sitzung hat ein Lebenszeichen (`lebt`, alle 30 s) – nach einem Browser-Neustart braucht es wieder das Passwort.
- **Formulare beim Sperren**: Offene Dialoge bekommen das Ereignis `cdse-schliessen`. Fangen sie es ab (`preventDefault`,
  so die Dialoge des Arbeitsbereichs), werden sie nur ausgeblendet und nach dem Entsperren wieder gezeigt – ein halb
  geschriebener Text geht nicht verloren. Beim Abmelden werden sie verworfen.
- **Dialoge** (`dialog()` in arbeit.js): Während des Speicherns sind die Knöpfe gesperrt und Esc wirkt nicht; geschriebenen
  Text verwirft Abbrechen/Esc erst nach einer Rückfrage; die Knöpfe bleiben bei langen Formularen sichtbar.
- **Entwurf je Dossier**: Der angefangene Eintrag bleibt beim Reiterwechsel, beim Wechsel zu einem anderen Kind und bei
  „Neuen Stand anzeigen“ erhalten (nur im Arbeitsspeicher, beim Abmelden weg). Gezeichnet wird ein Dossier nur, wenn es
  noch das gewählte ist – bei schnellem Wechseln landet nichts im falschen Dossier.
- **Rollen und Zugang**: Freischalten, Entziehen und Rollen prüfen das eigene Recht auf dem neuesten Stand von
  `mitglieder.cdse`; es bleibt immer mindestens eine Verwaltung. Entzogene Konten stehen dort unter `entzogen` und
  erscheinen nicht mehr unter „Warten auf Freischaltung“ (wieder freischalten nur durch die Verwaltung).
- **Tageskarte zu zweit**: Das Formular schickt den Stand beim Öffnen mit (`basis`); gespeichert wird nur, was geändert
  wurde (je Ziel und Abschnitt) – morgens und nachmittags eingetragene Punkte bleiben beide erhalten.
- **Datum**: Kalendertage (Einträge, Status, Tageskarte …) in Ortszeit, nicht in UTC.

## Tests

Tests (Playwright, Chromium) liegen in `tests/`; sie erwarten einen Webserver auf Port 8099, der den Hauptordner ausliefert
(`npx http-server . -p 8099 -s`), und legen nur erfundene Personen an.

`tests/bedienung.js` prüft Sperren (Menü, Adresse, Formular übersteht die Sperre), Rückfrage vor dem Verwerfen, Entwurf
je Dossier, schnelles Wechseln zwischen Kindern, Suche, Tageskarte zu zweit, Einschätzung in mehreren Bereichen,
Einsatzplan-Entwurf und Datum in Ortszeit.

`tests/gleichzeitig.js` prüft den Betrieb mit vielen Personen: `tests/netzordner.js` stellt einen echten Ordner auf der
Festplatte als gemeinsames Laufwerk für mehrere Browser-Kontexte (= PCs) bereit – mit Netz-Verzögerung, Schreiben über
Tauschdatei und gelegentlich belegten Dateien. Einstellbar: `PERSONEN` (gleichzeitige PCs, ab 12), `KONTEN` (insgesamt, 120),
`DOSSIERS` (je PC, 25), `WACKELIG` (Anteil belegter Zugriffe, 0.03), `NUR=grundlage` (nur Konten, Freischalten, gleichzeitiges Schreiben).
