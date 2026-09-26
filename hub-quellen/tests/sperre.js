// Sperre nach Inaktivitaet (im Test 3 Sekunden statt 60 Minuten)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext();
  await ctx.addInitScript(() => { window.__CDSE_TEST_ORDNER = () => navigator.storage.getDirectory(); });
  await ctx.route('**/hub-apps.js', async (route) => { const r = await route.fetch(); const body = (await r.text()).replace('sperreNachMinuten: 60', 'sperreNachMinuten: 0.05'); await route.fulfill({ response: r, body }); });
  const p = await ctx.newPage(); let ok = 0, bad = 0; const c = (x, m) => { if (x) { ok++; console.log('  ✓ ' + m); } else { bad++; console.log('  ✗ ' + m); } };
  await p.goto('http://127.0.0.1:8099/hub.html');
  await p.click('#g-ordner'); await p.waitForSelector('#g-name');
  await p.fill('#g-name', 'Clara Test'); await p.check('input[name="g-team"][value="cst"]');
  await p.evaluate(()=>{const r=document.querySelector('#g-resp');if(r&&!r.value){r.value='-';}}); await p.fill('#g-pw1', 'Winter im Norden 5'); await p.fill('#g-pw2', 'Winter im Norden 5'); await p.click('#g-los');
  await p.waitForSelector('#g-ok', { timeout: 20000 }); await p.check('#g-ok'); await p.click('#g-weiter');
  await p.waitForSelector('#me:not([hidden])');
  c(true, 'angemeldet');
  await p.waitForSelector('#gate:not([hidden]) #g-pw', { timeout: 25000 });
  const t = await p.textContent('#gate-card');
  c(t.includes('ohne Aktivität gesperrt') && t.includes('Clara Test'), 'nach Inaktivität gesperrt, Konto vorgewählt');
  c(await p.evaluate(() => getComputedStyle(document.getElementById('hub')).visibility === 'hidden'), 'Hub-Inhalt verdeckt');
  c(!!(await p.$('#g-ab')), '„Abmelden" statt „Anderes Konto"');
  await p.reload(); await p.waitForTimeout(800);
  c(!!(await p.$('#gate:not([hidden])')), 'Neuladen umgeht die Sperre nicht');
  await p.fill('#g-pw', 'Winter im Norden 5'); await p.click('#g-los');
  await p.waitForSelector('#me:not([hidden])');
  c(await p.evaluate(() => document.getElementById('gate').hidden), 'mit Passwort entsperrt');
  console.log(ok + ' ok, ' + bad + ' Fehler'); await b.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
