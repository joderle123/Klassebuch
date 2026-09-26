#!/usr/bin/env node
/* =====================================================================
   Annexe-Anpassung der Apps im Ordner apps/
   ---------------------------------------------------------------------
   Diese Fassung des Hubs gehört nur dem Team der Annexe Junglinster.
   Die Apps kommen aus den gemeinsamen Quellen (update-apps.cjs); dieses
   Skript passt sie danach an – wiederholbar, jedes Mal vom Stand der Datei aus:

   1. Pathologien (apps/pathologien.html) aus SAVOIR.html bauen: ohne
      Aufruf zu Google Fonts (nichts geht ins Netz), mit den eingebetteten
      Schriften des Hubs statt der fehlenden Web-Schriften.
   2. Toolbox (apps/toolbox.html): sichtbare Bezeichnungen ohne „ISA“.
      Interne Kennungen und Speicherschlüssel bleiben unverändert.

   Aufruf:  node annexe-apps.cjs
   ===================================================================== */
'use strict';
var fs = require('fs'), path = require('path'), cp = require('child_process');
var ROOT = __dirname;
function lies(f) { return fs.readFileSync(path.join(ROOT, f), 'utf8'); }
function schreib(f, s) { fs.writeFileSync(path.join(ROOT, f), s); }
var fehler = 0;
function ersetze(s, a, b, name, datei) {
  if (s.indexOf(a) < 0) {
    if (s.indexOf(b) >= 0) return s;          // schon angepasst
    console.error('✗ ' + datei + ': nicht gefunden – ' + name); fehler++; return s;
  }
  return s.split(a).join(b);
}

/* ---------- 1. Pathologien ---------- */
(function () {
  var q = 'SAVOIR.html', z = 'apps/pathologien.html';
  var s = lies(q);
  // Web-Schriften raus
  s = s.replace(/<link rel="preconnect" href="https:\/\/fonts\.(googleapis|gstatic)\.com"[^>]*>\s*/g, '')
       .replace(/<link href="https:\/\/fonts\.googleapis\.com\/[^"]*" rel="stylesheet">\s*/g, '');
  if (/fonts\.googleapis|fonts\.gstatic/.test(s)) { console.error('✗ ' + z + ': Google-Fonts-Verweis übrig'); fehler++; }
  // Schriften: Überschriften Manrope, Text Inter (beide eingebettet), statt Fraunces/DM Sans/IBM Plex Mono
  s = s.replace(/font-family:\s*'Fraunces',\s*serif/g, "font-family:'Manrope var','Inter var',system-ui,sans-serif")
       .replace(/font-family:\s*'DM Sans',\s*system-ui,\s*sans-serif/g, "font-family:'Inter var',system-ui,-apple-system,'Segoe UI',sans-serif")
       .replace(/font-family:\s*'IBM Plex Mono',\s*monospace/g, "font-family:'Inter var',system-ui,sans-serif");
  s = s.replace(/<title>[^<]*<\/title>/, '<title>Pathologien · Annexe Junglinster</title>');
  var kopf = '<style>/*@@FONTS-START@@*//*@@FONTS-END@@*/\n' +
    ":root{--kb-font:'Inter var',system-ui,-apple-system,'Segoe UI',sans-serif;}</style>\n";
  s = s.replace(/<\/title>/, '</title>\n' + kopf);
  schreib(z, s);
  var r = cp.spawnSync(process.execPath, [path.join(ROOT, 'design', 'embed-fonts.cjs'), path.join(ROOT, z)], { encoding: 'utf8' });
  if (r.status !== 0) { console.error(r.stderr); fehler++; }
  console.log('✓ ' + z + ' aus ' + q + ' gebaut (' + Math.round(fs.statSync(path.join(ROOT, z)).size / 1024) + ' KB)');
})();

/* ---------- 2. Toolbox ohne „ISA“ in sichtbaren Texten ---------- */
(function () {
  var z = 'apps/toolbox.html', s = lies(z);
  s = ersetze(s, '<title>Toolbox · ISA-Material-Bibliothek</title>', '<title>Toolbox · Material-Bibliothek</title>', 'Titel', z);
  s = ersetze(s, 'Toolbox (ISA-App) – Material-Bibliothek des CDSE', 'Toolbox – Material-Bibliothek des CDSE', 'Beschreibung', z);
  s = ersetze(s, '` · ISA-Material`', '` · Material`', 'Kopfzeile', z);
  s = ersetze(s, '`Geprüftes Material von CDSE / ISA-Team`', '`Geprüftes Material des CDSE`', 'Herkunft lang', z);
  s = ersetze(s, '`CDSE / ISA-Team`', '`CDSE`', 'Herkunft', z);
  s = ersetze(s, 'short:`ISA-Team`', 'short:`CDSE`', 'Herkunft kurz', z);
  s = ersetze(s, 'O:\\\\ISA-Blaetter', 'O:\\\\Annexe-Blaetter', 'Ordnerbeispiel', z);
  schreib(z, s);
  var rest = (s.match(/[`'"][^`'"\n]{0,200}\bISA\b[^`'"\n]{0,200}[`'"]/g) || []).filter(function (t) { return !/^[`'"][A-Za-z0-9+/=]{40,}/.test(t); });
  if (rest.length) { console.error('✗ ' + z + ': noch „ISA“ in Texten: ' + rest.join(' | ')); fehler++; }
  else console.log('✓ ' + z + ': keine sichtbaren „ISA“-Bezeichnungen mehr');
})();

if (fehler) { console.error(fehler + ' Fehler'); process.exit(1); }
