#!/usr/bin/env node
/* =====================================================================
   Annexe-Anpassung der Apps im Ordner apps/
   ---------------------------------------------------------------------
   Diese Fassung des Hubs gehört nur dem Team der Annexe Junglinster.
   Die Apps kommen aus den gemeinsamen Quellen (update-apps.cjs); dieses
   Skript passt sie danach an – wiederholbar, jedes Mal vom Stand der Datei aus:

   1. Pathologien (apps/pathologien.html) aus SAVOIR.html bauen: ohne
      Aufruf zu Google Fonts (nichts geht ins Netz), mit den eingebetteten
      Schriften des Hubs statt der fehlenden Web-Schriften; im Kopf
      „Pathologien“ wie im Hub statt „SAVOIR“.
   2. Toolbox (apps/toolbox.html): sichtbare Bezeichnungen ohne „ISA“.
      Interne Kennungen und Speicherschlüssel bleiben unverändert.
   3. Lernen (apps/lernen.html): Module ohne „ISA“ und „CDSE Hub“. Die Quellen
      in lern-app/ teilt die Annexe mit Unified – deshalb erst hier, und nach
      jedem „python3 lern-app/baue.py“ dieses Skript wieder ausführen.

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
  // Sichtbarer Name wie im Hub: „Pathologien“ statt „SAVOIR“ (Kopf, Brotkrumen, Hinweis unten, Vorlese-Probe)
  s = ersetze(s, '<span class="brand-logo">SAVOIR</span>', '<span class="brand-logo">Pathologien</span>', 'Kopfzeile', z);
  s = ersetze(s, '<a id="bc-home-1">SAVOIR</a>', '<a id="bc-home-1">Pathologien</a>', 'Brotkrumen Liste', z);
  s = ersetze(s, '<a id="bc-home-2">SAVOIR</a>', '<a id="bc-home-2">Pathologien</a>', 'Brotkrumen Artikel', z);
  s = ersetze(s, '<p><strong>SAVOIR</strong> ist ein klinisches Reflexionswerkzeug',
    '<p>Die App <strong>Pathologien</strong> ist ein klinisches Reflexionswerkzeug', 'Hinweis unten', z);
  s = ersetze(s, 'Dies ist eine Vorlese-Probe von SAVOIR.', 'Dies ist eine Vorlese-Probe.', 'Vorlese-Probe', z);
  var body = s.slice(s.indexOf('<body'), s.indexOf('<script', s.indexOf('<body')));
  if (/\bSAVOIR\b/.test(body)) { console.error('✗ ' + z + ': „SAVOIR“ noch sichtbar'); fehler++; }
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

  /* Materialien, Arbeitsblätter und das PDF-Modul liegen gzip-komprimiert in der Datei (`H4sI…` in
     Backticks). Dort genauso ersetzen und wieder packen – sonst stünde „ISA“ weiter als Autor der
     Materialien, in den Material-PDFs und in den Dateinamen der Downloads. */
  var zlib = require('zlib');
  var ERSATZ = [
    ['"author":"ISA-Toolbox"', '"author":"CDSE Toolbox"'],     // Autor der Materialien
    ['SePAS oder ISA-Team', 'SePAS oder CDSE-Team'],           // Blatt „Nachgespräch nach einer Krise“
    ['`ISA · MATERIAL`', '`CDSE · MATERIAL`'],                 // Material-PDF: Kopf
    ['`ISA-App`', '`CDSE Toolbox`'],                           // Material-PDF: Autor
    ['`ISA-App · ', '`CDSE Toolbox · '],                       // Material-PDF: Fußzeile (ältere Fassung)
    ['`ISA-Material_', '`Material_'],                          // Dateiname Material-PDF
    ['`ISA-Arbeitsblatt_', '`Arbeitsblatt_']                   // Dateiname Arbeitsblatt-PDF
  ];
  var bloecke = 0, geaendert = 0, restGz = [];
  s = s.replace(/`(H4sI[A-Za-z0-9+/=]+)`/g, function (ganz, b64) {
    bloecke++;
    var alt = zlib.gunzipSync(Buffer.from(b64, 'base64')).toString('utf8'), neu = alt;
    ERSATZ.forEach(function (e) { neu = neu.split(e[0]).join(e[1]); });
    (neu.match(/.{0,50}\bISA\b.{0,50}/g) || []).forEach(function (t) { restGz.push(t); });
    if (neu === alt) return ganz;
    geaendert++;
    return '`' + zlib.gzipSync(Buffer.from(neu, 'utf8'), { level: 9 }).toString('base64') + '`';
  });
  if (!bloecke) { console.error('✗ ' + z + ': keine komprimierten Daten gefunden'); fehler++; }
  if (restGz.length) { console.error('✗ ' + z + ': noch „ISA“ in komprimierten Daten: ' + restGz.slice(0, 8).join(' | ')); fehler++; }
  schreib(z, s);
  var rest = (s.match(/[`'"][^`'"\n]{0,200}\bISA\b[^`'"\n]{0,200}[`'"]/g) || []).filter(function (t) { return !/^[`'"][A-Za-z0-9+/=]{40,}/.test(t); });
  if (rest.length) { console.error('✗ ' + z + ': noch „ISA“ in Texten: ' + rest.join(' | ')); fehler++; }
  else console.log('✓ ' + z + ': keine sichtbaren „ISA“-Bezeichnungen mehr (' + bloecke + ' komprimierte Blöcke geprüft, ' + geaendert + ' angepasst)');
})();

/* ---------- 3. Lernen ohne „ISA“ und „CDSE Hub“ ---------- */
(function () {
  var z = 'apps/lernen.html', s = lies(z), zlib = require('zlib');
  /* Die Module liegen gzip-komprimiert in <script id="lern-daten"> (lern-app/baue.py). In Unified ist „ISA“ ein
     Team, deshalb bleiben lern-app/module/*.json unverändert und es wird hier ersetzt. Sinn und richtige
     Quiz-Antworten bleiben gleich. */
  var ERSATZ = [
    // Übertragung: Fall „Mara und zwei Erwachsene“ und die Fallfrage im Quiz
    ['verbringt jede Pause bei der ISA, erzählt ihr', 'verbringt jede Pause bei der Kollegin aus dem ambulanten Team, erzählt ihr'],
    ['Die ISA findet, der Klassenlehrer', 'Die Kollegin findet, der Klassenlehrer'],
    ['der Klassenlehrer findet, die ISA verwöhne sie', 'der Klassenlehrer findet, die Kollegin verwöhne sie'],
    ['feste Gesprächszeiten bei der ISA statt jeder Pause', 'feste Gesprächszeiten bei der Kollegin statt jeder Pause'],
    ['in jeder Pause die ISA auf:', 'in jeder Pause die Kollegin aus dem ambulanten Team auf:'],
    ['Die ISA hält ihn für zu streng, er hält die ISA für zu nachgiebig', 'Die Kollegin hält ihn für zu streng, er hält sie für zu nachgiebig'],
    ['Die ISA übernimmt alle Gespräche mit Mara', 'Die Kollegin übernimmt alle Gespräche mit Mara'],   // falsche Antwort, bleibt falsch
    ['dass die ISA sie verwöhnt', 'dass die Kollegin sie verwöhnt'],                               // falsche Antwort, bleibt falsch
    // Inklusion in Luxemburg: Tabelle „Angebote des CDSE im Überblick“
    ['["ISA","Begleitung von Schülerinnen', '["Ambulante Begleitung","Begleitung von Schülerinnen'],
    // Bio-psycho-sozial, Deeskalation, Gesprächsführung, Abwehr und Coping
    ['Lehrkräfte, Educateurs und ISA kennen', 'Lehrkräfte, Educateurs und das ambulante Team kennen'],
    ['eine Kollegin aus dem ISA-Team des CDSE', 'eine Kollegin aus dem ambulanten Team des CDSE'],
    ['Der ISA-Mitarbeiter spricht sie', 'Der Mitarbeiter des ambulanten Teams spricht sie'],
    ['Im Gespräch mit der ISA stellt sich heraus', 'Im Gespräch mit dem ambulanten Team stellt sich heraus'],
    ['Die Lehrerin bespricht mit der ISA, was', 'Die Lehrerin bespricht mit dem ambulanten Team, was'],
    // Beobachten und Dokumentieren
    ['Im CDSE Hub gibt es dafür', 'Im Hub gibt es dafür']
  ];
  var ZEICHEN = /\bISA\b|CDSE[ -]Hub/;
  var m = /(<script type="application\/octet-stream" id="lern-daten">)([A-Za-z0-9+/=]+)(<\/script>)/.exec(s);
  if (!m) { console.error('✗ ' + z + ': eingebettete Module nicht gefunden'); fehler++; return; }
  var alt = zlib.gunzipSync(Buffer.from(m[2], 'base64')).toString('utf8'), neu = alt, anzahl = 0;
  ERSATZ.forEach(function (e) {
    var n = neu.split(e[0]).length - 1;
    if (!n && neu.indexOf(e[1]) < 0) { console.error('✗ ' + z + ': nicht gefunden – ' + e[0]); fehler++; }
    anzahl += n; neu = neu.split(e[0]).join(e[1]);
  });
  var rest = neu.match(new RegExp('.{0,50}(' + ZEICHEN.source + ').{0,50}', 'g')) || [];
  if (rest.length) { console.error('✗ ' + z + ': noch „ISA“ oder „CDSE Hub“ in den Modulen: ' + rest.slice(0, 8).join(' | ')); fehler++; }
  if (neu !== alt) {
    s = s.slice(0, m.index) + m[1] + zlib.gzipSync(Buffer.from(neu, 'utf8'), { level: 9 }).toString('base64') + m[3] + s.slice(m.index + m[0].length);
    schreib(z, s);
  }
  // Rest der Seite (ohne eingebettete Schriften und Module)
  var seite = s.replace(/(id="lern-daten">)[A-Za-z0-9+/=]+/, '$1').replace(/base64,[A-Za-z0-9+/=]+/g, '');
  var restSeite = seite.match(new RegExp('.{0,50}(' + ZEICHEN.source + ').{0,50}', 'g')) || [];
  if (restSeite.length) { console.error('✗ ' + z + ': noch „ISA“ oder „CDSE Hub“ auf der Seite: ' + restSeite.slice(0, 8).join(' | ')); fehler++; }
  if (!rest.length && !restSeite.length) console.log('✓ ' + z + ': kein „ISA“ und kein „CDSE Hub“ mehr (' + anzahl + ' Stellen angepasst)');
})();

/* ---------- Hub-Wächter in die Apps, die in einem eigenen Tab laufen können ----------
   hub-quellen/hub-waechter.js: Eingaben dort halten den Hub offen, seine Sperre deckt die App ab, nach dem
   Abmelden verlässt der Tab die App. Eingebettet im Hub tut der Wächter nichts. Zwischen den Marken wird er bei
   jedem Lauf erneuert; das Klassenbuch bekommt ihn beim Bauen (build-merged.cjs). */
(function () {
  var w = lies('hub-quellen/hub-waechter.js').trim();
  var M = '<!--cdse-hub-waechter-->', block = M + '<script>\n' + w + '\n</script>' + M;
  ['apps/toolbox.html', 'apps/lernen.html', 'apps/pathologien.html', 'apps/screening.html', 'apps/eldib-generator.html'].forEach(function (z) {
    var s = lies(z), a = s.indexOf(M), neu;
    if (a >= 0) {
      var e = s.indexOf(M, a + M.length);
      if (e < 0) { console.error('✗ ' + z + ': Marke des Hub-Wächters ohne Ende'); fehler++; return; }
      neu = s.slice(0, a) + block + s.slice(e + M.length);
    } else {
      var i = s.lastIndexOf('</body>');
      if (i < 0) { console.error('✗ ' + z + ': kein </body> für den Hub-Wächter'); fehler++; return; }
      neu = s.slice(0, i) + block + '\n' + s.slice(i);
    }
    if (neu !== s) schreib(z, neu);
  });
  console.log('✓ Hub-Wächter in Toolbox, Lernen, Pathologien, Befundbericht und ELDiB');
})();

if (fehler) { console.error(fehler + ' Fehler'); process.exit(1); }
