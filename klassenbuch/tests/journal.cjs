// Test: Journal (Testversion aus klassenbuch/quellen) – Rundgang, keine Anfragen ins Internet, ohne SAVOIR/alte
// Toolbox, Verknüpfungen in den Hub, Person und Team aus dem Hub, eigene Speicherschlüssel, Team-Datei des
// Klassenbuchs wird abgelehnt, Wochenziele ohne „[object Object]“. Nur erfundene Personen.
// Aufruf: node klassenbuch/tests/journal.cjs   (Webserver auf Port 8099 für den Hauptordner)
'use strict';
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8099/apps/journal.html';
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } }

(async () => {
  const t0 = Date.now();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: 'de-DE', timezoneId: 'Europe/Luxembourg' });
  const extern = [], DATEIEN = {};
  await ctx.route('**/*', r => { const u = r.request().url(); if (!u.startsWith('http://127.0.0.1:8099/')) { extern.push(u); return r.abort(); } return r.continue(); });
  await ctx.exposeBinding('__fsLesen', (src, n) => DATEIEN[n] || '');
  await ctx.exposeBinding('__fsSchreiben', (src, n, t) => { DATEIEN[n] = t; });
  await ctx.addInitScript(() => {
    window.__geoeffnet = []; window.open = function (u, n) { window.__geoeffnet.push([String(u), String(n || '')]); return null; };
    class Griff { constructor(n) { Object.defineProperty(this, '__n', { value: n, enumerable: false }); } get name() { return this.__n; } get kind() { return 'file'; }
      queryPermission() { return Promise.resolve('granted'); } requestPermission() { return Promise.resolve('granted'); }
      getFile() { const n = this.__n; return window.__fsLesen(n).then(t => ({ text: () => Promise.resolve(t) })); }
      createWritable() { const n = this.__n; let b = ''; return Promise.resolve({ write: d => { b += d; return Promise.resolve(); }, close: () => window.__fsSchreiben(n, b) }); } }
    window.showOpenFilePicker = async () => [new Griff(window.__DATEI || 'journal-team.json')];
    window.showSaveFilePicker = async () => new Griff(window.__DATEI || 'journal-team.json');
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => d.type() === 'prompt' ? d.accept('Test Person') : d.accept());
  const warte = ms => page.waitForTimeout(ms);

  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(async () => { localStorage.clear(); for (const n of ['isa_dossier_db', 'isa-sync']) { await new Promise(r => { const q = indexedDB.deleteDatabase(n); q.onsuccess = q.onerror = q.onblocked = () => r(); }); } localStorage.setItem('cdse-nutzer', JSON.stringify({ id: 'k1', name: 'Mia Muster', team: 'isa', rolle: 'mitarbeiter' })); });
  await page.reload({ waitUntil: 'load' }); await warte(1500);

  console.log('1) Start');
  const st = await page.evaluate(() => ({ savoir: !!window.SAVOIR_API, guide: !!window.KB_GUIDE, isa: !!document.getElementById('kb-isa-b64'), groesse: document.documentElement.outerHTML.length, titel: document.title,
    gate: !!document.querySelector('#kb-gate.open'), user: window.KB_USER && window.KB_USER.get(), team: (document.getElementById('kb-brand-team') || {}).textContent,
    fehlend: ['KB_ROSTER', 'KB_BUBBLE', 'KB_SCREENING', 'KB_SYNC', 'KB_MATERIALS', 'KB_REPORTS', 'KB_SPELL'].filter(k => !window[k]) }));
  check('Ohne SAVOIR, Trichter und alte Toolbox, unter 2 MB', !st.savoir && !st.guide && !st.isa && st.groesse < 2e6, st);
  check('Alle Journal-Module geladen', st.fehlend.length === 0, st.fehlend);
  check('Person und Team aus dem Hub: keine Personenwahl, Titel „Journal · ISA“', !st.gate && st.user === 'Mia Muster' && st.team === 'ISA' && st.titel === 'Journal · ISA', st);

  console.log('2) Rundgang');
  const navs = await page.$$eval('[data-kb-nav]', l => [...new Set(l.map(x => x.getAttribute('data-kb-nav')))]);
  check('Menü ohne „Pathologien“, „Material-Bibliothek“ und „KI-Export“', !navs.includes('patho') && !navs.includes('ai') && !navs.includes('material'), navs);
  const kaputt = [];
  for (const n of navs) {
    const el = await page.$('.kb-nav [data-kb-nav="' + n + '"]'); if (!el) { continue; }
    await el.click(); await warte(500);
    const info = await page.evaluate(() => { const a = document.querySelector('.kb-panel.active'); const t = a ? a.innerText : ''; return { id: a && a.id, len: t.length, schlecht: /undefined|\[object Object\]|NaN/.test(t) }; });
    if (!info.id || info.len < 10 || info.schlecht) { kaputt.push(n + ': ' + JSON.stringify(info)); }
  }
  check('Alle Bereiche öffnen mit Inhalt, ohne „undefined“/„[object Object]“', kaputt.length === 0, kaputt);
  await page.evaluate(() => { window.__geoeffnet = []; });
  for (const w of ['toolbox', 'screening', 'lernen']) { await page.click('.kb-nav [data-kb-hub="' + w + '"]'); await warte(100); }
  check('Toolbox, Screening und Lernen öffnen die Hub-Apps', JSON.stringify(await page.evaluate(() => window.__geoeffnet)) === JSON.stringify([['toolbox.html', 'cdse-toolbox'], ['../hub.html#/screening', 'cdse-hub'], ['lernen.html', 'cdse-lernen']]));

  console.log('3) Eigene Schlüssel, eigene Team-Datei');
  const sid = await page.evaluate(() => KB_ROSTER.add('Tom Muster', '', 'L1', 'ES'));
  const schluessel = await page.evaluate(() => Object.keys(localStorage).filter(k => /klassebuch|^kb_/.test(k)));
  check('Keine Klassenbuch-Schlüssel im Journal (isa_… statt klassebuch_…)', schluessel.length === 0, schluessel);
  DATEIEN['klassebuch-team.json'] = JSON.stringify({ _format: 'klassebuch-shared-v1', colls: { roster: [], noten: [], terms: [] } });
  await page.evaluate(() => { window.__DATEI = 'klassebuch-team.json'; return KB_SYNC.connectExisting(); }); await warte(2500);
  const fehler = await page.evaluate(() => KB_SYNC.getStatus().error || '');
  check('Team-Datei des Klassenbuchs wird abgelehnt, nichts geschrieben', /gehört zum Klassenbuch/.test(fehler) && !JSON.parse(DATEIEN['klassebuch-team.json'])._app, fehler);
  await page.evaluate(() => KB_SYNC.disconnect());
  await page.evaluate(() => { window.__DATEI = 'journal-team.json'; return KB_SYNC.connectNew(); }); await warte(2500);
  const d = JSON.parse(DATEIEN['journal-team.json'] || '{}');
  check('Neue Journal-Datei ist als Journal markiert und enthält das Kind', d._app === 'journal' && (d.colls.roster || []).some(x => x.d && x.d.name === 'Tom Muster'));
  await page.evaluate(() => KB_SYNC.disconnect());

  console.log('4) Screening-Reiter, Dossier im Hub');
  await page.evaluate(s => { localStorage.setItem('cdse-kb-zuordnung', JSON.stringify({ journal: { [s]: 'hub9' } })); window.__kbGo('students'); location.hash = '#/student/' + encodeURIComponent(s) + '?hub=screening'; }, sid); await warte(900);
  const scr = await page.evaluate(() => document.querySelector('#dos-root').innerText);
  check('Screening-Reiter: Hinweis auf den Hub, kein altes Screening', scr.includes('in den CDSE Hub umgezogen') && scr.includes('kein Screening erfasst'), scr.slice(0, 300));
  await page.evaluate(() => { window.__geoeffnet = []; }); await page.click('.kb-hub-dossier');
  check('„Dossier im Hub“ öffnet das zugeordnete Hub-Dossier', JSON.stringify(await page.evaluate(() => window.__geoeffnet)) === JSON.stringify([['../hub.html#/schueler/hub9', 'cdse-hub']]));

  check('Keine externen Anfragen', extern.length === 0, extern);
  check('Keine Fehler in der Konsole', errors.length === 0, errors.slice(0, 5));
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler  (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
