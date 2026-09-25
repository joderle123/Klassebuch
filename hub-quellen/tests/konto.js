// Test der Konten & Teams im Hub (http + OPFS als "Server-Ordner")
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = __dirname;
const BASE = 'http://127.0.0.1:8099/hub.html';
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info ? '  → ' + info : '')); } }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 } });
  await ctx.addInitScript(() => { window.__CDSE_TEST_ORDNER = () => navigator.storage.getDirectory(); });
  // Sperre im Test nach 3 Sekunden statt 60 Minuten
  await ctx.route('**/hub-apps.js', async (route) => {
    const r = await route.fetch(); let body = await r.text();
    if (process.env.SPERRE) { body = body.replace('sperreNachMinuten: 60', 'sperreNachMinuten: 0.05'); }
    await route.fulfill({ response: r, body });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });

  const h2 = () => page.textContent('#gate-card h2').catch(() => '');
  const navApps = () => page.$$eval('#nav .lnk[data-app]', l => l.map(a => a.getAttribute('data-app')));
  const gateOffen = () => page.evaluate(() => !document.getElementById('gate').hidden);
  async function erstelle(name, team, pw) {
    await page.fill('#g-name', name);
    await page.check('input[name="g-team"][value="' + team + '"]');
    await page.evaluate(()=>{const r=document.querySelector('#g-resp');if(r&&!r.value){r.value='-';}}); await page.fill('#g-pw1', pw); await page.fill('#g-pw2', pw);
    await page.click('#g-los');
    await page.waitForSelector('#g-code', { timeout: 20000 });
    const code = (await page.textContent('#g-code')).trim();
    check('Code-Seite für ' + name + ' (Format XXXX-…)', /^[0-9A-Z]{4}(-[0-9A-Z]{4}){4}$/.test(code), code);
    check('„Weiter" erst nach Häkchen', await page.isDisabled('#g-weiter'));
    await page.check('#g-ok'); await page.click('#g-weiter');
    await page.waitForSelector('#me:not([hidden])');
    return code;
  }
  async function menue() { if (await page.isVisible('#me-btn')) await page.click('#me-btn'); else await page.click('#me-ava'); }
  async function abmelden() { await menue(); await page.click('[data-konto="abmelden"]'); await page.waitForSelector('#gate .konto[data-id], #g-pw, #g-name', { timeout: 30000 }); }
  async function anmelden(name, pw) {
    if (await page.$('#g-zurueck') && !(await page.$('.konto-liste'))) { /* schon auf Anmeldeseite eines Kontos? */ }
    const txt = await page.textContent('#gate-card');
    if (!txt.includes('Wer bist du?')) { const z = await page.$('#g-zurueck'); if (z) await z.click(); }
    await page.click('#gate .konto:has-text("' + name + '")');
    await page.fill('#g-pw', pw); await page.click('#g-los');
  }

  await page.goto(BASE);
  console.log('1) Erster Start');
  await page.waitForSelector('#g-ordner');
  check('Verbinden-Seite', (await h2()).includes('Hub-Ordner verbinden'), await h2());
  check('Hub dahinter unsichtbar', await page.evaluate(() => getComputedStyle(document.getElementById('hub')).visibility === 'hidden'));
  await page.screenshot({ path: OUT + '/g1-verbinden.png' });
  await page.click('#g-ordner');
  await page.waitForSelector('#g-name');
  check('Erstes Konto anlegen', (await h2()).includes('erste Konto'), await h2());

  console.log('2) Prüfungen beim Erstellen');
  await page.fill('#g-name', 'Anna Muster'); await page.click('#g-los');
  check('Team fehlt → Meldung', (await page.textContent('.meldung')).includes('Team'));
  check('Name bleibt stehen', (await page.inputValue('#g-name')) === 'Anna Muster');
  await page.check('input[name="g-team"][value="annexe"]');
  await page.evaluate(()=>{const r=document.querySelector('#g-resp');if(r&&!r.value){r.value='-';}}); await page.fill('#g-pw1', 'kurz'); await page.fill('#g-pw2', 'kurz'); await page.click('#g-los');
  check('Zu kurzes Passwort → Meldung', (await page.textContent('.meldung')).includes('10 Zeichen'));
  await page.evaluate(()=>{const r=document.querySelector('#g-resp');if(r&&!r.value){r.value='-';}}); await page.fill('#g-pw1', 'anna-ist-toll-2026'); await page.fill('#g-pw2', 'anna-ist-toll-2026'); await page.click('#g-los');
  check('Name im Passwort → Meldung', (await page.textContent('.meldung')).includes('Namen'));
  await page.evaluate(()=>{const r=document.querySelector('#g-resp');if(r&&!r.value){r.value='-';}}); await page.fill('#g-pw1', 'sonnige Tage 2026'); await page.fill('#g-pw2', 'sonnige Tage 2027'); await page.click('#g-los');
  check('Ungleiche Passwörter → Meldung', (await page.textContent('.meldung')).includes('nicht gleich'));
  await page.screenshot({ path: OUT + '/g2-erstellen-fehler.png' });
  await page.evaluate(()=>{const r=document.querySelector('#g-resp');if(r&&!r.value){r.value='-';}}); await page.fill('#g-pw1', 'sonnige Tage 2026'); await page.fill('#g-pw2', 'sonnige Tage 2026');
  await page.click('#g-los');
  await page.waitForSelector('#g-code', { timeout: 20000 });
  await page.screenshot({ path: OUT + '/g3-code.png' });
  const codeAnna = (await page.textContent('#g-code')).trim();
  check('Code-Format', /^[0-9A-Z]{4}(-[0-9A-Z]{4}){4}$/.test(codeAnna), codeAnna);
  check('„Weiter" gesperrt ohne Häkchen', await page.isDisabled('#g-weiter'));
  await page.check('#g-ok'); await page.click('#g-weiter');
  await page.waitForSelector('#me:not([hidden])');

  console.log('3) Angemeldet als Annexe');
  check('Gate zu', !(await gateOffen()));
  check('Name in der Seitenleiste', (await page.textContent('#me')).includes('Anna Muster'));
  check('Team in der Seitenleiste', (await page.textContent('#me')).includes('Annexe Junglinster'));
  check('Begrüßung mit Vorname', (await page.textContent('#hello')).includes('Anna'), await page.textContent('#hello'));
  let na = await navApps();
  check('Annexe sieht Klassenbuch, ELDiB, Toolbox', JSON.stringify(na.sort()) === JSON.stringify(['eldib', 'klassenbuch', 'toolbox']), na.join(','));
  check('Kacheln passend (3)', (await page.$$('#home-body .tile[data-href]')).length === 3);
  await page.screenshot({ path: OUT + '/g4-hub-annexe.png' });
  await page.evaluate(() => { location.hash = '#/app/screening'; });
  await page.waitForTimeout(300);
  check('Direktlink auf Screening → zurück zur Übersicht', await page.evaluate(() => location.hash === '#/' && document.getElementById('v-home').classList.contains('on')), await page.evaluate(() => location.hash));

  console.log('4) Konto-Datei auf dem "Server"');
  const dateien = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory(); const d = await root.getDirectoryHandle('konten'); const out = [];
    for await (const [n, h] of d.entries()) { out.push({ n, t: await (await h.getFile()).text() }); } return out;
  });
  check('Eine Konto-Datei', dateien.length === 1, dateien.map(d => d.n).join(','));
  const k = JSON.parse(dateien[0].t);
  check('Dateiname = id.json', dateien[0].n === k.id + '.json' && /^anna-muster-[0-9a-z]{3}$/.test(k.id), dateien[0].n);
  check('Kein Passwort im Klartext', !dateien[0].t.includes('sonnige') && !dateien[0].t.includes(codeAnna.replace(/-/g, '')));
  check('PBKDF2 600000', k.schluessel.passwort.iter === 600000 && k.schluessel.code.iter === 600000);

  console.log('5) Neu laden: bleibt angemeldet');
  await page.reload(); await page.waitForSelector('#me:not([hidden])');
  check('Nach Neuladen angemeldet', !(await gateOffen()));

  console.log('6) Abmelden, zweites Konto (Diagnostique)');
  await abmelden();
  check('Nach Abmelden: Kontenliste', (await h2()).includes('Wer bist du?'), await h2());
  check('Seitenleiste leer', (await page.$$('#nav .lnk[data-app]')).length === 0);
  await page.click('#g-neu');
  const codeBen = await erstelle('Ben Beispiel', 'diagnostique', 'Kaffee mit Milch 7');
  na = await navApps();
  check('Diagnostique sieht Journal, Screening, ELDiB, Toolbox', JSON.stringify(na.sort()) === JSON.stringify(['eldib', 'journal', 'screening', 'toolbox']), na.join(','));
  await page.click('#nav .lnk[data-app="screening"]');
  await page.waitForTimeout(400);
  check('Screening öffnet im Hub', await page.evaluate(() => location.hash === '#/app/screening' && !!document.querySelector('#frames iframe.on')));
  await page.screenshot({ path: OUT + '/g5-hub-diagnostique.png' });
  await menue(); await page.screenshot({ path: OUT + '/g5b-menue-schmal.png' });
  check('Menü im schmalen Modus ganz sichtbar', await page.evaluate(() => { const r = document.getElementById('me-menu').getBoundingClientRect(); return r.width >= 200 && r.left >= 0 && r.top >= 0; }));
  await page.keyboard.press('Escape');
  check('Esc schließt Menü', await page.evaluate(() => document.getElementById('me-menu').hidden));

  console.log('7) Anmelden: falsches Passwort, Bremse');
  await abmelden();
  check('Screening-Rahmen nach Abmelden entfernt', (await page.$$('#frames iframe')).length === 0);
  await page.click('#gate .konto:has-text("Anna Muster")');
  await page.fill('#g-pw', 'falsch falsch'); await page.click('#g-los');
  await page.waitForSelector('.meldung.fehler');
  check('Falsches Passwort → Meldung', (await page.textContent('.meldung.fehler')).includes('stimmt nicht'));
  await page.screenshot({ path: OUT + '/g6-falsch.png' });
  for (let i = 0; i < 4; i++) { await page.fill('#g-pw', 'falsch ' + i); await page.click('#g-los'); await page.waitForSelector('.meldung.fehler'); await page.waitForFunction(() => !document.querySelector('#g-los[disabled]')); }
  await page.fill('#g-pw', 'sonnige Tage 2026'); await page.click('#g-los');
  await page.waitForTimeout(300);
  check('Nach 5 Fehlversuchen Pause', (await page.textContent('#gate-card')).includes('Zu viele Versuche'));

  console.log('8) Anmelden als Ben, Passwort ändern');
  await page.click('#g-zurueck');
  await page.click('#gate .konto:has-text("Ben Beispiel")');
  await page.fill('#g-pw', 'Kaffee mit Milch 7'); await page.click('#g-los');
  await page.waitForSelector('#me:not([hidden])');
  check('Ben angemeldet', (await page.textContent('#me')).includes('Ben Beispiel'));
  await menue();
  await page.screenshot({ path: OUT + '/g7-menue.png' });
  await page.click('[data-konto="passwort"]');
  check('Dialog über dem Hub', await page.evaluate(() => document.getElementById('gate').classList.contains('modal')));
  await page.fill('#g-alt', 'falsch falsch'); await page.evaluate(()=>{const r=document.querySelector('#g-resp');if(r&&!r.value){r.value='-';}}); await page.fill('#g-pw1', 'Tee mit Zitrone 8'); await page.fill('#g-pw2', 'Tee mit Zitrone 8'); await page.click('#g-los');
  await page.waitForSelector('.meldung.fehler');
  const altMeldung = await page.textContent('.meldung.fehler');
  check('Altes Passwort falsch → Meldung', altMeldung.includes('stimmt nicht'), altMeldung);
  await page.fill('#g-alt', 'Kaffee mit Milch 7'); await page.evaluate(()=>{const r=document.querySelector('#g-resp');if(r&&!r.value){r.value='-';}}); await page.fill('#g-pw1', 'Tee mit Zitrone 8'); await page.fill('#g-pw2', 'Tee mit Zitrone 8'); await page.click('#g-los');
  await page.waitForSelector('#g-fertig', { timeout: 20000 });
  check('Passwort geändert', (await h2()).includes('Passwort geändert'));
  await page.click('#g-fertig');
  check('Dialog zu', !(await gateOffen()));

  console.log('9) Profil ändern (Diagnostique → ISA)');
  await menue(); await page.click('[data-konto="profil"]');
  await page.check('input[name="g-team"][value="isa"]'); await page.fill('#g-alt', 'Tee mit Zitrone 8'); await page.click('#g-los');
  await page.waitForFunction(() => document.getElementById('gate').hidden, null, { timeout: 20000 });
  na = await navApps();
  check('ISA sieht Journal, ELDiB, Toolbox', JSON.stringify(na.sort()) === JSON.stringify(['eldib', 'journal', 'toolbox']), na.join(','));
  check('Screening-Ansicht geschlossen', await page.evaluate(() => location.hash === '#/' ), await page.evaluate(() => location.hash));
  check('Team in Seitenleiste = ISA', (await page.textContent('#me .me-t small')) === 'ISA');

  console.log('10) Neues Passwort gilt, altes nicht');
  await abmelden();
  await page.click('#gate .konto:has-text("Ben Beispiel")');
  await page.fill('#g-pw', 'Kaffee mit Milch 7'); await page.click('#g-los');
  await page.waitForSelector('.meldung.fehler');
  check('Altes Passwort abgelehnt', (await page.textContent('.meldung.fehler')).includes('stimmt nicht'));
  await page.fill('#g-pw', 'Tee mit Zitrone 8'); await page.click('#g-los');
  await page.waitForSelector('#me:not([hidden])');
  check('Neues Passwort angenommen, Team bleibt ISA', (await page.textContent('#me')).includes('ISA'));

  console.log('11) Passwort vergessen (Code)');
  await abmelden();
  await page.click('#gate .konto:has-text("Ben Beispiel")');
  await page.click('#g-vergessen');
  await page.fill('#g-code-in', codeAnna.toLowerCase()); await page.evaluate(()=>{const r=document.querySelector('#g-resp');if(r&&!r.value){r.value='-';}}); await page.fill('#g-pw1', 'Neues Fahrrad 99'); await page.fill('#g-pw2', 'Neues Fahrrad 99'); await page.click('#g-los');
  await page.waitForSelector('.meldung.fehler', { timeout: 20000 });
  check('Fremder Code → abgelehnt', (await page.textContent('.meldung.fehler')).includes('passt nicht'));
  await page.fill('#g-code-in', codeBen.replace(/-/g, '').toLowerCase().replace(/0/g, 'o')); await page.evaluate(()=>{const r=document.querySelector('#g-resp');if(r&&!r.value){r.value='-';}}); await page.fill('#g-pw1', 'Neues Fahrrad 99'); await page.fill('#g-pw2', 'Neues Fahrrad 99'); await page.click('#g-los');
  await page.waitForSelector('#me:not([hidden])', { timeout: 20000 });
  check('Eigener Code (klein, ohne Striche, O statt 0) → angemeldet', (await page.textContent('#me')).includes('Ben Beispiel'));
  await abmelden();
  await page.click('#gate .konto:has-text("Ben Beispiel")');
  await page.fill('#g-pw', 'Neues Fahrrad 99'); await page.click('#g-los');
  await page.waitForSelector('#me:not([hidden])');
  check('Neues Passwort nach Code gilt', true);

  console.log('12) Neuer Tab/Browser-Neustart: letztes Konto wird angeboten');
  const p2 = await ctx.newPage();
  await p2.goto(BASE); await p2.waitForSelector('#gate-card h2, #g-pw', { timeout: 10000 });
  const h2b = await p2.textContent('#gate-card').catch(() => '');
  check('Neuer Tab: Anmeldung für Ben vorgeschlagen', h2b.includes('Ben Beispiel') && !!(await p2.$('#g-pw')), h2b.slice(0, 120));
  await p2.close();

  check('Keine Skriptfehler', errors.length === 0, errors.join(' | '));
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler');
  await browser.close();
  process.exitCode = bad ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 2; });
