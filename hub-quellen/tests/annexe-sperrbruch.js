// Test: Schreibsperre bei langsamem Netzlaufwerk – keine Änderung geht still verloren.
// Wie tests/gleichzeitig.js (nur Konten, Freischalten, 3 Runden: 12 PCs schreiben gleichzeitig ins selbe Dossier),
// aber im Netzordner kommt ein Teil der Schreibvorgänge verspätet an: Sperrdateien (wie eine kurz belegte Datei,
// die der Hub nach einer Pause erneut schreibt) und Dossiers (große Dateien brauchen länger). Früher konnten so
// zwei PCs gleichzeitig „die“ Sperre halten, und einer schrieb einen Stand ohne die Änderung des anderen –
// ohne Fehlermeldung (in etwa jedem zweiten Lauf fehlten Einträge).
// Nur erfundene Personen. Aufruf (im Ordner hub-quellen):  node tests/annexe-sperrbruch.js
//   SPAET=0.35 (Anteil verspäteter Sperrdateien), SPAET_DOSSIER=0.5 (Anteil verspäteter Dossiers)
const nf = require('./netzordner.js');
const P = process.env.SPAET != null ? +process.env.SPAET : 0.35;
const PD = process.env.SPAET_DOSSIER != null ? +process.env.SPAET_DOSSIER : 0.5;
const warte = ms => new Promise(r => setTimeout(r, ms));
const orig = nf.netzordner;
let spaet = 0;
nf.netzordner = function (root, opt) {
  const n = orig(root, opt), op = n.op;
  n.op = async function (q, art, a) {
    const p = (a && a.p) || '';
    if (art === 'schreiben' && /(^|\/)sperren\//.test(p) && Math.random() < P) { spaet++; await warte(180 + Math.random() * 250); }
    if (art === 'schreiben' && /(^|\/)schueler\//.test(p) && Math.random() < PD) { await warte(150 + Math.random() * 300); }
    return op(q, art, a);
  };
  return n;
};
process.on('exit', () => console.log('(verspätete Sperrdateien: ' + spaet + ')'));
process.env.NUR = 'grundlage';
process.argv[2] = require('path').join(__dirname, 'gleichzeitig.js');
require('./annexe-weiche.js');
