// Test: Anwesenheit – die Woche passt auf Laptop und großem Bildschirm ohne Scrollen, auf Tablet und Handy
// scrollt die Tabelle in ihrer Karte (alle Tage erreichbar, nichts wird rechts abgeschnitten).
// Einzeln und „Ganze Klasse“. Nur erfundene Personen.
// Aufruf: node klassenbuch/tests/layout.cjs   (Webserver auf Port 8099 für den Hauptordner)
'use strict';
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8099/apps/klassenbuch.html';
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } }

(async () => {
  const t0 = Date.now();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, locale: 'de-DE', timezoneId: 'Europe/Luxembourg' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const warte = ms => page.waitForTimeout(ms);
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(async () => { localStorage.clear(); await new Promise(r => { const q = indexedDB.deleteDatabase('cdse_dossier_db'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); localStorage.setItem('cdse-nutzer', JSON.stringify({ id: 'k1', name: 'Mia Muster', team: 'annexe' })); });
  await page.reload({ waitUntil: 'load' }); await warte(1200);
  await page.evaluate(() => { KB_ROSTER.add('Tom Muster', '', 'L1', 'ES'); KB_ROSTER.add('Lea Beispiel', '', 'L1', 'ES'); KB_ROSTER.add('Ben Probe', '', 'L1', 'ES'); window.__kbGo('absenzen'); });
  await warte(600);

  /* Tabelle der Woche und ihre Karte vermessen */
  const mass = () => page.evaluate(() => {
    const g = [...document.querySelectorAll('#anw-root .wk-grid, #anw-root .cw-grid')].filter(x => x.offsetParent)[0];
    if (!g) { return null; }
    const b = g.getBoundingClientRect(), karte = g.closest('.recorder, .stu-main, .card') || g;
    const k = karte.getBoundingClientRect();
    return { vw: innerWidth, links: Math.round(b.left), rechts: Math.round(b.right), sw: g.scrollWidth, cw: g.clientWidth, karteRechts: Math.round(k.right), seite: document.documentElement.scrollWidth - innerWidth, ox: getComputedStyle(g).overflowX };
  });
  for (const ansicht of ['einzeln', 'klasse']) {
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.evaluate(v => { const b = document.querySelector('#anw-root [data-view="' + v + '"]'); if (b) { b.click(); } }, ansicht); await warte(500);
    for (const [breite, passt] of [[1280, true], [1440, true], [768, false], [390, false]]) {
      await page.setViewportSize({ width: breite, height: 860 }); await warte(350);
      const m = await mass();
      const name = (ansicht === 'einzeln' ? 'Einzeln' : 'Ganze Klasse') + ', ' + breite + ' px: ';
      if (!m) { check(name + 'Tabelle sichtbar', false); continue; }
      check(name + 'Tabelle und Karte bleiben im Bildschirm, Seite ohne waagrechtes Scrollen', m.rechts <= m.vw && m.karteRechts <= m.vw && m.seite <= 1, m);
      if (passt && ansicht === 'einzeln') { check(name + 'alle fünf Tage ohne Scrollen', m.sw <= m.cw + 1, m); }
      else { check(name + 'alle Tage erreichbar (Tabelle scrollt in der Karte, falls nötig)', m.sw <= m.cw + 1 || /auto|scroll/.test(m.ox), m); }
    }
  }
  check('Keine Fehler in der Konsole', errors.length === 0, errors.slice(0, 5));
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler  (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
