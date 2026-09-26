// Test: Fiche de renseignement im Hub – hochladen (neues Dossier), ansehen, Abschnitt bearbeiten,
// herunterladen (Inhalt prüfen), erneut hochladen (aktualisieren statt doppelt), ungültige Datei.
// Nur erfundene Personen.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'fiche-aus'); fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:8099/hub.html';
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info ? '  → ' + info : '')); } }
const FICHE = {
  person: { nachname: 'Beispiel', vorname: 'Mia', geschlecht: 'w', matricule: '2013 0704 222 11', schule: 'Lycée Musterstadt', klasse: '7G' },
  fiche: {
    datum: '2026-09-10', mfiles: '87654321', strasse: '5, rue du Test', ort: 'L-4321 Musterstadt', nationalitaet: 'portugaise', ersteSprache: 'portugais', geburtsort: 'Porto', ankunft: '2020-08-20',
    vertreter: [{ autoritaet: true, name: 'Rita Beispiel', funktion: 'Mère', tel: '691 000 111', mail: 'rita@example.lu' }, { autoritaet: true, name: 'Rui Beispiel', funktion: 'Père', tel: '691 000 222' }],
    familie: 'Famille recomposée.',
    schule: { name: 'Lycée Musterstadt', klasse: '7G', strasse: '1, avenue du Lycée', ort: 'L-4321 Musterstadt' },
    es: { pdr: { name: 'Paul Probe', mail: 'paul@example.lu' }, weitere: [{ rolle: 'SePas', name: 'Sonja Sepas' }] },
    progression: ['C1.1', 'C1.2', 'C2.1', 'C2.2', 'C3.1', 'C3.2', 'C4.1', 'C4.2', '7G'],
    intervenants: [{ institution: 'SCAS', name: 'Serge Sozial' }, { institution: 'Pédopsychiatre', name: 'Dr. Ruhig' }],
    cdse: { diagnostic: { aktiv: true, name: 'Anna Diag', von: '2025-11-03', bis: '2026-02-27' }, isa: { aktiv: true, name: 'Ben Isa', von: '2026-03-02' } }
  }
};
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => { window.__CDSE_TEST_ORDNER = () => navigator.storage.getDirectory(); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  const warte = ms => page.waitForTimeout(ms);
  async function gehe(hash) { await page.evaluate(h => { location.hash = h; }, hash); await warte(500); }
  async function dialogKnopf(text) { await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("' + text + '")'); }
  async function hochladen(knopfSel, datei) {
    const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click(knopfSel)]);
    await fc.setFiles(datei);
  }

  await page.goto(BASE);
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); for await (const [n] of r.entries()) { await r.removeEntry(n, { recursive: true }); } localStorage.clear(); sessionStorage.clear(); });
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); await r.getFileHandle('hub.html', { create: true }); });
  await page.reload();
  await page.click('#g-ordner'); await page.waitForSelector('#g-name');
  await page.fill('#g-name', 'Joey Muster'); await page.check('input[name="g-team"][value="diagnostique"]'); await page.selectOption('#g-resp', '-');
  await page.fill('#g-pw1', 'ein sicheres Passwort 1'); await page.fill('#g-pw2', 'ein sicheres Passwort 1');
  await page.click('#g-los'); await page.waitForSelector('#g-code', { timeout: 30000 });
  await page.check('#g-ok'); await page.click('#g-weiter'); await page.waitForSelector('#me:not([hidden])', { timeout: 30000 });
  await gehe('#/schueler'); await page.waitForSelector('[data-ar="einrichten"]'); await page.click('[data-ar="einrichten"]');
  await page.waitForSelector('[data-ar="neu"]', { timeout: 20000 });
  check('Fiche-Modul im Hub geladen', await page.evaluate(() => !!(window.CDSE_FICHE && CDSE_FICHE.lesen && CDSE_FICHE.schreiben)));
  check('Knopf „Fiche hochladen“ in der Liste', await page.isVisible('[data-ar="fiche-hochladen"]'));

  console.log('1) Erfundene, ausgefüllte Fiche erzeugen (mit der Vorlage des Hubs)');
  const b64 = await page.evaluate(async (F) => { const blob = await CDSE_FICHE.schreiben(F); const u = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); }, FICHE);
  const datei1 = path.join(OUT, '20260910_BeispielMia_Fiche_de_renseignement.docx'); fs.writeFileSync(datei1, Buffer.from(b64, 'base64'));
  check('Test-Fiche erzeugt (' + Math.round(fs.statSync(datei1).size / 1024) + ' KB)', fs.statSync(datei1).size > 50000);

  console.log('2) Hochladen → Vorschau → neues Dossier');
  await hochladen('[data-ar="fiche-hochladen"]', datei1);
  await page.waitForSelector('dialog.ar-dialog h2:has-text("Fiche de renseignement übernehmen")', { timeout: 15000 });
  check('Vorschau: Name vorbelegt', await page.inputValue('dialog input[name=nachname]') === 'Beispiel' && await page.inputValue('dialog input[name=vorname]') === 'Mia');
  check('Vorschau: Geburtsdatum aus der Matricule', await page.inputValue('dialog input[name=geburtsdatum]') === '2013-07-04', await page.inputValue('dialog input[name=geburtsdatum]'));
  check('Vorschau: Geschlecht, Schule, Klasse', await page.inputValue('dialog select[name=geschlecht]') === 'w' && await page.inputValue('dialog input[name=klasse]') === '7G');
  const vtext = await page.textContent('dialog .ar-dialog-inhalt');
  check('Vorschau: Zusammenfassung (Vertreter, Progression, Maßnahmen)', vtext.includes('Rita Beispiel (Mère)') && vtext.includes('C1.1 → C1.2') && vtext.includes('Diagnostic spécialisé') && vtext.includes('ISA'), vtext.slice(0, 300));
  check('Vorschau: Stelle aus den Maßnahmen vorgeschlagen (ISA)', await page.inputValue('dialog select[name=stelle]') === 'isa', await page.inputValue('dialog select[name=stelle]'));
  check('Kein Treffer → kein Aktualisieren-Vorschlag', !(await page.isVisible('dialog input[name=modus][value=aktualisieren]')));
  await page.screenshot({ path: path.join(OUT, '1-vorschau.png') });
  await dialogKnopf('Übernehmen');
  await page.waitForSelector('.ar-dkopf h1', { timeout: 20000 });
  check('Dossier angelegt und Reiter „Fiche“ offen', (await page.textContent('.ar-dkopf h1')).includes('BEISPIEL Mia') && await page.isVisible('.ar-tabs [data-tab="fiche"].on'));
  const tab = await page.textContent('.ar-tabinhalt');
  ['87654321', 'Porto', 'portugaise', 'Rita Beispiel', 'autorité parentale', 'Famille recomposée.', 'Lycée Musterstadt', 'Paul Probe', 'SePas', 'C4.2', 'SCAS', 'Serge Sozial', 'Anna Diag', 'seit 02.03.2026']
    .forEach(w => check('Reiter Fiche zeigt „' + w + '“', tab.includes(w)));
  check('Stelle ISA', (await page.textContent('.ar-dkopf')).includes('ISA'));
  const sid = await page.evaluate(() => location.hash.split('/').pop());
  await page.screenshot({ path: path.join(OUT, '2-reiter-fiche.png'), fullPage: true });
  const verlauf = await page.evaluate(async id => (await CDSE_TEAM.dossier(id)).verlauf.map(v => v.t).join(' | '), sid);
  check('Protokoll: „aus der Fiche de renseignement“', verlauf.includes('aus der Fiche de renseignement'), verlauf);

  console.log('3) Abschnitt bearbeiten (Dépistage) und Stammdaten');
  await page.click('[data-ar="fiche-teil"][data-teil="depistage"]');
  await page.fill('dialog input[name="f.depistage.cdv"]', 'Contrôle visuel 2024 – sans particularité');
  await dialogKnopf('Speichern'); await warte(800);
  check('Dépistage gespeichert und angezeigt', (await page.textContent('.ar-tabinhalt')).includes('Contrôle visuel 2024'));
  await page.click('[data-ar="fiche-teil"][data-teil="cdse"]');
  await page.check('dialog input[name="f.cdse.cgEltern.aktiv"]'); await page.fill('dialog input[name="f.cdse.cgEltern.name"]', 'Clara Guide'); await page.fill('dialog input[name="f.cdse.cgEltern.von"]', '2026-09-01');
  await dialogKnopf('Speichern'); await warte(800);
  check('Maßnahme ergänzt (C&G parents, laufend)', (await page.textContent('.ar-massn')).includes('Conseil et guidance parents') && await page.isVisible('.ar-massn li.an:has-text("Clara Guide")'));

  console.log('4) Herunterladen und Inhalt prüfen');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.ar-fkopf [data-ar="fiche-download"]')]);
  const ziel = path.join(OUT, 'download.docx'); await dl.saveAs(ziel);
  check('Dateiname JJJJMMTT_NameVorname_Fiche…', /^20260910_BeispielMia_Fiche_de_renseignement\.docx$/.test(dl.suggestedFilename()), dl.suggestedFilename());
  const zurueck = await page.evaluate(async (b) => { const bin = atob(b), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return (await CDSE_FICHE.lesenAusBlob(new Blob([u]))).daten; }, fs.readFileSync(ziel).toString('base64'));
  check('Download enthält die Änderung (Dépistage CDV)', zurueck.fiche.depistage && zurueck.fiche.depistage.cdv === 'Contrôle visuel 2024 – sans particularité');
  check('Download enthält neue Maßnahme angekreuzt', zurueck.fiche.cdse.cgEltern && zurueck.fiche.cdse.cgEltern.aktiv === true && zurueck.fiche.cdse.cgEltern.von === '2026-09-01');
  check('Download: Name, Matricule, Vertreter', zurueck.person.nachname === 'Beispiel' && zurueck.person.matricule === '2013 0704 222 11' && zurueck.fiche.vertreter[1].name === 'Rui Beispiel');

  console.log('4b) Lesen: Lücken der Schullaufbahn, unlesbare Daten, nicht angekreuzte Maßnahmen, Geschlecht, Kästchen mit x');
  const lese = await page.evaluate(async (F) => {
    const f = JSON.parse(JSON.stringify(F));
    f.fiche.progression = ['C1.1', '', 'C2.1'];
    f.person.geburtsdatum = 'Frühjahr 2013';
    f.fiche.cdse.isa.von = 'Sept. 2025';
    const r = await CDSE_FICHE.lesenAusBlob(await CDSE_FICHE.schreiben(f));
    return { prog: r.daten.fiche.progression, geb: r.daten.person.geburtsdatum, hinweise: r.hinweise, cdse: r.daten.fiche.cdse,
      g: ['Mädchen', 'Maedchen', 'fille', 'F', 'M', 'garçon', 'männlich', 'Masculin'].map(t => CDSE_FICHE.geschlechtAus(t)),
      k: ['☐ x autorité parentale', 'X ☐', '✔ autorité parentale', '☐ autorité parentale', '☒'].map(t => CDSE_FICHE.angekreuzt(t)) };
  }, FICHE);
  check('Schullaufbahn mit Lücke bleibt an ihrer Stelle (C1.1, leer, C2.1) – beim Herunterladen keine verschobenen Spalten', JSON.stringify(lese.prog) === JSON.stringify(['C1.1', '', 'C2.1']), JSON.stringify(lese.prog));
  /* Die CDSE-Vorlage hat kein Feld „Date de naissance“ (nur den Geburtsort): Das Geburtsdatum kommt aus der Matricule */
  check('Geburtsdatum aus der Matricule, mit Hinweis in der Vorschau', lese.geb === '2013-07-04' && lese.hinweise.some(h => h.includes('aus der Matricule')), lese.hinweise.join(' | '));
  check('Unlesbares Datum einer Maßnahme („Sept. 2025“): Hinweis je Feld', lese.hinweise.some(h => h.includes('ISA') && h.includes('Sept. 2025') && h.includes('ohne Beginn')), lese.hinweise.join(' | '));
  check('Nicht angekreuzte Maßnahmen der Datei kommen als aktiv:false mit (so kann eine neuere Fiche einen Haken entfernen)', lese.cdse.isa.aktiv === true && lese.cdse.cgEltern && lese.cdse.cgEltern.aktiv === false, JSON.stringify(lese.cdse));
  check('Geschlecht: „Mädchen“ und „Maedchen“ sind Mädchen (ganzes Wort, nicht „beginnt mit m“)', lese.g.join() === 'w,w,w,w,m,m,m,m', lese.g.join());
  check('Kästchen als Zeichen: x, X, ✓, ✔ neben dem Kästchen zählen als angekreuzt', lese.k.join() === 'true,true,true,false,true', lese.k.join());

  console.log('5) Erneut hochladen (geänderte Telefonnummer) → aktualisieren statt doppelt');
  const F2 = JSON.parse(JSON.stringify(FICHE)); F2.fiche.vertreter[0].tel = '691 999 999'; F2.fiche.datum = '2026-09-20'; F2.fiche.depistage = {};
  const b64b = await page.evaluate(async (F) => { const blob = await CDSE_FICHE.schreiben(F); const u = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); }, F2);
  const datei2 = path.join(OUT, 'fiche-neu.docx'); fs.writeFileSync(datei2, Buffer.from(b64b, 'base64'));
  await gehe('#/schueler'); await page.waitForSelector('[data-ar="fiche-hochladen"]');
  const vorher = await page.evaluate(async () => (await CDSE_TEAM.alleDossiers(true)).length);
  await hochladen('[data-ar="fiche-hochladen"]', datei2);
  await page.waitForSelector('dialog input[name=modus][value=aktualisieren]', { timeout: 15000 });
  check('Treffer über die Matricule erkannt', (await page.textContent('dialog .ar-wahlgruppe')).includes('gleiche Matricule'));
  check('Vorschau: im Dossier laufende Maßnahme, die in der Datei nicht angekreuzt ist, wird nicht still beendet (Häkchen „beenden“ aus)', await page.evaluate(() => { const c = document.querySelector('dialog input[name="ende_cgEltern"]'); return !!c && !c.checked; }));
  await dialogKnopf('Übernehmen');
  await page.waitForSelector('.ar-dkopf h1', { timeout: 20000 }); await warte(500);
  const nachher = await page.evaluate(async () => (await CDSE_TEAM.alleDossiers(true)).length);
  check('Kein doppeltes Dossier', vorher === nachher, vorher + ' → ' + nachher);
  const t2 = await page.textContent('.ar-tabinhalt');
  check('Neue Telefonnummer übernommen', t2.includes('691 999 999'));
  check('Leere Felder der neuen Fiche löschen nichts (Dépistage bleibt)', t2.includes('Contrôle visuel 2024'));
  check('Handeingetragene Maßnahme bleibt', t2.includes('Clara Guide'));
  check('… und bleibt aktiv (nicht bestätigt)', await page.evaluate(async () => { const d = await CDSE_TEAM.dossier(location.hash.split('/').pop(), true); return !!(d.fiche.cdse.cgEltern && d.fiche.cdse.cgEltern.aktiv === true); }));
  check('Stand der Fiche aktualisiert', t2.includes('Stand 20.09.2026'));

  console.log('6) Ungültige Datei');
  const kaputt = path.join(OUT, 'kaputt.docx'); fs.writeFileSync(kaputt, 'keine Word-Datei');
  await gehe('#/schueler'); await page.waitForSelector('[data-ar="fiche-hochladen"]');
  await hochladen('[data-ar="fiche-hochladen"]', kaputt);
  await page.waitForSelector('dialog h2:has-text("Fiche ließ sich nicht lesen")', { timeout: 10000 });
  check('Verständliche Meldung bei kaputter Datei', (await page.textContent('dialog')).includes('keine Word-Datei'));
  await dialogKnopf('Schließen');

  console.log('7) Handy-Ansicht');
  await gehe('#/schueler/' + sid); await page.waitForSelector('.ar-tabs [data-tab="fiche"]');
  await page.click('.ar-tabs [data-tab="fiche"]'); await page.setViewportSize({ width: 390, height: 844 }); await warte(300);
  const breit = await page.evaluate(() => document.documentElement.scrollWidth);
  check('390 px: kein waagrechtes Scrollen', breit <= 392, breit);
  await page.screenshot({ path: path.join(OUT, '3-mobil.png'), fullPage: true });

  check('Keine Fehler in der Konsole', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler');
  await browser.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
