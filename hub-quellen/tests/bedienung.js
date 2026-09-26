// Test: Bedienung und Schutz – Hub sperren (Menü, Adresse gesperrt, Formular übersteht die Sperre),
// Rückfrage vor dem Verwerfen, Entwurf je Dossier, schnelles Wechseln zwischen Kindern, Suche Wort für Wort,
// Tageskarte zu zweit am selben Tag, Einschätzung in mehreren Bereichen, Einsatzplan-Entwurf, Rolle bestätigen.
// Nur erfundene Testpersonen.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = 'http://127.0.0.1:8099/hub.html';
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + JSON.stringify(info).slice(0, 300) : '')); } }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, timezoneId: 'Europe/Luxembourg' });
  await ctx.addInitScript(() => { window.__CDSE_TEST_ORDNER = () => navigator.storage.getDirectory(); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('dialog', d => d.accept());
  const warte = ms => page.waitForTimeout(ms);
  const PW = 'ein sicheres Passwort 1';
  async function gehe(hash) { await page.evaluate(h => { location.hash = h; }, hash); await warte(500); }
  async function dialogKnopf(text) { await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("' + text + '")'); }
  async function menue() { if (await page.isVisible('#me-btn')) await page.click('#me-btn'); else await page.click('#me-ava'); }
  async function neuerSchueler(nach, vor, geb) {
    await gehe('#/schueler'); await page.waitForSelector('[data-ar="neu"]', { timeout: 20000 });
    await page.click('[data-ar="neu"]');
    await page.fill('dialog input[name=nachname]', nach); await page.fill('dialog input[name=vorname]', vor);
    if (geb) await page.fill('dialog input[name=geburtsdatum]', geb);
    await dialogKnopf('Anlegen');
    await page.waitForFunction(n => { const h = document.querySelector('.ar-dkopf h1'); return h && h.textContent.indexOf(n) >= 0; }, nach.toUpperCase(), { timeout: 20000 });
    return page.evaluate(() => location.hash.split('/').pop());
  }

  await page.goto(BASE);
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); for await (const [n] of r.entries()) { await r.removeEntry(n, { recursive: true }); } localStorage.clear(); sessionStorage.clear(); });
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); await r.getFileHandle('hub.html', { create: true }); });
  await page.reload();
  await page.click('#g-ordner'); await page.waitForSelector('#g-name');
  await page.fill('#g-name', 'Tom Muster'); await page.check('input[name="g-team"][value="diagnostique"]');
  await page.selectOption('#g-resp', '-'); await page.fill('#g-pw1', PW); await page.fill('#g-pw2', PW);
  await page.click('#g-los'); await page.waitForSelector('#g-code', { timeout: 30000 });
  await page.check('#g-ok'); await page.click('#g-weiter'); await page.waitForSelector('#me:not([hidden])', { timeout: 30000 });
  await gehe('#/schueler'); await page.waitForSelector('[data-ar="einrichten"]'); await page.click('[data-ar="einrichten"]');
  await page.waitForSelector('[data-ar="neu"]', { timeout: 20000 });

  console.log('1) Hub sperren über das Konto-Menü, Adresse ändern hilft nicht');
  const idA = await neuerSchueler('Beispiel', 'Lea', '2016-05-02');
  await menue();
  check('Menüpunkt „Hub sperren“ vorhanden', await page.isVisible('[data-konto="sperren"]'));
  await page.click('[data-konto="sperren"]');
  await page.waitForSelector('#gate:not([hidden]) #g-pw', { timeout: 10000 });
  check('Sperrbildschirm mit Hinweis', (await page.textContent('#gate-card')).includes('gesperrt'));
  check('CDSE_KONTO.gesperrt() meldet gesperrt', await page.evaluate(() => window.CDSE_KONTO.gesperrt()));
  const vorher = await page.evaluate(() => document.getElementById('arbeit-body').innerHTML.length);
  await page.evaluate(() => { location.hash = '#/verwaltung'; }); await warte(600);
  check('Gesperrt: neue Adresse baut keine Seite auf', await page.evaluate(n => document.getElementById('arbeit-body').innerHTML.length === n && !document.querySelector('#ar-verw'), vorher));
  await page.fill('#g-pw', PW); await page.click('#g-los');
  await page.waitForSelector('#me:not([hidden])', { timeout: 30000 }); await warte(600);
  check('Entsperrt: gewünschte Seite erscheint', await page.evaluate(() => !!document.querySelector('#ar-verw')));

  console.log('2) Angefangenes Formular übersteht die Sperre');
  await gehe('#/schueler/' + idA); await page.waitForSelector('.ar-dkopf h1');
  await page.click('.ar-daktionen [data-ar="eintrag-neu"]');
  check('Kopfknopf „Eintrag“ öffnet den Reiter Einträge', await page.evaluate(() => document.querySelector('.ar-tabs .on').getAttribute('data-tab') === 'eintraege'));
  check('… und setzt den Cursor ins Textfeld', await page.evaluate(() => document.activeElement && document.activeElement.name === 'text'));
  await page.click('.ar-mehr summary'); await page.click('[data-ar="person"]');
  await page.waitForSelector('dialog.ar-dialog input[name=schule]');
  await page.fill('dialog.ar-dialog input[name=schule]', 'École Beispielstadt');
  await page.evaluate(() => window.CDSE_KONTO.sperren('Test-Sperre'));
  await page.waitForSelector('#gate:not([hidden]) #g-pw', { timeout: 10000 });
  check('Beim Sperren ist das Formular nicht mehr zu sehen', await page.evaluate(() => !document.querySelector('dialog[open]')));
  await page.fill('#g-pw', PW); await page.click('#g-los');
  await page.waitForSelector('#me:not([hidden])', { timeout: 30000 }); await warte(500);
  check('Nach dem Entsperren ist das Formular wieder da – mit dem Text', await page.evaluate(() => { const d = document.querySelector('dialog.ar-dialog[open]'); return !!d && d.querySelector('input[name=schule]').value === 'École Beispielstadt'; }));
  await dialogKnopf('Speichern');
  await page.waitForFunction(() => !document.querySelector('dialog.ar-dialog'), null, { timeout: 20000 });
  check('Gespeichert nach dem Entsperren', (await page.textContent('.ar-dkopf')).includes('École Beispielstadt'));

  console.log('3) Rückfrage, bevor Geschriebenes verworfen wird');
  await page.click('.ar-mehr summary'); await page.click('[data-ar="person"]');
  await page.waitForSelector('dialog.ar-dialog input[name=klasse]');
  await page.fill('dialog.ar-dialog input[name=klasse]', 'C2.1');
  await page.keyboard.press('Escape'); await warte(200);
  check('Esc mit geändertem Text: Dialog bleibt, Rückfrage erscheint', await page.evaluate(() => { const d = document.querySelector('dialog.ar-dialog[open]'); return !!d && /noch nicht gespeichert/.test(d.querySelector('.ar-dialog-fehler').textContent); }));
  await dialogKnopf('Abbrechen'); await warte(200);
  check('Zweites Abbrechen verwirft', await page.evaluate(() => !document.querySelector('dialog.ar-dialog')));
  await page.click('.ar-mehr summary'); await page.click('[data-ar="person"]');
  await page.waitForSelector('dialog.ar-dialog input[name=klasse]');
  await page.keyboard.press('Escape'); await warte(200);
  check('Ohne Änderung schließt Esc sofort', await page.evaluate(() => !document.querySelector('dialog.ar-dialog')));
  await page.click('.ar-mehr summary'); await warte(100);
  await page.click('.ar-dtitel h1'); await warte(100);
  check('„Weitere Aktionen“ schließt beim Klick daneben', await page.evaluate(() => !document.querySelector('details.ar-mehr[open]')));

  console.log('4) Entwurf je Dossier');
  await page.click('.ar-tabs [data-tab="eintraege"]');
  await page.fill('#ar-eintrag-form textarea[name=text]', 'Lea hat heute im Morgenkreis erzählt.');
  await page.click('.ar-tabs [data-tab="ueberblick"]');
  check('Reiter zeigt „Entwurf“', (await page.textContent('.ar-tabs [data-tab="eintraege"]')).includes('Entwurf'));
  await page.click('.ar-tabs [data-tab="eintraege"]');
  check('Text nach dem Reiterwechsel wieder da', (await page.inputValue('#ar-eintrag-form textarea[name=text]')) === 'Lea hat heute im Morgenkreis erzählt.');
  check('Hinweis „ungespeicherter Entwurf“', await page.isVisible('#ar-entwurf-hinweis'));
  const idB = await neuerSchueler('Muster', 'Ben', '2015-01-20');
  await gehe('#/schueler/' + idA); await page.waitForSelector('.ar-dkopf h1');
  await page.click('.ar-tabs [data-tab="eintraege"]');
  check('Entwurf bleibt beim Kind, auch nach einem anderen Dossier', (await page.inputValue('#ar-eintrag-form textarea[name=text]')) === 'Lea hat heute im Morgenkreis erzählt.');
  await page.click('#ar-eintrag-form button[type=submit]');
  await page.waitForFunction(() => /Morgenkreis/.test((document.querySelector('.ar-tabinhalt') || {}).textContent || '') && document.querySelector('#ar-eintrag-form textarea[name=text]').value === '', null, { timeout: 20000 });
  check('Nach dem Speichern: Formular leer, Eintrag da', true);
  await page.fill('#ar-eintrag-form textarea[name=text]', '');
  await page.click('#ar-eintrag-form button[type=submit]'); await warte(200);
  check('Leerer Text: Hinweis bleibt im Formular stehen', await page.evaluate(() => { const f = document.getElementById('ar-eintrag-fehler'); return !!f && !f.hidden && /Text/.test(f.textContent); }));

  console.log('5) Schnell zwischen zwei Kindern wechseln');
  await page.evaluate(ida => {
    const T = window.CDSE_TEAM, orig = T.dossier;
    window.__origDossier = orig;
    T.dossier = function (id, neu) { const p = orig.apply(T, arguments); return id === ida ? p.then(d => new Promise(r => setTimeout(() => r(d), 1200))) : p; };
  }, idA);
  await page.evaluate(ida => { location.hash = '#/schueler/' + ida; }, idA); await warte(150);
  await page.evaluate(idb => { location.hash = '#/schueler/' + idb; }, idB);
  await warte(2000);
  const kopf = await page.textContent('.ar-dkopf h1');
  check('Angezeigt wird das zuletzt gewählte Kind', kopf.includes('MUSTER Ben'), kopf);
  check('… und nur dieses gilt als offenes Dossier', await page.evaluate(idb => window.CDSE_ARBEIT.hilfen.aktDossier().id === idb, idB));
  await page.evaluate(() => { window.CDSE_TEAM.dossier = window.__origDossier; });

  console.log('6) Suche Wort für Wort, Hinweis auf Inaktive');
  await page.click('.ar-mehr summary'); await page.click('[data-ar="status"]');
  await page.waitForSelector('dialog.ar-dialog'); await dialogKnopf('Inaktiv setzen');
  await page.waitForFunction(() => /inaktiv seit/.test((document.querySelector('.ar-dkopf') || {}).textContent || ''), null, { timeout: 20000 });
  await gehe('#/schueler'); await page.waitForSelector('#ar-liste .ar-zeile');
  await page.fill('#ar-q', 'lea beispiel'); await warte(400);
  check('„lea beispiel“ findet BEISPIEL Lea', (await page.textContent('#ar-liste')).includes('BEISPIEL Lea'));
  await page.fill('#ar-q', 'ben'); await warte(400);
  const liste = await page.textContent('#ar-liste');
  check('Kind nur bei den Inaktiven: Hinweis mit „Alle zeigen“', /Treffer bei den/.test(liste) && liste.includes('Alle zeigen'), liste.slice(0, 200));
  await page.click('#ar-liste button:has-text("Alle zeigen")'); await warte(300);
  check('„Alle zeigen“ zeigt es', (await page.textContent('#ar-liste')).includes('MUSTER Ben'));
  await page.fill('#ar-q', ''); await warte(300);

  console.log('7) Tageskarte: zwei Personen am selben Tag');
  const tk = await page.evaluate(async id => {
    const T = window.CDSE_TEAM;
    let d = await T.ops.tageskarte(id, { ziele: [{ text: 'Ich bleibe am Platz' }, { text: 'Ich melde mich' }], abschnitte: ['Morgen', 'Pause', 'Mittag', 'Nachmittag'], ziel: 80 });
    const z1 = d.tageskarte.ziele[0].id, z2 = d.tageskarte.ziele[1].id, tag = '2026-09-21';
    // beide öffnen das Formular, solange der Tag noch leer ist (basis = null)
    await T.ops.tageskarteTag(id, tag, { p: { [z1]: [2, 1, null, null], [z2]: [1, 1, null, null] }, a: ['Morgen', 'Pause', 'Mittag', 'Nachmittag'], s: 'gut', notiz: 'Morgens ruhig' }, null);
    d = await T.ops.tageskarteTag(id, tag, { p: { [z1]: [null, null, 2, 0], [z2]: [null, null, 1, 2] }, a: ['Morgen', 'Pause', 'Mittag', 'Nachmittag'], s: '', notiz: '' }, null);
    const t1 = d.tageskarte.tage[tag];
    // Änderung einer Zelle mit richtiger Basis: nur diese Zelle ändert sich
    d = await T.ops.tageskarteTag(id, tag, { p: { [z1]: [0, 1, 2, 0], [z2]: [1, 1, 1, 2] }, a: ['Morgen', 'Pause', 'Mittag', 'Nachmittag'], s: 'gut', notiz: 'Morgens ruhig' }, t1);
    const t2 = d.tageskarte.tage[tag];
    // ohne basis (ältere Aufrufe): ersetzt wie bisher
    d = await T.ops.tageskarteTag(id, '2026-09-22', { p: { [z1]: [2, 2, 2, 2] }, s: 'gut' });
    return { t1, t2, alt: d.tageskarte.tage['2026-09-22'], z1, z2 };
  }, idA);
  check('Morgens und nachmittags eingetragen: beides bleibt', JSON.stringify(tk.t1.p[tk.z1]) === '[2,1,2,0]' && JSON.stringify(tk.t1.p[tk.z2]) === '[1,1,1,2]', tk.t1.p);
  check('Stimmung und Notiz der ersten Person bleiben', tk.t1.s === 'gut' && tk.t1.notiz === 'Morgens ruhig', tk.t1);
  check('Geänderte Zelle wird übernommen, der Rest bleibt', JSON.stringify(tk.t2.p[tk.z1]) === '[0,1,2,0]' && JSON.stringify(tk.t2.p[tk.z2]) === '[1,1,1,2]', tk.t2.p);
  check('Ohne Basis wie bisher', JSON.stringify(tk.alt.p[tk.z1]) === '[2,2,2,2]' && !tk.alt.p[tk.z2], tk.alt);

  console.log('8) Einschätzung in mehreren Bereichen');
  await gehe('#/schueler/' + idA); await page.waitForSelector('.ar-dkopf h1');
  const hatMotor = await page.evaluate(() => typeof DS_AUFBAU !== 'undefined');
  if (hatMotor) {
    await page.click('.ar-tabs [data-tab="profil"]');
    await page.click('[data-ar="einschaetzung"]'); await page.waitForSelector('dialog .ar-einsch-zeile');
    const ersteSchule = await page.evaluate(() => document.querySelector('dialog .ar-einsch-zeile').dataset.id);
    await page.click('dialog .ar-einsch-zeile[data-id="' + ersteSchule + '"] button[data-r="5"]');
    await page.selectOption('dialog select[name=bereich]', 'beobachtung');
    const ersteBeob = await page.evaluate(() => document.querySelector('dialog .ar-einsch-zeile').dataset.id);
    await page.click('dialog .ar-einsch-zeile[data-id="' + ersteBeob + '"] button[data-r="3"]');
    check('Auswahl zeigt, wo schon bewertet ist', (await page.textContent('dialog select[name=bereich]')).includes('(1 bewertet)'));
    await dialogKnopf('Speichern');
    await page.waitForFunction(() => !document.querySelector('dialog.ar-dialog'), null, { timeout: 20000 });
    const e = await page.evaluate(() => (window.CDSE_ARBEIT.hilfen.aktDossier().einschaetzungen || []).map(x => ({ b: x.bereich, n: Object.keys(x.bewertungen).length })));
    check('Beide Bereiche gespeichert (Schulalltag und Beobachtung)', e.some(x => x.b === 'schule' && x.n >= 1) && e.some(x => x.b === 'beobachtung' && x.n >= 1), e);
  } else { check('Einschätzung übersprungen (ds-motor fehlt)', true); }

  console.log('9) Einsatzplan: Entwurf übersteht einen Abstecher, ganztägiger anderer Einsatz');
  await gehe('#/einsatz'); await page.waitForSelector('[data-ar="block-neu"]', { timeout: 20000 });
  await page.click('[data-ar="block-neu"][data-tag="1"]'); await page.waitForSelector('dialog input[name=ort]');
  await page.fill('dialog input[name=ort]', 'École Musterdorf'); await dialogKnopf('Übernehmen');
  await page.waitForSelector('.ar-speicherleiste.offen');
  await gehe('#/'); await gehe('#/einsatz'); await page.waitForSelector('.ar-speicherleiste', { timeout: 20000 });
  check('Ungespeicherter Block ist nach dem Abstecher noch da', (await page.textContent('#ar-einsatz')).includes('École Musterdorf') && await page.isVisible('.ar-speicherleiste.offen'));
  await page.click('[data-ar="plan-speichern"]'); await page.waitForSelector('.ar-speicherleiste:not(.offen)', { timeout: 20000 });
  const ganz = await page.evaluate(() => {
    const plan = { woche: [{ tag: 1, von: '08:00', bis: '12:00', ort: 'A' }, { tag: 1, von: '13:00', bis: '16:30', ort: 'B' }], ausnahmen: [{ id: 'x', art: 'termin', von: '2026-09-21', bis: '2026-09-21', ort: 'Fortbildungszentrum' }] };
    return window.CDSE_ARBEIT.planZu(plan, new Date(2026, 8, 21, 10, 0));
  });
  check('Ganztägig anderer Einsatz ersetzt den Tag', ganz.art === 'im-einsatz' && ganz.block && ganz.block.ort === 'Fortbildungszentrum', ganz);

  console.log('10) Datum in Ortszeit');
  const dz = await page.evaluate(() => window.CDSE_ARBEIT.hilfen.datumZeit(new Date(2026, 8, 21, 0, 30).toISOString()));
  check('Kurz nach Mitternacht: Datum und Uhrzeit passen zusammen', dz === '21.09.2026, 00:30', dz);

  check('Keine Skriptfehler', errors.length === 0, errors.slice(0, 3));
  console.log(ok + ' ok, ' + bad + ' Fehler');
  await browser.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
