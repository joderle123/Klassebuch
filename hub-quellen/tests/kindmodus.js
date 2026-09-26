// Test: Kindmodus (S1–S3) – Karte im Begleitplan, Einrichten (Vorschläge aus Tageskarte und Fokuszielen), Start mit Code,
// geschützter Bildschirm (keine Dossierdaten, Escape schließt nicht, Dossier ausgeräumt, kein Kontextmenü), Ziel-Quest (Kind,
// Übergabe, Erwachsene, Extra-Stern, Welt wächst, Belohnung, Doppeltippen zählt nicht), Stopp-Ampel (Szene, Thermometer,
// Körpersignale, Rot/Gelb/Grün, Übungen, danach), Atem-Raumschiff (auch bei gesperrtem Schülerbereich: gemerkt, nachgeholt),
// Beenden nur mit Code, Neuladen sperrt, zu viele Versuche, „Code vergessen? Hub sperren“ (mit Rückfrage, Kindmodus endet erst
// nach dem Passwort), Karte/Überblick/Überprüfung/Verlauf, Nur-Lesen, 390 px.
// Nur erfundene Personen. Aufruf: node tests/kindmodus.js   (BASE=… für eine andere Hub-Datei, AUS=… für die Bilder)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8099/hub.html';
const OUT = process.env.AUS || path.join(__dirname, 'kindmodus-aus'); fs.mkdirSync(OUT, { recursive: true });
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
  const bild = async n => { await page.screenshot({ path: path.join(OUT, n + '.png') }); };
  async function gehe(hash) { await page.evaluate(h => { location.hash = h; }, hash); await warte(400); }
  async function kontoFertig() { await page.waitForSelector('#g-code', { timeout: 30000 }); await page.check('#g-ok'); await page.click('#g-weiter'); await page.waitForSelector('#me:not([hidden])', { timeout: 30000 }); }
  async function erstelle(name, team, pw) {
    await page.fill('#g-name', name); await page.check('input[name="g-team"][value="' + team + '"]'); await page.selectOption('#g-resp', '-');
    await page.fill('#g-pw1', pw); await page.fill('#g-pw2', pw); await page.click('#g-los'); await kontoFertig();
  }
  async function reiter(id, tab) { await gehe('#/'); await gehe('#/schueler/' + id); await page.waitForSelector('.ar-tabs [data-tab="' + tab + '"]', { timeout: 20000 }); await page.click('.ar-tabs [data-tab="' + tab + '"]'); await warte(250); }
  async function dialogKnopf(t) { await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("' + t + '")'); await warte(500); }
  let tom = '';
  async function km() { return page.evaluate(async id => (await CDSE_TEAM.dossier(id)).kindmodus, tom); }
  const kk = sel => page.click('#km-dialog ' + sel);
  const kmText = () => page.textContent('#km-dialog');
  async function tempo(t) { await page.evaluate(t => CDSE_KINDMODUS._test.tempo(t), t); }
  // Im Kindmodus zählt Tippen kurz nach einem neuen Bildschirm nicht (Doppeltippen). Der Test klickt schneller als ein Kind:
  // Pause aus (nach jedem Neuladen wieder), geprüft wird sie in Abschnitt 4 eigens.
  async function schnell() { await page.evaluate(() => CDSE_KINDMODUS._test.tippPause(0)); }
  async function schirm() { return page.evaluate(() => CDSE_KINDMODUS._test.schirm()); }
  async function warteSchirm(n, ms) { const bis = Date.now() + (ms || 8000); while (Date.now() < bis) { if (await schirm() === n) return true; await warte(60); } return false; }
  async function starteKindmodus(pin) {
    await page.click('#km-karte [data-km="start"]'); await page.waitForSelector('dialog.ar-dialog');
    await page.fill('dialog.ar-dialog input[name="pin"]', pin); await page.fill('dialog.ar-dialog input[name="pin2"]', pin);
    await page.uncheck('dialog.ar-dialog input[name="voll"]'); await dialogKnopf('Starten');
    await page.waitForSelector('#km-dialog[open] .km-hallo', { timeout: 10000 });
  }
  async function codeEingeben(pin) { for (const z of pin) { await page.click('#km-dialog .km-taste[data-z="' + z + '"]'); await warte(40); } await warte(400); }
  async function quer(sel) { return page.evaluate(s => { const el = s ? document.querySelector(s) : document.documentElement; return el.scrollWidth - el.clientWidth; }, sel); }
  const tag = n => { const d = new Date(Date.now() + n * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const heute = tag(0);
  const montag = (() => { const d = new Date(heute + 'T12:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();

  await page.goto(BASE);
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); for await (const [n] of r.entries()) { await r.removeEntry(n, { recursive: true }); } localStorage.clear(); sessionStorage.clear(); });
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); await r.getFileHandle('hub.html', { create: true }); });
  await page.reload();
  await page.click('#g-ordner'); await page.waitForSelector('#g-name');
  await schnell();

  console.log('1) Tom: Fokusziele und Tageskarte, Karte „Kindmodus“ im Begleitplan');
  await erstelle('Mia Muster', 'diagnostique', 'ein sicheres Passwort 1');
  await gehe('#/schueler'); await page.waitForSelector('[data-ar="einrichten"]'); await page.click('[data-ar="einrichten"]');
  await page.waitForSelector('[data-ar="neu"]', { timeout: 20000 });
  tom = await page.evaluate(async vor10 => {
    const T = CDSE_TEAM, B = ELDIB_BANK.bereiche;
    const id = (await T.neuesDossier({ nachname: 'Muster', vorname: 'Tom', geschlecht: 'm', geburtsdatum: '2015-03-03', klasse: 'C3.2' }, { stelle: 'annexe' })).id;
    const alle = (b, s) => B[b].stufen[s].items.map(i => i.code);
    const ziele = [alle('verhalten', 2)[0], alle('verhalten', 2)[1]];
    await T.ops.profil(id, { quelle: 'eldib', datum: vor10, ds: { v: 2, f: {}, frei: {}, tabellen: {}, chips: { diagnosen: ['adhs'] }, bewertungen: {} }, eldib: { v: 2, datum: vor10, erreicht: alle('verhalten', 1), ziele } }, 'Test-Profil');
    await T.ops.planFokus(id, ziele);
    await T.ops.tageskarte(id, { ziele: [{ code: ziele[0], text: 'Ich melde mich, bevor ich rede.' }], abschnitte: ['Morgen', 'Pause', 'Mittag'], ziel: 80 });
    window.__tom = id;
    return id;
  }, tag(-10));
  await reiter(tom, 'begleitplan');
  check('Karte „Kindmodus“ erscheint kompakt mit „Einrichten“', (await text('#km-karte')).includes('Das Kind übt selbst') && !!(await page.$('#km-karte [data-km="einrichten"]')));

  console.log('2) Einrichten');
  await page.click('#km-karte [data-km="einrichten"]'); await page.waitForSelector('dialog.ar-dialog .km-e-figuren');
  const dv = await page.evaluate(() => { const f = document.querySelector('dialog.ar-dialog form'); return { spitz: f.elements.spitzname.value, ziel: f.elements.ziel.value, fig: document.querySelectorAll('dialog .km-e-figuren label').length, welt: document.querySelectorAll('dialog .km-e-welten label').length, vors: Array.from(f.elements.vorschlag.options).map(o => o.textContent), strat: ['atmen', 'weggehen', 'hilfe', 'zaehlen'].map(s => f.elements['s_' + s].checked) }; });
  check('Spitzname aus dem Vornamen, Ziel aus der Tageskarte vorbelegt', dv.spitz === 'Tom' && dv.ziel === 'Ich melde mich, bevor ich rede.', dv);
  check('Sechs Figuren und drei Welten zur Auswahl', dv.fig === 6 && dv.welt === 3, dv);
  check('Vorschläge: Tageskarte und das Fokusziel, das noch nicht auf der Tageskarte steht', dv.vors.length === 3 && dv.vors[1].startsWith('Tageskarte:') && dv.vors.filter(v => v.startsWith('Fokusziel')).length === 1, dv.vors);
  check('Vorgabe-Strategien: atmen, weggehen, Hilfe holen', dv.strat.join() === 'true,true,true,false', dv.strat);
  await page.selectOption('dialog.ar-dialog select[name="vorschlag"]', '1');  // Index 1 = das Fokusziel
  const fz = await page.evaluate(() => { const f = document.querySelector('dialog.ar-dialog form'); return { ziel: f.elements.ziel.value, code: f.elements.code.value, ph: f.elements.ziel.placeholder }; });
  check('Fokusziel gewählt: Ziel leer, Platzhalter mit dem ELDiB-Text, Code übernommen', fz.ziel === '' && /^In Kindersprache/.test(fz.ph) && fz.code.length > 1, fz);
  await dialogKnopf('Speichern');
  check('Ohne Ziel: Fehlermeldung', (await text('dialog.ar-dialog .ar-dialog-fehler')).includes('Wochenziel'));
  await page.fill('dialog.ar-dialog input[name="ziel"]', 'Ich warte, bis ich dran bin.');
  await page.click('dialog.ar-dialog .km-e-figuren input[value="eule"]', { force: true });
  await page.click('dialog.ar-dialog .km-e-welten input[value="burg"]', { force: true });
  await page.check('dialog.ar-dialog input[name="s_zaehlen"]');
  await page.fill('dialog.ar-dialog input[name="eigene"]', 'Knautschball drücken');
  const sz = await page.evaluate(() => ({ t: document.querySelector('#km-e-zahl').textContent, zu: ['pausenkarte', 'druecken', 'trinken'].map(s => document.querySelector('dialog.ar-dialog input[name="s_' + s + '"]').disabled) }));
  check('Strategien: Zähler „5 von höchstens 5“, weitere lassen sich nicht mehr anhaken', sz.t.startsWith('5 von höchstens 5') && sz.zu.every(Boolean), sz);
  await page.selectOption('dialog.ar-dialog select[name="schwelle"]', '5');
  await page.fill('dialog.ar-dialog input[name="b0"]', '10 Minuten Lieblingsspiel');
  await page.fill('dialog.ar-dialog input[name="b1"]', 'Sticker aussuchen');
  await page.screenshot({ path: path.join(OUT, '01-einrichten.png') });
  await dialogKnopf('Speichern');
  let d = await km();
  check('Gespeichert: Figur, Welt, Ziel mit Fokus-Code, Schwelle, Belohnungen', d && d.figur === 'eule' && d.welt === 'burg' && d.ziel === 'Ich warte, bis ich dran bin.' && d.code.length > 1 && d.schwelle === 5 && d.belohnungen.length === 2, d);
  check('Strategien: vier gewählte + eigene', d && d.strategien.join() === 'atmen,zaehlen,weggehen,hilfe,eigene' && d.eigene === 'Knautschball drücken', d && d.strategien);
  const kt = await text('#km-karte');
  check('Karte: Spitzname, Figur, Welt, Wochenziel, 0 Sterne, noch keine Runde', kt.includes('„Tom“ · Eule · Welt: Burg') && kt.includes('Ich warte, bis ich dran bin.') && kt.includes('Diese Woche: 0 Sterne') && kt.includes('Noch keine Runde geübt'), kt);
  check('Protokoll: „Kindmodus eingerichtet“', await page.evaluate(async id => (await CDSE_TEAM.dossier(id)).verlauf.some(v => /^Kindmodus eingerichtet/.test(v.t)), tom));
  await page.screenshot({ path: path.join(OUT, '02-karte.png'), fullPage: false });

  console.log('3) Starten mit Code');
  await page.click('#km-karte [data-km="start"]'); await page.waitForSelector('dialog.ar-dialog input[name="pin"]');
  await page.fill('dialog.ar-dialog input[name="pin"]', '471'); await page.fill('dialog.ar-dialog input[name="pin2"]', '471'); await dialogKnopf('Starten');
  check('Code mit drei Ziffern abgelehnt', (await text('dialog.ar-dialog .ar-dialog-fehler')).includes('vier Ziffern'));
  await page.fill('dialog.ar-dialog input[name="pin"]', '4711'); await page.fill('dialog.ar-dialog input[name="pin2"]', '4712'); await dialogKnopf('Starten');
  check('Verschiedene Codes abgelehnt', (await text('dialog.ar-dialog .ar-dialog-fehler')).includes('nicht gleich'));
  await page.fill('dialog.ar-dialog input[name="pin2"]', '4711'); await page.uncheck('dialog.ar-dialog input[name="voll"]'); await dialogKnopf('Starten');
  await page.waitForSelector('#km-dialog[open] .km-hallo', { timeout: 10000 });
  const s0 = await page.evaluate(() => ({ t: document.getElementById('km-dialog').textContent, sichtbar: getComputedStyle(document.querySelector('.hub')).visibility, klasse: document.body.classList.contains('km-an'), sitz: sessionStorage.getItem('cdse_kindmodus') }));
  check('Start: „Hallo, Tom!“ und drei Kacheln', s0.t.includes('Hallo, Tom!') && (await page.$$('#km-dialog .km-kachel')).length === 3, s0.t.slice(0, 200));
  check('Keine Dossierdaten im Kindmodus (Nachname, Klasse, Codes, Diagnose)', !/Muster|C3\.2|adhs|ADHS|Mia/.test(s0.t) && !s0.t.includes(d.code), s0.t);
  check('Hub dahinter unsichtbar', s0.sichtbar === 'hidden' && s0.klasse, s0);
  check('Code nur als Prüfwert gespeichert, nicht im Klartext', !!s0.sitz && !s0.sitz.includes('4711') && /sha256:|c53:/.test(s0.sitz), s0.sitz);
  await page.keyboard.press('Escape'); await warte(300); await page.keyboard.press('Escape'); await warte(300);
  check('Escape schließt den Kindmodus nicht', await page.evaluate(() => !!document.querySelector('#km-dialog[open]')));
  const aus = await page.evaluate(() => { const ds = document.getElementById('ar-dossier'); return { da: !!ds, leer: !!ds && !ds.firstChild, text: document.getElementById('arbeit-body').textContent }; });
  check('Dossier im Hub dahinter ausgeräumt (nicht nur unsichtbar)', aus.da && aus.leer && !/Muster|C3\.2/.test(aus.text), aus);
  check('Kein Kontextmenü im Kindmodus (lange drücken, rechte Maustaste)', await page.evaluate(() => { const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); document.querySelector('#km-dialog .km-kachel').dispatchEvent(e); return e.defaultPrevented; }));
  await bild('03-start');

  console.log('4) Ziel-Quest');
  await kk('.km-kachel.quest'); await page.waitForSelector('#km-dialog .km-quest');
  check('Quest: Wochenziel und Welt Burg, Stufe 0', (await kmText()).includes('Ich warte, bis ich dran bin.') && !!(await page.$('#km-dialog .km-quest-welt svg[aria-label="Burg: Stufe 0 von 12"]')));
  await bild('04-quest');
  // Doppeltippen: Das zweite Tippen direkt nach dem neuen Schritt zählt nicht (Pause wie im echten Betrieb)
  await page.evaluate(() => CDSE_KINDMODUS._test.tippPause(500));
  await kk('.km-gesicht[data-k="q-kind"][data-p="2"]'); await page.click('#km-dialog [data-k="q-uebergabe"]');
  check('Nach dem Kind: eigener Übergabe-Schritt; ein Doppeltippen landet nicht bei den Erwachsenen', !!(await page.$('#km-dialog [data-k="q-uebergabe"]')) && !(await page.$('#km-dialog .km-wahl3.erw')) && (await kmText()).includes('Jetzt die oder der Erwachsene'));
  await warte(600); await schnell();
  await kk('[data-k="q-uebergabe"]'); await page.waitForSelector('#km-dialog .km-wahl3.erw');
  check('Nach der Übergabe: Frage an die Erwachsenen', (await kmText()).includes('die oder der Erwachsene'));
  await kk('.km-gesicht[data-k="q-erw"][data-p="2"]'); await page.waitForSelector('#km-dialog .km-ergebnis .km-plus', { timeout: 10000 });
  let qt = await kmText();
  check('Einig: +3 Sterne mit Extra-Stern', qt.includes('+3 Sterne') && qt.includes('Ihr seid euch einig'), qt.slice(0, 300));
  check('Welt wächst auf Stufe 3', !!(await page.$('#km-dialog .km-quest-welt svg[aria-label="Burg: Stufe 3 von 12"]')));
  check('Noch 2 Sterne bis zur Belohnung', qt.includes('Noch 2 Sterne bis zur Belohnung'));
  d = await km();
  check('Gespeichert: heute Kind 2, Erwachsene 2 (mit Wochenziel)', d.wochen[montag] && d.wochen[montag].tage[heute].k === 2 && d.wochen[montag].tage[heute].e === 2 && d.wochen[montag].ziel === 'Ich warte, bis ich dran bin.', d.wochen);
  await bild('05-quest-sterne');
  await kk('[data-k="start"]'); await kk('.km-kachel.quest');
  check('Später am Tag: „Heute schon eingetragen“', (await kmText()).includes('Heute schon eingetragen'));
  await kk('[data-k="q-neu"]'); await kk('[data-k="q-kind"][data-p="1"]'); await kk('[data-k="q-uebergabe"]'); await kk('[data-k="q-erw"][data-p="2"]');
  await page.waitForSelector('#km-dialog .km-ergebnis .km-plus', { timeout: 10000 });
  qt = await kmText();
  check('Verschieden eingeschätzt: +2 Sterne, Hinweis zum Gespräch', qt.includes('+2 Sterne') && qt.includes('verschieden gesehen'), qt.slice(0, 300));
  // ein weiterer Tag dieser Woche (für die Belohnung)
  const anderer = [0, 1, 2, 3, 4].map(i => { const t = new Date(montag + 'T12:00:00'); t.setDate(t.getDate() + i); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); }).find(t => t !== heute);
  await page.evaluate(async a => { await CDSE_TEAM.ops.kindQuestTag(window.__tom, a, { k: 2, e: 2 }); }, anderer);
  await kk('[data-k="start"]');
  await page.click('#km-dialog [data-k="sperre"]'); await codeEingeben('4711');
  check('Beenden mit richtigem Code', await page.evaluate(() => !document.querySelector('#km-dialog')));
  await starteKindmodus('4711');
  await kk('.km-kachel.quest');
  qt = await kmText();
  check('5 Sterne: Belohnung zur Auswahl', qt.includes('Such dir deine Belohnung aus') && (await page.$$('#km-dialog [data-k="belohnung"]')).length === 2, qt.slice(0, 400));
  await kk('[data-k="belohnung"][data-i="0"]'); await warte(800);
  check('Belohnung gewählt und gespeichert', (await kmText()).includes('Deine Belohnung: 10 Minuten Lieblingsspiel') && (await km()).wochen[montag].belohnung === '10 Minuten Lieblingsspiel');
  await bild('06-belohnung');

  console.log('5) Stopp-Ampel');
  await kk('[data-k="start"]'); await kk('.km-kachel.ampel');
  check('Zwölf gezeichnete Szenen', (await page.$$('#km-dialog .km-szene-karte')).length === 12 && (await page.$$('#km-dialog .km-szene-karte svg.km-szene')).length === 12);
  await bild('07-szenen');
  await kk('[data-k="szene"][data-id="stift"]');
  check('Szene groß mit Satz', (await kmText()).includes('Jemand nimmt dir den Stift weg.'));
  await bild('08-szene');
  await kk('[data-k="thermo"]');
  check('Thermometer: „Weiter“ erst nach einer Wahl', await page.$eval('#km-dialog [data-k="rot"]', b => b.disabled));
  await kk('[data-k="vor"][data-n="4"]');
  await kk('[data-k="signal"][data-id="herz"]'); await kk('[data-k="signal"][data-id="faeuste"]'); await kk('[data-k="signal"][data-id="nichts"]');
  let sig = await page.$$eval('#km-dialog .km-chip.an', l => l.map(x => x.getAttribute('data-id')));
  check('„Ich merke nichts“ schließt die anderen Signale aus', sig.join() === 'nichts', sig);
  await kk('[data-k="signal"][data-id="herz"]');
  sig = await page.$$eval('#km-dialog .km-chip.an', l => l.map(x => x.getAttribute('data-id')));
  check('Signal wieder wählbar, „nichts“ weg', sig.join() === 'herz', sig);
  await bild('09-thermometer');
  await kk('[data-k="rot"]');
  check('Rot: Stopp! Erst anhalten.', (await kmText()).includes('Stopp!') && (await kmText()).includes('Füße fest auf den Boden'));
  await bild('10-rot');
  await warte(4500);
  check('Rot bleibt länger als vier Sekunden (Zeit zum Lesen und Zuhören)', (await schirm()) === 'rot', await schirm());
  check('Rot geht nach etwa sechs Sekunden von selbst zu Gelb', await warteSchirm('gelb', 5000));
  const st = await page.$$eval('#km-dialog .km-strategie', l => l.map(x => x.textContent));
  check('Gelb: nur die fünf Strategien des Teams, mit der eigenen', st.length === 5 && st.includes('Knautschball drücken') && !st.some(x => /Pausenkarte|Wasser/.test(x)), st);
  await bild('11-gelb');
  await kk('[data-k="strategie"][data-id="atmen"]'); await warte(1200);
  check('Grün: Atem-Raumschiff läuft (Einatmen …)', (await kmText()).includes('Einatmen') && await page.evaluate(() => document.querySelector('#km-atem').classList.contains('ein')));
  await warte(2500);
  await bild('12-gruen-atmen');
  await kk('[data-k="u-weiter"]');
  await page.waitForSelector('#km-dialog [data-k="u-fertig"]', { timeout: 15000 });
  check('„Überspringen“ führt zu „Geschafft!“', (await kmText()).includes('Geschafft!'));
  await tempo(0.02);
  await kk('[data-k="u-fertig"]');
  check('Danach: Thermometer mit neuer Frage', (await kmText()).includes('Und wenn du das machst'));
  await kk('[data-k="nach"][data-n="2"]'); await kk('[data-k="runde-fertig"]');
  await page.waitForSelector('#km-dialog .km-lob', { timeout: 10000 });
  check('Lob: „Super geübt!“ und kühler von 4 auf 2', (await kmText()).includes('Super geübt!') && (await kmText()).includes('von 4 auf 2'));
  await bild('13-lob');
  d = await km();
  const r1 = d.runden[d.runden.length - 1];
  check('Runde gespeichert: Szene, vorher/nachher, Strategie, Signal – keine Freitexte', r1 && r1.spiel === 'ampel' && r1.szene === 'stift' && r1.vor === 4 && r1.nach === 2 && r1.strategie === 'atmen' && r1.signale.join() === 'herz', r1);
  // Zweite Runde: weggehen (Schritte mit Knopf und Zeit)
  await kk('[data-k="szenen"]'); await kk('[data-k="szene"][data-id="laut"]'); await kk('[data-k="thermo"]'); await kk('[data-k="vor"][data-n="5"]'); await kk('[data-k="rot"]');
  await warteSchirm('gelb', 3000);
  await kk('[data-k="strategie"][data-id="weggehen"]');
  check('Weggehen: Schritt 1 von 3 mit Satz', (await kmText()).includes('Schritt 1 von 3') && (await kmText()).includes('Ich brauche eine Pause'));
  await kk('[data-k="u-weiter"]'); await kk('[data-k="u-weiter"]');
  check('Schritt 3: Zeit läuft', !!(await page.$('#km-dialog #km-uhr')));
  await page.waitForSelector('#km-dialog [data-k="u-fertig"]', { timeout: 10000 }); await kk('[data-k="u-fertig"]');
  await kk('[data-k="nach"][data-n="3"]'); await kk('[data-k="runde-fertig"]'); await page.waitForSelector('#km-dialog .km-lob', { timeout: 10000 });
  // Dritte Runde: Hilfe holen und die eigene Strategie
  await kk('[data-k="szenen"]'); await kk('[data-k="szene"][data-id="allein"]'); await kk('[data-k="thermo"]'); await kk('[data-k="vor"][data-n="3"]'); await kk('[data-k="rot"]');
  await warteSchirm('gelb', 3000);
  await kk('[data-k="strategie"][data-id="hilfe"]');
  check('Hilfe holen: „Wen fragst du?“ mit vier Möglichkeiten', (await kmText()).includes('Wen fragst du?') && (await page.$$('#km-dialog [data-k="wen"]')).length === 4);
  await kk('[data-k="wen"][data-i="0"]'); await kk('[data-k="u-weiter"]');
  await page.waitForSelector('#km-dialog [data-k="u-fertig"]'); await kk('[data-k="u-fertig"]');
  await kk('[data-k="nach"][data-n="2"]'); await kk('[data-k="runde-fertig"]'); await page.waitForSelector('#km-dialog .km-lob', { timeout: 10000 });
  d = await km();
  check('Drei Runden gespeichert', d.runden.filter(r => r.spiel === 'ampel').length === 3, d.runden);
  const prot = await page.evaluate(async id => (await CDSE_TEAM.dossier(id)).verlauf.filter(v => /^Kindmodus: .*geübt/.test(v.t)).map(v => v.t), tom);
  check('Protokoll fasst die Runden zusammen („3 Runden geübt“, ein Eintrag)', prot.length === 1 && prot[0] === 'Kindmodus: 3 Runden geübt', prot);

  console.log('6) Atem-Raumschiff');
  await kk('[data-k="start"]'); await kk('.km-kachel.atem');
  check('Atem: Dauer wählen (1, 2, 3 Minuten)', (await page.$$('#km-dialog [data-k="atem-los"]')).length === 3);
  await bild('14-atem-wahl');
  await tempo(0.01);
  // Schülerbereich gerade gesperrt (wie nach 60 Minuten ohne Aktivität): speichern wirft sofort
  await page.evaluate(() => { window.__zustand = CDSE_TEAM.zustand; window.__runde = CDSE_TEAM.ops.kindRunde; CDSE_TEAM.zustand = () => ({ art: 'gesperrt' }); CDSE_TEAM.ops.kindRunde = () => { throw new Error('Der Schülerbereich ist nicht geöffnet'); }; });
  await kk('[data-k="atem-los"][data-min="1"]');
  await page.waitForSelector('#km-dialog .km-lob', { timeout: 15000 });
  await warte(600);
  check('Atem: „1 Minute ruhig geatmet“', (await kmText()).includes('Du hast 1 Minute ruhig geatmet'), (await kmText()).slice(0, 200));
  check('Bereich gesperrt: das Raumschiff hängt nicht, die Runde ist gemerkt („Gemerkt!“, Weg zum Start)', (await kmText()).includes('Gemerkt!') && !!(await page.$('#km-dialog [data-k="start"]')) && (await page.evaluate(() => CDSE_KINDMODUS._test.offen())) === 1, await kmText());
  await page.evaluate(() => { CDSE_TEAM.zustand = window.__zustand; CDSE_TEAM.ops.kindRunde = window.__runde; CDSE_KINDMODUS._test.nachholen(); });
  await page.waitForFunction(() => CDSE_KINDMODUS._test.offen() === 0, null, { timeout: 10000 }).catch(() => {});
  d = await km();
  check('Wieder offen: gemerkte Atem-Runde nachgeholt und gespeichert (60 s)', d.runden.some(r => r.spiel === 'atem' && r.dauer === 60), d.runden.map(r => r.spiel + ':' + (r.dauer || '')));
  await tempo(1);

  console.log('7) Beenden nur mit Code');
  await kk('[data-k="start"]'); await kk('[data-k="sperre"]');
  check('Code-Feld erscheint', (await kmText()).includes('Nur für Erwachsene'));
  await bild('15-code');
  await codeEingeben('1234');
  check('Falscher Code: Meldung, Kindmodus bleibt', (await kmText()).includes('Der Code stimmt nicht') && await page.evaluate(() => !!document.querySelector('#km-dialog[open]')));
  await kk('[data-k="pin-ab"]');
  check('„Zurück“ schließt nur das Code-Feld', !(await page.$('#km-dialog .km-pin')) && (await kmText()).includes('Hallo, Tom!'));
  await kk('[data-k="sperre"]');
  for (const z of '4711') { await page.keyboard.press(z); await warte(40); } await warte(500);
  check('Richtiger Code über die Tastatur beendet den Kindmodus', await page.evaluate(() => !document.querySelector('#km-dialog') && !document.body.classList.contains('km-an') && !sessionStorage.getItem('cdse_kindmodus')));
  const toast = await page.evaluate(() => (document.querySelector('.ar-toast') || {}).textContent || '');
  check('Rückmeldung: Runden und Atem', /Kindmodus beendet/.test(toast) && toast.includes('Runden Stopp-Ampel') && toast.includes('Atem-Raumschiff'), toast);
  const kt2 = await text('#km-karte');
  check('Karte: Runden, häufigste Strategie, Thermometer, Körpersignal, Atem', kt2.includes('3 Runden Stopp-Ampel') && kt2.includes('Am häufigsten gewählt') && kt2.includes('ohne Strategie Ø 4') && kt2.includes('Mein Herz klopft schnell') && kt2.includes('Atem-Raumschiff: 1×'), kt2);
  check('Karte: Sterne der Woche und gewählte Belohnung', kt2.includes('Diese Woche: 5 Sterne') && kt2.includes('gewählt: 10 Minuten Lieblingsspiel'), kt2);
  check('Nach dem Beenden: Dossier wieder da', await page.evaluate(() => !!document.querySelector('#ar-dossier .ar-tabs')));
  await page.screenshot({ path: path.join(OUT, '16-karte-danach.png') });
  await page.click('#km-karte [data-km="einrichten"]'); await page.waitForSelector('dialog.ar-dialog .km-e-figuren');
  check('Einstellungen mitten in der Woche: Wahl „ab heute“ oder „ab nächster Woche“', !!(await page.$('dialog.ar-dialog input[name="ab"][value="heute"]:checked')) && !!(await page.$('dialog.ar-dialog input[name="ab"][value="woche"]')) && (await text('dialog.ar-dialog .km-e-ab')).includes('Belohnung ab 5'));
  await dialogKnopf('Abbrechen');

  console.log('8) Überblick, Überprüfung, Verlauf');
  const kz = await page.evaluate(async id => { const d = await CDSE_TEAM.dossier(id); const k = CDSE_BEGLEITPLAN.kennzahlen(d); return { k: k.kindmodus, t: CDSE_KINDMODUS.kennzahlText(k.kindmodus) }; }, tom);
  // Der Montag liegt vor dem Start des Plans (heute) und zählt deshalb nicht mit
  check('Kennzahlen für die Überprüfung (seit Start des Plans)', kz.k && kz.k.quest === 1 && kz.k.ampel === 3 && kz.k.atem === 1 && /Ziel-Quest an 1 Tag/.test(kz.t) && /3 Runden Stopp-Ampel/.test(kz.t), kz);
  await reiter(tom, 'ueberblick');
  check('Überblick: Zeile „Kindmodus“', (await page.textContent('#arbeit-body')).includes('Kindmodus: Ziel-Quest diese Woche 5 Sterne'));
  await reiter(tom, 'profil');
  const vl = await page.evaluate(() => ({ titel: Array.from(document.querySelectorAll('.vl-grafik .vl-titel')).map(t => t.textContent), sterne: document.querySelectorAll('.vl-grafik .vl-km-stern').length, runden: document.querySelectorAll('.vl-grafik .vl-km-runde').length, legende: (document.querySelector('.vl-legende') || {}).textContent || '' }));
  check('Verlauf: Bahn „Kindmodus“ mit Sternen und Runden', vl.titel.includes('Kindmodus') && vl.sterne === 2 && vl.runden === 4, vl);
  check('Verlauf: Marke „Kindmodus eingerichtet“', vl.legende.includes('Kindmodus eingerichtet'), vl.legende);

  console.log('9) Neuladen sperrt, zu viele Versuche, Code vergessen: Hub sperren');
  await reiter(tom, 'begleitplan');
  await starteKindmodus('2468');
  await page.reload();
  await page.waitForSelector('#km-dialog[open] .km-pin-karte', { timeout: 15000 });
  await schnell();
  const nl = await page.evaluate(() => ({ t: document.getElementById('km-dialog').textContent, hub: getComputedStyle(document.querySelector('.hub')).visibility }));
  check('Nach dem Neuladen: „Der Kindmodus ist noch an“, Hub verborgen', nl.t.includes('Der Kindmodus ist noch an') && nl.hub === 'hidden', nl);
  check('Nach dem Neuladen: kein „Zurück“ am Code-Feld', !(await page.$('#km-dialog [data-k="pin-ab"]')));
  await codeEingeben('2468');
  check('Richtiger Code gibt den Hub frei', await page.evaluate(() => !document.querySelector('#km-dialog') && !sessionStorage.getItem('cdse_kindmodus')));
  await reiter(tom, 'begleitplan');
  await starteKindmodus('1357');
  await page.reload();
  await page.waitForSelector('#km-dialog[open] .km-pin-karte', { timeout: 15000 });
  await schnell();
  for (let i = 0; i < 5; i++) await codeEingeben('0000');
  const gesperrt = await kmText();
  check('Fünf falsche Versuche: 30 Sekunden gesperrt', gesperrt.includes('Zu viele Versuche') && await page.$eval('#km-dialog .km-taste[data-z="1"]', b => b.disabled), gesperrt.slice(0, 200));
  await bild('17-gesperrt');
  check('Kein „Abmelden“ mehr am Code-Feld, sondern „Code vergessen? Hub sperren“', !(await page.$('#km-dialog [data-k="abmelden"]')) && gesperrt.includes('Code vergessen? Hub sperren'));
  await kk('[data-k="sperren-frage"]');
  check('„Hub sperren“ fragt erst nach (nur für Erwachsene, mit Passwort)', (await kmText()).includes('Hub mit Passwort sperren') && !!(await page.$('#km-dialog [data-k="sperren-ja"]')));
  await kk('[data-k="sperren-nein"]');
  check('„Abbrechen“ führt zurück zur Code-Eingabe', !!(await page.$('#km-dialog .km-pin-tasten')));
  await kk('[data-k="sperren-frage"]'); await kk('[data-k="sperren-ja"]'); await warte(800);
  const gs = () => page.evaluate(() => { const z = JSON.parse(sessionStorage.getItem('cdse_kindmodus') || 'null'), ds = document.getElementById('ar-dossier'); return { dlg: !!document.querySelector('#km-dialog'), sperre: !!(z && z.sperre), pw: !!document.querySelector('#gate:not([hidden]) #g-pw'), hub: getComputedStyle(document.querySelector('.hub')).visibility, leer: !ds || !ds.firstChild }; });
  let g1 = await gs();
  check('Hub gesperrt: Anmeldung mit Passwort vorn, Kindmodus-Vermerk bleibt bis zur Anmeldung, Hub unsichtbar, Dossier leer', !g1.dlg && g1.sperre && g1.pw && g1.hub === 'hidden' && g1.leer, g1);
  await bild('17b-hub-gesperrt');
  await page.reload();
  await page.waitForSelector('#gate:not([hidden]) #g-pw, #gate:not([hidden]) .konto[data-id]', { timeout: 30000 }); await warte(1500);
  g1 = await gs();
  check('Neu laden während der Sperre: die Anmeldung bleibt vorn (keine Code-Eingabe darüber), Vermerk bleibt', !g1.dlg && g1.sperre && g1.hub === 'hidden', g1);
  await schnell();

  console.log('10) Nur-Lesen und 390 px');
  await page.waitForSelector('#gate .konto[data-id], #g-pw', { timeout: 30000 });
  if (!(await page.$('#g-pw'))) { await page.click('#gate .konto:has-text("Mia Muster")'); }
  await page.fill('#g-pw', 'ein sicheres Passwort 1'); await page.click('#g-los');
  await page.waitForSelector('#me:not([hidden])', { timeout: 30000 });
  await page.waitForFunction(() => !sessionStorage.getItem('cdse_kindmodus') && !document.body.classList.contains('km-an'), null, { timeout: 10000 }).catch(() => {});
  check('Nach der Anmeldung mit Passwort: Kindmodus beendet, Hub wieder sichtbar', await page.evaluate(() => !sessionStorage.getItem('cdse_kindmodus') && !document.body.classList.contains('km-an') && getComputedStyle(document.querySelector('.hub')).visibility !== 'hidden'));
  await reiter(tom, 'begleitplan');
  await page.evaluate(() => { window.__r = CDSE_TEAM.rechte; CDSE_TEAM.rechte = d => Object.assign({}, window.__r(d), { bearbeiten: false, weitergeben: false }); CDSE_ARBEIT.hilfen.dossierZeichnen(CDSE_ARBEIT.hilfen.aktDossier()); }); await warte(200);
  check('Nur-Lesen: Karte ohne Start- und Einstellungsknopf', !(await page.$('#km-karte [data-km]')) && (await text('#km-karte')).includes('Kindmodus'));
  await page.evaluate(() => { CDSE_TEAM.rechte = window.__r; CDSE_ARBEIT.hilfen.dossierZeichnen(CDSE_ARBEIT.hilfen.aktDossier()); }); await warte(200);
  await page.setViewportSize({ width: 390, height: 844 }); await warte(300);
  check('390 px: Begleitplan mit Kindmodus-Karte ohne seitliches Scrollen', (await quer()) <= 1, await quer());
  await starteKindmodus('1111');
  check('390 px: Start ohne seitliches Scrollen', (await quer('#km-dialog')) <= 1, await quer('#km-dialog'));
  await bild('18-start-390');
  await kk('.km-kachel.quest');
  check('390 px: Quest ohne seitliches Scrollen', (await quer('#km-dialog')) <= 1, await quer('#km-dialog'));
  await bild('19-quest-390');
  await kk('[data-k="start"]'); await kk('.km-kachel.ampel'); await kk('[data-k="szene"][data-id="fehler"]'); await kk('[data-k="thermo"]');
  check('390 px: Thermometer ohne seitliches Scrollen', (await quer('#km-dialog')) <= 1, await quer('#km-dialog'));
  await bild('20-thermo-390');
  await kk('[data-k="vor"][data-n="3"]'); await kk('[data-k="rot"]'); await kk('[data-k="gelb"]');
  check('390 px: Gelb ohne seitliches Scrollen', (await quer('#km-dialog')) <= 1, await quer('#km-dialog'));
  await bild('21-gelb-390');
  await kk('[data-k="sperre"]'); await codeEingeben('1111');
  await page.setViewportSize({ width: 1280, height: 900 });

  console.log('11) Alle Szenen und Welten als Bilder');
  const galerie = await page.evaluate(() => {
    const K = CDSE_KINDMODUS;
    const sz = K.SZENEN.map(s => '<figure style="margin:0"><div style="width:360px">' + K.szeneSvg(s[0]) + '</div><figcaption style="font:13px sans-serif">' + s[1] + '</figcaption></figure>').join('');
    const we = ['baum', 'burg', 'raumschiff'].map(w => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => '<div style="width:160px">' + K.weltSvg(w, i) + '</div>').join('')).join('');
    const fi = ['fuchs', 'eule', 'drache', 'roboter', 'katze', 'baer'].map(f => '<div style="width:110px">' + K.figurSvg(f) + '</div>').join('');
    const el = document.createElement('div'); el.id = 'km-galerie'; el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#fff;overflow:auto;padding:10px;display:flex;flex-wrap:wrap;gap:8px';
    el.innerHTML = sz; document.body.appendChild(el);
    const el2 = document.createElement('div'); el2.id = 'km-galerie2'; el2.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#fff;overflow:auto;padding:10px;display:flex;flex-wrap:wrap;gap:6px;display:none';
    el2.innerHTML = we + fi; document.body.appendChild(el2);
    return true;
  });
  await page.setViewportSize({ width: 1500, height: 1000 });
  await bild('22-szenen-galerie');
  await page.evaluate(() => { document.getElementById('km-galerie').remove(); document.getElementById('km-galerie2').style.display = 'flex'; });
  await bild('23-welten-figuren');
  await page.evaluate(() => { document.getElementById('km-galerie2').remove(); });

  check('Keine Skriptfehler', errors.length === 0, errors);
  await browser.close();
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler  (' + Math.round((Date.now() - t0) / 1000) + ' s, Bilder in ' + OUT + ')');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
