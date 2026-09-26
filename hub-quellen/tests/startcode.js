// Test: Startcode-Verfahren – die Verwaltung bereitet Konten aus der Teamliste vor, jede Person meldet sich
// mit ihrem Startcode an, wählt ihr eigenes Passwort und ist sofort freigeschaltet.
// Mehrere Browser-Kontexte (= PCs) auf einem gemeinsamen Ordner (tests/netzordner.js). Nur erfundene Personen.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const { netzordner, verbinden } = require('./netzordner');
const BASE = process.env.BASE || 'http://127.0.0.1:8099/hub.html';
const OUT = path.join(__dirname, 'startcode-aus');
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } }

(async () => {
  const t0 = Date.now();
  fs.mkdirSync(OUT, { recursive: true });
  const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'cdse-start-'));
  const nord = netzordner(ROOT, { verzoegerung: [1, 6] });
  const browser = await chromium.launch();
  const fehler = [];
  async function pc() {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await verbinden(ctx, nord);
    const page = await ctx.newPage();
    page.on('pageerror', e => fehler.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) fehler.push(m.text()); });
    page.on('dialog', d => d.accept());
    await page.goto(BASE);
    return page;
  }
  const kontoDatei = id => JSON.parse(fs.readFileSync(path.join(ROOT, 'konten', id + '.json'), 'utf8'));
  const ring = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'gemeinsam', 'schluessel.json'), 'utf8'));
  const dialogKnopf = (p, t) => p.click('dialog.ar-dialog .ar-knoepfe button:has-text("' + t + '")');

  console.log('1) Verwaltung: Konto, Schülerbereich, ein Dossier, Teamliste');
  const A = await pc();
  await A.waitForSelector('#g-ordner'); await A.click('#g-ordner');
  await A.waitForSelector('#g-name');
  await A.fill('#g-name', 'Mia Muster'); await A.check('input[name="g-team"][value="diagnostique"]');
  await A.selectOption('#g-resp', '-');
  await A.fill('#g-pw1', 'Sonnenblume Verwaltung 1'); await A.fill('#g-pw2', 'Sonnenblume Verwaltung 1'); await A.click('#g-los');
  await A.waitForSelector('#g-code', { timeout: 60000 }); await A.check('#g-ok'); await A.click('#g-weiter');
  await A.waitForSelector('#me:not([hidden])', { state: 'attached', timeout: 60000 });
  const tom = await A.evaluate(async () => {
    await CDSE_TEAM.einrichten();
    await CDSE_KONTO.teamlisteSpeichern([
      { name: 'Mia Muster', team: 'diagnostique', funktion: 'Direktion', rolle: 'admin', responsable: '' },
      { name: 'Lea Beispiel', team: 'isa', funktion: 'Éducatrice graduée', rolle: 'responsable', responsable: '' },
      { name: 'Ben Probe', team: 'isa', funktion: 'Instituteur', rolle: 'mitarbeiter', responsable: 'Lea Beispiel' },
      { name: 'Nina Fiktiv', team: 'annexe', funktion: '', rolle: 'mitarbeiter', responsable: 'Lea Beispiel' },
      { name: 'Paul Muster', team: 'cst', funktion: 'Koordination', rolle: 'admin', responsable: '' }
    ]);
    return (await CDSE_TEAM.neuesDossier({ nachname: 'Muster', vorname: 'Tom', geburtsdatum: '2015-04-04' }, {})).id;
  });
  check('Teamliste mit 5 Personen gespeichert', (await A.evaluate(() => CDSE_KONTO.teamliste().length)) === 5);

  console.log('2) Konten vorbereiten (ohne Paul) und Zettel drucken');
  await A.evaluate(() => { location.hash = '#/verwaltung'; });
  await A.waitForSelector('.ar-tl [data-ar="tl-vorbereiten"]', { timeout: 30000 });
  check('Knopf „Konten vorbereiten (4)“', (await A.textContent('[data-ar="tl-vorbereiten"]')).includes('(4)'), await A.textContent('[data-ar="tl-vorbereiten"]'));
  await A.click('[data-ar="tl-vorbereiten"]');
  await A.waitForSelector('dialog.ar-dialog .ar-tl-auswahl');
  const auswahl = await A.$$eval('dialog.ar-dialog .ar-tl-auswahl label', l => l.map(x => x.textContent.trim()));
  check('Auswahl: 4 Personen ohne Konto (die Verwaltung selbst nicht)', auswahl.length === 4 && !auswahl.some(x => x.includes('Mia Muster')), auswahl);
  await A.uncheck('dialog.ar-dialog .ar-tl-auswahl label:has-text("Paul Muster") input');
  await dialogKnopf(A, 'Vorbereiten');
  await A.waitForSelector('dialog.ar-dialog [data-zettel]', { timeout: 60000 });
  const codes = await A.$$eval('dialog.ar-dialog .ar-tl-vorschau tbody tr', rs => Object.fromEntries(rs.map(r => [r.cells[0].textContent.trim(), r.cells[2].textContent.trim()])));
  check('3 Startcodes erzeugt (Format XXXX-XXXX-XXXX)', Object.keys(codes).length === 3 && Object.values(codes).every(c => /^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(c)), codes);
  await A.screenshot({ path: OUT + '/s1-codes.png' });
  await A.click('dialog.ar-dialog [data-zettel]');
  await A.waitForTimeout(600);
  const zettel = await A.evaluate(() => { const f = Array.from(document.querySelectorAll('iframe[aria-hidden="true"]')).pop(); return f ? f.contentDocument.body.innerText : ''; });
  check('Zettel enthalten Namen, Codes und die Schritte', ['Ben Probe', 'Lea Beispiel', 'Nina Fiktiv'].every(n => zettel.includes(n)) && Object.values(codes).every(c => zettel.includes(c)) && zettel.includes('eigenes Passwort') && zettel.includes('Gültig bis'), zettel.slice(0, 200));
  await dialogKnopf(A, 'Fertig');
  await A.waitForSelector('dialog.ar-dialog', { state: 'detached', timeout: 10000 });
  const vb = await A.evaluate(() => CDSE_KONTO.vorbereitete());
  const idVon = n => (vb.find(v => v.name === n) || {}).id;
  const pBen = kontoDatei(idVon('Ben Probe')), pLea = kontoDatei(idVon('Lea Beispiel'));
  check('Vorbereitete Datei: Name, Team, Funktion, Responsable (Lea), Startcode-Box, kein Schlüssel', pBen.name === 'Ben Probe' && pBen.team === 'isa' && pBen.funktion === 'Instituteur' && pBen.responsable === pLea.id && pBen.start && pBen.start.ct && !pBen.schluessel && !pBen.oeffentlich, pBen);
  const rohText = fs.readFileSync(path.join(ROOT, 'konten', pBen.id + '.json'), 'utf8');
  check('Der Startcode steht nirgends in der Datei', !Object.values(codes).some(c => rohText.includes(c) || rohText.includes(c.replace(/-/g, ''))));
  check('Gültig 60 Tage, Generation 1', /^\d{4}-\d{2}-\d{2}$/.test(pBen.start.bis) && pBen.start.gen === 1, pBen.start);
  const tlText = await A.textContent('.ar-tl');
  check('Teamliste zeigt „Startcode bis …“ und „3 mit Startcode vorbereitet“', tlText.includes('Startcode bis') && tlText.includes('3 mit Startcode vorbereitet') && tlText.includes('Konten vorbereiten (1)'), tlText.slice(0, 300));
  await A.screenshot({ path: OUT + '/s2-teamliste.png', fullPage: true });

  console.log('3) Ben meldet sich an einem anderen PC mit dem Startcode an');
  const B = await pc();
  await B.waitForSelector('#g-ordner'); await B.click('#g-ordner');
  await B.waitForSelector('#gate .konto[data-start]', { timeout: 30000 });
  const liste = await B.$$eval('#gate .konto', l => l.map(x => x.textContent.trim()));
  check('Anmeldeliste: Ben, Lea, Nina als „erste Anmeldung mit Startcode“, Mia normal', liste.filter(x => x.includes('erste Anmeldung mit Startcode')).length === 3 && liste.some(x => x.includes('Mia Muster') && !x.includes('Startcode')), liste);
  await B.click('#gate .konto[data-start]:has-text("Ben Probe")');
  await B.waitForSelector('#g-start'); await B.waitForTimeout(150);
  check('Startcode-Seite zeigt Team, Funktion und Responsable aus der Teamliste', (await B.textContent('#gate-card')).includes('ISA · Instituteur · Responsable: Lea Beispiel'), await B.textContent('#gate-card'));
  await B.fill('#g-start', 'AAAA-BBBB-CCCC'); await B.fill('#g-pw1', 'Mein eigenes Passwort B'); await B.fill('#g-pw2', 'Mein eigenes Passwort B');
  await B.click('#g-los');
  await B.waitForSelector('.meldung.fehler', { timeout: 60000 });
  check('Falscher Startcode wird abgelehnt', (await B.textContent('#gate-card')).includes('Startcode stimmt nicht'), await B.textContent('#gate-card'));
  await B.fill('#g-start', codes['Ben Probe'].toLowerCase()); await B.fill('#g-pw1', 'Mein eigenes Passwort B'); await B.fill('#g-pw2', 'Mein eigenes Passwort B'); await B.click('#g-los');
  await B.waitForSelector('#g-code', { timeout: 60000 });
  check('Wiederherstellungs-Code und „Du bist freigeschaltet“', (await B.textContent('#gate-card')).includes('Du bist freigeschaltet'), await B.textContent('#gate-card'));
  await B.screenshot({ path: OUT + '/s3-ben-fertig.png' });
  await B.check('#g-ok'); await B.click('#g-weiter');
  await B.waitForSelector('#me:not([hidden])', { state: 'attached', timeout: 60000 });
  const ben = kontoDatei(pBen.id);
  check('Bens Konto: gleiche ID, eigene Schlüssel, Startcode-Box entfernt', ben.id === pBen.id && ben.schluessel && ben.oeffentlich && !ben.start, Object.keys(ben));
  check('Schlüsselring: Ben freigeschaltet (per Startcode, von der Verwaltung)', ring().fuer[pBen.id] && ring().fuer[pBen.id].per === 'startcode' && ring().fuer[pBen.id].von === pBen.start.von);
  const zB = await B.evaluate(async id => { const z = (await CDSE_TEAM.laden()).art; const d = await CDSE_TEAM.dossier(id, true); const me = CDSE_KONTO.ich(); return { z, tom: d.person.vorname, rolle: CDSE_TEAM.rolle(me.id), team: me.team, funktion: me.funktion, resp: me.responsable }; }, tom);
  check('Ben öffnet den Schülerbereich sofort und liest Toms Dossier', zB.z === 'bereit' && zB.tom === 'Tom', zB);
  check('Ben: Rolle Mitarbeiter/in, Team ISA, Funktion und Responsable wie vorbereitet', zB.rolle === 'mitarbeiter' && zB.team === 'isa' && zB.funktion === 'Instituteur' && zB.resp === pLea.id, zB);

  console.log('4) Lea (Responsable laut Teamliste)');
  const C = await pc();
  await C.waitForSelector('#g-ordner'); await C.click('#g-ordner');
  await C.waitForSelector('#gate .konto[data-start]:has-text("Lea Beispiel")', { timeout: 30000 });
  check('Ben steht jetzt als normales Konto in der Liste', !(await C.textContent('#gate .konto:has-text("Ben Probe")')).includes('Startcode'));
  await C.click('#gate .konto[data-start]:has-text("Lea Beispiel")'); await C.waitForSelector('#g-start'); await C.waitForTimeout(150);
  await C.fill('#g-start', codes['Lea Beispiel']); await C.fill('#g-pw1', 'Leas eigenes Passwort 1'); await C.fill('#g-pw2', 'Leas eigenes Passwort 1'); await C.click('#g-los');
  try { await C.waitForSelector('#g-code', { timeout: 60000 }); } catch (e) { console.log('    Karte:', (await C.textContent('#gate-card')).slice(0, 400)); throw e; }
  await C.check('#g-ok'); await C.click('#g-weiter');
  await C.waitForSelector('#me:not([hidden])', { state: 'attached', timeout: 60000 });
  const zC = await C.evaluate(async () => { const z = (await CDSE_TEAM.laden()).art; return { z, rolle: CDSE_TEAM.rolle(CDSE_KONTO.ich().id) }; });
  check('Lea: sofort freigeschaltet, Rolle Responsable', zC.z === 'bereit' && zC.rolle === 'responsable', zC);

  console.log('5) Neuer Code für Nina, Paul vorbereiten und wieder löschen');
  await A.evaluate(async () => { await CDSE_KONTO.kontenNeu(); await CDSE_TEAM.laden(); location.hash = '#/schueler'; });
  await A.waitForTimeout(300);
  await A.evaluate(() => { location.hash = '#/verwaltung'; });
  await A.waitForSelector('.ar-tl [data-ar="tl-startneu"]', { timeout: 30000 });
  await A.click('.ar-tl .ar-zeile:has-text("Nina Fiktiv") [data-ar="tl-startneu"]');
  await dialogKnopf(A, 'Neuen Code erzeugen');
  await A.waitForSelector('dialog.ar-dialog [data-zettel]', { timeout: 60000 });
  const ninaNeu = await A.$eval('dialog.ar-dialog .ar-tl-vorschau tbody tr td:nth-child(3)', td => td.textContent.trim());
  check('Neuer Code für Nina ist ein anderer', /^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(ninaNeu) && ninaNeu !== codes['Nina Fiktiv'], ninaNeu);
  await A.click('dialog.ar-dialog [data-zettel]'); await dialogKnopf(A, 'Fertig');
  await A.waitForSelector('dialog.ar-dialog', { state: 'detached', timeout: 10000 });
  const paul = await A.evaluate(async () => { const tl = CDSE_KONTO.teamliste().filter(p => p.name === 'Paul Muster'); return await CDSE_TEAM.kontenVorbereiten(tl); });
  check('Paul vorbereitet (Rolle „Verwaltung“ aus der Liste wird nicht automatisch vergeben)', paul.length === 1, paul);
  const paulId = paul[0].id;
  await A.evaluate(async id => { await CDSE_TEAM.vorbereitungEntfernen(id); }, paulId);
  check('Vorbereitung gelöscht: Datei weg', !fs.existsSync(path.join(ROOT, 'konten', paulId + '.json')));

  console.log('6) Nina: alter Code ungültig, neuer Code klappt; doppelter Name wird zum Startcode umgeleitet');
  const D = await pc();
  await D.waitForSelector('#g-ordner'); await D.click('#g-ordner');
  await D.waitForSelector('#g-neu', { timeout: 30000 });
  await D.click('#g-neu'); await D.waitForSelector('#g-name');
  await D.fill('#g-name', 'Nina Fiktiv'); await D.check('input[name="g-team"][value="annexe"]'); await D.selectOption('#g-resp', '-');
  await D.fill('#g-pw1', 'Ninas eigenes Passwort'); await D.fill('#g-pw2', 'Ninas eigenes Passwort'); await D.click('#g-los');
  try { await D.waitForSelector('#g-start', { timeout: 30000 }); } catch (e) { console.log('    Karte:', (await D.textContent('#gate-card')).slice(0, 500)); throw e; }
  await D.waitForTimeout(150);
  check('„Neues Konto“ mit vorbereitetem Namen führt zur Startcode-Seite', (await D.textContent('#gate-card')).includes('schon ein Konto vorbereitet'));
  await D.fill('#g-start', codes['Nina Fiktiv']); await D.fill('#g-pw1', 'Ninas eigenes Passwort'); await D.fill('#g-pw2', 'Ninas eigenes Passwort'); await D.click('#g-los');
  await D.waitForSelector('.meldung.fehler', { timeout: 60000 });
  check('Alter Code von Nina gilt nicht mehr', (await D.textContent('#gate-card')).includes('Startcode stimmt nicht'));
  await D.fill('#g-start', ninaNeu); await D.fill('#g-pw1', 'Ninas eigenes Passwort'); await D.fill('#g-pw2', 'Ninas eigenes Passwort'); await D.click('#g-los');
  await D.waitForSelector('#g-code', { timeout: 60000 });
  check('Neuer Code von Nina klappt', (await D.textContent('#gate-card')).includes('Du bist freigeschaltet'));
  await D.check('#g-ok'); await D.click('#g-weiter');
  await D.waitForSelector('#me:not([hidden])', { state: 'attached', timeout: 60000 });

  console.log('7) Nach einem Schlüsselwechsel: Freischaltung durch die Verwaltung; abgelaufener Code');
  const paul2 = await A.evaluate(async () => { const tl = CDSE_KONTO.teamliste().filter(p => p.name === 'Paul Muster'); return await CDSE_TEAM.kontenVorbereiten(tl); });
  const erneuert = await A.evaluate(async () => (await CDSE_TEAM.schluesselErneuern()).gen);
  check('Schlüssel erneuert (Generation 2)', erneuert === 2, erneuert);
  await A.evaluate(async () => { await CDSE_KONTO.kontenNeu(); location.hash = '#/schueler'; });
  await A.waitForTimeout(300); await A.evaluate(() => { location.hash = '#/verwaltung'; });
  await A.waitForSelector('.ar-tl', { timeout: 30000 }); await A.waitForTimeout(500);
  check('Teamliste: Pauls Startcode als ungültig markiert', (await A.textContent('.ar-tl')).includes('Startcode ungültig (Schlüssel erneuert)'));
  const E = await pc();
  await E.waitForSelector('#g-ordner'); await E.click('#g-ordner');
  await E.waitForSelector('#gate .konto[data-start]:has-text("Paul Muster")', { timeout: 30000 });
  await E.click('#gate .konto[data-start]:has-text("Paul Muster")'); await E.waitForSelector('#g-start'); await E.waitForTimeout(150);
  await E.fill('#g-start', paul2[0].code); await E.fill('#g-pw1', 'Pauls eigenes Passwort'); await E.fill('#g-pw2', 'Pauls eigenes Passwort'); await E.click('#g-los');
  await E.waitForSelector('#g-code', { timeout: 60000 });
  check('Paul: Konto eingerichtet, Freischaltung übernimmt die Verwaltung', (await E.textContent('#gate-card')).includes('übernimmt die Verwaltung'), await E.textContent('#gate-card'));
  check('Paul nicht im Schlüsselring, Datei ohne Startcode-Box', !ring().fuer[paul2[0].id] && !kontoDatei(paul2[0].id).start);
  const wartend = await A.evaluate(async () => { await CDSE_KONTO.kontenNeu(); await CDSE_TEAM.laden(); return CDSE_TEAM.wartende().map(k => k.name); });
  check('Paul erscheint bei der Verwaltung unter „Warten auf Freischaltung“', wartend.includes('Paul Muster'), wartend);
  // abgelaufener Code
  const lange = await A.evaluate(async () => CDSE_TEAM.kontenVorbereiten([{ name: 'Ida Probe', team: 'isa', funktion: '', rolle: 'mitarbeiter', responsable: '' }]));
  const idaDatei = path.join(ROOT, 'konten', lange[0].id + '.json');
  const ida = JSON.parse(fs.readFileSync(idaDatei, 'utf8')); ida.start.bis = '2020-01-01'; fs.writeFileSync(idaDatei, JSON.stringify(ida, null, 1));
  const F = await pc();
  await F.waitForSelector('#g-ordner'); await F.click('#g-ordner');
  await F.waitForSelector('#gate .konto[data-start]:has-text("Ida Probe")', { timeout: 30000 });
  await F.click('#gate .konto[data-start]:has-text("Ida Probe")'); await F.waitForSelector('#g-start'); await F.waitForTimeout(150);
  await F.fill('#g-start', lange[0].code); await F.fill('#g-pw1', 'Idas eigenes Passwort'); await F.fill('#g-pw2', 'Idas eigenes Passwort'); await F.click('#g-los');
  await F.waitForSelector('.meldung.fehler', { timeout: 60000 });
  check('Abgelaufener Startcode: klare Meldung', (await F.textContent('#gate-card')).includes('abgelaufen'), await F.textContent('#gate-card'));
  const prot = await A.evaluate(async () => { await CDSE_TEAM.laden(); return CDSE_TEAM.bereichsVerlauf().map(v => v.t); });
  check('Protokoll: vorbereitet, freigeschaltet mit Startcode, neuer Code, gelöscht', prot.some(t => /^Konten vorbereitet \(Startcode\): 3/.test(t)) && prot.some(t => /^Freigeschaltet mit Startcode: Ben Probe/.test(t)) && prot.some(t => /^Neuer Startcode: Nina Fiktiv/.test(t)) && prot.some(t => /^Vorbereitetes Konto gelöscht: Paul Muster/.test(t)), prot.slice(0, 8));

  check('Keine Skriptfehler', fehler.length === 0, fehler.slice(0, 5));
  await browser.close();
  try { fs.rmSync(ROOT, { recursive: true, force: true }); } catch (e) { }
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler  (' + Math.round((Date.now() - t0) / 1000) + ' s, Bilder in ' + OUT + ')');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
