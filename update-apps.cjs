#!/usr/bin/env node
/* =====================================================================
   CDSE Hub — Apps auf den neuesten Stand bringen
   ---------------------------------------------------------------------
   Holt jede App, die in hub-apps.js ein Feld "quelle" hat, frisch aus
   ihrem GitHub-Repository und legt sie unter "datei" ab (z. B. apps/).
   Schreibt dazu apps/versionen.js — daraus zeigt der Hub auf jeder
   Kachel den Stand an.

   Zusatzdateien: quelle.zusatz = [{ pfad, datei }] holt weitere Dateien
   aus demselben Repository (z. B. den DS-Text-Motor des ELDiB-Generators).

   Aufruf:   node update-apps.cjs            alle Apps
             node update-apps.cjs eldib      nur die App mit id "eldib"

   Sicherheitsnetz: Liegt im selben Repository ein NEUERER Branch, der
   dieselbe Datei enthält, wird er NICHT automatisch genommen (er könnte
   ein halbfertiger Versuch sein), sondern mit ⚠ gemeldet. Dann in
   hub-apps.js bei "quelle" den Branch umstellen und erneut aufrufen.
   ===================================================================== */
'use strict';
var fs = require('fs');
var path = require('path');
var os = require('os');
var cp = require('child_process');

var ROOT = __dirname;
var CACHE = process.env.CDSE_QUELLEN_CACHE || path.join(os.tmpdir(), 'cdse-hub-quellen');

function titelVon(buf) {
  var m = buf.slice(0, 20000).toString('utf8').match(/<title>([^<]*)<\/title>/i);
  return m ? m[1].trim() : '';
}

