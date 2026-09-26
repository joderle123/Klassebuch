// Test: ELDiB und PEI im Dossier (Entwicklung & Ziele, überfällige Items, Ziele, Fortschritt, Liste, Übergabeblatt)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const OUT = __dirname;
const BASE = 'http://127.0.0.1:8099/hub.html';
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info ? '  → ' + info : '')); } }
const FALL = JSON.parse(fs.readFileSync(OUT + '/../ds-probe/fall-tom.json', 'utf8'));

// Erfundener Schüler: geboren 20.05.2016, Einschätzung 1 am 01.10.2025 (9;4), Einschätzung 2 am 15.06.2026 (10;0)
function reihe(prefix, von, bis, status) { const o = {}; for (let i = von; i <= bis; i++) o[prefix + '-' + i] = { status }; return o; }
const E1 = Object.assign({}, reihe('V', 1, 10, 'erreicht'), { 'V-11': { status: 'ziel', zieltext: '', zielIndex: 0 }, 'V-12': { status: 'ziel', zielIndex: 0 }, 'V-13': { status: 'nicht-erreicht' }, 'V-14': { status: 'erreicht' } },
  reihe('K', 1, 14, 'erreicht'), { 'K-15': { status: 'ziel', zielIndex: 0 } }, reihe('SOZ', 1, 10, 'erreicht'), { 'SOZ-11': { status: 'ziel', zielIndex: 0 } });
