// Test: Berichte und Arztbriefe – PDF (echtes, vom Browser erzeugtes PDF), Word (.docx) und eingefügter Text
// auslesen; Diagnosen, Verdacht und Verneinung erkennen; Medikation, Datum, Absender, Empfehlungen; Bestätigen →
// Kompass („laut Arztbrief“), Begleitplan (Empfehlung als Schritt); Originaldatei verschlüsselt ablegen, wieder
// herunterladen, beim Entfernen löschen; Scan ohne Text; Protokoll; 390 px. Nur erfundene Personen und Kliniken.
// Aufruf: node tests/berichte.js   (BASE=… für eine andere Hub-Datei)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const BASE = process.env.BASE || 'http://127.0.0.1:8099/hub.html';
const OUT = path.join(__dirname, 'berichte-aus'); fs.mkdirSync(OUT, { recursive: true });
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } }

/* Minimale .docx (ZIP, ungepackt) mit einem Absatz je Zeile */
function crc32(buf) { let c, crc = 0xFFFFFFFF; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xFF; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xFFFFFFFF) >>> 0; }
function zip(dateien) {
  const teile = [], zentral = []; let off = 0;
  for (const [name, inhalt] of dateien) {
    const n = Buffer.from(name), d = Buffer.from(inhalt), c = crc32(d);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt32LE(c, 14); lh.writeUInt32LE(d.length, 18); lh.writeUInt32LE(d.length, 22); lh.writeUInt16LE(n.length, 26);
    teile.push(lh, n, d);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt32LE(c, 16); ch.writeUInt32LE(d.length, 20); ch.writeUInt32LE(d.length, 24); ch.writeUInt16LE(n.length, 28); ch.writeUInt32LE(off, 42);
    zentral.push(ch, n); off += 30 + n.length + d.length;
  }
  const cd = Buffer.concat(zentral), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(dateien.length, 8); end.writeUInt16LE(dateien.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...teile, cd, end]);
}
function docx(zeilen) {
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const body = zeilen.map(z => '<w:p><w:r><w:t xml:space="preserve">' + z.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</w:t></w:r></w:p>').join('');
  return zip([['[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ['word/document.xml', '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="' + W + '"><w:body>' + body + '</w:body></w:document>']]);
}

(async () => {
  const t0 = Date.now();
  const browser = await chromium.launch();
  /* Fixtures: Arztbrief und „Scan“ als echte PDFs aus dem Browser */
  const pdfCtx = await browser.newContext(); const pdfSeite = await pdfCtx.newPage();
  await pdfSeite.setContent(`<html><body style="font-family:Arial;font-size:12pt;padding:40px">
    <p><b>Kinder- und Jugendpsychiatrie Beispielklinik</b><br>Dr. med. Anna Probe, Fachärztin</p>
    <p>Beispielstadt, den 12.03.2026</p>
    <p>Arztbrief über Lea Beispiel, geb. 02.06.2015</p>
    <p><b>Diagnosen:</b><br>F90.0 Einfache Aktivitäts- und Aufmerksamkeitsstörung<br>Verdacht auf F93.2 Störung mit sozialer Ängstlichkeit des Kindesalters<br>Eine Autismus-Spektrum-Störung wurde ausgeschlossen.</p>
    <p><b>Medikation:</b> Medikinet retard 20 mg morgens.</p>
    <p><b>Empfehlungen:</b></p>
    <p>- Fortführung der Ergotherapie einmal pro Woche<br>- Elterntraining zum Umgang mit oppositionellem Verhalten<br>- Nachteilsausgleich bei Klassenarbeiten prüfen</p>
    <p>Mit freundlichen Grüßen<br>Dr. med. Anna Probe</p></body></html>`);
  const pdfBrief = await pdfSeite.pdf({ format: 'A4' });
  await pdfSeite.setContent('<html><body style="margin:0"><div style="width:600px;height:800px;background:repeating-linear-gradient(45deg,#ddd 0 10px,#fff 10px 20px)"></div></body></html>');
  const pdfScan = await pdfSeite.pdf({ format: 'A4' });
  await pdfCtx.close();
  const pfadBrief = path.join(OUT, 'arztbrief-test.pdf'), pfadScan = path.join(OUT, 'scan-test.pdf'), pfadDocx = path.join(OUT, 'befund-test.docx');
  fs.writeFileSync(pfadBrief, pdfBrief); fs.writeFileSync(pfadScan, pdfScan);
  fs.writeFileSync(pfadDocx, docx(['Zentrum für Diagnostik Musterstadt', 'Befundbericht vom 05.02.2026', 'Testpsychologische Untersuchung (WISC-V)', 'Diagnose: F81.0 Lese- und Rechtschreibstörung', 'Kein Hinweis auf eine Störung der Intelligenzentwicklung.', 'Empfehlung: Förderung des Lesens in Kleingruppen']));

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
  async function kontoFertig() { await page.waitForSelector('#g-code', { timeout: 30000 }); await page.check('#g-ok'); await page.click('#g-weiter'); await page.waitForSelector('#me:not([hidden])', { timeout: 30000 }); }
  async function erstelle(name, team, pw) {
    await page.fill('#g-name', name); await page.check('input[name="g-team"][value="' + team + '"]'); await page.selectOption('#g-resp', '-');
    await page.fill('#g-pw1', pw); await page.fill('#g-pw2', pw); await page.click('#g-los'); await kontoFertig();
  }
  async function reiter(id, tab) { await gehe('#/'); await gehe('#/schueler/' + id); await page.waitForSelector('.ar-tabs [data-tab="' + tab + '"]', { timeout: 20000 }); await page.click('.ar-tabs [data-tab="' + tab + '"]'); await warte(250); }
  async function chips() { return page.$$eval('.ko-kopf .ko-pchip', l => l.map(x => [x.firstChild.textContent.trim(), x.querySelector('.ko-art').textContent])); }
  async function anhaenge() { return page.evaluate(async () => { try { const r = await navigator.storage.getDirectory(); const g = await r.getDirectoryHandle('gemeinsam'); const a = await g.getDirectoryHandle('anhaenge'); const l = []; for await (const [n, h] of a.entries()) { const f = await h.getFile(); l.push({ n, t: (await f.text()).slice(0, 4000) }); } return l; } catch (e) { return []; } }); }
  async function hochladen(pfad) {
    await page.click('.ko-kopf [data-ber="neu"]'); await page.waitForSelector('dialog.ar-dialog input[name="datei"]');
    await page.setInputFiles('dialog.ar-dialog input[name="datei"]', pfad);
    await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Auslesen")');
    try { await page.waitForSelector('dialog.ar-dialog .ber-wahl', { timeout: 20000 }); } catch (e) {
      console.log('DEBUG Dialog:', await page.evaluate(() => { const d = document.querySelector('dialog.ar-dialog'); return d ? d.textContent.slice(0, 400) : 'kein Dialog'; }), 'Fehler:', errors);
      throw e;
    }
    await warte(200);
  }
  async function quer() { return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); }

  await page.goto(BASE);
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); for await (const [n] of r.entries()) { await r.removeEntry(n, { recursive: true }); } localStorage.clear(); sessionStorage.clear(); });
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); await r.getFileHandle('hub.html', { create: true }); });
  await page.reload();
  await page.click('#g-ordner'); await page.waitForSelector('#g-name');

  console.log('1) Erkennen (Einheit): Verneinung, Verdacht, Französisch');
  await erstelle('Mia Muster', 'diagnostique', 'ein sicheres Passwort 1');
  await gehe('#/schueler'); await page.waitForSelector('[data-ar="einrichten"]'); await page.click('[data-ar="einrichten"]');
  await page.waitForSelector('[data-ar="neu"]', { timeout: 20000 });
  const e1 = await page.evaluate(() => {
    const f = t => CDSE_BERICHTE.erkennen(t, null).profile.map(p => p.id + ':' + p.art).join(',');
    return {
      kein: f('Es ergab sich kein Hinweis auf eine ADHS.'), aus: f('Eine ADHS wurde ausgeschlossen.'), va: f('V. a. Autismus-Spektrum-Störung, weitere Abklärung.'),
      code: f('Diagnose: F84.0'), fr: f('Pas de trouble anxieux. Trouble du déficit de l\'attention avec hyperactivité (F90.0).'),
      beide: f('Keine Hinweise auf Autismus. Diagnose: ADHS (F90.0).')
    };
  });
  check('„kein Hinweis auf eine ADHS“ → ausgeschlossen', e1.kein === 'adhs:aus', e1.kein);
  check('„ADHS wurde ausgeschlossen“ → ausgeschlossen', e1.aus === 'adhs:aus', e1.aus);
  check('„V. a. Autismus“ → Verdacht', e1.va === 'autismus:verdacht', e1.va);
  check('ICD-Code F84.0 → Autismus, Diagnose', e1.code === 'autismus:diagnose', e1.code);
  check('Französisch: „pas de trouble anxieux“ verneint, F90.0 erkannt', e1.fr.includes('adhs:diagnose') && e1.fr.includes('angst:aus'), e1.fr);
  check('Verneinung gilt nur für den eigenen Satz: Autismus aus, ADHS Diagnose', e1.beide.includes('autismus:aus') && e1.beide.includes('adhs:diagnose'), e1.beide);

  /* Fälle aus der Durchsicht (erfundene Sätze): Satz → Einstufung je Profil (id:art, Reihenfolge wie im Prüfdialog).
     Vorausgewählt werden nur „diagnose“ und „verdacht“; „unklar“, „erwaehnt“ und „aus“ bleiben ohne Haken. */
  const faelle = [ /* FAELLE-ANFANG */
    // Verneinung in der Beurteilung gilt vor der Fragestellung; Widerspruch → nichts vorausgewählt; nur Fragestellung → nur erwähnt
    ['Fragestellung: V. a. ADHS.\nBeurteilung: Eine ADHS konnte nicht bestätigt werden.', 'adhs:aus'],
    ['Fragestellung: V. a. ADHS. Beurteilung: Eine ADHS konnte nicht bestätigt werden.', 'adhs:aus'],
    ['Diagnosen:\nADHS (F90.0)\n\nBeurteilung: Eine ADHS liegt nicht vor.', 'adhs:unklar'],
    ['Fragestellung: V. a. ADHS.\nBeurteilung: Die Symptome passen am ehesten zu einer Angststörung (F41.1).', 'angst:diagnose,adhs:erwaehnt'],
    // nachgestellte Verneinung; „nicht ausgeschlossen“ ist ein Verdacht
    ['Eine ADHS liegt nicht vor.', 'adhs:aus'],
    ['Die Diagnose einer ADHS kann nicht gestellt werden.', 'adhs:aus'],
    ['Suizidalität: keine.', 'selbstverletzung:aus'],
    ['Autismus-Screening: keine Auffälligkeiten', 'autismus:aus'],
    ["Le diagnostic de TDAH n'est pas retenu.", 'adhs:aus'],
    ['ADHS kann nicht ausgeschlossen werden.', 'adhs:verdacht'],
    // „Diagnostik“ ist keine Diagnose
    ['Wir empfehlen eine ADHS-Diagnostik.', 'adhs:erwaehnt'],
    ['Eine Autismus-Diagnostik ist geplant.', 'autismus:erwaehnt'],
    // Familie – auch als Wortteil und über einen Zeilenumbruch; Muttersprache, Elterntraining und „Eltern“ zählen nicht
    ['Die Kindsmutter leidet an einer Depression (F32.1).', 'depression:erwaehnt'],
    ['Stiefvater: Alkoholabhängigkeit (F10.2)', 'sucht:erwaehnt'],
    ['Halbbruder mit ADHS (F90.0)', 'adhs:erwaehnt'],
    ['KM mit Borderline-Persönlichkeitsstörung (F60.3)', 'instabil:erwaehnt'],
    ["Sa maman souffre d'une dépression.", 'depression:erwaehnt'],
    ['Anamnese: psychische Erkrankung der Mutter\n(rezidivierende depressive Störung, F33.1)', 'depression:erwaehnt'],
    ['Diagnosen:\nADHS (F90.0), Muttersprache Portugiesisch, Elterntraining empfohlen.', 'adhs:diagnose'],
    ['Die Eltern berichten von Unruhe zu Hause.\nDiagnosen: ADHS (F90.0)', 'adhs:diagnose'],
    // Fehltreffer der Muster: kein Profil
    ['Tom sucht häufig die Nähe der Erwachsenen.', ''],
    ['Dosierung in Abhängigkeit vom Körpergewicht.', ''],
    ['Il vit avec ses parents.', ''],
    ['Im Sozialverhalten zeigt er sich freundlich.', ''],
    ['Beurteilung: altersgerechte Intelligenzentwicklung', ''],
    ['Testung: IQ im Borderline-Bereich', ''],
    ['Zustand nach Schädel-Hirn-Trauma 2019', ''],
    ['Traumatherapie empfohlen', ''],
    ['Er gerät in Panik, wenn es laut wird.', ''],
    ['Medikation: ASS 100 mg täglich', ''],
    ['Achse V: abnorme psychosoziale Umstände', ''],
    // fehlende Namen der ADHS
    ['Diagnose: Einfache Aktivitäts- und Aufmerksamkeitsstörung', 'adhs:diagnose'],
    ['Diagnose: Aufmerksamkeitsstörung ohne Hyperaktivität (F98.8)', 'adhs:diagnose'],
    // Reichweite der Verneinung: Gegensatz, Verb, Komma nach ICD-Code, Wortgrenzen, Aufzählung
    ['Kein Hinweis auf Autismus, jedoch ADHS (F90.0).', 'adhs:diagnose,autismus:aus'],
    ['Nach Ausschluss organischer Ursachen besteht eine ADHS.', 'adhs:diagnose'],
    ['ADHS (F90.0), Autismus ausgeschlossen', 'adhs:diagnose,autismus:aus'],
    ['Tom möchte weiter in der Wohngruppe wohnen bleiben, ADHS (F90.0).', 'adhs:diagnose'],
    ['Kein Hinweis auf Autismus, ADHS oder Depression.', 'autismus:aus,adhs:aus,depression:aus'],
    ['ADHS und Autismus wurden ausgeschlossen.', 'adhs:aus,autismus:aus']
  ] /* FAELLE-ENDE */;
  const e2 = await page.evaluate(l => l.map(x => CDSE_BERICHTE.erkennen(x[0], null).profile.map(p => p.id + ':' + p.art).join(',')), faelle);
  faelle.forEach((x, i) => check('Erkennen: „' + x[0].replace(/\n/g, ' ⏎ ').slice(0, 70) + '“ → ' + (x[1] || 'kein Profil'), e2[i] === x[1], e2[i]));
  const e3 = await page.evaluate(() => {
    const E = t => CDSE_BERICHTE.erkennen(t, null), med = t => E(t).medikamente.map(m => m.name + ':' + m.status + (m.dosis ? ':' + m.dosis : '')).join(',');
    return {
      frueher: med('Früher Ritalin, abgesetzt wegen Appetitlosigkeit. Aktuell Medikinet retard 20 mg morgens.'),
      klausel: med('Risperidon abgesetzt, Methylphenidat 20 mg fortgeführt.'),
      empfohlen: med('Ein Therapieversuch mit Methylphenidat ist zu erwägen.'),
      abgelehnt: med('Eine medikamentöse Behandlung mit Methylphenidat wurde von den Eltern abgelehnt.'),
      geb: E('Arztbrief über Lea Beispiel, geb. 12.03.2014\nBericht vom 05.05.2026').datum,
      empf: E('Empfehlungen:\n1. Ergotherapie 2x wöchentlich\n2) Kontrolle in 3 Monaten\n- Elterntraining zum Umgang mit\noppositionellem Verhalten\nSeite 2 von 3\n- Nachteilsausgleich bei Klassenarbeiten prüfen').empfehlungen,
      kompass: ['ADHS ausgeschlossen', 'V.a. Autismus', 'Kein Hinweis auf Depression', 'F90.0 einfache Aktivitäts- und Aufmerksamkeitsstörung'].map(t => CDSE_BERICHTE.einordnen(t).map(x => x.id + ':' + x.art).join(','))
    };
  });
  check('Medikation: „früher Ritalin, abgesetzt … aktuell Medikinet 20 mg“ → aktuell mit 20 mg', e3.frueher === 'Methylphenidat:aktuell:20 mg', e3.frueher);
  check('Medikation: „abgesetzt“ gilt nur im eigenen Satzteil, Dosis beim richtigen Wirkstoff', e3.klausel === 'Risperidon:abgesetzt,Methylphenidat:aktuell:20 mg', e3.klausel);
  check('Medikation: Therapieversuch erwägen → nur empfohlen (nicht vorausgewählt)', e3.empfohlen === 'Methylphenidat:empfohlen', e3.empfohlen);
  check('Medikation: von den Eltern abgelehnt → abgelehnt (nicht vorausgewählt)', e3.abgelehnt === 'Methylphenidat:abgelehnt', e3.abgelehnt);
  check('Datum: „geb. 12.03.2014“ ist kein Berichtsdatum (ohne Geburtsdatum im Dossier)', e3.geb === '2026-05-05', e3.geb);
  check('Empfehlungen: Zahlen bleiben („2x“, „3 Monaten“), umbrochene Zeile zusammen, ohne „Seite 2 von 3“', JSON.stringify(e3.empf) === JSON.stringify(['Ergotherapie 2x wöchentlich', 'Kontrolle in 3 Monaten', 'Elterntraining zum Umgang mit oppositionellem Verhalten', 'Nachteilsausgleich bei Klassenarbeiten prüfen']), e3.empf);
  check('Kompass-Texte (DS, Datenbank): ausgeschlossen, V.a., kein Hinweis, Diagnose', e3.kompass.join(' | ') === 'adhs:aus | autismus:verdacht | depression:aus | adhs:diagnose', e3.kompass);
  /* PDF: kaputte Dateien dürfen den Hub nicht einfrieren (Hex-Text ohne „>“, „stream“ im Text eines Objekts) */
  const pdfKaputt = await page.evaluate(async () => {
    const buf = s => new TextEncoder().encode(s).buffer, frist = p => Promise.race([p.then(t => 'fertig', () => 'fertig'), new Promise(r => setTimeout(() => r('hängt'), 5000))]);
    return [await frist(CDSE_BERICHTE.pdfText(buf('%PDF-1.4\n1 0 obj\n<< /Type /Page /Contents 2 0 R >>\nendobj\n2 0 obj\n<< /Length 20 >>\nstream\nBT (Hallo) Tj <4142\nendstream\nendobj\n'))),
      await frist(CDSE_BERICHTE.pdfText(buf('%PDF-1.4\n1 0 obj\n<< /Length 5 >>\nstream\nhallo\nendstream\nendobj\n2 0 obj\n<< /Titel (mainstream) >>\nendobj\n')))];
  });
  check('PDF: Hex-Text ohne „>“ und „stream“ im Text eines Objekts – kein Einfrieren', pdfKaputt.join() === 'fertig,fertig', pdfKaputt);

  console.log('2) Arztbrief als PDF');
  const lea = await page.evaluate(async () => (await CDSE_TEAM.neuesDossier({ nachname: 'Beispiel', vorname: 'Lea', geschlecht: 'w', geburtsdatum: '2015-06-02', klasse: 'C4.1' }, { stelle: 'diagnostique' })).id);
  await reiter(lea, 'kompass');
  check('Kompass leer: Karte „Berichte und Arztbriefe“ mit Erklärung', (await text('.ber-karte')).includes('Übernommen wird nur, was du bestätigst'));
  await hochladen(pfadBrief);
  const d1 = await page.evaluate(() => {
    const dl = document.querySelector('dialog.ar-dialog'), v = n => { const el = dl.querySelector('[name="' + n + '"]'); return el ? (el.type === 'checkbox' ? el.checked : el.value) : null; };
    return { art: v('art'), datum: v('datum'), von: v('von'), adhs: v('p-adhs'), adhsArt: v('pa-adhs'), angst: v('p-angst'), angstArt: v('pa-angst'), autismus: v('p-autismus'),
      med: dl.querySelector('.ber-wahl:nth-of-type(2)') ? dl.querySelectorAll('.ber-wahl')[1].textContent : '', empf: dl.querySelectorAll('.ber-wahl')[2].querySelectorAll('input').length, ablegen: v('ablegen'), text: dl.textContent };
  });
  check('Art „Arztbrief“, Datum 12.03.2026 (nicht das Geburtsdatum), Absender aus dem Briefkopf', d1.art === 'arztbrief' && d1.datum === '2026-03-12' && /Beispielklinik/.test(d1.von), [d1.art, d1.datum, d1.von]);
  check('ADHS: Diagnose, angehakt (F90.0)', d1.adhs === true && d1.adhsArt === 'diagnose');
  check('Soziale Angst: Verdacht, angehakt', d1.angst === true && d1.angstArt === 'verdacht');
  check('Autismus: im Text ausgeschlossen, nicht angehakt', d1.autismus === false && d1.text.includes('im Text verneint oder ausgeschlossen'));
  check('Medikation: Methylphenidat 20 mg (aus „Medikinet retard 20 mg“)', /Methylphenidat\s*20 mg/.test(d1.med), d1.med.slice(0, 120));
  check('Drei Empfehlungen zur Auswahl, Originaldatei ablegen vorausgewählt', d1.empf === 3 && d1.ablegen === true, d1.empf);
  await page.screenshot({ path: path.join(OUT, 'r1-pruefen.png') });
  await page.check('dialog.ar-dialog input[name="e-0"]');
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Übernehmen")'); await warte(900);
  const c1 = Object.fromEntries(await chips());
  check('Kompass: ADHS (Diagnose) und Angststörung (Verdacht), kein Autismus', c1['ADHS'] === 'Diagnose' && c1['Angststörung'] === 'Verdacht' && !c1['Autismus-Spektrum'], c1);
  check('„Warum?“: laut Arztbrief (Beispielklinik) vom 12.03.2026', (await page.textContent('#ko-p-adhs .ko-warum')).includes('Laut Arztbrief (Kinder- und Jugendpsychiatrie Beispielklinik) vom 12.03.2026'));
  check('Kompass: Medikation laut Arztbrief', /Medikation\s*Methylphenidat 20 mg\s*\(laut Arztbrief vom 12\.03\.2026\)/.test(await text('.ko-fakten')), await text('.ko-fakten'));
  check('Karte: 1 Bericht mit Profilen und Medikation, Originaldatei', (await text('.ber-karte')).includes('Berichte und Arztbriefe (1)') && (await text('.ber-karte')).includes('Im Kompass: ADHS, Angststörung (Verdacht)') && (await text('.ber-karte')).includes('Originaldatei'));
  const an1 = await anhaenge();
  check('Originaldatei verschlüsselt in gemeinsam/anhaenge (kein PDF-Klartext)', an1.length === 1 && /\.cdsa$/.test(an1[0].n) && !an1[0].t.includes('%PDF') && an1[0].t.includes('"format":"cdse-anhang"'), an1.map(a => a.n));
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.ber-karte [data-ber="datei"]')]);
  const heruntergeladen = fs.readFileSync(await dl.path());
  check('Originaldatei herunterladen: gleiche Datei wie hochgeladen', heruntergeladen.equals(pdfBrief) && dl.suggestedFilename() === 'arztbrief-test.pdf', dl.suggestedFilename());
  await page.click('.ber-karte [data-ber="lesen"]'); await page.waitForSelector('dialog.ar-dialog .ber-text');
  check('Lesen: Text des Briefs und Empfehlungen', (await text('dialog.ar-dialog')).includes('Fortführung der Ergotherapie') && (await text('dialog.ar-dialog .ber-text')).includes('Medikinet retard 20 mg'));
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Schließen")'); await warte(200);
  await page.click('.ar-tabs [data-tab="begleitplan"]'); await warte(250);
  check('Begleitplan: Empfehlung als eigener Schritt (Umsetzen)', (await text('#bp-phase-umsetzen')).includes('Fortführung der Ergotherapie einmal pro Woche') && (await text('#bp-phase-umsetzen')).includes('Empfehlung aus: Arztbrief'));

  console.log('3) Word-Datei und eingefügter Text');
  await page.click('.ar-tabs [data-tab="kompass"]'); await warte(200);
  await hochladen(pfadDocx);
  const d2 = await page.evaluate(() => { const dl = document.querySelector('dialog.ar-dialog'); return { art: dl.querySelector('[name=art]').value, datum: dl.querySelector('[name=datum]').value, lern: dl.querySelector('[name="p-lernstoerung"]') && dl.querySelector('[name="p-lernstoerung"]').checked, intel: dl.querySelector('[name="p-intelligenz"]') ? dl.querySelector('[name="p-intelligenz"]').checked : null }; });
  check('Word: Befund vom 05.02.2026, Lese-Rechtschreibstörung angehakt, Intelligenzstörung verneint', d2.art === 'befund' && d2.datum === '2026-02-05' && d2.lern === true && d2.intel === false, d2);
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Übernehmen")'); await warte(800);
  check('Kompass: Lese-, Rechtschreib- oder Rechenstörung (Diagnose)', (Object.fromEntries(await chips()))['Lese-, Rechtschreib- oder Rechenstörung'] === 'Diagnose');
  await page.click('.ko-kopf [data-ber="neu"]'); await page.waitForSelector('dialog.ar-dialog .ber-einfuegen');
  await page.click('dialog.ar-dialog .ber-einfuegen summary');
  await page.fill('dialog.ar-dialog textarea[name="text"]', 'Therapiebericht Ergotherapie Praxis Beispiel, 20.08.2026\nDiagnose laut Vorbefund: ADHS.\nEmpfehlung: Bewegungspausen im Unterricht einplanen');
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Auslesen")'); await page.waitForSelector('dialog.ar-dialog .ber-wahl'); await warte(200);
  const d3 = await page.evaluate(() => { const dl = document.querySelector('dialog.ar-dialog'); return { art: dl.querySelector('[name=art]').value, ablegen: !!dl.querySelector('[name=ablegen]'), empf: dl.querySelectorAll('.ber-wahl')[2].textContent }; });
  check('Eingefügter Text: Therapiebericht, Empfehlung erkannt, keine Datei zum Ablegen', d3.art === 'therapie' && !d3.ablegen && d3.empf.includes('Bewegungspausen'), d3);
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Abbrechen")'); await warte(200);

  console.log('4) Scan ohne Text');
  await hochladen(pfadScan);
  check('Scan: Hinweis „kaum lesbarer Text“ mit Bitte ums Eintragen', (await text('dialog.ar-dialog .ber-warn')).includes('kaum lesbarer Text'));
  await page.fill('dialog.ar-dialog input[name="frei"]', 'Enuresis F98.0');
  check('Freitext ohne passendes Profil: sichtbar „keinem Profil zugeordnet“ statt stillschweigend weg', (await text('dialog.ar-dialog .ber-frei')).includes('Keinem Profil zugeordnet'), await text('dialog.ar-dialog .ber-frei'));
  await page.fill('dialog.ar-dialog input[name="frei"]', 'Verdacht auf F84.0');
  check('Freitext „Verdacht auf F84.0“: Hinweis „Autismus-Spektrum (Verdacht)“', (await text('dialog.ar-dialog .ber-frei')).includes('Autismus-Spektrum (Verdacht)'), await text('dialog.ar-dialog .ber-frei'));
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Übernehmen")'); await warte(800);
  check('Freitext „Verdacht auf F84.0“: Autismus-Spektrum als Verdacht', (Object.fromEntries(await chips()))['Autismus-Spektrum'] === 'Verdacht');
  check('Drei Originaldateien verschlüsselt abgelegt (PDF-Brief, Word-Befund, Scan)', (await anhaenge()).length === 3, (await anhaenge()).length);

  console.log('5) Entfernen, Protokoll, schmal');
  const vorher = (await anhaenge()).length;
  await page.click('.ber-liste li:has-text("Beispielklinik") [data-ber="loeschen"]'); await page.waitForSelector('dialog.ar-dialog');
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Entfernen")'); await warte(900);
  const c5 = Object.fromEntries(await chips());
  check('Bericht entfernt: ADHS und Angststörung wieder aus dem Kompass', !c5['ADHS'] && !c5['Angststörung'] && !(await text('.ber-karte')).includes('Beispielklinik'), c5);
  check('Originaldatei gelöscht', (await anhaenge()).length === vorher - 1, [(await anhaenge()).length, vorher]);
  await page.click('.ar-tabs [data-tab="verlauf"]'); await warte(200);
  const prot = await text('.ar-protokoll');
  check('Protokoll: „Bericht eingetragen … 2 Profile im Kompass, 1 Schritt im Begleitplan“ und „Bericht entfernt“ – ohne Diagnosen', prot.includes('Bericht eingetragen: Arztbrief (Kinder- und Jugendpsychiatrie Beispielklinik) vom 12.03.2026 – 2 Profile im Kompass, 1 Schritt im Begleitplan') && prot.includes('Bericht entfernt') && !prot.includes('F90'), prot.slice(0, 400));
  await page.setViewportSize({ width: 390, height: 844 });
  await reiter(lea, 'kompass');
  check('390 px: Kompass mit Berichten ohne seitliches Scrollen', (await quer()) <= 1, await quer());
  await hochladen(pfadBrief);
  check('390 px: Prüfdialog ohne seitliches Scrollen', (await quer()) <= 1, await quer());
  await page.screenshot({ path: path.join(OUT, 'r2-schmal.png') });
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Abbrechen")'); await warte(200);

  check('Keine Fehler in der Konsole', errors.length === 0, errors);
  await browser.close();
  console.log('\n' + ok + ' bestanden, ' + bad + ' fehlgeschlagen (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
