// Test: behobene Fehler aus dem Prüfbericht – Abgleich mit zwei Geräten über eine nachgestellte Team-Datei
// (K4: Änderungen an bestehenden Datensätzen kommen an, kein Hin- und Herpendeln), fremde Journal-Datei und
// unbekannte Sammlungen (H2), Wochenziele (H5), DS/PEI-Bericht beim Bearbeiten (H6), nichts löschen beim
// Start (H7), persönliche Aufgaben (M1), gefährliche Knöpfe (M5), „ehemalig“ (N10). Nur erfundene Personen.
// Aufruf: node klassenbuch/tests/fehler.cjs   (Webserver auf Port 8099 für den Hauptordner)
'use strict';
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8099/apps/klassenbuch.html';
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } }
const warte = ms => new Promise(r => setTimeout(r, ms));

/* Nachgestellte Team-Datei: die Griffe der File System Access API lesen und schreiben in Node */
const DATEIEN = {}; let schreibvorgaenge = 0;
async function geraet(browser, name, fehler) {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 850 }, locale: 'de-DE', timezoneId: 'Europe/Luxembourg' });
  await ctx.exposeBinding('__fsLesen', (src, n) => DATEIEN[n] || '');
  await ctx.exposeBinding('__fsSchreiben', (src, n, t) => { DATEIEN[n] = t; schreibvorgaenge++; });
  await ctx.addInitScript(() => {
    class Griff {
      constructor(n) { Object.defineProperty(this, '__n', { value: n, enumerable: false }); }
      get name() { return this.__n; } get kind() { return 'file'; }
      queryPermission() { return Promise.resolve('granted'); } requestPermission() { return Promise.resolve('granted'); }
      getFile() { const n = this.__n; return window.__fsLesen(n).then(t => ({ text: () => Promise.resolve(t) })); }
      createWritable() { const n = this.__n; let b = ''; return Promise.resolve({ write: d => { b += d; return Promise.resolve(); }, close: () => window.__fsSchreiben(n, b) }); }
    }
    window.__DATEI = 'klassebuch-team.json';
    window.showOpenFilePicker = async () => [new Griff(window.__DATEI)];
    window.showSaveFilePicker = async () => new Griff(window.__DATEI);
    window.open = function () { return null; };
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => fehler.push(name + ': ' + e.message));
  page.on('console', m => { if (m.type() === 'error') fehler.push(name + ': ' + m.text()); });
  page.on('dialog', d => d.type() === 'prompt' ? d.accept('Test Person') : d.accept());
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(1500);
  if (await page.$('#kb-gate.open')) { const b = await page.$('#kb-gate-other'); if (b) { await b.click(); await page.waitForTimeout(300); } }
  return { ctx, page };
}
function ausDatei(coll, pred) { try { const d = JSON.parse(DATEIEN['klassebuch-team.json']); return (d.colls[coll] || []).filter(x => !x._del && pred(x.d)).map(x => x.d); } catch (e) { return 'FEHLER'; } }

