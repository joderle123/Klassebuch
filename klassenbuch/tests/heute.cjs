// Test: Heute-Tafel des Klassenbuchs – Anwesenheit heute, offene Entschuldigungen, Fehlzeiten im Trimester,
// Einträge für heute, offene Wochenziele; Klick auf ein Kind öffnet es im Klassenbuch. Nur erfundene Personen.
// Aufruf: node klassenbuch/tests/heute.cjs   (Webserver auf Port 8099 für den Hauptordner)
'use strict';
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8099/apps/klassenbuch.html';
const OUT = path.join(__dirname, 'aus'); fs.mkdirSync(OUT, { recursive: true });
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } }

(async () => {
  const t0 = Date.now();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, locale: 'de-DE', timezoneId: 'Europe/Luxembourg' });
  await ctx.addInitScript(() => { window.open = function () { return null; }; });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => d.type() === 'prompt' ? d.accept('Test Person') : d.accept());
  const warte = ms => page.waitForTimeout(ms);

  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(async () => { localStorage.clear(); for (const n of ['cdse_dossier_db']) { await new Promise(r => { const q = indexedDB.deleteDatabase(n); q.onsuccess = q.onerror = q.onblocked = () => r(); }); } localStorage.setItem('cdse-nutzer', JSON.stringify({ id: 'k1', name: 'Mia Muster', team: 'annexe' })); });
  await page.reload({ waitUntil: 'load' }); await warte(1500);

  console.log('1) Leere Klasse');
  check('Startseite ist die Heute-Tafel', await page.isVisible('#kb-heute.active') && (await page.textContent('#kb-heute')).includes('Noch keine Klasse'));

  console.log('2) Erfundene Klasse mit Absenzen, Einträgen und Wochenzielen');
  const info = await page.evaluate(async () => {
    const heute = todayIso(), r = KB_TERMS.dateRange();
    const tom = KB_ROSTER.add('Tom Muster', '', 'L1', 'ES'), lea = KB_ROSTER.add('Lea Beispiel', '', 'L1', 'ES'), ben = KB_ROSTER.add('Ben Probe', '', 'L2', 'ES');
    /* zwei frühe Schultage im Trimester (mindestens 4 Tage her) */
    const tage = []; const d = new Date(r.from + 'T12:00:00'); const grenze = new Date(); grenze.setDate(grenze.getDate() - 4);
    while (tage.length < 2 && d <= grenze) { const w = d.getDay(); const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); if (w > 0 && w < 6 && !KB_ANW.holidayInfo(iso)) { tage.push(iso); } d.setDate(d.getDate() + 1); }
    let n = 0; const e = (sid, date, blk, status) => ({ id: 't' + (++n), studentId: sid, date, weekday: new Date(date + 'T12:00:00').getDay(), blockId: blk, subject: 'Mathe', status, hours: 2, note: '', byUser: 'Test', byUserAt: new Date().toISOString() });
    const liste = [e(tom, heute, 'b3', 'unentschuldigt'), e(lea, heute, 'b5', 'entschuldigt')];
    tage.forEach(t => { ['b3', 'b5', 'b8'].forEach(b => liste.push(e(ben, t, b, 'unentschuldigt'))); });
    KB_ANW.applyEntries(liste);
    KB_ANW.applyNotes([{ id: 'n1', date: heute, blockId: null, subject: 'Mathe', level: 'L1', studentId: null, type: 'pruefung', text: 'Bruchrechnen (erfunden)', byUser: 'Test', byUserAt: '' },
      { id: 'n2', date: heute, blockId: null, subject: '', level: null, studentId: tom, type: 'hausaufgabe', text: 'Heft nachholen (erfunden)', byUser: 'Test', byUserAt: '' }]);
    const vor = new Date(); vor.setDate(vor.getDate() - 4); const vIso = vor.getFullYear() + '-' + String(vor.getMonth() + 1).padStart(2, '0') + '-' + String(vor.getDate()).padStart(2, '0');
    await Repo.saveReunion({ date: vIso, orgItems: [], studentOrder: [tom], goals: { [tom]: [{ text: 'Pünktlich kommen', done: true }, 'Hausaufgaben mitbringen'], group: ['Ruhig in die Pause'] } });
    return { tom, lea, ben, tage, schultage: KB_HEUTE.schultage(r.from, heute), stunden: KB_ANW.dayHours() };
  });
  check('Zwei frühe Schultage im Trimester gefunden, 7 Stunden je Schultag', info.tage.length === 2 && info.stunden === 7, info);
  await page.evaluate(() => window.__kbGo('heute')); await warte(400);
  const t = (await page.textContent('#kb-heute')).replace(/\s+/g, ' ');
  check('Anwesenheit heute: Tom 2 Std. unentschuldigt, Lea entschuldigt, 1 von 3 ohne Eintrag', /Tom Muster\s?2 Std\. unentschuldigt/.test(t) && /Lea Beispiel\s?2 Std\. entschuldigt/.test(t) && t.includes('1 von 3 ohne Eintrag'), t.slice(0, 400));
  check('Entschuldigung offen: Ben mit 12 Std. seit dem ersten Tag', /Ben Probe\s?12 Std\. seit/.test(t));
  const erwartetP = Math.round(12 / (info.schultage * 7) * 100);
  check('Fehlzeiten im Trimester: Ben mit ' + erwartetP + ' % (12 Std.)', erwartetP >= 10 ? t.includes('Ben Probe' + erwartetP + ' % · 12 Std. (12 unentsch.)') || t.includes('Ben Probe ' + erwartetP + ' % · 12 Std. (12 unentsch.)') : t.includes('Niemand fehlt'), { erwartetP, schultage: info.schultage });
  check('Für heute: Prüfung Mathe und persönliche Hausaufgabe für Tom', t.includes('Mathe: Bruchrechnen (erfunden)') && t.includes('Heft nachholen (erfunden) (nur Tom Muster)'));
  check('Offene Wochenziele: nur die nicht erledigten, auch das Gruppenziel', t.includes('Hausaufgaben mitbringen') && !t.includes('Pünktlich kommen') && t.includes('Gruppe') && t.includes('Ruhig in die Pause'));
  await page.screenshot({ path: path.join(OUT, 'h1-heute.png'), fullPage: true });

  console.log('3) Klick auf ein Kind');
  await page.click('#kb-heute [data-heute-kind="' + info.tom + '"]'); await warte(500);
  check('öffnet das Kind im Klassenbuch', await page.isVisible('#anw-root.active'));

  console.log('4) Handy (390 px)');
  await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => window.__kbGo('heute')); await warte(400);
  const q = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('390 px: ohne waagrechtes Scrollen', q <= 1, q);

  check('Keine Fehler in der Konsole', errors.length === 0, errors.slice(0, 5));
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler  (' + Math.round((Date.now() - t0) / 1000) + ' s, Bilder in ' + OUT + ')');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
