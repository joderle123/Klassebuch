// Test: Begleitplan im Dossier – Schritte aus dem Dossier ableiten (Phasen, automatisch erledigt, dringend,
// fällig, geplant), „Als Nächstes“, Entscheidungen des Teams (erledigt, später, passt nicht, wieder offen),
// Fokusziele aus der ELDiB, Beobachtung zum Ziel, eigene Schritte, Überprüfung mit Kennzahlen, wiederkehrende
// Schritte, Krisenplan nach neuem Warnsignal wieder offen, Erledigtes eingeklappt, Fehler beim Speichern, Nur-Lesen,
// Kurzkarte im Überblick, Protokoll, 390 px. Nur erfundene Personen.
// Aufruf: node tests/begleitplan.js   (BASE=… für eine andere Hub-Datei)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8099/hub.html';
const OUT = path.join(__dirname, 'begleitplan-aus'); fs.mkdirSync(OUT, { recursive: true });
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
  async function schritt(key) { return page.evaluate(k => { const el = document.querySelector('.bp-schritt[data-key="' + k + '"]'); if (!el) return null; const c = el.className.replace('bp-schritt', '').replace('wichtig', '').trim(); return { status: c, text: el.textContent }; }, key); }
  async function plan() { return page.evaluate(() => { const d = CDSE_ARBEIT.hilfen.aktDossier(); return CDSE_BEGLEITPLAN.schritte(d, CDSE_TEAM.rechte(d)); }); }
  async function dialogKnopf(t) { await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("' + t + '")'); await warte(450); }
  async function quer() { return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); }
  const tage = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

  await page.goto(BASE);
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); for await (const [n] of r.entries()) { await r.removeEntry(n, { recursive: true }); } localStorage.clear(); sessionStorage.clear(); });
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); await r.getFileHandle('hub.html', { create: true }); });
  await page.reload();
  await page.click('#g-ordner'); await page.waitForSelector('#g-name');

  console.log('1) Neues Dossier: Grundschritte');
  await erstelle('Mia Muster', 'diagnostique', 'ein sicheres Passwort 1');
  await gehe('#/schueler'); await page.waitForSelector('[data-ar="einrichten"]'); await page.click('[data-ar="einrichten"]');
  await page.waitForSelector('[data-ar="neu"]', { timeout: 20000 });
  const tom = await page.evaluate(async () => (await CDSE_TEAM.neuesDossier({ nachname: 'Muster', vorname: 'Tom', geschlecht: 'm', geburtsdatum: '2014-05-05', klasse: 'C4.1' }, { stelle: 'annexe' })).id);
  await reiter(tom, 'begleitplan');
  await page.waitForSelector('#bp-plan');
  check('Reiter „Begleitplan“ nach „Kompass“', (await page.$$eval('.ar-tabs button', l => l.map(x => x.getAttribute('data-tab')))).slice(0, 3).join() === 'ueberblick,kompass,begleitplan');
  check('Fünf Phasen: Ankommen, Verstehen, Planen, Umsetzen, Überprüfen', (await page.$$eval('.bp-phasen .bp-pname', l => l.map(x => x.textContent))).join() === 'Ankommen,Verstehen,Planen,Umsetzen,Überprüfen');
  check('Fallverantwortliche automatisch erledigt (Mia Muster)', (await schritt('verantwortlich')).status === 'erledigt' && (await schritt('verantwortlich')).text.includes('Mia Muster'));
  check('Als Nächstes: Fiche vervollständigen (erster offener Schritt)', (await text('.bp-naechster h3')) === 'Fiche de renseignement vervollständigen', await text('.bp-naechster h3'));
  check('Offen: Elterngespräch, Kennenlerngespräch, DS, ELDiB, Screening', ['eltern-erst', 'kind-erst', 'ds', 'eldib', 'screening'].every(async k => true) && (await schritt('eltern-erst')).status === 'offen' && (await schritt('ds')).status === 'offen' && (await schritt('screening')).status === 'offen');
  check('Überprüfung ruht, bis der Plan läuft', (await schritt('review')).status === 'geplant' && (await schritt('review')).text.includes('beginnt später'));
  const p1 = await plan();
  check('Fortschritt: 1 von 7 erledigt', p1.fertig === 1 && p1.gesamt === 7, [p1.fertig, p1.gesamt]);

  console.log('2) Daten kommen dazu: DS, ELDiB, Screening mit Warnsignal, Vorfall, Elterngespräch');
  const codes = await page.evaluate(async ([id, vor10, vor2]) => {
    const T = CDSE_TEAM, B = ELDIB_BANK.bereiche;
    const alle = (b, s) => B[b].stufen[s].items.map(i => i.code);
    const erreicht = [...alle('verhalten', 1), ...alle('sozialisation', 1), ...alle('sozialisation', 2)];
    const ziele = [alle('verhalten', 2)[0], alle('verhalten', 2)[1], alle('sozialisation', 3)[0]];
    await T.ops.profil(id, { quelle: 'eldib', datum: vor10, ds: { v: 2, f: {}, frei: {}, tabellen: {}, chips: { diagnosen: ['adhs'] }, bewertungen: { s_konz: 2, s_unruhe: 7, k_druck: 5 } },
      eldib: { v: 2, datum: vor10, erreicht, ziele } }, 'Test-Profil');
    const bog = CDSE_SCREENING_BOGEN, antworten = {};
    bog.bereiche.forEach(b => b.items.forEach(i => { antworten[i.id] = b.id === 'aufmerksamkeit' ? 3 : 0; }));
    bog.staerken.items.forEach(i => { antworten[i.id] = 2; });
    await T.ops.screening(id, { datum: vor2, stufe: 'GS', rolle: 'educ', version: 1, antworten, auswirkung: { dauer: 'lang', leiden: '1', lernen: '2', beziehungen: '1', gruppe: '1', orte: 'mehrere', ereignis: 'nein' }, warn: ['selbstverletzung'], warnNotiz: 'Test', notiz: '' });
    await T.ops.eintrag(id, { datum: vor2, art: 'vorfall', titel: 'Vorfall', text: 'Streit in der Pause, Tom hat geschlagen.', vorfall: { zeit: '10:15', situation: 'Pause', ort: 'Hof', timeoutVon: '10:20', timeoutBis: '10:35' } });
    await T.ops.eintrag(id, { datum: vor10, art: 'gespraech_eltern', titel: 'Erstgespräch', text: 'Kennenlernen, Anliegen.' });
    return ziele;
  }, [tom, tage(10), tage(2)]);
  await page.evaluate(async id => { CDSE_ARBEIT.hilfen.dossierZeichnen(await CDSE_TEAM.dossier(id)); }, tom); await warte(200);
  check('DS und ELDiB automatisch erledigt', (await schritt('ds')).status === 'erledigt' && (await schritt('eldib')).status === 'erledigt');
  check('Elterngespräch automatisch erledigt (Eintrag im Dossier)', (await schritt('eltern-erst')).status === 'erledigt' && (await schritt('eltern-erst')).text.includes('Gespräch am'));
  const warnKey = await page.$eval('.bp-sofort .bp-schritt', el => el.getAttribute('data-key'));
  check('Sofort: Warnsignal „Hinweise auf Selbstverletzung“ als dringend', /^warn:/.test(warnKey) && (await schritt(warnKey)).status === 'dringend' && (await schritt(warnKey)).text.includes('Hinweise auf Selbstverletzung'));
  check('Als Nächstes: das Warnsignal', (await text('.bp-naechster h3')).startsWith('Warnsignal vom') && (await page.getAttribute('.bp-naechster', 'class')).includes('dringend'));
  check('Krisenplan dringend (Selbstverletzung), mit Sicherheitsplan und Nachgespräch als Material', (await schritt('krisenplan')).status === 'dringend' && /Nach einer Krise/.test((await schritt('krisenplan')).text));
  const vorfallKey = await page.$eval('.bp-schritt[data-key^="nachgespraech:"]', el => el.getAttribute('data-key'));
  check('Nachgespräch zum Vorfall: fällig am Vorfalldatum + 3 Tage', !!vorfallKey && ['offen', 'faellig'].includes((await schritt(vorfallKey)).status) && (await schritt(vorfallKey)).text.includes('fällig'));
  check('Aus dem Kompass (ADHS): „Umgang im Team absprechen“ und „Verstärkerplan“', !!(await schritt('umgang')) && (await schritt('verstaerker')).text.includes('ADHS'));
  check('Fokusziele: offen, 3 Förderziele zur Auswahl', (await schritt('fokus')).status === 'offen' && (await schritt('fokus')).text.includes('3 Förderziele'));
  check('Screening: eine Einschätzung – zweite Person empfohlen', (await schritt('screening')).text.includes('Bisher eine Einschätzung'));
  const reihe = await page.$$eval('#bp-plan > *', l => l.map(x => x.className));
  check('„Sofort“ direkt unter „Als Nächstes“ (vor Fokuszielen, Tageskarte, Kindmodus)', reihe.findIndex(c => c.includes('bp-sofort')) === reihe.findIndex(c => c.includes('bp-naechster')) + 1, reihe);
  check('Erledigte Schritte eingeklappt: „Erledigt (n) anzeigen“', !!(await page.$('#bp-phase-start details.bp-erledigt:not([open]) .bp-schritt[data-key="verantwortlich"]')) && /^Erledigt \(\d+\) anzeigen$/.test((await text('#bp-phase-start details.bp-erledigt summary')).trim()));
  await page.screenshot({ path: path.join(OUT, 'b1-plan.png') });

  console.log('3) Entscheidungen des Teams');
  await page.click('.bp-naechster [data-bp="erledigt"]'); await warte(500);
  check('Warnsignal erledigt → Als Nächstes: Krisenplan', (await schritt(warnKey)).status === 'erledigt' && (await text('.bp-naechster h3')) === 'Krisen- und Sicherheitsplan erstellen');
  await page.click('.bp-naechster [data-bp="spaeter"]'); await page.waitForSelector('dialog.ar-dialog');
  await page.fill('dialog.ar-dialog input[name="notiz"]', 'Termin mit Kinderpsychiatrie abwarten'); await dialogKnopf('Später');
  const kp = await schritt('krisenplan');
  check('Krisenplan auf später gelegt, mit Datum und Notiz', kp.status === 'spaeter' && kp.text.includes('auf später gelegt bis') && kp.text.includes('Kinderpsychiatrie'), kp);
  const kp13 = await page.evaluate(() => {
    const d = JSON.parse(JSON.stringify(CDSE_ARBEIT.hilfen.aktDossier()));
    d.begleitplan.schritte.krisenplan = { status: 'erledigt', z: new Date(Date.now() - 20 * 864e5).toISOString(), von: CDSE_KONTO.ich().id };
    const vorher = CDSE_BEGLEITPLAN.schritte(d, CDSE_TEAM.rechte(d)).liste.find(s => s.key === 'krisenplan');
    d.begleitplan.schritte.krisenplan.z = new Date().toISOString();
    const nachher = CDSE_BEGLEITPLAN.schritte(d, CDSE_TEAM.rechte(d)).liste.find(s => s.key === 'krisenplan');
    return { vorher: vorher.status, warum: vorher.warum, nachher: nachher.status };
  });
  check('Krisenplan „erledigt“ vor dem neuesten Warnsignal → wieder dringend (mit Grund); danach erledigt', kp13.vorher === 'dringend' && /^Neues Warnsignal am /.test(kp13.warum) && kp13.nachher === 'erledigt', kp13);
  check('Kennenlerngespräch automatisch erledigt: Sicht des Kindes steht im DS', (await schritt('kind-erst')).status === 'erledigt' && (await schritt('kind-erst')).text.includes('Im DS erfasst'));
  await page.click('.bp-schritt[data-key="verstaerker"] [data-bp="passt-nicht"]'); await page.waitForSelector('dialog.ar-dialog');
  await page.fill('dialog.ar-dialog input[name="notiz"]', 'Läuft schon über die Klasse'); await dialogKnopf('Passt nicht');
  check('Passt nicht: Schritt unten unter „Passt nicht (1)“', !(await page.$('#bp-phase-planen .bp-schritt[data-key="verstaerker"]')) && (await text('.bp-weg summary')).includes('Passt nicht (1)'));
  await page.click('.bp-weg > summary'); await page.click('.bp-weg [data-bp="offen"]'); await warte(500);
  check('Wieder offen: zurück in „Planen“', !!(await page.$('#bp-phase-planen .bp-schritt[data-key="verstaerker"]')) && (await schritt('verstaerker')).status === 'offen');

  console.log('4) Fokusziele und Beobachtung');
  await page.click('.bp-schritt[data-key="fokus"] [data-bp="fokus"]'); await page.waitForSelector('dialog.ar-dialog');
  const nWahl = await page.$$eval('dialog.ar-dialog .bp-wahl input[type=checkbox]', l => l.length);
  check('Dialog: Förderziele und nächste Schritte zur Auswahl', nWahl >= 3, nWahl);
  for (const c of codes) await page.check('dialog.ar-dialog input[value="' + c + '"]');
  const vierter = await page.$$eval('dialog.ar-dialog .bp-wahl input[type=checkbox]:not(:checked)', l => l.length ? l[0].value : '');
  if (vierter) await page.check('dialog.ar-dialog input[value="' + vierter + '"]');
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Speichern")'); await warte(300);
  check('Mehr als drei Ziele: Hinweis, nicht gespeichert', vierter ? (await text('dialog.ar-dialog .ar-dialog-fehler')).includes('höchstens drei') : true);
  if (vierter) await page.uncheck('dialog.ar-dialog input[value="' + vierter + '"]');
  await page.uncheck('dialog.ar-dialog input[value="' + codes[2] + '"]');
  await dialogKnopf('Speichern');
  const fok = await page.$$eval('.bp-fokus .bp-code', l => l.map(x => x.textContent));
  check('Zwei Fokusziele gespeichert und oben angezeigt', fok.join() === codes.slice(0, 2).join(), fok);
  check('Fokus-Schritt automatisch erledigt', (await schritt('fokus')).status === 'erledigt');
  check('Umsetzen: je Fokusziel „Fortschritt beobachten“', !!(await schritt('ziel:' + codes[0])) && !!(await schritt('ziel:' + codes[1])));
  check('Plan läuft: Überprüfung geplant in sechs Wochen, Austausch mit den Eltern geplant', (await schritt('review')).status === 'geplant' && (await schritt('review')).text.includes('nächster Termin') && !!(await schritt('eltern-regel')));
  check('Neuer Schritt: Fokusziele mit den Eltern besprechen', (await schritt('eltern-ziele')).status === 'offen');
  await page.click('.bp-schritt[data-key="ziel:' + codes[0] + '"] [data-ar="ziel-eintrag"]'); await page.waitForSelector('dialog.ar-dialog');
  await page.fill('dialog.ar-dialog textarea[name="text"]', 'Hat heute dreimal selbst gewartet, bis er dran war.'); await dialogKnopf('Speichern');
  await page.click('.ar-tabs [data-tab="begleitplan"]'); await warte(250);
  check('Beobachtung eingetragen → Ziel „läuft“', (await schritt('ziel:' + codes[0])).status === 'laufend' && (await schritt('ziel:' + codes[0])).text.includes('läuft'));

  console.log('5) Eigener Schritt, wiederkehrende Schritte, Überprüfung');
  await page.click('[data-bp="eigen-neu"]'); await page.waitForSelector('dialog.ar-dialog');
  check('„Zuständig“: Fallverantwortliche zuerst (eigene Gruppe)', (await page.$eval('dialog.ar-dialog select[name="wer"]', s => { const g = s.querySelector('optgroup[label="Fallverantwortlich"] option'); return g ? g.textContent : ''; })) === 'Mia Muster');
  await page.fill('dialog.ar-dialog input[name="titel"]', 'Termin mit dem SCAS vereinbaren');
  await page.selectOption('dialog.ar-dialog select[name="phase"]', 'start');
  await page.fill('dialog.ar-dialog input[name="bis"]', tage(-7));
  await dialogKnopf('Speichern');
  const eig = await page.$eval('#bp-phase-start .bp-schritt[data-key^="eigen:"]', el => ({ key: el.getAttribute('data-key'), t: el.textContent }));
  check('Eigener Schritt in „Ankommen“ mit Frist', eig.t.includes('Termin mit dem SCAS vereinbaren') && eig.t.includes('fällig am'), eig.t);
  await page.click('.bp-schritt[data-key="' + eig.key + '"] [data-bp="eigen-erledigt"]'); await warte(500);
  check('Eigener Schritt erledigt (mit Name)', (await schritt(eig.key)).status === 'erledigt' && (await schritt(eig.key)).text.includes('Mia Muster'));
  await page.evaluate(() => { const b = document.querySelector('.bp-schritt[data-key="eltern-regel"] [data-bp="erledigt"]'); if (b) b.click(); }); await warte(500);
  const er = await schritt('eltern-regel');
  check('Austausch mit den Eltern: nach „erledigt“ wieder geplant (nächster Termin in vier Wochen)', er.status === 'geplant' && er.text.includes('nächster Termin'), er);
  /* ein Vorfall nach dem Start des Plans */
  await page.evaluate(async ([id, heute]) => {
    await CDSE_TEAM.ops.eintrag(id, { datum: heute, art: 'vorfall', titel: 'Vorfall', text: 'Wutausbruch beim Warten.', vorfall: { zeit: '11:00', situation: 'Übergang', timeoutVon: '11:05', timeoutBis: '11:20' } });
    CDSE_ARBEIT.hilfen.dossierZeichnen(await CDSE_TEAM.dossier(id));
  }, [tom, tage(0)]); await warte(250);
  check('Neuer Vorfall nach dem Start: Nachgespräch erscheint', (await page.$$('.bp-schritt[data-key^="nachgespraech:"]')).length === 2);
  await page.click('.bp-schritt[data-key="review"] [data-bp="review"]'); await page.waitForSelector('dialog.ar-dialog');
  const dlg = await text('dialog.ar-dialog');
  check('Überprüfung: Kennzahlen seit dem Start des Plans (1 Vorfall, 15 Min. Time-out, 1 Beobachtung)', dlg.includes('1 Vorfall') && dlg.includes('15 Min. Time-out') && dlg.includes('1 Beobachtung'), dlg.slice(0, 300));
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Speichern")'); await warte(200);
  check('Überprüfung ohne Notiz: Hinweis', (await text('dialog.ar-dialog .ar-dialog-fehler')).includes('festhalten'));
  await page.fill('dialog.ar-dialog textarea[name="notiz"]', 'Warten klappt besser. Punkteplan beibehalten, Pause strukturieren.');
  const heuteLokal = await page.evaluate(() => CDSE_ARBEIT.hilfen.heuteIso());
  check('Datum der Überprüfung höchstens heute (max)', (await page.getAttribute('dialog.ar-dialog input[name="datum"]', 'max')) === heuteLokal);
  await page.fill('dialog.ar-dialog input[name="datum"]', '2062-01-01');
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Speichern")'); await warte(200);
  check('Tippfehler 2062: Hinweis „Zukunft“, nicht gespeichert', (await text('dialog.ar-dialog .ar-dialog-fehler')).includes('Zukunft'));
  await page.fill('dialog.ar-dialog input[name="datum"]', heuteLokal);
  await dialogKnopf('Speichern');
  check('Überprüfung gespeichert und angezeigt', (await text('.bp-reviews')).includes('Punkteplan beibehalten') && (await text('.bp-reviews')).includes('1 Vorfall'));
  check('Nächste Überprüfung wieder in sechs Wochen geplant', (await schritt('review')).status === 'geplant' && (await schritt('review')).text.includes('Letzte Überprüfung am'));

  /* Speichern schlägt fehl: Knopf wieder frei, Meldung bleibt stehen */
  await page.evaluate(() => { window.__ps = CDSE_TEAM.ops.planSchritt; CDSE_TEAM.ops.planSchritt = () => Promise.reject(new Error('Die Datei ist gerade belegt (Test).')); });
  await page.click('.bp-schritt[data-key="umgang"] [data-bp="erledigt"]'); await page.waitForSelector('dialog.ar-dialog');
  check('Fehler beim Speichern: Meldung im Dialog, Knopf wieder frei', (await text('dialog.ar-dialog')).includes('gerade belegt') && await page.isEnabled('.bp-schritt[data-key="umgang"] [data-bp="erledigt"]') && (await schritt('umgang')).status === 'offen');
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Schließen")'); await warte(300);
  await page.evaluate(() => { CDSE_TEAM.ops.planSchritt = window.__ps; });

  const ueb = await page.evaluate(() => CDSE_ARBEIT.hilfen.uebergabeHtml(CDSE_ARBEIT.hilfen.aktDossier()));
  check('Übergabeblatt: Begleitplan mit Fortschritt, Fokuszielen, offenen Schritten und letzter Überprüfung', ueb.includes('<h2>Begleitplan</h2>') && ueb.includes('Schritten erledigt') && ueb.includes('<h3>Fokusziele</h3>') && ueb.includes('Offene Schritte') && ueb.includes('Punkteplan beibehalten'));
  console.log('6) Überblick, Protokoll, Nur-Lesen, schmal');
  await page.click('.ar-tabs [data-tab="ueberblick"]'); await warte(200);
  check('Überblick: Kurzkarte „Begleitplan“ mit Fortschritt und „Als Nächstes“', (await text('.bp-kurzkarte')).includes('Als Nächstes:') && /\d+ von \d+/.test(await text('.bp-kurzkarte')));
  await page.click('.bp-kurzkarte [data-tab="begleitplan"]'); await warte(250);
  check('Kurzkarte führt zum Begleitplan', await page.isVisible('#bp-plan'));
  await page.click('.ar-tabs [data-tab="verlauf"]'); await warte(200);
  const prot = await text('.ar-protokoll');
  check('Protokoll: erledigt, später, passt nicht, Fokus, eigener Schritt, Überprüfung', ['erledigt', 'auf später gelegt', 'passt nicht', 'Fokusziele', 'eigener Schritt', 'Überprüfung vom'].every(t => prot.includes(t)), prot.slice(0, 400));
  await page.click('.ar-tabs [data-tab="begleitplan"]'); await warte(200);
  await page.evaluate(() => { window.__r = CDSE_TEAM.rechte; CDSE_TEAM.rechte = d => Object.assign({}, window.__r(d), { bearbeiten: false, weitergeben: false }); });
  await neuZeichnen();
  check('Nur lesen: keine Knöpfe zum Entscheiden, kein „Eigener Schritt“', !(await page.$('#bp-plan [data-bp="erledigt"]')) && !(await page.$('#bp-plan [data-bp="eigen-neu"]')) && !(await page.$('#bp-plan [data-bp="spaeter"]')));
  await page.evaluate(() => { CDSE_TEAM.rechte = window.__r; }); await neuZeichnen();
  await page.setViewportSize({ width: 390, height: 844 });
  await reiter(tom, 'begleitplan');
  check('390 px: kein seitliches Scrollen', (await quer()) <= 1, await quer());
  await page.screenshot({ path: path.join(OUT, 'b2-schmal.png') });
  await page.setViewportSize({ width: 1280, height: 3000 }); await page.evaluate(() => { document.querySelectorAll('.scroll').forEach(v => { v.scrollTop = 0; }); }); await warte(200);
  await page.screenshot({ path: path.join(OUT, 'b3-lang.png') });

  check('Keine Fehler in der Konsole', errors.length === 0, errors);
  await browser.close();
  console.log('\n' + ok + ' bestanden, ' + bad + ' fehlgeschlagen (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
