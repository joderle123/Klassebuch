// Test: Korrekturen aus dem Prüfbericht zum Klassenbuch – Retard-Fenster an der Zelle (K1), Heute-Tafel
// beim Start (K2), keine zweite Personenwahl (K3), Protokoll mit Ehemaligen (K4), zwei Fenster (K5),
// Réunion vom Schülerblatt mit offenen Zielen (K7), KI-Anonymisierung (K8), Absenzen-Bericht mit
// Ehemaligen (K9), CSV-Stunden (K10), Karte „Dossier-Bericht“ (K11), Tag-Feld (K13), Handy 390 px (K14),
// „Tag leeren“, Papierkorb, Noten, leerer Name, Stundenplan (K15a–e). Zweite Runde: Hinweis nach
// „+ Schuljahr anlegen“ (K6), Texte und Einzahl, Retards in der Wochen-Sicherung, Fehlzeiten nach
// Stundenplan, Dossier-Backup, Handy (Woche, Warnleisten, CSV mit Ehemaligen, Startdialog 320 px).
// Dritte Runde: Retards eigens im Übersichts-Chip und in der Team-Datei, Backup-Import ersetzt nur
// durch neuere Fassungen. Nur erfundene Personen.
// Aufruf: node klassenbuch/tests/korrekturen.cjs   (Webserver auf Port 8099 für den Hauptordner)
'use strict';
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8099/apps/klassenbuch.html';
const HOST = new URL(BASE).origin;
const OUT = path.join(__dirname, 'aus'); fs.mkdirSync(OUT, { recursive: true });
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } }
const warte = ms => new Promise(r => setTimeout(r, ms));
const WOCHE = '2026-09-21';   // Montag einer Schulwoche; Dienstag 22.09., Mittwoch 23.09.

async function kontext(browser, fehler, opt) {
  opt = opt || {};
  const ctx = await browser.newContext({ viewport: opt.viewport || { width: 1400, height: 900 }, locale: 'de-DE', timezoneId: 'Europe/Luxembourg', acceptDownloads: true });
  await ctx.route('**/*', r => r.request().url().startsWith(HOST + '/') ? r.continue() : r.abort());
  await ctx.addInitScript(() => { window.open = (function (o) { return function (u, n) { return u ? null : o.call(window, u, n); }; })(window.open); window.print = function () {}; });
  if (opt.init) { await ctx.addInitScript(opt.init); }
  if (opt.teamDatei) {
    /* Nachgestellte Team-Datei (wie in fehler.cjs): die Griffe der File System Access API lesen und schreiben in Node */
    const dateien = {};
    await ctx.exposeBinding('__fsLesen', (src, n) => dateien[n] || '');
    await ctx.exposeBinding('__fsSchreiben', (src, n, t) => { dateien[n] = t; });
    await ctx.addInitScript(() => {
      class Griff {
        constructor(n) { Object.defineProperty(this, '__n', { value: n, enumerable: false }); }
        get name() { return this.__n; } get kind() { return 'file'; }
        queryPermission() { return Promise.resolve('granted'); } requestPermission() { return Promise.resolve('granted'); }
        getFile() { const n = this.__n; return window.__fsLesen(n).then(t => ({ text: () => Promise.resolve(t) })); }
        createWritable() { const n = this.__n; let b = ''; return Promise.resolve({ write: d => { b += d; return Promise.resolve(); }, close: () => window.__fsSchreiben(n, b) }); }
      }
      window.showOpenFilePicker = async () => [new Griff('klassebuch-team.json')];
      window.showSaveFilePicker = async () => new Griff('klassebuch-team.json');
    });
  }
  const dialoge = [];
  ctx.antwort = null;   // true/false: nächste Rückfrage annehmen/ablehnen
  ctx.on('page', p => {
    p.on('pageerror', e => fehler.push(e.message));
    p.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
    p.on('dialog', d => { dialoge.push({ typ: d.type(), text: d.message() }); if (d.type() === 'prompt') return d.accept('Test Person'); if (d.type() === 'confirm' && ctx.antwort === false) return d.dismiss(); return d.accept(); });
  });
  ctx.dialoge = dialoge;
  return ctx;
}
async function frisch(page, ohneHub) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(async ohneHub => {
    localStorage.clear();
    for (const n of ['cdse_dossier_db', 'klassebuch-sync', 'anwesenheit-sync']) { await new Promise(r => { const q = indexedDB.deleteDatabase(n); q.onsuccess = q.onerror = q.onblocked = () => r(); }); }
    if (!ohneHub) { localStorage.setItem('cdse-nutzer', JSON.stringify({ id: 'k1', name: 'Mia Muster', team: 'annexe' })); }
  }, !!ohneHub);
  await page.reload({ waitUntil: 'load' }); await warte(1500);
}
/* Klassenbuch für ein Kind in der festen Schulwoche öffnen */
async function woche(page, sid) {
  await page.evaluate(([sid, tag]) => { window.__kbGo('absenzen'); KB_ANW.openStudent(sid); const i = document.querySelector('#anw-root .date-in[data-date="' + sid + '"]'); i.value = tag; i.dispatchEvent(new Event('change', { bubbles: true })); }, [sid, WOCHE]);
  await warte(450);
}
const zelle = (sid, blk, tag) => '#anw-root .wcell[data-sid="' + sid + '"][data-blk="' + blk + '"][data-date="' + tag + '"]';
/* Inhalt eines Downloads lesen, ohne ihn abzulegen */
async function lies(dl) { const teile = []; for await (const t of await dl.createReadStream()) { teile.push(t); } return Buffer.concat(teile); }

