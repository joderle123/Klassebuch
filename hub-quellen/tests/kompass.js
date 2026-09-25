// Test: Kompass im Dossier – Profil aus DS, Datenbank, Screening, Warnsignalen und ELDiB lesen,
// Abzeichen (Diagnose, Verdacht, Arbeitshypothese, Beobachtet), „Warum?“, Umgang nach ETEP-Stufe,
// Kombinationen, Lebenslage, Material in der Fassung für die Schulstufe, nummerierte Quellen,
// Datenbank-Angaben nur für Responsables, Entscheidungen des Teams (zuordnen, ergänzen, ausblenden),
// Kurzkarte im Überblick, 390 px. Nur erfundene Personen.
// Aufruf: node tests/kompass.js   (BASE=… für eine andere Hub-Datei)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8099/hub.html';
const OUT = path.join(__dirname, 'kompass-aus'); fs.mkdirSync(OUT, { recursive: true });
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
  async function neuZeichnen() { await page.evaluate(() => { CDSE_ARBEIT.hilfen.dossierZeichnen(CDSE_ARBEIT.hilfen.aktDossier()); }); await warte(150); }
  async function chips() { return page.$$eval('.ko-kopf .ko-pchip', l => l.map(x => [x.firstChild.textContent.trim(), x.querySelector('.ko-art').textContent])); }
  async function quer() { return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); }
  async function dialogKnopf(t) { await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("' + t + '")'); await warte(400); }
  const tage = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

  await page.goto(BASE);
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); for await (const [n] of r.entries()) { await r.removeEntry(n, { recursive: true }); } localStorage.clear(); sessionStorage.clear(); });
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); await r.getFileHandle('hub.html', { create: true }); });
  await page.reload();
  await page.click('#g-ordner'); await page.waitForSelector('#g-name');

  console.log('1) Einrichten: Lea Beispiel (15 J., 5C) mit DS, Datenbank, Screening, ELDiB; Ben Probe ohne Daten');
  await erstelle('Mia Muster', 'diagnostique', 'ein sicheres Passwort 1');
  await gehe('#/schueler'); await page.waitForSelector('[data-ar="einrichten"]'); await page.click('[data-ar="einrichten"]');
  await page.waitForSelector('[data-ar="neu"]', { timeout: 20000 });
  const ids = await page.evaluate(async ([heute, vor20]) => {
    const T = CDSE_TEAM;
    const lea = await T.neuesDossier({ nachname: 'Beispiel', vorname: 'Lea', geschlecht: 'w', geburtsdatum: '2011-04-10', klasse: '5C' }, { stelle: 'diagnostique' });
    /* ELDiB: Verhalten Stufe II in Arbeit, Sozialisation Stufe III in Arbeit */
    const B = ELDIB_BANK.bereiche, erreicht = [];
    const alle = (b, s) => B[b].stufen[s].items.map(i => i.code);
    erreicht.push(...alle('verhalten', 1), alle('verhalten', 2)[0]);
    erreicht.push(...alle('sozialisation', 1), ...alle('sozialisation', 2), alle('sozialisation', 3)[0]);
    await T.ops.profil(lea.id, {
      quelle: 'eldib', datum: vor20,
      ds: { v: 2, f: {}, frei: {}, tabellen: {},
        chips: { diagnosen: ['adhs', 'emotional'], ereignisse: ['trennung'], anlass: ['aggression'] },
        bewertungen: { i_hyp_regulation: 6, i_hyp_trauma: 5, i_hyp_belastung: 6, i_hyp_aufmerksamkeit: 3 } },
      eldib: { v: 2, datum: vor20, erreicht: erreicht, ziele: [] }
    }, 'Test-Profil');
    /* Screening: Gefühle regulieren und Stimmung deutlich, Warnsignal Selbstverletzung */
    const bog = CDSE_SCREENING_BOGEN, antworten = {};
    bog.bereiche.forEach(b => b.items.forEach(i => { antworten[i.id] = (b.id === 'regulation' || b.id === 'stimmung') ? 3 : 0; }));
    bog.staerken.items.forEach(i => { antworten[i.id] = 2; });
    await T.ops.screening(lea.id, { datum: heute, stufe: 'ES', rolle: 'educ', version: 1, antworten, auswirkung: { dauer: 'lang', leiden: '3', lernen: '2', beziehungen: '2', gruppe: '2', orte: 'mehrere', ereignis: 'ja' }, warn: ['selbstverletzung'], warnNotiz: 'Test', notiz: '' });
    return { lea: lea.id, ben: (await T.neuesDossier({ nachname: 'Probe', vorname: 'Ben', geschlecht: 'm', geburtsdatum: '2016-02-02', klasse: 'C3.1' }, { stelle: 'diagnostique' })).id };
  }, [tage(0), tage(20)]);
  /* Datenbank-Angaben direkt setzen (wie über „Datenbank-Angaben bearbeiten“) */
  await page.evaluate(async id => {
    await CDSE_TEAM.ops.datenbank(id, { diagnosen: ['F90.0 einfache Aktivitäts- und Aufmerksamkeitsstörung', 'Z-Code 12345 unbekannt'], verdacht: ['F60.31 emotional instabile Persönlichkeit, Borderline-Typ'] }, 'Test');
  }, ids.lea);

  console.log('2) Kompass: Profil lesen');
  await reiter(ids.lea, 'kompass');
  await page.waitForSelector('#ko-ergebnis');
  const c1 = await chips();
  const C = Object.fromEntries(c1);
  check('Reiter „Kompass“ direkt nach „Überblick“', (await page.$$eval('.ar-tabs button', l => l.map(x => x.getAttribute('data-tab')))).slice(0, 2).join() === 'ueberblick,kompass');
  check('Hinweis „Entwurf – fachlich prüfen“, keine Diagnose', (await text('.ko-stand')).includes('fachlich zu prüfen') && (await text('.ko-stand')).includes('keine Diagnose'));
  check('Borderline-Züge: Verdacht (Datenbank)', C['Emotionale Instabilität / Borderline-Züge'] === 'Verdacht', c1);
  check('ADHS: Diagnose (DS und Datenbank)', C['ADHS'] === 'Diagnose', c1);
  check('Selbstverletzung: Beobachtet (Warnsignal)', C['Selbstverletzung und Suizidalität'] === 'Beobachtet', c1);
  check('Trauma als Arbeitshypothese mit neutralem Namen „Belastende Erfahrungen“', C['Belastende Erfahrungen'] === 'Arbeitshypothese', c1);
  check('Anlass Aggression → „Regeln und Konflikte“ beobachtet', C['Regeln und Konflikte'] === 'Beobachtet', c1);
  check('Emotionsregulation geht in den Borderline-Zügen auf (kein eigener Chip)', !c1.some(x => /Gefühle regulieren|Emotionsregulation/.test(x[0])) && (await text('#ko-p-instabil .ko-umfasst')).includes('Gefühle regulieren'));
  check('Reihenfolge: Diagnose vor Verdacht vor Hypothese vor Beobachtet', c1[0][1] === 'Diagnose' && c1[1][1] === 'Verdacht', c1);
  const warum = await text('#ko-p-instabil .ko-warum');
  check('„Warum?“: Datenbank-Verdacht, Screening (deutlich), DS-Hypothese Emotionsregulation', warum.includes('F60.31') && warum.includes('„Gefühle regulieren“ deutlich') && warum.includes('Schwierigkeiten der Emotionsregulation'), warum);
  check('Nur Responsables: Kennzeichnung bei Datenbank-Gründen', (await page.$$('#ko-p-instabil .ko-warum .ko-nurresp')).length >= 1);
  check('Rückfrage „emotionale Störung“ mit Auswahl', (await text('.ko-kopf')).includes('Im DS steht „emotionale Störung“') && (await page.$$('[data-ko="klaeren"]')).length === 6);
  check('Nicht zugeordnete Datenbank-Diagnose wird gezeigt', (await text('.ko-kopf')).includes('„Z-Code 12345 unbekannt“'));
  check('Entwicklung: Verhalten II, Sozialisation III → Rolle „Motivieren“', /Verhalten Stufe II/.test(await text('.ko-fakten')) && /Sozialisation Stufe III/.test(await text('.ko-fakten')) && (await text('.ko-fakten')).includes('Motivieren'));
  check('Lebenslage: Jugendalter und aktuelle Belastungen', (await text('.ko-fakten')).includes('Jugendalter') && (await text('.ko-fakten')).includes('Aktuelle Belastungen'));
  check('Material für ES (aus der Klasse 5C)', /Material für\s*ES/.test(await text('.ko-fakten')));

  console.log('3) Empfehlungen');
  const wichtig = await page.$$eval('.ko-wichtig li', l => l.map(x => x.textContent));
  check('Das Wichtigste: zuerst das Warnsignal mit Link zum Screening', wichtig[0].includes('Warnsignal im Screening') && !!(await page.$('.ko-wichtig [data-tab="screening"]')), wichtig[0]);
  check('Das Wichtigste: höchstens 7 Punkte, mit Quellen', wichtig.length >= 4 && wichtig.length <= 7 && (await page.$$('.ko-wichtig .ko-q')).length >= 4, wichtig.length);
  const inst = await text('#ko-p-instabil');
  check('Borderline-Züge: DBT-Inhalte (Validieren vor Verändern, Verhaltensanalyse)', inst.includes('Validieren vor Verändern') && inst.includes('Verhaltensanalyse'));
  check('ETEP-Filter: Bildkarten-Hilfe für Stufe I–II gezeigt („passt zu ETEP-Stufe II“)', inst.includes('Einfache Beruhigungshilfen mit Bildkarten') && inst.includes('passt zu ETEP-Stufe II'));
  check('ETEP-Filter: Skills-Liste für Stufe III–V ausgeblendet', !inst.includes('Skills-Liste für hohe Anspannung'));
  check('Was eher schadet, Krise und Zusammenarbeit vorhanden', !!(await page.$('#ko-p-instabil .ko-ab-lassen')) && !!(await page.$('#ko-p-instabil .ko-ab-krise')) && !!(await page.$('#ko-p-instabil .ko-ab-zusammenarbeit')));
  const blatt = await page.$$eval('#ko-p-instabil .ko-material a[href^="apps/toolbox.html"]', l => l.map(a => a.getAttribute('href')));
  check('Arbeitsblätter in der ES-Fassung (Wut-Thermometer C2 → „Wut verstehen und steuern“)', blatt.includes('apps/toolbox.html#blatt=wut-verstehen') && !blatt.includes('apps/toolbox.html#blatt=wut-thermometer'), blatt);
  check('Lernmodule verlinkt (Emotionsregulation, Mentalisieren)', !!(await page.$('#ko-p-instabil a[href="apps/lernen.html#/modul/emotionsregulation"]')) && !!(await page.$('#ko-p-instabil a[href="apps/lernen.html#/modul/mentalisieren"]')));
  const kombi = await text('.ko-block:has(h3:text("Wenn mehreres zusammenkommt"))');
  check('Kombinationen: Borderline-Züge + ADHS, + Selbstverletzung, + Trauma', /Impulsivität beschleunigt Krisen/.test(kombi) && /Sicherheit zuerst: Suizidgedanken/.test(kombi) && /Stabilisierung geht vor/.test(kombi), kombi.slice(0, 200));
  check('Umgang nach Entwicklungsstufe: Stufe II, „Motivieren“', (await text('.ko-block:has(h3:text("Umgang nach der Entwicklungsstufe"))')).includes('Rolle der Erwachsenen: Motivieren'));
  const qn = await page.$$eval('#ko-quellen li', l => l.map(x => x.textContent));
  check('Quellen nummeriert, vollständig (Linehan 1993, Rathus & Miller 2015, NICE NG225)', qn.length >= 15 && qn.some(x => x.startsWith('Linehan, M. M. (1993)')) && qn.some(x => x.startsWith('Rathus, J. H. & Miller, A. L. (2015)')) && qn.some(x => x.includes('(NG225)')), qn.length);
  check('Jede Zahl verweist auf einen Eintrag der Liste', await page.$$eval('.ko-q', (l, n) => l.every(x => +x.getAttribute('data-nr') >= 1 && +x.getAttribute('data-nr') <= n), qn.length));
  await page.click('.ko-wichtig .ko-q'); await warte(500);
  check('Klick auf eine Quellenzahl öffnet die Quellenliste', await page.evaluate(() => document.getElementById('ko-quellen').open));
  await page.screenshot({ path: path.join(OUT, 'k1-kompass.png'), fullPage: false });
  await page.setViewportSize({ width: 1280, height: 3400 }); await page.evaluate(() => { document.querySelectorAll('.scroll').forEach(v => { v.scrollTop = 0; }); }); await warte(200);
  await page.screenshot({ path: path.join(OUT, 'k1-kompass-lang.png') });
  await page.setViewportSize({ width: 1280, height: 900 }); await warte(100);

  console.log('4) Ohne Responsable-Recht: keine Datenbank-Angaben');
  await page.evaluate(() => { window.__resp = CDSE_TEAM.istResponsable; CDSE_TEAM.istResponsable = () => false; });
  await neuZeichnen();
  const c2 = Object.fromEntries(await chips());
  const html = await page.innerHTML('#ko-ergebnis');
  check('Borderline-Züge nur noch aus Beobachtung („Starke Gefühlsschwankungen“, Beobachtet)', c2['Starke Gefühlsschwankungen'] === 'Beobachtet' && !c2['Emotionale Instabilität / Borderline-Züge'], c2);
  check('Kein Datenbank-Text im Kompass (F60.31, Z-Code, „nur Responsables“)', !html.includes('F60.31') && !html.includes('Z-Code') && !html.includes('ko-nurresp'), ['F60.31','Z-Code','ko-nurresp'].filter(s => html.includes(s)).map(s => s + ': ' + html.slice(Math.max(0, html.indexOf(s) - 200), html.indexOf(s) + 60)));
  check('ADHS bleibt Diagnose (steht im DS)', c2['ADHS'] === 'Diagnose');
  await page.evaluate(() => { CDSE_TEAM.istResponsable = window.__resp; });
  await neuZeichnen();

  console.log('5) Entscheidungen des Teams');
  await page.click('[data-ko="klaeren"][data-id="angst"]'); await warte(700);
  const c3 = Object.fromEntries(await chips());
  check('Rückfrage zugeordnet: Angststörung als Diagnose, Rückfrage weg', c3['Angststörung'] === 'Diagnose' && !(await text('.ko-kopf')).includes('Im DS steht „emotionale Störung“'), c3);
  check('„Warum?“ nennt die Zuordnung durch das Team', (await text('#ko-p-angst .ko-warum')).includes('emotionale Störung“, vom Team zugeordnet'));
  await page.click('[data-ko="ergaenzen"]'); await page.waitForSelector('dialog.ar-dialog');
  await page.selectOption('dialog.ar-dialog select[name="profil"]', 'autismus');
  await page.check('dialog.ar-dialog input[name="art"][value="verdacht"]');
  await page.fill('dialog.ar-dialog input[name="quelle"]', 'Bericht Kinderpsychiatrie, 03/2026');
  await dialogKnopf('Speichern'); await warte(300);
  const c4 = Object.fromEntries(await chips());
  check('Profil ergänzt: Autismus-Spektrum als Verdacht mit Quelle', c4['Autismus-Spektrum'] === 'Verdacht' && (await text('#ko-p-autismus .ko-warum')).includes('Bericht Kinderpsychiatrie, 03/2026'), c4);
  check('Kombination Autismus + Angst erscheint', (await text('#ko-ergebnis')).includes('Angst ist bei Autismus häufig'));
  await page.click('#ko-p-sozialverhalten > summary'); await warte(150);
  await page.click('#ko-p-sozialverhalten [data-ko="aus"]'); await page.waitForSelector('dialog.ar-dialog');
  await page.fill('dialog.ar-dialog input[name="grund"]', 'Aggression nur einmalig');
  await dialogKnopf('Ausblenden'); await warte(300);
  check('Ausgeblendet: „Regeln und Konflikte“ unten unter „Ausgeblendet (1)“ mit Grund', !(Object.fromEntries(await chips()))['Regeln und Konflikte'] && (await text('.ko-aus')).includes('Ausgeblendet (1)') && (await text('.ko-aus')).includes('Aggression nur einmalig'));
  await page.click('.ko-aus > summary'); await page.click('.ko-aus [data-ko="zuruecksetzen"]'); await warte(600);
  check('„Wieder zeigen“ holt es zurück', (Object.fromEntries(await chips()))['Regeln und Konflikte'] === 'Beobachtet');
  await page.evaluate(() => { document.getElementById('ko-p-instabil').open = true; });
  check('Einstufung nur aus der Datenbank: „nur Responsables“ am Profil', !!(await page.$('#ko-p-instabil summary .ko-nurresp')));
  await page.click('#ko-p-instabil [data-ko="teilen"]'); await page.waitForSelector('dialog.ar-dialog'); await dialogKnopf('Sichtbar machen'); await warte(300);
  await page.evaluate(() => { CDSE_TEAM.istResponsable = () => false; }); await neuZeichnen();
  check('Für das Team sichtbar gemacht: ohne Responsable-Recht jetzt Verdacht (vom Team)', (Object.fromEntries(await chips()))['Emotionale Instabilität / Borderline-Züge'] === 'Verdacht' && (await text('#ko-p-instabil .ko-warum')).includes('Vom Team eingetragen (Verdacht): Datenbank-Angabe'));
  await page.evaluate(() => { CDSE_TEAM.istResponsable = window.__resp; }); await neuZeichnen();
  await page.click('.ar-tabs [data-tab="verlauf"]'); await warte(200);
  const prot = await text('.ar-protokoll');
  check('Protokoll: Einträge des Kompass (zugeordnet, Verdacht eingetragen, ausgeblendet, zurückgesetzt)', prot.includes('Kompass: „Autismus-Spektrum“ als Verdacht eingetragen – Bericht Kinderpsychiatrie, 03/2026') && prot.includes('ausgeblendet') && prot.includes('zurückgesetzt'), prot.slice(0, 300));

  console.log('6) Überblick, leeres Dossier, schmal');
  await page.click('.ar-tabs [data-tab="ueberblick"]'); await warte(200);
  check('Überblick: Kurzkarte „Kompass“ mit Profilen', (await text('.ko-kurzkarte')).includes('ADHS') && (await page.$$('.ko-kurzkarte .ko-pchip')).length >= 4);
  await page.click('.ko-kurzkarte [data-tab="kompass"]'); await warte(250);
  check('Kurzkarte führt zum Kompass', await page.isVisible('#ko-ergebnis'));
  await reiter(ids.ben, 'kompass');
  check('Leeres Dossier: „Noch kein Profil erkennbar“ mit Hinweis auf „Profil ergänzen“', (await text('.ko-kopf')).includes('Noch kein Profil erkennbar') && (await text('.ko-kopf')).includes('Profil ergänzen'));
  await page.click('.ar-tabs [data-tab="ueberblick"]'); await warte(200);
  check('Leeres Dossier: keine Kurzkarte im Überblick', !(await page.$('.ko-kurzkarte')));
  await page.setViewportSize({ width: 390, height: 844 });
  await reiter(ids.lea, 'kompass');
  check('390 px: kein seitliches Scrollen', (await quer()) <= 1, await quer());
  await page.screenshot({ path: path.join(OUT, 'k2-schmal.png') });
  await page.click('#ko-p-instabil > summary'); await warte(100);
  if (!(await page.evaluate(() => document.getElementById('ko-p-instabil').open))) await page.click('#ko-p-instabil > summary');
  check('390 px, Profil offen: kein seitliches Scrollen', (await quer()) <= 1, await quer());

  check('Keine Fehler in der Konsole', errors.length === 0, errors);
  await browser.close();
  console.log('\n' + ok + ' bestanden, ' + bad + ' fehlgeschlagen (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
