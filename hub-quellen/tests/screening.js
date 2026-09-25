// Test: Screening im Schülerdossier – Bogen je Stufe, Pflichtangaben, Auswertung (Ampel, Gesamteinschätzung,
// nächste Schritte), Speichern verschlüsselt im Dossier, Warnsignale, Vergleich zweier Beobachtender, Entwurf,
// Löschen, 390 px. Nur erfundene Personen.
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
  check('Speichern ohne Angaben: Hinweis, fehlende Aussagen markiert', (await page.$$('.sc-item.sc-fehlt')).length === nGS && (await page.$$('.sc-frage.sc-fehlt')).length === 2);
  await bereich('aufmerksamkeit', 3); await bereich('unruhe', 2); await bereich('angst', 0); await bereich('stimmung', 1); await bereich('regulation', 0);
  await bereich('verhalten', 0); await bereich('sozial', -1); await bereich('lernen', 1); await bereich('sprache', 0); await bereich('koerper', 0); await bereich('staerken', 2);
  check('Stand: alle Aussagen beantwortet', (await text('#sc-stand')).startsWith(nGS + ' von ' + nGS));
  await frage('dauer', 'lang'); await frage('leiden', '2'); await frage('lernen', '3'); await frage('beziehungen', '1'); await frage('gruppe', '2'); await frage('orte', 'mehrere'); await frage('ereignis', 'nein');
  await page.fill('[data-sc-notiz]', 'Beobachtet im Unterricht und in der Pause.');
  check('Entwurf in sessionStorage (nur dieser Tab)', await page.evaluate(id => !!sessionStorage.getItem('cdse-screening-entwurf-' + id), tom));
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
  await page.locator('#sc-ergebnis').screenshot({ path: path.join(OUT, 's2-ergebnis.png') });
  const gesp = await page.evaluate(async id => { const d = await CDSE_TEAM.dossier(id, true); return { s: d.screenings, v: d.verlauf.map(x => x.t) }; }, tom);
  check('Gespeichert im Dossier: Antworten, Auswirkungen, Kurzfassung, Protokoll', gesp.s.length === 1 && gesp.s[0].antworten.a1 === 3 && gesp.s[0].antworten.m1 === -1 && gesp.s[0].auswirkung.dauer === 'lang' && gesp.s[0].kurz.gesamt === 'planen' && gesp.s[0].kurz.bereiche.aufmerksamkeit.stufe === 'rot' && gesp.v.some(t => /^Screening vom/.test(t)), gesp.s[0] && gesp.s[0].kurz);
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

  console.log('5) Stufe C1: andere Texte, keine Schul-Aussagen');
  await screeningReiter(ben); await page.click('[data-sc="neu"]'); await page.waitForSelector('.sc-bogen');
  check('Ben (C1.2): Stufe C1 vorgewählt, C1-Text bei a1, ohne v7/l5/l7', await page.inputValue('select[name="sc-stufe"]') === 'C1' && (await text('#sc-i-a1')).includes('Bleibt nur kurz bei einem Spiel') && !(await page.$('#sc-i-v7')) && !(await page.$('#sc-i-l5')) && !(await page.$('#sc-i-l7')));
  await page.selectOption('select[name="sc-stufe"]', 'ES'); await warte(300);
  check('Stufe wechseln (ES): Texte und Aussagen passen sich an (l7, Warnsignal Sucht)', !!(await page.$('#sc-i-l7')) && (await text('#sc-warnsignale')).includes('Alkohol') && !(await page.$('#sc-i-k1')));
  await page.click('[data-sc="abbrechen"]'); await warte(300);
  check('Abbrechen: zurück zur Liste', await page.isVisible('.sc-einfuehrung') && !(await page.$('.sc-bogen')));

  console.log('6) Löschen');
  await screeningReiter(tom);
  await page.click('.sc-eintrag:has-text("24.09.2026")'); await page.waitForSelector('#sc-ergebnis');
  await page.click('[data-sc="loeschen"]'); await page.waitForSelector('dialog.ar-dialog'); await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Löschen")');
  await page.waitForFunction(() => !document.querySelector('dialog.ar-dialog'), null, { timeout: 20000 }); await warte(300);
  check('Screening gelöscht, Protokoll vermerkt es', (await page.$$('.sc-eintrag')).length === 1 && (await page.evaluate(async id => (await CDSE_TEAM.dossier(id, true)).verlauf.map(x => x.t).join('|'), tom)).includes('Screening vom 2026-09-24 gelöscht'));

  console.log('7) Handy (390 px)');
  await page.setViewportSize({ width: 390, height: 844 }); await warte(300);
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
