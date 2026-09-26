// Test: Screening im Schülerdossier – Bogen je Stufe, Pflichtangaben (auch „keine Angabe“), Auswertung (Ampel,
// Gesamteinschätzung, nächste Schritte), Speichern verschlüsselt im Dossier, Warnsignale, Vergleich zweier
// Beobachtender, Entwurf je Konto, Stufenwechsel, Löschen nur mit Schreibrecht, älteres Warnsignal in der Übersicht,
// 390 px. Nur erfundene Personen.
// Aufruf: node tests/screening.js   (BASE=… für eine andere Hub-Datei)
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
  async function kontoFertig() { await page.waitForSelector('#g-code', { timeout: 30000 }); await page.check('#g-ok'); await page.click('#g-weiter'); await page.waitForSelector('#me:not([hidden])', { timeout: 30000 }); }
  async function erstelle(name, team, pw) {
    await page.fill('#g-name', name); await page.check('input[name="g-team"][value="' + team + '"]'); await page.selectOption('#g-resp', '-');
    await page.fill('#g-pw1', pw); await page.fill('#g-pw2', pw); await page.click('#g-los'); await kontoFertig();
  }
  async function menue() { if (await page.isVisible('#me-btn')) await page.click('#me-btn'); else await page.click('#me-ava'); }
  async function abmelden() { await menue(); await page.click('[data-konto="abmelden"]'); await page.waitForSelector('#gate .konto[data-id], #g-pw', { timeout: 30000 }); }
  async function anmelden(name, pw) {
    const t = await text('#gate-card'); if (!t.includes('Wer bist du?')) { const z = await page.$('#g-zurueck'); if (z) await z.click(); }
    await page.click('#gate .konto:has-text("' + name + '")'); await page.fill('#g-pw', pw); await page.click('#g-los');
    await page.waitForSelector('#me:not([hidden])', { timeout: 30000 });
  }
  async function screeningReiter(id) { await gehe('#/'); await gehe('#/schueler/' + id); await page.waitForSelector('.ar-tabs [data-tab="screening"]', { timeout: 20000 }); await page.click('.ar-tabs [data-tab="screening"]'); await warte(200); }
  /* Bereich komplett mit einem Wert beantworten (w: 0–3, -1 = k. A.) */
  async function bereich(id, w) { await page.$$eval('#sc-b-' + id + ' input[type=radio][value="' + w + '"]', l => l.forEach(x => x.click())); }
  async function frage(id, wert) { await page.$eval('#sc-f-' + id + ' input[value="' + wert + '"]', el => el.click()); }
  async function quer() { return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); }

  await page.goto(BASE);
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); for await (const [n] of r.entries()) { await r.removeEntry(n, { recursive: true }); } localStorage.clear(); sessionStorage.clear(); });
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); await r.getFileHandle('hub.html', { create: true }); });
  await page.reload();
  await page.click('#g-ordner'); await page.waitForSelector('#g-name');

  console.log('1) Einrichten, Dossier Tom Muster (C3.1)');
  await erstelle('Mia Muster', 'diagnostique', 'ein sicheres Passwort 1');
  await gehe('#/schueler'); await page.waitForSelector('[data-ar="einrichten"]'); await page.click('[data-ar="einrichten"]');
  await page.waitForSelector('[data-ar="neu"]', { timeout: 20000 });
  const tom = await page.evaluate(async () => (await CDSE_TEAM.neuesDossier({ nachname: 'Muster', vorname: 'Tom', geschlecht: 'm', geburtsdatum: '2016-03-10', klasse: 'C3.1' }, { stelle: 'diagnostique' })).id);
  const ben = await page.evaluate(async () => (await CDSE_TEAM.neuesDossier({ nachname: 'Beispiel', vorname: 'Ben', geschlecht: 'm', geburtsdatum: '2021-05-12', klasse: 'C1.2' }, { stelle: 'diagnostique' })).id);
  check('Bogen geladen: 10 Bereiche, Stärken, Auswirkungen, Warnsignale, Quellen', await page.evaluate(() => { const b = CDSE_SCREENING_BOGEN; return b.bereiche.length === 10 && b.staerken.items.length === 8 && b.auswirkung.length === 7 && b.warnsignale.length === 8 && b.quellen.length >= 5; }));
  await screeningReiter(tom);
  check('Reiter „Screening“: Einführung, noch kein Screening, Knopf „Neues Screening“', (await text('.sc-einfuehrung')).includes('Kein Test und keine Diagnose') && (await text('.sc-einfuehrung')).includes('Noch kein Screening') && await page.isVisible('[data-sc="neu"]'));

  console.log('2) Bogen: Stufe aus der Klasse, Rolle aus dem Team, Pflichtangaben');
  await page.click('[data-sc="neu"]'); await page.waitForSelector('.sc-bogen');
  check('Stufe „Cycle 2–4“ (Klasse C3.1), Rolle Diagnostique vorgewählt', await page.inputValue('select[name="sc-stufe"]') === 'GS' && await page.inputValue('select[name="sc-rolle"]') === 'diagnostique');
  const nGS = await page.$$eval('.sc-item', l => l.length);
  check('Cycle 2–4: 68 Aussagen (60 + 8 Stärken, ohne reine C1/ES-Aussagen)', nGS === 68, nGS);
  await page.click('[data-sc="speichern"]'); await warte(300);
  check('Speichern ohne Angaben: Hinweis, fehlende Aussagen und die sechs Pflichtfragen (Dauer, Orte, Beeinträchtigung) markiert', (await page.$$('.sc-item.sc-fehlt')).length === nGS && (await page.$$('.sc-frage.sc-fehlt')).length === 6, (await page.$$('.sc-frage.sc-fehlt')).length);
  check('Beeinträchtigung: „keine Angabe“ bei den vier Fragen wählbar', (await page.$$('#sc-auswirkung input[value="ka"]')).length === 4 && !!(await page.$('#sc-f-leiden input[value="ka"]')));
  check('Datum: höchstens heute (max)', (await page.getAttribute('input[name="sc-datum"]', 'max')) === await page.evaluate(() => CDSE_ARBEIT.hilfen.heuteIso()));
  await bereich('aufmerksamkeit', 3); await bereich('unruhe', 2); await bereich('angst', 0); await bereich('stimmung', 1); await bereich('regulation', 0);
  await bereich('verhalten', 0); await bereich('sozial', -1); await bereich('lernen', 1); await bereich('sprache', 0); await bereich('koerper', 0); await bereich('staerken', 2);
  check('Stand: alle Aussagen beantwortet', (await text('#sc-stand')).startsWith(nGS + ' von ' + nGS));
  await frage('dauer', 'lang'); await frage('leiden', '2'); await frage('lernen', '3'); await frage('beziehungen', '1'); await frage('gruppe', '2'); await frage('orte', 'mehrere');
  await frage('ereignis', 'ja'); await page.fill('[data-sc-ereignis]', 'Umzug (erfunden)'); await frage('ereignis', 'nein');
  await page.fill('[data-sc-notiz]', 'Beobachtet im Unterricht und in der Pause.');
  check('Entwurf in sessionStorage (nur dieser Tab)', await page.evaluate(id => !!sessionStorage.getItem('cdse-screening-entwurf-' + id), tom));
  check('Entwurf gehört dem angemeldeten Konto', await page.evaluate(id => JSON.parse(sessionStorage.getItem('cdse-screening-entwurf-' + id)).konto === CDSE_KONTO.ich().id, tom));
  await page.click('.ar-tabs [data-tab="ueberblick"]'); await warte(200); await page.click('.ar-tabs [data-tab="screening"]'); await warte(200);
  check('Reiter wechseln: der Bogen bleibt ausgefüllt', await page.isVisible('.sc-bogen') && (await text('#sc-stand')).startsWith(nGS + ' von'));
  await page.screenshot({ path: path.join(OUT, 's1-bogen.png') });
  await page.click('[data-sc="speichern"]');
  try { await page.waitForSelector('#sc-ergebnis', { timeout: 20000 }); } catch (e) {
    console.log('DEBUG fehlt:', await page.$$eval('.sc-fehlt', l => l.map(x => x.id)), 'Toast:', await page.evaluate(() => (document.querySelector('.toast, #toast') || {}).textContent), errors);
    throw e;
  }
  await warte(200);

  console.log('3) Ergebnis');
  check('Gesamteinschätzung: „Unterstützung planen und Abklärung besprechen“', (await text('.sc-gesamt h3')) === 'Unterstützung planen und Abklärung besprechen' && (await page.getAttribute('.sc-gesamt', 'class')).includes('rot'));
  const profil = await page.$$eval('.sc-balken', l => l.map(x => [x.querySelector('.sc-bname').textContent, x.querySelector('.sc-bwert').textContent]));
  const P = Object.fromEntries(profil);
  check('Profil: Aufmerksamkeit 3,0 deutlich, Unruhe 2,0 deutlich, Stimmung 1,0 beobachten, Miteinander zu wenig Angaben, Ängste unauffällig',
    P['Aufmerksamkeit & Ausdauer'] === '3,0 · deutlich' && P['Unruhe & Impulsivität'] === '2,0 · deutlich' && P['Stimmung & Rückzug'] === '1,0 · beobachten' && P['Miteinander & Kontakt'] === '– · zu wenig Angaben' && P['Ängste & Sorgen'] === '0,0 · unauffällig', P);
  check('Stärken: 2,0 · viele', (await text('.sc-staerken .sc-bwert')).trim() === '2,0 · viele');
  const schritte = await page.$$eval('.sc-schritt h3', l => l.map(x => x.textContent.trim()));
  check('Nächste Schritte: erst die deutlichen, dann die zu beobachtenden Bereiche', schritte[0] === 'Aufmerksamkeit & Ausdauer' && schritte[1] === 'Unruhe & Impulsivität' && schritte.includes('Stimmung & Rückzug'), schritte);
  check('Bei deutlichen Bereichen: „Abklären“ und ELDiB-Ziele', (await text('.sc-schritt')).includes('Abklären:') && (await page.$$('.sc-schritt .sc-code')).length >= 5);
  check('Was beobachtet wurde: „sehr oft“ und Stärken', (await text('.sc-beob')).includes('sehr oft') && await page.isVisible('.sc-beob-staerken'));
  check('Hinweis „kein Test, keine Diagnose, nicht genormt“ und Quellen', (await text('.sc-kopf')).includes('kein Test und keine Diagnose') && (await page.$$('.sc-quellen li')).length >= 5);
  check('Weitere (gelbe) Bereiche eingeklappt: „Weitere Bereiche zum Beobachten (2)“', !!(await page.$('#sc-ergebnis details.sc-weitere:not([open])')) && /Weitere Bereiche zum Beobachten \(2\).*Stimmung & Rückzug/.test(await text('#sc-ergebnis details.sc-weitere summary')));
  check('ELDiB-Ziele mit Stichwort, wenn die ELDiB geladen ist', await page.evaluate(() => typeof ELDIB_BANK === 'undefined' || !!document.querySelector('#sc-ergebnis .sc-eldib .sc-code-text')));
  check('Ereignis „nein“: der vorher getippte Text erscheint nicht', !(await text('#sc-ergebnis')).includes('Umzug (erfunden)'));
  await page.locator('#sc-ergebnis').screenshot({ path: path.join(OUT, 's2-ergebnis.png') });
  const gesp = await page.evaluate(async id => { const d = await CDSE_TEAM.dossier(id, true); return { s: d.screenings, v: d.verlauf.map(x => x.t) }; }, tom);
  check('Gespeichert im Dossier: Antworten, Auswirkungen, Kurzfassung, Protokoll', gesp.s.length === 1 && gesp.s[0].antworten.a1 === 3 && gesp.s[0].antworten.m1 === -1 && gesp.s[0].auswirkung.dauer === 'lang' && gesp.s[0].kurz.gesamt === 'planen' && gesp.s[0].kurz.bereiche.aufmerksamkeit.stufe === 'rot' && gesp.v.some(t => /^Screening vom/.test(t)), gesp.s[0] && gesp.s[0].kurz);
  check('Nicht gespeichert: Ereignis-Text bei „nein“, Warnsignal-Notiz ohne Warnsignal', !('ereignisText' in gesp.s[0].auswirkung) && gesp.s[0].warnNotiz === '', gesp.s[0].auswirkung);
  check('Entwurf danach gelöscht', await page.evaluate(id => !sessionStorage.getItem('cdse-screening-entwurf-' + id), tom));
  const roh = await page.evaluate(async id => { const r = await navigator.storage.getDirectory(); const g = await (await r.getDirectoryHandle('gemeinsam')).getDirectoryHandle('schueler'); return await (await (await g.getFileHandle(id + '.cdse')).getFile()).text(); }, tom);
  check('Dossier-Datei bleibt verschlüsselt (keine Antworten im Klartext)', roh.includes('cdse-dossier') && !roh.includes('screenings') && !roh.includes('Unterricht und in der Pause'));

  console.log('4) Zweites Screening mit Warnsignal (andere Person) und Vergleich');
  await page.evaluate(async id => {
    const B = CDSE_SCREENING_BOGEN, a = {};
    B.bereiche.forEach(b => CDSE_SCREENING.items(b, 'GS').forEach(i => { a[i.id] = b.id === 'stimmung' ? 3 : (b.id === 'aufmerksamkeit' ? 1 : 0); }));
    CDSE_SCREENING.items(B.staerken, 'GS').forEach(i => { a[i.id] = 1; });
    const s = { datum: '2026-09-24', stufe: 'GS', rolle: 'lehrkraft', version: 1, antworten: a, auswirkung: { dauer: 'mittel', leiden: '3', lernen: '1', beziehungen: '2', gruppe: '0', orte: 'mehrere', ereignis: 'ja', ereignisText: 'Trennung der Eltern' }, warn: ['suizid'], warnNotiz: '„Ich will nicht mehr da sein.“ (23.09.)', notiz: '' };
    s.kurz = CDSE_SCREENING.kurz(s);
    await CDSE_TEAM.ops.screening(id, s);
  }, tom);
  await screeningReiter(tom);
  check('Liste: Warnsignal-Hinweis oben, zwei Einträge', await page.isVisible('.sc-warn-banner') && (await page.$$('.sc-eintrag')).length === 2);
  check('Vergleich: Tabelle mit beiden Einschätzungen, Hinweis auf unterschiedliche Wahrnehmung', await page.isVisible('.sc-vergleich') && (await text('.sc-hinweis')).includes('Aufmerksamkeit & Ausdauer') && (await text('.sc-hinweis')).includes('Stimmung & Rückzug'));
  await page.locator('#ar-dossier').screenshot({ path: path.join(OUT, 's3-liste.png') });
  await page.click('.sc-eintrag:has-text("24.09.2026")'); await page.waitForSelector('#sc-ergebnis');
  check('Warnsignal: „Heute handeln“ mit Schritten, Hilfenummern und wörtlicher Notiz', (await text('.sc-gesamt h3')) === 'Heute handeln' && (await text('.sc-warn')).includes('116 111') && (await text('.sc-warn')).includes('„Ich will nicht mehr da sein.“'));
  check('Belastendes Ereignis wird im Ergebnis genannt', (await text('#sc-ergebnis')).includes('Trennung der Eltern'));

  console.log('5) Stufe C1: andere Texte, keine Schul-Aussagen; Entwurf einer anderen Person');
  /* Entwurf einer anderen Person im selben Tab (z. B. vor dem Abmelden liegen geblieben): nie anzeigen */
  await page.evaluate(id => sessionStorage.setItem('cdse-screening-entwurf-' + id, JSON.stringify({ konto: 'fremdes-konto', e: { datum: '2026-09-01', stufe: 'C1', rolle: 'lehrkraft', antworten: { a1: 3 }, auswirkung: {}, warn: ['gefahr'], warnNotiz: 'FREMD-NOTIZ (erfunden)', notiz: '' } })), ben);
  await screeningReiter(ben); await page.click('[data-sc="neu"]'); await page.waitForSelector('.sc-bogen');
  check('Fremder Entwurf: nicht angezeigt, nicht übernommen, gelöscht', !(await text('.sc-bogen')).includes('FREMD-NOTIZ') && !(await page.$('#sc-i-a1 input:checked')) && await page.evaluate(id => { const x = JSON.parse(sessionStorage.getItem('cdse-screening-entwurf-' + id) || 'null'); return !x || x.konto === CDSE_KONTO.ich().id; }, ben));
  check('Ben (C1.2): Stufe C1 vorgewählt, C1-Text bei a1, ohne v7/l5/l7', await page.inputValue('select[name="sc-stufe"]') === 'C1' && (await text('#sc-i-a1')).includes('Bleibt nur kurz bei einem Spiel') && !(await page.$('#sc-i-v7')) && !(await page.$('#sc-i-l5')) && !(await page.$('#sc-i-l7')));
  await page.$eval('#sc-i-g6 input[value="2"]', el => el.click()); await page.$eval('#sc-i-a2 input[value="1"]', el => el.click());
  await page.selectOption('select[name="sc-stufe"]', 'ES'); await warte(300);
  check('Stufe wechseln (ES): Texte und Aussagen passen sich an (l7, Warnsignal Sucht)', !!(await page.$('#sc-i-l7')) && (await text('#sc-warnsignale')).includes('Alkohol') && !(await page.$('#sc-i-k1')));
  check('Stufe wechseln: g6 (dort anderer Text) entfernt und markiert, a2 bleibt; Hinweis in einer Zeile', !(await page.$('#sc-i-g6 input:checked')) && !!(await page.$('#sc-i-g6.sc-fehlt')) && !!(await page.$('#sc-i-a2 input[value="1"]:checked')) &&
    (await text('.sc-stufehinweis')).includes('Stufe gewechselt: 1 Antwort passte nicht zur neuen Stufe und wurde entfernt'), await text('.sc-stufehinweis').catch(() => ''));
  await page.click('[data-sc="abbrechen"]'); await page.waitForSelector('dialog.ar-dialog'); await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Verwerfen")'); await warte(300);
  check('Abbrechen: zurück zur Liste', await page.isVisible('.sc-einfuehrung') && !(await page.$('.sc-bogen')));
  check('CDSE_SCREENING.vergessen() (Abmelden/Sperren): alle Entwürfe weg', await page.evaluate(ids => { ids.forEach(id => sessionStorage.setItem('cdse-screening-entwurf-' + id, JSON.stringify({ konto: CDSE_KONTO.ich().id, e: { stufe: 'GS', antworten: {}, auswirkung: {}, warn: [] } }))); CDSE_SCREENING.vergessen(); return !Object.keys(sessionStorage).some(k => k.indexOf('cdse-screening-entwurf-') === 0); }, [tom, ben]));

  console.log('6) Löschen');
  await screeningReiter(tom);
  await page.click('.sc-eintrag:has-text("24.09.2026")'); await page.waitForSelector('#sc-ergebnis');
  await page.evaluate(() => { window.__r = CDSE_TEAM.rechte; CDSE_TEAM.rechte = d => Object.assign({}, window.__r(d), { bearbeiten: false, weitergeben: false }); CDSE_ARBEIT.hilfen.dossierZeichnen(CDSE_ARBEIT.hilfen.aktDossier()); }); await warte(200);
  check('Ohne Schreibrecht kein „Löschen“ – auch nicht beim eigenen Screening', await page.isVisible('#sc-ergebnis') && !(await page.$('[data-sc="loeschen"]')));
  await page.evaluate(() => { CDSE_TEAM.rechte = window.__r; CDSE_ARBEIT.hilfen.dossierZeichnen(CDSE_ARBEIT.hilfen.aktDossier()); }); await warte(200);
  await page.click('[data-sc="loeschen"]'); await page.waitForSelector('dialog.ar-dialog'); await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Löschen")');
  await page.waitForFunction(() => !document.querySelector('dialog.ar-dialog'), null, { timeout: 20000 }); await warte(300);
  check('Screening gelöscht, Protokoll vermerkt es', (await page.$$('.sc-eintrag')).length === 1 && (await page.evaluate(async id => (await CDSE_TEAM.dossier(id, true)).verlauf.map(x => x.t).join('|'), tom)).includes('Screening vom 2026-09-24 gelöscht'));

  console.log('7) Übersicht #/screening, leerer Bogen, Datenbank');
  check('Menüpunkt „Screening“', await page.isVisible('#nav a[href="#/screening"]'));
  await gehe('#/screening'); await page.waitForSelector('.sc-ub-tab', { timeout: 20000 });
  const zahlen = await page.$$eval('.sc-ub-zahl b', l => l.map(x => x.textContent));
  check('Übersicht: 2 aktive Schüler, 1 mit Handlungsbedarf, 1 ohne Screening', zahlen.join('|') === '0|1|1|2', zahlen);
  const zeilen = await page.$$eval('.sc-ub-tab .ar-zeile:not(.kopf)', l => l.map(x => x.textContent.replace(/\s+/g, ' ')));
  check('Tom oben mit „Unterstützung planen“ und deutlichen Bereichen, Ben „noch keins“', /MUSTER Tom.*Unterstützung planen.*Aufmerksamkeit & Ausdauer/.test(zeilen[0]) && /BEISPIEL Ben.*noch keins/.test(zeilen[1]), zeilen);
  await page.click('[data-scu="filter"][data-wert="ohne"]'); await warte(150);
  check('Filter „Ohne Screening“: nur Ben', (await page.$$('.sc-ub-tab .ar-zeile:not(.kopf)')).length === 1 && (await text('.sc-ub-tab')).includes('BEISPIEL Ben'));
  await page.click('[data-scu="neu"][data-id="' + ben + '"]'); await page.waitForSelector('.sc-bogen', { timeout: 20000 });
  check('„Screening“ in der Übersicht öffnet direkt den Bogen im Dossier', (await text('.ar-dkopf h1')).includes('BEISPIEL Ben') && await page.isVisible('.ar-tabs [data-tab="screening"].on'));
  await page.click('[data-sc="abbrechen"]'); await warte(200);
  await gehe('#/screening'); await page.waitForSelector('.sc-ub-tab');
  const [druck] = await Promise.all([ctx.waitForEvent('page'), (async () => { await page.click('[data-scu="leer"]'); await page.waitForSelector('dialog.ar-dialog'); await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Cycle 2–4")'); })()]);
  await druck.waitForLoadState('load'); const leer = await druck.content();
  check('Leerer Bogen (Cycle 2–4): alle Aussagen mit Ankreuzfeldern, Warnsignale, Hinweis „keine Diagnose“', (leer.match(/<tr><td>/g) || []).length >= 68 && leer.includes('Warnsignale') && leer.includes('kein Test und keine Diagnose'));
  await druck.close();
  const ds = await page.evaluate(async id => CDSE_DATENBANK.datensatz(await CDSE_TEAM.dossier(id, true)), tom);
  check('Datenbank: letztes Screening, Einschätzung, deutliche Bereiche, Warnsignal', ds.screeningDatum && ds.screeningStand === 'Unterstützung planen' && ds.screeningDeutlich.join() === 'Aufmerksamkeit & Ausdauer,Unruhe & Impulsivität' && ds.screeningWarn === 'nein', ds);

  console.log('7b) Warnsignal älter als drei Monate: „Warnsignal am …“ statt „Heute handeln“');
  const vor200 = await page.evaluate(() => { const t = new Date(Date.now() - 200 * 864e5); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); });
  await page.evaluate(async ([id, datum]) => {
    const B = CDSE_SCREENING_BOGEN, a = {};
    B.bereiche.forEach(b => CDSE_SCREENING.items(b, 'C1').forEach(i => { a[i.id] = 0; }));
    CDSE_SCREENING.items(B.staerken, 'C1').forEach(i => { a[i.id] = 2; });
    const s = { datum, stufe: 'C1', rolle: 'lehrkraft', version: 1, antworten: a, auswirkung: { dauer: 'lang', leiden: '0', lernen: '0', beziehungen: '0', gruppe: '0', orte: 'mehrere', ereignis: 'nein' }, warn: ['gefahr'], warnNotiz: '', notiz: '' };
    s.kurz = CDSE_SCREENING.kurz(s);
    await CDSE_TEAM.ops.screening(id, s);
  }, [ben, vor200]);
  await gehe('#/'); await gehe('#/screening'); await page.waitForSelector('[data-scu="filter"][data-wert="alle"]');
  /* vorher stand der Filter „Ohne Screening“ – Ben hat jetzt eins, die Liste wäre leer */
  await page.click('[data-scu="filter"][data-wert="alle"]'); await page.waitForSelector('.sc-ub-tab'); await warte(150);
  const zeileBen = (await page.$$eval('.sc-ub-tab .ar-zeile:not(.kopf)', l => l.map(x => x.textContent.replace(/\s+/g, ' ')))).find(t => /BEISPIEL Ben/.test(t)) || '';
  check('Übersicht: Ben „Warnsignal am …“ (grau) und die Einschätzung ohne Warnsignal, kein „Heute handeln“', zeileBen.includes('Warnsignal am ' + vor200.split('-').reverse().join('.')) && zeileBen.includes('Unauffällig') && !zeileBen.includes('Heute handeln'), zeileBen);
  const zahlen2 = await page.$$eval('.sc-ub-zahl b', l => l.map(x => x.textContent));
  check('Zählt nicht als „Warnsignal (3 Monate)“', zahlen2[0] === '0', zahlen2);

  console.log('8) Handy (390 px)');
  await page.setViewportSize({ width: 390, height: 844 }); await warte(300);
  await gehe('#/screening'); await page.waitForSelector('.sc-ub-tab'); await warte(200);
  let q0 = await quer(); check('390 px: Übersicht ohne waagrechtes Scrollen', q0 <= 1, q0);
  await screeningReiter(tom);
  await page.click('.sc-eintrag'); await page.waitForSelector('#sc-ergebnis'); await warte(200);
  let q = await quer(); check('390 px: Ergebnis ohne waagrechtes Scrollen', q <= 1, q);
  await page.click('[data-sc="liste"]'); await warte(200); await page.click('[data-sc="neu"]'); await page.waitForSelector('.sc-bogen'); await warte(200);
  q = await quer(); check('390 px: Bogen ohne waagrechtes Scrollen, Skala über die ganze Breite', q <= 1 && await page.evaluate(() => { const s = document.querySelector('.sc-skala'); return s.getBoundingClientRect().width > 300; }), q);
  await page.screenshot({ path: path.join(OUT, 's4-mobil.png') });
  await page.setViewportSize({ width: 1280, height: 900 });

  check('Keine Fehler in der Konsole', errors.length === 0, errors.slice(0, 5).join(' | '));
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler  (' + Math.round((Date.now() - t0) / 1000) + ' s, Bilder in ' + OUT + ')');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