(async () => {
  const t0 = Date.now();
  const browser = await chromium.launch();
  const fehler = [];

  console.log('1) Zwei Geräte, eine Team-Datei (K4)');
  const A = await geraet(browser, 'A', fehler);
  const ids = await A.page.evaluate(() => ({ tom: KB_ROSTER.add('Tom Muster', '', 'L1', 'ES'), lea: KB_ROSTER.add('Lea Beispiel', '', 'L1', 'ES') }));
  await A.page.evaluate(() => KB_SYNC.connectNew()); await warte(2500);
  const B = await geraet(browser, 'B', fehler);
  await B.page.evaluate(() => KB_SYNC.connectExisting()); await warte(2500);
  check('Gerät B übernimmt die Klasse aus der Team-Datei', (await B.page.evaluate(() => KB_ROSTER.list().map(s => s.name).sort().join()) ) === 'Lea Beispiel,Tom Muster');
  // eine Zelle mit Unterricht für Tom suchen (aktuelle Woche) und auf A anklicken → Non-excusé
  await A.page.evaluate(sid => { window.__kbGo('absenzen'); KB_ANW.openStudent(sid); }, ids.tom); await warte(400);
  const zelle = await A.page.evaluate(sid => { const c = document.querySelector('#anw-root .wcell:not(.empty)[data-sid="' + sid + '"]'); return c ? { blk: c.getAttribute('data-blk'), date: c.getAttribute('data-date') } : null; }, ids.tom);
  check('Wochenraster mit Unterrichtsstunde gefunden', !!zelle, zelle);
  const klick = (P, sid) => P.page.evaluate(([sid, z]) => { const c = document.querySelector('#anw-root .wcell[data-sid="' + sid + '"][data-blk="' + z.blk + '"][data-date="' + z.date + '"]'); if (c) { c.click(); return true; } return false; }, [sid, zelle]);
  const status = P => P.page.evaluate(sid => KB_ANW.exportEntries().filter(e => e.studentId === sid).map(e => e.status).join(), ids.tom);
  await klick(A, ids.tom);
  const bis = async (fn, soll, ms) => { const ende = Date.now() + ms; let w; do { w = await fn(); if (w === soll) { return w; } await warte(500); } while (Date.now() < ende); return w; };
  const angekommenB = await bis(() => status(B), 'unentschuldigt', 15000);
  check('Neue Absenz von A kommt bei B an', angekommenB === 'unentschuldigt', angekommenB);
  await B.page.evaluate(sid => { window.__kbGo('absenzen'); KB_ANW.openStudent(sid); }, ids.tom); await warte(400);
  await klick(B, ids.tom); await warte(200);
  const lokalB = await status(B);
  const angekommen = (await bis(() => status(A), lokalB, 22000)) === lokalB;
  check('Geänderte Absenz (Status auf B umgestellt) kommt bei A an', angekommen && lokalB === 'entschuldigt', { A: await status(A), B: lokalB, datei: ausDatei('anwEntries', d => d.studentId === ids.tom).map(d => d.status) });
  await A.page.evaluate(sid => KB_BUBBLE.addNode(sid, { name: 'Person 1 (erfunden)', area: 'familie', freq: 'woechentlich', relation: 'direkt', status: 'bestehend' }), ids.lea); await warte(6000);
  await A.page.evaluate(sid => KB_BUBBLE.addNode(sid, { name: 'Person 2 (erfunden)', area: 'externe', freq: 'monatlich', relation: 'direkt', status: 'neu' }), ids.lea); await warte(11500);
  const netzB = await B.page.evaluate(sid => KB_BUBBLE.get(sid).nodes.length, ids.lea);
  check('Zweite Person im Helfernetz (auf A ergänzt) kommt bei B an', netzB === 2, netzB);
  await A.page.evaluate(() => Repo.saveReunion({ date: '2026-09-28', orgItems: ['Orga 1 (erfunden)'], studentOrder: [], goals: {} })); await warte(6000);
  await A.page.evaluate(() => { const r = Repo.getReunionByDate('2026-09-28'); r.orgItems = r.orgItems.concat(['Orga 2 (erfunden)']); return Repo.saveReunion(r); }); await warte(11500);
  const orgaB = await B.page.evaluate(() => { const r = Repo.getReunionByDate('2026-09-28'); return r ? r.orgItems.length : 0; });
  check('Zweiter Orga-Punkt der Réunion (auf A ergänzt) kommt bei B an', orgaB === 2, orgaB);
  const vorher = schreibvorgaenge; await warte(11000);
  check('Danach Ruhe: kein Hin- und Herschreiben der Team-Datei', schreibvorgaenge - vorher === 0, schreibvorgaenge - vorher);

  console.log('2) Fremde Dateien und unbekannte Sammlungen (H2)');
  const d0 = JSON.parse(DATEIEN['klassebuch-team.json']);
  d0.colls.zukunft = [{ id: 'z1', _ts: 1, d: { id: 'z1', wert: 'aus einer neueren Version' } }];
  DATEIEN['klassebuch-team.json'] = JSON.stringify(d0);
  await A.page.evaluate(() => KB_ROSTER.update(KB_ROSTER.list()[0].id, { klasse: 'L1a' })); await warte(6500);
  const d1 = JSON.parse(DATEIEN['klassebuch-team.json']);
  check('Unbekannte Sammlung bleibt beim Schreiben erhalten, Datei ist als Klassenbuch-Datei markiert', !!(d1.colls.zukunft && d1.colls.zukunft.length === 1) && d1._app === 'klassenbuch');
  DATEIEN['journal-team.json'] = JSON.stringify({ _format: 'klassebuch-shared-v1', colls: { roster: [], pei: [], agenda: [] } });
  const C = await geraet(browser, 'C', fehler);
  await C.page.evaluate(() => { window.__DATEI = 'journal-team.json'; return KB_SYNC.connectExisting(); }); await warte(2500);
  const stC = await C.page.evaluate(() => KB_SYNC.getStatus().error || '');
  check('Team-Datei des Journals wird abgelehnt, nichts geschrieben', /gehört zum Journal/.test(stC) && JSON.parse(DATEIEN['journal-team.json']).colls.pei.length === 0 && !JSON.parse(DATEIEN['journal-team.json'])._app, stC);
  await C.page.evaluate(() => KB_SYNC.disconnect());

  console.log('3) Wochenziele (H5)');
  const P = A.page;
  await P.evaluate(() => KB_SYNC.disconnect());
  const heute = await P.evaluate(() => todayIso());
  await P.evaluate(([sid, d]) => Repo.saveReunion({ date: d, orgItems: [], studentOrder: [sid], goals: { [sid]: [{ text: 'Pünktlich kommen', done: true }, { text: 'Hausaufgaben mitbringen', done: false }, 'Ruhig bleiben'] } }), [ids.tom, heute]);
  const leer = async hub => { await P.evaluate(([sid, h]) => { window.__kbGo('students'); location.hash = '#/student/' + encodeURIComponent(sid) + '?hub=' + h; }, [ids.tom, hub]); await warte(700); return P.evaluate(() => document.querySelector('#dos-root').innerText); };
  const ueb = await leer('uebersicht'), ver = await leer('verlauf'), reu = await leer('reunion');
  check('Übersicht, Verlauf und Réunion-Reiter zeigen die Zieltexte, nie „[object Object]“', [ueb, ver, reu].every(t => !t.includes('[object Object]')) && ueb.includes('Pünktlich kommen') && ver.includes('Hausaufgaben mitbringen') && reu.includes('Ruhig bleiben'));
  const feld = await P.evaluate(() => (document.querySelector('.reu-goals') || {}).value || '');
  check('Eingabefeld der Wochenziele enthält die Texte (keine Objekte)', feld === 'Pünktlich kommen\nHausaufgaben mitbringen\nRuhig bleiben', feld);
  await P.evaluate(() => { document.querySelector('.reu-goals').value = 'Pünktlich kommen\nRuhig bleiben\nNeues Ziel'; document.querySelector('.reu-input').value = 'Kurzes Update (erfunden)'; });
  await P.click('.reu-save'); await warte(900);
  const ziele = await P.evaluate(sid => { const l = Repo.listReunions ? Repo.listReunions() : []; const r = l.find(x => x.goals && x.goals[sid]); return r ? r.goals[sid] : null; }, ids.tom);
  check('„Aktualisieren“ speichert Texte als {text, done} und behält „erledigt“', JSON.stringify(ziele) === JSON.stringify([{ text: 'Pünktlich kommen', done: true }, { text: 'Ruhig bleiben', done: false }, { text: 'Neues Ziel', done: false }]), ziele);
  await P.evaluate(([sid, d]) => { const r = Repo.getReunionByDate(d); r.goals[sid] = ['[object Object]']; return Repo.saveReunion(r); }, [ids.tom, heute]);
  const kaputt = await leer('uebersicht');
  check('Schon zerstörte Ziele werden als „Zieltext verloren“ gekennzeichnet', kaputt.includes('Zieltext verloren') && !kaputt.includes('[object Object]'));

  console.log('4) DS/PEI-Bericht beim Bearbeiten (H6)');
  const eid = await P.evaluate(sid => Repo.saveEntry({ studentId: sid, date: '2026-09-01', author: 'TP', category: 'Bericht (DS/PEI)', tags: [], text: 'PEI (erfunden)', report: { v: 1, type: 'PEI', goals: [{ code: 'V-21', domain: 'V', title: 'Wut erkennen (erfunden)' }] }, source: { name: 'pei.docx', kind: 'docx' } }).then(e => e.id), ids.tom);
  await P.evaluate(id => { window.__kbGo('students'); location.hash = '#/entry/' + id + '/edit'; }, eid); await warte(800);
  await P.fill('#f-text', 'PEI (erfunden), Text ergänzt');
  await P.evaluate(() => { const f = document.querySelector('form'); if (f.requestSubmit) f.requestSubmit(); else f.submit(); }); await warte(800);
  const e2 = await P.evaluate(id => Repo.getEntry(id), eid);
  check('Nach dem Bearbeiten: Text geändert, Förderziele und Quelle erhalten', e2 && e2.text === 'PEI (erfunden), Text ergänzt' && e2.report && e2.report.goals.length === 1 && e2.source && e2.source.name === 'pei.docx', e2 && { text: e2.text, report: !!e2.report });

  console.log('5) Nichts löschen beim Start (H7), persönliche Aufgaben (M1), „ehemalig“ (N10)');
  await P.evaluate(sid => Repo.saveEntry({ studentId: sid, date: '2026-09-02', author: 'TP', category: 'Schule', tags: [], text: 'Eintrag zu Lea (erfunden)' }), ids.lea);
  await P.evaluate(sid => KB_ROSTER.remove(sid), ids.lea);
  await P.reload({ waitUntil: 'load' }); await warte(1500);
  if (await P.$('#kb-gate.open')) { const b = await P.$('#kb-gate-other'); if (b) { await b.click(); await warte(300); } }
  const n = await P.evaluate(sid => (Repo.entries || []).filter(e => e.studentId === sid).length, ids.lea);
  check('Kind aus der Liste entfernt: seine Einträge bleiben nach dem Neustart erhalten', n === 1, n);
  const lea2 = await P.evaluate(() => KB_ROSTER.add('Mia Beispiel', '', 'L1', 'ES'));
  await P.evaluate(([tom, mia]) => KB_ANW.applyNotes([
    { id: 'n1', date: todayIso(), type: 'hausaufgabe', level: 'L1', studentId: null, text: 'Für alle: Seite 12 (erfunden)' },
    { id: 'n2', date: todayIso(), type: 'hausaufgabe', level: 'L1', studentId: tom, text: 'Nur Tom: Heft nachholen (erfunden)' }]), [ids.tom, lea2]);
  const schule = async sid => { await P.evaluate(s => { window.__kbGo('students'); location.hash = '#/student/' + encodeURIComponent(s) + '?hub=schule'; }, sid); await warte(700); return P.evaluate(() => document.querySelector('#dos-root').innerText); };
  const sTom = await schule(ids.tom), sMia = await schule(lea2);
  check('Persönliche Aufgabe nur bei Tom, Klassenaufgabe bei beiden', sTom.includes('Nur Tom') && sTom.includes('Für alle') && !sMia.includes('Nur Tom') && sMia.includes('Für alle'));
  await P.evaluate(sid => KB_ROSTER.update(sid, { active: false }), lea2);
  await P.evaluate(() => { window.__kbGo('students'); location.hash = '#/dashboard'; }); await warte(700);
  const karte = await P.evaluate(() => { const c = [...document.querySelectorAll('.st-card')].find(x => x.textContent.includes('Mia Beispiel')); return c ? c.textContent : ''; });
  check('Inaktives Kind: Karte mit „ehemalig“', karte.includes('ehemalig'), karte.slice(0, 120));

  console.log('6) Gefährliche Knöpfe entfernt (M5)');
  const knoepfe = await P.evaluate(() => ({ reset: !!document.getElementById('reset-all'), laden: !!document.getElementById('import-json'), sichern: !!document.getElementById('export-json'), csv: !!document.getElementById('export-csv') }));
  check('„Alle Daten löschen“ und „Backup laden“ fehlen, Sichern und CSV-Export bleiben', !knoepfe.reset && !knoepfe.laden && knoepfe.sichern && knoepfe.csv, knoepfe);

  check('Keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 5));
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler  (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
