// Test: Korrekturen aus der Durchsicht des Hubs der Annexe Junglinster – je Befund eine gezielte Prüfung.
// Dossier: Fiche eines anderen Kindes (D1), Verdacht vor/nach ICD-Code und Titel (D2), Angaben der Fiche in Kompass und
// Begleitplan ohne Datenbank (D3, D4), Übergabeblatt (D5), Rückfrage vor dem Verwerfen (D6), Neuladen mit Ungespeichertem
// (D7), Screening nach dem Speichern oben (D8), Suche (D10), Plausibilität (D11), Einschätzung ohne Änderung (D12),
// Kompass-Druck (D13), Einschätzung bei 390 px (D14), nur lesen (D15).
// Einstieg und Verwaltung: Startcodes und Esc (F3), Mitglieder bei 1024 px (F4), Konto-Karten bei 390 px (F5), Abmelden
// mit ungespeichertem Einsatzplan (F6), Eingaben bleiben nach Fehlermeldungen (F7), Schülerbereich inzwischen an einem
// anderen PC eingerichtet (F8), Übersicht nach F5 (F9), Kacheltexte (F10), Teamliste (F11), Hinweis „Responsable“ (F12),
// Seitenleiste (F13), Vor- und Nachname (F14), eingebettete App unter file:// (F15).
// Zwei PCs am selben Hub-Ordner stellt tests/netzordner.js bereit. Nur erfundene Personen.
// Aufruf: node hub-quellen/tests/annexe-korrekturen.js   (Webserver auf Port 8099 für den Hauptordner)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const { netzordner, verbinden } = require(path.join(__dirname, 'netzordner.js'));
const ROOT = process.env.ROOT || 'http://127.0.0.1:8099/';
const HUB_DATEI = path.resolve(__dirname, '..', '..', 'hub.html');
const OUT = path.join(__dirname, 'annexe-korrekturen-aus'); fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const PW = 'ein sicheres Passwort 1';
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + (typeof info === 'string' ? info : JSON.stringify(info)).slice(0, 400) : '')); } }
const nurLokal = r => { const u = r.request().url(); return (u.startsWith(ROOT) || u.startsWith('file://') || u.startsWith('data:') || u.startsWith('blob:') || u === 'about:blank') ? r.continue() : r.abort(); };

