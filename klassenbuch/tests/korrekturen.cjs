// Test: Korrekturen aus dem Prüfbericht zum Klassenbuch – Retard-Fenster an der Zelle (K1), Heute-Tafel
// beim Start (K2), keine zweite Personenwahl (K3), Protokoll mit Ehemaligen (K4), zwei Fenster (K5),
// Réunion vom Schülerblatt mit offenen Zielen (K7), KI-Anonymisierung (K8), Absenzen-Bericht mit
// Ehemaligen (K9), CSV-Stunden (K10), Karte „Dossier-Bericht“ (K11), Tag-Feld (K13), Handy 390 px (K14),
// „Tag leeren“, Papierkorb, Noten, leerer Name, Stundenplan (K15a–e). Nur erfundene Personen.
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
async function frisch(page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(async () => {
    localStorage.clear();
    for (const n of ['cdse_dossier_db', 'klassebuch-sync', 'anwesenheit-sync']) { await new Promise(r => { const q = indexedDB.deleteDatabase(n); q.onsuccess = q.onerror = q.onblocked = () => r(); }); }
    localStorage.setItem('cdse-nutzer', JSON.stringify({ id: 'k1', name: 'Mia Muster', team: 'annexe' }));
  });
  await page.reload({ waitUntil: 'load' }); await warte(1500);
}
/* Klassenbuch für ein Kind in der festen Schulwoche öffnen */
async function woche(page, sid) {
  await page.evaluate(([sid, tag]) => { window.__kbGo('absenzen'); KB_ANW.openStudent(sid); const i = document.querySelector('#anw-root .date-in[data-date="' + sid + '"]'); i.value = tag; i.dispatchEvent(new Event('change', { bubbles: true })); }, [sid, WOCHE]);
  await warte(450);
}
const zelle = (sid, blk, tag) => '#anw-root .wcell[data-sid="' + sid + '"][data-blk="' + blk + '"][data-date="' + tag + '"]';

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
  const H2 = await ctx3.newPage(); await H2.goto(BASE, { waitUntil: 'load' }); await warte(3000);
  await H.evaluate(() => { window.scrollTo(0, 0); window.__kbGo('heute'); }); await warte(3000);
  const balken = await H.evaluate(() => { const b = document.getElementById('kb-tabwarn'); if (!b) { return null; } const r = b.getBoundingClientRect(), m = document.getElementById('kb-burger').getBoundingClientRect(); const e = document.elementFromPoint(m.left + m.width / 2, m.top + m.height / 2); return { hoehe: Math.round(r.height), menue: !!(e && e.closest('#kb-burger')) }; });
  check('Hinweis „mehrere Fenster“ verdeckt die Menü-Taste ☰ nicht', !!balken && balken.menue && balken.hoehe <= 120, balken);
  await ctx3.close();

  check('Keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 5));
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler  (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
