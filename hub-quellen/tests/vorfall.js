// Test: Vorfall-/Krisenprotokoll im Dossier – Protokollfelder beim Eintrag, Anzeige, Bearbeiten, Überblick
// (Tage, Situationen, Time-out, fehlende Information von Leitung/Eltern), verschlüsselt, 390 px.
// Nur erfundene Personen.   Aufruf: node tests/vorfall.js   (Webserver auf Port 8099 für den Hauptordner)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8099/hub.html';
const OUT = path.join(__dirname, 'screening-aus'); fs.mkdirSync(OUT, { recursive: true });
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } }

(async () => {
  const t0 = Date.now();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { window.__CDSE_TEST_ORDNER = () => navigator.storage.getDirectory(); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('dialog', d => d.accept());
  const warte = ms => page.waitForTimeout(ms);
  const text = sel => page.textContent(sel);
  async function gehe(hash) { await page.evaluate(h => { location.hash = h; }, hash); await warte(400); }

  await page.goto(BASE);
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); for await (const [n] of r.entries()) { await r.removeEntry(n, { recursive: true }); } localStorage.clear(); sessionStorage.clear(); });
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); await r.getFileHandle('hub.html', { create: true }); });
  await page.reload();
  await page.click('#g-ordner'); await page.waitForSelector('#g-name');
  await page.fill('#g-name', 'Mia Muster'); await page.check('input[name="g-team"][value="cst"]'); await page.selectOption('#g-resp', '-');
  await page.fill('#g-pw1', 'ein sicheres Passwort 1'); await page.fill('#g-pw2', 'ein sicheres Passwort 1'); await page.click('#g-los');
  await page.waitForSelector('#g-code', { timeout: 30000 }); await page.check('#g-ok'); await page.click('#g-weiter'); await page.waitForSelector('#me:not([hidden])', { timeout: 30000 });
  await gehe('#/schueler'); await page.waitForSelector('[data-ar="einrichten"]'); await page.click('[data-ar="einrichten"]');
  await page.waitForSelector('[data-ar="neu"]', { timeout: 20000 });
  const tom = await page.evaluate(async () => (await CDSE_TEAM.neuesDossier({ nachname: 'Muster', vorname: 'Tom', geschlecht: 'm', geburtsdatum: '2014-03-10', klasse: 'C4.1' }, { stelle: 'cst' })).id);
  /* feste Wochentage relativ zu heute: Mittwoch und Montag der Vorwoche, Montag davor */
  const tag = (basis, plus) => { const d = new Date(basis); d.setDate(d.getDate() + plus); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const heute = new Date(); heute.setHours(12, 0, 0, 0);
  const moVor = tag(heute, -((heute.getDay() + 6) % 7) - 7), miVor = tag(moVor + 'T12:00:00', 2), moDavor = tag(moVor + 'T12:00:00', -7);
  async function eintraege() { await gehe('#/'); await gehe('#/schueler/' + tom); await page.waitForSelector('.ar-tabs [data-tab="eintraege"]', { timeout: 20000 }); await page.click('.ar-tabs [data-tab="eintraege"]'); await warte(300); }

  console.log('1) Vorfall eintragen');
  await eintraege();
  check('Protokollfelder erst sichtbar, wenn „Vorfall / Krise“ gewählt ist', !(await page.isVisible('#ar-eintrag-form .ar-vorfall')));
  await page.selectOption('#ar-eintrag-form select[name="art"]', 'vorfall'); await warte(100);
  check('Mit „Vorfall / Krise“: Protokollfelder und Textfeld „Was ist passiert? (Verlauf)“', await page.isVisible('#ar-eintrag-form .ar-vorfall') && (await text('#ar-eintrag-form')).includes('Was ist passiert? (Verlauf)'));
  const f = '#ar-eintrag-form ';
  await page.fill(f + 'input[name="datum"]', miVor);
  await page.fill(f + 'input[name="v_zeit"]', '10:15'); await page.fill(f + 'input[name="v_situation"]', '3. Stunde'); await page.fill(f + 'input[name="v_ort"]', 'Klasse');
  await page.fill(f + 'textarea[name="v_ausloeser"]', 'Streit um einen Stift (erfunden).'); await page.fill(f + 'textarea[name="v_intervention"]', 'Ruhige Ecke angeboten (erfunden).');
  await page.fill(f + 'textarea[name="v_nachbesprechung"]', 'Frühe Pause hilft (erfunden).'); await page.fill(f + 'input[name="v_toVon"]', '10:20'); await page.fill(f + 'input[name="v_toBis"]', '10:35');
  await page.selectOption(f + 'select[name="v_schwere"]', 'mittel'); await page.check(f + 'input[name="v_leitung"]');
  await page.fill(f + 'textarea[name="text"]', 'Tom hat laut geschrien und den Raum verlassen (erfunden).');
  await page.click(f + 'button[type="submit"]'); await page.waitForFunction(() => /Protokoll zum Vorfall|Auslöser/.test(document.querySelector('#ar-dossier').innerText), null, { timeout: 20000 }); await warte(300);
  const d = await page.evaluate(async id => await CDSE_TEAM.dossier(id, true), tom);
  const e = d.eintraege[0] || {};
  check('Gespeichert: Art „vorfall“ mit allen Feldern', e.art === 'vorfall' && e.vorfall.zeit === '10:15' && e.vorfall.situation === '3. Stunde' && e.vorfall.ausloeser.startsWith('Streit') && e.vorfall.timeoutVon === '10:20' && e.vorfall.leitung === true && e.vorfall.eltern === false && e.text.startsWith('Tom hat'), e);
  const k = (await text('.ar-eintrag')).replace(/\s+/g, ' ');
  check('Anzeige: Kopf mit Zeit/Situation/Time-out, Auslöser, Verlauf, Maßnahme, Nachbesprechung, Meldungen', k.includes('10:15 Uhr · 3. Stunde · Klasse · Schwere: mittel · Time-out 10:20–10:35 (15 Min.)') && k.includes('Auslöser') && k.includes('Verlauf') && k.includes('Maßnahme') && k.includes('Nachbesprechung') && k.includes('✓ Leitung/Responsable informiert') && k.includes('○ Eltern informiert'), k.slice(0, 500));

  console.log('2) Bearbeiten');
  await page.click('.ar-eintrag [data-ar="eintrag-aendern"]'); await page.waitForSelector('dialog.ar-dialog');
  check('Bearbeiten zeigt die Protokollfelder mit den Werten', await page.isVisible('dialog .ar-vorfall') && (await page.inputValue('dialog input[name="v_situation"]')) === '3. Stunde');
  await page.check('dialog input[name="v_eltern"]'); await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Speichern")');
  await page.waitForFunction(() => !document.querySelector('dialog.ar-dialog'), null, { timeout: 20000 }); await warte(300);
  const d2 = await page.evaluate(async id => await CDSE_TEAM.dossier(id, true), tom);
  check('Geändert: Eltern informiert, übrige Felder erhalten', d2.eintraege[0].vorfall.eltern === true && d2.eintraege[0].vorfall.situation === '3. Stunde' && d2.eintraege[0].geaendert);

  console.log('3) Überblick über mehrere Vorfälle');
  await page.evaluate(async ([id, t]) => {
    await CDSE_TEAM.ops.eintrag(id, { datum: t.mo, art: 'vorfall', titel: '', text: 'Verlauf 2 (erfunden)', vorfall: { situation: '3. Stunde', timeoutVon: '09:00', timeoutBis: '09:10', leitung: true, eltern: true } });
    await CDSE_TEAM.ops.eintrag(id, { datum: t.davor, art: 'vorfall', titel: '', text: 'Verlauf 3 (erfunden)', vorfall: { situation: 'Pause' } });
  }, [tom, { mo: moVor, davor: moDavor }]);
  await eintraege();
  const ueb = (await text('.ar-vorfall-ueberblick')).replace(/\s+/g, ' ');
  check('„Vorfälle im Überblick“: Zahl, Time-out-Summe, häufigste Tage und Situationen, fehlende Information', ueb.includes('3 Vorfälle') && ueb.includes('Time-out insgesamt 25 Minuten') && ueb.includes('Mo (2), Mi (1)') && ueb.includes('3. Stunde (2)') && ueb.includes('Bei 1 Vorfall'), ueb);
  await page.screenshot({ path: path.join(OUT, 'v1-vorfall.png'), fullPage: false });
  await page.locator('.ar-eintrag').first().screenshot({ path: path.join(OUT, 'v2-eintrag.png') });
  await page.evaluate(() => { window.print = function () {}; }); await page.click('[data-ar="drucken"]'); await warte(600);
  const blatt = await page.evaluate(() => { const f = [...document.querySelectorAll('iframe[aria-hidden]')].pop(); return f ? f.contentDocument.body.innerText.replace(/\s+/g, ' ') : ''; });
  check('Übergabeblatt: Vorfall mit Zeit, Time-out, Auslöser, Verlauf, Maßnahme und Meldungen', blatt.includes('Time-out 10:20–10:35 (15 Min.)') && blatt.includes('Auslöser: Streit um einen Stift') && blatt.includes('Verlauf: Tom hat laut') && blatt.includes('Maßnahme: Ruhige Ecke') && blatt.includes('Leitung/Responsable informiert · Eltern informiert'), blatt.slice(blatt.indexOf('Letzte Einträge'), blatt.indexOf('Letzte Einträge') + 500));
  const ds = await page.evaluate(async id => { const r = CDSE_DATENBANK.datensatz(await CDSE_TEAM.dossier(id, true)); return [r.vorfaelle, r.timeout]; }, tom);
  check('Datenbank: 3 Vorfälle und 25 Time-out-Minuten in den letzten 3 Monaten', JSON.stringify(ds) === '[3,25]', ds);
  const roh = await page.evaluate(async id => { const r = await navigator.storage.getDirectory(); const g = await (await r.getDirectoryHandle('gemeinsam')).getDirectoryHandle('schueler'); return await (await (await g.getFileHandle(id + '.cdse')).getFile()).text(); }, tom);
  check('Dossier-Datei verschlüsselt', roh.includes('cdse-dossier') && !roh.includes('Streit um einen Stift'));

  console.log('4) Handy (390 px)');
  await page.setViewportSize({ width: 390, height: 844 }); await warte(300);
  const q = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('390 px: ohne waagrechtes Scrollen', q <= 1, q);

  check('Keine Fehler in der Konsole', errors.length === 0, errors.slice(0, 5));
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler  (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
