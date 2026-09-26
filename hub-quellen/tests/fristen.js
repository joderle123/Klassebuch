// Test: Fristen und „Fällig diese Woche“ – Frist mit Schnellauswahl im Begleitplan, Wiedervorlage beim Eintrag
// (eine Frist im selben Schreibvorgang), Karte „Fällig diese Woche“ auf der Startseite (je Kind eine Zeile,
// dringend vor fällig vor bald, nur eigene Fälle und eigene Fristen, keine inaktiven Dossiers), Sprung in den
// Begleitplan, 390 px. Nur erfundene Personen.
// Aufruf: node tests/fristen.js   (BASE=… für eine andere Hub-Datei)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8099/hub.html';
const OUT = path.join(__dirname, 'fristen-aus'); fs.mkdirSync(OUT, { recursive: true });
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
  async function reiter(id, tab) { await gehe('#/'); await gehe('#/schueler/' + id); await page.waitForSelector('.ar-tabs [data-tab="' + tab + '"]', { timeout: 20000 }); await page.click('.ar-tabs [data-tab="' + tab + '"]'); await warte(250); }
  async function dialogKnopf(t) { await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("' + t + '")'); await warte(450); }
  async function quer() { return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); }
  async function startseite() { await gehe('#/schueler'); await gehe('#/'); await page.waitForSelector('#ar-heute-platz .ar-faellig, #ar-heute-platz .ar-faellig-leer', { timeout: 20000 }); }
  async function zeilen() { return page.$$eval('.ar-faellig .ar-faellig-z', l => l.map(a => ({ name: a.querySelector('.ar-f-name').textContent, was: a.querySelector('.ar-f-was').textContent, wann: a.querySelector('.ar-f-wann').textContent, art: a.className.replace('ar-faellig-z', '').trim(), href: a.getAttribute('href') }))); }
  const tag = n => { const d = new Date(Date.now() + n * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const kurz = iso => iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.';

  await page.goto(BASE);
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); for await (const [n] of r.entries()) { await r.removeEntry(n, { recursive: true }); } localStorage.clear(); sessionStorage.clear(); });
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); await r.getFileHandle('hub.html', { create: true }); });
  await page.reload();
  await page.click('#g-ordner'); await page.waitForSelector('#g-name');

  console.log('1) Drei erfundene Kinder');
  await erstelle('Mia Muster', 'diagnostique', 'ein sicheres Passwort 1');
  await gehe('#/schueler'); await page.waitForSelector('[data-ar="einrichten"]'); await page.click('[data-ar="einrichten"]');
  await page.waitForSelector('[data-ar="neu"]', { timeout: 20000 });
  const ids = await page.evaluate(async () => {
    const T = CDSE_TEAM;
    const tom = (await T.neuesDossier({ nachname: 'Muster', vorname: 'Tom', geschlecht: 'm', geburtsdatum: '2014-05-05', klasse: 'C4.1' }, { stelle: 'annexe' })).id;
    const lea = (await T.neuesDossier({ nachname: 'Beispiel', vorname: 'Lea', geschlecht: 'w', geburtsdatum: '2011-04-10', klasse: '5C' }, { stelle: 'annexe' })).id;
    const ben = (await T.neuesDossier({ nachname: 'Probe', vorname: 'Ben', geschlecht: 'm', geburtsdatum: '2013-02-02', klasse: 'C3.2' }, { stelle: 'annexe' })).id;
    return { tom, lea, ben };
  });
  const me = await page.evaluate(() => CDSE_KONTO.ich().id);
  check('Startseite: keine Frist fällig → ruhige Zeile „nichts – alles im Plan“', await (async () => { await startseite(); return (await text('#ar-heute-platz')).includes('nichts – alles im Plan') && !(await page.$('.ar-faellig')); })());

  console.log('2) Frist mit Schnellauswahl im Begleitplan (Tom)');
  await reiter(ids.tom, 'begleitplan');
  check('Knopf heißt „Frist oder Schritt“', (await text('[data-bp="eigen-neu"]')).includes('Frist oder Schritt'));
  await page.click('[data-bp="eigen-neu"]'); await page.waitForSelector('dialog.ar-dialog');
  check('Dialog „Frist oder Schritt“ mit häufigen Fristen', (await text('dialog.ar-dialog h2')) === 'Frist oder Schritt' && (await page.$$('dialog.ar-dialog [data-vorlage]')).length === 6);
  check('Neu: zuständig ist vorausgewählt (ich)', (await page.$eval('dialog.ar-dialog select[name="wer"]', s => s.value)) === me);
  await page.click('dialog.ar-dialog [data-vorlage="Eltern zurückrufen"]');
  const vorbelegt = await page.evaluate(() => { const f = document.querySelector('dialog.ar-dialog form'); return { titel: f.elements.titel.value, bis: f.elements.bis.value }; });
  check('Klick auf „Eltern zurückrufen“: Titel und Frist in einer Woche', vorbelegt.titel === 'Eltern zurückrufen' && vorbelegt.bis === tag(7), vorbelegt);
  await dialogKnopf('Speichern');
  const fr = await page.$eval('.bp-schritt[data-key^="eigen:"]', el => el.textContent);
  check('Frist im Begleitplan: fällig am …, zuständig: Mia Muster', fr.includes('Eltern zurückrufen') && fr.includes('fällig am ' + kurz(tag(7))) && fr.includes('zuständig: Mia Muster'), fr);

  console.log('3) Wiedervorlage beim Eintrag (Lea)');
  await reiter(ids.lea, 'eintraege');
  await page.selectOption('#ar-eintrag-form select[name="art"]', 'gespraech_eltern');
  await page.fill('#ar-eintrag-form textarea[name="text"]', 'Mutter ruft wegen der Hausaufgaben an. Rückmeldung zugesagt.');
  await page.fill('#ar-eintrag-form input[name="wiedervorlage"]', tag(2));
  await page.click('#ar-eintrag-form button[type=submit]'); await warte(600);
  const lea = await page.evaluate(async id => { const d = await CDSE_TEAM.dossier(id); return { ein: d.eintraege.length, eig: ((d.begleitplan || {}).eigene || []).map(x => ({ t: x.titel, bis: x.bis, wer: x.wer, bezug: x.bezug })), prot: d.verlauf.map(v => v.t).join(' | ') }; }, ids.lea);
  check('Eintrag gespeichert und Frist im selben Schreibvorgang angelegt', lea.ein === 1 && lea.eig.length === 1 && lea.eig[0].bis === tag(2) && lea.eig[0].wer === me && /^eintrag:/.test(lea.eig[0].bezug), lea);
  check('Titel der Frist: „Nachfassen: Gespräch mit den Eltern vom …“', lea.eig[0].t === 'Nachfassen: Gespräch mit den Eltern vom ' + tag(0).split('-').reverse().join('.'), lea.eig[0].t);
  check('Protokoll nennt die Wiedervorlage', lea.prot.includes('Wiedervorlage am ' + tag(2).split('-').reverse().join('.')), lea.prot);

  console.log('4) Ben: nicht fallverantwortlich, aber eine Frist für mich; Tom: Warnsignal');
  await page.evaluate(async ([ids, heute]) => {
    const T = CDSE_TEAM;
    await T.ops.verantwortlich(ids.ben, ['konto-kollegin']);
    await T.ops.planEigener(ids.ben, { titel: 'Bericht für die Commission schreiben', phase: 'umsetzen', wer: CDSE_KONTO.ich().id, bis: heute });
    await T.ops.planEigener(ids.ben, { titel: 'Nicht meine Frist', phase: 'umsetzen', wer: 'konto-kollegin', bis: heute });
    const bog = CDSE_SCREENING_BOGEN, antworten = {};
    bog.bereiche.forEach(b => b.items.forEach(i => { antworten[i.id] = 0; }));
    bog.staerken.items.forEach(i => { antworten[i.id] = 2; });
    await T.ops.screening(ids.tom, { datum: heute, stufe: 'GS', rolle: 'educ', version: 1, antworten, auswirkung: {}, warn: ['selbstverletzung'], warnNotiz: 'Test', notiz: '' });
  }, [ids, tag(0)]);
  await startseite();
  const z1 = await zeilen();
  check('Karte „Fällig diese Woche“: drei Kinder', z1.length === 3 && (await text('.ar-faellig header')).includes('3 Kinder'), z1);
  check('Reihenfolge: dringend (Tom) vor heute (Ben) vor bald (Lea)', z1.map(z => z.name).join() === 'Tom Muster,Ben Probe,Lea Beispiel', z1.map(z => z.name));
  check('Tom: Warnsignal als dringend – ohne Inhalt auf der Startseite –, weitere Schritte als „+n“', z1[0].art === 'dringend' && z1[0].wann === 'dringend' && z1[0].was.startsWith('Warnsignal vom') && z1[0].was.includes('bitte ansehen') && !z1[0].was.includes('Selbstverletzung') && /\+\d/.test(z1[0].was), z1[0]);
  check('Ben: nur meine Frist (heute), nicht die der Kollegin und keine Schritte des Plans', z1[1].was.trim() === 'Bericht für die Commission schreiben' && z1[1].wann === 'heute' && z1[1].art === 'faellig', z1[1]);
  check('Lea: Wiedervorlage mit Wochentag und Datum', z1[2].was.startsWith('Nachfassen: Gespräch mit den Eltern') && z1[2].wann.endsWith(kurz(tag(2))) && z1[2].art === 'bald', z1[2]);
  await page.screenshot({ path: path.join(OUT, 'f1-startseite.png'), clip: { x: 264, y: 0, width: 1016, height: 520 } });

  console.log('5) Sprung in den Begleitplan, erledigt, inaktiv');
  await page.click('.ar-faellig-z[href*="' + ids.lea + '"]'); await page.waitForSelector('#bp-plan', { timeout: 20000 });
  check('Klick öffnet Leas Dossier direkt im Begleitplan', (await page.getAttribute('.ar-tabs [data-tab="begleitplan"]', 'aria-selected')) === 'true' && (await text('.ar-dtitel h1')).includes('BEISPIEL'));
  check('Adresse ohne Reiter-Zusatz (Zurück-Taste bleibt sauber)', (await page.evaluate(() => location.hash)) === '#/schueler/' + ids.lea);
  await page.click('.bp-schritt[data-key^="eigen:"] [data-bp="eigen-erledigt"]'); await warte(500);
  await page.evaluate(async id => { await CDSE_TEAM.ops.status(id, 'inaktiv', 'Test'); }, ids.ben);
  await startseite();
  const z2 = await zeilen();
  check('Erledigte Frist und inaktives Dossier verschwinden von der Karte', z2.length === 1 && z2[0].name === 'Tom Muster', z2.map(z => z.name));

  console.log('6) Schmal');
  await page.setViewportSize({ width: 390, height: 844 });
  await startseite();
  check('390 px: kein seitliches Scrollen auf der Startseite', (await quer()) <= 1, await quer());
  await page.screenshot({ path: path.join(OUT, 'f2-schmal.png') });

  check('Keine Fehler in der Konsole', errors.length === 0, errors);
  await browser.close();
  console.log('\n' + ok + ' bestanden, ' + bad + ' fehlgeschlagen (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
