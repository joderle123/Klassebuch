#!/usr/bin/env node
/* =====================================================================
   CDSE Hub — Texte des alten Klassenbuch-Screenings
   ---------------------------------------------------------------------
   Das alte Screening im Klassenbuch speichert nur Kürzel ('16.2',
   'mund-vs-schrift' …). Dieses Skript liest die dazugehörigen Texte aus
   einem Klassenbuch-Stand MIT SAVOIR (Galileo, z. B. dessen index.html
   oder SAVOIR.html) und schreibt apps/kb-screening-texte.js
   (window.CDSE_KB_TEXTE). Hub und Testversion des Klassenbuchs laden die
   Datei nur bei Bedarf. Die Datei ist ein eingefrorener Stand: das alte
   Screening wird nicht mehr weiterentwickelt, neu erzeugen ist nur nötig,
   wenn sich die alten Texte doch noch ändern.

   Übernommen werden nur beobachtbare Aussagen, Kategorien, Fragen zum
   Umfeld und die Fragen zu Dauer und Beeinträchtigung – keine
   Verdachtsachsen, keine Muster, keine Auswertung.

   Aufruf:  node hub-quellen/kb-texte.cjs <Pfad zu index.html oder SAVOIR.html aus dem Galileo-Branch>
   ===================================================================== */
'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var QUELLE = process.argv[2];
if (!QUELLE) { console.error('Bitte den Pfad zu einem Klassenbuch-Stand mit SAVOIR angeben (Galileo: index.html oder SAVOIR.html).'); process.exit(1); }
var ZIEL = path.join(ROOT, 'apps', 'kb-screening-texte.js');

var s = fs.readFileSync(QUELLE, 'utf8');

/* Ein JS-Objekt- oder Array-Literal ab Position i ({ oder [) herausschneiden –
   mit Rücksicht auf Zeichenketten, Vorlagen und Kommentare */
function literalAb(i) {
  var auf = s[i], zu = auf === '{' ? '}' : ']', tiefe = 0, j = i;
  for (; j < s.length; j++) {
    var c = s[j];
    if (c === '/' && s[j + 1] === '/') { j = s.indexOf('\n', j); continue; }
    if (c === '/' && s[j + 1] === '*') { j = s.indexOf('*/', j + 2) + 1; continue; }
    if (c === "'" || c === '"' || c === '`') {
      for (j++; j < s.length && s[j] !== c; j++) { if (s[j] === '\\') { j++; } }
      continue;
    }
    if (c === '{' || c === '[') { tiefe++; }
    else if (c === '}' || c === ']') { tiefe--; if (tiefe === 0) { break; } }
  }
  if (s[j] !== zu) { throw new Error('Literal ab ' + i + ' nicht geschlossen'); }
  return s.slice(i, j + 1);
}
function wert(literal) { return new Function('return (' + literal + ');')(); }
function suche(re, was) {
  var m = re.exec(s);
  if (!m) { throw new Error(was + ' nicht gefunden – ist das ein Klassenbuch-Stand mit SAVOIR (Galileo)?'); }
  return m;
}

