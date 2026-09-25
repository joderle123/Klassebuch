# Quelltexte des CDSE Hub

`hub.html` im Hauptordner wird aus diesen Dateien gebaut – nicht von Hand ändern.

| Datei | Inhalt |
|---|---|
| `hub.vor-arbeit.html` | Grundgerüst des Hubs (Seitenleiste, Kacheln, Anleitung, Hub-Skript) |
| `konto3.js` | Konten, Anmeldung, verschlüsselter Tresor |
| `team.js` | Gemeinsamer Bereich: verschlüsselte Schülerdossiers, Rechte, Einsatzpläne |
| `arbeit.js`, `arbeit.css` | Oberfläche: Schülerliste, Dossier (Überblick, Fiche, Entwicklung & Ziele, Einträge mit Vorfall-/Krisenprotokoll …), Einsatzplan, Team, Verwaltung |
| `fiche.js` + `fiche/vorlage.docx` | Fiche de renseignement lesen (Upload) und ausfüllen (Download); die leere Vorlage wird beim Bauen eingebettet |
| `datenbank.js`, `datenbank.css` | Datenbank-Bereich (nur Responsables und Verwaltung) – optional |
| `screening.js`, `screening-bogen.js`, `screening.css` | Screening im Dossier (Beobachtungsbogen, keine Diagnose) und Übersicht aller Schüler; übernimmt auch frühere Screenings aus dem alten Klassenbuch |
| `kb-uebernahme.js` | Assistent auf der Schülerseite: Einträge, Wochenziele, Helfernetz und frühere Screenings aus Klassenbuch und Journal verlustfrei ins Hub-Dossier übernehmen |
| `kb-texte.cjs` | erzeugt `apps/kb-screening-texte.js` (Wortlaut der alten Klassenbuch-Aussagen, für die Übernahme und zum Nachlesen) aus einem Galileo-Stand mit SAVOIR: `node hub-quellen/kb-texte.cjs <index.html oder SAVOIR.html>` – eingefrorener Stand, nur nötig, falls sich die alten Texte ändern |

Bauen: `python3 hub-quellen/baue-hub.py` → schreibt `hub.html` (anderes Ziel: Umgebungsvariable `CDSE_HUB_ZIEL`).

Tests (Playwright, Chromium) liegen in `tests/`; sie erwarten einen Webserver auf Port 8099, der den Hauptordner ausliefert
(`npx http-server . -p 8099 -s`), und legen nur erfundene Personen an.