const E2 = Object.assign({}, reihe('V', 1, 12, 'erreicht'), { 'V-13': { status: 'ziel', zieltext: 'x', zielIndex: 0 }, 'V-14': { status: 'nicht-erreicht' }, 'V-15': { status: 'erreicht' },
  'V-16': { status: 'ziel', zieltext: 'Ich bleibe bei meiner Aufgabe, bis der Timer klingelt.', zielIndex: -1 } },
  reihe('K', 1, 18, 'erreicht'), { 'K-19': { status: 'ziel', zieltext: 'Je pose une question quand je ne comprends pas.' } },
  reihe('SOZ', 1, 10, 'erreicht'), { 'SOZ-11': { status: 'nicht-erreicht' }, 'SOZ-13': { status: 'ziel', zielIndex: 0 } });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(() => { window.__CDSE_TEST_ORDNER = () => navigator.storage.getDirectory(); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('dialog', d => d.accept());
  const warte = ms => page.waitForTimeout(ms);
  async function gehe(hash) { await page.evaluate(h => { location.hash = h; }, hash); await warte(500); }
  async function dialogKnopf(text) { await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("' + text + '")'); }
  const text = sel => page.textContent(sel);

  await page.goto(BASE);
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); for await (const [n] of r.entries()) { await r.removeEntry(n, { recursive: true }); } localStorage.clear(); sessionStorage.clear(); });
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); await r.getFileHandle('hub.html', { create: true }); });
  await page.reload();
  await page.click('#g-ordner');
  await page.waitForSelector('#g-name');
  await page.fill('#g-name', 'Joey Muster');
  await page.check('input[name="g-team"][value="diagnostique"]');
  await page.selectOption('#g-resp', '-');
  await page.fill('#g-pw1', 'ein sicheres Passwort 1'); await page.fill('#g-pw2', 'ein sicheres Passwort 1');
  await page.click('#g-los');
  await page.waitForSelector('#g-code', { timeout: 30000 });
  await page.check('#g-ok'); await page.click('#g-weiter');
  await page.waitForSelector('#me:not([hidden])', { timeout: 30000 });
  await gehe('#/schueler');
  await page.waitForSelector('[data-ar="einrichten"]');
  await page.click('[data-ar="einrichten"]');
  await page.waitForSelector('[data-ar="neu"]', { timeout: 20000 });
  check('Itembank geladen (ELDIB_BANK mit 4 Bereichen)', await page.evaluate(() => typeof ELDIB_BANK !== 'undefined' && Object.keys(ELDIB_BANK.bereiche).length === 4));

  console.log('1) Zwei Schüler anlegen');
  async function neu(nach, vor, geb) {
    await gehe('#/schueler'); await page.waitForSelector('[data-ar="neu"]');
    await page.click('[data-ar="neu"]');
    await page.fill('dialog input[name=nachname]', nach); await page.fill('dialog input[name=vorname]', vor);
    await page.fill('dialog input[name=geburtsdatum]', geb); await page.selectOption('dialog select[name=geschlecht]', 'm');
    await dialogKnopf('Anlegen');
    await page.waitForSelector('.ar-dkopf h1', { timeout: 20000 });
    return page.evaluate(() => location.hash.split('/').pop());
  }
  await neu('Beispiel', 'Ben', '2015-01-01');
  const sid = await neu('Muster', 'Tom', '2016-05-20');
  await page.click('.ar-tabs [data-tab="entwicklung"]');
  check('Reiter „Entwicklung & Ziele“ ohne Daten: Hinweis + Übernehmen-Knopf', (await text('.ar-tabinhalt')).includes('Noch keine ELDiB-Einschätzung') && await page.isVisible('.ar-tabinhalt [data-ar="eldib-uebernehmen"]'));

  console.log('2) Übernahme aus dem ELDiB-Generator (DS + Einschätzung 1 und 2)');
  await page.evaluate(({ f, E1, E2 }) => {
    const ds = JSON.parse(JSON.stringify(f.ds)); ds.v = 2;
    E2['K-19'].zieltext = ELDIB_BANK.zieleFremd['K-19'].fr[0];   // auf Französisch gewählt, ohne Nummer
    const st = (d, nr) => ({ schueler_name: 'Muster, Tom', geburtsdatum: '2016-05-20', einschaetzungsdatum: d, einschaetzende: 'J. Muster', schuljahr: '2025/2026', periodenTyp: 'trimester', periode: String(nr) });
    localStorage.setItem('eldib-schueler-liste', JSON.stringify([{ id: 'sch-1', name: 'Muster, Tom', klasse: 'C4.1', geburtsdatum: '2016-05-20',
      einschaetzung1: { savedAt: '2025-10-01T15:00:00.000Z', language: 'de', stammdaten: st('2025-10-01', 1), selections: E1, zusaetzlicheZiele: { demarches_mentales: { 'DM-1': 'stufe1' } }, bereichNotizen: {}, dsData: { v: 2, bewertungen: {}, chips: {}, f: {}, frei: {}, tabellen: {} } },
      einschaetzung2: { savedAt: '2026-06-15T15:00:00.000Z', language: 'de', stammdaten: st('2026-06-15', 3), selections: E2,
        zusaetzlicheZiele: { demarches_mentales: { 'DM-1': 'stufe1', 'DM-4': 'stufe3' }, attitudes_affectives: { 'AA-1': 'stufe2' }, competences_essentielles: { 'CE-1': 'erreicht' } },
        bereichNotizen: { verhalten: 'Braucht klare Übergänge zwischen den Aktivitäten.', zusaetzlich: 'Arbeitet gern am Computer.' }, dsData: ds } }]));
  }, { f: FALL, E1, E2 });
  await page.click('.ar-tabinhalt [data-ar="eldib-uebernehmen"]');
  await page.waitForSelector('dialog .ar-wahl.passt');
  const wahl = await text('dialog .ar-wahl.passt');
  check('Auswahl zeigt „ELDiB-Einschätzung 1 und 2 · 4 Ziele“', wahl.includes('ELDiB-Einschätzung 1 und 2') && wahl.includes('4 Ziele'), wahl);
  await dialogKnopf('Übernehmen');
  await page.waitForSelector('.ar-leiter', { timeout: 20000 });
  const tab = await text('.ar-tabinhalt');
  check('Kopf nennt Einschätzung 2 vom 15.06.2026 und Alter 10 J.', tab.includes('Einschätzung 2 vom 15.06.2026') && tab.includes('Alter damals 10 J.'), tab.slice(0, 300));
  const status = await page.$$eval('.ar-leiter.gross .ar-leiter-zeile', z => z.map(x => x.querySelector('.ar-leiter-name b').textContent + ': ' + x.querySelector('.ar-leiter-status').textContent));
  check('Verhalten: Stufe III, 1 Stufe unter dem Alter', status[0] === 'Verhalten: 1 Stufe unter dem Alter' && tab.includes('Stufe III'), status.join(' | '));
  check('Sozialisation: 3 Stufen unter dem Alter', status[2] === 'Sozialisation: 3 Stufen unter dem Alter', status[2]);
  check('Kognition: nicht eingeschätzt', status[3] === 'Kognition: nicht eingeschätzt', status[3]);
  check('Erwartete Stufe IV ist markiert (4 Bereiche)', (await page.$$('.ar-leiter.gross .ar-seg.erwartet')).length === 4);
  const ueber = await page.$$eval('.ar-tabinhalt .ar-ueb-liste li.ar-ueb .ar-icode', l => l.map(x => x.textContent));
  check('Überfällig je Bereich: V-13, V-14, V-16 | K-19 | SOZ-11, SOZ-13', ueber.join(',') === 'V-13,V-14,V-16,K-19,SOZ-11,SOZ-13', ueber.join(','));
  check('„2 noch ohne Förderziel“ (V-14, SOZ-11)', tab.includes('davon 2 noch ohne Förderziel'), '');
  check('SOZ-11 ist „deutlich“ markiert', await page.isVisible('.ar-ueb-liste li.ar-ueb.stark:has(.ar-icode:text-is("SOZ-11"))'));
  check('Hinweis auf nicht eingeschätzte Items in fälligen Stufen', tab.includes('noch nicht eingeschätzt'));
  const ziele = await page.$$eval('.ar-ziel', l => l.map(x => x.querySelector('.ar-icode').textContent + '|' + x.querySelector('.ar-ichsatz').textContent));
  check('4 Förderziele: V-13, V-16, K-19, SOZ-13', ziele.map(z => z.split('|')[0]).join(',') === 'V-13,V-16,K-19,SOZ-13', ziele.join(' / '));
  const v13 = await page.evaluate(() => ELDIB_BANK.bereiche.verhalten.stufen[2].items.find(i => i.code === 'V-13').zielformulierungen[0]);
  check('Ich-Satz V-13 aus der Itembank (deutsch)', ziele[0].includes(v13), ziele[0]);
  check('Eigene Formulierung V-16 bleibt', ziele[1].includes('bis der Timer klingelt'));
  const k19 = await page.evaluate(() => ELDIB_BANK.bereiche.kommunikation.stufen[3].items.find(i => i.code === 'K-19').zielformulierungen[0]);
  check('K-19 auf Französisch gewählt → deutscher Ich-Satz', ziele[2].includes(k19), ziele[2]);
  check('Förderideen und „Woran man es merkt“ je Ziel', (await page.$$('.ar-ziel h4')).length >= 6);
  check('CDSE-Hinweis an der Zielkarte V-13 (Piktogramme)', (await page.textContent('.ar-ziel:has(.ar-icode:text-is("V-13")) .ar-itemhinweis')).includes('Piktogramme'));
  const ideenV13 = await page.$$eval('.ar-ziel:has(.ar-icode:text-is("V-13")) h4:first-of-type + ul li', l => l.map(x => x.textContent));
  const bankV13 = await page.evaluate(() => ELDIB_BANK.interventionen['V-13']);
  check('Förderideen V-13 aus der CDSE-Liste', JSON.stringify(ideenV13) === JSON.stringify(bankV13), ideenV13.join(' | '));
  /* Toolbox: Materialvorschläge je Ziel und bei überfälligen Items, Deep-Links in den Toolbox-Tab */
  const tbV13 = await page.$$eval('.ar-ziel:has(.ar-icode:text-is("V-13")) ul.ar-material a', l => l.map(a => a.getAttribute('href') + '|' + a.getAttribute('target')));
  const tbAnzahl = await page.evaluate(() => window.CDSE_TOOLBOX_INDEX.materialien.filter(m => (m.eldib || []).indexOf('V-13') >= 0).length);
  check('Toolbox: bis zu 3 Materialien je Ziel mit Deep-Link', tbAnzahl > 0 && tbV13.length === Math.min(3, tbAnzahl) && tbV13.every(x => /^apps\/toolbox\.html#eldib=V-13&material=[^|]+\|cdse-toolbox$/.test(x)), tbV13.join(' ; '));
  if (tbAnzahl > 3) { check('Toolbox: Link „Alle ' + tbAnzahl + ' Materialien zu V-13“', (await text('.ar-ziel:has(.ar-icode:text-is("V-13")) .ar-material-alle')).includes('Alle ' + tbAnzahl + ' Materialien zu V-13')); }
  const tbUeber = await page.$$eval('.ar-ueb-liste .ar-tb', l => l.map(a => a.getAttribute('href')));
  check('Toolbox: Materiallinks bei überfälligen Items', tbUeber.length >= 1 && tbUeber.every(h => /^apps\/toolbox\.html#eldib=(V|K|SOZ|KOG)-\d+$/.test(h)), tbUeber.join(' ; '));
  const tbTitel = await page.$eval('.ar-ziel:has(.ar-icode:text-is("V-13")) ul.ar-material a', a => a.textContent);
  const tbSeite = await ctx.newPage();
  await tbSeite.goto(new URL(tbV13[0].split('|')[0], BASE).href); await tbSeite.waitForTimeout(2500);
  const tbDialog = await tbSeite.evaluate(() => { const d = document.querySelector('dialog[open]'); return d ? d.textContent : ''; });
  check('Toolbox öffnet das vorgeschlagene Material (' + tbTitel + ')', tbDialog.includes(tbTitel), tbDialog.slice(0, 120));
  await tbSeite.close();
  check('Leitziel je Bereich und Notiz „klare Übergänge“', tab.includes('Leitziel Stufe') && tab.includes('klare Übergänge'));
  check('Zusatzziele: Lernt noch / Mit Unterstützung / Kann schon', tab.includes('Problemanalyse') && tab.includes('Gefühle erkennen') && tab.includes('Körperhygiene'));
  check('Fortschritt: 3/4 Ziele erreicht', tab.includes('3/4') && tab.includes('Ziele erreicht'));
  check('Rückschritt V-14 wird genannt', tab.includes('Rückschritt') && tab.includes('V-14'));
  check('„Als Nächstes möglich“', tab.includes('Als Nächstes möglich'));
  await page.setViewportSize({ width: 1400, height: 4200 }); await warte(200);
  await page.screenshot({ path: OUT + '/e1-entwicklung.png' });
  await page.setViewportSize({ width: 1400, height: 900 });

  console.log('3) Einschätzung 1 ansehen');
  await page.click('[data-ar="eldib-wahl"][data-nr="1"]');
  await warte(200);
  const t1 = await text('.ar-tabinhalt');
  check('Einschätzung 1: Alter 9 J. 4 M., erwartet Stufe III', t1.includes('Alter damals 9 J. 4 M.') && t1.includes('(9 Jahre)'), t1.slice(0, 300));
  const ziele1 = await page.$$eval('.ar-ziel .ar-icode', l => l.map(x => x.textContent));
  check('Einschätzung 1: Ziele V-11, V-12, K-15, SOZ-11', ziele1.join(',') === 'V-11,V-12,K-15,SOZ-11', ziele1.join(','));
  check('Einschätzung 1 hat keinen Fortschritts-Block', !t1.includes('Ziele erreicht'));
  await page.click('[data-ar="eldib-wahl"][data-nr="2"]');

  console.log('4) Überblick');
  await page.click('.ar-tabs [data-tab="ueberblick"]');
  await page.waitForSelector('.ar-eldibkarte');
  const ub = await text('.ar-eldibkarte');
  check('Überblick: „6 Items sind für das Alter längst erwartet“', ub.includes('6 Items sind für das Alter längst erwartet'), ub.slice(0, 300));
  const top = await page.$$eval('.ar-eldibkarte .ar-ueb-liste .ar-icode', l => l.map(x => x.textContent));
  check('Überblick: die 4 ältesten Lücken zuerst (SOZ-11, dann V-13, V-14, SOZ-13)', top.join(',') === 'SOZ-11,V-13,V-14,SOZ-13', top.join(','));
  check('Überblick: „Woran wir gerade arbeiten“ mit 4 Ich-Sätzen', ub.includes('Woran wir gerade arbeiten') && (await page.$$('.ar-zielkurz li')).length === 4);
  check('Auf einen Blick (DS) weiterhin da', await page.isVisible('.ar-blickraster'));
  await page.setViewportSize({ width: 1400, height: 2200 }); await warte(200);
  await page.screenshot({ path: OUT + '/e2-ueberblick.png' });
  await page.setViewportSize({ width: 390, height: 2600 }); await warte(200);
  await page.screenshot({ path: OUT + '/e2b-mobil.png' });
  await page.setViewportSize({ width: 1400, height: 900 });

  console.log('5) Beobachtung zu einem Ziel');
  await page.click('.ar-tabs [data-tab="entwicklung"]');
  await page.click('[data-ar="ziel-eintrag"][data-item="V-13"]');
  await page.waitForSelector('dialog .ar-zielchip');
  await page.fill('dialog textarea[name=text]', 'Hat heute im Morgenkreis drei Minuten gewartet, ohne zu unterbrechen.');
  await dialogKnopf('Speichern');
  await page.waitForSelector('.ar-ziel footer:has-text("1 Eintrag dazu")', { timeout: 20000 });
  check('Zielkarte zählt 1 Eintrag', true);
  await page.click('.ar-tabs [data-tab="eintraege"]');
  check('Eintrag trägt den Ziel-Chip V-13', (await text('.ar-eintrag .ar-zielchip')).includes('V-13'));
  const optionen = await page.$$eval('#ar-eintrag-form select[name=ziel] option', l => l.map(o => o.value));
  check('Neuer Eintrag: Auswahl „Bezug zu einem Förderziel“ mit 4 Zielen', optionen.filter(Boolean).length === 4, optionen.join(','));
  const datei = await page.evaluate(async id => { const r = await navigator.storage.getDirectory(); const g = await (await r.getDirectoryHandle('gemeinsam')).getDirectoryHandle('schueler'); return await (await (await g.getFileHandle(id + '.cdse')).getFile()).text(); }, sid);
  check('Dossier-Datei bleibt verschlüsselt (kein Ich-Satz im Klartext)', !datei.includes('Timer') && !datei.includes('V-13'));

  console.log('6) Profil im Wortlaut mit ELDiB-Ergebnissen');
  await page.click('.ar-tabs [data-tab="profil"]');
  const wl = await text('.ar-tabinhalt');
  check('Wortlaut enthält „ELDiB-Ergebnisse“ und Entwicklungsstufe', wl.includes('ELDiB-Ergebnisse') && wl.includes('Entwicklungsstufe'), wl.slice(0, 200));
  check('Kein Platzhalter im Wortlaut', !/\{[A-Za-z]+\}|\[\[|undefined|NaN/.test(wl));

  console.log('7) Liste: Hinweis und Filter „Überfällige Items“');
  await gehe('#/schueler');
  await page.waitForSelector('.ar-tabelle');
  check('Liste: Tom mit „6 überfällig“ und „4 Förderziele“', (await text('.ar-tabelle')).includes('6 überfällig') && (await text('.ar-tabelle')).includes('4 Förderziele'));
  await page.click('[data-filter-ueber="1"]');
  const gefiltert = await text('#ar-liste');
  check('Filter zeigt nur Tom', gefiltert.includes('MUSTER Tom') && !gefiltert.includes('BEISPIEL Ben'));
  await page.click('[data-filter-ueber="1"]');
  check('Filter aus: beide wieder da', (await text('#ar-liste')).includes('BEISPIEL Ben'));
  await page.screenshot({ path: OUT + '/e3-liste.png' });

  console.log('8) Neuere Daten im ELDiB-Generator');
  await page.evaluate(() => { const l = JSON.parse(localStorage.getItem('eldib-schueler-liste')); l[0].einschaetzung2.savedAt = '2026-09-01T08:00:00.000Z'; localStorage.setItem('eldib-schueler-liste', JSON.stringify(l)); });
  await gehe('#/schueler/' + sid);
  await page.waitForSelector('.ar-dkopf');
  await page.click('.ar-tabs [data-tab="ueberblick"]');
  check('Überblick meldet neuere Daten', (await text('.ar-tabinhalt')).includes('gibt es neuere Daten'));

  console.log('9) Übergabeblatt');
  await page.click('[data-ar="drucken"]');
  await warte(600);
  const blatt = await page.evaluate(() => { const f = document.querySelector('iframe[aria-hidden="true"]'); return f ? f.contentDocument.body.innerText : ''; });
  check('Übergabeblatt: Entwicklung, überfällige Items, Förderziele', blatt.includes('Entwicklung (ELDiB)') && blatt.includes('Für das Alter längst erwartet') && blatt.includes('Aktuelle Förderziele (PEI)'), blatt.slice(0, 200));
  check('Übergabeblatt: Ich-Satz und Förderideen', blatt.includes('bis der Timer klingelt') && blatt.includes('Förderideen'));

  console.log('10) Ohne Itembank (alte ds-motor.js): Hinweis statt Fehler');
  await page.evaluate(() => { window.ELDIB_BANK = undefined; });
  await page.click('.ar-tabs [data-tab="entwicklung"]');
  check('Hinweis auf fehlende Itembank', (await text('.ar-tabinhalt')).includes('apps/ds-motor.js'));

  check('Keine Fehler in der Konsole', errors.length === 0, errors.slice(0, 5).join(' | '));
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
