#!/usr/bin/env node
// Baut die CDSE-Schriften (Inter fuer Text, Manrope fuer Ueberschriften) als eingebettete
// @font-face-Regeln in HTML-Dateien ein - zwischen den beiden Markierungen
// @@FONTS-START@@ und @@FONTS-END@@ (jeweils als CSS-Kommentar) in einem
// <style>-Block. Mehrfach ausfuehrbar: der Bereich wird jedes Mal ersetzt.
// Aufruf:  node design/embed-fonts.cjs hub.html [weitere.html ...]
//          node design/embed-fonts.cjs --nur inter datei.html
'use strict';
var fs = require('fs'), path = require('path');
var DIR = path.join(__dirname, 'fonts');
var FONTS = {
  inter:    { family: 'Inter var',    file: 'inter-latin-wght-normal.woff2',    weight: '100 900' },
  manrope:  { family: 'Manrope var',  file: 'manrope-latin-wght-normal.woff2',  weight: '200 800' }
};
var args = process.argv.slice(2), nur = Object.keys(FONTS);
var i = args.indexOf('--nur');
if (i >= 0) { nur = args[i + 1].split(','); args.splice(i, 2); }
var START = '/*@@FONTS-START@@*/', END = '/*@@FONTS-END@@*/';
var css = nur.map(function (k) {
  var f = FONTS[k]; if (!f) { throw new Error('Unbekannte Schrift: ' + k); }
  var b64 = fs.readFileSync(path.join(DIR, f.file)).toString('base64');
  return "@font-face{font-family:'" + f.family + "';font-style:normal;font-display:swap;font-weight:" + f.weight +
         ";src:url(data:font/woff2;base64," + b64 + ") format('woff2');}";
}).join('\n');
args.forEach(function (datei) {
  var html = fs.readFileSync(datei, 'utf8');
  var a = html.indexOf(START), b = html.indexOf(END);
  if (a < 0 || b < a) { console.error('✗ ' + datei + ': Markierungen ' + START + ' … ' + END + ' fehlen'); process.exitCode = 1; return; }
  html = html.slice(0, a + START.length) + '\n' + css + '\n' + html.slice(b);
  fs.writeFileSync(datei, html);
  console.log('✓ ' + datei + ': ' + nur.join(', ') + ' eingebettet (' + Math.round(css.length / 1024) + ' KB)');
});
