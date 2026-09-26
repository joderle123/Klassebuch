// Test: Lern-App (apps/lernen.html) – Übersicht, Module und Filter, Lesen (Kapitel, Fachbegriffe, gelesen),
// Abschlussquiz (nicht bestanden / bestanden, Tastatur), Lernkartei, Glossar, Suche, Lernpfad mit
// Teilnahmebestätigung, Notizen, Zurücksetzen, 390 px. Liest die richtigen Antworten aus lern-app/module/.
// Aufruf: node tests/lernen.js   (BASE=… für eine andere Adresse, AUS=… für den Bilderordner)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8099/apps/lernen.html';
const OUT = process.env.AUS || path.join(__dirname, 'lernen-aus'); fs.mkdirSync(OUT, { recursive: true });
const MODDIR = path.join(__dirname, '..', '..', 'lern-app', 'module');
const ADHS = JSON.parse(fs.readFileSync(path.join(MODDIR, 'adhs.json'), 'utf8'));
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } }
const p2 = n => String(n).padStart(2, '0');
function tag(plus) { const d = new Date(); d.setDate(d.getDate() + plus); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }

(async () => {
  const t0 = Date.now();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('dialog', d => d.accept());
  const warte = ms => page.waitForTimeout(ms);
  const text = sel => page.textContent(sel);
  async function gehe(hash) { await page.evaluate(h => { location.hash = h; }, hash); await warte(250); }
  async function stand() { return page.evaluate(() => JSON.parse(localStorage.getItem('cdse-lernen-v1') || 'null')); }
  async function quer() { return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); }
  async function bild(name) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    const vp = page.viewportSize();
    await page.setViewportSize({ width: vp.width, height: Math.min(6000, Math.max(vp.height, h)) }); await warte(200);
    await page.screenshot({ path: path.join(OUT, name) });
    await page.setViewportSize(vp); await warte(100);
  }
  /* Quiz beantworten: richtig (true) oder falsch (false) je Frage */
  async function quiz(mod, richtig) {
    for (let i = 0; i < mod.quiz.length; i++) {
      await page.waitForSelector('.quiz-karte [data-option]');
      const f = mod.quiz[i], soll = typeof richtig === 'function' ? richtig(i) : richtig;
      let wahl;
      if (soll) wahl = f.richtig;
      else if (f.art === 'richtigfalsch') wahl = [1 - f.richtig[0]];
      else wahl = [f.optionen.findIndex((_, j) => !f.richtig.includes(j))];
      for (const j of wahl) await page.click('.quiz-karte [data-option="' + j + '"]');
      await page.click('[data-quiz="pruefen"]');
      await page.waitForSelector('.rueck');
      await page.click('[data-quiz="weiter"]');
    }
    await page.waitForSelector('.ergebnis');
  }

  await page.goto(BASE);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cdse-nutzer', JSON.stringify({ id: 'lea', name: 'Lea Beispiel', team: 'isa' })); });
  await page.reload(); await page.waitForSelector('h1.seite', { timeout: 20000 });
  const ids = await page.evaluate(() => CDSE_LERNEN.module());

  console.log('1) Übersicht');
  check('Titel und Anzahl der Module', (await text('h1.seite')) === 'Fachwissen für den Alltag' && (await text('main .unter')).includes(ids.length + ' Module'), ids.length);
  check('Name aus dem Hub, Hinweis „privat“', (await text('main')).includes('Angemeldet als Lea Beispiel') && (await text('main')).includes('nur Sie sehen ihn'));
  check('Stand 0 %, Einstieg-Karte, Lernpfade und Bereiche', (await text('.ring b')).startsWith('0') && await page.isVisible('.weiter-karte') && (await page.$$('.pfad-karte')).length >= 4 && (await text('main')).includes('Störungsbilder'));
  check('Reiter mit aktueller Seite', await page.getAttribute('#reiter button[aria-current="page"]', 'data-geh') === '#/');
  await bild('l1-uebersicht.png');
  check('1280 px: kein waagrechtes Scrollen', await quer() <= 1, await quer());

  console.log('2) Module: Filter nach Bereich und Stand');
  await page.click('#reiter [data-geh="#/module"]'); await page.waitForSelector('.modul-karte');
  const alle = (await page.$$('.modul-karte')).length;
  check('Alle Module als Karten', alle === ids.length, alle);
  await page.click('[data-filter="bereich"][data-wert="stoerungen"]'); await warte(150);
  const st = await page.$$eval('.modul-karte .eyebrow', l => [...new Set(l.map(x => x.textContent))]);
  check('Filter „Störungsbilder“: nur dieser Bereich, Fokus bleibt auf dem Chip', st.length === 1 && st[0] === 'Störungsbilder' && await page.evaluate(() => document.activeElement.getAttribute('data-wert') === 'stoerungen'), st);
  await page.click('[data-filter="bereich"][data-wert=""]'); await warte(100);

  console.log('3) Lesen');
  await gehe('#/modul/adhs'); await page.waitForSelector('.modul-kopf');
  check('Modulkopf: Titel, Lernziele, Dauer, Kapitelzahl', (await text('.modul-kopf h1')) === ADHS.titel && (await page.$$('.lernziele li')).length === ADHS.lernziele.length && (await text('.meta')).includes(ADHS.kapitel.length + ' Kapitel'));
  check('Inhaltsverzeichnis: alle Kapitel, Quiz, Begriffe', (await page.$$('.toc li button')).length === ADHS.kapitel.length + 2);
  check('Kapitel 1 mit Fallbeispiel', (await text('h2.kap')).includes(ADHS.kapitel[0].titel) && await page.isVisible('.box.fall'));
  const begriffe = await page.$$('button.begriff');
  check('Fachbegriffe im Text antippbar', begriffe.length >= 1, begriffe.length);
  if (begriffe.length) {
    await begriffe[0].click(); await page.waitForSelector('.pop');
    check('Fenster mit Erklärung, Escape schließt und gibt den Fokus zurück', (await text('.pop')).length > 20 && true);
    await page.keyboard.press('Escape'); await warte(100);
    check('Fenster geschlossen', !(await page.$('.pop')) && await page.evaluate(() => document.activeElement.classList.contains('begriff')));
  }
  await page.click('.kap-fuss [data-gelesen="1"]'); await page.waitForSelector('h2.kap'); await warte(150);
  check('„Weiter“: Kapitel 2, Kapitel 1 im Inhalt abgehakt, gespeichert', (await text('h2.kap')).includes(ADHS.kapitel[1].titel) && await page.isVisible('.toc .nr.ok') && (await stand()).module.adhs.gelesen.includes(1));
  await bild('l2-kapitel.png');
  for (let k = 2; k <= ADHS.kapitel.length; k++) { await page.click('.kap-fuss [data-gelesen="' + k + '"]'); await warte(200); }
  check('Letztes Kapitel führt ins Quiz, alle Kapitel gelesen', (await page.evaluate(() => location.hash)) === '#/quiz/adhs' && (await stand()).module.adhs.gelesen.length === ADHS.kapitel.length);

  console.log('4) Abschlussquiz');
  await page.waitForSelector('.quiz-karte');
  check('Frage 1 von ' + ADHS.quiz.length + ', „Antwort prüfen“ erst nach einer Wahl', (await text('.quiz-kopf')).includes('Frage 1 von ' + ADHS.quiz.length) && await page.isDisabled('[data-quiz="pruefen"]'));
  /* Tastatur: Zahl wählt, Enter prüft, Enter weiter */
  const f0 = ADHS.quiz[0];
  if (f0.art !== 'mehrfach') {
    await page.keyboard.press(String((f0.art === 'richtigfalsch' ? f0.richtig[0] : f0.richtig[0]) + 1)); await page.keyboard.press('Enter'); await page.waitForSelector('.rueck');
    check('Tastatur: Zahl wählt, Enter prüft – richtig mit Begründung', (await text('.rueck')).startsWith('Richtig.') && (await text('.rueck')).length > 60);
    await page.keyboard.press('Enter'); await page.waitForSelector('.quiz-kopf');
    check('Enter: nächste Frage', (await text('.quiz-kopf')).includes('Frage 2 von'));
  }
  await gehe('#/modul/adhs'); await gehe('#/quiz/adhs');
  await quiz(ADHS, i => i < 3);
  const erg1 = await text('.ergebnis .gross');
  check('Nicht bestanden: Prozent, Hinweis 80 %, Begründungen der falschen', !(await page.$('.medaille')) && erg1.trim() === Math.round(3 / ADHS.quiz.length * 100) + ' %' && (await text('.ergebnis')).includes('80 %') && (await page.$$('.auswertung li.nein details')).length === ADHS.quiz.length - 3, erg1);
  let s1 = await stand();
  check('Falsche Antworten in der Lernkartei (Fach 1, morgen fällig), Modul nicht bestanden', Object.keys(s1.karten).length === ADHS.quiz.length - 3 && Object.values(s1.karten).every(k => k.fach === 1 && k.faellig === tag(1)) && !s1.module.adhs.bestanden);
  await page.click('[data-quiz="neu"]'); await quiz(ADHS, true);
  check('Bestanden: 100 %, Medaille', (await text('.ergebnis .gross')).trim() === '100 %' && await page.isVisible('.medaille'));
  await bild('l3-ergebnis.png');
  s1 = await stand();
  check('Gespeichert: bestanden heute, 2 Versuche, alle Fragen in der Lernkartei', s1.module.adhs.bestanden === tag(0) && s1.module.adhs.versuche.length === 2 && Object.keys(s1.karten).length === ADHS.quiz.length);

  console.log('5) Lernkartei');
  await gehe('#/wiederholen'); await page.waitForSelector('h1.seite');
  check('Heute nichts fällig, Fächer sichtbar', (await text('main')).includes('Heute ist nichts fällig') && (await page.$$('.fach')).length === 5);
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('cdse-lernen-v1')); const k = Object.keys(s.karten).slice(0, 2); k.forEach(x => { s.karten[x].faellig = '2000-01-01'; }); localStorage.setItem('cdse-lernen-v1', JSON.stringify(s)); });
  await page.reload(); await page.waitForSelector('#reiter .n');
  check('Reiter zeigt 2 fällige Fragen', (await text('#reiter .n')) === '2');
  await gehe('#/wiederholen'); await page.click('[data-wdh="start"]'); await page.waitForSelector('.quiz-karte');
  const vorher = await page.evaluate(() => JSON.parse(localStorage.getItem('cdse-lernen-v1')).karten);
  const faelligeKeys = Object.keys(vorher).filter(k => vorher[k].faellig === '2000-01-01');
  const INTERVALL = [0, 1, 3, 7, 16, 35];
  for (let r = 0; r < 2; r++) {
    const kopf = await text('.quiz-frage');
    const key = faelligeKeys.find(k => { const f = ADHS.quiz[+k.split('#')[1]]; return kopf.replace(/\s+/g, ' ').includes(f.frage.replace(/\*\*/g, '').slice(0, 40).replace(/\s+/g, ' ')); });
    const f = ADHS.quiz[+key.split('#')[1]];
    for (const j of f.richtig) await page.click('.quiz-karte [data-option="' + j + '"]');
    await page.click('[data-quiz="pruefen"]'); await page.waitForSelector('.rueck'); await page.click('[data-quiz="weiter"]');
  }
  await page.waitForSelector('.ergebnis');
  const s2 = await stand();
  check('Wiederholung: 2 / 2, jede Karte rückt ein Fach weiter (Abstand 1/3/7/16/35 Tage)', (await text('.ergebnis .gross')).trim() === '2 / 2' && faelligeKeys.every(k => s2.karten[k].fach === Math.min(5, vorher[k].fach + 1) && s2.karten[k].faellig === tag(INTERVALL[s2.karten[k].fach])), faelligeKeys.map(k => [vorher[k], s2.karten[k]]));

  console.log('6) Glossar und Suche');
  await gehe('#/glossar'); await page.waitForSelector('.glossar');
  const nBegr = (await page.$$('.glossar .eintrag')).length;
  check('Glossar: alle Begriffe mit A–Z-Überschriften', nBegr > 100 && (await page.$$('.buchstabe')).length > 10, nBegr);
  await page.fill('#glossar-suche', 'exekutiv'); await warte(150);
  check('Glossar-Suche filtert', (await page.$$('.glossar .eintrag')).length >= 1 && (await page.$$('.glossar .eintrag')).length < 10);
  await page.fill('#suche', 'Mutismus'); await page.waitForFunction(() => /^#\/suche/.test(location.hash), null, { timeout: 5000 }); await warte(300);
  check('Suche „Mutismus“: Modul, Kapitel mit markierter Stelle', (await text('main')).includes('Suche') && (await page.$$('.treffer .karte')).length >= 1 && (await page.$$('.treffer mark')).length >= 1);
  check('Suchfeld behält den Fokus', await page.evaluate(() => document.activeElement.id === 'suche'));
  await page.fill('#suche', ''); await warte(400);

  console.log('7) Lernpfad und Teilnahmebestätigung');
  await gehe('#/pfad/stoerungen'); await page.waitForSelector('.pfad-liste');
  check('Lernpfad: Module in Reihenfolge, ADHS bestanden, noch keine Bestätigung', (await page.$$('.pfad-liste li')).length >= 5 && await page.isVisible('.pfad-liste .schritt.ok') && (await text('main')).includes('sobald alle Module'));
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cdse-lernen-v1'));
    ['adhs', 'oppositionell-aggressiv', 'autismus', 'angst', 'depression', 'trauma', 'lernstoerungen', 'schulvermeidung'].forEach(id => { s.module[id] = Object.assign({ gelesen: [], notiz: '' }, s.module[id] || {}, { bestanden: '2026-09-20', versuche: [{ d: '2026-09-20', p: 90 }] }); });
    localStorage.setItem('cdse-lernen-v1', JSON.stringify(s));
  });
  await page.reload(); await gehe('#/pfad/stoerungen'); await page.waitForSelector('.pfad-liste');
  await page.click('a[href="#/bestaetigung/stoerungen"]'); await page.waitForSelector('.urkunde');
  const urk = await text('.urkunde');
  check('Bestätigung: Name, Lernpfad, Tabelle der Module, Datum, Hinweis', urk.includes('Lea Beispiel') && urk.includes('Störungsbilder im Schulalltag') && (await page.$$('.urkunde tbody tr')).length >= 5 && urk.includes('Keine zertifizierte'));
  await bild('l4-bestaetigung.png');

  console.log('8) Notizen, Modulende, Zurücksetzen');
  await gehe('#/modul/adhs/ende'); await page.waitForSelector('#notiz');
  await page.fill('#notiz', 'Mehr Bewegungspausen einplanen.'); await warte(600);
  check('Notiz gespeichert', (await stand()).module.adhs.notiz === 'Mehr Bewegungspausen einplanen.');
  check('Modulende: Begriffe, Quellen (aus quellen.js), verwandte Module', (await page.$$('.modul-ende .glossar .eintrag')).length === ADHS.glossar.length && (await page.$$('.quellen li')).length === ADHS.quellen.length && !(await text('.quellen')).includes(ADHS.quellen[0] + '\n'));
  await gehe('#/'); await page.click('[data-aktion="zuruecksetzen"]'); await warte(300);
  check('Zurücksetzen: Lernstand leer', Object.keys((await stand()).module).length === 0 && (await text('.ring b')).startsWith('0'));

  console.log('9) Handy (390 px)');
  await page.setViewportSize({ width: 390, height: 844 }); await warte(200);
  for (const h of ['#/', '#/module', '#/modul/adhs', '#/quiz/adhs', '#/glossar']) { await gehe(h); await warte(150); const q = await quer(); check('390 px ohne waagrechtes Scrollen: ' + h, q <= 1, q); }
  await gehe('#/modul/adhs'); await bild('l5-mobil.png');

  check('Keine Fehler in der Konsole', errors.length === 0, errors.slice(0, 5).join(' | '));
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler  (' + Math.round((Date.now() - t0) / 1000) + ' s, Bilder in ' + OUT + ')');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
