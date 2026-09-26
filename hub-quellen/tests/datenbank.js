// Test: Datenbank-Bereich des Hubs (#/datenbank) – Zugang nur für Responsables und Verwaltung, Kennzahlen und
// Diagramme aus erfundenen Dossiers (Fiche-Daten über die echte Vorlage erzeugt), Filter, Tabelle, Spaltenwahl,
// Seitenblatt, Datenbank-Angaben (Rechte), Export CSV/JSON, Abfragen (Baukasten, Vorlagen, Freitext, gespeichert),
// Import aus einer erfundenen CDSE-Stats-Datei, Protokoll, 1280 px und 390 px. Nur erfundene Personen.
// Aufruf: node tests/datenbank.js   (BASE=… für eine andere Hub-Datei, AUS=… für den Ordner der Bilder)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const OUT = process.env.AUS || path.join(__dirname, 'datenbank-aus'); fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:8099/hub.html';
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } }

/* ---------- Erwartungen unabhängig vom Modul ausrechnen ---------- */
const p2 = n => String(n).padStart(2, '0');
const jetzt = new Date(), HEUTE = jetzt.getFullYear() + '-' + p2(jetzt.getMonth() + 1) + '-' + p2(jetzt.getDate());
function alter(geb) { const [y, m, d] = geb.split('-').map(Number); let a = jetzt.getFullYear() - y; if (jetzt.getMonth() + 1 < m || (jetzt.getMonth() + 1 === m && jetzt.getDate() < d)) a--; return a; }
function sjVon(iso) { const y = +iso.slice(0, 4), m = +iso.slice(5, 7), t = +iso.slice(8, 10), s = (m > 8 || (m === 8 && t >= 15)) ? y : y - 1; return s + '/' + p2((s + 1) % 100); }
const SJ = sjVon(HEUTE);
const de1 = n => n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
/* Alter an einem Tag; Stichtag eines Dossiers: heute bzw. der Tag des Abschlusses, wenn der früher liegt */
function alterAm(geb, tag) { const [y, m, d] = geb.split('-').map(Number), [ty, tm, td] = tag.split('-').map(Number); let a = ty - y; if (tm < m || (tm === m && td < d)) a--; return a; }
function alterFall(f, tag) { tag = tag || HEUTE; return alterAm(f.person.geburtsdatum, f.inaktiv && f.inaktiv < tag ? f.inaktiv : tag); }

/* ---------- Erfundene Dossiers ---------- */
const FALL = [
  { k: 'tom', stelle: 'isa', cycle: 'C4', sprache: 'PT', person: { nachname: 'Muster', vorname: 'Tom', geschlecht: 'm', geburtsdatum: '2014-03-10', matricule: '2014031000012' },
    fiche: { datum: '2025-10-01', mfiles: 'MF-1001', ersteSprache: 'portugais', nationalitaet: 'portugaise', geburtsort: 'Esch-sur-Alzette', ankunft: '2019-08-20',
      schule: { name: 'École Brill', klasse: 'C4.1' }, ef: { dr: '06 Esch/Alzette', weitere: [{ rolle: 'I-EBS', name: 'Frau Beispiel' }] },
      vertreter: [{ autoritaet: true, name: 'Anna Muster', funktion: 'Mère' }, { autoritaet: true, name: 'Karl Muster', funktion: 'Père' }],
      intervenants: [{ institution: 'SCAS', name: 'Herr Probe' }],
      cdse: { diagnostic: { aktiv: true, name: 'Mia Muster', von: '2025-06-02', bis: '2025-07-15' }, isa: { aktiv: true, name: 'Lea Beispiel', von: '2025-10-15' } } },
    db: { iq: 92, eltern: 'getrennt', diagnosen: ['F90.0 ADHS'], schulform: 'public' } },
  { k: 'lina', stelle: 'isa', cycle: 'C3', sprache: 'LU', person: { nachname: 'Beispiel', vorname: 'Lina', geschlecht: 'w', geburtsdatum: '2015-11-20' },
    fiche: { datum: '2026-09-10', ersteSprache: 'luxembourgeois', schule: { name: 'École Brill', klasse: 'C3.2' }, ef: { dr: '06 Esch/Alzette' }, cdse: { isa: { aktiv: true, name: 'Lea Beispiel', von: '2026-09-15' } } },
    db: { eltern: 'zusammen', scas: 'nein' } },
  { k: 'noah', stelle: 'diagnostique', cycle: 'C3', sprache: 'FR', person: { nachname: 'Test', vorname: 'Noah', geschlecht: 'm', geburtsdatum: '2016-02-05' },
    fiche: { datum: '2026-09-05', ersteSprache: 'français', schule: { name: 'École Belair', klasse: 'C3.1' }, ef: { dr: '01, Luxembourg' }, cdse: { diagnostic: { aktiv: true, name: 'Mia Muster', von: '2026-09-08' } } } },
  { k: 'emma', stelle: 'cst', cycle: 'ES', sprache: 'DE', person: { nachname: 'Probe', vorname: 'Emma', geschlecht: 'w', geburtsdatum: '2012-07-30' },
    fiche: { datum: '2024-09-20', ersteSprache: 'allemand', schule: { name: 'Lycée Test Mersch', klasse: '6G' }, es: { weitere: [{ rolle: 'SePas', name: 'Herr Sepas' }] },
      intervenants: [{ institution: 'Office national de l’enfance (ONE)' }], cdse: { cst: { aktiv: true, name: 'Paul Probe', von: '2024-10-01', standort: 'Moveo' } } },
    db: { iq: 101, eltern: 'anderes', tutelle: ['Foyer'] } },
  { k: 'mila', stelle: 'isa', cycle: 'C4', sprache: 'PT', person: { nachname: 'Test', vorname: 'Mila', geschlecht: 'w', geburtsdatum: '2014-12-01' },
    fiche: { datum: '2025-11-03', ersteSprache: 'portugais', migration: 'oui', schule: { name: 'École Lallange', klasse: 'C4.2' }, ef: { dr: '06 Esch/Alzette' },
      cdse: { isa: { aktiv: true, name: 'Lea Beispiel', von: '2025-11-10', bis: '2027-07-15' }, cgEltern: { aktiv: true, name: 'Mia Muster', von: '2025-12-01' } } },
    db: { iq: 88 } },
  { k: 'ben', stelle: 'annexe', cycle: 'C2', sprache: 'CV', person: { nachname: 'Beispiel', vorname: 'Ben', geschlecht: 'm', geburtsdatum: '2017-05-12' },
    fiche: { datum: '2026-01-12', ersteSprache: 'créole capverdien', schule: { name: 'Annexe Junglinster', klasse: 'C2.3' }, ef: { dr: '12 Mersch' }, cdse: { annexe: { aktiv: true, name: 'Paul Probe', von: '2026-01-15' } } },
    db: { schulform: 'public', vorherigeSchule: '=1+1' } },
  { k: 'sara', stelle: 'cp', cycle: 'C4', sprache: 'FR', inaktiv: '2026-07-10', person: { nachname: 'Muster', vorname: 'Sara', geschlecht: 'w', geburtsdatum: '2013-09-01' },
    fiche: { datum: '2023-10-02', ersteSprache: 'français', schule: { name: 'École Differdange', klasse: 'C4.3' }, ef: { dr: '04 Differdange' }, cdse: { cdp: { aktiv: true, name: 'Paul Probe', von: '2023-10-15', standort: '04 Differdange' } } } },
  { k: 'luca', stelle: 'diagnostique', cycle: 'C3', sprache: '', person: { nachname: 'Fiktiv', vorname: 'Luca', geschlecht: 'm', geburtsdatum: '2015-04-18', schule: 'École Test', klasse: '3.1' } }
];
const TEAMNAME = { annexe: 'Annexe Junglinster', isa: 'ISA', diagnostique: 'Diagnostique', cp: 'Classes de participation', cst: 'CST' };
const KURZ = { diagnostic: 'DS', cgPro: 'C&G Fachkräfte', cgEltern: 'C&G Eltern', isa: 'ISA', atelier: 'Atelier', reeducation: 'Rééducation', annexe: 'Annexe', cdp: 'CdP', cst: 'CST' };
function laufende(f) { if (f.inaktiv || !f.fiche) return []; const c = f.fiche.cdse || {}; return Object.keys(c).filter(k => c[k].aktiv && !(c[k].bis && c[k].bis < HEUTE) && !(c[k].von && c[k].von > HEUTE)).map(k => KURZ[k]); }
function beginn(f) { const l = [HEUTE]; if (f.fiche) { l.push(f.fiche.datum); Object.values(f.fiche.cdse || {}).forEach(m => m.von && l.push(m.von)); } return l.sort()[0]; }
function zaehle(werte) { const o = {}; werte.forEach(w => { o[w] = (o[w] || 0) + 1; }); return o; }

/* ---------- Erfundene Datei aus CDSE Stats (Format aus repository.js: Liste der Fälle) ---------- */
const STATS = [
  { id: 'stats-0001', matricule: '2012010100011', dossier_mfile: 'MF-2001', nom: 'Fiktiv', prenom: 'Maria', sexe: 'F', date_naissance: '2012-01-01', age: 14, dir: 'DIR Esch-sur-Alzette', ecole_lycee: 'Lycée Beispiel Esch',
    school_type: 'Public', mesure_cdse_1: 'ISA', mesure_cdse_2: 'DS', isa_realise_par: 'Lea Beispiel', debut_isa: '2025-03-01', fin_isa: '', ds_realise_par: 'Mia Muster', date_ds: '2025-01-15', iq: 97, langue_1: 'PT',
    parents: 'Separated', scas: 'Yes', tutelle: ['Both parents'], mesures_famille: ['Assistance familiale (ONE)'], diagnostics: ['F41.1 — Generalized anxiety'], verdachtsdiagnosen_profil: [],
    autres_services: ['SCAS — Service Central d\'Assistance Sociale'], scol_etranger: 'No', created_at: '2025-01-10T09:00:00.000Z', updated_at: '2025-06-01T10:00:00.000Z' },
  { id: 'stats-0002', matricule: '2014031000012', nom: 'Muster', prenom: 'Tom', sexe: 'M', date_naissance: '2014-03-10', dir: 'DIR Esch-sur-Alzette', ecole_lycee: 'École Brill (alt)', iq: 95,
    autre_cc_implique: 'Centre de Logopédie', previous_school: 'École Neudorf', created_at: '2024-11-02T09:00:00.000Z' },
  { id: 'stats-0003', matricule: '', nom: 'Fiktiv', prenom: 'Luca', sexe: 'M', date_naissance: '2015-04-18', dir: 'DIR Luxembourg-Ville', ecole_lycee: 'École Test', langue_1: 'LU', parents: 'Together' },
  { id: 'stats-0004', matricule: '2013050500044', nom: 'Beispiel', prenom: 'Jonas', sexe: 'M', date_naissance: '2013-05-05', dir: 'DIR Capellen', spec_school: 'CST (Centre socio-thérapeutique)',
    scolarisation_specialisee: 'Moveo', debut_scol_spe: '2025-09-15', mesure_cdse_1: 'Spec. School.', langue_1: 'FR', tutelle: ['Mother'] },
  { id: 'stats-0005', matricule: '2012010100011', nom: 'Fiktiv', prenom: 'Maria', sexe: 'F', date_naissance: '2012-01-01', dir: 'DIR Esch-sur-Alzette' }
];

