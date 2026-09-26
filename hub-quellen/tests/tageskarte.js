// Test: Tageskarte im Begleitplan – einrichten aus den Fokuszielen, Tag eintragen (0/1/2 je Abschnitt, Stimmung,
// Rückmeldung), Prozent und Tagesziel, Verstärkerplan-Schritt erledigt, „Fortschritt beobachten“ läuft über die
// Karte, Plan passt sich an (Ziele kleiner machen / ausschleichen), Überprüfung mit Kennzahl, Überblick,
// Wochenkarte zum Drucken, beenden und wieder aufnehmen, Ziele ändern, Nur-Lesen, 390 px; dazu: Dialog mit dem
// neuesten Stand, zwei Personen gleichzeitig (nur Änderungen), nächster Abschnitt, große Knöpfe, Ziel entfernen /
// neues Ziel, Schutz beim Ändern der Ziele, alte Tage mit ihren Abschnitten, letzter Schultag, Woche wählen.
// Nur erfundene Personen.
// Aufruf: node tests/tageskarte.js   (BASE=… für eine andere Hub-Datei)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8099/hub.html';
const OUT = path.join(__dirname, 'tageskarte-aus'); fs.mkdirSync(OUT, { recursive: true });
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
  async function neuLaden(id) { await page.evaluate(async id => { CDSE_ARBEIT.hilfen.dossierZeichnen(await CDSE_TEAM.dossier(id)); }, id); await warte(200); }
  async function dialogKnopf(t) {
    await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("' + t + '")'); await warte(500);
    /* Abbrechen mit geschriebenem Text: der Hub fragt einmal nach – zweites Abbrechen verwirft */
    if (t === 'Abbrechen' && await page.$('dialog.ar-dialog[data-verwerfen="1"]')) { await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Abbrechen")'); await warte(300); }
  }
  async function schritt(key) { return page.evaluate(k => { const el = document.querySelector('.bp-schritt[data-key="' + k + '"]'); if (!el) return null; return { status: el.className.replace('bp-schritt', '').replace('wichtig', '').trim(), text: el.textContent }; }, key); }
  async function quer() { return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); }
  const tag = n => { const d = new Date(Date.now() + n * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  await page.goto(BASE);
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); for await (const [n] of r.entries()) { await r.removeEntry(n, { recursive: true }); } localStorage.clear(); sessionStorage.clear(); });
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); await r.getFileHandle('hub.html', { create: true }); });
  await page.reload();
  await page.click('#g-ordner'); await page.waitForSelector('#g-name');

  console.log('1) Tom: ADHS im DS, ELDiB mit Förderzielen, zwei Fokusziele');
  await erstelle('Mia Muster', 'diagnostique', 'ein sicheres Passwort 1');
  await gehe('#/schueler'); await page.waitForSelector('[data-ar="einrichten"]'); await page.click('[data-ar="einrichten"]');
  await page.waitForSelector('[data-ar="neu"]', { timeout: 20000 });
  const { tom, codes } = await page.evaluate(async vor10 => {
    const T = CDSE_TEAM, B = ELDIB_BANK.bereiche;
    const id = (await T.neuesDossier({ nachname: 'Muster', vorname: 'Tom', geschlecht: 'm', geburtsdatum: '2014-05-05', klasse: 'C4.1' }, { stelle: 'annexe' })).id;
    const alle = (b, s) => B[b].stufen[s].items.map(i => i.code);
    const erreicht = [...alle('verhalten', 1), ...alle('sozialisation', 1), ...alle('sozialisation', 2)];
    const ziele = [alle('verhalten', 2)[0], alle('verhalten', 2)[1], alle('sozialisation', 3)[0]];
    await T.ops.profil(id, { quelle: 'eldib', datum: vor10, ds: { v: 2, f: {}, frei: {}, tabellen: {}, chips: { diagnosen: ['adhs'] }, bewertungen: { s_konz: 2, s_unruhe: 7 } }, eldib: { v: 2, datum: vor10, erreicht, ziele } }, 'Test-Profil');
    await T.ops.planFokus(id, ziele.slice(0, 2));
    return { tom: id, codes: ziele.slice(0, 2) };
  }, tag(-10));
  await reiter(tom, 'begleitplan');
  check('Fokusziele: Verweis „Als Tageskarte mit Punkten einsetzen“', (await text('.bp-fokus')).includes('Als Tageskarte mit Punkten einsetzen'));
  check('Verstärkerplan-Schritt bietet „Tageskarte einrichten“', !!(await page.$('.bp-schritt[data-key="verstaerker"] [data-tk="einrichten"]')));

  console.log('2) Einrichten');
  await page.click('.bp-fokus [data-tk="einrichten"]'); await page.waitForSelector('dialog.ar-dialog');
  const vor = await page.evaluate(() => { const f = document.querySelector('dialog.ar-dialog form'); return { h: document.querySelector('dialog.ar-dialog h2').textContent, z0: f.elements.z0.value, z1: f.elements.z1.value, c0: f.elements.zcode0.value, c1: f.elements.zcode1.value, ab: f.elements.abschnitte.value, ziel: f.elements.ziel.value, heim: f.elements.heim.checked }; });
  check('Dialog „Tageskarte einrichten“: zwei Ziele aus den Fokuszielen vorbelegt (mit Code)', vor.h === 'Tageskarte einrichten' && vor.z0.length > 5 && vor.z1.length > 5 && vor.c0 === codes[0] && vor.c1 === codes[1], vor);
  check('Vorgaben: fünf Abschnitte, Tagesziel 80 %, Karte geht nach Hause', vor.ab.split(',').length === 5 && vor.ziel === '80' && vor.heim, vor);
  await page.fill('dialog.ar-dialog input[name="z1"]', 'Ich warte, bis ich aufgerufen werde.');
  await page.fill('dialog.ar-dialog input[name="belohnung"]', '5 Minuten Lieblingsspiel');
  await dialogKnopf('Speichern');
  check('Karte „Tageskarte“ erscheint unter den Fokuszielen, mit zwei Zielen', (await page.$$('.tk-karte .tk-ziele li')).length === 2 && (await text('.tk-karte')).includes('Ich warte, bis ich aufgerufen werde.') && (await text('.tk-karte')).includes('Belohnung: 5 Minuten Lieblingsspiel'));
  check('Verweis in „Fokusziele“ verschwindet', !(await text('.bp-fokus')).includes('Als Tageskarte'));
  const v = await schritt('verstaerker');
  check('Verstärkerplan-Schritt automatisch erledigt („Tageskarte seit …“)', v.status === 'erledigt' && v.text.includes('Tageskarte seit'), v);
  check('Heute noch nicht eingetragen', (await text('.tk-karte')).includes('Heute noch nicht eingetragen'));

  console.log('3) Heute eintragen');
  await page.click('.tk-karte [data-tk="tag"]'); await page.waitForSelector('dialog.ar-dialog .tk-tabelle');
  const ids = await page.$$eval('dialog.ar-dialog .tk-tabelle tbody tr', l => l.map(tr => tr.querySelector('.tk-wahl button').getAttribute('data-z')));
  for (let j = 0; j < 5; j++) await page.click('dialog.ar-dialog .tk-wahl button[data-z="' + ids[0] + '"][data-j="' + j + '"][data-p="2"]');
  for (let j = 0; j < 3; j++) await page.click('dialog.ar-dialog .tk-wahl button[data-z="' + ids[1] + '"][data-j="' + j + '"][data-p="1"]');
  for (let j = 3; j < 5; j++) await page.click('dialog.ar-dialog .tk-wahl button[data-z="' + ids[1] + '"][data-j="' + j + '"][data-p="0"]');
  check('Summe live: 13 von 20 Punkten · 65 % – noch nicht erreicht', (await text('#tk-summe')).includes('13 von 20 Punkten · 65 %') && (await text('#tk-summe')).includes('noch nicht erreicht'), await text('#tk-summe'));
  await page.click('dialog.ar-dialog .tk-wahl button[data-z="' + ids[1] + '"][data-j="4"][data-p="0"]');
  check('Nochmal klicken hebt die Wahl auf (Abschnitt ausgefallen): 13 von 18', (await text('#tk-summe')).includes('13 von 18 Punkten'), await text('#tk-summe'));
  await page.click('dialog.ar-dialog .tk-wahl button[data-z="' + ids[1] + '"][data-j="4"][data-p="2"]');
  check('Mit 2 im letzten Abschnitt: 15 von 20 · 75 %', (await text('#tk-summe')).includes('15 von 20 Punkten · 75 %'), await text('#tk-summe'));
  await page.check('dialog.ar-dialog input[name="s"][value="gut"]');
  await page.fill('dialog.ar-dialog textarea[name="notiz"]', 'In der Pause gut gewartet.');
  await dialogKnopf('Speichern');
  check('Karte: „Heute: 15 von 20 Punkten (75 %)“', (await text('.tk-karte')).includes('Heute: 15 von 20 Punkten (75 %)'), await text('.tk-karte .tk-stand'));
  const gesp = await page.evaluate(async ([id, h]) => { const d = await CDSE_TEAM.dossier(id); const t = d.tageskarte.tage[h]; return { s: t.s, notiz: t.notiz, a: t.a.length, p: Object.keys(t.p).length }; }, [tom, tag(0)]);
  check('Gespeichert: Stimmung, Rückmeldung, Abschnitte, Punkte je Ziel', gesp.s === 'gut' && gesp.notiz === 'In der Pause gut gewartet.' && gesp.a === 5 && gesp.p === 2, gesp);
  const z0 = await schritt('ziel:' + codes[0]);
  check('„Fortschritt beobachten“ läuft über die Tageskarte', z0.status === 'laufend' && z0.text.includes('läuft'), z0);

  console.log('4) Zwei schwache Wochen → Plan schlägt vor, Ziele kleiner zu machen');
  await page.evaluate(async ([id, ids, tage]) => {
    for (const t of tage) await CDSE_TEAM.ops.tageskarteTag(id, t, { p: { [ids[0]]: [1, 0, 1, 0, 0], [ids[1]]: [0, 1, 0, 0, 1] }, s: 'schwer' });
  }, [tom, ids, [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => tag(-n))]);
  await neuLaden(tom);
  const anp = await page.$eval('.bp-schritt[data-key^="tk-anpassen:"]', el => el.textContent).catch(() => '');
  check('Neuer Schritt „Tageskarte anpassen: Ziele kleiner machen“ mit Schnitt', anp.includes('Ziele kleiner machen') && anp.includes('im Schnitt'), anp.slice(0, 160));
  check('Balken der letzten Tage mit Ziellinie', (await page.$$('.tk-balken rect.tk-knapp')).length >= 9 && !!(await page.$('.tk-balken .tk-ziellinie')));
  const aus = await page.evaluate(([ids]) => {
    const d = JSON.parse(JSON.stringify(CDSE_ARBEIT.hilfen.aktDossier()));
    d.tageskarte.start = new Date(Date.now() - 40 * 864e5).toISOString().slice(0, 10);
    for (let n = 0; n < 12; n++) { const t = new Date(Date.now() - n * 864e5).toISOString().slice(0, 10); d.tageskarte.tage[t] = { p: { [ids[0]]: [2, 2, 2, 2, 1], [ids[1]]: [2, 2, 1, 2, 2] }, s: 'gut' }; }
    return CDSE_BEGLEITPLAN.schritte(d, {}).liste.filter(s => /^tk-/.test(s.key)).map(s => s.key + ' | ' + s.titel);
  }, [ids]);
  check('Nach vier Wochen fast immer am Ziel: „Tageskarte schrittweise ausschleichen“ (statt Anpassen)', aus.length === 1 && aus[0].startsWith('tk-ausschleichen'), aus);

  console.log('5) Überprüfung, Überblick, Übergabeblatt, Druck');
  await page.click('.bp-schritt[data-key="review"] [data-bp="review"]'); await page.waitForSelector('dialog.ar-dialog');
  check('Überprüfung: Kennzahl zur Tageskarte – nur Tage seit dem Start des Plans (heute: 75 % an 1 Tag)', (await text('dialog.ar-dialog')).includes('Tageskarte: im Schnitt 75 % an 1 Tag'), (await text('dialog.ar-dialog')).slice(0, 300));
  await dialogKnopf('Abbrechen');
  await page.click('.ar-tabs [data-tab="ueberblick"]'); await warte(250);
  check('Überblick: eine Zeile zur Tageskarte in der Kurzkarte', (await text('.bp-kurzkarte')).includes('Tageskarte: im Schnitt') && (await text('.bp-kurzkarte')).includes('(Ziel 80 %)'));
  const ueb = await page.evaluate(() => CDSE_ARBEIT.hilfen.uebergabeHtml(CDSE_ARBEIT.hilfen.aktDossier()));
  check('Übergabeblatt nennt die Tageskarte', ueb.includes('Tageskarte: im Schnitt'));
  const woche = await page.evaluate(() => CDSE_TAGESKARTE.wocheHtml(CDSE_ARBEIT.hilfen.aktDossier()));
  check('Wochenkarte: Titel, Ziele, Tagesziel in Punkten, Spalte für die Eltern, fünf Tage', woche.includes('Meine Tageskarte – Tom') && woche.includes('Ich warte, bis ich aufgerufen werde.') && woche.includes('Tagesziel: 16 von 20 Punkten (80 %)') && woche.includes('<th>Eltern</th>') && (woche.match(/class="tag"/g) || []).length === 5);
  fs.writeFileSync(path.join(OUT, 'woche.html'), woche);

  console.log('6) Ändern, beenden, wieder aufnehmen, Nur-Lesen');
  await page.click('.ar-tabs [data-tab="begleitplan"]'); await warte(250);
  await page.click('.tk-karte details.ar-mehr > summary'); await page.click('.tk-karte [data-tk="einrichten"]'); await page.waitForSelector('dialog.ar-dialog');
  check('Ändern-Dialog heißt „Tageskarte ändern“', (await text('dialog.ar-dialog h2')) === 'Tageskarte ändern');
  await page.fill('dialog.ar-dialog input[name="z1"]', ''); await dialogKnopf('Speichern');
  const nach = await page.evaluate(async ([id, h]) => { const d = await CDSE_TEAM.dossier(id); return { aktiv: d.tageskarte.ziele.filter(z => !z.aus).length, aus: d.tageskarte.ziele.filter(z => z.aus).length, pr: CDSE_TAGESKARTE.tagWert(d.tageskarte, h).prozent }; }, [tom, tag(0)]);
  check('Ziel gestrichen: bleibt als „aus“ erhalten, frühere Tage unverändert (75 %)', nach.aktiv === 1 && nach.aus === 1 && nach.pr === 75, nach);
  await page.click('.tk-karte details.ar-mehr > summary'); await page.click('.tk-karte [data-tk="beenden"]'); await page.waitForSelector('dialog.ar-dialog');
  await page.fill('dialog.ar-dialog input[name="grund"]', 'Test'); await dialogKnopf('Beenden');
  check('Beendet: Karte zeigt „Beendet am …“ und „Wieder aufnehmen“', (await text('.tk-karte')).includes('Beendet am') && !!(await page.$('.tk-karte [data-tk="einrichten"]')) && !(await page.$('.tk-karte [data-tk="tag"]')));
  check('Verstärkerplan-Schritt nennt das Ende', (await schritt('verstaerker')).text.includes('beendet am'));
  await page.click('.tk-karte [data-tk="einrichten"]'); await page.waitForSelector('dialog.ar-dialog');
  check('Dialog „Tageskarte wieder aufnehmen“', (await text('dialog.ar-dialog h2')) === 'Tageskarte wieder aufnehmen');
  await dialogKnopf('Speichern');
  const wieder = await page.evaluate(async id => { const d = await CDSE_TEAM.dossier(id); return { ende: !!d.tageskarte.ende, tage: Object.keys(d.tageskarte.tage).length }; }, tom);
  check('Wieder aufgenommen: aktiv, alle 10 Tage noch da', !wieder.ende && wieder.tage === 10, wieder);
  await page.screenshot({ path: path.join(OUT, 't1-karte.png'), clip: await page.$eval('.tk-karte', el => { const r = el.getBoundingClientRect(); return { x: r.x - 8, y: r.y - 8, width: r.width + 16, height: r.height + 16 }; }) });
  await page.evaluate(() => { window.__r = CDSE_TEAM.rechte; CDSE_TEAM.rechte = d => Object.assign({}, window.__r(d), { bearbeiten: false, weitergeben: false }); CDSE_ARBEIT.hilfen.dossierZeichnen(CDSE_ARBEIT.hilfen.aktDossier()); }); await warte(200);
  check('Nur lesen: Karte sichtbar, keine Knöpfe', !!(await page.$('.tk-karte')) && !(await page.$('.tk-karte [data-tk]')));
  await page.evaluate(() => { CDSE_TEAM.rechte = window.__r; CDSE_ARBEIT.hilfen.dossierZeichnen(CDSE_ARBEIT.hilfen.aktDossier()); }); await warte(200);

  console.log('7) Schmal');
  await page.setViewportSize({ width: 390, height: 844 });
  await reiter(tom, 'begleitplan');
  check('390 px: kein seitliches Scrollen im Begleitplan mit Tageskarte', (await quer()) <= 1, await quer());
  await page.click('.tk-karte [data-tk="tag"]'); await page.waitForSelector('dialog.ar-dialog .tk-tabelle');
  const dlgQuer = await page.evaluate(() => { const d = document.querySelector('dialog.ar-dialog'); return d.scrollWidth - d.clientWidth; });
  check('390 px: Dialog „Tag eintragen“ ohne seitliches Scrollen des Dialogs', dlgQuer <= 1, dlgQuer);
  await page.screenshot({ path: path.join(OUT, 't2-tag-schmal.png') });
  await dialogKnopf('Abbrechen');

  console.log('8) Neuester Stand, zwei Personen gleichzeitig, alte Tage, große Knöpfe, Woche wählen');
  await page.setViewportSize({ width: 1280, height: 900 });
  await reiter(tom, 'begleitplan');
  const A5 = ['Morgen', 'Pause', 'Vormittag', 'Mittag', 'Nachmittag'], leer4 = [null, null, null, null];
  // Heute steht nur der Morgen – so sieht Person A die Karte
  await page.evaluate(async ([id, h, z, l]) => { await CDSE_TEAM.ops.tageskarteTag(id, h, { p: { [z]: [2].concat(l) }, s: 'gut', notiz: 'Start' }); }, [tom, tag(0), ids[0], leer4]);
  await neuLaden(tom);
  // Person B trägt inzwischen die Rückmeldung ein (die Ansicht von A ist jetzt veraltet)
  await page.evaluate(async ([id, h, z, l, a]) => { await CDSE_TEAM.ops.tageskarteTag(id, h, { p: { [z]: [2].concat(l) }, s: 'gut', notiz: 'Von Person B', a }, { p: { [z]: [2].concat(l) }, s: 'gut', notiz: 'Start', a }); }, [tom, tag(0), ids[0], leer4, A5]);
  await page.click('.tk-karte [data-tk="tag"]'); await page.waitForSelector('dialog.ar-dialog .tk-tabelle');
  const offen = await page.evaluate(() => { const d = document.querySelector('dialog.ar-dialog'), a = document.activeElement, r = d.querySelector('.tk-wahl button').getBoundingClientRect();
    return { notiz: d.querySelector('textarea[name="notiz"]').value, naechst: (d.querySelector('th.tk-naechst') || {}).textContent || '', fokus: a && a.getAttribute ? a.getAttribute('data-j') + '/' + a.getAttribute('data-p') : '', w: r.width, h: r.height }; });
  check('Dialog öffnet mit dem neuesten Stand von der Festplatte (Rückmeldung von Person B)', offen.notiz === 'Von Person B', offen);
  check('Nächster Abschnitt („Pause“) hervorgehoben und fokussiert', offen.naechst.startsWith('Pause') && offen.fokus === '1/2', offen);
  check('Knöpfe groß genug für Finger (44 px breit)', offen.w >= 44 && offen.h >= 40, offen);
  // Während A den Dialog offen hat, ändert B die Stimmung; A trägt die Pause ein und speichert
  await page.evaluate(async ([id, h, z, l, a]) => { await CDSE_TEAM.ops.tageskarteTag(id, h, { p: { [z]: [2].concat(l) }, s: 'mittel', notiz: 'Von Person B', a }, { p: { [z]: [2].concat(l) }, s: 'gut', notiz: 'Von Person B', a }); }, [tom, tag(0), ids[0], leer4, A5]);
  await page.click('dialog.ar-dialog .tk-wahl button[data-z="' + ids[0] + '"][data-j="1"][data-p="2"]');
  await dialogKnopf('Speichern');
  const zwei = await page.evaluate(async ([id, h, z]) => { const t = (await CDSE_TEAM.dossier(id, true)).tageskarte.tage[h]; return { p: t.p[z], s: t.s, notiz: t.notiz }; }, [tom, tag(0), ids[0]]);
  check('Zwei Personen: nur die eigene Änderung (Pause) gespeichert, Stimmung und Rückmeldung von B bleiben', !!zwei.p && zwei.p[0] === 2 && zwei.p[1] === 2 && zwei.s === 'mittel' && zwei.notiz === 'Von Person B', zwei);

  // Ziele ändern: stark umgeschriebenes Ziel = neues Ziel?, Ziel entfernen, Schutz vor dem Überschreiben
  await page.click('.tk-karte details.ar-mehr > summary'); await page.click('.tk-karte [data-tk="einrichten"]'); await page.waitForSelector('dialog.ar-dialog input[name="z0"]');
  const z0alt = await page.inputValue('dialog.ar-dialog input[name="z0"]');
  await page.fill('dialog.ar-dialog input[name="z0"]', 'Ich räume meinen Tisch auf.');
  check('Ziel stark umgeschrieben: Frage „neues Ziel?“ erscheint (vorbelegt)', await page.isVisible('dialog.ar-dialog .tk-neuziel') && await page.isChecked('dialog.ar-dialog input[name="zneu0"]'));
  await page.fill('dialog.ar-dialog input[name="z0"]', z0alt + ' Immer.');
  check('Nur leicht geändert: keine Frage', !(await page.isVisible('dialog.ar-dialog .tk-neuziel')));
  await page.click('dialog.ar-dialog .tk-weg[data-weg="0"]');
  check('„Ziel entfernen“ leert Text, Kennung und Code', await page.evaluate(() => { const f = document.querySelector('dialog.ar-dialog form'); return f.elements.z0.value === '' && f.elements.zid0.value === '' && f.elements.zcode0.value === ''; }));
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Abbrechen")');
  check('Abbrechen mit geändertem Text: erst Rückfrage', !!(await page.$('dialog.ar-dialog[data-verwerfen="1"]')));
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Abbrechen")');   /* zweites Abbrechen verwirft */
  await page.click('.tk-karte details.ar-mehr > summary'); await page.click('.tk-karte [data-tk="einrichten"]'); await page.waitForSelector('dialog.ar-dialog input[name="z0"]');
  await page.evaluate(async id => { const x = (await CDSE_TEAM.dossier(id, true)).tageskarte; await CDSE_TEAM.ops.tageskarte(id, { ziele: x.ziele.filter(z => !z.aus), abschnitte: x.abschnitte, ziel: x.ziel, belohnung: 'Neu von Person B', heim: x.heim }); }, tom);
  await page.fill('dialog.ar-dialog input[name="belohnung"]', 'Von Person A');
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Speichern")'); await warte(800);
  check('Ziele ändern: Hat jemand anderes inzwischen geändert, wird nichts überschrieben (Hinweis)', (await text('dialog.ar-dialog .ar-dialog-fehler')).includes('Inzwischen hat jemand anderes') && (await page.evaluate(async id => (await CDSE_TEAM.dossier(id, true)).tageskarte.belohnung, tom)) === 'Neu von Person B');
  await dialogKnopf('Abbrechen');

  // Abschnitt „Pause“ fällt weg: alte Tage behalten ihre Abschnitte, das beendete Ziel mit Punkten bleibt sichtbar
  await page.evaluate(async id => { const x = (await CDSE_TEAM.dossier(id, true)).tageskarte; await CDSE_TEAM.ops.tageskarte(id, { ziele: x.ziele.filter(z => !z.aus), abschnitte: ['Morgen', 'Vormittag', 'Mittag', 'Nachmittag'], ziel: x.ziel, belohnung: x.belohnung, heim: x.heim }); }, tom);
  await neuLaden(tom);
  await page.click('.tk-karte details.ar-mehr > summary'); await page.click('.tk-karte [data-tk="nachtragen"]'); await page.waitForSelector('dialog.ar-dialog .tk-tabelle');
  const vorgabe = await page.inputValue('dialog.ar-dialog input[name="tag"]');
  check('„Anderen Tag eintragen“ schlägt den letzten Schultag vor (am Montag den Freitag)', vorgabe === await page.evaluate(h => CDSE_TAGESKARTE._test.schultagVor(h), tag(0)) && (await page.evaluate(() => CDSE_TAGESKARTE._test.schultagVor('2026-09-28'))) === '2026-09-25', vorgabe);
  await page.fill('dialog.ar-dialog input[name="tag"]', tag(-2)); await warte(200);
  const altTag = await page.evaluate(() => { const d = document.querySelector('dialog.ar-dialog');
    return { kopf: [...d.querySelectorAll('.tk-tabelle thead th[scope="col"]')].slice(1).map(t => t.textContent), zeilen: d.querySelectorAll('.tk-tabelle tbody tr').length, aus: d.querySelectorAll('.tk-tabelle tbody tr.aus').length,
      hinweis: !!d.querySelector('.tk-althinweis'), pause: [...d.querySelectorAll('.tk-wahl button.an[data-j="1"]')].map(b => b.getAttribute('data-p')) }; });
  check('Alter Tag: seine eigenen Abschnitte (mit „Pause“, Werte an der richtigen Stelle), beendetes Ziel mit Punkten markiert dabei', altTag.kopf.length === 5 && altTag.kopf[1].startsWith('Pause') && altTag.zeilen === 2 && altTag.aus === 1 && altTag.hinweis && altTag.pause.join() === '0,1', altTag);
  await dialogKnopf('Abbrechen');

  // Woche drucken: Woche wählen (mit Datum), Wochenkarte einer gewählten Woche
  await page.click('.tk-karte [data-tk="drucken"]'); await page.waitForSelector('dialog.ar-dialog input[name="woche"]');
  const wochen = await page.$$eval('dialog.ar-dialog .tk-wochen label', l => l.map(x => x.textContent));
  check('„Woche drucken“: diese / letzte / nächste Woche zur Wahl, jeweils mit Datum', wochen.length === 3 && ['Letzte Woche', 'Diese Woche', 'Nächste Woche'].every(w => wochen.some(x => x.startsWith(w))) && wochen.every(w => /Mo \d\d\.\d\d\. bis Fr \d\d\.\d\d\./.test(w)), wochen);
  await dialogKnopf('Abbrechen');
  const moL = await page.evaluate(h => CDSE_TAGESKARTE._test.montag(h), tag(-7));
  const wl = await page.evaluate(async ([id, mo]) => CDSE_TAGESKARTE.wocheHtml(await CDSE_TEAM.dossier(id, true), mo), [tom, moL]);
  fs.writeFileSync(path.join(OUT, 'woche-letzte.html'), wl);
  check('Wochenkarte der letzten Woche: richtige Woche, frühere Spalte „Pause“ und beendetes Ziel mit seinen Punkten', wl.includes('Woche vom ' + moL.split('-').reverse().join('.')) && /<th class="alt"[^>]*>Pause<\/th>/.test(wl) && wl.includes('(beendet)'), wl.slice(0, 300));

  check('Keine Fehler in der Konsole', errors.length === 0, errors);
  await browser.close();
  console.log('\n' + ok + ' bestanden, ' + bad + ' fehlgeschlagen (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
