// Test: Teamliste (vorbereitete Konten) – Verwaltung fügt eine Liste ein (Excel/Semikolon, CLAPA → Classes de
// participation, Dubletten, unbekanntes Team), neue Personen wählen beim Konto-Erstellen ihren Namen (Team, Funktion
// vorausgefüllt), Freischalten durch die Verwaltung übernimmt „Responsable“, durch eine Responsable nicht, nie „Verwaltung“,
// Hinweis „nicht in der Teamliste“, Bearbeiten, Export. Nur erfundene Personen.
// Aufruf: node tests/teamliste.js   (BASE=… für eine andere Hub-Datei)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8099/hub.html';
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } }

const LISTE = [
  'Name\tTeam\tFunktion\tRolle',
  'Mia Muster\tDiagnostique\tPsychologin\tDirection',
  'Lea Beispiel\tISA\tÉducatrice graduée\tResponsable',
  'Beispiel Tom\tCLAPA\tInstituteur\t',
  'Emma Probe; Annexe Junglinster; Éducatrice; ',
  'Noah Test; CST; Pédagogue; Responsable',
  'Luca Fiktiv; Atelier; Logopède;',
  'Lea Beispiel\tISA\tÉducatrice graduée (Koordination)\tResponsable'
].join('\n');

(async () => {
  const t0 = Date.now();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => { window.__CDSE_TEST_ORDNER = () => navigator.storage.getDirectory(); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('dialog', d => d.accept());
  const warte = ms => page.waitForTimeout(ms);
  const text = sel => page.textContent(sel);
  async function gehe(hash) { await page.evaluate(h => { location.hash = h; }, hash); await warte(400); }
  async function dialogKnopf(t) { await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("' + t + '")'); }
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
  async function neuesKontoFormular() {
    const t = await text('#gate-card'); if (!t.includes('Wer bist du?')) { const z = await page.$('#g-zurueck'); if (z) await z.click(); }
    await page.click('#g-neu'); await page.waitForSelector('#g-name');
  }
  async function verwaltung() { await gehe('#/verwaltung'); await page.waitForSelector('.ar-tl', { timeout: 20000 }); await warte(150); }

  await page.goto(BASE);
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); for await (const [n] of r.entries()) { await r.removeEntry(n, { recursive: true }); } localStorage.clear(); sessionStorage.clear(); });
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); await r.getFileHandle('hub.html', { create: true }); });
  await page.reload();
  await page.click('#g-ordner'); await page.waitForSelector('#g-name');

  console.log('1) Verwaltung (Mia Muster) richtet den Schülerbereich ein – Teamliste leer');
  await erstelle('Mia Muster', 'diagnostique', 'ein sicheres Passwort 1');
  await gehe('#/schueler'); await page.waitForSelector('[data-ar="einrichten"]'); await page.click('[data-ar="einrichten"]');
  await page.waitForSelector('[data-ar="neu"]', { timeout: 20000 });
  await verwaltung();
  check('Karte „Teamliste“ in der Verwaltung, noch leer, mit „Liste einfügen“', (await text('.ar-tl')).includes('Noch leer') && await page.isVisible('[data-ar="tl-einfuegen"]'));

  console.log('2) Liste aus Excel und mit Semikolon einfügen');
  await page.click('[data-ar="tl-einfuegen"]'); await page.waitForSelector('dialog.ar-dialog textarea[name="text"]');
  await page.fill('dialog.ar-dialog textarea[name="text"]', LISTE); await dialogKnopf('Prüfen');
  await page.waitForSelector('dialog.ar-dialog .ar-tl-vorschau');
  const vorschau = await text('dialog.ar-dialog');
  check('Vorschau: 6 Personen, Kopfzeile übersprungen, Dublette gemeldet', /6<\/b>|6 Personen/.test(await page.innerHTML('dialog.ar-dialog')) && vorschau.includes('steht doppelt'), vorschau.slice(0, 200));
  check('Vorschau: unbekanntes Team „Atelier“ gemeldet, CLAPA → Classes de participation', vorschau.includes('Team „Atelier“ unbekannt') && vorschau.includes('Classes de participation'));
  await dialogKnopf('Übernehmen');
  await page.waitForFunction(() => !document.querySelector('dialog.ar-dialog'), null, { timeout: 20000 }); await warte(300);
  const datei = await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); return JSON.parse(await (await (await r.getFileHandle('teamliste.json')).getFile()).text()); });
  check('teamliste.json im Hub-Ordner (Format, 6 Personen, sortiert)', datei.format === 'cdse-teamliste' && datei.personen.length === 6 && datei.personen[0].name === 'Beispiel Tom', datei.personen.map(p => p.name));
  const lea = datei.personen.find(p => p.name === 'Lea Beispiel'), tom = datei.personen.find(p => p.name === 'Beispiel Tom'), mia = datei.personen.find(p => p.name === 'Mia Muster');
  check('Werte: Lea ISA/Responsable (letzte Zeile gilt), Tom CLAPA → cp, Mia Direction → Verwaltung', lea.team === 'isa' && lea.rolle === 'responsable' && /Koordination/.test(lea.funktion) && tom.team === 'cp' && mia.rolle === 'admin', [lea, tom, mia]);
  check('Kein Passwort, keine Schülerdaten in der Datei', !/passwort|password|schluessel|dossier/i.test(JSON.stringify(datei)));
  check('Karte: Mia „Konto aktiv“, 5 noch ohne Konto', (await text('.ar-tl-stand')).replace(/\s+/g, ' ').includes('1 Konto aktiv') && (await text('.ar-tl-stand')).replace(/\s+/g, ' ').includes('5 noch ohne Konto'), await text('.ar-tl-stand'));
  await page.click('[data-ar="tl-filter"][data-team="isa"]'); await warte(200);
  check('Filter „ISA“: nur Lea', (await page.$$('.ar-tl-tab .ar-zeile:not(.kopf)')).length === 1 && (await text('.ar-tl-tab')).includes('Lea Beispiel'));
  await page.click('[data-ar="tl-filter"][data-team=""]'); await warte(200);

  console.log('3) Lea erstellt ihr Konto: Name aus der Teamliste, Team und Funktion vorausgefüllt');
  await abmelden(); await neuesKontoFormular();
  const namen = await page.$$eval('#g-namen option', l => l.map(o => o.value));
  check('Namensvorschläge: nur Personen ohne Konto (nicht Mia)', namen.length === 5 && !namen.includes('Mia Muster') && namen.includes('Lea Beispiel'), namen);
  await page.fill('#g-name', 'Lea Beispiel'); await warte(150);
  check('Team ISA gewählt, Funktion eingetragen, Hinweis „In der Teamliste … Responsable“',
    await page.isChecked('input[name="g-team"][value="isa"]') && (await page.inputValue('#g-funktion')).includes('Éducatrice graduée') && (await text('#g-tl')).includes('Responsable'), await text('#g-tl'));
  await page.selectOption('#g-resp', '-'); await page.fill('#g-pw1', 'noch ein Passwort 22'); await page.fill('#g-pw2', 'noch ein Passwort 22');
  await page.click('#g-los'); await kontoFertig();
  const leaKonto = await page.evaluate(() => CDSE_KONTO.ich());
  check('Lea: Konto mit Team ISA und Funktion aus der Liste', leaKonto.team === 'isa' && /Éducatrice graduée/.test(leaKonto.funktion), leaKonto);

  console.log('4) Tom (umgekehrte Namensfolge) und Paul (nicht in der Liste)');
  await abmelden(); await neuesKontoFormular();
  await page.fill('#g-name', 'Tom Beispiel'); await warte(150);
  check('„Tom Beispiel“ passt zu „Beispiel Tom“: Team Classes de participation', await page.isChecked('input[name="g-team"][value="cp"]'));
  await page.selectOption('#g-resp', '-'); await page.fill('#g-pw1', 'ein viertes Passwort 44'); await page.fill('#g-pw2', 'ein viertes Passwort 44'); await page.click('#g-los'); await kontoFertig();
  await abmelden(); await neuesKontoFormular(); await erstelle('Paul Probe', 'annexe', 'drittes Passwort 333');

  console.log('5) Verwaltung schaltet frei: Rolle aus der Teamliste');
  await abmelden(); await anmelden('Mia Muster', 'ein sicheres Passwort 1');
  await verwaltung();
  const wart = await text('.ar-wartende');
  check('Wartende: Lea „In der Teamliste · Responsable (wird übernommen)“, Paul „Nicht in der Teamliste“', /Lea Beispiel[\s\S]*In der Teamliste · Responsable \(wird übernommen\)/.test(wart) && /Paul Probe[\s\S]*Nicht in der Teamliste/.test(wart), wart);
  const ids = await page.evaluate(() => { const k = CDSE_KONTO.konten(); const f = n => k.find(x => x.name === n).id; return { lea: f('Lea Beispiel'), tom: f('Tom Beispiel'), paul: f('Paul Probe') }; });
  await page.click('[data-ar="freischalten"][data-id="' + ids.lea + '"]'); await page.waitForFunction(id => !document.querySelector('[data-ar="freischalten"][data-id="' + id + '"]'), ids.lea, { timeout: 20000 }); await warte(400);
  check('Lea nach der Freischaltung durch die Verwaltung: Responsable', await page.evaluate(id => CDSE_TEAM.rolle(id), ids.lea) === 'responsable');
  check('Protokoll: „Freigeschaltet: Lea Beispiel (Responsable laut Teamliste)“', (await text('.ar-protokoll')).includes('Freigeschaltet: Lea Beispiel (Responsable laut Teamliste)'));
  await page.click('[data-ar="freischalten"][data-id="' + ids.paul + '"]'); await page.waitForFunction(id => !document.querySelector('[data-ar="freischalten"][data-id="' + id + '"]'), ids.paul, { timeout: 20000 }); await warte(400);
  check('Paul (nicht in der Liste): Mitarbeiter/in', await page.evaluate(id => CDSE_TEAM.rolle(id), ids.paul) === 'mitarbeiter');

  console.log('6) Responsable schaltet frei: Rolle bleibt Mitarbeiter/in, Verwaltung übernimmt per Klick');
  await page.evaluate(async () => { const l = CDSE_KONTO.teamliste(); l.find(p => p.name === 'Beispiel Tom').rolle = 'responsable'; await CDSE_KONTO.teamlisteSpeichern(l); });
  await abmelden(); await anmelden('Lea Beispiel', 'noch ein Passwort 22');
  await verwaltung();
  check('Responsable sieht die Teamliste, aber ohne Bearbeiten', await page.isVisible('.ar-tl') && !(await page.$('[data-ar="tl-einfuegen"]')) && !(await page.$('[data-ar="tl-bearbeiten"]')));
  await page.click('[data-ar="freischalten"][data-id="' + ids.tom + '"]'); await page.waitForFunction(id => !document.querySelector('[data-ar="freischalten"][data-id="' + id + '"]'), ids.tom, { timeout: 20000 }); await warte(400);
  check('Tom (Liste: Responsable) nach Freischaltung durch eine Responsable: Mitarbeiter/in', await page.evaluate(id => CDSE_TEAM.rolle(id), ids.tom) === 'mitarbeiter');
  await abmelden(); await anmelden('Mia Muster', 'ein sicheres Passwort 1');
  await verwaltung();
  check('Verwaltung sieht „Teamliste: Responsable übernehmen“ bei Tom', await page.isVisible('[data-ar="tl-rolle"][data-id="' + ids.tom + '"]'));
  await page.click('[data-ar="tl-rolle"][data-id="' + ids.tom + '"]'); await warte(800);
  check('Nach dem Klick: Tom ist Responsable, der Knopf ist weg', await page.evaluate(id => CDSE_TEAM.rolle(id), ids.tom) === 'responsable' && !(await page.$('[data-ar="tl-rolle"][data-id="' + ids.tom + '"]')));
  check('Nie automatisch Verwaltung: Mia steht als „Verwaltung“ in der Liste, niemand sonst ist Admin', await page.evaluate(() => CDSE_TEAM.mitglieder().filter(k => k.rolle === 'admin').map(k => k.name).join()) === 'Mia Muster');
  const stand = (await text('.ar-tl-stand')).replace(/\s+/g, ' ');
  check('Karte: 3 Konten aktiv, 0 warten, 3 ohne Konto', stand.includes('3 Konten aktiv') && stand.includes('0 warten') && stand.includes('3 noch ohne Konto'), stand);
  check('Hinweis: Paul steht nicht in der Teamliste', (await text('.ar-tl')).includes('Konten, die nicht in der Teamliste stehen: Paul Probe'));
  require('fs').mkdirSync(require('path').join(__dirname, 'teamliste-aus'), { recursive: true });
  await page.locator('.ar-tl').screenshot({ path: require('path').join(__dirname, 'teamliste-aus', 't1-teamliste.png') });

  console.log('7) Bearbeiten, Hinzufügen, Entfernen, Export');
  const iLuca = await page.evaluate(() => CDSE_KONTO.teamliste().findIndex(p => p.name === 'Luca Fiktiv'));
  await page.click('[data-ar="tl-bearbeiten"][data-i="' + iLuca + '"]'); await page.waitForSelector('dialog.ar-dialog select[name="team"]');
  await page.selectOption('dialog.ar-dialog select[name="team"]', 'diagnostique'); await dialogKnopf('Speichern');
  await page.waitForFunction(() => !document.querySelector('dialog.ar-dialog'), null, { timeout: 20000 }); await warte(300);
  check('Luca: Team nachgetragen (Diagnostique)', await page.evaluate(() => CDSE_KONTO.teamliste().find(p => p.name === 'Luca Fiktiv').team) === 'diagnostique');
  await page.click('[data-ar="tl-neu"]'); await page.waitForSelector('dialog.ar-dialog input[name="name"]');
  await page.fill('dialog.ar-dialog input[name="name"]', 'Lea Beispiel'); await dialogKnopf('Speichern'); await warte(200);
  check('Doppelter Name wird abgelehnt', (await text('dialog.ar-dialog .ar-dialog-fehler')).includes('steht schon in der Liste'));
  await page.fill('dialog.ar-dialog input[name="name"]', 'Sara Muster'); await page.selectOption('dialog.ar-dialog select[name="team"]', 'isa'); await dialogKnopf('Speichern');
  await page.waitForFunction(() => !document.querySelector('dialog.ar-dialog'), null, { timeout: 20000 }); await warte(300);
  check('Sara hinzugefügt (7 Personen)', await page.evaluate(() => CDSE_KONTO.teamliste().length) === 7);
  const iSara = await page.evaluate(() => CDSE_KONTO.teamliste().findIndex(p => p.name === 'Sara Muster'));
  await page.click('[data-ar="tl-bearbeiten"][data-i="' + iSara + '"]'); await page.waitForSelector('dialog.ar-dialog'); await dialogKnopf('Entfernen');
  await page.waitForFunction(() => !document.querySelector('dialog.ar-dialog'), null, { timeout: 20000 }); await warte(300);
  check('Sara wieder entfernt (6 Personen)', await page.evaluate(() => CDSE_KONTO.teamliste().length) === 6);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-ar="tl-export"]')]);
  const csv = require('fs').readFileSync(await dl.path(), 'utf8');
  check('Export: CSV mit Kopf, Semikolon, Konto-Stand', dl.suggestedFilename() === 'CDSE-Teamliste.csv' && csv.includes('Name;Team;Funktion;Rolle;Responsable;Konto') && /Lea Beispiel;ISA;.*;Responsable;;Konto aktiv/.test(csv), csv.slice(0, 200));

  console.log('8) Handy (390 px)');
  await page.setViewportSize({ width: 390, height: 844 }); await warte(300);
  await verwaltung();
  const quer = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('390 px: Teamliste ohne waagrechtes Scrollen', quer <= 1, quer);
  await page.setViewportSize({ width: 1280, height: 900 });

  check('Keine Fehler in der Konsole', errors.length === 0, errors.slice(0, 5).join(' | '));
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler  (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