(async () => {
  const t0 = Date.now();
  const browser = await chromium.launch();
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
  async function dialogKnopf(t) { await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("' + t + '")'); }
  async function erstelle(name, team, pw) {
    await page.fill('#g-name', name); await page.check('input[name="g-team"][value="' + team + '"]'); await page.selectOption('#g-resp', '-');
    await page.fill('#g-pw1', pw); await page.fill('#g-pw2', pw); await page.click('#g-los');
    await page.waitForSelector('#g-code', { timeout: 30000 }); await page.check('#g-ok'); await page.click('#g-weiter');
    await page.waitForSelector('#me:not([hidden])', { timeout: 30000 });
  }
  async function menue() { if (await page.isVisible('#me-btn')) await page.click('#me-btn'); else await page.click('#me-ava'); }
  async function abmelden() { await menue(); await page.click('[data-konto="abmelden"]'); await page.waitForSelector('#gate .konto[data-id], #g-pw', { timeout: 30000 }); }
  async function anmelden(name, pw) {
    const t = await text('#gate-card'); if (!t.includes('Wer bist du?')) { const z = await page.$('#g-zurueck'); if (z) await z.click(); }
    await page.click('#gate .konto:has-text("' + name + '")'); await page.fill('#g-pw', pw); await page.click('#g-los');
    await page.waitForSelector('#me:not([hidden])', { timeout: 30000 });
  }
  async function db(seite) { await gehe('#/datenbank' + (seite ? '/' + seite : '')); await page.waitForSelector('#db-inhalt .db-filter, #db-inhalt .db-leer, #db-inhalt .ar-karte, .ar-leer', { timeout: 20000 }); await warte(150); }
  async function balken(key) { return page.$$eval('.db-dg[data-dg="' + key + '"] [data-label]', l => l.map(e => [e.getAttribute('data-label'), +e.getAttribute('data-wert')])); }
  async function kpi(key) { return (await text('[data-kpi="' + key + '"] b')).trim(); }
  async function querScroll() {
    return page.evaluate(() => {
      const v = document.querySelector('#v-arbeit'), b = window.innerWidth;
      const raus = [...document.querySelectorAll('#arbeit-body *, dialog[open] *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > b + 1 && !e.closest('.db-tabrahmen'); }).slice(0, 3).map(e => e.tagName + '.' + e.className);
      return { doc: document.documentElement.scrollWidth - b, view: v ? v.scrollWidth - v.clientWidth : 0, raus };
    });
  }
  function ohneQuer(q) { return q.doc <= 1 && q.view <= 1 && !q.raus.length; }
  /* Der Hub scrollt in einem eigenen Bereich: für ein ganzes Bild kurz das Fenster so hoch wie den Inhalt machen */
  async function bild(name) {
    const vp = page.viewportSize();
    const h = await page.evaluate(() => { const v = document.querySelector('.view.on'); return v ? v.scrollHeight + 80 : 900; });
    await page.setViewportSize({ width: vp.width, height: Math.min(7000, Math.max(vp.height, h)) }); await warte(300);
    await page.screenshot({ path: path.join(OUT, name) });
    await page.setViewportSize(vp); await warte(200);
  }
  /* CSV mit Anführungszeichen richtig zerlegen */
  function csvZeilen(t) {
    const z = [], s = t.replace(/^﻿/, ''); let r = [], f = '', q = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) { if (c === '"' && s[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
      else if (c === '"') q = true; else if (c === ';') { r.push(f); f = ''; } else if (c === '\n') { r.push(f); z.push(r); r = []; f = ''; } else if (c !== '\r') f += c;
    }
    if (f || r.length) { r.push(f); z.push(r); }
    return z;
  }

  await page.goto(BASE);
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); for await (const [n] of r.entries()) { await r.removeEntry(n, { recursive: true }); } localStorage.clear(); sessionStorage.clear(); });
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); await r.getFileHandle('hub.html', { create: true }); });
  await page.reload();
  await page.click('#g-ordner'); await page.waitForSelector('#g-name');

  console.log('1) Verwaltung (Mia Muster): Schülerbereich einrichten, leere Datenbank');
  await erstelle('Mia Muster', 'diagnostique', 'ein sicheres Passwort 1');
  await gehe('#/schueler'); await page.waitForSelector('[data-ar="einrichten"]'); await page.click('[data-ar="einrichten"]');
  await page.waitForSelector('[data-ar="neu"]', { timeout: 20000 });
  check('Modul geladen: CDSE_DATENBANK mit seite, felder, datensatz', await page.evaluate(() => !!(window.CDSE_DATENBANK && CDSE_DATENBANK.seite && CDSE_DATENBANK.datensatz && CDSE_DATENBANK.felder.length >= 45)), await page.evaluate(() => window.CDSE_DATENBANK && CDSE_DATENBANK.felder.length));
  check('Menüpunkt „Datenbank“ für die Verwaltung', await page.isVisible('#nav a[href="#/datenbank"]'));
  await db('');
  check('Leerer Zustand: „Noch keine Dossiers“ mit Weg zu Schülern und Import', (await text('#db-inhalt')).includes('Noch keine Dossiers') && await page.isVisible('#db-inhalt a[href="#/datenbank/import"]'));

  console.log('2) Acht erfundene Dossiers (Fiche über die Vorlage des Hubs: schreiben → lesen)');
  const ids = await page.evaluate(async (F) => {
    const T = window.CDSE_TEAM, out = {};
    for (const f of F) {
      let person = f.person, fiche;
      if (f.fiche) { const r = (await CDSE_FICHE.lesenAusBlob(await CDSE_FICHE.schreiben({ person: f.person, fiche: f.fiche }))).daten; person = Object.assign({}, f.person, r.person); fiche = r.fiche; }
      const d = await T.neuesDossier(person, fiche ? { stelle: f.stelle, fiche } : { stelle: f.stelle });
      if (f.db) await T.ops.datenbank(d.id, f.db, 'Testdaten');
      if (f.inaktiv) await T.ops.status(d.id, 'inaktiv', 'Abschluss', f.inaktiv);
      out[f.k] = d.id;
    }
    return out;
  }, FALL);
  check('8 Dossiers angelegt', Object.keys(ids).length === 8);
  const rt = await page.evaluate(async id => (await CDSE_TEAM.dossier(id)).fiche, ids.mila);
  check('Fiche aus der Word-Vorlage: Migration „oui“ als Text, Maßnahmen angekreuzt', rt.migration === 'oui' && rt.cdse.isa.aktiv === true && rt.cdse.cgEltern.von === '2025-12-01', rt);

  console.log('3) Konten Lea Beispiel (Responsable) und Paul Probe (Mitarbeiter)');
  await abmelden(); await page.click('#g-neu'); await erstelle('Lea Beispiel', 'isa', 'noch ein Passwort 22');
  await abmelden(); await page.click('#g-neu'); await erstelle('Paul Probe', 'annexe', 'drittes Passwort 333');
  await abmelden(); await anmelden('Mia Muster', 'ein sicheres Passwort 1');
  await gehe('#/verwaltung'); await page.waitForSelector('[data-ar="freischalten"]', { timeout: 20000 });
  for (let i = 0; i < 2; i++) { await page.click('[data-ar="freischalten"]'); await page.waitForFunction(n => document.querySelectorAll('[data-ar="freischalten"]').length === n, 1 - i, { timeout: 20000 }); await warte(400); }
  const konto = await page.evaluate(() => { const k = CDSE_KONTO.konten(); return { lea: k.find(x => x.name === 'Lea Beispiel').id, paul: k.find(x => x.name === 'Paul Probe').id, mia: k.find(x => x.name === 'Mia Muster').id }; });
  await page.waitForSelector('select[data-rolle="' + konto.lea + '"]');
  await page.selectOption('select[data-rolle="' + konto.lea + '"]', 'responsable');
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Rolle ändern")');   /* Rollenwechsel wird bestätigt */
  await page.waitForFunction(() => !document.querySelector('dialog.ar-dialog'), null, { timeout: 20000 }); await warte(400);
  check('Lea ist Responsable', await page.evaluate(id => CDSE_TEAM.rolle(id), konto.lea) === 'responsable');

  console.log('4) Mitarbeiter: kein Zugang');
  await abmelden(); await anmelden('Paul Probe', 'drittes Passwort 333');
  await gehe('#/schueler'); await page.waitForSelector('.ar-tabelle', { timeout: 20000 });
  check('Mitarbeiter: kein Menüpunkt „Datenbank“', !(await page.isVisible('#nav a[href="#/datenbank"]')) && await page.isVisible('#nav a[href="#/schueler"]'));
  await gehe('#/datenbank'); await page.waitForSelector('#ar-db .ar-leer', { timeout: 20000 });
  check('Mitarbeiter: direkte Adresse #/datenbank zeigt „Kein Zugang“', (await text('#ar-db')).includes('Kein Zugang') && !(await page.$('#db-inhalt')));
  await gehe('#/datenbank/tabelle'); await page.waitForSelector('#ar-db .ar-leer', { timeout: 20000 });
  check('Mitarbeiter: auch #/datenbank/tabelle zeigt „Kein Zugang“', (await text('#ar-db')).includes('Kein Zugang') && !(await page.$('.db-tab')));
  const paulVersuch = await page.evaluate(async id => { try { await CDSE_TEAM.ops.datenbank(id, { iq: 70 }, 'darf nicht'); return 'gespeichert'; } catch (e) { return e.message; } }, ids.tom);
  check('Mitarbeiter kann Datenbank-Angaben auch per Funktion nicht ändern', /nur Responsables/.test(paulVersuch), paulVersuch);
  const seiteDirekt = await page.evaluate(() => { const el = document.createElement('div'); CDSE_DATENBANK.seite(el, '', false); return el.textContent; });
  check('Modul prüft selbst: seite() zeigt Mitarbeitern „Kein Zugang“', seiteDirekt.includes('Kein Zugang'), seiteDirekt);

  console.log('5) Responsable (Lea): Übersicht – Kennzahlen und Diagramme');
  await abmelden(); await anmelden('Lea Beispiel', 'noch ein Passwort 22');
  await gehe('#/schueler'); await page.waitForSelector('.ar-tabelle', { timeout: 20000 });
  check('Responsable: Menüpunkt „Datenbank“', await page.isVisible('#nav a[href="#/datenbank"]'));
  await db('');
  await page.waitForSelector('.db-kpis');
  check('Standard wie in der Schülerliste: Filter „Aktiv“ (7 Dossiers), Zeile „Stand: … (heute) · aktive Dossiers“', await page.getAttribute('[data-db-f="status"][data-wert="aktiv"]', 'aria-pressed') === 'true' && await kpi('dossiers') === '7' &&
    /Stand: \d\d\.\d\d\.\d{4} \(heute\) · aktive Dossiers/.test(await text('.db-standzeile')), [await kpi('dossiers'), await text('.db-standzeile')]);
  check('Kopf: „Stand der Daten: hh:mm Uhr“ neben „Neu laden“', /Stand der Daten: \d\d:\d\d Uhr/.test(await text('[data-db-geladen]')) && await page.isVisible('[data-db="neu-laden"]'), await text('[data-db-geladen]'));
  await page.click('[data-db-f="status"][data-wert="alle"]'); await warte(150);
  const aktive = FALL.filter(f => !f.inaktiv);
  check('Kennzahl Dossiers: 8 (7 aktiv · 1 inaktiv)', await kpi('dossiers') === '8' && (await text('[data-kpi="dossiers"] small')).includes('7 aktiv · 1 inaktiv'), await text('[data-kpi="dossiers"]'));
  const neuErw = FALL.filter(f => sjVon(beginn(f)) === SJ).length;
  check('Kennzahl „neu im Schuljahr ' + SJ + '“: ' + neuErw, await kpi('neu') === String(neuErw) && (await text('[data-kpi="neu"] span')).includes(SJ), await text('[data-kpi="neu"]'));
  /* inaktive Dossiers: Alter am Tag des Abschlusses (Sara) */
  const altersMittel = FALL.reduce((s, f) => s + alterFall(f), 0) / FALL.length;
  check('Durchschnittsalter ' + de1(altersMittel) + ' (bei inaktiven Dossiers am Tag des Abschlusses)', await kpi('alter') === de1(Math.round(altersMittel * 10) / 10), await kpi('alter'));
  check('Jungen / Mädchen: 4 / 4', await kpi('geschlecht') === '4 / 4', await kpi('geschlecht'));
  const lauf = zaehle(FALL.flatMap(laufende)), laufSumme = Object.values(lauf).reduce((a, b) => a + b, 0);
  check('Laufende Maßnahmen: ' + laufSumme + ' (' + JSON.stringify(lauf) + ')', await kpi('massnahmen') === String(laufSumme), await kpi('massnahmen'));
  const stelle = Object.fromEntries(await balken('stelle')), stelleErw = zaehle(FALL.map(f => TEAMNAME[f.stelle]));
  check('Diagramm Stelle stimmt (ISA 3, Diagnostique 2, CST 1, Annexe 1, CdP 1)', Object.keys(TEAMNAME).every(k => (stelle[TEAMNAME[k]] || 0) === (stelleErw[TEAMNAME[k]] || 0)), stelle);
  const massn = Object.fromEntries(await balken('massnahmen'));
  check('Diagramm laufende Maßnahmen je Art stimmt', Object.keys(lauf).every(k => massn[k] === lauf[k]) && Object.keys(massn).filter(k => k !== 'keine laufende').length === Object.keys(lauf).length, massn);
  check('Diagramm Maßnahmen: beendete DS (Tom) und inaktives Dossier (Sara, CdP) zählen nicht', massn.DS === 1 && !massn.CdP && massn['keine laufende'] === 2, massn);
  const dr = Object.fromEntries(await balken('direction')), drErw = zaehle(FALL.map(f => (f.fiche && f.fiche.ef && f.fiche.ef.dr) || 'ohne Angabe'));
  check('Diagramm Direction régionale stimmt (06 Esch/Alzette 3 …, ohne Angabe 2)', Object.keys(drErw).every(k => dr[k] === drErw[k]) && Object.keys(dr).length === Object.keys(drErw).length, dr);
  const cyc = Object.fromEntries(await balken('cycle')), cycErw = zaehle(FALL.map(f => f.cycle));
  check('Diagramm Cycle stimmt (C2 1, C3 3, C4 3, ES 1)', ['C1', 'C2', 'C3', 'C4', 'ES'].every(k => (cyc[k] || 0) === (cycErw[k] || 0)), cyc);
  const alt = Object.fromEntries(await balken('alter')), altErw = zaehle(FALL.map(f => String(alterFall(f))));
  check('Diagramm Alter stimmt (Säulen je Jahr)', Object.keys(altErw).every(k => alt[k] === altErw[k]) && Object.values(alt).reduce((a, b) => a + b, 0) === 8, alt);
  const ges = Object.fromEntries(await balken('geschlecht'));
  check('Diagramm Geschlecht: Jungen 4, Mädchen 4', ges.Jungen === 4 && ges['Mädchen'] === 4, ges);
  const spr = Object.fromEntries(await balken('sprache'));
  check('Diagramm Erstsprache (portugais → Portugiesisch, créole capverdien → Kapverdisch …)', spr.Portugiesisch === 2 && spr.Französisch === 2 && spr.Luxemburgisch === 1 && spr.Deutsch === 1 && spr.Kapverdisch === 1 && spr['ohne Angabe'] === 1, spr);
  const sch = await balken('schule');
  check('Diagramm Schulen: École Brill vorne (2)', sch[0][0] === 'École Brill' && sch[0][1] === 2 && sch.length === 7, sch);
  check('Hinweis: 1 von 8 Dossiers ohne Fiche', (await text('#db-inhalt')).includes('1 von 8'));
  check('Diagramme sind eigenes SVG (keine Bibliothek)', (await page.$$('.db-dg svg.db-svg')).length === 9 && await page.evaluate(() => !window.Chart && !document.querySelector('script[src*="cdn"]')));
  const dauerB = Object.fromEntries(await balken('dauer'));
  const isaMittel = await page.evaluate(async () => { const l = (await CDSE_TEAM.alleDossiers()).map(d => CDSE_DATENBANK.datensatz(d).isaDauer).filter(v => typeof v === 'number'); return l.reduce((a, b) => a + b, 0) / l.length; });
  check('Diagramm „Durchschnittliche Dauer je Maßnahme“: DS, ISA, C&G, Annexe, CST, CdP – ISA = Mittel der ISA-Dauern', Object.keys(dauerB).sort().join() === ['Annexe', 'C&G', 'CdP', 'CST', 'DS', 'ISA'].sort().join() && Math.abs(dauerB.ISA - isaMittel) < 1e-9, [dauerB, isaMittel]);
  check('Ohne ELDiB-Stufen kein ELDiB-Diagramm', !(await page.$('.db-dg[data-dg="eldib"]')));
  await bild('db1-uebersicht.png');
  let q = await querScroll();
  check('1280 px: Übersicht ohne waagrechtes Scrollen', ohneQuer(q), q);

  console.log('6) Filter oben wirken auf alles');
  await page.click('[data-db-f="status"][data-wert="aktiv"]'); await warte(150);
  check('Filter Aktiv: 7 Dossiers, Jungen/Mädchen 4 / 3', await kpi('dossiers') === '7' && await kpi('geschlecht') === '4 / 3', [await kpi('dossiers'), await kpi('geschlecht')]);
  await page.click('[data-db-f="stelle"][data-wert="isa"]'); await warte(150);
  const isaAlter = aktive.filter(f => f.stelle === 'isa').map(f => alter(f.person.geburtsdatum));
  check('Filter Aktiv + ISA: 3 Dossiers, Durchschnittsalter ' + de1(isaAlter.reduce((a, b) => a + b, 0) / 3), await kpi('dossiers') === '3' && await kpi('alter') === de1(Math.round(isaAlter.reduce((a, b) => a + b, 0) / 3 * 10) / 10), await kpi('alter'));
  check('Fokus bleibt auf dem gewählten Filter (Tastatur)', await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-wert') === 'isa'));
  await page.click('[data-db="filter-weg"]'); await warte(150);
  const sjs = await page.$$eval('select[data-db-sj] option', l => l.map(o => o.value).filter(Boolean));
  check('Schuljahre zur Auswahl (laufendes zuerst)', sjs[0] === SJ && sjs.length >= 3, sjs);
  const vorjahr = sjs[1];
  await page.selectOption('select[data-db-sj]', vorjahr); await warte(200);
  const g0 = vorjahr.slice(0, 4) + '-08-15', g1 = (+vorjahr.slice(0, 4) + 1) + '-08-14';
  const imVorjahr = FALL.filter(f => beginn(f) <= g1 && (!f.inaktiv || f.inaktiv >= g0)).length;
  check('Filter Schuljahr ' + vorjahr + ': ' + imVorjahr + ' begleitete Dossiers', await kpi('dossiers') === String(imVorjahr), await kpi('dossiers'));
  /* Schuljahr gewählt: Status „Alle“ (auch inzwischen inaktive), Stichtag 1. Oktober, Maßnahmen = alle, die im Schuljahr liefen */
  check('Schuljahr gewählt: Status springt auf „Alle“, Zeile „Stand: 01.10.' + vorjahr.slice(0, 4) + ' (Stichtag …)“', await page.getAttribute('[data-db-f="status"][data-wert="alle"]', 'aria-pressed') === 'true' &&
    (await text('.db-standzeile')).includes('Stand: 01.10.' + vorjahr.slice(0, 4) + ' (Stichtag im Schuljahr ' + vorjahr + ')'), await text('.db-standzeile'));
  const stVor = vorjahr.slice(0, 4) + '-10-01', inVor = FALL.filter(f => beginn(f) <= g1 && (!f.inaktiv || f.inaktiv >= g0));
  const altVor = inVor.map(f => alterFall(f, stVor)), altVorM = altVor.reduce((a, b) => a + b, 0) / altVor.length;
  check('Schuljahr ' + vorjahr + ': Durchschnittsalter am Stichtag 01.10. (' + de1(altVorM) + ')', await kpi('alter') === de1(Math.round(altVorM * 10) / 10), await kpi('alter'));
  const imVor = f => { const c = (f.fiche && f.fiche.cdse) || {}, ende = f.inaktiv && f.inaktiv < g1 ? f.inaktiv : g1; if (f.inaktiv && f.inaktiv <= g0) return [];
    return Object.keys(c).filter(k => c[k].aktiv && !(c[k].bis && c[k].bis < g0) && !(c[k].von && c[k].von > ende)); };
  const mVor = inVor.reduce((s, f) => s + imVor(f).length, 0);
  check('Schuljahr ' + vorjahr + ': „Maßnahmen im Schuljahr“ zählt alle, die im Schuljahr liefen (' + mVor + ', auch bei inzwischen inaktiven)', await kpi('massnahmen') === String(mVor) && (await text('[data-kpi="massnahmen"] span')).includes('Maßnahmen im Schuljahr'), await text('[data-kpi="massnahmen"]'));
  await page.selectOption('select[data-db-sj]', ''); await warte(150);

  console.log('7) Klick auf einen Balken → Tabelle mit Filter');
  await page.click('.db-dg[data-dg="stelle"] a[data-label="ISA"]');
  await page.waitForSelector('.db-tab', { timeout: 10000 }); await warte(200);
  check('Balken „ISA“ öffnet die Tabelle mit 3 Dossiers und Filter-Chip', (await page.$$('.db-tab tbody tr')).length === 3 && (await text('.db-aktivfilter')).includes('Stelle ist „ISA“'), await text('.db-anzahl'));
  await page.click('[data-db="tf-alle-weg"]'); await warte(150);
  await db(''); await page.focus('.db-dg[data-dg="geschlecht"] a[data-label="Mädchen"]'); await page.keyboard.press('Enter');
  await page.waitForSelector('.db-aktivfilter', { timeout: 10000 }); await warte(200);
  check('Tastatur: Balken „Mädchen“ mit Enter → Tabelle mit 4 Mädchen', (await page.$$('.db-tab tbody tr')).length === 4 && (await text('.db-aktivfilter')).includes('Geschlecht ist „Mädchen“'), await text('.db-anzahl'));
  await page.click('[data-db="tf-alle-weg"]'); await warte(150);

  console.log('8) Tabelle: Spalten, Suche, Sortieren, Schnellfilter');
  const kopf = await page.$$eval('.db-tab thead th', l => l.map(x => x.textContent.replace(/[▲▼]/g, '').trim()));
  check('Standardspalten: Name, Alter, Geschlecht, Klasse, Schule, Direction, Stelle, laufende Maßnahmen', kopf.join('|') === 'Name|Alter (Jahre)|Geschlecht|Klasse|Schule|Direction régionale|Stelle|Laufende Maßnahmen', kopf.join('|'));
  check('Alle 8 Zeilen, alphabetisch (BEISPIEL Ben zuerst)', (await page.$$('.db-tab tbody tr')).length === 8 && (await text('.db-tab tbody tr:first-child .db-name b')) === 'BEISPIEL Ben');
  await page.fill('#db-q', 'muster'); await warte(150);
  check('Suche „muster“: Tom und Sara', (await page.$$('.db-tab tbody tr')).length === 2 && (await text('.db-anzahl')).includes('2'));
  check('Suchfeld behält den Fokus', await page.evaluate(() => document.activeElement && document.activeElement.id === 'db-q'));
  await page.fill('#db-q', 'Tom Muster'); await warte(150);
  check('Suche Wort für Wort: „Tom Muster“ findet „MUSTER Tom“', (await page.$$('.db-tab tbody tr')).length === 1 && (await text('.db-tab tbody tr .db-name b')) === 'MUSTER Tom', await text('.db-anzahl'));
  await page.fill('#db-q', 'ecole brill'); await warte(150);
  check('Suche ohne Akzente: „ecole brill“ findet École Brill (Tom, Lina)', (await page.$$('.db-tab tbody tr')).length === 2, await text('.db-anzahl'));
  await page.fill('#db-q', ''); await warte(100);
  await page.click('[data-db-sort="alter"]'); await warte(100); await page.click('[data-db-sort="alter"]'); await warte(100);
  const aelteste = FALL.slice().sort((a, b) => a.person.geburtsdatum.localeCompare(b.person.geburtsdatum))[0];
  check('Sortieren nach Alter absteigend: ' + aelteste.person.vorname + ' zuerst, aria-sort gesetzt', (await text('.db-tab tbody tr:first-child .db-name b')).includes(aelteste.person.vorname) && await page.getAttribute('th:has([data-db-sort="alter"])', 'aria-sort') === 'descending');
  await page.selectOption('select[data-db-schnell="geschlecht"]', 'Mädchen'); await warte(100);
  await page.selectOption('select[data-db-schnell="massnahme"]', 'ISA'); await warte(100);
  check('Schnellfilter Mädchen + laufende ISA: Lina und Mila', (await page.$$eval('.db-tab tbody .db-name b', l => l.map(x => x.textContent))).sort().join(',') === 'BEISPIEL Lina,TEST Mila');
  check('Gewählte Schnellfilter hervorgehoben, „Alle Filter zurücksetzen“ steht bei der Anzahl', await page.isVisible('.db-schnell.an select[data-db-schnell="geschlecht"]') && await page.isVisible('.db-schnell.an select[data-db-schnell="massnahme"]') &&
    !(await page.$('.db-schnell.an select[data-db-schnell="cycle"]')) && await page.isVisible('.db-anzahl [data-db="filter-weg"]'));
  await page.selectOption('select[data-db-schnell="geschlecht"]', ''); await page.selectOption('select[data-db-schnell="massnahme"]', ''); await warte(100);
  q = await querScroll();
  check('1280 px: Tabelle ohne waagrechtes Scrollen', ohneQuer(q) && await page.evaluate(() => { const r = document.querySelector('.db-tabrahmen'); return r.scrollWidth <= r.clientWidth + 1; }), q);

  console.log('9) Spaltenwahl (gemerkt pro Person)');
  await page.click('[data-db="spalten"]'); await page.waitForSelector('dialog .db-spaltenwahl');
  await page.uncheck('dialog input[name="s_schule"]'); await page.check('dialog input[name="s_iq"]'); await page.check('dialog input[name="s_sorgerecht"]');
  await dialogKnopf('Übernehmen'); await warte(300);
  let kopf2 = await page.$$eval('.db-tab thead th', l => l.map(x => x.textContent.replace(/[▲▼]/g, '').trim()));
  check('Spalten übernommen: ohne Schule, mit IQ und Sorgerecht', !kopf2.includes('Schule') && kopf2.includes('IQ') && kopf2.includes('Sorgerecht (autorité parentale)'), kopf2.join('|'));
  const ls = await page.evaluate(() => JSON.parse(localStorage.getItem('cdse-db-spalten-v1')));
  check('localStorage cdse-db-spalten-v1 hat die Auswahl unter Leas Konto', ls && Array.isArray(ls[konto.lea]) && ls[konto.lea].includes('iq') && !ls[konto.lea].includes('schule'), ls);
  await page.reload(); await page.waitForSelector('#me:not([hidden])', { timeout: 20000 });
  await db('tabelle'); await page.waitForSelector('.db-tab');
  check('Nach dem Neuladen wieder der Standard: nur aktive Dossiers (7)', (await page.$$('.db-tab tbody tr')).length === 7, await text('.db-anzahl'));
  await page.click('[data-db-f="status"][data-wert="alle"]'); await page.waitForSelector('.db-tab'); await warte(150);
  kopf2 = await page.$$eval('.db-tab thead th', l => l.map(x => x.textContent.replace(/[▲▼]/g, '').trim()));
  check('Nach dem Neuladen noch dieselben Spalten', kopf2.includes('IQ') && !kopf2.includes('Schule'), kopf2.join('|'));
  const tomZeile = await page.$eval('tr[data-id="' + ids.tom + '"]', tr => [...tr.querySelectorAll('td')].map(td => td.textContent));
  check('Tabellenwerte für Tom: IQ 92, Sorgerecht Mutter, Vater (aus der Fiche)', tomZeile.includes('92') && tomZeile.includes('Mutter, Vater'), tomZeile);

  console.log('10) Seitenblatt mit allen Werten');
  await page.click('tr[data-id="' + ids.tom + '"] td:nth-child(3)');
  await page.waitForSelector('dialog.db-blatt[open]');
  const blatt = await text('dialog.db-blatt');
  const erw = ['06 Esch/Alzette', 'C4', 'PT – Portugiesisch', 'portugais', 'MF-1001', 'I-EBS', 'SCAS', 'Mutter, Vater', 'getrennt', 'F90.0 ADHS', 'öffentlich', 'Esch-sur-Alzette', 'Lea Beispiel', '20.08.2019'];
  check('Seitenblatt zeigt Werte aus Fiche und Datenbank (' + erw.length + ' Stichproben)', erw.every(w => blatt.includes(w)), erw.filter(w => !blatt.includes(w)));
  check('Maßnahmen im Detail: DS beendet, ISA laufend mit Dauer', await page.isVisible('dialog.db-blatt .db-mliste li.beendet:has-text("Diagnostic spécialisé")') && await page.isVisible('dialog.db-blatt .db-mliste li.laufend:has-text("ISA")') && /ISA[\s\S]*Monat/.test(await text('dialog.db-blatt .db-mliste li.laufend')));
  check('Migration „ja“ (Ankunftsdatum), SCAS „ja“ (steht bei den Intervenants)', /Migrationskontext\s*ja/.test(blatt) && /SCAS\s*ja/.test(blatt));
  check('ISA = „Intervention spécialisée ambulatoire (ISA)“; Variablen nur zu Maßnahmen, die es gibt (kein „Atelier: welches“, keine CST-Gruppe)', blatt.includes('Intervention spécialisée ambulatoire (ISA)') && blatt.includes('ISA: Beginn') && blatt.includes('DS: Dauer (Monate)') && !blatt.includes('Atelier: welches') && !blatt.includes('CST: Gruppe'));
  check('Seitenblatt: Fokus im Dialog, Escape schließt', await page.evaluate(() => document.activeElement && !!document.activeElement.closest('dialog.db-blatt')));
  await page.keyboard.press('Escape'); await warte(200);
  check('Nach Escape: Blatt zu, Fokus zurück in der Tabelle', !(await page.$('dialog.db-blatt')) && await page.evaluate(() => !!document.activeElement.closest('.db-tab')));
  await page.focus('[data-fokus="z-' + ids.tom + '"]'); await page.keyboard.press('Enter');
  await page.waitForSelector('dialog.db-blatt[open]');
  check('Tastatur: Enter auf dem Namen öffnet das Blatt', true);

  console.log('11) Datenbank-Angaben bearbeiten');
  await page.click('dialog.db-blatt [data-db-b="db"]'); await page.waitForSelector('dialog.ar-dialog textarea[name="diagnosen"]');
  await page.fill('dialog.ar-dialog input[name="iq"]', '250'); await dialogKnopf('Speichern'); await warte(200);
  check('IQ außerhalb 40–160 wird abgelehnt', (await text('dialog.ar-dialog .ar-dialog-fehler')).includes('40 und 160'));
  await page.fill('dialog.ar-dialog input[name="iq"]', '104');
  await page.selectOption('dialog.ar-dialog select[name="schulform"]', 'prive');
  await page.fill('dialog.ar-dialog textarea[name="diagnosen"]', 'F90.0 ADHS\nF81.0 Legasthenie (Test)');
  await page.fill('dialog.ar-dialog input[name="cni"]', '2026-06-20');
  await dialogKnopf('Speichern');
  await page.waitForFunction(() => !document.querySelector('dialog.ar-dialog'), null, { timeout: 20000 }); await warte(300);
  const blatt2 = await text('dialog.db-blatt');
  check('Nach dem Speichern: IQ 104, privat, zwei Diagnosen, CNI 20.06.2026 im Blatt', blatt2.includes('104') && /Schulform\s*privat/.test(blatt2) && blatt2.includes('F81.0 Legasthenie (Test)') && blatt2.includes('20.06.2026'));
  const tomD = await page.evaluate(async id => { const d = await CDSE_TEAM.dossier(id, true); return { db: d.db, v: d.verlauf.map(v => v.t) }; }, ids.tom);
  check('Gespeichert in d.db über T.ops.datenbank, Protokoll des Dossiers nennt die Felder', tomD.db.iq === 104 && tomD.db.schulform === 'prive' && tomD.v.some(t => /Datenbank-Angaben geändert: .*IQ/.test(t)), tomD.v.slice(-2));
  const rohTom = await page.evaluate(async id => { const r = await navigator.storage.getDirectory(); const g = await (await r.getDirectoryHandle('gemeinsam')).getDirectoryHandle('schueler'); return await (await (await g.getFileHandle(id + '.cdse')).getFile()).text(); }, ids.tom);
  check('Dossier-Datei bleibt verschlüsselt (keine Diagnose im Klartext)', rohTom.includes('cdse-dossier') && !rohTom.includes('Legasthenie') && !rohTom.includes('F90'));
  await page.click('dialog.db-blatt [data-db-b="db"]'); await page.waitForSelector('dialog.ar-dialog .db-vorschlaege');
  check('Vorschläge aus anderen Dossiers (Sorgerecht „Foyer“)', await page.isVisible('dialog.ar-dialog [data-db-vorschlag="Foyer"]'));
  await dialogKnopf('Speichern'); await warte(400);
  check('Ohne Änderung wird nichts geschrieben', (await page.evaluate(async id => (await CDSE_TEAM.dossier(id, true)).verlauf.length, ids.tom)) === tomD.v.length);
  await page.screenshot({ path: path.join(OUT, 'db2-blatt.png') });
  await page.click('dialog.db-blatt [data-db-b="zu"]'); await warte(200);
  await bild('db2-tabelle.png');

  console.log('12) Export CSV und JSON');
  await page.evaluate(() => { window.__export = null; window.showSaveFilePicker = async (opt) => ({ createWritable: async () => ({ write: async (b) => { const u = new Uint8Array(await b.arrayBuffer()); window.__export = { name: opt.suggestedName, bom: [u[0], u[1], u[2]], text: new TextDecoder('utf-8', { ignoreBOM: true }).decode(u) }; }, close: async () => {} }) }); });
  await page.click('[data-db="export"]'); await page.waitForSelector('dialog.ar-dialog input[name="gelesen"]');
  check('Vor dem Export: Hinweis auf schützenswerte Daten Minderjähriger, O:\\, keine Mail', /schützenswerte Daten Minderjähriger/.test(await text('dialog.ar-dialog')) && /nur auf O:\\/.test(await text('dialog.ar-dialog')) && /nicht per Mail/.test(await text('dialog.ar-dialog')));
  await dialogKnopf('Datei speichern'); await warte(150);
  check('Ohne Bestätigung kein Export', (await text('dialog.ar-dialog .ar-dialog-fehler')).includes('bestätigen') && !(await page.evaluate(() => window.__export)));
  await page.check('dialog.ar-dialog input[name="gelesen"]'); await dialogKnopf('Datei speichern');
  await page.waitForFunction(() => window.__export, null, { timeout: 10000 });
  const csv = await page.evaluate(() => window.__export);
  const zeilenCsv = csvZeilen(csv.text), kopfCsv = zeilenCsv[0];
  check('CSV: UTF-8 mit BOM, Dateiname mit Uhrzeit und Auswahl: cdse-datenbank-JJJJ-MM-TT-hhmm-alle.csv', csv.bom.join(',') === '239,187,191' && /^cdse-datenbank-\d{4}-\d{2}-\d{2}-\d{4}-alle\.csv$/.test(csv.name), csv.name + ' ' + csv.bom);
  check('CSV: Semikolon, Zeilenende CRLF, Kopf mit Dossier-ID + allen Variablen', csv.text.includes('\r\n') && kopfCsv.length === 1 + (await page.evaluate(() => CDSE_DATENBANK.felder.length)) && kopfCsv[0] === 'Dossier-ID' && kopfCsv.includes('Direction régionale') && kopfCsv.includes('Laufende Maßnahmen'), kopfCsv.slice(0, 6));
  check('CSV: 8 Datenzeilen, jede so lang wie der Kopf', zeilenCsv.length === 9 && zeilenCsv.every(z => z.length === kopfCsv.length), zeilenCsv.map(z => z.length));
  const tomZ = zeilenCsv.find(z => z[0] === ids.tom) || [];
  check('CSV: Werte für Tom (Matricule, DR, IQ 104, Diagnosen mit „; “)', tomZ[kopfCsv.indexOf('Matricule')] === '=2014031000012' && tomZ[kopfCsv.indexOf('Direction régionale')] === '06 Esch/Alzette' && tomZ[kopfCsv.indexOf('IQ')] === '104' && tomZ[kopfCsv.indexOf('Diagnosen')] === 'F90.0 ADHS; F81.0 Legasthenie (Test)', tomZ.slice(0, 20));
  check('CSV: Ziffernfolgen als Text für Excel (Matricule ="2014031000012", Klasse ="3.1") – Zahlen wie der IQ bleiben Zahlen', csv.text.includes(';="2014031000012";') && csv.text.includes(';="3.1";') && csv.text.includes(';104;'), csv.text.slice(0, 400));
  check('CSV: Liste mit „; “ steht in Anführungszeichen (Excel liest sie als eine Zelle)', csv.text.includes('"F90.0 ADHS; F81.0 Legasthenie (Test)"'));
  check('CSV: keine Formeln für Excel („=1+1“ → „\'=1+1“)', csv.text.includes(";'=1+1;"));
  await page.evaluate(() => { window.showSaveFilePicker = undefined; });
  await page.click('[data-db="export"]'); await page.waitForSelector('dialog.ar-dialog input[name="gelesen"]');
  await page.check('dialog.ar-dialog input[name="format"][value="json"]'); await page.check('dialog.ar-dialog input[name="gelesen"]');
  const [dl] = await Promise.all([page.waitForEvent('download'), dialogKnopf('Datei speichern')]);
  const json = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  check('JSON (ohne Speichern-Dialog als Download): Format, 8 Datensätze, alle Felder', json.format === 'cdse-hub-datenbank' && json.anzahl === 8 && json.datensaetze.length === 8 && json.felder.length >= 45 && /\.json$/.test(dl.suggestedFilename()), [json.format, json.anzahl, dl.suggestedFilename()]);
  const tomJ = json.datensaetze.find(d => d.id === ids.tom);
  check('JSON: Tom mit Listen, Zahlen und Maßnahmen im Detail', tomJ.iq === 104 && tomJ.massnahmen.join() === 'ISA' && tomJ.sorgerecht.join() === 'Mutter,Vater' && tomJ.massnahmenDetail.length === 2 && tomJ.alter === alter('2014-03-10') && /schützenswerte/.test(json.hinweis), tomJ);

  console.log('13) Protokoll');
  await db('protokoll');
  const prot = await page.$$eval('[data-db-liste="eigene"] li', l => l.map(x => x.textContent));
  check('Protokoll: zwei Exporte mit Anzahl (wer: Leas Konto, wann)', prot.length === 2 && prot[0].includes('Export JSON') && prot[1].includes('Export CSV') && prot.every(t => t.includes('8 Datensätze')), prot);
  const protLs = await page.evaluate(() => JSON.parse(localStorage.getItem('cdse-db-protokoll-v1')));
  check('localStorage cdse-db-protokoll-v1: Konto, Name, Zeit', protLs.length === 2 && protLs.every(e => e.konto === konto.lea && e.name === 'Lea Beispiel' && e.z), protLs);
  await page.click('[data-db-prot="datenbank"]'); await warte(150);
  check('Zuletzt geänderte Dossiers: Filter „Datenbank-Angaben“ zeigt Toms Änderung', (await text('[data-db-liste="dossiers"]')).includes('MUSTER Tom') && (await text('[data-db-liste="dossiers"]')).includes('Datenbank-Angaben geändert'));

  console.log('14) Abfragen: Baukasten');
  await db('abfragen'); await page.waitForSelector('#db-bau');
  await page.selectOption('[data-db-bau="fn"]', 'mittel'); await warte(100);
  await page.selectOption('[data-db-bau="feld"]', 'alter'); await warte(100);
  await page.click('[data-db="fz-plus"]'); await warte(100);
  await page.selectOption('[data-db-fz="wert"][data-i="0"]', 'Mädchen'); await warte(100);
  await page.selectOption('[data-db-bau="gruppe"]', 'stelle'); await warte(150);
  check('Satz-Vorschau: „Durchschnittsalter der Mädchen, gruppiert nach Stelle.“', (await text('#db-satz')).trim() === 'Durchschnittsalter der Mädchen, gruppiert nach Stelle.', await text('#db-satz'));
  const maedchen = FALL.filter(f => f.person.geschlecht === 'w');
  const erg = await page.$$eval('#db-ergebnis tbody tr', l => l.map(tr => [...tr.children].map(c => c.textContent.trim())));
  const erwIsa = maedchen.filter(f => f.stelle === 'isa').map(f => alter(f.person.geburtsdatum));
  const zeileIsa = erg.find(z => z[0] === 'ISA') || [];
  check('Ergebnis: ISA 2 Mädchen, Mittelwert ' + de1((erwIsa[0] + erwIsa[1]) / 2), zeileIsa[1] === '2' && zeileIsa[2] === de1((erwIsa[0] + erwIsa[1]) / 2), erg);
  check('Ergebnis: CST und CdP je 1 Mädchen, 4 Mädchen gesamt', (erg.find(z => z[0] === 'CST') || [])[1] === '1' && (erg.find(z => z[0] === 'Classes de participation') || [])[1] === '1' && (await text('#db-ergebnis tfoot')).includes('4'), erg);
  check('Ergebnis als Balkendiagramm (SVG)', (await page.$$('#db-ergebnis .db-dg svg [data-label]')).length === erg.length);
  await page.selectOption('[data-db-fz="op"][data-i="0"]', 'istNicht'); await warte(100);
  check('Operator „ist nicht“: 4 Jungen', (await page.getAttribute('[data-db-treffer]', 'data-db-treffer')) === '4');
  await page.click('[data-db="fz-weg"][data-i="0"]'); await warte(100);
  await page.click('[data-db="abfrage-speichern"]'); await page.waitForSelector('dialog.ar-dialog input[name="name"]');
  await page.fill('dialog.ar-dialog input[name="name"]', 'Alter je Stelle (Test)'); await dialogKnopf('Speichern'); await warte(200);
  const gs = await page.evaluate(() => JSON.parse(localStorage.getItem('cdse-db-abfragen-v1')));
  check('Gespeicherte Abfrage in cdse-db-abfragen-v1 (Leas Konto)', gs && gs[konto.lea] && gs[konto.lea][0].name === 'Alter je Stelle (Test)' && gs[konto.lea][0].abfrage.kennzahl.fn === 'mittel', gs);
  await page.click('[data-db="abfrage-neu"]'); await warte(150);
  await page.click('[data-db-gespeichert]'); await warte(150);
  check('Gespeicherte Abfrage laden: Satz wieder da', (await text('#db-satz')).includes('Durchschnittsalter der Schüler, gruppiert nach Stelle'), await text('#db-satz'));

  console.log('15) Vorlagen');
  await page.click('[data-db-vorlage="stelle"]'); await warte(150);
  let ev = Object.fromEntries(await page.$$eval('#db-ergebnis tbody tr', l => l.map(tr => [tr.children[0].textContent.trim(), tr.children[1].textContent.trim()])));
  check('Vorlage „Schüler je Stelle“: ISA 3, Diagnostique 2', ev.ISA === '3' && ev.Diagnostique === '2' && ev.CST === '1', ev);
  await page.click('[data-db-vorlage="massnahmen"]'); await warte(150);
  ev = Object.fromEntries(await page.$$eval('#db-ergebnis tbody tr', l => l.map(tr => [tr.children[0].textContent.trim(), tr.children[1].textContent.trim()])));
  check('Vorlage „Laufende Maßnahmen nach Art“: ISA 3, Hinweis Mehrfachnennung', ev.ISA === String(lauf.ISA) && ev['C&G Eltern'] === '1' && ev['ohne Angabe'] === '2' && (await text('#db-ergebnis')).includes('Mehrfachnennung'), ev);
  await page.click('[data-db-vorlage="neu"]'); await warte(150);
  ev = Object.fromEntries(await page.$$eval('#db-ergebnis tbody tr', l => l.map(tr => [tr.children[0].textContent.trim(), tr.children[1].textContent.trim()])));
  const neuJe = zaehle(FALL.map(f => sjVon(beginn(f))));
  check('Vorlage „Neue Fälle je Schuljahr“ stimmt (' + JSON.stringify(neuJe) + ')', Object.keys(neuJe).every(k => ev[k] === String(neuJe[k])), ev);
  await page.click('[data-db-vorlage="beschulung"]'); await warte(150);
  ev = Object.fromEntries(await page.$$eval('#db-ergebnis tbody tr', l => l.map(tr => [tr.children[0].textContent.trim(), tr.children[1].textContent.trim()])));
  check('Vorlage „Spezialisierte Beschulung“: Annexe 1, CST 1 (inaktive CdP nicht)', ev['Annexe Junglinster'] === '1' && ev.CST === '1' && !ev['Classe de participation'], ev);

  console.log('16) Freitext-Fragen');
  async function frage(t) { await page.fill('#db-frage', t); await page.press('#db-frage', 'Enter'); await page.waitForSelector('#db-verstanden .db-verstanden', { timeout: 5000 }); await warte(150); return (await text('#db-verstanden')).replace(/\s+/g, ' '); }
  let v = await frage('Durchschnittsalter der Mädchen mit ISA in DR Esch');
  const erwF1 = FALL.filter(f => f.person.geschlecht === 'w' && laufende(f).includes('ISA') && f.fiche.ef && f.fiche.ef.dr === '06 Esch/Alzette').map(f => alter(f.person.geburtsdatum));
  check('Frage 1 verstanden: „Durchschnittsalter der Mädchen mit ISA in der DR 06 Esch/Alzette.“', v.includes('So verstanden: Durchschnittsalter der Mädchen mit ISA in der DR 06 Esch/Alzette.'), v);
  check('Frage 1 Ergebnis: ' + de1(erwF1.reduce((a, b) => a + b, 0) / erwF1.length) + ' Jahre (' + erwF1.length + ' Mädchen)', (await text('[data-db-wert]')) === de1(erwF1.reduce((a, b) => a + b, 0) / erwF1.length) && (await page.getAttribute('[data-db-treffer]', 'data-db-treffer')) === String(erwF1.length), await text('[data-db-wert]'));
  v = await frage('Wie viele Schüler im CST?');
  check('Frage 2: „Anzahl der Schüler in der Stelle CST.“ → 1', v.includes('Anzahl der Schüler in der Stelle CST.') && (await text('[data-db-wert]')) === '1', v);
  v = await frage('Anzahl nach Stelle');
  ev = Object.fromEntries(await page.$$eval('#db-ergebnis tbody tr', l => l.map(tr => [tr.children[0].textContent.trim(), tr.children[1].textContent.trim()])));
  check('Frage 3: „Anzahl der Schüler, gruppiert nach Stelle.“ mit Tabelle', v.includes('gruppiert nach Stelle') && ev.ISA === '3' && ev['Annexe Junglinster'] === '1', ev);
  v = await frage('Wie viele Jungen zwischen 10 und 12 Jahren nach Cycle?');
  const f4 = FALL.filter(f => f.person.geschlecht === 'm' && alter(f.person.geburtsdatum) >= 10 && alter(f.person.geburtsdatum) <= 12);
  check('Frage 4: Jungen zwischen 10 und 12 Jahren nach Cycle (' + f4.length + ')', v.includes('Anzahl der Jungen zwischen 10 und 12 Jahren, gruppiert nach Cycle.') && (await page.getAttribute('[data-db-treffer]', 'data-db-treffer')) === String(f4.length), v);
  v = await frage('Wie viele Schüler mögen Pizza?');
  check('Unbekannte Wörter werden genannt („mögen“, „Pizza“)', v.includes('Nicht berücksichtigt') && v.includes('„mögen“') && v.includes('„Pizza“'), v);
  await page.click('[data-db-beispiel="Neue Fälle in diesem Schuljahr nach Direction"]'); await warte(200);
  check('Beispiel-Chip stellt die Frage', (await text('#db-verstanden')).includes('neu im Schuljahr ' + SJ) && (await page.getAttribute('[data-db-treffer]', 'data-db-treffer')) === String(neuErw), await text('#db-verstanden'));
  await bild('db3-abfragen.png');
  q = await querScroll();
  check('1280 px: Abfragen ohne waagrechtes Scrollen', ohneQuer(q), q);

  console.log('16b) Mehrere Variablen: „eines von“, „oder“, Kreuztabelle, ältere gespeicherte Abfragen');
  const rowsF = await page.evaluate(async () => (await CDSE_TEAM.alleDossiers()).map(d => CDSE_DATENBANK.datensatz(d)));
  const ab = a => page.evaluate(([r, q]) => { const x = CDSE_DATENBANK.abfrage(r, q); return { n: x.n, kreuz: x.kreuz && x.kreuz.zeilen.map(z => [z.key, Object.fromEntries(Object.entries(z.zellen).map(([k, c]) => [k, c.n]))]) }; }, [rowsF, a]);
  const treffer = () => page.getAttribute('[data-db-treffer]', 'data-db-treffer');
  const istEines = f => laufende(f).some(m => m === 'ISA' || m === 'CST');
  await page.click('[data-db="abfrage-neu"]'); await warte(150);
  await page.selectOption('[data-db-bau="gruppe"]', ''); await warte(100);
  await page.click('[data-db="fz-plus"]'); await warte(100);
  await page.selectOption('[data-db-fz="feld"][data-i="0"]', 'massnahmen'); await warte(100);
  await page.selectOption('[data-db-fz="op"][data-i="0"]', 'enthaeltEines'); await warte(100);
  await page.check('input[data-db-fw][data-i="0"][value="ISA"]'); await warte(100);
  await page.check('input[data-db-fw][data-i="0"][value="CST"]'); await warte(150);
  const nEines = FALL.filter(istEines).length;
  check('Baukasten: „enthält eines von“ mit Kästchen (ISA, CST) → ' + nEines, await treffer() === String(nEines) && (await text('#db-satz')).includes('mit ISA oder CST'), [await treffer(), await text('#db-satz')]);
  await page.click('[data-db="fz-plus"]'); await warte(100);
  await page.selectOption('[data-db-fz="wert"][data-i="1"]', 'Mädchen'); await warte(150);
  const nUnd = FALL.filter(f => f.person.geschlecht === 'w' && istEines(f)).length;
  check('Zwei Filter mit „und“: Mädchen mit ISA oder CST → ' + nUnd, await treffer() === String(nUnd) && await page.isVisible('.db-verbinder'), await treffer());
  await page.selectOption('[data-db-bau="verknuepfung"]', 'oder'); await warte(150);
  const oderFaelle = FALL.filter(f => f.person.geschlecht === 'w' || istEines(f));
  check('Verknüpfung „oder“: mindestens ein Filter trifft zu → ' + oderFaelle.length, await treffer() === String(oderFaelle.length) && (await text('#db-satz')).includes('mindestens eine Bedingung'), [await treffer(), await text('#db-satz')]);
  await page.selectOption('[data-db-bau="gruppe"]', 'geschlecht'); await warte(150);
  await page.selectOption('[data-db-bau="gruppe2"]', 'cycle'); await warte(200);
  check('Zweite Gruppierung → Kreuztabelle Geschlecht × Cycle', await page.isVisible('#db-ergebnis table[data-db-kreuz]') && (await text('#db-satz')).includes('gruppiert nach Geschlecht und Cycle'), await text('#db-satz'));
  const kKopf = await page.$$eval('#db-ergebnis table[data-db-kreuz] thead th', l => l.map(x => x.textContent.trim()));
  const kZeilen = await page.$$eval('#db-ergebnis table[data-db-kreuz] tbody tr', l => l.map(tr => [tr.getAttribute('data-gruppe'), [...tr.querySelectorAll('td')].map(td => td.firstChild ? (td.querySelector('a') ? td.querySelector('a').firstChild.textContent : td.textContent).trim() : '')]));
  const erwJ = zaehle(oderFaelle.filter(f => f.person.geschlecht === 'm').map(f => f.cycle)), zJ = (kZeilen.find(z => z[0] === 'Junge') || [null, []])[1];
  check('Kreuztabelle: Zeile „Junge“ stimmt je Cycle ' + JSON.stringify(erwJ), Object.keys(erwJ).every(c => zJ[kKopf.indexOf(c) - 1] === String(erwJ[c])), [kKopf, kZeilen]);
  await bild('db3b-kreuztabelle.png');
  const zelle = await page.$('#db-ergebnis table[data-db-kreuz] tbody td a'), zellWert = (await zelle.textContent()).trim();
  await zelle.click(); await page.waitForSelector('.db-tab', { timeout: 10000 }); await warte(200);
  check('Klick in die Kreuztabelle → Tabelle mit genau diesen Dossiers (Oder-Filter als eigener Chip)', String((await page.$$('.db-tab tbody tr')).length) === zellWert && await page.isVisible('.db-fchip-oder'), [zellWert, await text('.db-aktivfilter')]);
  await page.click('[data-db="tf-alle-weg"]'); await warte(100);
  await db('abfragen'); await page.waitForSelector('#db-bau');
  const r1 = await ab({ filter: [{ feld: 'cycle', op: 'einesVon', werte: ['C3', 'C4'] }] });
  check('API: Cycle „ist eines von“ C3, C4', r1.n === FALL.filter(f => ['C3', 'C4'].includes(f.cycle)).length, r1);
  const r2 = await ab({ filter: [{ feld: 'direction', op: 'keinesVon', werte: ['06 Esch/Alzette'] }] });
  check('API: Direction „ist keines von“ 06 (Dossiers ohne Angabe zählen mit)', r2.n === FALL.filter(f => !(f.fiche && f.fiche.ef && f.fiche.ef.dr === '06 Esch/Alzette')).length, r2);
  const r3 = await ab({ filter: [{ feld: 'massnahmenAlle', op: 'enthaeltAlle', werte: ['DS', 'ISA'] }] });
  check('API: „enthält alle von“ DS und ISA → nur Tom', r3.n === 1, r3);
  const r4 = await ab({ filter: [], gruppe: 'stelle', gruppe2: 'geschlecht' });
  const isaZ = (r4.kreuz.find(z => z[0] === 'ISA') || [])[1] || {};
  check('API: Kreuztabelle Stelle × Geschlecht (ISA: 1 Junge, 2 Mädchen)', isaZ.Junge === 1 && isaZ['Mädchen'] === 2, r4.kreuz);
  const altA = await page.evaluate(() => CDSE_DATENBANK.norm({ filter: [{ feld: 'autreCc', op: 'enthaelt', wert: 'Logopédie' }, { feld: 'massnahmen', op: 'ist', wert: 'ISA' }], gruppe: 'stelle' }));
  check('Ältere gespeicherte Abfragen bleiben gültig: Freitext-CC → „CL“, „ist“ bei Listen → „enthält“, und/oder ergänzt', altA.filter[0].op === 'enthaelt' && altA.filter[0].wert === 'CL' && altA.filter[1].op === 'enthaelt' && altA.verknuepfung === 'und' && altA.gruppe2 === '', altA);
  const ccT = await page.evaluate(() => [CDSE_DATENBANK.kompetenzzentren('Centre de Logopédie'), CDSE_DATENBANK.kompetenzzentren('CL und CDI'), CDSE_DATENBANK.kompetenzzentren('Centre pour enfants et jeunes à haut potentiel; Service Test (fictif)'), CDSE_DATENBANK.kompetenzzentren(['CTSA — Centre …', 'cda'])]);
  check('Andere Kompetenzzentren aus Freitext erkannt (Logopédie → CL, „CL und CDI“, haut potentiel → CEJHP, Unbekanntes bleibt Text)', JSON.stringify(ccT) === JSON.stringify([['CL'], ['CDI', 'CL'], ['CEJHP', 'Service Test (fictif)'], ['CTSA', 'CDA']]), ccT);
  v = await frage('Wie viele Mädchen mit ISA oder Atelier nach Cycle?');
  const f5 = FALL.filter(f => f.person.geschlecht === 'w' && laufende(f).some(m => m === 'ISA' || m === 'Atelier'));
  check('Frage „… mit ISA oder Atelier …“ → „enthält eines von“ (' + f5.length + ')', v.includes('Anzahl der Mädchen mit ISA oder Atelier, gruppiert nach Cycle.') && await treffer() === String(f5.length), v);
  v = await frage('Anzahl nach Direction und Maßnahme');
  check('Frage „nach Direction und Maßnahme“ → Kreuztabelle', v.includes('gruppiert nach Direction régionale und Laufende Maßnahmen') && await page.isVisible('#db-ergebnis table[data-db-kreuz]'), v);
  v = await frage('Wie viele Schüler in DR 06 oder 12?');
  const f6 = FALL.filter(f => f.fiche && f.fiche.ef && ['06 Esch/Alzette', '12 Mersch'].includes(f.fiche.ef.dr));
  check('Frage „in DR 06 oder 12“ → Direction „ist eines von“ (' + f6.length + ')', v.includes('in den DR 06 Esch/Alzette oder 12 Mersch') && await treffer() === String(f6.length), v);
  v = await frage('Mittlere Dauer der Ateliers nach Atelier');
  check('Frage „Mittlere Dauer der Ateliers nach Atelier“ → Mittelwert „Atelier: Dauer“, gruppiert nach „Atelier: welches“', v.includes('Durchschnitt von „Atelier: Dauer (Monate)“') && v.includes('gruppiert nach Atelier: welches'), v);
  await page.click('[data-db-vorlage="massnahmenDr"]'); await warte(200);
  check('Vorlage „Laufende Maßnahmen je Direction“ = Kreuztabelle', await page.isVisible('#db-ergebnis table[data-db-kreuz]') && (await text('#db-satz')).includes('gruppiert nach Direction régionale und Laufende Maßnahmen'));
  await page.click('[data-db-vorlage="oder"]'); await warte(200);
  const nOder = FALL.filter(f => laufende(f).includes('ISA') || (f.db && f.db.scas === 'ja') || (f.fiche && (f.fiche.intervenants || []).some(i => /scas/i.test(i.institution)) && !(f.db && f.db.scas === 'nein'))).length;
  check('Vorlage „Mit ISA oder mit SCAS“ (oder) → ' + nOder, await treffer() === String(nOder), await treffer());
  check('Vorlagen nach Bereichen (4 Überschriften)', (await page.$$('.db-vorlagen-b')).length === 4);
  q = await querScroll();
  check('1280 px: Abfragen mit Kreuztabelle ohne waagrechtes Scrollen', ohneQuer(q), q);

  console.log('17) Import aus CDSE Stats');
  await db('import');
  await page.setInputFiles('#db-datei', { name: 'cdse-backup-2026-09-01.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(STATS, null, 2)) });
  await page.waitForSelector('.db-vorschau', { timeout: 20000 });
  check('Vorschau: 2 neu, 2 vorhanden, 1 nicht übernommen (doppelt)', await kpi('imp-neu') === '2' && await kpi('imp-vorhanden') === '2' && await kpi('imp-aus') === '1', [await kpi('imp-neu'), await kpi('imp-vorhanden'), await kpi('imp-aus')]);
  const vtab = await text('.db-imptab');
  check('Abgleich: Tom über die Matricule, Luca über Name + Geburtsdatum, Maria doppelt', vtab.includes('gleiche Matricule') && vtab.includes('gleicher Name und Geburtsdatum') && vtab.includes('doppelt in der Datei'), vtab.slice(0, 400));
  check('Directions: „DIR Esch-sur-Alzette“ zugeordnet, „DIR Capellen“ offen', await page.inputValue('select[data-db-imp="dr"][data-alt="DIR Esch-sur-Alzette"]') === '06 Esch/Alzette' && await page.inputValue('select[data-db-imp="dr"][data-alt="DIR Capellen"]') === '');
  await page.selectOption('select[data-db-imp="dr"][data-alt="DIR Capellen"]', '02 Mamer'); await warte(150);
  check('Stelle automatisch: Maria → ISA (laufende ISA), Jonas → CST', (await text('.db-imp-neu:has-text("FIKTIV Maria")')).includes('wird angelegt · Stelle ISA') && (await text('.db-imp-neu:has-text("BEISPIEL Jonas")')).includes('Stelle CST'), await text('.db-imptab'));
  await bild('db4-import.png');
  await page.click('[data-db="import-los"]');
  await page.waitForSelector('.db-imp-ergebnis', { timeout: 60000 });
  check('Import „nur neue“: 2 angelegt, 0 ergänzt', await kpi('imp-angelegt') === '2' && await kpi('imp-ergaenzt') === '0', await text('.db-imp-ergebnis'));
  const nachImport = await page.evaluate(async () => (await CDSE_TEAM.alleDossiers(true)).map(d => ({ id: d.id, name: d.person.vorname, stelle: d.stelle, r: CDSE_DATENBANK.datensatz(d), v: d.verlauf.map(x => x.t) })));
  const maria = nachImport.find(x => x.name === 'Maria'), jonas = nachImport.find(x => x.name === 'Jonas');
  check('Jetzt 10 Dossiers', nachImport.length === 10);
  check('Maria: DR 06, ISA laufend seit 01.03.2025, DS (ein Termin, beendet), Sorgerecht Mutter+Vater, SCAS ja, PT, IQ 97', maria && maria.r.direction === '06 Esch/Alzette' && maria.r.massnahmen.join() === 'ISA' && maria.r.isaBeginn === '2025-03-01' && maria.r.massnahmenAlle.includes('DS') && maria.r.dsDatum === '2025-01-15' && maria.r.sorgerecht.join() === 'Mutter,Vater' && maria.r.scas === 'ja' && maria.r.sprache === 'PT' && maria.r.iq === 97 && maria.stelle === 'isa', maria && maria.r);
  check('Maria: Beginn der Begleitung = Anlage in CDSE Stats (10.01.2025), Herkunft im Protokoll', maria.r.beginn === '2025-01-10' && maria.v.some(t => t.includes('Import aus CDSE Stats')), maria.r.beginn);
  check('Jonas: DR 02 Mamer (in der Vorschau gewählt), CST mit Standort Moveo, Stelle CST', jonas && jonas.r.direction === '02 Mamer' && jonas.r.beschulung === 'CST' && jonas.r.beschulungOrt === 'Moveo' && jonas.stelle === 'cst' && jonas.r.sorgerecht.join() === 'Mutter', jonas && jonas.r);
  await page.click('[data-db="import-weg"]'); await warte(100);
  await page.setInputFiles('#db-datei', { name: 'cdse-backup-2026-09-01.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(STATS)) });
  await page.waitForSelector('.db-vorschau', { timeout: 20000 });
  check('Zweiter Durchlauf: nichts mehr neu (schon übernommen)', await kpi('imp-neu') === '0' && (await text('.db-imptab')).includes('schon aus CDSE Stats übernommen'));
  await page.check('input[data-db-imp="modus"][value="ergaenzen"]'); await warte(200);
  const vtab2 = await text('.db-imptab');
  check('Modus „ergänzen“: Tom bekommt Kompetenzzentrum und vorherige Schule, Luca Direction und Erstsprache', /MUSTER Tom[\s\S]*wird ergänzt:[^\n]*andere Kompetenzzentren/.test(vtab2) && /vorherige Schule/.test(vtab2) && /FIKTIV Luca[\s\S]*Direction régionale/.test(vtab2), vtab2.slice(0, 600));
  await page.selectOption('select[data-db-imp="dr"][data-alt="DIR Capellen"]', '02 Mamer'); await warte(100);
  await page.click('[data-db="import-los"]');
  await page.waitForSelector('.db-imp-ergebnis', { timeout: 60000 });
  check('Import „ergänzen“: 2 ergänzt, 0 angelegt', await kpi('imp-ergaenzt') === '2' && await kpi('imp-angelegt') === '0', await text('.db-imp-ergebnis'));
  const nach2 = await page.evaluate(async () => (await CDSE_TEAM.alleDossiers(true)).map(d => ({ name: d.person.vorname, r: CDSE_DATENBANK.datensatz(d), schule: d.person.schule })));
  const tom2 = nach2.find(x => x.name === 'Tom'), luca2 = nach2.find(x => x.name === 'Luca');
  check('Ergänzen überschreibt nichts: Tom behält IQ 104 und École Brill, bekommt „Centre de Logopédie“ (als CL erkannt)', tom2.r.iq === 104 && tom2.r.schule === 'École Brill' && JSON.stringify(tom2.r.autreCc) === '["CL"]' && tom2.r.vorherigeSchule === 'École Neudorf', tom2.r);
  check('Luca: Direction 01, Erstsprache LU, Eltern zusammen', luca2.r.direction === '01, Luxembourg' && luca2.r.sprache === 'LU' && luca2.r.eltern === 'zusammen', luca2.r);
  const CSV = '\uFEFF' + ['ID;National ID;M-File No.;Last name;First name;Sex;Date of birth;DIR;School;Diagnoses;First language;Guardianship by;Age;Created at;Updated at',
    'stats-0100;2014031000012;MF-1001;Muster;Tom;M;2014-03-10;DIR Esch-sur-Alzette;École Brill;F90.0 — ADHD;PT;Mother;12;2024-11-02T09:00:00.000Z;2024-11-02T09:00:00.000Z',
    'stats-0101;2016080800055;;Probe;Nora;F;2016-08-08;DIR Remich;École Remich;"F90.0 — ADHD; F81.0 — Dyslexia";DE;"Mother; Father";10;2025-02-01T09:00:00.000Z;2025-02-01T09:00:00.000Z'].join('\r\n') + '\r\n';
  await page.click('[data-db="import-weg"]'); await warte(100);
  await page.setInputFiles('#db-datei', { name: 'cdse-backup-2026-09-01-0930.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV, 'utf8') });
  await page.waitForSelector('.db-vorschau', { timeout: 20000 });
  check('CSV (Backup von CDSE Stats, englische Spaltennamen): 1 neu, 1 vorhanden', await kpi('imp-neu') === '1' && await kpi('imp-vorhanden') === '1' && (await text('.db-vorschau')).includes('CSV'), [await kpi('imp-neu'), await kpi('imp-vorhanden')]);
  await page.click('[data-db="import-los"]'); await page.waitForSelector('.db-imp-ergebnis', { timeout: 60000 });
  const nora = (await page.evaluate(async () => (await CDSE_TEAM.alleDossiers(true)).map(d => CDSE_DATENBANK.datensatz(d)))).find(r => r.vorname === 'Nora');
  check('CSV: Listen in Anführungszeichen getrennt (2 Diagnosen, Sorgerecht Mutter + Vater), DR 09 Remich, DE', nora && nora.diagnosen.length === 2 && nora.sorgerecht.join() === 'Mutter,Vater' && nora.direction === '09 Remich' && nora.sprache === 'DE' && nora.beginn === '2025-02-01', nora);
  /* Excel „CSV (Trennzeichen-getrennt)“ speichert unter Windows als Windows-1252 – nur Vorschau, dann verwerfen */
  await page.click('[data-db="import-weg"]'); await warte(100);
  await page.setInputFiles('#db-datei', { name: 'liste-excel.csv', mimeType: 'text/csv', buffer: Buffer.from('Nom et prénom;École;Date de naissance\r\nBEISPIEL Léa;École Brill;01.02.2016\r\n', 'latin1') });
  await page.waitForSelector('.db-vorschau', { timeout: 20000 });
  check('CSV aus Excel (Windows-1252): Zeichensatz erkannt und angezeigt, „École“ und „Léa“ richtig gelesen', (await text('.db-vorschau')).includes('Zeichensatz Windows-1252') && (await text('.db-spzutab')).includes('École Brill') &&
    (await text('.db-imptab')).includes('BEISPIEL Léa') && !(await text('.db-vorschau')).includes(String.fromCharCode(0xFFFD)), (await text('.db-vorschau')).slice(0, 300));
  await page.click('[data-db="import-weg"]'); await warte(100);
  await db('protokoll');
  const prot2 = await page.$$eval('[data-db-liste="eigene"] li', l => l.map(x => x.textContent));
  check('Protokoll: drei Importe mit Anzahl (1 angelegt · 2 ergänzt · 2 angelegt)', prot2.length === 5 && prot2[0].includes('Import CDSE Stats · 1 Datensatz') && prot2[1].includes('2 ergänzt') && prot2[2].includes('2 angelegt'), prot2.slice(0, 3));

  console.log('17b) Export aus CDSE Stats 0.5 (neue Maßnahmen, DR 01–15, C&G für wen, andere CC als Liste)');
  const neu05 = await page.evaluate(() => {
    const s = { id: 'stats-0500', matricule: '2016010100077', nom: 'Probe', prenom: 'Ida', sexe: 'F', date_naissance: '2016-01-01', dir: 'DR 05 Sanem',
      ecole_lycee: 'École fondamentale Test (fictive)', mesure_cdse_1: 'Atelier', mesure_cdse_2: 'CST', mesure_cdse_3: 'C&G',
      atelier_type: 'Demo atelier A', debut_atelier: '2025-02-01', cst_groupe: 'Moveo', debut_cst: '2024-09-15', fin_cst: '2025-07-15',
      debut_annexe: '2023-09-15', fin_annexe: '2024-07-15', cdp_region: 'DR 03 Pétange', debut_cdp: '2022-09-15',
      cg_type: 'Parents', debut_cg: '2025-03-01', reeducation_type: 'Demo rééducation B', debut_reeducation: '2025-04-01',
      autres_cc: ['CDI — Centre pour le développement intellectuel', 'CL — Centre de logopédie'], langue_1: 'Other', langue_1_autre: 'albanais',
      eldib_v: '3', dur_cst: 10, measures_all: ['Atelier', 'CST'] };
    const e = { dr: { 'DR 05 Sanem': CDSE_DATENBANK.cdseStats.drImport('DR 05 Sanem') } };
    return CDSE_DATENBANK.cdseStats.abbilden(s, e);
  });
  const c05 = neu05.fiche.cdse || {};
  check('0.5: DR 05 Sanem → „05 Sanem“', (neu05.fiche.ef || {}).dr === '05 Sanem', neu05.fiche.ef);
  check('0.5: Atelier mit „welches“ und Beginn, CST-Gruppe Moveo, Annexe mit Daten, CdP-Region Pétange', c05.atelier && c05.atelier.standort === 'Demo atelier A' && c05.atelier.von === '2025-02-01' &&
    c05.cst && c05.cst.standort === 'Moveo' && c05.cst.bis === '2025-07-15' && c05.annexe && c05.annexe.von === '2023-09-15' && c05.cdp && c05.cdp.standort === '03 Pétange', c05);
  check('0.5: C&G „Parents“ → C&G Eltern (nicht Fachkräfte), Rééducation mit Typ', c05.cgEltern && !c05.cgPro && c05.reeducation && c05.reeducation.standort === 'Demo rééducation B', Object.keys(c05));
  check('0.5: andere CC als Liste → Kürzel „CDI; CL“, Sprache „Other“ → albanais, ELDiB-Stufe V 3 – ohne Datum nur mit Hinweis „kein Vergleich“', neu05.db.autreCc === 'CDI; CL' && neu05.fiche.ersteSprache === 'albanais' && neu05.db.eldibStufen && neu05.db.eldibStufen.verhalten === 3 &&
    neu05.warnungen.length === 1 && /ELDiB-Stufen ohne Datum/.test(neu05.warnungen[0]), [neu05.db.autreCc, neu05.fiche.ersteSprache, neu05.db.eldibStufen, neu05.warnungen]);
  const eltern05 = await page.evaluate(() => CDSE_DATENBANK.cdseStats.abbilden({ id: 'stats-0501', nom: 'Probe', prenom: 'Emil', parents: 'Other', parents_autre: 'lebt bei der Tante (fiktiv)', remarque: 'Testnotiz' }).db);
  check('0.5: parents_autre geht nicht verloren – „Elternsituation: …“ in der Notiz (nach der Bemerkung)', eltern05.eltern === 'anderes' && eltern05.notiz === 'Testnotiz\nElternsituation: lebt bei der Tante (fiktiv)', eltern05);

  console.log('17c) Import aus einer Excel-Tabelle (.xlsx): Spalten zuordnen, Vorschau, Import, Ergänzen');
  await db('import');
  const XLSX = path.join(__dirname, 'daten', 'import-test.xlsx');
  await page.setInputFiles('#db-datei', XLSX);
  await page.waitForSelector('.db-vorschau .db-spzutab', { timeout: 20000 });
  const Z = Object.fromEntries(await page.$$eval('.db-spzutab tbody tr', l => l.map(tr => [tr.querySelector('td b').textContent, tr.querySelector('select').value])));
  check('Excel: Kopfzeile unter der Titelzeile gefunden, Spalten geraten (Nom et prénom, Date de naissance, DR, Mesures, CC, ELDiB V …)', Z['Nom et prénom'] === 'nom_prenom' && Z['Date de naissance'] === 'date_naissance' && Z.Sexe === 'sexe' && Z.DR === 'dir' && Z.Classe === 'classe' &&
    Z.Mesures === 'mesures' && Z['Début ISA'] === 'debut_isa' && Z.Atelier === 'atelier_type' && Z['Début atelier'] === 'debut_atelier' && Z['Groupe CST'] === 'cst_groupe' && Z.CC === 'autres_cc' && Z.QI === 'iq' &&
    Z.ELDiB === 'eldib_date' && Z['ELDiB V'] === 'eldib_v' && Z['ELDiB K'] === 'eldib_k' && Z.Remarques === 'remarque' && Z.Stelle === 'stelle' && Z['Couleur préférée'] === '', Z);
  check('Excel: zwei Tabellenblätter zur Wahl, das erste ist gewählt', (await page.$$eval('select[data-db-imp="blatt"] option', l => l.length)) === 2 && await page.inputValue('select[data-db-imp="blatt"]') === '0');
  check('Excel: Vorschau 3 neu, 1 vorhanden (Tom über die Matricule), 1 ohne Namen', await kpi('imp-neu') === '3' && await kpi('imp-vorhanden') === '1' && await kpi('imp-aus') === '1', [await kpi('imp-neu'), await kpi('imp-vorhanden'), await kpi('imp-aus')]);
  check('Excel: unmögliches Datum wird mit Zeilennummer gemeldet (Zeile 7: „31.02.2015“)', (await text('.db-vorschau')).includes('Zeile 7: „31.02.2015“ ist kein Datum'), (await text('.db-vorschau')).slice(0, 400));
  check('Excel: Beispiele aus der Tabelle, Excel-Datum als Datum (15.06.2016)', (await text('.db-spzutab')).includes('15.06.2016') && (await text('.db-spzutab')).includes('MUSTER Tom'));
  check('Excel: Spalte „Nom et prénom“ – Reihenfolge wählbar, Beispiele getrennt gezeigt (Nachname / Vorname)', await page.inputValue('select[data-db-imp="namen"]') === 'nv' &&
    (await text('.db-namen')).includes('Nachname MUSTER · Vorname Tom') && (await text('.db-namen')).includes('Nachname Probe · Vorname Jana'), await text('.db-namen'));
  await page.selectOption('select[data-db-imp="namen"]', 'vn'); await warte(200);
  check('Reihenfolge „Vorname Nachname“: „Fiktiv Max“ → Nachname Max; eindeutige Namen bleiben (MUSTER Tom, „Probe, Jana“)', (await text('.db-imptab')).includes('MAX Fiktiv') && (await text('.db-imptab')).includes('PROBE Jana') && (await text('.db-imptab')).includes('BEISPIEL Nina'), (await text('.db-imptab')).slice(0, 300));
  await page.selectOption('select[data-db-imp="namen"]', 'nv'); await warte(200);
  check('Excel ohne Spalte „Beginn der Begleitung“: Hinweise – der Beginn bleibt unbekannt, der Tag des Imports zählt nicht', (await text('.db-vorschau')).includes('Keine Spalte „Beginn der Begleitung“') && (await text('.db-vorschau')).includes('kein Datum für den Beginn der Begleitung') && (await text('.db-imptab')).includes('FIKTIV Max'));
  await page.selectOption('select[data-db-imp="spalte"][data-sp="17"]', ''); await warte(200);
  check('Zuordnung änderbar: „Remarques“ auf „nicht übernehmen“ → Zeile grau, Vorschau neu', await page.inputValue('select[data-db-imp="spalte"][data-sp="17"]') === '' && await page.isVisible('.db-spzutab tr.db-sp-aus:has-text("Remarques")') && await kpi('imp-neu') === '3');
  await page.selectOption('select[data-db-imp="spalte"][data-sp="17"]', 'remarque'); await warte(200);
  await bild('db4b-excel-zuordnung.png');
  await page.click('[data-db="import-los"]');
  await page.waitForSelector('.db-imp-ergebnis', { timeout: 60000 });
  check('Excel-Import: 3 Dossiers angelegt', await kpi('imp-angelegt') === '3', await text('.db-imp-ergebnis'));
  const nachXl = await page.evaluate(async () => (await CDSE_TEAM.alleDossiers(true)).map(d => ({ vor: d.person.vorname, nach: d.person.nachname, stelle: d.stelle, r: CDSE_DATENBANK.datensatz(d), v: d.verlauf.map(x => x.t), herkunft: (d.db || {}).herkunft || {} })));
  const nina = nachXl.find(x => x.vor === 'Nina'), jana = nachXl.find(x => x.vor === 'Jana'), maxx = nachXl.find(x => x.vor === 'Max');
  check('Nina: Name geteilt, Mädchen, Excel-Datum, Klasse C3.2 → Cycle C3, „DR 05“ → 05 Sanem', nina && nina.nach === 'BEISPIEL' && nina.r.geschlecht === 'Mädchen' && nina.r.geburtsdatum === '2016-06-15' && nina.r.klasse === 'C3.2' && nina.r.cycle === 'C3' && nina.r.direction === '05 Sanem', nina && nina.r);
  check('Nina: „C&G parents, Rééducation“ → C&G für Eltern + Rééducation; CC „CDI; Centre de logopédie“ → CDI, CL; Stelle automatisch Diagnostique', nina.r.massnahmenAlle.includes('C&G Eltern') && nina.r.massnahmenAlle.includes('Rééducation') && nina.r.cgArt === 'Eltern' && JSON.stringify(nina.r.autreCc) === '["CDI","CL"]' && nina.stelle === 'diagnostique', nina.r);
  check('Nina: ELDiB-Stufen aus der Tabelle (V 2, K 2; mit 9 Jahren erwartet 3 → beide darunter)', nina.r.eldibHerkunft === 'Datenbank-Angabe' && nina.r.eldibVerhalten === 2 && nina.r.eldibKommunikation === 2 && nina.r.eldibErwartet === 3 && JSON.stringify(nina.r.eldibUnter) === '["Verhalten","Kommunikation"]' && nina.r.eldibDatum === '2026-03-02', nina.r);
  check('Nina: Herkunft „Excel-Tabelle (import-test.xlsx)“, Protokoll „Import aus Excel-Tabelle“', nina.herkunft.quelle === 'Excel-Tabelle (import-test.xlsx)' && !nina.herkunft.id && nina.v.some(t => t.startsWith('Import aus Excel-Tabelle')), [nina.herkunft, nina.v]);
  check('Jana: „Probe, Jana“ geteilt, Datum als Text (12.02.2015), „Mersch“ → 12 Mersch, CST Gruppe Passo, Stelle CST, IQ 105', jana && jana.nach === 'Probe' && jana.r.geburtsdatum === '2015-02-12' && jana.r.geschlecht === 'Mädchen' && jana.r.direction === '12 Mersch' && jana.r.cstGruppe === 'Passo' && jana.stelle === 'cst' && jana.r.iq === 105, jana && jana.r);
  check('Max: unmögliches Datum bleibt leer, Junge, DS, Klasse C2.1', maxx && maxx.r.geburtsdatum === '' && maxx.r.geschlecht === 'Junge' && maxx.r.massnahmenAlle.join() === 'DS' && maxx.r.klasse === 'C2.1', maxx && maxx.r);
  check('Übernommen ohne Datum: Beginn unbekannt (nicht der Tag des Imports), keine Dauer – zwei Schreibvorgänge je neuem Dossier', nina.r.beginn === '' && nina.r.dauerBegleitung === null && nina.herkunft.neu === true && nina.v.length === 2, [nina.r.beginn, nina.r.dauerBegleitung, nina.v]);
  const teil = await page.evaluate(() => CDSE_DATENBANK.tabelle.zuRoh({ kopf: ['Mesures'], zeilen: [['ISA/Atelier'], ['ISA,Atelier'], ['isa, atelier'], ['ISA + Atelier'], ['ISA et atelier'], ['Logo']], nummern: [2, 3, 4, 5, 6, 7] }, ['mesures']));
  check('Spalte „Maßnahmen“: „ISA/Atelier“, „ISA,Atelier“, „isa, atelier“, „ISA + Atelier“, „ISA et atelier“ → ISA und Atelier; Unbekanntes wird gemeldet', teil.roh.slice(0, 5).every(s => s.mesures.join() === 'isa,atelier') &&
    teil.unbekannt.join() === 'Zeile 7: „Logo“' && teil.roh[5].autre_mesure === 'Logo', teil);
  await page.click('[data-db="import-weg"]'); await warte(100);
  await page.setInputFiles('#db-datei', XLSX);
  await page.waitForSelector('.db-vorschau .db-spzutab', { timeout: 20000 });
  check('Zweiter Durchlauf: nichts neu – 4 vorhanden (Max: gleicher Name, beide ohne Geburtsdatum)', await kpi('imp-neu') === '0' && await kpi('imp-vorhanden') === '4' && (await text('.db-imptab')).includes('beide ohne Geburtsdatum'), [await kpi('imp-neu'), await kpi('imp-vorhanden')]);
  await page.check('input[data-db-imp="modus"][value="ergaenzen"]'); await warte(200);
  await page.click('[data-db="import-los"]'); await page.waitForSelector('.db-imp-ergebnis', { timeout: 60000 });
  const tom3 = (await page.evaluate(async () => (await CDSE_TEAM.alleDossiers(true)).map(d => ({ vor: d.person.vorname, r: CDSE_DATENBANK.datensatz(d), notiz: (d.db || {}).notiz })))).find(x => x.vor === 'Tom');
  check('Ergänzen aus Excel: Tom bekommt das Atelier (ab 03.11.2025) und ELDiB-Stufen, behält IQ 104 und Klasse C4.1', tom3.r.atelierArt === 'Atelier Lecture (fictif)' && tom3.r.atelierBeginn === '2025-11-03' && tom3.r.eldibVerhalten === 3 && tom3.r.iq === 104 && tom3.r.klasse === 'C4.1' && tom3.notiz === 'fiktiver Testfall', tom3.r);

  console.log('18) Reiterwechsel ohne Neuladen; was über die Fiche ins Dossier kommt, steht nach „Neu laden“ in der Datenbank');
  await page.evaluate(() => { window.__laden = 0; const T = window.CDSE_TEAM, alt = T.alleDossiers; T.alleDossiers = function () { window.__laden++; return alt.apply(this, arguments); }; });
  await db('tabelle'); await db('abfragen'); await db('');
  check('Reiterwechsel in der Datenbank lädt die Dossiers nicht jedes Mal neu (Stand der Daten oben rechts)', await page.evaluate(() => window.__laden) === 0 && /Stand der Daten: \d\d:\d\d Uhr/.test(await text('[data-db-geladen]')), await page.evaluate(() => window.__laden));
  await page.evaluate(async id => { const d = await CDSE_TEAM.dossier(id, true); await CDSE_TEAM.ops.fiche(id, { fiche: { ef: Object.assign({}, d.fiche.ef, { dr: '07 Dudelange' }) } }, 'Test: Direction geändert'); }, ids.noah);
  await page.click('[data-db="neu-laden"]');
  await page.waitForFunction(() => { const b = document.querySelector('[data-db="neu-laden"]'); return b && !b.disabled; }, null, { timeout: 20000 }); await warte(300);
  check('„Neu laden“ holt den neuesten Stand', await page.evaluate(() => window.__laden) === 1);
  const dr2 = Object.fromEntries(await balken('direction'));
  check('Direction von Noah geändert → Diagramm zeigt 07 Dudelange, 01 Luxembourg jetzt nur Luca', dr2['07 Dudelange'] === 1 && dr2['01, Luxembourg'] === 1 && await kpi('dossiers') === '14', dr2);
  const elB = Object.fromEntries(await balken('eldib'));
  check('Übersicht: ELDiB-Diagramm, sobald Stufen eingetragen sind (Verhalten Ø aus Nina 2 und Tom 3, dazu „erwartet“)', Math.abs(elB.Verhalten - 2.5) < 1e-9 && elB.erwartet > 0, elB);

  console.log('18b) Fiche ↔ Datenbank: alle Angaben der Fiche als Variablen, Karte im Reiter „Fiche“');
  const rund = await page.evaluate(async () => {
    const f = { person: { nachname: 'Rund', vorname: 'Test', geschlecht: 'w', geburtsdatum: '2016-01-01' },
      fiche: { datum: '2026-09-01', iam: 'IAM-TEST-1', strasse: '1, rue du Test', ort: 'L-7610 Larochette', progression: ['C1.1', 'C1.2', 'C2.1', 'C2.1'],
        depistage: { cl: 'Logopédie 2021', cdm: 'non', cdv: '' } } };
    const r = (await CDSE_FICHE.lesenAusBlob(await CDSE_FICHE.schreiben(f))).daten;
    /* Clôture und Schuljahr stehen nur in älteren Fichen (25-26) – direkt einsetzen */
    const ds = CDSE_DATENBANK.datensatz({ id: 'rund', person: Object.assign({}, f.person, r.person), fiche: Object.assign({}, r.fiche, { schuljahr: '2026-2027', cdse: { cloture: { aktiv: true, von: '2026-07-10' } } }) });
    const q = {}; CDSE_DATENBANK.felder.forEach(x => { q[x.key] = x.quelle; });
    return { ds, q };
  });
  check('Neue Variablen aus der Fiche (über die Word-Vorlage): IAM, Wohnort ohne PLZ, Schullaufbahn, Dépistage, Clôture, Schuljahr',
    rund.ds.iam === 'IAM-TEST-1' && rund.ds.wohnort === 'Larochette' && rund.ds.laufbahn === 'C1.1 → C1.2 → C2.1 → C2.1' && JSON.stringify(rund.ds.depistage) === '["CL"]' &&
    rund.ds.cloture === '2026-07-10' && rund.ds.ficheSchuljahr === '2026-2027', rund.ds);
  check('Jede Variable kennt ihre Herkunft (Fiche, Datenbank, beides, Dossier)', rund.q.direction === 'fiche' && rund.q.iq === 'db' && rund.q.sorgerecht === 'beide' && rund.q.eintraege === 'dossier' && Object.values(rund.q).every(Boolean), rund.q);
  await gehe('#/schueler/' + ids.noah); await page.waitForSelector('.ar-tabs [data-tab="fiche"]', { timeout: 20000 });
  await page.click('.ar-tabs [data-tab="fiche"]'); await page.waitForSelector('.db-fv', { timeout: 10000 });
  const fehlt1 = await page.$$eval('.db-fv-liste li', l => l.map(x => x.textContent.trim()));
  check('Reiter „Fiche“ (Responsable): Karte „In der Datenbank“ mit fehlenden Kernangaben (Matricule, Nationalität)', (await text('.db-fv h2')) === 'In der Datenbank' && fehlt1.join('|') === 'Matricule|Nationalität', fehlt1);
  check('Karte: noch keine eigenen Datenbank-Angaben', (await text('.db-fv')).includes('Noch keine.'));
  await page.locator('.db-fv').scrollIntoViewIfNeeded(); await page.locator('.db-fv').screenshot({ path: path.join(OUT, 'db8-fiche-karte.png') });
  await page.click('.db-fv [data-ar="db-angaben"]'); await page.waitForSelector('dialog.ar-dialog input[name="iq"]');
  await page.fill('dialog.ar-dialog input[name="iq"]', '99'); await dialogKnopf('Speichern');
  await page.waitForFunction(() => !document.querySelector('dialog.ar-dialog'), null, { timeout: 20000 }); await page.waitForSelector('.db-fv'); await warte(200);
  check('Datenbank-Angaben direkt aus dem Dossier: IQ gespeichert, Karte zeigt „1 eigene Angabe · IQ“', /1\s*eigene Angabe/.test(await text('.db-fv')) && (await text('.db-fv')).includes('IQ') &&
    (await page.evaluate(async id => (await CDSE_TEAM.dossier(id, true)).db.iq, ids.noah)) === 99);
  await page.click('.db-fv [data-ar="db-angaben"]'); await page.waitForSelector('dialog.ar-dialog input[name="cc_CDI"]');
  check('Datenbank-Angaben: sieben Kompetenzzentren zum Ankreuzen und ELDiB-Stufen', (await page.$$('dialog.ar-dialog .db-ccliste input[type=checkbox]')).length === 7 && await page.isVisible('dialog.ar-dialog select[name="el_verhalten"]'));
  await page.check('dialog.ar-dialog input[name="cc_CDI"]'); await page.fill('dialog.ar-dialog input[name="cc_weitere"]', 'Service Test (fictif)');
  await page.selectOption('dialog.ar-dialog select[name="el_verhalten"]', '2'); await dialogKnopf('Speichern'); await warte(200);
  check('ELDiB-Stufe ohne Datum wird abgelehnt (ohne Datum kein Vergleich mit dem Alter)', (await text('dialog.ar-dialog .ar-dialog-fehler')).includes('Datum der ELDiB-Einschätzung'), await text('dialog.ar-dialog .ar-dialog-fehler'));
  await page.selectOption('dialog.ar-dialog select[name="el_verhalten"]', '');
  await page.fill('dialog.ar-dialog input[name="el_datum"]', '2026-06-01'); await dialogKnopf('Speichern'); await warte(200);
  check('ELDiB-Datum ohne Stufe wird abgelehnt', (await text('dialog.ar-dialog .ar-dialog-fehler')).includes('Stufe'));
  await page.selectOption('dialog.ar-dialog select[name="el_verhalten"]', '2'); await page.selectOption('dialog.ar-dialog select[name="el_kognition"]', '4');
  await dialogKnopf('Speichern');
  await page.waitForFunction(() => !document.querySelector('dialog.ar-dialog'), null, { timeout: 20000 }); await page.waitForSelector('.db-fv'); await warte(200);
  const noahDb = await page.evaluate(async id => { const d = await CDSE_TEAM.dossier(id, true); return { db: d.db, r: CDSE_DATENBANK.datensatz(d), v: d.verlauf.map(x => x.t) }; }, ids.noah);
  check('Gespeichert: CC „CDI; Service Test (fictif)“, ELDiB aus der Datenbank (V 2, KOG 4; mit 10 Jahren erwartet 4 → Verhalten darunter)', noahDb.db.autreCc === 'CDI; Service Test (fictif)' && JSON.stringify(noahDb.r.autreCc) === '["CDI","Service Test (fictif)"]' &&
    noahDb.r.eldibHerkunft === 'Datenbank-Angabe' && noahDb.r.eldibVerhalten === 2 && noahDb.r.eldibKognition === 4 && noahDb.r.eldibErwartet === 4 && JSON.stringify(noahDb.r.eldibUnter) === '["Verhalten"]' && noahDb.v.some(t => /andere Kompetenzzentren, ELDiB-Stufen/.test(t)), noahDb);
  const elD = await page.evaluate(() => {
    if (typeof ELDIB_BANK === 'undefined') return null;
    const B = ELDIB_BANK.bereiche, code = (b, st) => B[b].stufen[st].items[0].code, sel = {};
    sel[code('verhalten', 1)] = 'e'; sel[code('verhalten', 2)] = 'e'; sel[code('kommunikation', 1)] = 'e'; sel[code('sozialisation', 1)] = 'n';
    return CDSE_DATENBANK.datensatz({ id: 'eldib-test-1', rev: 1, person: { nachname: 'Test', vorname: 'Eldib', geburtsdatum: '2016-01-10' },
      profil: { eldib: { einschaetzungen: [{ nr: 1, datum: '2026-09-01', sel, ziele: {}, zusatz: {}, notizen: {} }] } }, db: { eldibStufen: { datum: '2025-01-01', verhalten: 5, kommunikation: 5 } } });
  });
  check('ELDiB aus der Einschätzung im Dossier geht vor: V 2, K 1, SOZ 0, KOG –, erwartet 4, drei Bereiche darunter', elD && elD.eldibHerkunft === 'Einschätzung im Dossier' && elD.eldibVerhalten === 2 && elD.eldibKommunikation === 1 && elD.eldibSozialisation === 0 &&
    elD.eldibKognition === null && elD.eldibErwartet === 4 && elD.eldibDatum === '2026-09-01' && elD.eldibMin === 0 && JSON.stringify(elD.eldibUnter) === '["Verhalten","Kommunikation","Sozialisation"]', elD);
  await page.click('.db-fv-liste button:has-text("Nationalität")'); await page.waitForSelector('dialog.ar-dialog input[name="f.nationalitaet"]');
  await page.fill('dialog.ar-dialog input[name="f.nationalitaet"]', 'française'); await dialogKnopf('Speichern');
  await page.waitForFunction(() => !document.querySelector('dialog.ar-dialog'), null, { timeout: 20000 }); await page.waitForSelector('.db-fv'); await warte(200);
  const fehlt2 = await page.$$eval('.db-fv-liste li', l => l.map(x => x.textContent.trim()));
  check('Fehlende Angabe über die Karte in der Fiche ergänzt → nur noch Matricule fehlt', fehlt2.join('|') === 'Matricule', fehlt2);
  await page.click('.db-fv [data-ar="db-zeigen"]'); await page.waitForSelector('dialog.db-blatt[open]', { timeout: 20000 }); await warte(200);
  const blattN = await text('dialog.db-blatt');
  check('„In der Datenbank ansehen“ öffnet die Tabelle mit dem Seitenblatt (Nationalität und IQ schon da)', await page.evaluate(() => location.hash) === '#/datenbank/tabelle' && blattN.includes('TEST Noah') && blattN.includes('française') && /IQ\s*99/.test(blattN), blattN.slice(0, 160));
  check('Seitenblatt: jede Gruppe zeigt, woher die Werte kommen (Fiche / Datenbank-Angaben)', await page.isVisible('dialog.db-blatt .db-blatt-teil:has(h3:text-is("Person")) [data-db-b="fiche"]') &&
    await page.isVisible('dialog.db-blatt .db-blatt-teil:has(h3:text-is("Klinisches Profil")) [data-db-b="db"]') && !(await page.isVisible('dialog.db-blatt .db-blatt-teil:has(h3:text-is("Entwicklung und Dossier")) .db-blatt-wo button')));
  await page.click('dialog.db-blatt .db-blatt-teil:has(h3:text-is("Person")) [data-db-b="fiche"]'); await page.waitForSelector('.ar-tabs [data-tab="fiche"].on', { timeout: 20000 });
  check('Vom Seitenblatt zurück in den Reiter „Fiche“ des Dossiers', (await text('.ar-dkopf h1')).includes('TEST Noah') && await page.isVisible('.db-fv'));

  console.log('18c) Export „ohne Namen“, Datei noch in Excel offen, Abfrage-Ergebnis kopieren und als CSV, Import mit „Ende der Begleitung“');
  await db('tabelle'); await page.waitForSelector('.db-tab');
  await page.evaluate(() => { window.__export = null; window.showSaveFilePicker = async (opt) => ({ createWritable: async () => ({ write: async (b) => { window.__export = { name: opt.suggestedName, text: new TextDecoder('utf-8', { ignoreBOM: true }).decode(new Uint8Array(await b.arrayBuffer())) }; }, close: async () => {} }) }); });
  await page.click('[data-db="export"]'); await page.waitForSelector('dialog.ar-dialog input[name="namen"][value="ohne"]');
  await page.check('dialog.ar-dialog input[name="namen"][value="ohne"]'); await page.check('dialog.ar-dialog input[name="gelesen"]'); await dialogKnopf('Datei speichern');
  await page.waitForFunction(() => window.__export, null, { timeout: 10000 });
  const ohneN = await page.evaluate(() => window.__export), kopfOhne = csvZeilen(ohneN.text)[0];
  check('Export „ohne Namen“: ohne Name, Matricule, M-Files, IAM und Geburtsdatum – mit Geburtsjahr; Dateiname mit Uhrzeit und Auswahl', !kopfOhne.includes('Nachname') && !kopfOhne.includes('Vorname') && !kopfOhne.includes('Matricule') && !kopfOhne.includes('Geburtsdatum') &&
    !kopfOhne.includes('Dossier M-Files') && !kopfOhne.includes('Identité IAM') && kopfOhne.includes('Geburtsjahr') && !ohneN.text.includes('2014031000012') && !ohneN.text.includes('MF-1001') &&
    /^cdse-datenbank-\d{4}-\d{2}-\d{2}-\d{4}-alle-ohne-namen\.csv$/.test(ohneN.name), [ohneN.name, kopfOhne.slice(0, 6)]);
  await page.evaluate(() => { window.showSaveFilePicker = async () => ({ createWritable: async () => { throw new DOMException('The file could not be modified.', 'NoModificationAllowedError'); } }); });
  await page.click('[data-db="export"]'); await page.waitForSelector('dialog.ar-dialog input[name="gelesen"]');
  await page.check('dialog.ar-dialog input[name="gelesen"]'); await dialogKnopf('Datei speichern');
  await page.waitForFunction(() => { const f = document.querySelector('dialog.ar-dialog .ar-dialog-fehler'); return f && !f.hidden && f.textContent; }, null, { timeout: 10000 });
  check('Datei noch in Excel geöffnet: verständliche Meldung statt Fehler des Browsers', (await text('dialog.ar-dialog .ar-dialog-fehler')).includes('vermutlich noch in Excel geöffnet'), await text('dialog.ar-dialog .ar-dialog-fehler'));
  await dialogKnopf('Abbrechen'); await warte(150);
  await page.evaluate(() => { window.showSaveFilePicker = undefined; });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  await db('abfragen'); await page.waitForSelector('#db-bau');
  await page.click('[data-db-vorlage="beschulung"]'); await warte(200);
  check('Vorlage „Spezialisierte Beschulung“ zählt nur laufende Annexe, CdP oder CST', (await text('#db-satz')).includes('mit Annexe, CdP oder CST'), await text('#db-satz'));
  await page.click('[data-db-vorlage="stelle"]'); await warte(200);
  await page.click('[data-db="erg-kopieren"]'); await warte(300);
  const zwischen = await page.evaluate(() => navigator.clipboard.readText().catch(e => 'Fehler: ' + e.message));
  check('Ergebnis „Tabelle kopieren“: Tabulator-getrennt für Excel (Abfrage, Stand, Stelle, Dossiers, Anteil, Gesamt)', zwischen.includes('Abfrage: Anzahl der Schüler, gruppiert nach Stelle.') && zwischen.includes('Stelle\tDossiers\tAnteil (%)') && /\r\nGesamt\t\d+\t100/.test(zwischen), zwischen.slice(0, 240));
  const [dlErg] = await Promise.all([page.waitForEvent('download'), page.click('[data-db="erg-csv"]')]);
  const ergCsv = fs.readFileSync(await dlErg.path(), 'utf8');
  check('Ergebnis „Als CSV“: Semikolon, mit Abfrage und Stand, Dateiname cdse-abfrage-JJJJ-MM-TT-hhmm-alle.csv', /^cdse-abfrage-\d{4}-\d{2}-\d{2}-\d{4}-alle\.csv$/.test(dlErg.suggestedFilename()) && ergCsv.includes('Stelle;Dossiers;Anteil (%)') && ergCsv.includes('Abfrage: Anzahl der Schüler, gruppiert nach Stelle.') && ergCsv.includes('Stand '), [dlErg.suggestedFilename(), ergCsv.slice(0, 200)]);
  await db('import');
  const ENDE = ['Nom et prénom;Date de naissance;Début ISA;Fin de prise en charge', 'ALT Theo;03.03.2012;01.10.2019;30.06.2021', 'NEU Kim;04.04.2016;;'].join('\r\n') + '\r\n';
  await page.setInputFiles('#db-datei', { name: 'alte-faelle.csv', mimeType: 'text/csv', buffer: Buffer.from(ENDE, 'utf8') });
  await page.waitForSelector('.db-vorschau .db-spzutab', { timeout: 20000 });
  check('Import-Ziel „Ende der Begleitung“ erkannt; Vorschau „inaktiv ab 30.06.2021“ und Hinweis auf fehlenden Beginn (Kim)', await page.inputValue('select[data-db-imp="spalte"][data-sp="3"]') === 'date_fin' &&
    (await text('.db-imp-neu:has-text("ALT Theo")')).includes('inaktiv ab 30.06.2021') && (await text('.db-vorschau')).includes('kein Datum für den Beginn der Begleitung'), (await text('.db-imptab')).slice(0, 300));
  await page.click('[data-db="import-los"]'); await page.waitForSelector('.db-imp-ergebnis', { timeout: 60000 });
  const alt2 = await page.evaluate(async () => (await CDSE_TEAM.alleDossiers(true)).filter(d => d.person.nachname === 'ALT' || d.person.nachname === 'NEU').map(d => ({ name: d.person.nachname, status: d.status, seit: d.statusSeit, v: d.verlauf.map(x => x.t), r: CDSE_DATENBANK.datensatz(d) })));
  const theo = alt2.find(x => x.name === 'ALT') || {}, kim = alt2.find(x => x.name === 'NEU') || {};
  check('„Ende der Begleitung“: Theo inaktiv seit 30.06.2021, Beginn = Beginn der ISA (01.10.2019), keine laufende Maßnahme', theo.status === 'inaktiv' && theo.seit === '2021-06-30' && theo.r && theo.r.beginn === '2019-10-01' && theo.r.massnahmen.length === 0 && theo.v.some(t => /Inaktiv gesetzt/.test(t)), theo);
  check('Ohne Datum: Kim aktiv, Beginn unbekannt – zählt nicht als „neu“ im Schuljahr des Imports', kim.status === 'aktiv' && kim.r && kim.r.beginn === '' && kim.v.length === 2, kim);

  console.log('19) Handy (390 px)');
  await page.setViewportSize({ width: 390, height: 844 }); await warte(300);
  await db(''); await warte(200);
  q = await querScroll(); check('390 px: Übersicht ohne waagrechtes Scrollen', ohneQuer(q), q);
  const w390 = await page.$eval('.db-dg[data-dg="stelle"] svg', s => s.getAttribute('width'));
  check('390 px: Diagramme auf die Breite gezeichnet (SVG ' + w390 + ' px)', +w390 <= 360 && +w390 >= 240, w390);
  await bild('db5-mobil-uebersicht.png');
  await db('tabelle'); await page.waitForSelector('.db-tab');
  q = await querScroll(); check('390 px: Tabelle als Karten, ohne waagrechtes Scrollen', ohneQuer(q) && await page.evaluate(() => getComputedStyle(document.querySelector('.db-tab thead')).display === 'none' && document.querySelector('.db-tabrahmen').scrollWidth <= document.querySelector('.db-tabrahmen').clientWidth + 1), q);
  await bild('db6-mobil-tabelle.png');
  await page.click('tr[data-id="' + ids.mila + '"] .db-name'); await page.waitForSelector('dialog.db-blatt[open]'); await warte(200);
  q = await querScroll(); check('390 px: Seitenblatt passt', ohneQuer(q) && await page.evaluate(() => { const d = document.querySelector('dialog.db-blatt'); return d.getBoundingClientRect().width <= 390; }), q);
  await page.keyboard.press('Escape'); await warte(150);
  await db('abfragen'); await page.waitForSelector('#db-bau');
  await page.click('[data-db-vorlage="dr"]'); await warte(200);
  q = await querScroll(); check('390 px: Abfragen ohne waagrechtes Scrollen', ohneQuer(q), q);
  await bild('db7-mobil-abfragen.png');
  await db('import');
  await page.setInputFiles('#db-datei', { name: 'stats.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(STATS)) });
  await page.waitForSelector('.db-vorschau', { timeout: 20000 });
  q = await querScroll(); check('390 px: Import-Vorschau ohne waagrechtes Scrollen', ohneQuer(q), q);
  await page.setViewportSize({ width: 1280, height: 900 });

  console.log('20) Pro Person: Mia (Verwaltung) sieht ihre eigenen Spalten, nicht Leas');
  await abmelden(); await anmelden('Mia Muster', 'ein sicheres Passwort 1');
  await db('tabelle'); await page.waitForSelector('.db-tab');
  const kopfMia = await page.$$eval('.db-tab thead th', l => l.map(x => x.textContent.replace(/[▲▼]/g, '').trim()));
  check('Verwaltung hat Zugang; Standardspalten (Leas Auswahl gehört Lea)', kopfMia.includes('Schule') && !kopfMia.includes('IQ'), kopfMia.join('|'));
  check('Mias Protokoll ist leer (je Person)', await page.evaluate(() => { const l = JSON.parse(localStorage.getItem('cdse-db-protokoll-v1') || '[]'); return !l.some(e => e.name === 'Lea Beispiel'); }));

  console.log('21) Mitarbeiter: Reiter „Fiche“ ohne Datenbank-Karte');
  await abmelden(); await anmelden('Paul Probe', 'drittes Passwort 333');
  await gehe('#/schueler/' + ids.ben); await page.waitForSelector('.ar-tabs [data-tab="fiche"]', { timeout: 20000 });
  await page.click('.ar-tabs [data-tab="fiche"]'); await page.waitForSelector('.ar-fkopf'); await warte(200);
  check('Mitarbeiter: Fiche sichtbar, aber keine Karte „In der Datenbank“', await page.isVisible('.ar-fkopf') && !(await page.$('.db-fv')));
  check('Modul prüft selbst: ficheKarte() gibt Mitarbeitern nichts', await page.evaluate(() => CDSE_DATENBANK.ficheKarte({ id: 'x', fiche: {} }, {}) === ''));

  check('Keine Fehler in der Konsole', errors.length === 0, errors.slice(0, 5).join(' | '));
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler  (' + Math.round((Date.now() - t0) / 1000) + ' s, Bilder in ' + OUT + ')');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