(async () => {
  const t0 = Date.now();
  const browser = await chromium.launch();
  const errors = [], dialoge = [];
  let antwort = null;   /* eigene Antwort auf confirm/beforeunload: false = ablehnen */
  const aufPage = (p, wer) => {
    p.on('pageerror', e => errors.push((wer || '') + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push((wer || '') + m.text()); });
    p.on('dialog', d => { dialoge.push(d.type() + ': ' + d.message()); if (antwort && antwort(d) === false) { return d.dismiss(); } return d.type() === 'prompt' ? d.accept('Test Person') : d.accept(); });
  };
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: 'de-DE', timezoneId: 'Europe/Luxembourg', acceptDownloads: true });
  await ctx.route('**/*', nurLokal);
  await ctx.addInitScript(() => { window.__CDSE_TEST_ORDNER = () => navigator.storage.getDirectory(); });
  const page = await ctx.newPage(); aufPage(page);
  const warte = ms => page.waitForTimeout(ms);
  const text = async sel => ((await page.textContent(sel)) || '').replace(/\s+/g, ' ');
  async function gehe(hash, ms) { await page.evaluate(h => { location.hash = h; }, hash); await warte(ms || 500); }
  async function knopf(t) { await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("' + t + '")'); }
  async function dialogZu() { await page.waitForFunction(() => !document.querySelector('dialog.ar-dialog'), null, { timeout: 60000 }); await warte(300); }
  const dialogOffen = () => page.evaluate(() => !!document.querySelector('dialog.ar-dialog'));
  const dialogFehler = () => page.evaluate(() => { const p = document.querySelector('dialog.ar-dialog .ar-dialog-fehler'); return p && !p.hidden ? p.textContent : ''; });
  async function verwerfen() { for (let i = 0; i < 3 && await dialogOffen(); i++) { await page.keyboard.press('Escape'); await warte(250); } }
  async function reiter(tab) { await page.click('.ar-tabs [data-tab="' + tab + '"]'); await warte(300); }
  async function menue(aktion) { if (await page.isVisible('#me-btn')) { await page.click('#me-btn'); } else { await page.click('#me-ava'); } await page.click('[data-konto="' + aktion + '"]'); }
  async function neuerSchueler(nach, vor, extra) {
    await gehe('#/schueler'); await page.waitForSelector('[data-ar="neu"]', { timeout: 20000 });
    await page.click('[data-ar="neu"]'); await page.waitForSelector('dialog input[name=nachname]');
    await page.fill('dialog input[name=nachname]', nach); await page.fill('dialog input[name=vorname]', vor);
    for (const k of Object.keys(extra || {})) { await page.fill('dialog [name=' + k + ']', extra[k]); }
    await knopf('Anlegen');
    await page.waitForFunction(n => { const h = document.querySelector('.ar-dkopf h1'); return h && h.textContent.indexOf(n) >= 0; }, nach.toUpperCase(), { timeout: 20000 });
    return page.evaluate(() => location.hash.split('/').pop());
  }
  const akt = () => page.evaluate(() => CDSE_ARBEIT.hilfen.aktDossier());
  const eintraege = async () => (await akt()).eintraege || [];
  const heuteHub = () => page.evaluate(() => CDSE_ARBEIT.hilfen.heuteIso());

  await page.goto(ROOT + 'hub.html');
  await page.evaluate(async () => {
    const r = await navigator.storage.getDirectory(); for await (const [n] of r.entries()) { await r.removeEntry(n, { recursive: true }); }
    localStorage.clear(); sessionStorage.clear();
    for (const n of ['cdse_dossier_db', 'klassebuch-sync', 'anwesenheit-sync']) { await new Promise(res => { const q = indexedDB.deleteDatabase(n); q.onsuccess = q.onerror = q.onblocked = () => res(); }); }
    await r.getFileHandle('hub.html', { create: true });
  });
  await page.reload();

  console.log('D2) Berichte: Verdacht vor oder nach „ICD-Code + Titel“');
  const FAELLE = [
    ['Verdacht auf F90.0 Einfache Aktivitäts- und Aufmerksamkeitsstörung', 'adhs:verdacht'],
    ['V. a. F84.0 Frühkindlicher Autismus', 'autismus:verdacht'],
    ['V.a. F32.1 Mittelgradige depressive Episode', 'depression:verdacht'],
    ['Verdacht auf F81.0 Lese- und Rechtschreibstörung', 'lernstoerung:verdacht'],
    ['F90.0 Einfache Aktivitäts- und Aufmerksamkeitsstörung (Verdacht)', 'adhs:verdacht'],
    ['F84.0 Frühkindlicher Autismus, V. a.', 'autismus:verdacht'],
    ['F90.1 Hyperkinetische Störung des Sozialverhaltens (Verdacht)', 'adhs:verdacht,sozialverhalten:verdacht'],
    ['Diagnose: F84.0 Frühkindlicher Autismus. Verdacht auf F90.0 Einfache Aktivitäts- und Aufmerksamkeitsstörung.', 'autismus:diagnose,adhs:verdacht'],
    ['Kein Hinweis auf F84.0 Frühkindlicher Autismus', 'autismus:aus'],
    ['F90.0 Einfache Aktivitäts- und Aufmerksamkeitsstörung ohne Autismus', 'adhs:diagnose,autismus:aus'],
    ['F90.0 Einfache Aktivitäts- und Aufmerksamkeitsstörung', 'adhs:diagnose'],
    ['Verdacht auf ADHS', 'adhs:verdacht']
  ];
  const d2 = await page.evaluate(l => l.map(x => CDSE_BERICHTE.erkennen(x[0], null).profile.map(p => p.id + ':' + p.art).join(',')), FAELLE);
  FAELLE.forEach((x, i) => check('„' + x[0].slice(0, 72) + '“ → ' + x[1], d2[i] === x[1], d2[i]));

  console.log('F14, F7, F5) Konto erstellen');
  await page.click('#g-ordner'); await page.waitForSelector('#g-name');
  await page.fill('#g-name', 'Tom'); await page.fill('#g-funktion', 'Instituteur'); await page.selectOption('#g-resp', '-');
  await page.fill('#g-pw1', PW); await page.fill('#g-pw2', PW); await page.click('#g-los'); await warte(700);
  check('F14: nur ein Vorname („Tom“) → Meldung „Vor- und Nachnamen“, kein Konto', !(await page.$('#g-code')) && (await text('#gate .meldung')).includes('Vor- und Nachnamen'), await text('#gate-card'));
  check('F7: Passwörter bleiben nach der Meldung, Fokus im Namensfeld', (await page.inputValue('#g-pw1')) === PW && (await page.inputValue('#g-pw2')) === PW && (await page.evaluate(() => document.activeElement.id)) === 'g-name');
  check('F7: Passwort steht nicht im HTML', !(await page.innerHTML('#gate-card')).includes(PW));
  await page.fill('#g-name', 'Mia Muster'); await page.fill('#g-funktion', 'Direktion');
  await page.evaluate(() => { document.getElementById('g-resp').value = ''; });
  await page.click('#g-los'); await warte(700);
  check('F7: Responsable fehlt → beide Passwörter bleiben, Fokus auf der Auswahl', (await text('#gate .meldung')).includes('Responsable') && (await page.inputValue('#g-pw1')) === PW && (await page.inputValue('#g-pw2')) === PW && (await page.evaluate(() => document.activeElement.id)) === 'g-resp');
  await page.selectOption('#g-resp', '-'); await page.fill('#g-pw2', 'ein anderes Passwort 2'); await page.click('#g-los'); await warte(700);
  check('F7: Passwörter ungleich → das erste bleibt, das zweite ist leer und hat den Fokus', (await text('#gate .meldung')).includes('nicht gleich') && (await page.inputValue('#g-pw1')) === PW && (await page.inputValue('#g-pw2')) === '' && (await page.evaluate(() => document.activeElement.id)) === 'g-pw2');
  await page.setViewportSize({ width: 390, height: 844 }); await warte(300);
  const f5a = await page.evaluate(() => { const c = document.getElementById('gate-card').getBoundingClientRect(); return { l: Math.round(c.left), r: Math.round(c.right), w: innerWidth }; });
  check('F5: „Konto erstellen“ bei 390 px ganz im Bild (lange Auswahl „keine/n Responsable“)', f5a.l >= 0 && f5a.r <= f5a.w, f5a);
  await page.setViewportSize({ width: 1400, height: 900 }); await warte(200);
  await page.fill('#g-pw2', PW); await page.click('#g-los');
  await page.waitForSelector('#g-code', { timeout: 30000 }); await page.check('#g-ok'); await page.click('#g-weiter'); await page.waitForSelector('#me:not([hidden])', { timeout: 30000 });
  await warte(1500);

  console.log('F10, F13, F12, F6) Übersicht, Seitenleiste, Einsatzplan');
  const f10 = await page.evaluate(() => [...document.querySelectorAll('#home-body .tile:not(.add) p')].map(p => ({ h: p.getBoundingClientRect().height, max: parseFloat(getComputedStyle(p).lineHeight) * 3 + 1 })).filter(x => x.h > x.max).length);
  check('F10: kein Kacheltext höher als drei Zeilen (kein „…“ mitten im Text)', f10 === 0, f10);
  check('F10: Fuß der Kacheln bleibt unten (alle Kacheln einer Reihe gleich hoch, Fuß am unteren Rand)', await page.evaluate(() => [...document.querySelectorAll('#home-body .tile:not(.add)')].every(t => { const f = t.querySelector('.tile-foot'); return !f || Math.abs(f.getBoundingClientRect().bottom - t.getBoundingClientRect().bottom) < 2; })));
  const schmal = () => page.evaluate(() => document.getElementById('hub').classList.contains('rail'));
  await page.click('#collapse'); await warte(200);
  const s0 = await schmal(); await gehe('#/einsatz', 800); const s1 = await schmal(); await gehe('#/', 500); const s2 = await schmal();
  await page.reload(); await page.waitForSelector('#me:not([hidden])', { timeout: 30000 }); await warte(800); const s3 = await schmal();
  check('F13: „Einklappen“ bleibt beim Seitenwechsel und nach dem Neuladen', s0 && s1 && s2 && s3, { s0, s1, s2, s3 });
  await page.click('#collapse'); await warte(200);
  await gehe('#/app/eldib', 1200); const s4 = await schmal(); await gehe('#/', 400);
  check('F13: „Ausklappen“ gilt auch in Apps', s4 === false);
  await gehe('#/einsatz', 800); await page.waitForSelector('[data-ar="block-neu"]', { timeout: 30000 });
  check('F12: „keine/n Responsable“ gewählt → kein Hinweis „noch keine/n Responsable eingetragen“', !(await text('#ar-einsatz')).includes('noch keine/n Responsable'));
  await page.click('[data-ar="block-neu"]'); await page.waitForSelector('dialog input[name=ort]');
  await page.fill('dialog input[name=ort]', 'École Musterstadt'); await knopf('Übernehmen'); await dialogZu();
  dialoge.length = 0; antwort = d => d.type() === 'confirm' ? false : true;
  await menue('abmelden'); await warte(1500);
  antwort = null;
  check('F6: Abmelden mit ungespeichertem Einsatzplan fragt nach', dialoge.some(x => /Einsatzplan hat ungespeicherte Änderungen/.test(x)), dialoge);
  check('F6: „Abbrechen“ bei der Rückfrage → angemeldet, Plan noch da', await page.isVisible('#me:not([hidden])') && (await page.isHidden('#gate')) && (await text('#ar-einsatz')).includes('Ungespeicherte Änderungen'));
  await page.click('[data-ar="plan-speichern"]'); await page.waitForFunction(() => /Alles gespeichert/.test((document.querySelector('.ar-speicherleiste') || {}).textContent || ''), null, { timeout: 30000 });

  console.log('D3, D4, D5, D1) Fiche: Kompass und Begleitplan ohne Datenbank, Übergabeblatt, anderes Kind');
  await gehe('#/schueler'); await page.waitForSelector('[data-ar="einrichten"]'); await page.click('[data-ar="einrichten"]');
  await page.waitForSelector('[data-ar="neu"]', { timeout: 20000 });
  async function ficheDatei(F, name) {
    const b64 = await page.evaluate(async F => { const blob = await CDSE_FICHE.schreiben(F); const u = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 32768) { s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); } return btoa(s); }, F);
    const p = path.join(OUT, name); fs.writeFileSync(p, Buffer.from(b64, 'base64')); return p;
  }
  async function hochladen(sel, datei) { const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click(sel)]); await fc.setFiles(datei); await page.waitForSelector('dialog.ar-dialog h2:has-text("Fiche de renseignement übernehmen")', { timeout: 20000 }); }
  const ankunft = new Date(Date.now() - 200 * 864e5).toISOString().slice(0, 10);
  const leaDatei = await ficheDatei({ person: { nachname: 'Beispiel', vorname: 'Lea', geschlecht: 'w', geburtsdatum: '2014-03-02', schule: 'École Lindenhof', klasse: 'C4.2' },
    fiche: { datum: '2026-09-12', ersteSprache: 'portugais', ankunft: ankunft, vertreter: [{ autoritaet: true, name: 'Rita Beispiel', funktion: 'Mère', tel: '691 000 111' }],
      schule: { name: 'École Lindenhof', klasse: 'C4.2' }, intervenants: [{ institution: 'SCAS', name: 'Serge Sozial' }, { institution: 'Pédopsychiatre', name: 'Dr. Probst' }],
      cdse: { annexe: { aktiv: true, name: 'Mia Muster', von: '2026-09-15' } } } }, 'lea.docx');
  const tomDatei = await ficheDatei({ person: { nachname: 'Muster', vorname: 'Tom', geschlecht: 'm', schule: 'École Beispieldorf', klasse: 'C3.1' }, fiche: { datum: '2026-09-20' } }, 'tom.docx');
  await hochladen('[data-ar="fiche-hochladen"]', leaDatei);
  await knopf('Übernehmen'); await dialogZu(); await page.waitForSelector('.ar-dkopf h1');
  const lea = await page.evaluate(() => location.hash.split('/').pop());
  const ko = await page.evaluate(() => { const k = CDSE_KOMPASS.lesen(CDSE_ARBEIT.hilfen.aktDossier()); return { stufe: k.ctx.schulstufe, umfeld: Object.keys(k.ctx.umfeld) }; });
  check('D3: Kompass liest die Klasse der Fiche (C4.2 → C4)', ko.stufe === 'C4', ko);
  check('D3: Lebenslage aus der Fiche: neu in Luxemburg, mehrsprachig, Helfernetz', ['neu', 'mehrsprachig', 'netz'].every(x => ko.umfeld.includes(x)), ko);
  await reiter('kompass'); const koText = await text('#ar-tabinhalt');
  await reiter('begleitplan');
  check('D3: Begleitplan: Schritt „Helfernetz abstimmen“ mit SCAS', await page.evaluate(() => { const s = document.querySelector('.bp-schritt[data-key="netz"]'); return !!s && /SCAS/.test(s.textContent); }));
  check('D3: kein „Datenbank“ im Kompass und im Begleitplan', !koText.includes('Datenbank') && !(await text('#ar-tabinhalt')).includes('Datenbank'));
  const ueb = await page.evaluate(() => CDSE_ARBEIT.hilfen.uebergabeHtml(CDSE_ARBEIT.hilfen.aktDossier()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
  check('D5: Übergabeblatt: Eltern / Kontakt und Sprachen aus der Fiche', /Eltern \/ Kontakt Rita Beispiel \(Mère\), 691 000 111/.test(ueb) && /Sprachen portugais/.test(ueb), ueb.slice(0, 300));
  check('D5: ohne DS kein leerer Abschnitt „Auf einen Blick“', !ueb.includes('Auf einen Blick') && ueb.includes('Noch kein DS-Profil'));
  const tom = await neuerSchueler('Muster', 'Tom', { klasse: 'C3.1', geburtsdatum: '2016-05-05' });
  await reiter('fiche'); await page.click('[data-ar="fiche-teil"][data-teil="person"]'); await page.waitForSelector('dialog.ar-dialog'); await knopf('Speichern'); await dialogZu();
  await reiter('begleitplan');
  const bpTom = await page.evaluate(() => { const s = document.querySelector('.bp-schritt[data-key="fiche"]'); return s ? { status: s.className, text: s.textContent } : null; });
  check('D4: fast leere Fiche → Schritt offen und nennt, was fehlt', !!bpTom && !/erledigt/.test(bpTom.status) && /Es fehlen noch: .*Erziehungsberechtigte.*Schule.*Maßnahme/.test(bpTom.text), bpTom);
  check('D3: Kompass bei Tom: Stufe aus der Klasse C3.1 (nicht aus dem Alter)', (await page.evaluate(() => CDSE_KOMPASS.lesen(CDSE_ARBEIT.hilfen.aktDossier()).ctx.schulstufe)) === 'C3');
  await gehe('#/schueler/' + lea); await page.waitForSelector('.ar-dkopf h1'); await reiter('fiche');
  await hochladen('.ar-tabinhalt [data-ar="fiche-hochladen-dossier"]', tomDatei);
  const d1 = await page.evaluate(() => { const d = document.querySelector('dialog.ar-dialog'); const r = d.querySelector('input[name=modus]:checked'); return { text: d.textContent.replace(/\s+/g, ' '), gewaehlt: r ? r.value : '', optionen: [...d.querySelectorAll('input[name=modus]')].map(x => x.value).join(',') }; });
  check('D1: Warnung nennt beide Kinder (MUSTER Tom / BEISPIEL Lea)', /Anderes Kind\?.*MUSTER Tom.*BEISPIEL Lea/.test(d1.text), d1.text.slice(0, 300));
  check('D1: nichts vorausgewählt, „Neues Dossier anlegen“ angeboten', d1.gewaehlt === '' && d1.optionen === 'aktualisieren,neu', d1);
  await page.check('dialog input[name=modus][value=aktualisieren]'); await knopf('Übernehmen'); await warte(800);
  check('D1: „aktualisieren“ braucht eine ausdrückliche Bestätigung', await dialogOffen() && /Die Fiche ist von MUSTER Tom, das Dossier von BEISPIEL Lea/.test(await dialogFehler()), await dialogFehler());
  await verwerfen();
  check('D1: abgebrochen → Leas Dossier unverändert', (await text('.ar-dkopf h1')).includes('BEISPIEL Lea') && (await page.evaluate(async id => (await CDSE_TEAM.dossier(id, true)).person.vorname, lea)) === 'Lea');
  await hochladen('.ar-tabinhalt [data-ar="fiche-hochladen-dossier"]', tomDatei);
  await page.check('dialog input[name=modus][value=neu]'); await knopf('Übernehmen'); await dialogZu(); await page.waitForSelector('.ar-dkopf h1');
  check('D1: „Neues Dossier anlegen“ → eigenes Dossier für Tom, Lea bleibt Lea', (await text('.ar-dkopf h1')).includes('MUSTER Tom') && (await page.evaluate(async id => (await CDSE_TEAM.dossier(id, true)).person.vorname, lea)) === 'Lea');

  console.log('D2) Bericht einfügen: Vorauswahl „Verdacht“');
  await gehe('#/schueler/' + lea); await page.waitForSelector('.ar-dkopf h1'); await reiter('kompass');
  await page.click('.ko-kopf [data-ber="neu"]'); await page.waitForSelector('dialog.ar-dialog .ber-einfuegen');
  await page.click('dialog.ar-dialog .ber-einfuegen summary');
  await page.fill('dialog.ar-dialog textarea[name="text"]', 'Arztbrief (erfunden), 10.09.2026\nDiagnosen:\nVerdacht auf F90.0 Einfache Aktivitäts- und Aufmerksamkeitsstörung');
  await knopf('Auslesen'); await page.waitForSelector('dialog.ar-dialog .ber-wahl'); await warte(200);
  const vor = await page.evaluate(() => { const d = document.querySelector('dialog.ar-dialog'), p = d.querySelector('[name="p-adhs"]'), a = d.querySelector('[name="pa-adhs"]'); return { an: !!p && p.checked, art: a ? a.value : '' }; });
  check('D2: „Verdacht auf F90.0 …“ ist als Verdacht vorausgewählt', vor.an && vor.art === 'verdacht', vor);
  await knopf('Übernehmen'); await dialogZu();
  check('D2: im Kompass „Verdacht“, nicht „Diagnose“', (await page.evaluate(() => (CDSE_KOMPASS.lesen(CDSE_ARBEIT.hilfen.aktDossier()).profile.filter(p => p.id === 'adhs')[0] || {}).art)) === 'verdacht');

  console.log('D13) Kompass drucken: Quellen „[1]“ in einer Zeile');
  await page.evaluate(() => { document.querySelectorAll('#ko-ergebnis details').forEach(x => { x.open = true; }); document.body.classList.add('ko-druck'); });
  await page.emulateMedia({ media: 'print' });
  const d13 = await page.evaluate(() => { const l = [...document.querySelectorAll('#ko-ergebnis .ko-q')]; if (!l.length) { return null; } return { anzahl: l.length, display: getComputedStyle(l[0]).display, hoehe: Math.max.apply(null, l.map(q => Math.round(q.getBoundingClientRect().height))), schrift: parseFloat(getComputedStyle(l[0]).fontSize) }; });
  await page.emulateMedia({ media: 'screen' }); await page.evaluate(() => document.body.classList.remove('ko-druck'));
  check('D13: Quelle im Druck „[1]“ in einer Zeile (nicht „[“, Zahl, „]“ untereinander)', !!d13 && !/grid/.test(d13.display) && d13.hoehe <= d13.schrift * 1.5, d13);

  console.log('D10) Suche');
  await neuerSchueler('Weiß', 'Emma', { klasse: 'C2.1' });
  await gehe('#/schueler'); await page.waitForSelector('#ar-liste a.ar-zeile');
  await page.fill('#ar-q', 'muster'); await warte(400);
  const d10a = await page.$$eval('#ar-liste a.ar-zeile b', l => l.map(b => b.textContent));
  check('D10: „muster“ findet nur Tom Muster – nicht alle Kinder der Fallverantwortlichen „Mia Muster“', d10a.length >= 1 && d10a.every(n => n === 'MUSTER Tom'), d10a);
  await page.fill('#ar-q', 'weiss'); await warte(400);
  check('D10: „weiss“ findet „Weiß“', (await page.$$eval('#ar-liste a.ar-zeile b', l => l.map(b => b.textContent))).join('|') === 'WEISS Emma');
  await page.fill('#ar-q', ''); await warte(300);

  console.log('D6, D12, D14) Rückfrage vor dem Verwerfen, Einschätzung');
  await gehe('#/schueler/' + lea); await page.waitForSelector('.ar-dkopf h1'); await reiter('profil');
  await page.click('[data-ar="einschaetzung"]'); await page.waitForSelector('dialog .ar-einsch-zeile');
  const ids = await page.$$eval('dialog .ar-einsch-zeile', l => l.slice(0, 8).map(z => z.dataset.id));
  for (const id of ids) { await page.click('dialog .ar-einsch-zeile[data-id="' + id + '"] button[data-r="5"]'); }
  await page.keyboard.press('Escape'); await warte(300);
  check('D6: Einschätzung mit 8 Bewertungen – Esc fragt nach, statt zu verwerfen', await dialogOffen() && /noch nicht gespeichert/.test(await dialogFehler()));
  await knopf('Speichern'); await dialogZu();
  await page.click('[data-ar="einschaetzung"]'); await page.waitForSelector('dialog .ar-einsch-zeile');
  await knopf('Speichern'); await warte(800);
  check('D12: Einschätzung ohne Änderung wird nicht gespeichert (Meldung)', await dialogOffen() && /keine Bewertung geändert/.test(await dialogFehler()) && (await akt()).einschaetzungen.length === 1, await dialogFehler());
  await page.keyboard.press('Escape'); await warte(300);
  check('D6: ohne Änderung schließt Esc sofort', !(await dialogOffen()));
  await page.setViewportSize({ width: 390, height: 844 }); await warte(300);
  await page.click('[data-ar="einschaetzung"]'); await page.waitForSelector('dialog .ar-einsch-zeile');
  const d14 = await page.evaluate(() => { const d = document.querySelector('dialog.ar-dialog'), inh = d.querySelector('.ar-dialog-inhalt'), b = d.querySelector('.ar-skala button[data-r="7"]'); return { knopf: Math.round(b.getBoundingClientRect().right), inhalt: Math.round(inh.getBoundingClientRect().right), quer: inh.scrollWidth - inh.clientWidth }; });
  check('D14: 390 px – Knopf „7“ ganz sichtbar, nichts ragt heraus', d14.knopf <= d14.inhalt && d14.quer <= 0, d14);
  await verwerfen();
  await page.setViewportSize({ width: 1400, height: 900 }); await warte(300);
  await reiter('fiche'); await page.click('[data-ar="fiche-teil"][data-teil="person"]'); await page.waitForSelector('dialog.ar-dialog');
  await page.fill('dialog input[name="f.ankunft"]', '2020-01-01');
  await page.keyboard.press('Escape'); await warte(300);
  check('D6: Fiche-Abschnitt, nur ein Datum geändert – Esc fragt nach', await dialogOffen() && /noch nicht gespeichert/.test(await dialogFehler()));
  await page.keyboard.press('Escape'); await warte(300);
  check('D6: zweites Esc verwirft', !(await dialogOffen()));
  await page.evaluate(async id => { await CDSE_TEAM.ops.tageskarte(id, { ziele: [{ id: 'z1', text: 'Ich bleibe am Platz.' }], abschnitte: ['1. Stunde', '2. Stunde'], ziel: 80, belohnung: '' }); CDSE_ARBEIT.hilfen.dossierZeichnen(await CDSE_TEAM.dossier(id)); }, lea);
  await reiter('begleitplan'); await page.click('[data-tk="tag"]'); await page.waitForSelector('dialog .tk-wahl button');
  await page.click('dialog .tk-wahl button[data-p="2"]'); await knopf('Abbrechen'); await warte(300);
  check('D6: Tageskarte mit Punkten – „Abbrechen“ fragt nach', await dialogOffen() && /noch nicht gespeichert/.test(await dialogFehler()));
  await knopf('Abbrechen'); await warte(300);

  console.log('D11) Plausibilität');
  await reiter('eintraege');
  const fe = () => page.evaluate(() => { const p = document.getElementById('ar-eintrag-fehler'); return p && !p.hidden ? p.textContent : ''; });
  await page.selectOption('#ar-eintrag-form select[name=art]', 'gespraech_eltern');
  await page.fill('#ar-eintrag-form input[name=datum]', '2062-09-26'); await page.fill('#ar-eintrag-form textarea[name=text]', 'Gespräch mit der Mutter (erfunden).');
  await page.click('#ar-eintrag-form button[type=submit]'); await warte(700);
  check('D11: Eintrag mit Datum 2062 → „Datum liegt in der Zukunft“, nicht gespeichert', /Zukunft/.test(await fe()) && !(await eintraege()).some(e => e.datum === '2062-09-26'), await fe());
  await page.fill('#ar-eintrag-form input[name=datum]', await heuteHub()); await page.fill('#ar-eintrag-form input[name=wiedervorlage]', '2026-09-01');
  await page.click('#ar-eintrag-form button[type=submit]'); await warte(700);
  check('D11: Wiedervorlage in der Vergangenheit → Meldung, nicht gespeichert', /Vergangenheit/.test(await fe()) && !(await eintraege()).length, await fe());
  await page.fill('#ar-eintrag-form input[name=wiedervorlage]', '');
  await page.selectOption('#ar-eintrag-form select[name=art]', 'vorfall'); await warte(200);
  await page.fill('#ar-eintrag-form input[name=v_toVon]', '10:30'); await page.fill('#ar-eintrag-form input[name=v_toBis]', '10:10');
  await page.click('#ar-eintrag-form button[type=submit]'); await warte(700);
  check('D11: Time-out „bis“ vor „von“ → Meldung, nicht gespeichert', /Time-out bis/.test(await fe()) && !(await eintraege()).length, await fe());
  await page.fill('#ar-eintrag-form input[name=v_toBis]', '10:45');
  await page.click('#ar-eintrag-form button[type=submit]'); await page.waitForSelector('.ar-eintrag', { timeout: 20000 }); await warte(300);
  check('D11: mit richtigen Angaben gespeichert (Time-out 15 Min.)', (await text('#ar-tabinhalt')).includes('Time-out 10:30–10:45 (15 Min.)'));
  check('D11: Alter nie negativ (Geburtsdatum in der Zukunft)', await page.evaluate(() => CDSE_ARBEIT.hilfen.alter('2030-01-01') === null));
  await gehe('#/schueler'); await page.click('[data-ar="neu"]'); await page.waitForSelector('dialog input[name=nachname]');
  await page.fill('dialog input[name=nachname]', 'Zukunft'); await page.fill('dialog input[name=vorname]', 'Zoe'); await page.fill('dialog input[name=geburtsdatum]', '2030-01-01');
  await knopf('Anlegen'); await warte(700);
  check('D11: Neuer Schüler mit Geburtsdatum 2030 → Meldung, kein Dossier', await dialogOffen() && /Geburtsdatum liegt in der Zukunft/.test(await dialogFehler()));
  await verwerfen();

  console.log('D7) Neuladen mit ungespeichertem Entwurf');
  await gehe('#/schueler/' + tom); await page.waitForSelector('.ar-dkopf h1'); await reiter('eintraege');
  await page.fill('#ar-eintrag-form textarea[name=text]', 'Ein halb geschriebener Eintrag (erfunden).');
  dialoge.length = 0;
  await page.reload(); await page.waitForSelector('#me:not([hidden])', { timeout: 30000 }); await warte(800);
  check('D7: Neuladen mit angefangenem Eintrag fragt nach (beforeunload)', dialoge.some(x => /^beforeunload/.test(x)), dialoge);

  console.log('F9) Übersicht nach F5');
  await page.evaluate(async id => { await CDSE_TEAM.ops.planEigener(id, { titel: 'Eltern zurückrufen', text: '', phase: 'umsetzen', wer: CDSE_KONTO.ich().id, bis: CDSE_ARBEIT.hilfen.heuteIso() }); }, tom);
  await gehe('#/', 2500);
  await page.reload(); await page.waitForSelector('#me:not([hidden])', { timeout: 30000 });
  await page.waitForFunction(() => /Fällig diese Woche/.test((document.getElementById('ar-heute-platz') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
  const heute = await text('#ar-heute-platz');
  check('F9: nach F5 zeigt die Übersicht „Jetzt laut Plan“ und „Fällig diese Woche“', /Jetzt laut Plan|Mein Einsatzplan/.test(heute) && heute.includes('Fällig diese Woche'), heute.slice(0, 160));

  console.log('D8) Screening: nach dem Speichern oben');
  await gehe('#/schueler/' + tom); await page.waitForSelector('.ar-dkopf h1'); await reiter('screening');
  await page.click('[data-sc="neu"]'); await page.waitForSelector('.sc-bogen');
  for (const id of await page.$$eval('.sc-item', l => l.map(x => x.id))) { await page.$eval('#' + id + ' input[value="0"]', el => el.click()); }
  for (const id of await page.$$eval('.sc-frage', l => l.map(x => x.id))) { await page.$eval('#' + id + ' input', el => el.click()); }
  await page.evaluate(() => { const s = document.getElementById('v-arbeit'); s.scrollTop = s.scrollHeight; }); await warte(300);
  await page.click('[data-sc="speichern"]'); await page.waitForSelector('#sc-ergebnis', { timeout: 20000 }); await warte(500);
  check('D8: nach „Auswerten und speichern“ steht der Arbeitsbereich oben', (await page.evaluate(() => document.getElementById('v-arbeit').scrollTop)) === 0);

  console.log('F5) Profil ändern bei 390 px');
  await page.setViewportSize({ width: 390, height: 844 }); await warte(300);
  await page.click('#burger'); await warte(300); await menue('profil'); await page.waitForSelector('#g-funktion'); await warte(200);
  const f5b = await page.evaluate(() => { const c = document.getElementById('gate-card').getBoundingClientRect(); return { l: Math.round(c.left), r: Math.round(c.right), w: innerWidth }; });
  check('F5: „Profil ändern“ bei 390 px ganz im Bild', f5b.l >= 0 && f5b.r <= f5b.w, f5b);
  await page.click('#g-abbruch'); await page.setViewportSize({ width: 1400, height: 900 }); await warte(300);

  console.log('F7) Passwort vergessen');
  await menue('abmelden'); await page.waitForSelector('#gate:not([hidden]) .konto[data-id]', { timeout: 60000 }); await warte(300);
  await page.click('#gate .konto[data-id]'); await page.waitForSelector('#g-vergessen'); await page.click('#g-vergessen'); await page.waitForSelector('#g-code-in'); await warte(300);
  await page.fill('#g-code-in', 'ABCD-EFGH-JKMN-PQRS-TVWX'); await page.fill('#g-pw1', 'ein neues Passwort 5'); await page.fill('#g-pw2', 'ein neues Passwort 6');
  await page.click('#g-los'); await warte(700);
  check('F7: Passwort vergessen, Passwörter ungleich → Code und erstes Passwort bleiben', (await page.inputValue('#g-code-in')) === 'ABCD-EFGH-JKMN-PQRS-TVWX' && (await page.inputValue('#g-pw1')) === 'ein neues Passwort 5' && (await page.inputValue('#g-pw2')) === '');
  await page.fill('#g-pw2', 'ein neues Passwort 5'); await page.click('#g-los');
  await page.waitForFunction(() => /passt nicht/.test((document.querySelector('#gate .meldung') || {}).textContent || ''), null, { timeout: 60000 }); await warte(200);
  check('F7: falscher Code → Code bleibt zum Korrigieren, Fokus im Code-Feld', (await page.inputValue('#g-code-in')) === 'ABCD-EFGH-JKMN-PQRS-TVWX' && (await page.evaluate(() => document.activeElement.id)) === 'g-code-in');
  await page.click('#g-zurueck'); await page.waitForSelector('#g-pw'); await page.fill('#g-pw', PW); await page.click('#g-los'); await page.waitForSelector('#me:not([hidden])', { timeout: 60000 });
  await ctx.close();

  console.log('F8, D15, F4, F3, F11, F7) Zwei PCs am selben Hub-Ordner');
  const ORDNER = path.join(OUT, 'ordner'); fs.mkdirSync(ORDNER, { recursive: true }); fs.writeFileSync(path.join(ORDNER, 'hub.html'), '');
  const nord = netzordner(ORDNER, { verzoegerung: [1, 4] });
  async function pc(name) {
    const c = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: 'de-DE', timezoneId: 'Europe/Luxembourg' });
    await c.route('**/*', nurLokal); await verbinden(c, nord);
    const p = await c.newPage(); aufPage(p, name + ': '); await p.goto(ROOT + 'hub.html'); return p;
  }
  const gehe2 = async (p, h) => { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(600); };
  async function konto(p, name) {
    await p.click('#g-ordner'); await p.waitForSelector('#g-name, #g-neu', { timeout: 30000 });
    if (await p.$('#g-neu')) { await p.click('#g-neu'); await p.waitForSelector('#g-name'); }
    await p.fill('#g-name', name); await p.fill('#g-funktion', 'Éducatrice graduée'); await p.selectOption('#g-resp', '-');
    await p.fill('#g-pw1', PW); await p.fill('#g-pw2', PW); await p.click('#g-los');
    await p.waitForSelector('#g-code', { timeout: 60000 }); await p.check('#g-ok'); await p.click('#g-weiter'); await p.waitForSelector('#me:not([hidden])', { timeout: 60000 });
  }
  const A = await pc('A'); await konto(A, 'Mia Muster');
  const B = await pc('B'); await konto(B, 'Ben Probe');
  await gehe2(A, '#/schueler'); await A.waitForSelector('[data-ar="einrichten"]', { timeout: 30000 });
  await gehe2(B, '#/schueler'); await B.waitForSelector('[data-ar="einrichten"]', { timeout: 30000 }); await B.click('[data-ar="einrichten"]'); await B.waitForSelector('[data-ar="neu"]', { timeout: 30000 });
  await A.click('[data-ar="einrichten"]');
  await A.waitForFunction(() => /Noch nicht freigeschaltet/.test((document.getElementById('ar-liste') || {}).textContent || ''), null, { timeout: 20000 }).catch(() => {});
  check('F8: an einem anderen PC schon eingerichtet → Seite zeigt den neuen Stand („Noch nicht freigeschaltet“)', /Noch nicht freigeschaltet/.test(await A.textContent('#ar-liste')) && !(await A.$('[data-ar="einrichten"]')));
  await gehe2(B, '#/verwaltung'); await B.waitForSelector('[data-ar="freischalten"]', { timeout: 30000 }); await B.click('[data-ar="freischalten"]');
  await B.waitForSelector('[data-ar="entziehen"]', { timeout: 30000 });
  await gehe2(B, '#/schueler'); await B.waitForSelector('[data-ar="neu"]', { timeout: 30000 }); await B.click('[data-ar="neu"]'); await B.waitForSelector('dialog input[name=nachname]');
  await B.fill('dialog input[name=nachname]', 'Beispiel'); await B.fill('dialog input[name=vorname]', 'Lea');
  await B.click('dialog .ar-knoepfe button:has-text("Anlegen")'); await B.waitForSelector('.ar-dkopf h1', { timeout: 30000 });
  const lea2 = await B.evaluate(() => location.hash.split('/').pop());
  await gehe2(A, '#/schueler'); await A.evaluate(() => CDSE_ARBEIT.neuLaden()); await A.waitForSelector('#ar-liste a.ar-zeile', { timeout: 30000 });
  await gehe2(A, '#/schueler/' + lea2); await A.waitForSelector('.ar-dkopf h1', { timeout: 30000 });
  await A.click('.ar-tabs [data-tab="begleitplan"]'); await A.waitForTimeout(400);
  check('D15: nur lesen – im Begleitplan kein „Gespräch eintragen“ (führte in den gesperrten Reiter)', !(await A.$('#ar-tabinhalt button[data-tab="eintraege"]')));
  check('D15: nur lesen – Hinweis, wer ein Schreibrecht gibt (Fallverantwortliche Ben Probe)', /Schreibrecht/.test(await A.textContent('#ar-tabinhalt')) && /Ben Probe/.test(await A.textContent('#ar-tabinhalt')));
  await A.click('.ar-tabs [data-tab="screening"]'); await A.waitForTimeout(400);
  check('D15: nur lesen – im Screening statt des fehlenden Knopfs ein Hinweis', !(await A.$('[data-sc="neu"]')) && /Du kannst die Screenings lesen/.test(await A.textContent('#ar-tabinhalt')));
  await gehe2(B, '#/verwaltung'); await B.waitForSelector('.ar-mitglieder', { timeout: 30000 });
  for (const breite of [1024, 1180]) {
    await B.setViewportSize({ width: breite, height: 800 }); await B.waitForTimeout(300);
    const f4 = await B.evaluate(() => { const t = document.querySelector('.ar-mitglieder').getBoundingClientRect(), k = document.querySelector('.ar-mitglieder [data-ar="entziehen"]').getBoundingClientRect(), s = document.querySelector('.ar-mitglieder select[data-rolle]').getBoundingClientRect(); return { tabelle: Math.round(t.right), entziehen: Math.round(k.right), rolle: Math.round(s.right) }; });
    check('F4: Mitglieder bei ' + breite + ' px – Rolle und „Zugang entziehen“ sichtbar', f4.entziehen <= f4.tabelle && f4.rolle <= f4.tabelle, f4);
  }
  await B.setViewportSize({ width: 1400, height: 900 });
  await B.click('[data-ar="tl-einfuegen"]'); await B.waitForSelector('dialog textarea[name=text]');
  await B.fill('dialog textarea[name=text]', 'Nina Fiktiv; Psychologin\nTim Fiktiv; Instituteur');
  await B.click('dialog .ar-knoepfe button:has-text("Prüfen")'); await B.waitForSelector('dialog.ar-dialog h2:has-text("Teamliste übernehmen?")');
  await B.click('dialog .ar-knoepfe button:has-text("Übernehmen")'); await B.waitForFunction(() => !document.querySelector('dialog.ar-dialog'), null, { timeout: 30000 }); await B.waitForTimeout(400);
  await B.click('[data-ar="tl-vorbereiten"]'); await B.waitForSelector('dialog.ar-dialog h2:has-text("Konten vorbereiten")');
  await B.click('dialog .ar-knoepfe button:has-text("Vorbereiten")'); await B.waitForSelector('dialog.ar-dialog h2:has-text("Startcodes drucken")', { timeout: 120000 });
  await B.keyboard.press('Escape'); await B.waitForTimeout(300);
  const f3 = await B.evaluate(() => { const d = document.querySelector('dialog.ar-dialog'), p = d && d.querySelector('.ar-dialog-fehler'); return { offen: !!d, meldung: p && !p.hidden ? p.textContent : '' }; });
  check('F3: Esc im Zettel-Dialog fragt „noch nicht gedruckt“, statt die Codes zu verwerfen', f3.offen && /noch nicht gedruckt/.test(f3.meldung), f3);
  await B.keyboard.press('Escape'); await B.waitForTimeout(300);
  check('F3: zweites Esc schließt', !(await B.$('dialog.ar-dialog')));
  await B.waitForTimeout(500);
  const f11 = () => B.evaluate(() => {
    const zeilen = [...document.querySelectorAll('.ar-tl-tab .ar-zeile')], z = zeilen.filter(r => r.querySelector('[data-ar="tl-startneu"]'))[0];
    if (!z) { return null; }
    const a = z.lastElementChild.getBoundingClientRect(), k = [...z.lastElementChild.querySelectorAll('button')].map(b => b.getBoundingClientRect()), st = z.querySelector('.ar-tl-st').getBoundingClientRect();
    return { zeilen: new Set(k.map(r => Math.round(r.top))).size, drin: k.every(r => r.left >= a.left - 1 && r.right <= a.right + 1), frei: st.right <= Math.min.apply(null, k.map(r => r.left)),
      spalten: new Set(zeilen.map(r => [...r.children].map(c => Math.round(c.getBoundingClientRect().left)).join(','))).size };
  });
  const f11a = await f11();
  check('F11: Teamliste 1400 px – „Neuer Code“, „Löschen“ und ✎ in einer Zeile, Spalten aller Zeilen übereinander', !!f11a && f11a.zeilen === 1 && f11a.drin && f11a.frei && f11a.spalten === 1, f11a);
  await B.setViewportSize({ width: 1024, height: 900 }); await B.waitForTimeout(300);
  const f11b = await f11();
  check('F11: Teamliste 1024 px – Aktionen in höchstens zwei Zeilen, nichts überlappt', !!f11b && f11b.zeilen <= 2 && f11b.drin && f11b.frei && f11b.spalten === 1, f11b);
  await B.setViewportSize({ width: 1400, height: 900 });
  if (await B.isVisible('#me-btn')) { await B.click('#me-btn'); } else { await B.click('#me-ava'); }
  await B.click('[data-konto="abmelden"]'); await B.waitForSelector('#gate .konto[data-start]', { timeout: 60000 });
  await B.click('#gate .konto[data-start]:has-text("Nina Fiktiv")'); await B.waitForSelector('#g-start'); await B.waitForTimeout(300);
  await B.fill('#g-start', 'ABCD-EFGH'); await B.fill('#g-pw1', 'Ninas eigenes Passwort'); await B.fill('#g-pw2', 'Ninas eigenes Passwort'); await B.click('#g-los'); await B.waitForTimeout(600);
  check('F7: Startcode zu kurz → Code und beide Passwörter bleiben, Fokus im Code-Feld', (await B.inputValue('#g-start')) === 'ABCD-EFGH' && (await B.inputValue('#g-pw1')) === 'Ninas eigenes Passwort' && (await B.inputValue('#g-pw2')) === 'Ninas eigenes Passwort' && (await B.evaluate(() => document.activeElement.id)) === 'g-start');

  console.log('F15) Eingebettete App unter file://');
  const ORDNER2 = path.join(OUT, 'ordner-datei'); fs.mkdirSync(ORDNER2, { recursive: true });
  const nord2 = netzordner(ORDNER2, { verzoegerung: [1, 3] });
  const c3 = await browser.newContext({ viewport: { width: 1400, height: 900 } }); await c3.route('**/*', nurLokal); await verbinden(c3, nord2);
  const F = await c3.newPage(); const warn = [];
  F.on('console', m => { if (/permissions policy/i.test(m.text())) { warn.push(m.text()); } });
  await F.goto('file://' + HUB_DATEI);
  await F.click('#g-ordner'); await F.waitForSelector('#g-name', { timeout: 30000 });
  await F.fill('#g-name', 'Mia Muster'); await F.fill('#g-funktion', 'Direktion'); await F.selectOption('#g-resp', '-');
  await F.fill('#g-pw1', PW); await F.fill('#g-pw2', PW); await F.click('#g-los');
  await F.waitForSelector('#g-code', { timeout: 60000 }); await F.check('#g-ok'); await F.click('#g-weiter'); await F.waitForSelector('#me:not([hidden])', { timeout: 60000 });
  await F.evaluate(() => { location.hash = '#/app/eldib'; }); await F.waitForTimeout(3000);
  const rahmen = F.frames().find(f => /eldib-generator/.test(f.url()));
  const f15 = { allow: await F.evaluate(() => { const f = document.querySelector('iframe.appframe'); return f ? f.getAttribute('allow') : 'kein Rahmen'; }), imRahmen: rahmen ? await rahmen.evaluate(() => document.featurePolicy.allowsFeature('clipboard-write') && document.fullscreenEnabled) : null };
  check('F15: unter file:// ohne allow-Angabe, keine Warnungen zur Berechtigungsrichtlinie', f15.allow === null && warn.length === 0, { f15, warn: warn.slice(0, 2) });
  check('F15: Zwischenablage und Vollbild in der eingebetteten App erlaubt', f15.imRahmen === true, f15);

  check('Keine Fehler in der Konsole', errors.length === 0, errors.slice(0, 5));
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler  (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
