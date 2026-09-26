// Test: Frühere Screenings aus dem alten Klassenbuch übernehmen – Hinweis in der Screening-Übersicht,
// Zuordnung nach dem Namen (vorgewählt nur mit Nachname/Initiale oder gleicher Klasse, sonst Hinweis „nur Vorname
// passt“), Auswahl bleibt beim Hinzufügen von Dateien, Übernahme verschlüsselt ins Dossier (Wortlaut, Umfeld,
// Dauer/Beeinträchtigung, Krisenhinweise, Rohdaten unverändert), keine Verdachtsachsen in der Anzeige,
// nichts doppelt, Klassenbuch bleibt unverändert, falsche Zuordnung entfernen, 390 px.
// Nur erfundene Personen.
// Aufruf: node tests/screening-kb.js   (BASE=… für eine andere Hub-Datei)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8099/hub.html';
const OUT = path.join(__dirname, 'screening-aus'); fs.mkdirSync(OUT, { recursive: true });
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } }

const tag = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const ROSTER = [
  { id: 'stud_tom', name: 'Tom', anonLabel: 'Schüler A', klasse: '', level: 'L1', zyklus: 'ES', active: true },
  { id: 'stud_alexp', name: 'Alex P.', anonLabel: 'Schüler B', klasse: '', level: 'L2', zyklus: 'ES', active: true },
  { id: 'stud_noah', name: 'Noah', anonLabel: 'Schüler C', klasse: '', level: 'L1', zyklus: 'ES', active: false },
  { id: 'stud_lea', name: 'Lea', anonLabel: 'Schüler D', klasse: '', level: 'L1', zyklus: 'ES', active: true }
];
const KB = {
  stud_tom: {
    symptome: ['1.1', '3.2', '16.1'],
    plans: { depression: { symptome: ['d1-1', 'd6-1'], kontext: { suizidalitaet: 'passiv', erscheinung: 'klassisch' } } },
    demografie: { alter: '10-12', geschlecht: 'maennlich' },
    gate: { dauer: 'mittel', beeintr: 'merklich', alt: 'nein' },
    history: [
      { date: tag(3), risk: true, acute: true, symCount: 3, axes: [{ id: 'A99', name: 'Testachse Verdacht', staerke: 'deutlich' }], muster: [], confidence: 'Verdacht erhärtet' },
      { date: tag(40), risk: false, acute: false, symCount: 2, axes: [], muster: [], confidence: null }
    ],
    updatedAt: tag(3) + 'T09:15:00.000Z'
  },
  stud_alexp: { symptome: ['2.1'], plans: {}, demografie: {}, gate: {}, history: [], updatedAt: '2026-05-04T10:00:00.000Z' },
  stud_noah: { symptome: ['4.1'], plans: {}, demografie: {}, gate: { dauer: 'lang' }, history: [], updatedAt: '2026-03-02T08:00:00.000Z' },
  stud_lea: { symptome: [], plans: {}, demografie: {}, gate: {}, history: [], updatedAt: '' }
};

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
  async function screeningReiter(id) { await gehe('#/'); await gehe('#/schueler/' + id); await page.waitForSelector('.ar-tabs [data-tab="screening"]', { timeout: 20000 }); await page.click('.ar-tabs [data-tab="screening"]'); await warte(200); }
  async function uebersicht() { await gehe('#/'); await gehe('#/screening'); await page.waitForSelector('.sc-ub-tab, #sc-ub-tabelle', { timeout: 20000 }); await warte(150); }
  async function dialogZu() { await page.waitForFunction(() => !document.querySelector('dialog.ar-dialog'), null, { timeout: 20000 }); await warte(300); }
  async function quer() { return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); }
  const kbJetzt = () => page.evaluate(() => [localStorage.getItem('klassebuch_screening_v1'), localStorage.getItem('klassebuch_roster_v1')]);

  await page.goto(BASE);
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); for await (const [n] of r.entries()) { await r.removeEntry(n, { recursive: true }); } localStorage.clear(); sessionStorage.clear(); });
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); await r.getFileHandle('hub.html', { create: true }); });
  await page.reload();
  await page.click('#g-ordner'); await page.waitForSelector('#g-name');

  console.log('1) Einrichten, Dossiers, Klassenbuch-Daten im Browser');
  await erstelle('Mia Muster', 'cp', 'ein sicheres Passwort 1');
  await gehe('#/schueler'); await page.waitForSelector('[data-ar="einrichten"]'); await page.click('[data-ar="einrichten"]');
  await page.waitForSelector('[data-ar="neu"]', { timeout: 20000 });
  const ids = await page.evaluate(async () => {
    const neu = p => CDSE_TEAM.neuesDossier(p, { stelle: 'cp' }).then(d => d.id);
    return {
      tom: await neu({ nachname: 'Muster', vorname: 'Tom', geschlecht: 'm', geburtsdatum: '2014-03-10', klasse: 'L1' }),
      alexP: await neu({ nachname: 'Probe', vorname: 'Alex', geschlecht: 'm', geburtsdatum: '2013-06-01', klasse: 'L2' }),
      alexK: await neu({ nachname: 'Kuster', vorname: 'Alex', geschlecht: 'w', geburtsdatum: '2013-09-01', klasse: 'L2' }),
      lea: await neu({ nachname: 'Beispiel', vorname: 'Lea', geschlecht: 'w', geburtsdatum: '2014-01-20', klasse: 'L1' })
    };
  });
  await page.evaluate(([kb, ro]) => { localStorage.setItem('klassebuch_screening_v1', JSON.stringify(kb)); localStorage.setItem('klassebuch_roster_v1', JSON.stringify(ro)); }, [KB, ROSTER]);
  const vorher = await kbJetzt();

  console.log('2) Zuordnung nach dem Namen');
  const alle = await page.evaluate(async () => (await CDSE_TEAM.alleDossiers(true)).map(d => ({ id: d.id, person: d.person })));
  const z = await page.evaluate(l => ({
    tom: CDSE_SCREENING.kbZuordnung('Tom', l), tomM: CDSE_SCREENING.kbZuordnung('Tom M.', l), tomKlasse: CDSE_SCREENING.kbZuordnung('Tom', l, 'L1'),
    alexP: CDSE_SCREENING.kbZuordnung('Alex P.', l), alex: CDSE_SCREENING.kbZuordnung('Alex', l),
    noah: CDSE_SCREENING.kbZuordnung('Noah', l), voll: CDSE_SCREENING.kbZuordnung('Muster Tom', l), akzent: CDSE_SCREENING.kbZuordnung('Léa', l),
    akzentVor: CDSE_SCREENING.kbVorschlaege('Léa', l).map(v => v.d.id), alexVor: CDSE_SCREENING.kbVorschlaege('Alex', l).length
  }), alle);
  check('Nur der Vorname („Tom“, „Léa“): kein Dossier vorgewählt – Lea Beispiel bleibt Vorschlag', z.tom === '' && z.akzent === '' && z.akzentVor.join() === ids.lea, z);
  check('„Tom M.“ und „Muster Tom“ → Tom Muster; „Tom“ mit gleicher Klasse (L1) → Tom Muster', z.tomM === ids.tom && z.voll === ids.tom && z.tomKlasse === ids.tom, z);
  check('„Alex P.“ → Alex Probe (Initiale), „Alex“ allein: zwei Vorschläge, keiner vorgewählt', z.alexP === ids.alexP && z.alex === '' && z.alexVor === 2, z);
  check('„Noah“: kein Dossier, kein Vorschlag', z.noah === '');

  console.log('3) Hinweis in der Screening-Übersicht');
  await uebersicht();
  check('Karte „Frühere Screenings“: 3 offene Screenings (Lea ohne Beobachtungen zählt nicht)', await page.isVisible('.sc-kb-karte') && (await text('.sc-kb-karte')).includes('3 frühere Screenings sind noch keinem Dossier zugeordnet'), await text('.sc-kb-karte').catch(() => ''));
  check('Texte werden erst bei Bedarf geladen', await page.evaluate(() => !window.CDSE_KB_TEXTE));
  await page.dblclick('.sc-kb-karte [data-scu="kb"]'); await page.waitForSelector('dialog.ar-dialog .sc-kb-liste'); await warte(300);
  check('Doppelklick auf „Zuordnen und übernehmen“: nur ein Dialog', (await page.$$('dialog.ar-dialog')).length === 1, (await page.$$('dialog.ar-dialog')).length);
  const zeilen = await page.$$eval('dialog .sc-kb-zeile', l => l.map(x => ({ t: x.textContent.replace(/\s+/g, ' '), s: (x.querySelector('select') || {}).value })));
  check('Dialog: 3 Kinder, alphabetisch, mit Stufe, Zahl der Beobachtungen und Stand', zeilen.length === 3 && /^Alex P\..*L2.*1 Beobachtung.*Stand 04\.05\.2026/.test(zeilen[0].t) && /^Noah.*ehemalig/.test(zeilen[1].t) && /^Tom.*3 Beobachtungen/.test(zeilen[2].t), zeilen.map(x => x.t));
  check('Vorauswahl nur, wenn sicher: Alex P. → Alex Probe; Tom (nur Vorname) und Noah → nicht übernehmen', zeilen[0].s === ids.alexP && zeilen[2].s === '' && zeilen[1].s === '', zeilen.map(x => x.s));
  check('Tom: Hinweis „nur Vorname passt“, Tom Muster steht unter „Passt zum Namen“', /nur Vorname passt – bitte selbst zuordnen/.test(zeilen[2].t) && await page.$eval('dialog select[name="kb:stud_tom"]', (s, id) => !!s.querySelector('optgroup[label="Passt zum Namen"] option[value="' + id + '"]'), ids.tom));
  check('Krisenhinweis bei Tom sichtbar, bei Alex P. nicht', (await text('dialog .sc-kb-zeile:has(select[name="kb:stud_tom"]) .sc-kb-wer')).includes('Krisenhinweis') && !(await text('dialog .sc-kb-zeile:has(select[name="kb:stud_alexp"]) .sc-kb-wer')).includes('Krisenhinweis'));
  await page.locator('dialog.ar-dialog').screenshot({ path: path.join(OUT, 'kb1-dialog.png') });
  await page.selectOption('dialog select[name="kb:stud_tom"]', ids.tom);
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Übernehmen")');
  await dialogZu();
  check('Texte wurden für die Übernahme nachgeladen', await page.evaluate(() => !!(window.CDSE_KB_TEXTE && window.CDSE_KB_TEXTE.symptome['1.1'])));
  check('Übersicht danach: noch 1 offenes Screening (Noah)', await page.isVisible('.sc-kb-karte') && (await text('.sc-kb-karte')).includes('Ein früheres Screening ist'), await text('.sc-kb-karte').catch(() => ''));
  const zahlen = await page.$$eval('.sc-ub-zahl b', l => l.map(x => x.textContent));
  check('Frühere Krisenhinweise (vor 3 Tagen) zählen bei „Warnsignale (3 Monate)“', zahlen[0] === '1', zahlen);
  check('Tom in der Tabelle: „noch keins“ und „früher im Klassenbuch“', /MUSTER Tom.*noch keins.*früher im Klassenbuch \(/.test((await text('.sc-ub-tab')).replace(/\s+/g, ' ')));

  console.log('4) Im Dossier gespeichert – verschlüsselt, vollständig, ohne Verdachtsachsen in der Anzeige');
  const d = await page.evaluate(async id => (await CDSE_TEAM.dossier(id, true)), ids.tom);
  const a = (d.screeningsAlt || [])[0] || {};
  check('Ein Archiv-Eintrag mit Quelle, Klassenbuch-Id, Stand, Person und Zeit', d.screeningsAlt.length === 1 && a.quelle === 'klassenbuch' && a.kb === 'stud_tom' && a.stand === KB.stud_tom.updatedAt && a.von && a.z && a.id, a);
  check('Beobachtungen im Wortlaut mit Kategorie', a.beobachtungen.length === 3 && a.beobachtungen[0].text === 'Driftet im Unterricht ab oder tagträumt regelmäßig' && a.beobachtungen[0].kat === 'Aufmerksamkeit & Wachheit');
  check('Vertiefung im Wortlaut, Umfeld und Dauer/Beeinträchtigung als Frage + Antwort',
    a.vertiefung.join('|') === 'Anhaltend gedrückte Grundstimmung|Lebensüberdruss oder Todeswünsche' &&
    a.umfeld.some(q => q.frage === 'Alter' && q.antwort === '10–12') && a.umfeld.some(q => q.frage === 'Aktuelle Suizidalität' && q.antwort === 'Passive Gedanken') &&
    a.gate.some(q => /Seit wann/.test(q.frage) && q.antwort === 'einige Wochen bis Monate'), { v: a.vertiefung, u: a.umfeld, g: a.gate });
  check('Krisenhinweise: akute Aussage, Vertiefung und Antwort zur Suizidalität', a.akut.map(x => x.text).join('|') === 'Suizidale Gedanken berichtet|Lebensüberdruss oder Todeswünsche|Aktuelle Suizidalität: Passive Gedanken', a.akut);
  check('Verlauf: Datum und Zahl der Beobachtungen (neueste zuerst)', a.verlauf.length === 2 && a.verlauf[0].anzahl === 3 && a.verlauf[0].datum === tag(3));
  check('Rohdaten unverändert mitgesichert (auch die frühere Auswertung)', JSON.stringify(a.roh) === JSON.stringify(KB.stud_tom));
  check('Protokoll vermerkt die Übernahme', d.verlauf.some(x => /^Früheres Screening aus dem Klassenbuch übernommen \(Stand /.test(x.t)));
  const roh = await page.evaluate(async id => { const r = await navigator.storage.getDirectory(); const g = await (await r.getDirectoryHandle('gemeinsam')).getDirectoryHandle('schueler'); return await (await (await g.getFileHandle(id + '.cdse')).getFile()).text(); }, ids.tom);
  check('Dossier-Datei bleibt verschlüsselt (kein Wortlaut im Klartext)', roh.includes('cdse-dossier') && !roh.includes('Driftet') && !roh.includes('screeningsAlt'));
  check('Klassenbuch-Daten im Browser unverändert', JSON.stringify(await kbJetzt()) === JSON.stringify(vorher));

  await screeningReiter(ids.tom);
  check('Reiter zählt das Archiv mit: „Screening (1)“', (await text('.ar-tabs [data-tab="screening"]')).trim() === 'Screening (1)');
  const karte = (await text('.sc-kbalt')).replace(/\s+/g, ' ');
  check('Archiv-Karte offen (noch kein neues Screening), mit Stand, Zahl und Krisenhinweis', await page.isVisible('.sc-kbalt[open]') && karte.includes('Frühere Beobachtungen aus dem Klassenbuch') && karte.includes('Stand ' + tag(3).split('-').reverse().join('.')) && karte.includes('5 Beobachtungen') && karte.includes('mit Krisenhinweis'), karte.slice(0, 300));
  check('Anzeige: Kategorien, Wortlaut, Vertiefung, Fragen zu Dauer und Umfeld, Verlauf',
    karte.includes('Aufmerksamkeit & Wachheit') && karte.includes('Driftet im Unterricht') && karte.includes('Weitere Beobachtungen (Vertiefung)') && karte.includes('Anhaltend gedrückte Grundstimmung') &&
    karte.includes('Seit wann bestehen die Auffälligkeiten?') && karte.includes('einige Wochen bis Monate') && karte.includes('Verlauf im Klassenbuch'));
  check('Frühere Krisenhinweise hervorgehoben, mit Handlungshinweis', (await text('.sc-kbalt-akut')).includes('Suizidale Gedanken berichtet') && (await text('.sc-kbalt-akut')).includes('neues Screening mit Warnsignal'));
  check('Keine Verdachtsachsen, Muster oder „Verdacht erhärtet“ in der Anzeige', !karte.includes('Testachse') && !karte.includes('Verdacht erhärtet') && karte.includes('frühere automatische Auswertung wird bewusst nicht mehr angezeigt'));
  check('Warnhinweis oben nennt das alte Klassenbuch', await page.isVisible('.sc-warn-banner') && (await text('.sc-warn-banner')).includes('(altes Klassenbuch): Suizidale Gedanken berichtet'));
  check('Hinweis in der Einführung: noch kein Screening mit dem neuen Bogen', (await text('.sc-einfuehrung')).includes('mit dem neuen Bogen'));
  await page.setViewportSize({ width: 1280, height: 2000 }); await warte(200);
  await page.evaluate(() => document.querySelectorAll('.toast, #toast').forEach(t => t.remove())); await page.screenshot({ path: path.join(OUT, 'kb2-dossier.png') });
  await page.setViewportSize({ width: 1280, height: 900 });

  console.log('5) Nichts doppelt');
  const n2 = await page.evaluate(async ([id, kb]) => {
    const X = await CDSE_SCREENING.kbTexte();
    const y = CDSE_SCREENING.kbListe(await CDSE_TEAM.alleDossiers(true)).filter(v => v.kb === kb)[0];
    const d2 = await CDSE_TEAM.ops.screeningAlt(id, CDSE_SCREENING.kbUmwandeln(y, X));
    return [d2.screeningsAlt.length, !!y.in];
  }, [ids.tom, 'stud_tom']);
  check('Derselbe Stand wird nicht ein zweites Mal übernommen; die Liste kennt die Zuordnung', n2[0] === 1 && n2[1] === true, n2);

  console.log('6) Rest ausblenden, später wieder aufrufen');
  await uebersicht();
  await page.click('.sc-kb-karte [data-scu="kb"]'); await page.waitForSelector('dialog.ar-dialog .sc-kb-liste');
  check('Dialog: übernommene Kinder mit Ziel-Dossier, nur Noah offen', (await page.$$('dialog .sc-kb-zeile.fertig')).length === 2 && (await text('dialog .sc-kb-liste')).includes('übernommen in MUSTER Tom') && (await text('dialog .sc-kb-liste')).includes('übernommen in PROBE Alex') && (await page.$$('dialog select')).length === 1);
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Übernehmen")'); await warte(200);
  check('Ohne Zuordnung und ohne Häkchen: Hinweis statt Übernahme', await page.isVisible('dialog .ar-dialog-fehler') && (await text('dialog .ar-dialog-fehler')).includes('mindestens einem Kind'));
  await page.check('dialog input[name="kb-rest-aus"]');
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Übernehmen")'); await dialogZu();
  check('Noah ausgeblendet: keine Karte mehr, dafür ein kleiner Link unten', !(await page.isVisible('.sc-kb-karte')) && (await text('#ar-sc')).includes('Frühere Screenings aus Klassenbuch oder Journal übernehmen (3)'));
  await page.click('.sc-klein [data-scu="kb"]'); await page.waitForSelector('dialog.ar-dialog .sc-kb-liste');
  check('Über den Link lässt sich Noah doch noch zuordnen (Liste vollständig)', (await page.$$('dialog .sc-kb-zeile')).length === 3 && (await page.$$('dialog select')).length === 1);
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Abbrechen")'); await dialogZu();

  console.log('7) Falsch zugeordnet: entfernen');
  await screeningReiter(ids.alexP);
  check('Alex Probe: Archiv-Karte mit „Verliert chronisch Materialien“', (await text('.sc-kbalt')).includes('Verliert chronisch Materialien'));
  await page.click('[data-sc="alt-loeschen"]'); await page.waitForSelector('dialog.ar-dialog');
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Entfernen")'); await dialogZu();
  const d3 = await page.evaluate(async id => (await CDSE_TEAM.dossier(id, true)), ids.alexP);
  check('Entfernt, im Protokoll vermerkt, Reiter wieder ohne Zahl', !(d3.screeningsAlt || []).length && d3.verlauf.some(x => /^Früheres Screening aus dem Klassenbuch entfernt/.test(x.t)) && !(await page.$('.sc-kbalt')) && (await text('.ar-tabs [data-tab="screening"]')).trim() === 'Screening');
  await uebersicht();
  check('Übersicht: Alex P. ist wieder offen und kann neu zugeordnet werden', await page.isVisible('.sc-kb-karte') && (await text('.sc-kb-karte')).includes('Ein früheres Screening ist'));
  check('Klassenbuch-Daten weiterhin unverändert', JSON.stringify(await kbJetzt()) === JSON.stringify(vorher));

  console.log('8) Journal, Team-Datei und Tageskopien');
  const ella = await page.evaluate(async () => (await CDSE_TEAM.neuesDossier({ nachname: 'Muster', vorname: 'Ella', geschlecht: 'w', geburtsdatum: '2012-02-02', klasse: 'L2' }, { stelle: 'cp' })).id);
  await page.evaluate(() => {
    localStorage.setItem('isa_screening_v1', JSON.stringify({ isa_s1: { symptome: ['4.1', '2.1'], plans: {}, demografie: {}, gate: { dauer: 'lang' }, history: [], updatedAt: '2026-06-01T08:00:00.000Z' } }));
    localStorage.setItem('isa_roster_v1', JSON.stringify([{ id: 'isa_s1', name: 'Lea', active: true }]));
  });
  const ELLA_NEU = { id: 'stud_ella', symptome: ['1.1', '2.1'], plans: {}, demografie: {}, gate: {}, history: [{ date: '2026-09-10', symCount: 2, acute: false }], updatedAt: '2026-09-10T10:00:00.000Z' };
  const ELLA_ALT = { id: 'stud_ella', symptome: ['1.1'], plans: {}, demografie: { geschlecht: 'weiblich' }, gate: { dauer: 'lang', beeintr: 'stark', alt: 'nein' }, history: [{ date: '2026-08-30', symCount: 1, acute: false }], updatedAt: '2026-08-30T10:00:00.000Z' };
  const teamDatei = { _format: 'klassebuch-shared-v1', colls: {
    roster: [{ id: 'stud_ella', _ts: 1, d: { id: 'stud_ella', name: 'Ella', level: 'L2', active: true } }, { id: 'stud_weg', _ts: 1, _del: true }],
    screening: [{ id: 'stud_ella', _ts: 2, d: ELLA_NEU }, { id: 'stud_weg', _ts: 3, _del: true }], dosEntries: [] }, _savedAt: 1, _savedBy: 'Test' };
  const tageskopie = { _format: 'klassebuch-shared-v1', colls: { roster: teamDatei.colls.roster, screening: [{ id: 'stud_ella', _ts: 1, d: ELLA_ALT }] }, _backupAt: 1 };
  await uebersicht();
  check('Journal im selben Browser: Karte zeigt 2 offene (Alex P., Lea aus dem Journal)', (await text('.sc-kb-karte')).includes('2 frühere Screenings'));
  await page.click('.sc-kb-karte [data-scu="kb"]'); await page.waitForSelector('dialog.ar-dialog .sc-kb-liste');
  check('Lea aus dem Journal: „Journal“ vermerkt, nur Vorname – nicht vorgewählt', (await text('dialog .sc-kb-zeile:has(select[name="kb:isa:isa_s1"]) .sc-kb-wer')).includes('Journal') && await page.inputValue('dialog select[name="kb:isa:isa_s1"]') === '' && (await text('dialog .sc-kb-zeile:has(select[name="kb:isa:isa_s1"])')).includes('nur Vorname passt'));
  await page.selectOption('dialog select[name="kb:isa:isa_s1"]', ids.lea);
  await page.setInputFiles('dialog [data-kb-datei]', { name: 'notiz.json', mimeType: 'application/json', buffer: Buffer.from('{"hallo":1}') });
  await page.waitForSelector('dialog .ar-dialog-fehler:not([hidden])');
  check('Falsche Datei: verständlicher Hinweis, Dialog bleibt offen', (await text('dialog .ar-dialog-fehler')).includes('weder eine Team-Datei noch eine Sicherung'));
  await page.setInputFiles('dialog [data-kb-datei]', [
    { name: 'klassebuch-team.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(teamDatei)) },
    { name: 'klassebuch-2026-09-01.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(tageskopie)) }]);
  await page.waitForSelector('dialog select[name="kb:stud_ella"]', { timeout: 20000 }); await warte(200);
  const ellaZeile = (await text('dialog .sc-kb-zeile:has(select[name="kb:stud_ella"]) .sc-kb-wer')).replace(/\s+/g, ' ');
  check('Nach dem Einlesen: Ella aus Team-Datei und Tageskopie (neuester Stand, beide Quellen genannt), gelöschte Einträge ignoriert',
    ellaZeile.includes('2 Beobachtungen') && ellaZeile.includes('Stand 10.09.2026') && ellaZeile.includes('klassebuch-team.json') && ellaZeile.includes('klassebuch-2026-09-01.json') && !(await page.$('dialog select[name="kb:stud_weg"]')) && await page.inputValue('dialog select[name="kb:stud_ella"]') === '', ellaZeile);
  check('Die Auswahl von vorher (Lea → Lea Beispiel) bleibt nach „Datei hinzufügen“ erhalten', await page.inputValue('dialog select[name="kb:isa:isa_s1"]') === ids.lea);
  await page.locator('dialog.ar-dialog').screenshot({ path: path.join(OUT, 'kb4-dateien.png') });
  check('Dialog nennt die eingelesenen Dateien', (await text('dialog .sc-kb-datei')).includes('Schon gelesen: klassebuch-team.json, klassebuch-2026-09-01.json'));
  await page.selectOption('dialog select[name="kb:stud_ella"]', ella);
  await page.selectOption('dialog select[name="kb:stud_alexp"]', '');
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Übernehmen")'); await dialogZu();
  const [dE, dL] = await page.evaluate(async ([e, l]) => [await CDSE_TEAM.dossier(e, true), await CDSE_TEAM.dossier(l, true)], [ella, ids.lea]);
  const aE = (dE.screeningsAlt || [])[0] || {}, aL = (dL.screeningsAlt || [])[0] || {};
  check('Ella: neuester Stand, Dauer/Beeinträchtigung und Geschlecht aus der älteren Tageskopie ergänzt', aE.stand === ELLA_NEU.updatedAt && aE.beobachtungen.length === 2 && aE.gate.length === 3 && aE.gate.some(q => q.antwort === 'stark') && aE.umfeld.some(q => q.frage === 'Geschlecht' && q.antwort === 'weiblich'), aE.gate);
  check('Ella: Verlauf aus beiden Ständen, ältere Fassung unverändert in „fruehere“, beide Quellen vermerkt',
    aE.verlauf.map(v => v.datum).join() === '2026-09-10,2026-08-30' && (aE.fruehere || []).length === 1 && JSON.stringify(aE.fruehere[0]) === JSON.stringify(ELLA_ALT) && aE.quellen.join() === 'klassebuch-team.json,klassebuch-2026-09-01.json', { v: aE.verlauf, q: aE.quellen });
  check('Lea: aus dem Journal übernommen (Quelle, Kennung, Protokoll)', aL.quelle === 'journal' && aL.kb === 'isa:isa_s1' && dL.verlauf.some(x => /^Früheres Screening aus dem Journal übernommen/.test(x.t)));
  await screeningReiter(ids.lea);
  check('Lea: Archiv-Karte „Frühere Beobachtungen aus dem Journal“', (await text('.sc-kbalt')).includes('Frühere Beobachtungen aus dem Journal') && (await text('.sc-kbalt')).includes('Screening des alten Journals'));
  check('Journal-Daten im Browser unverändert', await page.evaluate(() => JSON.parse(localStorage.getItem('isa_screening_v1')).isa_s1.symptome.join() === '4.1,2.1'));

  console.log('9) Neues Screening vorhanden: Archiv eingeklappt darunter');
  await page.evaluate(async id => {
    const B = CDSE_SCREENING_BOGEN, a = {};
    B.bereiche.forEach(b => CDSE_SCREENING.items(b, 'ES').forEach(i => { a[i.id] = 0; }));
    CDSE_SCREENING.items(B.staerken, 'ES').forEach(i => { a[i.id] = 2; });
    const s = { datum: new Date().toISOString().slice(0, 10), stufe: 'ES', rolle: 'lehrkraft', version: 1, antworten: a, auswirkung: { dauer: 'lang', orte: 'mehrere' }, warn: [], warnNotiz: '', notiz: '' };
    s.kurz = CDSE_SCREENING.kurz(s);
    await CDSE_TEAM.ops.screening(id, s);
  }, ids.tom);
  await screeningReiter(ids.tom);
  check('Reiter „Screening (2)“, neues Screening oben, Archiv eingeklappt darunter', (await text('.ar-tabs [data-tab="screening"]')).trim() === 'Screening (2)' && (await page.$$('.sc-eintrag')).length === 1 && await page.isVisible('.sc-kbalt:not([open])'));
  await page.click('.sc-kbalt summary'); await warte(150);
  check('Aufklappen zeigt die früheren Beobachtungen', await page.isVisible('.sc-kbalt[open] .sc-beob'));

  console.log('10) Handy (390 px)');
  await page.setViewportSize({ width: 390, height: 844 }); await warte(300);
  let q = await quer(); check('390 px: Dossier mit Archiv ohne waagrechtes Scrollen', q <= 1, q);
  await uebersicht();
  await page.click('.sc-kb-karte [data-scu="kb"]'); await page.waitForSelector('dialog.ar-dialog .sc-kb-liste'); await warte(200);
  const dq = await page.evaluate(() => { const f = document.querySelector('dialog.ar-dialog form'); return f.scrollWidth - f.clientWidth; });
  check('390 px: Dialog ohne waagrechtes Scrollen', dq <= 1, dq);
  await page.screenshot({ path: path.join(OUT, 'kb3-mobil.png') });
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Abbrechen")'); await dialogZu();
  await page.setViewportSize({ width: 1280, height: 900 });

  check('Keine Fehler in der Konsole', errors.length === 0, errors.slice(0, 5).join(' | '));
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler  (' + Math.round((Date.now() - t0) / 1000) + ' s, Bilder in ' + OUT + ')');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
