# Lern-App des CDSE

Lernmodule für Mitarbeitende: Grundlagen, Störungsbilder, Persönlichkeit und
Muster, wirksames Handeln – mit Fallbeispielen, Abschlussquiz (bestanden ab
80 %), Lernkartei zum Wiederholen, Glossar, Suche, Lernpfaden und einer
druckbaren Teilnahmebestätigung. Der Lernstand liegt im Browser
(`cdse-lernen-v1`); im Hub gehört er zum angemeldeten Konto und wird mit dessen
Daten verschlüsselt gesichert. Niemand sonst sieht ihn.

- Inhalte: `module/<id>.json` – Format und Regeln in `LEITFADEN.md`
- Prüfen: `node lern-app/pruefen.cjs [module/<id>.json …]`
- Bauen: `python3 lern-app/baue.py` → `apps/lernen.html` (eine Datei, ohne Internet)
- Test: `node hub-quellen/tests/lernen.js` (http-server auf Port 8099 im Repo-Ordner)

Links zu Arbeitsblättern kommen aus `apps/toolbox-index.js` – nach einem
Toolbox-Update (`node update-apps.cjs toolbox`) die Lern-App neu bauen.
