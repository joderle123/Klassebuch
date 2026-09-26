/* Prüft Lernmodule (lern-app/module/*.json): Aufbau, Quiz, Quellen, Stil.
   Aufruf: node lern-app/pruefen.cjs [datei.json …]   → Exit-Code 1 bei Fehlern */
'use strict';
const fs = require('fs'), path = require('path');
const ORDNER = path.join(__dirname, 'module');
global.window = {};
require('./quellen.js');
const QUELLEN = window.LERN_QUELLEN;

const BEREICHE = ['grundlagen', 'stoerungen', 'muster', 'handeln', 'system'];
const BLOECKE = ['text', 'merke', 'fall', 'liste', 'tabelle', 'tun', 'lassen', 'mythos', 'abgrenzung', 'weiter', 'achtung'];
const FLOSKELN = [
  [/in diesem (modul|kapitel) (werden|wollen) wir/i, '„In diesem Modul werden wir …“'],
  [/spannende reise|auf eine reise|entdeckungsreise/i, '„Reise“-Metapher'],
  [/es ist (sehr )?wichtig,? zu betonen/i, '„Es ist wichtig zu betonen“'],
  [/lass(t)? uns\b/i, '„Lass uns“'],
  [/!{2,}/, 'doppelte Ausrufezeichen'],
  [/"/, 'gerade Anführungszeichen – bitte „…“'],
  [/ - /, 'Bindestrich statt Gedankenstrich (–)'],
  [/\.\.\./, 'drei Punkte statt …'],
  [/\bder ADHSler|\bdie Autisten\b|\bAutist\b/i, 'Etikett statt „Kind mit …“'],
];
const EMOJI = /\p{Extended_Pictographic}/u;

let fehler = 0, hinweise = 0;
const melde = (f, wo, t) => { if (f) fehler++; else hinweise++; console.log((f ? '✗ ' : '· ') + wo + ': ' + t); };

const argv = process.argv.slice(2);
const dateien = argv.length ? argv : fs.readdirSync(ORDNER).filter((d) => d.endsWith('.json')).map((d) => path.join(ORDNER, d));
const alleIds = new Set(fs.readdirSync(ORDNER).filter((d) => d.endsWith('.json')).map((d) => d.replace(/\.json$/, '')));

function texte(x, out) {
  if (typeof x === 'string') out.push(x);
  else if (Array.isArray(x)) x.forEach((y) => texte(y, out));
  else if (x && typeof x === 'object') Object.entries(x).forEach(([k, v]) => { if (k !== 'art' && k !== 'id' && k !== 'quellen' && k !== 'verwandt' && k !== 'toolbox') texte(v, out); });
  return out;
}
function woerter(s) { return (s.match(/\S+/g) || []).length; }

for (const datei of dateien) {
  const name = path.basename(datei, '.json');
  let m;
  try { m = JSON.parse(fs.readFileSync(datei, 'utf8')); } catch (e) { melde(true, name, 'kein gültiges JSON: ' + e.message); continue; }
  const wo = name;
  if (m.id !== name) melde(true, wo, 'id muss dem Dateinamen entsprechen');
  if (!BEREICHE.includes(m.bereich)) melde(true, wo, 'bereich ungültig');
  if (!m.titel || m.titel.length > 60) melde(true, wo, 'Titel fehlt oder zu lang');
  if (!m.untertitel) melde(false, wo, 'Untertitel fehlt');
  if (!(m.dauer >= 10 && m.dauer <= 90)) melde(true, wo, 'dauer (Minuten) 10–90');
  if (!Array.isArray(m.lernziele) || m.lernziele.length < 3 || m.lernziele.length > 6) melde(true, wo, '3–6 Lernziele');
  if (!Array.isArray(m.kapitel) || m.kapitel.length < 4 || m.kapitel.length > 8) melde(true, wo, '4–8 Kapitel');
  let wortzahl = 0, faelle = 0;
  (m.kapitel || []).forEach((k, i) => {
    const w = wo + ' Kap. ' + (i + 1);
    if (!k.titel) melde(true, w, 'Kapiteltitel fehlt');
    if (!Array.isArray(k.bloecke) || !k.bloecke.length) return melde(true, w, 'keine Blöcke');
    k.bloecke.forEach((b, j) => {
      const wb = w + ' Block ' + (j + 1) + ' (' + b.art + ')';
      if (!BLOECKE.includes(b.art)) return melde(true, wb, 'unbekannte Blockart');
      if (b.art === 'fall') faelle++;
      if (['text', 'merke', 'weiter', 'achtung'].includes(b.art) && !b.text) melde(true, wb, 'text fehlt');
      if (b.art === 'fall' && (!b.titel || !b.text)) melde(true, wb, 'Fall braucht titel und text');
      if (['liste', 'tun', 'lassen'].includes(b.art) && (!Array.isArray(b.punkte) || !b.punkte.length)) melde(true, wb, 'punkte fehlen');
      if (b.art === 'tabelle' && (!Array.isArray(b.spalten) || !Array.isArray(b.zeilen) || b.zeilen.some((z) => z.length !== b.spalten.length))) melde(true, wb, 'Tabelle: Zeilen passen nicht zu den Spalten');
      if (b.art === 'mythos' && (!b.mythos || !b.fakt)) melde(true, wb, 'mythos und fakt nötig');
      if (b.art === 'abgrenzung' && (!Array.isArray(b.punkte) || b.punkte.some((p) => !p.wie || !p.unterschied))) melde(true, wb, 'punkte: [{wie, unterschied}]');
      wortzahl += woerter(texte(b, []).join(' '));
    });
  });
  if (wortzahl < 1500) melde(true, wo, `zu wenig Inhalt (${wortzahl} Wörter, mind. 1 500)`);
  else if (wortzahl < 2000) melde(false, wo, `eher knapp (${wortzahl} Wörter, Ziel 2 000–3 500)`);
  if (wortzahl > 4500) melde(false, wo, `sehr lang (${wortzahl} Wörter)`);
  if (faelle < 1) melde(true, wo, 'mindestens ein Fallbeispiel');

  const q = m.quiz || [];
  if (q.length < 8 || q.length > 12) melde(true, wo, `8–12 Quizfragen (${q.length})`);
  let fallFragen = 0, rf = 0;
  const positionen = [];
  q.forEach((f, i) => {
    const w = wo + ' Frage ' + (i + 1);
    if (!['einfach', 'mehrfach', 'richtigfalsch', 'fall'].includes(f.art)) return melde(true, w, 'art ungültig');
    if (!f.frage) melde(true, w, 'frage fehlt');
    if (!f.erklaerung || f.erklaerung.length < 60) melde(true, w, 'Erklärung fehlt oder zu kurz');
    if (f.art === 'fall') { fallFragen++; if (!f.fall) melde(true, w, 'Fallfrage braucht „fall“'); }
    if (f.art === 'richtigfalsch') { rf++; if (!Array.isArray(f.richtig) || f.richtig.length !== 1 || ![0, 1].includes(f.richtig[0])) melde(true, w, 'richtig: [0] oder [1]'); return; }
    if (!Array.isArray(f.optionen) || f.optionen.length < 3 || f.optionen.length > 6) melde(true, w, '3–6 Optionen');
    if (!Array.isArray(f.richtig) || !f.richtig.length || f.richtig.some((r) => r < 0 || r >= (f.optionen || []).length)) melde(true, w, 'richtig ungültig');
    if (f.art !== 'mehrfach' && f.richtig && f.richtig.length !== 1) melde(true, w, 'genau eine richtige Antwort');
    if (f.art === 'mehrfach' && f.richtig && f.richtig.length < 2) melde(true, w, 'Mehrfachauswahl: mindestens zwei richtige');
    if (f.richtig && f.art !== 'mehrfach') positionen.push(f.richtig[0]);
  });
  if (fallFragen < 3) melde(true, wo, `mindestens 3 Fallfragen (${fallFragen})`);
  if (rf > 3) melde(false, wo, 'mehr als 3 Richtig/Falsch-Fragen');
  if (positionen.length >= 6) {
    const haeufig = Math.max(...[0, 1, 2, 3, 4, 5].map((p) => positionen.filter((x) => x === p).length));
    if (haeufig > positionen.length * 0.5) melde(false, wo, 'richtige Antworten stehen zu oft an derselben Position');
  }
  if (!Array.isArray(m.glossar) || m.glossar.length < 4) melde(true, wo, 'mindestens 4 Glossar-Einträge');
  (m.glossar || []).forEach((g) => { if (!g.begriff || !g.erklaerung) melde(true, wo, 'Glossar-Eintrag unvollständig'); });
  if (!Array.isArray(m.quellen) || !m.quellen.length) melde(true, wo, 'mindestens eine Quelle');
  (m.quellen || []).forEach((k) => { if (!QUELLEN[k]) melde(true, wo, `Quelle „${k}“ nicht in quellen.js`); });
  (m.verwandt || []).forEach((k) => { if (!alleIds.has(k)) melde(false, wo, `verwandtes Modul „${k}“ gibt es (noch) nicht`); });

  for (const t of texte(m, [])) {
    if (EMOJI.test(t)) melde(true, wo, 'Emoji: „' + t.slice(0, 40) + '“');
    for (const [re, n] of FLOSKELN) if (re.test(t)) melde(false, wo, n + ': „' + t.slice(0, 70) + '“');
  }
  console.log(`${name}: ${wortzahl} Wörter, ${q.length} Fragen (${fallFragen} Fall), ${(m.glossar || []).length} Begriffe`);
}
console.log(`\n${fehler} Fehler, ${hinweise} Hinweise`);
process.exit(fehler ? 1 : 0);
