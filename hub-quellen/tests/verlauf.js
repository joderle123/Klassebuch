// Test: Verlauf auf einen Blick – Zeitachse im Reiter „Profil & Verlauf“ (Bahnen für Tageskarte, Vorfälle,
// Screening, Gespräche), Maßnahmen als nummerierte Linien mit Legende (Fokusziele, Tageskarte, Überprüfung,
// Arztbrief mit Medikation), Zeitraum 3/6/12 Monate, Vorher-nachher-Vergleich, Zeile im Überblick mit
// Sprung zum Verlauf, leerer Zustand, 390 px. Nur erfundene Personen.
// Aufruf: node tests/verlauf.js   (BASE=… für eine andere Hub-Datei)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8099/hub.html';
const OUT = path.join(__dirname, 'verlauf-aus'); fs.mkdirSync(OUT, { recursive: true });
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
  async function reiter(id, tab) { await gehe('#/'); await gehe('#/schueler/' + id); await page.waitForSelector('.ar-tabs [data-tab="' + tab + '"]', { timeout: 20000 }); await page.click('.ar-tabs [data-tab="' + tab + '"]'); await warte(300); }
  async function quer() { return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); }
  const tag = n => { const d = new Date(Date.now() + n * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  await page.goto(BASE);
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); for await (const [n] of r.entries()) { await r.removeEntry(n, { recursive: true }); } localStorage.clear(); sessionStorage.clear(); });
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); await r.getFileHandle('hub.html', { create: true }); });
  await page.reload();
  await page.click('#g-ordner'); await page.waitForSelector('#g-name');

  console.log('1) Tom: Vorfälle, Tageskarte, Screenings, Gespräch, Arztbrief mit Medikation, Überprüfung');
  await erstelle('Mia Muster', 'diagnostique', 'ein sicheres Passwort 1');
  await gehe('#/schueler'); await page.waitForSelector('[data-ar="einrichten"]'); await page.click('[data-ar="einrichten"]');
  await page.waitForSelector('[data-ar="neu"]', { timeout: 20000 });
  const { tom, ben } = await page.evaluate(async t => {
    const T = CDSE_TEAM, B = ELDIB_BANK.bereiche;
    const id = (await T.neuesDossier({ nachname: 'Muster', vorname: 'Tom', geschlecht: 'm', geburtsdatum: '2014-05-05', klasse: 'C4.1' }, { stelle: 'annexe' })).id;
    const ben = (await T.neuesDossier({ nachname: 'Probe', vorname: 'Ben', geschlecht: 'm', geburtsdatum: '2013-02-02', klasse: 'C3.2' }, { stelle: 'annexe' })).id;
    const alle = (b, s) => B[b].stufen[s].items.map(i => i.code);
    const ziele = [alle('verhalten', 2)[0], alle('verhalten', 2)[1]];
    await T.ops.profil(id, { quelle: 'eldib', datum: t.m90, ds: { v: 2, f: {}, frei: {}, tabellen: {}, chips: { diagnosen: ['adhs'] }, bewertungen: { s_konz: 2 } }, eldib: { v: 2, datum: t.m90, erreicht: alle('verhalten', 1), ziele } }, 'Test-Profil');
    await T.ops.planFokus(id, ziele);
    for (const [dt, schwere] of [[t.m40, 'mittel'], [t.m35, 'schwer'], [t.m30, 'mittel'], [t.m25, 'leicht'], [t.m10, 'leicht']]) {
      await T.ops.eintrag(id, { datum: dt, art: 'vorfall', titel: 'Vorfall', text: 'Streit in der Pause.', vorfall: { zeit: '10:00', situation: 'Pause', timeoutVon: '10:05', timeoutBis: '10:15', schwere } });
    }
    await T.ops.eintrag(id, { datum: t.m7, art: 'gespraech_eltern', titel: 'Elterngespräch', text: 'Rückmeldung zur Tageskarte.' });
    await T.ops.eintrag(id, { datum: t.m4, art: 'beobachtung', titel: 'Beobachtung', text: 'Wartet in der Schlange.', ziel: ziele[0] });
    await T.ops.tageskarte(id, { ziele: [{ id: '', code: ziele[0], text: 'Ich warte, bis ich dran bin.' }], abschnitte: ['Morgen', 'Pause', 'Vormittag', 'Mittag', 'Nachmittag'], ziel: 80, belohnung: '', heim: true });
    const d0 = await T.dossier(id), zid = d0.tageskarte.ziele[0].id;
    for (let n = 12; n >= 0; n--) { const dt = new Date(Date.now() - n * 864e5), s = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0'); await T.ops.tageskarteTag(id, s, { p: { [zid]: n > 6 ? [1, 0, 1, 1, 0] : [2, 2, 1, 2, 2] }, s: 'gut' }); }
    const bog = CDSE_SCREENING_BOGEN, an = (wert) => { const a = {}; bog.bereiche.forEach((b, i) => b.items.forEach(x => { a[x.id] = i === 0 ? wert : 0; })); bog.staerken.items.forEach(x => { a[x.id] = 2; }); return a; };
    await T.ops.screening(id, { datum: t.m120, stufe: 'GS', rolle: 'educ', version: 1, antworten: an(3), auswirkung: { dauer: 'lang', leiden: '2', lernen: '2', beziehungen: '1', gruppe: '1', orte: 'mehrere', ereignis: 'nein' }, warn: [], notiz: '' });
    await T.ops.screening(id, { datum: t.m5, stufe: 'GS', rolle: 'educ', version: 1, antworten: an(1), auswirkung: { dauer: 'lang', leiden: '1', lernen: '1', beziehungen: '0', gruppe: '0', orte: 'mehrere', ereignis: 'nein' }, warn: [], notiz: '' });
    await T.ops.bericht(id, { art: 'arztbrief', titel: 'Arztbrief', von: 'Kinderpsychiatrie', datum: t.m20, text: 'Test', profile: [], medikamente: [{ name: 'Methylphenidat', dosis: '10 mg', beleg: 'Test' }], empfehlungen: [], schritte: [] });
    await T.ops.planUeberpruefung(id, { datum: t.m3, notiz: 'Warten klappt besser.', kennzahlen: {} });
    return { tom: id, ben };
  }, { m120: tag(-120), m90: tag(-90), m40: tag(-40), m35: tag(-35), m30: tag(-30), m25: tag(-25), m20: tag(-20), m10: tag(-10), m7: tag(-7), m5: tag(-5), m4: tag(-4), m3: tag(-3) });

  await reiter(tom, 'profil');
  await page.waitForSelector('#vl-karte');
  check('Reiter „Profil & Verlauf“ beginnt mit „Verlauf auf einen Blick“', (await page.$eval('#ar-tabinhalt > *', el => el.id)) === 'vl-karte' && (await text('#vl-karte h2')) === 'Verlauf auf einen Blick');
  const bahnen = await page.$$eval('#vl-karte .vl-titel', l => l.map(x => x.textContent));
  check('Bahnen: Tageskarte, Vorfälle, Screening, Gespräche', bahnen.join('|') === 'Tageskarte|Vorfälle|Screening|Gespräche', bahnen);
  check('Tageskarte: 13 Tage als Punkte, Tagesziel gestrichelt, Wochenschnitt als Linie', (await page.$$('#vl-karte circle.vl-gut, #vl-karte circle.vl-knapp')).length === 13 && !!(await page.$('#vl-karte .vl-ziel')) && !!(await page.$('#vl-karte polyline.vl-linie:not(.vl-sc)')));
  const balken = await page.$$eval('#vl-karte rect.vl-vorfall, #vl-karte rect.vl-schwer', l => l.map(x => x.getAttribute('class') + ':' + x.textContent));
  check('Vorfälle: Balken je Woche, schwere Woche rot, Time-out im Tooltip', balken.length >= 4 && balken.some(b => b.startsWith('vl-schwer')) && balken.some(b => b.includes('Min. Time-out')), balken);
  check('3 Monate: nur das Screening der letzten Woche (das von vor 120 Tagen fehlt)', (await page.$$('#vl-karte path[class^="vl-sc"]')).length === 1);
  const leg = await page.$$eval('#vl-karte .vl-legende li', l => l.map(x => x.textContent));
  check('Legende der Maßnahmen: Fokusziele, Tageskarte, Arztbrief mit Medikation, Überprüfung', leg.some(x => x.includes('Fokusziele')) && leg.some(x => x.includes('Tageskarte eingerichtet')) && leg.some(x => x.includes('Medikation: Methylphenidat')) && leg.some(x => x.includes('Überprüfung')), leg);
  check('Nummern in der Grafik passen zur Legende', (await page.$$('#vl-karte .vl-nr')).length === leg.length);
  const vgl = await text('#vl-karte .vl-vergleich');
  check('Vorher – nachher: Maßnahmen von heute „noch zu früh“', vgl.includes('noch zu früh'), vgl.slice(0, 200));
  check('Vorher – nachher: Medikation (vor 20 Tagen) mit Vorfällen pro Woche', vgl.includes('Medikation: Methylphenidat') && vgl.includes('Vorfälle pro Woche'), vgl.slice(0, 400));
  check('Hinweis: Richtung, kein Beweis', vgl.includes('keinen Beweis'));
  await page.screenshot({ path: path.join(OUT, 'v1-verlauf.png'), clip: await page.$eval('#vl-karte', el => { const r = el.getBoundingClientRect(); return { x: r.x - 8, y: r.y - 8, width: r.width + 16, height: r.height + 16 }; }) });

  console.log('2) Vergleich rechnet richtig (Fokusziele vor 21 Tagen)');
  const erg = await page.evaluate(() => {
    const d = JSON.parse(JSON.stringify(CDSE_ARBEIT.hilfen.aktDossier()));
    const vor21 = new Date(Date.now() - 21 * 864e5).toISOString();
    d.verlauf.forEach(v => { if (/^Begleitplan: Fokusziele/.test(v.t)) v.z = vor21; });
    const f = CDSE_VERLAUF.vergleich(d).filter(x => /^Fokusziele/.test(x.m.text))[0];
    return f ? { tage: f.tage, zeilen: f.zeilen.map(z => [z.was, Math.round(z.vor * 100) / 100, Math.round(z.nach * 100) / 100, z.besser]) } : null;
  });
  const vf = erg && erg.zeilen.filter(z => z[0] === 'Vorfälle pro Woche')[0];
  check('Vorfälle pro Woche: 4 in den vier Wochen davor (1,0) → 1 in drei Wochen danach (0,33), günstiger', !!vf && vf[1] === 1 && vf[2] === 0.33 && vf[3] === true, erg);
  const to = erg && erg.zeilen.filter(z => z[0] === 'Time-out (Min. pro Woche)')[0];
  check('Time-out pro Woche: 40 Min. in vier Wochen (10) → 10 Min. in drei Wochen (3,33)', !!to && to[1] === 10 && to[2] === 3.33, to);

  console.log('3) Zeitraum, Überblick, leerer Zustand');
  await page.click('#vl-karte [data-vl="182"]'); await warte(250);
  check('6 Monate: Knopf aktiv, beide Screenings sichtbar', (await page.getAttribute('#vl-karte [data-vl="182"]', 'aria-pressed')) === 'true' && (await page.$$('#vl-karte path[class^="vl-sc"]')).length === 2);
  await page.click('.ar-tabs [data-tab="ueberblick"]'); await warte(250);
  check('Überblick: „Vorfälle: 2 in den letzten vier Wochen (davor 3)“', (await text('.bp-kurzkarte')).includes('Vorfälle: 2 in den letzten vier Wochen (davor 3)'), await text('.bp-kurzkarte'));
  await page.click('.bp-kurzkarte [data-tab="profil"]'); await warte(300);
  check('„Verlauf ansehen“ öffnet „Profil & Verlauf“', (await page.getAttribute('.ar-tabs [data-tab="profil"]', 'aria-selected')) === 'true' && !!(await page.$('#vl-karte')));
  await reiter(ben, 'profil');
  check('Ohne Daten: freundlicher leerer Zustand, keine Grafik', (await text('#vl-karte')).includes('noch keine Daten') && !(await page.$('#vl-karte svg')));

  console.log('4) Schmal');
  await page.setViewportSize({ width: 390, height: 844 });
  await reiter(tom, 'profil'); await page.waitForSelector('#vl-karte svg');
  check('390 px: Seite ohne seitliches Scrollen', (await quer()) <= 1, await quer());
  check('390 px: Grafik lässt sich im Rahmen wischen (lesbar statt winzig)', await page.$eval('#vl-karte .vl-rahmen', el => el.scrollWidth > el.clientWidth));
  await page.screenshot({ path: path.join(OUT, 'v2-schmal.png') });

  check('Keine Fehler in der Konsole', errors.length === 0, errors);
  await browser.close();
  console.log('\n' + ok + ' bestanden, ' + bad + ' fehlgeschlagen (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
