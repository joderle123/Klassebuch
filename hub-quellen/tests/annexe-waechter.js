// Test: Hub-Wächter – Apps im eigenen Tab (wie auf O:\ über file://) und die Sperre/Abmeldung des Hubs.
// Arbeit im Klassenbuch-Tab hält den Hub offen; sperrt der Hub, ist das Klassenbuch abgedeckt (auch nach
// dem Neuladen); entsperrt, geht es weiter; nach dem Abmelden verlässt der Tab die App, und beim nächsten
// Anmelden kommt keine Frage nach „Daten auf diesem PC“. Nur erfundene Personen.
// Aufruf: node hub-quellen/tests/annexe-waechter.js   (braucht keinen Webserver: alles über file://)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), os = require('os'), path = require('path');
const { netzordner, verbinden } = require('./netzordner.js');
const HUB = 'file://' + path.resolve(__dirname, '..', '..', 'hub.html');
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + JSON.stringify(info).slice(0, 300) : '')); } }

(async () => {
  const t0 = Date.now();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'annexe-waechter-'));
  fs.writeFileSync(path.join(dir, 'hub.html'), '');
  const nord = netzordner(dir, { verzoegerung: [1, 3] });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: 'de-DE', timezoneId: 'Europe/Luxembourg' });
  await verbinden(ctx, nord);
  // Sperre im Test nach 1,2 Minuten (Vorwarnung nach 12 s)
  await ctx.addInitScript(() => {
    Object.defineProperty(window, 'CDSE_HUB', { configurable: true, set(v) { if (v && typeof v === 'object') v.sperreNachMinuten = 1.2; Object.defineProperty(window, 'CDSE_HUB', { value: v, writable: true, configurable: true }); } });
  });
  const errors = [], tabs = [];
  const beobachte = (p) => {
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|permissions policy/.test(m.text())) errors.push(m.text()); });
    p.on('dialog', d => d.type() === 'prompt' ? d.accept('Test Person') : d.accept());
  };
  ctx.on('page', p => { tabs.push(p); beobachte(p); });
  const page = await ctx.newPage();
  const PW = 'ein sicheres Passwort 1';
  const gesperrt = () => page.evaluate(() => !!(window.CDSE_KONTO && window.CDSE_KONTO.gesperrt && window.CDSE_KONTO.gesperrt()));
  const decke = (p) => p.evaluate(() => !!document.getElementById('cdse-hub-decke')).catch(() => null);

  console.log('1) Konto anlegen (file://, gemeinsamer Ordner)');
  await page.goto(HUB);
  await page.click('#g-ordner'); await page.waitForSelector('#g-name', { timeout: 30000 });
  await page.fill('#g-name', 'Mia Muster'); await page.fill('#g-funktion', 'Direktion'); await page.selectOption('#g-resp', '-');
  await page.fill('#g-pw1', PW); await page.fill('#g-pw2', PW); await page.click('#g-los');
  await page.waitForSelector('#g-code', { timeout: 30000 }); await page.check('#g-ok'); await page.click('#g-weiter');
  await page.waitForSelector('#me:not([hidden])', { timeout: 30000 }); await page.waitForTimeout(600);
  check('Hub meldet „offen“ an die Apps', await page.evaluate(() => (JSON.parse(localStorage.getItem('cdse_hub_zustand') || '{}').z === 'offen')));

  console.log('2) Klassenbuch im eigenen Tab – Arbeit dort hält den Hub offen');
  tabs.length = 0;
  await page.click('.tile[data-tabtile="klassenbuch"] .tile-open');
  let kb = null;
  for (let i = 0; i < 40 && !kb; i++) { await page.waitForTimeout(250); kb = tabs.find(t => /klassenbuch\.html/.test(t.url())); }
  check('Klassenbuch öffnet in einem eigenen Tab', !!kb);
  await kb.waitForLoadState('load'); await kb.waitForTimeout(1500);
  const gate = await kb.$('#kb-gate.open #kb-gate-other'); if (gate) { await gate.click(); await kb.waitForTimeout(400); }
  const start = Date.now();
  while (Date.now() - start < 90000) {
    await kb.bringToFront(); await kb.mouse.click(700, 420); await kb.keyboard.press('Shift');
    await kb.waitForTimeout(8000);
    if (await gesperrt()) break;
  }
  check('Nach 90 s Arbeit im Klassenbuch-Tab ist der Hub nicht gesperrt (Sperrzeit 72 s)', !(await gesperrt()));
  // Der Tab meldet Eingaben höchstens alle 15 s; im Test warnt der Hub schon nach 12 s Ruhe („Noch da?“,
  // im Betrieb erst nach 59 Minuten). Geprüft wird darum: Eine Eingabe im Klassenbuch-Tab nimmt die Warnung weg.
  await kb.waitForTimeout(16000);
  const warnung = await page.evaluate(() => { const n = document.getElementById('g-nochda'); return !!n && !n.hidden; });
  await kb.bringToFront(); await kb.mouse.click(700, 420); await kb.waitForTimeout(1000);
  check('„Noch da?“ im Hub verschwindet nach einer Eingabe im Klassenbuch-Tab', await page.evaluate(() => { const n = document.getElementById('g-nochda'); return !n || n.hidden; }) && !(await gesperrt()), { warnungVorher: warnung });

  console.log('3) Sperren: das Klassenbuch ist abgedeckt – auch nach dem Neuladen');
  await page.evaluate(() => window.CDSE_KONTO.sperren('Test-Sperre'));
  await page.waitForSelector('#gate:not([hidden]) #g-pw', { timeout: 10000 });
  await kb.waitForTimeout(800);
  check('Abdeckung über dem Klassenbuch', await decke(kb));
  const vorher = await kb.evaluate(() => document.activeElement && document.activeElement.tagName);
  await kb.keyboard.type('xyz');
  check('Tastatur hinter der Abdeckung ohne Wirkung', await kb.evaluate(() => !document.activeElement || !/INPUT|TEXTAREA/.test(document.activeElement.tagName) || !/xyz/.test(document.activeElement.value || '')), vorher);
  await kb.reload({ waitUntil: 'load' }); await kb.waitForTimeout(1200);
  check('Nach dem Neuladen weiter abgedeckt', await decke(kb));

  console.log('4) Entsperren: das Klassenbuch ist wieder frei');
  await page.fill('#g-pw', PW); await page.click('#g-los');
  await page.waitForSelector('#me:not([hidden])', { timeout: 30000 }); await kb.waitForTimeout(800);
  check('Abdeckung weg', (await decke(kb)) === false);

  console.log('5) Abmelden: offene App-Tabs verlassen die App; beim nächsten Anmelden keine Frage nach alten Daten');
  // Toolbox aus dem Klassenbuch heraus öffnen – diesen Tab kennt der Hub nicht
  tabs.length = 0;
  await kb.bringToFront(); await kb.evaluate(() => window.__kbHub('toolbox'));
  let tb = null;
  for (let i = 0; i < 40 && !tb; i++) { await kb.waitForTimeout(250); tb = tabs.find(t => /toolbox\.html/.test(t.url())); }
  check('Toolbox aus dem Klassenbuch geöffnet (eigener Tab)', !!tb);
  if (tb) { await tb.waitForLoadState('load'); await tb.waitForTimeout(1500); }
  await page.bringToFront();
  if (await page.isVisible('#me-btn')) await page.click('#me-btn'); else await page.click('#me-ava');
  await page.click('[data-konto="abmelden"]');
  await page.waitForSelector('#gate .konto[data-id]', { timeout: 60000 });
  const verlassen = (t) => !t || t.isClosed() || /hub\.html/.test(t.url());
  let weg = false;
  for (let i = 0; i < 30 && !weg; i++) { await page.waitForTimeout(300); weg = verlassen(kb) && verlassen(tb); }
  check('Klassenbuch-Tab zeigt jetzt den Hub (oder ist zu)', verlassen(kb), kb.isClosed() ? 'zu' : kb.url());
  check('Toolbox-Tab zeigt jetzt den Hub (oder ist zu)', verlassen(tb), tb && !tb.isClosed() ? tb.url() : 'zu');
  await page.waitForTimeout(2500);   // was die Apps danach noch schreiben würden
  await page.click('#gate .konto:has-text("Mia Muster")'); await page.fill('#g-pw', PW); await page.click('#g-los');
  await page.waitForSelector('#me:not([hidden]), #gate-card:has-text("Daten auf diesem PC")', { timeout: 60000 }); await page.waitForTimeout(500);
  const karte = await page.textContent('#gate-card').catch(() => '');
  check('Keine Frage „Daten auf diesem PC …“', !/Daten auf diesem PC/.test(karte || '') && await page.isVisible('#me'), (karte || '').slice(0, 160));

  check('Keine Fehler in der Konsole', errors.length === 0, errors.slice(0, 5));
  await browser.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`\n${ok} ok, ${bad} Fehler  (${Math.round((Date.now() - t0) / 1000)} s)`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('ABBRUCH', e); process.exit(1); });
