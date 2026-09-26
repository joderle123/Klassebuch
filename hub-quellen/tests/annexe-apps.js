// Test: Lernen und Pathologien der Annexe (nach python3 lern-app/baue.py und node annexe-apps.cjs).
// Lernen: in den eingebetteten Modulen und auf der Seite kein „ISA“ und kein „CDSE Hub“, richtige Quiz-Antworten
// wie in lern-app/module, Suche markiert genau das Suchwort (auch wenn davor ein „ß“ steht).
// Pathologien: Kopf, Brotkrumen und Hinweis unten „Pathologien“ statt „SAVOIR“, Screening-Hinweis auf den Hub,
// A01 öffnet einen Artikel mit demselben Namen, keine Bau-Platzhalter (ADHS ohne Reiter „Praxis“), passende
// Kategorien in Brotkrumen und Suche, Essstörungen mit Umlauten und Gedankenstrichen.
// Personen sind erfunden. Anfragen ins Netz werden blockiert und gezählt.
// Aufruf: node hub-quellen/tests/annexe-apps.js   (Webserver auf Port 8099 für den Hauptordner)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = process.env.ROOT || 'http://127.0.0.1:8099/';
const REPO = path.join(__dirname, '..', '..');
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + (typeof info === 'string' ? info : JSON.stringify(info)).slice(0, 400) : '')); } }
// wie norm() in lern-app/src/lernen.js
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
const VERBOTEN = /\bISA\b|CDSE[ -]Hub/;

