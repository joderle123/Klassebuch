// Test: Screening aus dem DS vorausfüllen – gleichbedeutende DS-Aussagen sind im neuen Bogen schon
// beantwortet (markiert „DS“), Umrechnung 1–7 → nie/manchmal/oft/sehr oft, Sicht der Eltern bei der
// Rolle „Eltern“, eigene Änderungen zählen als eigene Antwort, „Ohne DS-Vorschläge“, älterer DS nur
// auf Wunsch, Speichern mit Vermerk. Nur erfundene Personen.
// Aufruf: node tests/screening-ds.js   (BASE=… für eine andere Hub-Datei)
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
  let rueckfragen = 0;
  page.on('dialog', d => { rueckfragen++; d.accept(); });
  const warte = ms => page.waitForTimeout(ms);
  const text = sel => page.textContent(sel);
  async function gehe(hash) { await page.evaluate(h => { location.hash = h; }, hash); await warte(400); }
  async function kontoFertig() { await page.waitForSelector('#g-code', { timeout: 30000 }); await page.check('#g-ok'); await page.click('#g-weiter'); await page.waitForSelector('#me:not([hidden])', { timeout: 30000 }); }
  async function erstelle(name, team, pw) {
    await page.fill('#g-name', name); await page.check('input[name="g-team"][value="' + team + '"]'); await page.selectOption('#g-resp', '-');
    await page.fill('#g-pw1', pw); await page.fill('#g-pw2', pw); await page.click('#g-los'); await kontoFertig();
  }
  async function screeningReiter(id) { await gehe('#/'); await gehe('#/schueler/' + id); await page.waitForSelector('.ar-tabs [data-tab="screening"]', { timeout: 20000 }); await page.click('.ar-tabs [data-tab="screening"]'); await warte(200); }
  async function wert(id) { return page.evaluate(i => { const x = document.querySelector('input[name="sc-' + i + '"]:checked'); return x ? +x.value : null; }, id); }
  async function werte(ids) { const o = {}; for (const i of ids) o[i] = await wert(i); return o; }
  async function bereich(id, w) { await page.$$eval('#sc-b-' + id + ' input[type=radio][value="' + w + '"]', l => l.forEach(x => { if (!document.querySelector('input[name="' + x.name + '"]:checked')) x.click(); })); }
  async function frage(id, wert) { await page.$eval('#sc-f-' + id + ' input[value="' + wert + '"]', el => el.click()); }
  async function quer() { return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); }
  const tage = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

  await page.goto(BASE);
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); for await (const [n] of r.entries()) { await r.removeEntry(n, { recursive: true }); } localStorage.clear(); sessionStorage.clear(); });
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); await r.getFileHandle('hub.html', { create: true }); });
  await page.reload();
  await page.click('#g-ordner'); await page.waitForSelector('#g-name');

  console.log('1) Einrichten: Lea Beispiel mit frischem DS, Ben Probe mit älterem DS');
  await erstelle('Mia Muster', 'diagnostique', 'ein sicheres Passwort 1');
  await gehe('#/schueler'); await page.waitForSelector('[data-ar="einrichten"]'); await page.click('[data-ar="einrichten"]');
  await page.waitForSelector('[data-ar="neu"]', { timeout: 20000 });
  const DS = {
    v: 2, f: {}, frei: {}, tabellen: {},
    chips: { ereignisse: ['trennung', 'umzug'], diagnosen: ['adhs'] },
    bewertungen: {
      s_konz: 2, b_konz: 3, b_ablenk: 7, s_selbst: 4, b_start: 1, s_unruhe: 7, b_unruhe: 5, s_wut: 6, s_frust: 2,
      s_regeln: 6, s_peers: 5, k_freunde: 7, k_selbstwert: 2, k_druck: 6, e_wut: 7, e_rueckzug: 2, s_aggr: 6
    }
  };
  const ids = await page.evaluate(async ([ds, alt]) => {
    const T = CDSE_TEAM;
    const lea = await T.neuesDossier({ nachname: 'Beispiel', vorname: 'Lea', geschlecht: 'w', geburtsdatum: '2015-06-02', klasse: 'C4.1' }, { stelle: 'diagnostique' });
    await T.ops.profil(lea.id, { quelle: 'eldib', datum: new Date().toISOString().slice(0, 10), ds: ds }, 'Test-DS');
    const ben = await T.neuesDossier({ nachname: 'Probe', vorname: 'Ben', geschlecht: 'm', geburtsdatum: '2014-01-20', klasse: 'C4.2' }, { stelle: 'diagnostique' });
    await T.ops.profil(ben.id, { quelle: 'eldib', datum: alt, ds: ds }, 'Test-DS alt');
    return { lea: lea.id, ben: ben.id };
  }, [DS, tage(200)]);

  console.log('2) Übersicht und neuer Bogen: vorausgefüllt');
  await screeningReiter(ids.lea);
  check('Übersicht: „schon 13 Aussagen vorausgefüllt“', (await text('.sc-einfuehrung')).includes('schon 13 Aussagen vorausgefüllt'), await text('.sc-einfuehrung'));
  await page.click('[data-sc="neu"]'); await page.waitForSelector('.sc-bogen');
  check('Hinweis oben: 15 Antworten aus dem DS (13 Aussagen, Leidensdruck, Ereignis)', (await text('.sc-dsnote')).includes('15 Antworten aus dem DS vom'), await text('.sc-dsnote'));
  check('13 Aussagen und 2 Fragen mit „DS“ markiert', (await page.$$('.sc-item.sc-ausds')).length === 13 && (await page.$$('.sc-frage.sc-ausds')).length === 2);
  const w1 = await werte(['a1', 'a2', 'a5', 'l1', 'u1', 'r2', 'r1', 'l3', 'v1', 'st5', 'm1', 'st4', 's5', 's3']);
  check('Umrechnung: a1 oft (2 DS-Aussagen), a2 sehr oft, a5 manchmal, l1 oft (Mittel), u1 sehr oft (Mittel 2,5)',
    w1.a1 === 2 && w1.a2 === 3 && w1.a5 === 1 && w1.l1 === 2 && w1.u1 === 3, w1);
  check('Positiv formulierte DS-Aussagen umgedreht: v1 nie (hält Regeln ein), m1 manchmal, s5 oft', w1.v1 === 0 && w1.m1 === 1 && w1.s5 === 2, w1);
  check('Stärken nicht umgedreht: st5 oft, st4 sehr oft (Mittel aus Schule und Kind)', w1.st5 === 2 && w1.st4 === 3, w1);
  check('Wut, Frust: r2 oft, r1 oft, l3 oft; Sicht der Eltern (s3) nicht benutzt', w1.r2 === 2 && w1.r1 === 2 && w1.l3 === 2 && w1.s3 === null, w1);
  check('Leidensdruck „deutlich“ und Ereignis „ja“ (laut DS: Trennung, Umzug)',
    await page.isChecked('#sc-f-leiden input[value="2"]') && await page.isChecked('#sc-f-ereignis input[value="ja"]') && (await page.inputValue('[data-sc-ereignis]')).includes('Trennung der Eltern, Umzug'));
  const titel = await page.getAttribute('#sc-i-a1 .sc-dsmarke', 'title');
  check('Markierung nennt die DS-Aussagen und ihre Werte', /Kann sich im Unterricht altersgemäß konzentrieren/.test(titel) && /\(2\)/.test(titel), titel);
  check('Stand zählt die Vorschläge mit', (await text('#sc-stand')).startsWith('13 von 68'), await text('#sc-stand'));
  await page.screenshot({ path: path.join(OUT, 'ds1-bogen.png') });

  console.log('3) Ändern, Rolle, ohne Vorschläge');
  await page.click('#sc-i-a1 input[value="1"]'); await warte(100);
  check('Geänderte Antwort: Markierung weg, Hinweis zählt 14', !(await page.$('#sc-i-a1 .sc-dsmarke')) && (await text('.sc-dsnote')).includes('14 Antworten'));
  await page.selectOption('select[name="sc-rolle"]', 'eltern'); await warte(200);
  const w2 = await werte(['a1', 'a2', 'r2', 's3', 'u1']);
  check('Rolle „Eltern“: Sicht der Eltern (r2 sehr oft, s3 nie), Schule entfernt, eigene Antwort a1 bleibt', w2.r2 === 3 && w2.s3 === 0 && w2.a2 === null && w2.u1 === null && w2.a1 === 1, w2);
  check('Eltern: 4 Antworten aus dem DS', (await text('.sc-dsnote')).includes('4 Antworten'), await text('.sc-dsnote'));
  await page.selectOption('select[name="sc-rolle"]', 'lehrkraft'); await warte(200);
  const w3 = await werte(['a1', 'a2', 'r2', 's3']);
  check('Zurück zu „Lehrkraft“: wieder die Sicht der Schule', w3.a2 === 3 && w3.r2 === 2 && w3.s3 === null && w3.a1 === 1, w3);
  await page.click('[data-sc="ds-weg"]'); await warte(200);
  const w4 = await werte(['a1', 'a2', 'u1']);
  check('„Ohne DS-Vorschläge“: Vorschläge weg, eigene Antwort bleibt, keine Markierung', w4.a2 === null && w4.u1 === null && w4.a1 === 1 && !(await page.$('.sc-ausds')) && !(await page.isChecked('#sc-f-leiden input[value="2"]')));
  await page.click('[data-sc="ds-rein"]'); await warte(200);
  check('„Doch aus dem DS vorausfüllen“: wieder da', (await wert('a2')) === 3 && (await page.$$('.sc-item.sc-ausds')).length === 12);
  rueckfragen = 0;

  console.log('4) Rest ausfüllen und speichern');
  for (const b of ['aufmerksamkeit', 'unruhe', 'angst', 'stimmung', 'regulation', 'verhalten', 'sozial', 'lernen', 'sprache', 'koerper']) await bereich(b, 0);
  await bereich('staerken', 1);
  await frage('dauer', 'lang'); await frage('lernen', '1'); await frage('beziehungen', '1'); await frage('gruppe', '1'); await frage('orte', 'mehrere');
  check('Vorschläge bleiben beim Ausfüllen des Rests erhalten', (await wert('a2')) === 3 && (await wert('st4')) === 3);
  await page.click('[data-sc="speichern"]');
  await page.waitForSelector('#sc-ergebnis', { timeout: 20000 }); await warte(200);
  const gespeichert = await page.evaluate(id => { const d = CDSE_ARBEIT.hilfen.aktDossier(); const s = d.screenings[0]; return { ausDs: s.ausDs, a2: s.antworten.a2, a1: s.antworten.a1 }; }, ids.lea);
  check('Gespeichert mit Vermerk: 12 Aussagen und 2 Fragen aus dem DS (a1 ist eigene Antwort)', gespeichert.ausDs && gespeichert.ausDs.items.length === 12 && gespeichert.ausDs.auswirkung.length === 2 && gespeichert.ausDs.items.indexOf('a1') < 0 && gespeichert.a2 === 3, gespeichert);
  check('Ergebnis nennt die übernommenen Antworten', (await text('.sc-kopf')).includes('14 Antworten wurden unverändert aus dem DS vom'));
  check('Auswertung nutzt die Vorschläge (Unruhe beobachten/deutlich)', /Unruhe/.test(await text('.sc-profil')));

  console.log('5) Älterer DS: nur auf Wunsch');
  await screeningReiter(ids.ben);
  check('Übersicht: kein „vorausgefüllt“ bei älterem DS', !(await text('.sc-einfuehrung')).includes('vorausgefüllt'));
  await page.click('[data-sc="neu"]'); await page.waitForSelector('.sc-bogen');
  check('Hinweis „älter als drei Monate“, nichts vorausgefüllt', (await text('.sc-dsnote')).includes('älter als drei Monate') && !(await page.$('.sc-ausds')) && (await wert('a2')) === null);
  await page.click('[data-sc="ds-rein"]'); await warte(200);
  check('„Trotzdem daraus vorausfüllen“: 13 Aussagen markiert', (await page.$$('.sc-item.sc-ausds')).length === 13 && (await wert('a2')) === 3);
  rueckfragen = 0;
  await page.click('[data-sc="ds-weg"]'); await warte(100);
  await page.click('[data-sc="abbrechen"]'); await warte(200);
  check('Abbrechen ohne eigene Antworten: keine Rückfrage', rueckfragen === 0 && !(await page.$('.sc-bogen')), rueckfragen);

  console.log('6) Schmal (390 px)');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('[data-sc="neu"]'); await page.waitForSelector('.sc-bogen'); await warte(200);
  check('390 px: kein seitliches Scrollen, Hinweis sichtbar', (await quer()) <= 1 && await page.isVisible('.sc-dsnote'), await quer());
  await page.screenshot({ path: path.join(OUT, 'ds2-schmal.png') });

  check('Keine Fehler in der Konsole', errors.length === 0, errors);
  await browser.close();
  console.log('\n' + ok + ' bestanden, ' + bad + ' fehlgeschlagen (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
