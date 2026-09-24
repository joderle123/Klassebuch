/* =====================================================================
   CDSE Hub — App-Verzeichnis
   ---------------------------------------------------------------------
   Das ist die EINZIGE Datei, die du ändern musst, um eine App
   hinzuzufügen. Die Apps selbst bleiben unverändert.

   In 3 Schritten:
     1. App-Datei in denselben Ordner wie hub.html legen
        (übersichtlicher: in einen Unterordner, z. B. apps/)
     2. Unten den VORLAGE-Block kopieren, Werte anpassen
     3. hub.html mit Strg+F5 neu laden

   Die ausführliche Anleitung steht im Hub unter „＋ App hinzufügen".

   Felder:
     id            kurzer Name ohne Leerzeichen, z. B. 'savoir'
     name          Anzeigename
     beschreibung  ein Satz: wofür ist die App gut?
     icon          ein Emoji
     farbe         Akzentfarbe der Kachel als #rrggbb
     bereich       Gruppe im Menü — gleicher Bereich = steht zusammen
     datei         Pfad zur App-Datei, relativ zu hub.html
     link          STATT datei: Adresse einer Webseite (öffnet neuen Tab)
     hinweis       (optional) kurzer Hinweis, z. B. was noch fehlt
     stichworte    (optional) zusätzliche Suchbegriffe

   Eine App ohne datei und ohne link erscheint als „geplant".

   HÄUFIGSTER FEHLER: das Komma nach der schließenden } vergessen.
   Keine Sorge — der Hub zeigt dir dann eine Warnung, statt leer zu
   bleiben. Die genaue Zeile siehst du in Edge mit F12 → Reiter
   „Konsole" (z. B. hub-apps.js:63 — Fehler in dieser Zeile oder davor).
   ===================================================================== */

/* Name und Untertitel des Hubs (oben links in der Seitenleiste) */
window.CDSE_HUB = {
  titel: 'CDSE Hub',
  untertitel: 'Gemeinsame Anlaufstelle'
};

window.CDSE_APPS = [

  {
    id: 'klassenbuch',
    name: 'Klassenbuch',
    beschreibung: 'Schüler, Réunionen, Anwesenheit, Dossiers und Förderziele der Annexe.',
    icon: '📘',
    farbe: '#4f5bd5',
    bereich: 'Klasse & Schüler',
    datei: 'index.html',
    stichworte: 'anwesenheit absenzen dossier réunion eldib pei stundenplan schuljahr'
  },

  {
    id: 'savoir',
    name: 'SAVOIR',
    beschreibung: 'Klinisches Wissen — Nachschlagewerk zu Diagnosen, Methoden und Hintergründen.',
    icon: '📚',
    farbe: '#b8892d',
    bereich: 'Wissen & Materialien',
    datei: 'SAVOIR.html',
    stichworte: 'wissen klinik nachschlagen diagnose methode'
  },

  {
    id: 'paedpath',
    name: 'PaedPath',
    beschreibung: 'Entwicklungsdiagnostik: Motorik, Wahrnehmung, Testverfahren und Berichte.',
    icon: '🩺',
    farbe: '#0f9d8a',
    bereich: 'Diagnostik & Förderung',
    datei: null,
    hinweis: 'React-App — muss einmal als Einzeldatei gebaut werden (Anleitung: Weg B).',
    stichworte: 'diagnostik motorik m-abc bot-2 bericht patient'
  },

  /* ---------- VORLAGE: kopieren, Kommentarzeichen entfernen, anpassen ----------
  {
    id: 'meine-app',
    name: 'Meine App',
    beschreibung: 'Wofür die App gut ist — ein Satz.',
    icon: '🧩',
    farbe: '#c0562d',
    bereich: 'Team & Organisation',
    datei: 'apps/meine-app.html'
  },
  ------------------------------------------------------------------------------ */

  /* ---------- VORLAGE für eine Webseite (öffnet in neuem Tab) ----------
  {
    id: 'schulportal',
    name: 'Schulportal',
    beschreibung: 'Online-Dienst des Ministeriums.',
    icon: '🌐',
    farbe: '#2f6fb0',
    bereich: 'Team & Organisation',
    link: 'https://www.beispiel.lu'
  },
  ---------------------------------------------------------------------- */

];