(async () => {
  const t0 = Date.now();
  console.log('1) Lernen: eingebettete Module');
  const html = fs.readFileSync(path.join(REPO, 'apps', 'lernen.html'), 'utf8');
  const blob = /id="lern-daten">([A-Za-z0-9+/=]+)</.exec(html);
  const daten = JSON.parse(zlib.gunzipSync(Buffer.from(blob[1], 'base64')).toString('utf8'));
  const text = JSON.stringify(daten);
  check('Module ohne „ISA“ und „CDSE Hub“', !VERBOTEN.test(text), (text.match(/.{0,60}(\bISA\b|CDSE[ -]Hub).{0,40}/) || [])[0]);
  const seite = html.replace(blob[1], '').replace(/base64,[A-Za-z0-9+/=]+/g, '');
  check('Übrige Seite ohne „ISA“ und „CDSE Hub“', !VERBOTEN.test(seite), (seite.match(/.{0,60}(\bISA\b|CDSE[ -]Hub).{0,40}/) || [])[0]);
  // Vergleich mit den Quellen: gleicher Aufbau, gleiche richtige Antworten, geändert nur Texte mit „ISA“/„CDSE Hub“
  const quellen = {};
  fs.readdirSync(path.join(REPO, 'lern-app', 'module')).filter(d => d.endsWith('.json')).forEach(d => { const m = JSON.parse(fs.readFileSync(path.join(REPO, 'lern-app', 'module', d), 'utf8')); quellen[m.id] = m; });
  const abweichung = [], geaendert = [];
  function vergleiche(a, b, wo) {
    if (typeof a === 'string' && typeof b === 'string') { if (a !== b) { geaendert.push(wo); if (!VERBOTEN.test(a)) abweichung.push(wo + ': Text ohne „ISA“ geändert'); } return; }
    if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) { a.forEach((x, i) => vergleiche(x, b[i], wo + '[' + i + ']')); return; }
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) { new Set([...Object.keys(a), ...Object.keys(b)]).forEach(k => vergleiche(a[k], b[k], wo + '.' + k)); return; }
    if (a !== b) abweichung.push(wo + ': ' + JSON.stringify(a) + ' → ' + JSON.stringify(b));
  }
  daten.forEach(m => { if (quellen[m.id]) vergleiche(quellen[m.id], m, m.id); else abweichung.push(m.id + ': fehlt in lern-app/module'); });
  check('Gleicher Aufbau und gleiche richtige Antworten wie lern-app/module, geändert nur Texte mit „ISA“ oder „CDSE Hub“', !abweichung.length && geaendert.length >= 11, abweichung.length ? abweichung.slice(0, 4) : geaendert.length);
  const ue = daten.find(m => m.id === 'uebertragung'), fq = ue.quiz.find(f => /Mara/.test(f.fall || ''));
  check('Übertragung, Fallfrage zu Mara: „Kollegin aus dem ambulanten Team“, richtig bleibt die Fallbesprechung',
    /Kollegin aus dem ambulanten Team/.test(fq.fall) && fq.richtig.join() === '1' && /Fallbesprechung/.test(fq.optionen[1]) && /^Die Kollegin übernimmt/.test(fq.optionen[0]), fq);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: 'de-DE' });
  const netz = [];
  await ctx.route('**/*', r => { const u = r.request().url(); if (u.startsWith(ROOT) || u.startsWith('data:') || u.startsWith('blob:')) return r.continue(); netz.push(u); return r.abort(); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('dialog', d => { errors.push('Dialog: ' + d.message()); d.accept(); });
  const warte = ms => page.waitForTimeout(ms);

  console.log('2) Lernen im Browser');
  await page.goto(ROOT + 'apps/lernen.html');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cdse-nutzer', JSON.stringify({ id: 'lea', name: 'Lea Beispiel' })); });
  await page.reload(); await page.waitForSelector('h1.seite', { timeout: 20000 });
  async function suche(q) {
    await page.evaluate(q => { location.hash = '#/suche?q=' + encodeURIComponent(q); }, q);
    await page.waitForFunction(q => { const u = document.querySelector('main .unter'); return u && u.textContent.indexOf('„' + q + '“') === 0; }, q, { timeout: 10000 });
    return page.evaluate(() => [...document.querySelectorAll('.treffer .karte p')].map(p => { const m = p.querySelector('mark'); return { mark: m ? m.textContent : null, vor: m ? p.textContent.slice(0, p.textContent.indexOf(m.textContent)) : '' }; }));
  }
  const kap = ue.kapitel.findIndex(k => k.bloecke.some(b => b.titel === 'Mara und zwei Erwachsene'));
  await page.evaluate(h => { location.hash = h; }, '#/modul/uebertragung/' + (kap + 1)); await warte(400);
  const maraText = (await page.innerText('main')).replace(/\s+/g, ' ');
  check('Übertragung, Fall „Mara und zwei Erwachsene“: bei der Kollegin aus dem ambulanten Team, ohne „ISA“', maraText.includes('bei der Kollegin aus dem ambulanten Team') && !VERBOTEN.test(maraText));
  await page.evaluate(() => { location.hash = '#/modul/inklusion-luxemburg/2'; }); await warte(400);
  const zeilen = await page.$$eval('table tr', l => l.map(tr => tr.innerText.replace(/\s+/g, ' ').trim()));
  check('Inklusion in Luxemburg: Angebot „Ambulante Begleitung“ statt „ISA“', zeilen.some(z => /^Ambulante Begleitung Begleitung von Schülerinnen/.test(z)) && !zeilen.some(z => VERBOTEN.test(z)), zeilen.filter(z => /Begleitung/.test(z)));
  const isa = await suche('ISA');
  check('Suche „ISA“: kein Treffer mit „ISA“ als Wort', isa.every(t => t.mark !== 'ISA'), isa.filter(t => t.mark === 'ISA').length);
  const markiert = {}, mitSz = [];
  for (const q of ['Organisation', 'Maßnahme', 'strasse']) {
    const t = await suche(q);
    markiert[q] = t.filter(x => x.mark !== null && norm(x.mark) !== norm(q)).map(x => x.mark);
    if (t.some(x => x.mark !== null && /ß/.test(x.vor))) mitSz.push(q);
    if (!t.length) markiert[q] = ['keine Treffer'];
  }
  check('Suche markiert genau das Suchwort („Organisation“, „Maßnahme“, „strasse“ → „Straße“)', Object.values(markiert).every(l => !l.length), markiert);
  check('… auch in Treffern, vor denen ein „ß“ steht', mitSz.length >= 1, mitSz);

  console.log('3) Pathologien: Name, Hinweis, A01');
  await page.goto(ROOT + 'apps/pathologien.html');
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.achse-card');
  check('Kopf „Pathologien“ statt „SAVOIR“', (await page.innerText('.brand-logo')).trim() === 'Pathologien');
  const intro = await page.innerText('#view-krankheitsbilder .intro-text');
  check('Screening-Hinweis: im Hub (Schüler → Dossier → Screening), nicht mehr „Trichter“ im Klassenbuch', intro.includes('im Hub (Schüler → Dossier → Screening)') && !/Trichter|Klassenbuch/.test(intro), intro);
  const a01 = (await page.innerText('.achse-card[data-id="A01"] .achse-card-name')).trim();
  await page.click('.achse-card[data-id="A01"]'); await warte(300);
  const titel01 = (await page.innerText('#articleTitel')).trim();
  check('A01 „' + a01 + '“ öffnet „' + titel01 + '“ (gleicher Name, Schwerpunkt in Klammern)', titel01.startsWith(a01 + ' (') && /Asperger/.test(titel01));
  check('Brotkrumen und Hinweis unten ohne „SAVOIR“', !/SAVOIR/.test(await page.innerText('#view-article .breadcrumb')) && !/SAVOIR/.test(await page.innerText('.savoir-disclaimer')) && (await page.innerText('#view-article .breadcrumb')).toLowerCase().startsWith('pathologien'));

  console.log('4) Pathologien: Reiter, Platzhalter, Kategorien, Rechtschreibung');
  const PLATZHALTER = /Wird in Phase|wird in Phase \S+ gebaut|TOPICS\[|Platzhalter|Praxis-Modul für dieses Thema folgt|Inhalt für diese Ebene folgt/;
  // Umschriften wie im Befund (fuer, Koerper, Maedchen …) und „--“ statt Gedankenstrich
  const UMSCHRIFT = /\b[\wÄÖÜäöüß-]*(fuer|ueber|Ueber|koenn|muess|waehr|haeufig|Identitaet|veraender|moeglich|aehnlich|Gefuehl|Koerper|koerper|Schueler|spaeter|frueh|Aerzt|aerzt|faehig|Faehig|Staerk|staerk|Schwaech|schwaech|Naehe|Maedchen|maedchen|Paedagog|paedagog|zurueck|Rueck|rueck|natuerlich|Loesung|loes|hoer|Hoer|Fuehr|fuehr|Beduerf|beduerf|taeglich|Taetig|Aengst|aengst|Aerger|aerger|Gespraech|gespraech|Verhaeltnis|stoer|Stoer)[\wÄÖÜäöüß-]*\b/;
  const KAT = { A08: 'Essverhalten', A09: 'Verhaltens- und Impulskontrollstörungen', A10: 'Verhaltens- und Impulskontrollstörungen', A12: 'Persönlichkeit und Identität', A13: 'Psychotisches Spektrum' };
  const ids = await page.$$eval('.achse-card', l => l.map(e => e.dataset.id));
  const platz = [], umschrift = [], striche = [], kat = [], reiter = {};
  for (const id of ids) {
    await page.evaluate(() => showMode('krankheitsbilder')); await warte(100);
    await page.click('.achse-card[data-id="' + id + '"]'); await warte(250);
    const bc = (await page.innerText('#view-article .breadcrumb')).replace(/\s+/g, ' ');
    if (KAT[id] && !bc.toLowerCase().includes('› ' + KAT[id].toLowerCase() + ' ›')) kat.push(id + ': ' + bc);
    reiter[id] = await page.$$eval('#ebenenTabs .tab', l => l.map(b => b.dataset.ebene));
    for (const tb of reiter[id]) {
      await page.click('#ebenenTabs .tab[data-ebene="' + tb + '"]'); await warte(120);
      const t = await page.innerText('#articleBody');
      let m = t.match(PLATZHALTER); if (m) platz.push(id + '/' + tb + ': ' + m[0]);
      m = t.match(UMSCHRIFT); if (m) umschrift.push(id + '/' + tb + ': ' + m[0]);
      if (/ -- /.test(t)) striche.push(id + '/' + tb);
    }
  }
  check('Kein Bau-Platzhalter in allen Reitern der 13 Krankheitsbilder', !platz.length, platz);
  check('ADHS (A02) ohne Reiter „Praxis“, Autismus (A01) mit Praxis-Werkzeugen', !reiter.A02.includes('praxis') && reiter.A01.includes('praxis'), reiter.A02);
  await page.evaluate(() => showMode('krankheitsbilder')); await page.click('.achse-card[data-id="A01"]'); await warte(250);
  await page.click('#ebenenTabs .tab[data-ebene="praxis"]'); await warte(200);
  check('… die Praxis von A01 zeigt Werkzeuge', (await page.$$('#articleBody .praxis-grid > *')).length >= 3);
  check('Brotkrumen: Essstörungen, Sucht, ODD/CD, Borderline und Psychose in der passenden Kategorie', !kat.length, kat);
  await page.evaluate(() => showMode('krankheitsbilder'));
  await page.fill('#searchInput', 'Ess'); await warte(300);
  const treffer = await page.$$eval('#searchResults .search-result-item', l => l.map(e => e.querySelector('.search-result-titel').textContent.trim() + ' | ' + e.querySelector('.search-result-meta').textContent.trim()));
  const soll = ['Essstörungen (Adoleszenz) | H · Essverhalten', 'Substanz- und Verhaltenssucht (Adoleszenz) | E · Verhaltens- und Impulskontrollstörungen',
    'Verhaltensstörungen (ODD / CD) | E · Verhaltens- und Impulskontrollstörungen', 'Borderline-Strukturen (Adoleszenz) | F · Persönlichkeit und Identität',
    'Psychose-Erstmanifestation (Adoleszenz) | I · Psychotisches Spektrum'];
  check('Suche: Kategorien in den Treffern passen (Essstörungen H, Sucht und ODD/CD E, Borderline F, Psychose I)', soll.every(x => treffer.includes(x)), treffer.filter(x => !/^(Autismus|ADHS|Depressive|Bipolare|Angst|Zwang|PTBS|Lern)/.test(x)));
  await page.fill('#searchInput', '');
  check('Keine Umschriften wie „fuer“, „Koerper“, „Maedchen“ in allen Reitern', !umschrift.length, umschrift);
  check('Kein „--“ statt Gedankenstrich', !striche.length, striche);

  check('Keine Anfragen ins Netz', !netz.length, netz.slice(0, 5));
  check('Keine Fehler in der Konsole', errors.length === 0, errors.slice(0, 5));
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler  (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