(async () => {
  const t0 = Date.now();
  const browser = await chromium.launch();
  const fehler = [];
  const ctx = await kontext(browser, fehler);
  const page = await ctx.newPage();
  await frisch(page);
  const ids = await page.evaluate(async () => {
    const tom = KB_ROSTER.add('Tom Muster', '', 'L1', 'ES'), lea = KB_ROSTER.add('Lea Beispiel', '', 'L1', 'ES');
    const d = new Date(); d.setDate(d.getDate() - 3);
    await Repo.saveReunion({ date: window.kbLokalISO(d), orgItems: [], studentOrder: [tom], goals: { [tom]: [{ text: 'Offenes Ziel (erfunden)', done: false }, { text: 'Erledigtes Ziel (erfunden)', done: true }] } });
    return { tom, lea };
  });

  console.log('1) Heute-Tafel beim Start (K2)');
  await page.reload({ waitUntil: 'load' }); await warte(2500);
  const heute = (await page.textContent('#kb-heute')).replace(/\s+/g, ' ');
  check('Ohne Menüwechsel: offenes Wochenziel steht da, nicht „Noch keine Réunion.“', await page.isVisible('#kb-heute.active') && heute.includes('Offenes Ziel (erfunden)') && !heute.includes('Erledigtes Ziel') && !heute.includes('Noch keine Réunion'));

  console.log('2) Person nur aus dem Hub (K3)');
  await page.evaluate(() => window.__kbGo('absenzen')); await warte(300);
  const person = await page.evaluate(() => ({ knopf: getComputedStyle(document.getElementById('btn-user')).display, user: KB_USER.get() }));
  check('Klassenbuch-Kopf ohne eigenen Personenknopf, Person bleibt die aus dem Hub', person.knopf === 'none' && person.user === 'Mia Muster', person);

  console.log('3) Retard: Fenster an der Zelle (K1)');
  await woche(page, ids.tom);
  const z1 = zelle(ids.tom, 'b3', '2026-09-23');
  for (let i = 0; i < 3; i++) { await page.click(z1); await warte(150); }
  await warte(500);
  const lage = () => page.evaluate(sel => {
    const p = document.getElementById('late-pop'); if (!p) { return null; }
    const r = p.getBoundingClientRect(), c = document.querySelector(sel).getBoundingClientRect(), cs = getComputedStyle(p);
    const unten = r.top - c.bottom, oben = c.top - r.bottom;   // unter der Zelle, oder darüber, wenn unten kein Platz ist
    return { imKlassenbuch: !!p.closest('#anw-root'), pos: cs.position, bg: cs.backgroundColor, rand: cs.borderTopWidth, abstand: Math.round(unten >= 0 ? unten : oben), links: Math.round(r.left - c.left), sichtbar: r.top >= 0 && r.bottom <= innerHeight };
  }, z1);
  const l1 = await lage();
  check('Fenster „Wie viel zu spät?“ im Klassenbuch, gestaltet, direkt an der Zelle', !!l1 && l1.imKlassenbuch && l1.pos === 'fixed' && l1.bg === 'rgb(255, 255, 255)' && l1.rand === '2px' && l1.abstand >= 0 && l1.abstand <= 12 && Math.abs(l1.links) <= 1 && l1.sichtbar, l1);
  await page.mouse.wheel(0, 150); await warte(400);
  const l2 = await lage();
  check('Beim Scrollen bleibt es an der Zelle', !!l2 && l2.abstand >= 0 && l2.abstand <= 12, l2);
  await page.click('#late-pop [data-lm="10"]'); await warte(300);
  const min = await page.evaluate(sid => KB_ANW.exportEntries().filter(e => e.studentId === sid).map(e => e.status + ':' + (e.lateMin || 0)).join(), ids.tom);
  check('10 Minuten gespeichert, Fenster zu', min === 'verspaetet:10' && !(await page.$('#late-pop')), min);

  console.log('4) Ganzer Tag, „Tag leeren“ und CSV (K10, K15a)');
  const tagKnopf = (act, tag) => page.evaluate(([a, t]) => document.querySelector('#anw-root .wk-grid thead th button[data-dayact="' + a + '"][data-date="' + t + '"]').click(), [act, tag]);
  await tagKnopf('mark', '2026-09-22'); await warte(250);
  const tag = await page.evaluate(sid => { const l = KB_ANW.exportEntries().filter(e => e.studentId === sid && e.date === '2026-09-22'); return { n: l.length, pausen: l.filter(e => KB_ANW.isPause(e.subject)).length, std: l.reduce((s, e) => s + KB_ANW.hoursOf(e), 0) }; }, ids.tom);
  check('„Tag“ legt in den Pausen keinen Eintrag an und zählt 7 Stunden', tag.n > 0 && tag.pausen === 0 && tag.std === 7, tag);
  const n0 = fehler.length;
  await tagKnopf('clear', '2026-09-22'); await warte(250);
  const leer = await page.evaluate(sid => KB_ANW.exportEntries().filter(e => e.studentId === sid && e.date === '2026-09-22').length, ids.tom);
  check('„Tag leeren“ ohne Fehler, der Tag ist leer', leer === 0 && fehler.length === n0, fehler.slice(n0));
  await tagKnopf('mark', '2026-09-22'); await warte(250);
  /* ältere Daten: ein Eintrag in der Pause bleibt lesbar und zählt 0 Stunden */
  await page.evaluate(sid => { const l = KB_ANW.exportEntries(); l.push({ id: 'alt1', studentId: sid, date: '2026-09-22', weekday: 2, blockId: 'b4', subject: 'Paus', status: 'unentschuldigt', hours: 0.5, note: '', byUser: 'Test', byUserAt: 1 }); KB_ANW.applyEntries(l); }, ids.tom);
  const [csvDl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }).catch(() => null), page.evaluate(() => document.getElementById('export-csv').click())]);
  let csv = null;
  if (csvDl) { const p = path.join(OUT, 'korrekturen.csv'); await csvDl.saveAs(p); const zeilen = fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(z => z.startsWith('2026-09-22;') && z.includes('Tom Muster')); csv = { zeilen: zeilen.length, std: zeilen.reduce((s, z) => s + parseFloat(z.split(';')[7].replace(',', '.')), 0) }; fs.unlinkSync(p); }
  const app = await page.evaluate(sid => KB_ANW.exportEntries().filter(e => e.studentId === sid && e.date === '2026-09-22' && e.status === 'unentschuldigt').reduce((s, e) => s + KB_ANW.hoursOf(e), 0), ids.tom);
  check('CSV zählt die Stunden wie App und Bericht (7 Std. für den ganzen Tag)', !!csv && csv.std === app && app === 7 && csv.zeilen === tag.n + 1, { csv, app });

  console.log('5) Absenzen-Bericht mit Ehemaligen (K9)');
  await page.evaluate(([tom, lea]) => {
    const e = (id, sid, date, blk, subj, status) => ({ id, studentId: sid, date, weekday: new Date(date + 'T12:00:00').getDay(), blockId: blk, subject: subj, status, hours: 1.5, note: '', byUser: 'Test', byUserAt: 1 });
    KB_ANW.applyEntries([e('a1', tom, '2026-09-21', 'b3', 'Mathe', 'unentschuldigt'), e('a2', lea, '2026-09-21', 'b3', 'Mathe', 'entschuldigt'), e('a3', lea, '2026-09-22', 'b5', 'Options', 'unentschuldigt')]);
    KB_ROSTER.update(lea, { active: false });
    const s = document.getElementById('period-sel'); s.value = ''; s.dispatchEvent(new Event('change', { bubbles: true }));
  }, [ids.tom, ids.lea]);
  await warte(300);
  const popP = ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null);
  await page.evaluate(() => window.__kbGo('absenzen-pdf'));
  const pop = await popP;
  let bericht = null;
  if (pop) {
    await pop.waitForLoadState().catch(() => {}); await warte(400);
    bericht = await pop.evaluate(() => {
      const zahl = t => parseFloat(String(t).replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
      const oben = zahl(document.querySelector('.cards .c .v').textContent);
      const zeilen = [...document.querySelectorAll('table')[0].querySelectorAll('tbody tr')];
      const summe = zeilen.reduce((s, tr) => s + zahl((tr.children[3] || {}).textContent), 0);
      const lea = zeilen.find(tr => tr.textContent.includes('Lea Beispiel'));
      return { oben, summe, lea: lea ? lea.children[0].textContent : '', kopf: document.querySelector('.h .m').textContent };
    });
    await pop.close();
  }
  check('Ehemalige mit Einträgen hat eine Zeile „ehemalig“, Zeilen und Summe oben stimmen überein', !!bericht && bericht.oben === 6 && bericht.summe === 6 && /ehemalig/.test(bericht.lea) && /1 ehemalig/.test(bericht.kopf), bericht);

  console.log('6) Réunion vom Schülerblatt (K7) und Protokoll mit Ehemaligen (K4)');
  const naechste = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + ((1 - d.getDay() + 7) % 7)); return window.kbLokalISO(d); });
  const vorher = await page.evaluate(d => !!Repo.getReunionByDate(d), naechste);
  await page.evaluate(sid => { window.__kbGo('students'); location.hash = '#/student/' + encodeURIComponent(sid) + '?hub=reunion'; }, ids.tom); await warte(700);
  await page.fill('#rw-text', 'Update vom Schülerblatt (erfunden)'); await warte(1800);
  const neu = await page.evaluate(([d, sid]) => { const r = Repo.getReunionByDate(d); return r ? (r.goals[sid] || []).map(g => g.text + (g.done ? '✓' : '')).join('|') : null; }, [naechste, ids.tom]);
  check('Neue Réunion übernimmt das offene Ziel (nicht das erledigte)', !vorher && neu === 'Offenes Ziel (erfunden)', { vorher, neu });
  await page.evaluate(([d, lea]) => Repo.saveEntry({ studentId: lea, date: d, author: 'Test', category: 'Team-Réunion', tags: ['Réunion'], text: 'Update zur Ehemaligen (erfunden)' }), [naechste, ids.lea]);
  await page.evaluate(([d, lea]) => { const r = Repo.getReunionByDate(d); r.goals[lea] = [{ text: 'Ziel der Ehemaligen (erfunden)', done: false }]; return Repo.saveReunion(r); }, [naechste, ids.lea]);
  await page.reload({ waitUntil: 'load' }); await warte(1500);
  await page.evaluate(d => { window.__kbGo('reunion'); location.hash = '#/reunion?date=' + d; }, naechste); await warte(800);
  const liste = await page.evaluate(lea => !!document.querySelector('.reu-card[data-card="' + lea + '"]'), ids.lea);
  const [wordDl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }).catch(() => null), page.click('[data-act="word"]')]);
  let word = '';
  if (wordDl) { const p = path.join(OUT, 'korrekturen-protokoll.doc'); await wordDl.saveAs(p); word = fs.readFileSync(p, 'utf8'); fs.unlinkSync(p); }
  check('Protokoll (Word) enthält Update und Ziel der Ehemaligen – ohne „dazuholen“', word.includes('Update zur Ehemaligen (erfunden)') && word.includes('Ziel der Ehemaligen (erfunden)') && word.includes('Lea Beispiel'));
  check('In der Liste steht die Ehemalige weiterhin nur nach „dazuholen“', !liste);

  console.log('7) KI-Anonymisierung (K8)');
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: HOST });
  await page.evaluate(sid => Repo.saveEntry({ studentId: sid, date: '2026-09-10', author: 'Test', category: 'Schule', tags: [], text: 'tom muster kam spät. Danach war tom ruhig. TOM MUSTER lacht.' }), ids.tom);
  await page.evaluate(() => window.__kbGo('ai')); await warte(700);
  await page.selectOption('#ai-student', ids.tom); await warte(300);
  await page.click('label.ki-task:has([data-prompt="0"])');
  await page.click('#ai-step-names'); await warte(400);
  const block = (await page.textContent('.ki-kid')).replace(/\s+/g, ' ');
  check('Namensblock sagt „wird ersetzt“ und nennt die Prüfung in Schritt 3', block.includes('wird ersetzt') && !block.includes('immer ersetzt') && block.includes('Klein geschriebene Formen') && block.includes('Schritt 3'), block);
  await page.click('#ai-step-preview'); await warte(500);
  const vorschau = await page.textContent('#ai-preview-text');
  check('Ganzer Name auch klein geschrieben ersetzt, „tom“ allein bleibt als Rest markiert', !/tom muster/i.test(vorschau) && /war tom ruhig/.test(vorschau) && (await page.$$eval('[data-ki-rest]', els => els.map(e => e.querySelector('.ki-rest-w').textContent))).join() === 'tom');
  await page.evaluate(() => navigator.clipboard.writeText('leer'));
  ctx.dialoge.length = 0; ctx.antwort = false;
  await page.click('#ai-copy'); await warte(300);
  const frage = ctx.dialoge.find(d => d.typ === 'confirm');
  check('„Text kopieren“ fragt bei Resten nach; „Abbrechen“ kopiert nichts', !!frage && frage.text.includes('Im Text stehen noch mögliche Namen: tom') && (await page.evaluate(() => navigator.clipboard.readText())) === 'leer', frage);
  ctx.antwort = null;
  await page.click('[data-ki-rest]'); await warte(500);
  ctx.dialoge.length = 0;
  await page.click('#ai-copy'); await warte(300);
  const kopiert = await page.evaluate(() => navigator.clipboard.readText());
  check('Ohne Reste: ein Klick kopiert, ohne Rückfrage', ctx.dialoge.length === 0 && kopiert.includes('lacht') && !/\btom\b/i.test(kopiert), ctx.dialoge);

  console.log('8) Karte „Dossier-Bericht“ (K11)');
  await page.evaluate(() => window.__kbGo('werkzeuge')); await warte(300);
  const karte = await page.evaluate(() => { const b = document.querySelector('#kb-werkzeuge [data-kb-nav="export"]'); return b ? b.closest('.kb-tool').textContent.replace(/\s+/g, ' ') : ''; });
  check('Karte beschreibt, was die Seite tut (Einträge, Filter, Druckansicht), ohne Kurven und Anonymisierung', /Einträge/.test(karte) && /Zeitraum/.test(karte) && !/Verlaufskurven|anonymisiert/.test(karte), karte);

  console.log('9) Tag-Feld im Eintrag (K13)');
  await page.evaluate(sid => { window.__kbGo('students'); location.hash = '#/entry/new/' + sid; }, ids.tom); await warte(700);
  const n1 = fehler.length;
  await page.click('#tag-input'); await page.keyboard.type('Pause'); await page.keyboard.press('Enter'); await warte(150);
  await page.keyboard.type('Streit'); await page.keyboard.press(','); await warte(150);
  await page.keyboard.type('Familie'); await warte(100);
  const tags = await page.evaluate(() => ({ chips: [...document.querySelectorAll('#tag-wrap .chip')].map(c => c.firstChild.textContent).join(','), feld: document.querySelector('#tag-input').value, fokus: document.activeElement.id }));
  check('Nach Enter und Komma bleibt der Cursor im Feld, nichts geht verloren, keine Fehler', tags.chips === 'Pause,Streit' && tags.feld === 'Familie' && tags.fokus === 'tag-input' && fehler.length === n1, { tags, fehler: fehler.slice(n1) });
  await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace'); await warte(150);
  const tags2 = await page.evaluate(() => ({ chips: [...document.querySelectorAll('#tag-wrap .chip')].map(c => c.firstChild.textContent).join(','), fokus: document.activeElement.id }));
  check('Rücktaste im leeren Feld entfernt den letzten Tag, Cursor bleibt', tags2.chips === 'Pause' && tags2.fokus === 'tag-input', tags2);
  await page.evaluate(() => { const b = document.querySelector('.form-savebar [data-route]'); if (b) b.click(); }); await warte(300);

  console.log('10) Papierkorb, Noten, leerer Name, Stundenplan (K15b–e)');
  await page.evaluate(async sid => { const e = await Repo.saveEntry({ studentId: sid, date: '2026-09-21', author: 'Test', category: 'Schule', tags: [], text: 'Test Eintrag ist das' }); await Repo.deleteEntry(e.id); }, ids.tom);
  await page.evaluate(() => window.__kbGo('data')); await warte(300);
  const papier = await page.evaluate(() => { const t = [...document.querySelectorAll('.kb-trash-txt')].map(x => x.textContent).find(x => x.includes('Eintrag')); return t || ''; });
  check('Papierkorb-Vorschau behält jedes „s“', papier.includes('Test Eintrag ist das'), papier);
  await page.evaluate(sid => { window.__kbGo('students'); location.hash = '#/student/' + encodeURIComponent(sid) + '?hub=noten&nf=0'; }, ids.tom); await warte(700);
  ctx.dialoge.length = 0;
  await page.fill('.note-card.is-open [data-nf="points"]', '80'); await page.fill('.note-card.is-open [data-nf="max"]', '50');
  await page.click('.note-card.is-open [data-noten-add]'); await warte(300);
  const noten1 = await page.evaluate(sid => KB_NOTEN.list(sid, null, null).length, ids.tom);
  const meldung = (ctx.dialoge.find(d => d.typ === 'alert') || {}).text || '';
  check('80 von 50 Punkten wird abgelehnt, mit klarer Meldung', noten1 === 0 && meldung.includes('zwischen 0 und 50'), meldung);
  await page.fill('.note-card.is-open [data-nf="max"]', '0'); ctx.dialoge.length = 0;
  await page.click('.note-card.is-open [data-noten-add]'); await warte(300);
  check('Höchstpunktzahl 0 wird abgelehnt', (await page.evaluate(sid => KB_NOTEN.list(sid, null, null).length, ids.tom)) === 0 && ctx.dialoge.some(d => d.text.includes('größer als 0')));
  await page.fill('.note-card.is-open [data-nf="points"]', '40'); await page.fill('.note-card.is-open [data-nf="max"]', '50');
  await page.click('.note-card.is-open [data-noten-add]'); await warte(400);
  const noten2 = await page.evaluate(sid => KB_NOTEN.list(sid, null, null).map(g => g.points + '/' + g.max).join(), ids.tom);
  check('40 von 50 Punkten wird gespeichert', noten2 === '40/50', noten2);
  await page.evaluate(() => window.__kbGo('klasse')); await warte(400);
  ctx.dialoge.length = 0;
  await page.evaluate(sid => { const i = document.querySelector('#kb-roster-body tr[data-id="' + sid + '"] .kb-rn'); i.value = '   '; i.dispatchEvent(new Event('change', { bubbles: true })); }, ids.tom); await warte(300);
  const name = await page.evaluate(sid => ({ roster: KB_ROSTER.byId(sid).name, feld: document.querySelector('#kb-roster-body tr[data-id="' + sid + '"] .kb-rn').value }), ids.tom);
  check('Leerer Name wird nicht übernommen, der bisherige bleibt, mit Hinweis', name.roster === 'Tom Muster' && name.feld === 'Tom Muster' && ctx.dialoge.some(d => d.text.includes('nicht leer')), name);
  await woche(page, ids.tom);
  await page.evaluate(() => window.__kbGo('klasse')); await warte(300);
  await page.click('#kb-tt-grid [data-ttc="L1|1|2"]', { clickCount: 3 }); await page.keyboard.type('Geschichte (erfunden)'); await page.keyboard.press('Tab'); await warte(300);
  await page.evaluate(() => window.__kbGo('absenzen')); await warte(400);
  const fach = await page.evaluate(sel => document.querySelector(sel).querySelector('.subj-lbl').textContent, zelle(ids.tom, 'b3', WOCHE));
  check('Nach dem Ändern im Stundenplan zeigt das Klassenbuch sofort das neue Fach', fach === 'Geschichte (erfunden)', fach);

  console.log('11) Zwei Fenster (K5)');
  const ctx2 = await kontext(browser, fehler);
  const A = await ctx2.newPage(); await frisch(A);
  const t2 = await A.evaluate(() => ({ tom: KB_ROSTER.add('Tom Muster', '', 'L1', 'ES'), lea: KB_ROSTER.add('Lea Beispiel', '', 'L1', 'ES') }));
  const B = await ctx2.newPage(); await B.goto(BASE, { waitUntil: 'load' }); await warte(1500);
  await woche(A, t2.tom); await A.click(zelle(t2.tom, 'b3', '2026-09-21')); await warte(400);
  await woche(B, t2.lea); await B.click(zelle(t2.lea, 'b3', '2026-09-22')); await warte(400);
  await A.evaluate(() => KB_ROSTER.add('Ben Probe', '', 'L2', 'ES')); await warte(300);
  await B.evaluate(() => KB_ROSTER.add('Mia Beispiel', '', 'L2', 'ES')); await warte(300);
  const bSieht = await B.evaluate(sid => KB_ANW.exportEntries().some(e => e.studentId === sid), t2.tom);
  await B.close(); await A.reload({ waitUntil: 'load' }); await warte(1500);
  const beide = await A.evaluate(([tom, lea]) => ({ tom: KB_ANW.exportEntries().some(e => e.studentId === tom), lea: KB_ANW.exportEntries().some(e => e.studentId === lea), liste: KB_ROSTER.list().filter(s => /Ben Probe|Mia Beispiel/.test(s.name)).length }), [t2.tom, t2.lea]);
  check('Das zweite Fenster übernimmt die Absenz des ersten sofort', bSieht);
  check('Absenzen und Klassenliste beider Fenster bleiben erhalten', beide.tom && beide.lea && beide.liste === 2, beide);
  await ctx2.close();

  console.log('12) Handy 390 px (K14)');
  const ctx3 = await kontext(browser, fehler, { viewport: { width: 390, height: 844 } });
  const H = await ctx3.newPage(); await frisch(H);
  await H.evaluate(() => window.__kbGo('klasse')); await warte(400);
  const klasse = await H.evaluate(() => {
    const t = document.querySelector('#kb-term-tabs [data-termkey="T3"]').getBoundingClientRect(), k = document.getElementById('kb-term-tabs').closest('.kb-card').getBoundingClientRect();
    /* ein Datumsfeld meldet Abschneiden nicht über scrollWidth – darum mit seiner natürlichen Breite vergleichen */
    const d = document.querySelector('#kb-term-dates input'), n = d.cloneNode(); n.style.cssText = 'width:auto;min-width:0;flex:none;position:absolute'; d.parentNode.appendChild(n);
    const natur = n.getBoundingClientRect().width; n.remove();
    return { ueber: document.documentElement.scrollWidth - innerWidth, t3: Math.round(t.right), karte: Math.round(k.right), datum: Math.round(d.getBoundingClientRect().width), natur: Math.round(natur) };
  });
  check('„Klasse & Stundenplan“: nichts zu breit, „3. Trimester“ ganz sichtbar, Datum lesbar', klasse.ueber <= 1 && klasse.t3 <= klasse.karte && klasse.datum >= klasse.natur - 1, klasse);
  await H.evaluate(() => window.__kbGo('reunion')); await warte(700);
  await H.evaluate(() => window.scrollTo(0, 900)); await warte(300);
  const reu = await H.evaluate(() => { const k = document.querySelector('#dos-root .reu-topbar').getBoundingClientRect(), l = document.querySelector('.kb-topbar').getBoundingClientRect(); return { kopfOben: Math.round(k.top), kopfUnten: Math.round(k.bottom), leisteUnten: Math.round(l.bottom) }; });
  check('Réunion: der Kopf rutscht beim Scrollen nicht unter die App-Leiste', reu.kopfUnten <= reu.leisteUnten || reu.kopfOben >= reu.leisteUnten, reu);
  await H.evaluate(() => window.scrollTo(0, 0));
  const hk = await H.evaluate(() => KB_ROSTER.add('Tom Muster', '', 'L1', 'ES'));
  await woche(H, hk);
  const zf = zelle(hk, 'b5', '2026-09-25');
  await H.click(zf); await warte(400);
  const raster = await H.evaluate(([sel, sid]) => { const g = document.querySelector('#anw-root .wk-grid'), c = document.querySelector(sel).getBoundingClientRect(); return { links: Math.round(g.scrollLeft), zelle: [Math.round(c.left), Math.round(c.right)], breite: innerWidth, eintraege: KB_ANW.exportEntries().filter(e => e.studentId === sid).length }; }, [zf, hk]);
  check('Klassenbuch: nach dem Klick bleibt die Woche an der Stelle, die Zelle am Freitag bleibt im Bild', raster.eintraege === 1 && raster.links > 0 && raster.zelle[0] >= 0 && raster.zelle[1] <= raster.breite, raster);
  const H2 = await ctx3.newPage(); await H2.goto(BASE, { waitUntil: 'load' }); await warte(3000);
  await H.evaluate(() => { window.scrollTo(0, 0); window.__kbGo('heute'); }); await warte(3000);
  const balken = await H.evaluate(() => { const b = document.getElementById('kb-tabwarn'); if (!b) { return null; } const r = b.getBoundingClientRect(), m = document.getElementById('kb-burger').getBoundingClientRect(); const e = document.elementFromPoint(m.left + m.width / 2, m.top + m.height / 2); return { hoehe: Math.round(r.height), menue: !!(e && e.closest('#kb-burger')) }; });
  check('Hinweis „mehrere Fenster“ verdeckt die Menü-Taste ☰ nicht', !!balken && balken.menue && balken.hoehe <= 120, balken);
  /* „Team-Datei nicht verbunden“ und Löschbremse nachgestellt – mit dem Stil, den KB_SYNC ihnen am Element gibt */
  const leisten = await H.evaluate(() => {
    const mk = (id, z, farbe) => { const el = document.createElement('div'); el.id = id; el.setAttribute('role', 'alert'); el.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:' + z + ';background:' + farbe + ';color:#fff;font:600 14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:11px 16px;display:flex;gap:14px;align-items:center;justify-content:center;flex-wrap:wrap;box-shadow:0 2px 14px rgba(0,0,0,.35);'; el.textContent = 'Testleiste mit etwas längerem Text, damit sie auf dem Handy über mehrere Zeilen geht.'; document.body.appendChild(el); return el; };
    const a = mk('kb-syncwarn', 9998, '#E8A317'), b = mk('kb-wipewarn', 10000, '#8E1B12');
    const m = document.getElementById('kb-burger').getBoundingClientRect(), e = document.elementFromPoint(m.left + m.width / 2, m.top + m.height / 2);
    const lage = el => { const r = el.getBoundingClientRect(); return { oben: Math.round(r.top), unten: Math.round(r.bottom), schrift: getComputedStyle(el).fontSize }; };
    const aus = { menue: !!(e && e.closest('#kb-burger')), sync: lage(a), loeschbremse: lage(b), hoehe: innerHeight };
    a.remove(); b.remove();
    return aus;
  });
  check('Warnleisten „Team-Datei nicht verbunden“ und Löschbremse stehen unten und lassen ☰ frei', leisten.menue && Math.abs(leisten.sync.unten - leisten.hoehe) <= 1 && Math.abs(leisten.loeschbremse.unten - leisten.hoehe) <= 1 && leisten.loeschbremse.schrift === '12.5px', leisten);
  await ctx3.close();

  console.log('13) Schuljahr-Hinweis (K6), Texte und Einzahl, Wochen-Sicherung, Dossier-Backup, CSV mit Ehemaligen');
  const ctx4 = await kontext(browser, fehler);
  const R = await ctx4.newPage(); await frisch(R);
  const k4 = await R.evaluate(() => ({ tom: KB_ROSTER.add('Tom Muster', '', 'L1', 'ES'), lea: KB_ROSTER.add('Lea Beispiel', '', 'L2', 'ES') }));
  await R.evaluate(() => window.__kbGo('klasse')); await warte(400);
  await R.click('#kb-term-add'); await warte(300);
  const jahr = await R.evaluate(() => { const h = document.getElementById('kb-term-hinweis'); return h ? { sichtbar: !h.hidden && !!h.offsetParent, text: h.textContent, fest: !KB_TERMS.active().auto } : null; });
  check('„+ Schuljahr anlegen“: Hinweis, dass das neue Jahr jetzt fest gewählt ist und wie es zurückgeht', !!jahr && jahr.sichtbar && jahr.fest && /^\d{4}\/\d{2} ist jetzt fest gewählt – „⟳ Automatisch“ führt zurück zum laufenden Schuljahr\.$/.test(jahr.text), jahr);
  await R.click('#kb-term-auto'); await warte(300);
  check('Nach „⟳ Automatisch“ ist der Hinweis wieder weg', await R.evaluate(() => { const h = document.getElementById('kb-term-hinweis'); return !!h && h.hidden && KB_TERMS.active().auto; }));
  /* Tom: je ein Dossier-Eintrag, eine Absenz, eine Note; Lea: ein Retard. In der Woche ab 14.09.2026 liegen davon nur Absenz und Retard. */
  await R.evaluate(async ([tom, lea]) => {
    await Repo.saveEntry({ studentId: tom, date: '2026-09-10', author: 'Test', category: 'Schule', tags: [], text: 'Eintrag (erfunden)' });
    const e = (id, sid, date, blk, status) => ({ id, studentId: sid, date, weekday: new Date(date + 'T12:00:00').getDay(), blockId: blk, subject: 'Mathe', status, hours: 1.5, note: '', byUser: 'Test', byUserAt: 1 });
    KB_ANW.applyEntries([e('w1', tom, '2026-09-16', 'b3', 'unentschuldigt'), Object.assign(e('w2', lea, '2026-09-17', 'b5', 'verspaetet'), { lateMin: 10 })]);
    KB_NOTEN.add(tom, { subject: 'Mathe', period: 'S1', points: 40, max: 60 });
  }, [k4.tom, k4.lea]);
  await R.evaluate(() => window.__kbGo('klasse')); await warte(400);
  ctx4.dialoge.length = 0; ctx4.antwort = false;
  await R.click('#kb-roster-body tr[data-id="' + k4.tom + '"] .kb-rd'); await warte(300);
  ctx4.antwort = null;
  const loeschen = (ctx4.dialoge.find(d => d.typ === 'confirm') || {}).text || '';
  check('Löschen fragt in der Einzahl: „1 Dossier-Eintrag, 1 Absenz, 1 Note“ – und „Abbrechen“ lässt Tom stehen', loeschen.includes('Daran hängen: 1 Dossier-Eintrag, 1 Absenz, 1 Note.') && !!(await R.evaluate(sid => KB_ROSTER.byId(sid), k4.tom)), loeschen);
  await R.evaluate(() => { window.__kbGo('students'); location.hash = '#/'; }); await warte(700);
  const chips = await R.evaluate(ids => ids.map(sid => { const k = document.querySelector('article.st-card[data-route="#/student/' + sid + '"] .st-chips'); return k ? k.textContent.replace(/\s+/g, ' ').trim() : ''; }), [k4.tom, k4.lea]);
  check('Übersicht: „1 Absenz“ statt „1 Absenzen“', chips[0].includes('1 Absenz · 1 unent.') && !chips[0].includes('Absenzen'), chips[0]);
  check('Übersicht: der Retard hat einen eigenen Chip „1 Retard“ und zählt nicht als Absenz', chips[1] === '1 Retard', chips[1]);
  await R.evaluate(() => { window.__kbGo('data'); const i = document.getElementById('kb-wk-date'); i.value = '2026-09-14'; i.dispatchEvent(new Event('change', { bubbles: true })); }); await warte(300);
  /* nur Absenzen und Retards prüfen – die eingebauten Daten der Annexe können in derselben Woche weitere Einträge haben */
  const wochenSich = await R.evaluate(() => ({ teile: document.getElementById('kb-wk-counts').textContent.replace(/\s+/g, ' ').trim().replace(/^.*?: /, '').split(' · '), bereiche: KB_WEEKLY.collect('2026-09-14', '2026-09-20').filter(r => /^(Absenzen|Retards)$/.test(r.bereich)).map(r => r.bereich + ':' + r.details).sort().join(' | ') }));
  check('Wochen-Sicherung: der Retard zählt nicht als Absenz – „1 Absenz · 1 Retard“', wochenSich.teile.includes('1 Absenz') && wochenSich.teile.includes('1 Retard') && !wochenSich.teile.some(t => /Absenzen/.test(t)) && wochenSich.bereiche === 'Absenzen:Non-excusé | Retards:Retard (10 min)', wochenSich);
  await R.evaluate(sid => { window.__kbGo('students'); location.hash = '#/entry/new/' + sid; }, k4.lea); await warte(700);
  const regler = await R.evaluate(() => [...document.querySelectorAll('.slider-field')].map(f => f.textContent).join(' ').replace(/\s+/g, ' '));
  const quelle = await R.evaluate(() => fetch(location.href).then(r => r.text()));
  const alt = ['vollständig present', 'schicke mir bitte', 'Chrome/Edge moeglich', 'bleiben unveraendert', '<i>index.html</i>'].filter(s => quelle.includes(s));
  check('Texte: „vollständig präsent“, Hinweis beim DS/PEI-Import für Lehrkräfte, „möglich“, „unverändert“, Hub statt index.html', regler.includes('10 = vollständig präsent') && alt.length === 0 && quelle.includes('erkennt der Import sie nicht') && quelle.includes('Nur in Chrome/Edge möglich.') && quelle.includes('(lokale Daten bleiben unverändert)'), { alt, regler: regler.includes('vollständig präsent') });
  const autorFeld = await R.evaluate(() => (document.getElementById('f-author') || {}).placeholder);
  check('Platzhalter nur mit erfundenen Namen: Autor „z. B. MM“, DS/PEI-Import „z. B. Mia Muster“', autorFeld === 'z. B. MM' && quelle.includes('<textarea id="imp-extra" rows="2" placeholder="z. B. Mia Muster">'), autorFeld);
  await R.evaluate(() => { window.__kbGo('students'); location.hash = '#/backup'; }); await warte(700);
  const bk = await R.evaluate(() => ({ zahl: +((/(\d+) Schüler/.exec(document.getElementById('bk-summary').textContent) || [])[1] || -1), liste: KB_ROSTER.list().length }));
  const [bkDl] = await Promise.all([R.waitForEvent('download', { timeout: 8000 }).catch(() => null), R.click('#bk-export')]);
  const bkDaten = bkDl ? await lies(bkDl) : null, bkJson = bkDaten ? JSON.parse(bkDaten.toString('utf8')) : { students: [] };
  check('Dossier-Backup: gleiche Zahl Schüler in Übersicht, Klassenliste und Datei', bk.zahl === bk.liste && bkJson.students.length === bk.liste && bkJson.students.some(s => s.id === k4.tom), { bk, datei: bkJson.students.length });
  let panel = null, nach = null;
  if (bkDaten) {
    await R.setInputFiles('#bk-file', { name: 'dossier-backup.json', mimeType: 'application/json', buffer: bkDaten }); await warte(600);
    panel = await R.evaluate(() => { const p = document.getElementById('bk-import-panel'); return { ersetzen: !!p.querySelector('[value="replace"]') || /Ersetzen/.test(p.textContent), zusammen: !!p.querySelector('[value="merge"]:checked') }; });
    await R.click('#bk-confirm-import'); await warte(900);
    nach = await R.evaluate(sid => ({ liste: KB_ROSTER.list().length, eintraege: Repo.entriesForStudent(sid).length }), k4.tom);
  }
  check('Backup importieren: nur noch „Zusammenführen“, kein „Ersetzen“ – danach ist alles noch da', !!panel && !panel.ersetzen && panel.zusammen && nach.liste === bk.liste && nach.eintraege === 1, { panel, nach });
  await R.evaluate(sid => KB_ROSTER.update(sid, { active: false }), k4.lea); await warte(300);
  await R.evaluate(() => window.__kbGo('absenzen')); await warte(400);
  const [csvDl2] = await Promise.all([R.waitForEvent('download', { timeout: 8000 }).catch(() => null), R.evaluate(() => document.getElementById('export-csv').click())]);
  const csv2 = csvDl2 ? (await lies(csvDl2)).toString('utf8').split(/\r?\n/).filter(z => /Tom Muster|Lea Beispiel/.test(z)).map(z => z.split(';').slice(0, 4).join(';')) : [];
  check('CSV: die Ehemalige steht mit Namen und Niveau da („(ehemalig)“), nicht als „(gelöscht)“', csv2.join(' | ') === '2026-09-16;Mittwoch;Tom Muster;L1 | 2026-09-17;Donnerstag;Lea Beispiel (ehemalig);L2', csv2);
  await ctx4.close();

  console.log('14) Heute: Fehlzeiten mit den Stunden laut Stundenplan (Uhr auf Freitag, 25.09.2026)');
  const ctx5 = await kontext(browser, fehler);
  await ctx5.clock.install({ time: new Date('2026-09-25T10:00:00+02:00') });
  const U = await ctx5.newPage(); await frisch(U);
  const fz = await U.evaluate(() => {
    const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const ben = KB_ROSTER.add('Ben Probe', '', 'L2', 'ES'), tt = KB_ANW.getTimetable().L2 || {}, r = KB_TERMS.dateRange(), heute = todayIso();
    /* Ben fehlt Montag, 21.09., und Dienstag, 22.09., ganz – jede Stunde laut Stundenplan */
    const liste = []; let n = 0;
    [['2026-09-21', 1], ['2026-09-22', 2]].forEach(([tag, w]) => KB_ANW.blocks().forEach((b, i) => { const s = (tt[w] || [])[i], h = KB_ANW.hoursOf({ blockId: b.id, subject: s }); if (h > 0) { liste.push({ id: 'h' + (++n), studentId: ben, date: tag, weekday: w, blockId: b.id, subject: s, status: 'unentschuldigt', hours: h, note: '', byUser: 'Test', byUserAt: 1 }); } }));
    KB_ANW.applyEntries(liste);
    /* mögliche Stunden: jeder Schultag vom Trimesterbeginn bis heute mit seinen Stunden laut Stundenplan */
    let moeglich = 0, tage = 0;
    for (const d = new Date(r.from + 'T12:00:00'); iso(d) <= heute; d.setDate(d.getDate() + 1)) { const w = d.getDay(); if (w > 0 && w < 6 && !KB_ANW.holidayInfo(iso(d))) { tage++; KB_ANW.blocks().forEach((b, i) => { moeglich += KB_ANW.hoursOf({ blockId: b.id, subject: (tt[w] || [])[i] }); }); } }
    return { heute, tage, moeglich, fehlt: liste.reduce((s, e) => s + KB_ANW.hoursOf(e), 0), mo: KB_ANW.hoursOnDay ? KB_ANW.hoursOnDay('L2', 1) : null, di: KB_ANW.hoursOnDay ? KB_ANW.hoursOnDay('L2', 2) : null };
  });
  await U.evaluate(() => window.__kbGo('heute')); await warte(500);
  /* nur Bens Zeile und die Fußnote lesen */
  const fzKarte = await U.evaluate(() => { const k = [...document.querySelectorAll('#kb-heute .kb-heute-karte')].find(x => /Fehlzeiten im Trimester/.test(x.textContent)), z = k && [...k.querySelectorAll('li')].find(li => li.textContent.includes('Ben Probe')), f = k && k.querySelector('.kb-heute-fuss'); return ((z ? z.textContent : '') + ' | ' + (f ? f.textContent : '')).replace(/\s+/g, ' '); });
  const fzP = Math.round(fz.fehlt / fz.moeglich * 100), fzAlt = Math.round(fz.fehlt / (fz.tage * 7) * 100);
  check('Stunden je Tag aus dem Stundenplan: Montag 5, Dienstag 7 (L2)', fz.mo === 5 && fz.di === 7, fz);
  check('Ben: ' + fzP + ' % (' + fz.fehlt + ' von ' + fz.moeglich + ' Std. laut Stundenplan), nicht ' + fzAlt + ' % mit pauschal 7 Std. je Tag', fz.heute === '2026-09-25' && fz.fehlt === 12 && fzP !== fzAlt && new RegExp('Ben Probe ?' + fzP + ' % · 12 Std\\. \\(12 unentsch\\.\\)').test(fzKarte) && fzKarte.includes('Schulstunden laut Stundenplan seit Trimesterbeginn (' + fz.tage + ' Schultage)'), { fz, fzP, fzAlt, karte: fzKarte });
  await ctx5.close();

  console.log('15) Browser ohne Zugriff auf Dateien: Hinweis nennt den Hub');
  const ctx6 = await kontext(browser, fehler, { init: () => { delete window.showOpenFilePicker; delete window.showSaveFilePicker; } });
  const F = await ctx6.newPage(); await frisch(F);
  await F.evaluate(() => window.__kbGo('data')); await warte(400);
  const sync = await F.evaluate(() => document.getElementById('kb-sync-status').textContent.replace(/\s+/g, ' '));
  check('„Bitte den Hub in Microsoft Edge öffnen: Rechtsklick auf hub.html“ – nicht index.html', sync.includes('Bitte den Hub in Microsoft Edge öffnen: Rechtsklick auf hub.html') && !sync.includes('index.html'), sync);
  await ctx6.close();

  console.log('16) Kleines Handy 320 × 568: Startdialog ohne Person aus dem Hub');
  const ctx7 = await kontext(browser, fehler, { viewport: { width: 320, height: 568 } });
  const G = await ctx7.newPage(); await frisch(G, true);
  const tor = await G.evaluate(() => { const g = document.getElementById('kb-gate'), k = g && g.querySelector('.kb-gate-card'); return k ? { offen: g.classList.contains('open'), oben: Math.round(k.getBoundingClientRect().top) } : null; });
  let geklickt = true;
  await G.click('#kb-gate-other', { timeout: 4000 }).catch(() => { geklickt = false; }); await warte(400);
  const wer = await G.evaluate(() => ({ offen: document.getElementById('kb-gate').classList.contains('open'), person: KB_USER.get() }));
  check('Karte oben nicht abgeschnitten, „+ Andere Person“ erreichbar, danach ist die Person gewählt', !!tor && tor.offen && tor.oben >= 0 && geklickt && !wer.offen && wer.person === 'Test Person', { tor, geklickt, wer });
  await ctx7.close();

  console.log('17) Backup importieren: Vorhandenes nur durch eine neuere Fassung ersetzen');
  const ctx8 = await kontext(browser, fehler);
  const I = await ctx8.newPage(); await frisch(I);
  const imp = await I.evaluate(async () => {
    const tom = KB_ROSTER.add('Tom Muster', '', 'L1', 'ES');
    const neu = t => Repo.saveEntry({ studentId: tom, date: '2027-06-07', author: 'Test', category: 'Schule', tags: [], text: t });
    const a = await neu('A hier (erfunden)'), b = await neu('B hier (erfunden)'), c = await neu('C hier (erfunden)'), d = await neu('D gleich (erfunden)');
    const r = await Repo.saveReunion({ date: '2027-06-07', orgItems: ['Orga hier (erfunden)'], studentOrder: [], goals: {} });
    const spaeter = new Date(Date.parse(a.updatedAt) + 864e5).toISOString(), frueher = new Date(Date.parse(b.updatedAt) - 864e5).toISOString();
    /* A: in der Datei neuer · B: in der Datei älter · C: in der Datei ohne Zeitstempel · D: gleich · dazu ein neuer Eintrag und eine neue Réunion */
    const datei = { format: 'cdse-dossier-backup', version: 2, exportedAt: spaeter, students: [],
      entries: [Object.assign({}, a, { text: 'A aus der Datei, neuer (erfunden)', updatedAt: spaeter }), Object.assign({}, b, { text: 'B aus der Datei, älter (erfunden)', updatedAt: frueher }),
        Object.assign({}, c, { text: 'C aus der Datei, ohne Zeitstempel (erfunden)', updatedAt: undefined }), Object.assign({}, d),
        { id: 'e_imp_neu', studentId: tom, date: '2027-06-08', author: 'Test', category: 'Schule', tags: [], text: 'Neu aus der Datei (erfunden)', sliders: {}, createdAt: spaeter, updatedAt: spaeter }],
      reunions: [Object.assign({}, r, { orgItems: ['Orga aus der Datei (erfunden)'] }), { id: 'reu_20270614', date: '2027-06-14', orgItems: ['Neue Réunion (erfunden)'], studentOrder: [], goals: {}, discussed: [] }] };
    return { ids: [a.id, b.id, c.id, d.id], reu: r.id, json: JSON.stringify(datei) };
  });
  await I.evaluate(() => { window.__kbGo('students'); location.hash = '#/backup'; }); await warte(700);
  await I.setInputFiles('#bk-file', { name: 'dossier-backup.json', mimeType: 'application/json', buffer: Buffer.from(imp.json) }); await warte(600);
  await I.click('#bk-confirm-import'); await warte(700);
  const nachImp = await I.evaluate(([ids, reu]) => ({
    texte: ids.map(id => (Repo.getEntry(id) || {}).text), neu: !!Repo.getEntry('e_imp_neu'), orga: (Repo.getReunion(reu) || {}).orgItems, reuNeu: !!Repo.getReunion('reu_20270614'),
    papierkorb: KB_TRASH.list().filter(t => t.kind === 'entry' && t.data.id === ids[0]).map(t => t.data.text),
    meldung: [...document.querySelectorAll('#toast-root .toast')].map(t => t.textContent).join(' | ')
  }), [imp.ids, imp.reu]);
  check('Neuere Fassung aus der Datei ersetzt die vorhandene, die alte liegt im Papierkorb', nachImp.texte[0] === 'A aus der Datei, neuer (erfunden)' && nachImp.papierkorb.join() === 'A hier (erfunden)', nachImp);
  check('Ältere Fassung und eine ohne Zeitstempel ersetzen nichts – auch bei den Réunions nicht', nachImp.texte[1] === 'B hier (erfunden)' && nachImp.texte[2] === 'C hier (erfunden)' && nachImp.texte[3] === 'D gleich (erfunden)' && JSON.stringify(nachImp.orga) === '["Orga hier (erfunden)"]', nachImp);
  check('Neues kommt dazu; die Meldung sagt, wie viel übernommen, ersetzt und behalten wurde', nachImp.neu && nachImp.reuNeu && nachImp.meldung.includes('Import abgeschlossen: 2 übernommen, 1 durch die neuere Fassung ersetzt (die alte liegt im Papierkorb), 3 vorhandene behalten'), nachImp.meldung);
  await ctx8.close();

  console.log('18) Team-Datei: Retards eigens gezählt');
  const ctx9 = await kontext(browser, fehler, { teamDatei: true });
  const T = await ctx9.newPage(); await frisch(T);
  await T.evaluate(() => {
    const tom = KB_ROSTER.add('Tom Muster', '', 'L1', 'ES');
    const e = (id, date, status) => ({ id, studentId: tom, date, weekday: new Date(date + 'T12:00:00').getDay(), blockId: 'b3', subject: 'Mathe', status, hours: 1.5, note: '', byUser: 'Test', byUserAt: 1 });
    KB_ANW.applyEntries([e('t1', '2026-09-21', 'unentschuldigt'), e('t2', '2026-09-22', 'entschuldigt'), Object.assign(e('t3', '2026-09-23', 'verspaetet'), { lateMin: 5 })]);
  });
  await T.evaluate(() => KB_SYNC.connectNew()); await warte(2500);
  await T.evaluate(() => window.__kbGo('data')); await warte(400);
  const team = await T.evaluate(() => { const t = document.getElementById('kb-sync-status').textContent.replace(/\s+/g, ' '), m = /In der gemeinsamen Datei: .*/.exec(t); return m ? m[0] : '(nicht verbunden)'; });
  check('Team-Datei: „2 Absenzen · 1 Retard“ statt „3 Absenzen“', team.includes(' 2 Absenzen · 1 Retard · '), team);
  await ctx9.close();

  check('Keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 5));
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler  (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
