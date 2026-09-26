# Hub der Annexe Junglinster

Der Hub mit allen Apps – nur für das Team der Annexe Junglinster. Er ist aufgebaut wie der gemeinsame
Stand „Unified“ (Branch `claude/wizardly-bohr-99r7kg`), aber auf die Annexe zugeschnitten:

- **Nur ein Team.** Beim Konto gibt es keine Team-Wahl. Stellen gibt es keine, ebenso kein „Weitergeben“ an eine
  andere Stelle. Die Teamliste hat keine Team-Spalte. Alle sehen alle Apps.
- **Ohne Datenbank und ohne Journal (ISA-Ansicht).** Nirgends steht „ISA“. Alle anderen Apps aus Unified sind dabei,
  auch der Befundbericht, den in Unified nur das Diagnostique-Team sieht.
  - Ausnahme sind die offiziellen Formulartexte: die Maßnahmen der Fiche de renseignement und die Empfehlungen im
    ELDiB-Generator.
- **Das Klassenbuch der Annexe mit allen Daten und Einstellungen**, dazu die Verbesserungen aus Unified (siehe
  [klassenbuch/README.md](klassenbuch/README.md)).

## Was auf O:\ kommt

In einen eigenen Ordner, z. B. `O:\Annexe-Hub\`, kommt Folgendes. Alles andere sind Quelltexte.

```
index.html            ← leitet zu hub.html weiter
hub.html              ← der Hub (Konten, Schüler-Dossiers, Einsatzplan, Verwaltung, Apps)
hub-apps.js           ← das App-Verzeichnis (Titel, Team, Apps)
apps/
  klassenbuch.html    ← Klassenbuch der Annexe
  screening.html      ← Befundbericht (13 Tests und Fragebögen)
  eldib-generator.html, ds-motor.js
  toolbox.html, toolbox-index.js   ← Toolbox mit Skills-Kurs
  lernen.html
  pathologien.html    ← klinisches Nachschlagewerk (früher SAVOIR im Klassenbuch)
  kb-screening-texte.js, versionen.js