/* 1) Globaler Pool: Kategorien und Aussagen */
var mPool = suche(/symptomPool\s*:\s*\{/g, 'SAVOIR_GLOBAL.symptomPool');
var pool = wert(literalAb(s.indexOf('{', mPool.index)));
var kategorien = {}, symptome = {};
pool.kategorien.forEach(function (k) { kategorien[k.id] = k.name; });
pool.symptome.forEach(function (x) { symptome[x.id] = [x.kategorie, x.text]; });

/* 2) Akute Aussagen (Sicherheit) und die Fragen zu Dauer/Beeinträchtigung */
var mAkut = suche(/acuteItems\s*:\s*\{/g, 'SAVOIR_TUNING.acuteItems');
var akutRoh = wert(literalAb(s.indexOf('{', mAkut.index))), akut = {};
Object.keys(akutRoh).forEach(function (id) { akut[id] = { sev: akutRoh[id].sev, label: akutRoh[id].label }; });
var mGate = suche(/gateQuestions\s*:\s*\[/g, 'SAVOIR_TUNING.gateQuestions');
var gate = wert(literalAb(s.indexOf('[', mGate.index))).map(function (f) {
  var o = {}; (f.optionen || []).forEach(function (x) { o[x.val] = x.text; });
  return { key: f.key, titel: f.titel, optionen: o };
});

/* 3) Vertiefungen je Thema: Kategorien, Aussagen, Fragen zum Umfeld */
var mReg = suche(/TOPIC_REGISTRY\s*=\s*\{/g, 'TOPIC_REGISTRY');
var regText = literalAb(s.indexOf('{', mReg.index));
var themen = {};
var reZeile = /'([a-z-]+)'\s*:\s*\{\s*diagnose\s*:\s*\(\)\s*=>\s*(SYMPTOM_DIAGNOSE_\w+)/g, z;
while ((z = reZeile.exec(regText))) {
  var thema = z[1], konst = z[2];
  var mK = new RegExp('const ' + konst + '\\s*=\\s*\\{').exec(s);
  if (!mK) { throw new Error(konst + ' nicht gefunden'); }
  var diag = wert(literalAb(s.indexOf('{', mK.index)));
  var t = { kat: {}, sym: {}, fragen: {} };
  (diag.symptomKategorien || []).forEach(function (k) {
    t.kat[k.id] = k.titel;
    (k.symptome || []).forEach(function (x) { t.sym[x.id] = [k.id, x.text]; });
  });
  (diag.kontextFragen || []).forEach(function (f) {
    var o = {}; (f.optionen || []).forEach(function (x) { o[x.val] = x.text; });
    t.fragen[f.id] = [f.titel || f.id, o];
  });
  themen[thema] = t;
}
if (Object.keys(themen).length < 5) { throw new Error('Zu wenige Vertiefungen gefunden (' + Object.keys(themen).length + ')'); }

/* 4) Frühere Krisenhinweise aus den Vertiefungen – werden im Dossier wie die
   akuten Aussagen des Pools hervorgehoben (Sicherheit geht vor) */
var KRISE = {
  'asperger': ['nssi-aktiv', 'suizid-aktuell'],
  'depression': ['d6-1', 'd6-2', 'd6-3', 'd6-4'],
  'borderline': ['p2-1', 'p2-4', 'p6-1', 'p6-2', 'p6-4'],
  'psychose': ['q6-1', 'q6-3'],
  'sucht': ['c6-1'],
  'essstoerungen': ['e6-2', 'e6-4']
};
var KRISE_FRAGEN = {
  'depression': { suizidalitaet: ['passiv', 'konkret'] },
  'borderline': { selbstgefaehrdung: ['svv', 'akut'] },
  'essstoerungen': { warnzeichen: ['vorhanden', 'ausgepraegt'] }
};
Object.keys(KRISE).forEach(function (th) {
  KRISE[th].forEach(function (id) { if (!themen[th] || !themen[th].sym[id]) { throw new Error('Krisenhinweis ' + th + '/' + id + ' gibt es nicht mehr'); } });
});
Object.keys(KRISE_FRAGEN).forEach(function (th) {
  Object.keys(KRISE_FRAGEN[th]).forEach(function (f) {
    KRISE_FRAGEN[th][f].forEach(function (v) { if (!themen[th] || !themen[th].fragen[f] || themen[th].fragen[f][1][v] == null) { throw new Error('Krisen-Antwort ' + th + '/' + f + '=' + v + ' gibt es nicht mehr'); } });
  });
});

var daten = { version: 1, kategorien: kategorien, symptome: symptome, akut: akut, gate: gate, themen: themen, krise: KRISE, kriseFragen: KRISE_FRAGEN };
var n = Object.keys(themen).reduce(function (a, k) { return a + Object.keys(themen[k].sym).length; }, 0);
var kopf = '/* Texte des alten Klassenbuch-Screenings – erzeugt von hub-quellen/kb-texte.cjs aus ' + path.basename(QUELLE) + ' (Galileo, eingefrorener Stand).\n' +
  '   Nicht von Hand ändern. ' + Object.keys(symptome).length + ' Aussagen im Pool, ' + Object.keys(themen).length + ' Vertiefungen mit ' + n + ' Aussagen. */\n';
fs.writeFileSync(ZIEL, kopf + 'window.CDSE_KB_TEXTE=' + JSON.stringify(daten) + ';\n');
console.log('✓ ' + path.relative(ROOT, ZIEL) + ' – ' + Object.keys(symptome).length + ' Aussagen, ' + Object.keys(themen).length + ' Vertiefungen (' + n + ' Aussagen), ' +
  Math.round(fs.statSync(ZIEL).size / 1024) + ' KB');