function git(args, cwd, asBuffer) {
  var out = cp.execFileSync('git', args, { cwd: cwd, maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  return asBuffer ? out : out.toString('utf8').trim();
}

/* hub-apps.js genauso auswerten wie der Browser (window.CDSE_APPS) */
var win = {};
try {
  new Function('window', fs.readFileSync(path.join(ROOT, 'hub-apps.js'), 'utf8'))(win);
} catch (e) {
  console.error('hub-apps.js lässt sich nicht lesen: ' + e.message);
  process.exit(1);
}
var apps = (win.CDSE_APPS || []).filter(function (a) { return a && a.id && a.datei && a.quelle; });
var only = process.argv[2];
if (only) { apps = apps.filter(function (a) { return a.id === only; }); }
if (!apps.length) { console.error(only ? 'Keine App mit id "' + only + '" und Quelle gefunden.' : 'Keine App mit "quelle" in hub-apps.js.'); process.exit(1); }

var versFile = path.join(ROOT, 'apps', 'versionen.js');
var vers = {};
try { var w2 = {}; new Function('window', fs.readFileSync(versFile, 'utf8'))(w2); vers = w2.CDSE_APP_VERSIONEN || {}; } catch (e) { /* erster Lauf */ }

fs.mkdirSync(CACHE, { recursive: true });
var fehler = 0;

apps.forEach(function (a) {
  var q = a.quelle;
  var dir = path.join(CACHE, q.repo);
  try {
    if (!fs.existsSync(path.join(dir, '.git'))) {
      fs.mkdirSync(dir, { recursive: true });
      git(['init', '-q'], dir);
      git(['remote', 'add', 'origin', 'https://github.com/' + (q.owner || 'joderle123') + '/' + q.repo + '.git'], dir);
    }
    git(['fetch', '-q', '--depth', '1', 'origin', '+refs/heads/*:refs/remotes/origin/*'], dir);

    var ref = 'origin/' + q.branch;
    var wann = git(['log', '-1', '--format=%cI', ref], dir);
    var commit = git(['rev-parse', '--short', ref], dir);
    var aenderung = git(['log', '-1', '--format=%s', ref], dir);
    var inhalt = git(['show', ref + ':' + q.pfad], dir, true);

    /* Plausibilität: eine leere oder fremde Datei nie über eine App schreiben */
    var kopf = inhalt.slice(0, 400).toString('utf8').toLowerCase();
    if (inhalt.length < 1024 || (kopf.indexOf('<!doctype html') < 0 && kopf.indexOf('<html') < 0)) {
      throw new Error('"' + q.pfad + '" sieht nicht wie eine HTML-App aus — nichts überschrieben.');
    }

    var ziel = path.join(ROOT, a.datei);
    fs.mkdirSync(path.dirname(ziel), { recursive: true });
    var neu = !fs.existsSync(ziel) || !fs.readFileSync(ziel).equals(inhalt);
    fs.writeFileSync(ziel, inhalt);

    /* Zusätzliche Dateien derselben Quelle, z. B. der DS-Text-Motor für das Schülerprofil */
    (q.zusatz || []).forEach(function (z) {
      var zi = git(['show', ref + ':' + z.pfad], dir, true);
      if (zi.length < 1024) { throw new Error('"' + z.pfad + '" ist leer oder zu klein — nichts überschrieben.'); }
      var zz = path.join(ROOT, z.datei);
      fs.mkdirSync(path.dirname(zz), { recursive: true });
      fs.writeFileSync(zz, zi);
      console.log('   + ' + z.datei);
    });

    vers[a.id] = {
      stand: wann.slice(0, 10), commit: commit,
      quelle: q.repo + ' · ' + q.branch, aenderung: aenderung,
      groesse: inhalt.length
    };
    console.log((neu ? '↻ aktualisiert ' : '✓ schon aktuell') + '  ' + a.id.padEnd(12) + wann.slice(0, 10) + '  ' + commit + '  «' + aenderung.slice(0, 60) + '»');

    /* Klassenbuch: Wortlaut der alten Screening-Aussagen für die Übernahme in den Hub neu erzeugen */
    if (a.id === 'klassenbuch' && fs.existsSync(path.join(ROOT, 'hub-quellen', 'kb-texte.cjs'))) {
      try { console.log('   ' + cp.execFileSync(process.execPath, [path.join(ROOT, 'hub-quellen', 'kb-texte.cjs')], { stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8').trim()); }
      catch (e) { console.log('   ⚠ apps/kb-screening-texte.js nicht erneuert: ' + String((e.stderr || e.message || e)).split('\n')[0]); }
    }

    /* Neuere Branches melden, die DIESELBE App enthalten. "Dieselbe" heißt:
       gleicher Pfad UND gleicher Seitentitel - sonst meldet das Skript
       jede Datei, die zufällig genauso heißt (z. B. irgendein index.html). */
    var titel = titelVon(inhalt);
    git(['for-each-ref', '--format=%(committerdate:iso-strict) %(refname:lstrip=3)', 'refs/remotes/origin'], dir)
      .split('\n').forEach(function (zeile) {
        var i = zeile.indexOf(' '), d = zeile.slice(0, i), b = zeile.slice(i + 1);
        if (!b || b === 'HEAD' || b === q.branch || !(new Date(d) > new Date(wann))) { return; }
        var andere;
        try { andere = git(['show', 'origin/' + b + ':' + q.pfad], dir, true); } catch (e) { return; }
        if (titelVon(andere) !== titel) { return; }
        console.log('   ⚠ Neuerer Branch mit derselben App: ' + b + ' (' + d.slice(0, 10) + ') — prüfen, ob der besser ist.');
      });
  } catch (e) {
    fehler++;
    console.error('✗ ' + a.id + ': ' + e.message.split('\n')[0]);
  }
});

fs.mkdirSync(path.dirname(versFile), { recursive: true });
fs.writeFileSync(versFile,
  '/* Automatisch erzeugt von update-apps.cjs — nicht von Hand ändern. */\n' +
  'window.CDSE_APP_VERSIONEN = ' + JSON.stringify(vers, null, 2) + ';\n');
console.log('\napps/versionen.js geschrieben.' + (fehler ? '  ' + fehler + ' Fehler — siehe oben.' : ''));
process.exit(fehler ? 1 : 0);