```

Konten, Daten und die Team-Datei legt der Hub selbst an: `konten/`, `daten/`, `teams/Annexe Junglinster/`.

## Die Apps

| App | Woher | Bauen / holen |
|---|---|---|
| Klassenbuch | `klassenbuch/quellen/` (hier) | `node klassenbuch/quellen/build-merged.cjs` |
| Befundbericht | Repository `PEI-and-Compl-ment-` | `node update-apps.cjs screening` |
| ELDiB-Generator | Repository `Eldib-Pleni-re` | `node update-apps.cjs eldib` |
| Toolbox und Skills-Kurs | Repository `ISA-APP`, Branch `claude/focused-galileo-e2s63b` | `node update-apps.cjs toolbox` |
| Lernen | `lern-app/` (hier) | `python3 lern-app/baue.py`, danach `node annexe-apps.cjs` |
| Pathologien | `SAVOIR.html` (hier) | `node annexe-apps.cjs` |

Zu den Befehlen:

- `update-apps.cjs` ruft danach selbst `annexe-apps.cjs` auf. Dieses Skript entfernt „ISA“ aus den sichtbaren Texten
  der Toolbox, auch aus den komprimierten Daten (Autor der Materialien), den Material-PDFs und den Dateinamen der
  Downloads. Außerdem baut es die Pathologien ohne Web-Schriften und mit „Pathologien“ im Kopf.
- In der Lern-App ersetzt `annexe-apps.cjs` „ISA“ und „CDSE Hub“ in den eingebetteten Modulen (Fallbeispiele, Quiz,
  Tabelle der CDSE-Angebote). `lern-app/module/` bleibt wie in Unified, wo „ISA“ ein Team ist – deshalb nach jedem
  `python3 lern-app/baue.py` wieder `node annexe-apps.cjs` ausführen. Prüfen: `node hub-quellen/tests/annexe-apps.js`.
- Den Hub baut `python3 hub-quellen/baue-hub.py` und schreibt `hub.html`.

## Verbesserungen aus Unified übernehmen

**Hub.** Die Dateien in `hub-quellen/` sind dieselben wie in Unified, mit diesen Ausnahmen:

- **`annexe.py`** gibt es nur hier. Das ist der Zuschnitt auf die Annexe; er läuft bei jedem Bau am Ende.
- **`baue-hub.py`**: Die Schritte „8) Annexe Junglinster“ am Ende bleiben stehen.
- **`datenbank.js` und `datenbank.css`** werden nicht übernommen.
- **`README.md`** hat oben einen Hinweis auf die Annexe.
- **`tests/annexe*.js`** gibt es nur hier (`annexe-weiche.js` lässt die Tests aus Unified gegen die Annexe laufen).

Neue Fassungen der übrigen Dateien einfach hineinkopieren und `python3 hub-quellen/baue-hub.py` ausführen. Passt eine
Ersetzung in `annexe.py` nicht mehr zum neuen Wortlaut, bricht der Bau mit einer Meldung ab. Er prüft außerdem, dass
nirgends „ISA“, „Journal“ oder „CDSE Hub“ sichtbar wird.

**Achtung, Korrekturen aus der Durchsicht (September 2026):** Sie stecken in gemeinsamen Dateien und fehlen in Unified
noch – `arbeit.js`, `arbeit.css`, `berichte.js`, `begleitplan.js`, `screening.js`, `kompass.css`, `konto3.js` und
`hub.vor-arbeit.html`. Einfaches Hineinkopieren aus Unified würde sie zurücknehmen. Deshalb zuerst nach Unified
übernehmen oder beim Kopieren zusammenführen; `git log --oneline -- hub-quellen/<datei>` zeigt, was hier dazukam.

**Klassenbuch.** `klassenbuch/quellen/` ist die Fassung der Annexe (mit den eingebauten Daten). Verbesserungen aus
Unified werden hier eingearbeitet, nicht darübergeschrieben.

**`hub-apps.js`** ist die eigene Fassung der Annexe.

**Toolbox.** Sie kommt aus einem eigenen Branch von `ISA-APP` (`claude/focused-galileo-e2s63b`) mit dem
überarbeiteten Skills-Kurs. Neuerungen aus Unified (`claude/wizardly-bohr-99r7kg`) dort hineinmergen, dann
`node update-apps.cjs toolbox`.

## Daten

- **Alles bleibt lokal.** Die Daten liegen im Browser des PCs und verschlüsselt im Hub-Ordner (`daten/`). Es gibt
  keine Cloud, keine Telemetrie und keine Web-Schriften.
- **Speicherschlüssel und Formate bleiben unverändert** (`klassebuch_*`, `anwesenheit_v1`, `cdse_dossier_db`,
  Team-Datei `klassebuch-shared-v1`, `cdse-*`). Vorhandene Daten des Klassenbuchs lädt es weiter.
- **Schülerdaten in den Hub holen:** Hub → Schüler → Hinweis „Schülerdaten aus dem Klassenbuch“ →
  **Zuordnen und übernehmen**. Einträge, Réunion-Beiträge, Wochenziele, Helfernetz und frühere Screenings kommen
  verlustfrei ins verschlüsselte Dossier. Im Klassenbuch bleibt alles unverändert.
- **Wichtig:** Hubs, die als Datei geöffnet werden, teilen sich am selben PC den Speicher des Browsers. An einem PC
  deshalb nur diesen Hub benutzen, nicht zusätzlich einen anderen CDSE-Hub, sonst mischen sich die App-Daten.

## Tests

Die Tests brauchen einen Webserver im Hauptordner, z. B. `npx http-server . -p 8099 -s`.

```bash
node hub-quellen/tests/annexe.js              # Hub der Annexe: ein Team, ohne Datenbank/Journal, Teamliste, Übernahme der Klasse
node hub-quellen/tests/annexe-korrekturen.js  # Hub: Korrekturen aus der Durchsicht (Dialoge, Datum, Fiche, Berichte, Konto)
node hub-quellen/tests/annexe-apps.js         # Lernen und Pathologien: kein „ISA“, Markierung, keine Platzhalter
node klassenbuch/tests/rundgang.cjs           # Klassenbuch: Rundgang
node klassenbuch/tests/fehler.cjs             # Klassenbuch: zwei Geräte, Team-Datei, Wochenziele, nichts löschen beim Start
node klassenbuch/tests/heute.cjs              # Klassenbuch: Heute-Tafel
node klassenbuch/tests/layout.cjs             # Klassenbuch: Anwesenheit auf Laptop, Tablet, Handy
node klassenbuch/tests/korrekturen.cjs        # Klassenbuch: Korrekturen aus der Durchsicht
```

Die übrigen Tests in `hub-quellen/tests/` stammen aus Unified. Sie setzen teils mehrere Teams, Stellen, das Journal
oder die Datenbank voraus. Aufruf über den Adapter, der die Team-Wahl überspringt (im Ordner `hub-quellen`):
`node tests/annexe-weiche.js tests/begleitplan.js`.

- **Vollständig bestanden:** `berichte`, `begleitplan`, `bedienung`, `entwicklung`,
  `fristen`, `kompass`, `kindmodus`, `lernen`, `screening-ds`, `sperre`, `tageskarte`, `verlauf`, `gleichzeitig`.
- **Nur zum Teil passend:** alle anderen.
