// Test: Klassenbuch der Annexe (aus klassenbuch/quellen) – Rundgang durch alle Bereiche, keine Anfragen ins
// Internet, die eingebauten Daten der Annexe bleiben erhalten, Verknüpfungen zu Toolbox/Screening/Lernen im Hub, Screening-Reiter nur
// lesen, Materialvorschläge aus dem Toolbox-Verzeichnis. Nur erfundene Personen.
// Aufruf: node klassenbuch/tests/rundgang.cjs   (Webserver auf Port 8099 für den Hauptordner)
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
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: 'de-DE', timezoneId: 'Europe/Luxembourg' });
  const extern = [];
  await ctx.route('**/*', r => { const u = r.request().url(); if (!u.startsWith('http://127.0.0.1:8099/')) { extern.push(u); return r.abort(); } return r.continue(); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => d.type() === 'prompt' ? d.accept('Test Person') : d.accept());
  await page.addInitScript(() => { window.__geoeffnet = []; window.open = function (u, n) { window.__geoeffnet.push([String(u), String(n || '')]); return null; }; });
  const warte = ms => page.waitForTimeout(ms);

  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(async () => {
    localStorage.clear();
    for (const n of ['cdse_dossier_db', 'klassebuch-sync', 'anwesenheit-sync']) { await new Promise(r => { const q = indexedDB.deleteDatabase(n); q.onsuccess = q.onerror = q.onblocked = () => r(); }); }
  });
  await page.reload({ waitUntil: 'load' }); await warte(1500);

  console.log('1) Start mit den eingebauten Daten der Annexe, ohne Internet');
  const st = await page.evaluate(() => ({
    roster: window.KB_ROSTER ? window.KB_ROSTER.list().length : -1,
    eintraege: window.Repo && window.Repo.entries ? window.Repo.entries.length : -1,
    savoir: !!window.SAVOIR_API, guide: !!window.KB_GUIDE, isa: !!document.getElementById('kb-isa-b64'),
    fehlend: ['KB_TERMS', 'KB_ROSTER', 'KB_ANW', 'KB_TIMETABLE', 'KB_BUBBLE', 'KB_SCREENING', 'KB_NOTEN', 'KB_WEEKLY', 'KB_SYNC', 'KB_MATERIALS', 'KB_REPORTS', 'KB_TRASH', 'KB_SPELL'].filter(k => !window[k]),
    groesse: document.documentElement.outerHTML.length, titel: document.title
  }));
  check('Annexe: eingebaute Klasse und Einträge sind da (nichts verloren)', st.roster > 0 && st.eintraege > 0, st);
  check('SAVOIR, Trichter und alte Toolbox nicht mehr eingebaut', !st.savoir && !st.guide && !st.isa, st);
  check('Alle Klassenbuch-Module geladen', st.fehlend.length === 0, st.fehlend);
  check('Datei unter 3 MB, Titel „Klassenbuch · Annexe Junglinster“', st.groesse < 3e6 && st.titel === 'Klassenbuch · Annexe Junglinster', st);
  const gate = await page.$('#kb-gate.open');
  if (gate) { const andere = await page.$('#kb-gate-other'); if (andere) { await andere.click(); await warte(400); } }

  console.log('2) Erfundene Klasse anlegen');
  await page.evaluate(() => {
    const a = window.KB_ROSTER.add('Tom Muster', '', 'L1', 'ES'); const b = window.KB_ROSTER.add('Lea Beispiel', '', 'L2', 'C4');
    window.__ids = { tom: a, lea: b };
    localStorage.setItem('klassebuch_screening_v1', JSON.stringify({ [a]: { symptome: ['1.1', '16.1'], plans: { depression: { symptome: ['d1-1'], kontext: { suizidalitaet: 'keine' } } }, demografie: { alter: '10-12' }, gate: { dauer: 'mittel' }, history: [{ date: '2026-09-01', symCount: 2, acute: true, axes: [{ id: 'A99', name: 'Testachse', staerke: 'deutlich' }] }], updatedAt: '2026-09-01T08:00:00.000Z' } }));
  });
  await page.reload({ waitUntil: 'load' }); await warte(1500);
  if (await page.$('#kb-gate.open')) { const andere = await page.$('#kb-gate-other'); if (andere) { await andere.click(); await warte(400); } }
  const ids = await page.evaluate(() => { const l = window.KB_ROSTER.list(); return { tom: l.find(s => s.name === 'Tom Muster').id, lea: l.find(s => s.name === 'Lea Beispiel').id }; });
  check('Zwei erfundene Schüler in der Liste', !!ids.tom && !!ids.lea);

  console.log('3) Rundgang durch alle Bereiche');
  const navs = await page.$$eval('[data-kb-nav]', l => [...new Set(l.map(x => x.getAttribute('data-kb-nav')))]);
  check('Menü ohne „Material-Bibliothek“ und „Pathologien“, mit „KI-Anonymisierung“ (Annexe)', !navs.includes('patho') && navs.includes('ai') && !(await page.$('.kb-nav [data-kb-nav="material"]')), navs);
  const kaputt = [];
  for (const n of ['students', 'search', 'absenzen', 'reunion', 'klasse', 'werkzeuge', 'data']) {
    const el = await page.$('.kb-nav [data-kb-nav="' + n + '"]'); if (!el) { kaputt.push(n + ': fehlt'); continue; }
    await el.click(); await warte(500);
    const info = await page.evaluate(() => { const a = document.querySelector('.kb-panel.active'); const t = a ? a.innerText : ''; return { id: a && a.id, len: t.length, schlecht: /undefined|\[object Object\]|NaN/.test(t) }; });
    if (!info.id || info.len < 20 || info.schlecht) { kaputt.push(n + ': ' + JSON.stringify(info)); }
  }
  check('Alle Bereiche öffnen mit Inhalt, ohne „undefined“/„[object Object]“', kaputt.length === 0, kaputt);
  const fuss = await page.textContent('.kb-foot');
  check('Fußzeile nennt Hub-Tresor und Team-Datei (statt „bleiben lokal“)', fuss.includes('Hub-Tresor') && !fuss.includes('bleiben lokal'));

  console.log('4) Verknüpfungen in den Hub');
  await page.evaluate(() => { window.__geoeffnet = []; });
  for (const w of ['toolbox', 'screening', 'lernen']) { await page.click('.kb-nav [data-kb-hub="' + w + '"]'); await warte(100); }
  const offen = await page.evaluate(() => window.__geoeffnet);
  check('Toolbox, Screening und Lernen öffnen die Hub-Apps in ihren Tabs', JSON.stringify(offen) === JSON.stringify([['toolbox.html', 'cdse-toolbox'], ['../hub.html#/screening', 'cdse-hub'], ['lernen.html', 'cdse-lernen']]), offen);

  console.log('5) Schüler: Screening-Reiter nur lesen');
  await page.click('.kb-nav [data-kb-nav="students"]'); await warte(400);
  await page.evaluate(id => { location.hash = '#/student/' + encodeURIComponent(id) + '?hub=screening'; }, ids.tom); await warte(1200);
  await page.waitForSelector('#kb-scr-alt h4', { timeout: 10000 });
  await page.waitForFunction(() => { const e = document.querySelector('#kb-scr-alt'); return e && !/Wird geladen/.test(e.textContent); }, null, { timeout: 10000 });
  const scr = await page.evaluate(() => document.querySelector('.kb-hub-screening, .kb-hub-pad') ? document.querySelector('#kb-hub-body, .kb-hub-pad').innerText : '');
  check('Hinweis „Screening ist in den Hub umgezogen“ mit Knopf', scr.includes('in den Hub umgezogen') && !!(await page.$('.kb-scr-hinweis [data-kb-hub="screening"]')));
  check('Frühere Beobachtungen im Wortlaut, Vertiefung, Dauer, Krisenhinweis', scr.includes('Driftet im Unterricht ab') && scr.includes('Anhaltend gedrückte Grundstimmung') && scr.includes('einige Wochen bis Monate') && scr.includes('Suizidale Gedanken berichtet'), scr.slice(0, 600));
  check('Keine Verdachtsachsen', !scr.includes('Testachse'));
  await page.screenshot({ path: path.join(OUT, 'k1-screening.png') });

  console.log('6) Materialvorschläge aus der Hub-Toolbox');
  const mat = await page.evaluate(() => { const l = window.KB_MATERIALS.forGoal('V-21', 'C4'); return { n: l.length, erst: l[0] && l[0].m.title, blatt: l[0] && l[0].m.blatt, alle: window.KB_MATERIALS.all().length }; });
  check('Verzeichnis geladen (Arbeitsblätter + Materialien), passende Treffer zu V-21 – neue Arbeitsblätter zuerst', mat.alle > 600 && mat.n > 0 && mat.blatt === true, mat);
  await page.evaluate(sid => window.KB_MATERIALS.openMatch({ mode: 'goal', key: 'V-21', sid: sid, label: 'Test' }), ids.lea); await warte(300);
  await page.evaluate(() => { window.__geoeffnet = []; });
  await page.click('#kbm-ov .kbm-card [data-detail]'); await page.click('#kbm-openlib');
  const off2 = await page.evaluate(() => window.__geoeffnet);
  check('„Arbeitsblatt in der Toolbox“ und „Toolbox öffnen zum Ziel“ verlinken in die Hub-Toolbox', /^toolbox\.html#blatt=/.test(off2[0][0]) && off2[1][0] === 'toolbox.html#eldib=V-21' && off2[0][1] === 'cdse-toolbox', off2);

  console.log('7) Person und Team aus dem Hub');
  await page.evaluate(() => { localStorage.setItem('cdse-nutzer', JSON.stringify({ id: 'k1', name: 'Mia Muster', team: 'cp', rolle: 'mitarbeiter' })); });
  await page.reload({ waitUntil: 'load' }); await warte(1500);
  const hub = await page.evaluate(() => ({ gate: !!document.querySelector('#kb-gate.open'), user: window.KB_USER.get(), chip: document.getElementById('kb-userchip').textContent, titel: document.title }));
  check('Angemeldet im Hub: keine Personenwahl, Autor ist die Hub-Person', !hub.gate && hub.user === 'Mia Muster' && /Mia Muster/.test(hub.chip) && /Hub/.test(hub.chip), hub);
  check('Annexe: nur ein Team – der Titel bleibt „Klassenbuch · Annexe Junglinster“', hub.titel === 'Klassenbuch · Annexe Junglinster', hub);
  await page.evaluate(() => { localStorage.setItem('cdse-nutzer', JSON.stringify({ id: 'k2', name: 'Lea Beispiel', team: 'cst' })); window.dispatchEvent(new StorageEvent('storage', { key: 'cdse-nutzer' })); }); await warte(300);
  const hub2 = await page.evaluate(() => ({ user: window.KB_USER.get() }));
  check('Personenwechsel im Hub wird übernommen', hub2.user === 'Lea Beispiel', hub2);
  await page.evaluate(() => { window.__geoeffnet = []; }); await page.click('#kb-userchip');
  check('Klick auf die Person öffnet den Hub (statt einer Namensliste)', JSON.stringify(await page.evaluate(() => window.__geoeffnet)) === JSON.stringify([['../hub.html#/', 'cdse-hub']]) && !(await page.$('#kb-gate.open')));

  await page.evaluate(sid => { localStorage.setItem('cdse-kb-zuordnung', JSON.stringify({ klassenbuch: { [sid]: 'hub123' } })); window.__geoeffnet = []; window.__kbGo('students'); location.hash = '#/student/' + encodeURIComponent(sid) + '?hub=uebersicht'; }, ids.tom); await warte(800);
  await page.click('.kb-hub-dossier');
  check('Zugeordnetes Kind: „Dossier im Hub“ öffnet das Hub-Dossier', JSON.stringify(await page.evaluate(() => window.__geoeffnet)) === JSON.stringify([['../hub.html#/schueler/hub123', 'cdse-hub']]));

  console.log('8) Keine Anfragen ins Internet, keine Fehler');
  check('Keine externen Anfragen (Google Fonts o. ä.)', extern.length === 0, extern);
  check('Keine Fehler in der Konsole', errors.length === 0, errors.slice(0, 5));
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler  (' + Math.round((Date.now() - t0) / 1000) + ' s, Bilder in ' + OUT + ')');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
