// ---------------------------------------------------------------------------
// Controlled vocabularies for the ISA materials.
//
// These mirror the fields of the original "ISA – Material" template:
//   Altersstuf · Typ · Participants · Themeberäich · ETEP-Stuf · ELDiB-Ziler
// ---------------------------------------------------------------------------

import type {
  AgeLevel,
  EldibDomain,
  EtepStufe,
  Language,
  MaterialType,
  ParticipantMode,
} from '../types/material'

export interface AgeLevelDef {
  id: AgeLevel
  label: string
  description: string
}

export const ageLevels: AgeLevelDef[] = [
  { id: 'C1', label: 'C1', description: 'Cycle 1 · Précoce/Spillschoul (≈ 3–5 J.)' },
  { id: 'C2', label: 'C2', description: 'Cycle 2 (≈ 6–7 J.)' },
  { id: 'C3', label: 'C3', description: 'Cycle 3 (≈ 8–9 J.)' },
  { id: 'C4', label: 'C4', description: 'Cycle 4 (≈ 10–11 J.)' },
  { id: 'ES', label: 'ES', description: 'Enseignement secondaire (≥ 12 J.)' },
]

export interface MaterialTypeDef {
  id: MaterialType
  labelDe: string
}

// German label = the term used in the live "ISA Toolbox" SharePoint list;
// the id (Luxembourgish) = the label printed on the PDF cover sheet.
export const materialTypes: MaterialTypeDef[] = [
  { id: 'Aktivitéit', labelDe: 'Aktivität' },
  { id: 'ganz Stonn', labelDe: 'Kursstunde' },
  { id: 'Projet', labelDe: 'Projekt' },
  { id: 'Hospi', labelDe: 'Hospitation' },
]

export interface ParticipantModeDef {
  id: ParticipantMode
  labelDe: string
}

export const participantModes: ParticipantModeDef[] = [
  { id: 'Individuel', labelDe: 'Individuell' },
  { id: 'Grupp', labelDe: 'Gruppe' },
  { id: 'Klass', labelDe: 'Klasse' },
]

export interface LanguageDef {
  id: Language
  labelDe: string
}

export const languages: LanguageDef[] = [
  { id: 'de', labelDe: 'Deutsch' },
  { id: 'lb', labelDe: 'Lëtzebuergesch' },
  { id: 'fr', labelDe: 'Français' },
  { id: 'en', labelDe: 'English' },
]

export interface SourceDef {
  id: 'original' | 'generated'
  labelDe: string
}

export const sources: SourceDef[] = [
  { id: 'original', labelDe: 'Original' },
  { id: 'generated', labelDe: 'KI-Entwurf' },
]

export interface ThemeDef {
  id: string
  label: string
}

/**
 * Theme areas ("Themeberäich") — the controlled vocabulary used in the live
 * "ISA Toolbox" SharePoint list (316 materials). Ordered by frequency.
 */
export const themes: ThemeDef[] = [
  { id: 'selbstwahrnehmung', label: 'Selbstwahrnehmung' },
  { id: 'kommunikation', label: 'Kommunikation' },
  { id: 'beziehungsaufbau', label: 'Beziehungsaufbau' },
  { id: 'kooperation', label: 'Kooperation' },
  { id: 'fremdwahrnehmung', label: 'Fremdwahrnehmung' },
  { id: 'achtsamkeit', label: 'Achtsamkeit' },
  { id: 'konfliktloesung', label: 'Konfliktlösung' },
  { id: 'bewegung', label: 'Bewegung' },
  { id: 'spiel-spass', label: 'Spiel & Spaß' },
  { id: 'resilienz', label: 'Resilienz' },
  { id: 'selbstwertgefuehl', label: 'Selbstwertgefühl' },
  { id: 'impulskontrolle', label: 'Impulskontrolle' },
  { id: 'emotionen', label: 'Emotionen' },
  { id: 'identitaet', label: 'Identität' },
  { id: 'stressbewaeltigung', label: 'Stressbewältigung' },
  { id: 'ressourcen', label: 'Ressourcen' },
  { id: 'kreativitaet', label: 'Kreativität' },
  { id: 'grenzen', label: 'Grenzen' },
  { id: 'disziplin', label: 'Disziplin' },
  { id: 'mobbing', label: 'Mobbing' },
  { id: 'motivation', label: 'Motivation' },
  { id: 'gerechtigkeit', label: 'Gerechtigkeit' },
  { id: 'gewalt', label: 'Gewalt' },
  { id: 'medien', label: 'Medien' },
  { id: 'sexualitaet', label: 'Sexualität' },
  { id: 'etep-epu', label: 'ETEP / EPU' },
  // Jugend-/Sekundar-Themen (ES) — Themenbereiche speziell für Jugendliche.
  { id: 'liebe-beziehungen', label: 'Liebe & Beziehungen' },
  { id: 'koerper-selbstbild', label: 'Körper & Selbstbild' },
  { id: 'psychische-gesundheit', label: 'Psychische Gesundheit' },
  { id: 'sucht-praevention', label: 'Sucht & Prävention' },
  { id: 'gruppendruck', label: 'Gruppendruck' },
  { id: 'diskriminierung-vielfalt', label: 'Vielfalt & Diskriminierung' },
  { id: 'demokratie-engagement', label: 'Demokratie & Engagement' },
  { id: 'zukunft-beruf', label: 'Zukunft & Beruf' },
  { id: 'geld-konsum', label: 'Geld & Konsum' },
]

export interface EtepStufeDef {
  id: EtepStufe
  label: string
  description: string
}

/** ETEP developmental stages (Entwicklungstherapie/-pädagogik). */
export const etepStufen: EtepStufeDef[] = [
  { id: 1, label: 'Stufe 1', description: 'Vertrauen aufbauen – mit Lust auf die Umwelt reagieren' },
  { id: 2, label: 'Stufe 2', description: 'Erfolgreich an der Umwelt teilnehmen' },
  { id: 3, label: 'Stufe 3', description: 'Fertigkeiten für eine erfolgreiche Gruppenteilnahme anwenden' },
  { id: 4, label: 'Stufe 4', description: 'Eigene Fertigkeiten in die Gruppe einbringen' },
  { id: 5, label: 'Stufe 5', description: 'Aus innerer Überzeugung verantwortlich handeln' },
]

export interface EldibDomainDef {
  id: EldibDomain
  label: string
  color: string
}

export const eldibDomains: EldibDomainDef[] = [
  { id: 'V', label: 'Verhalten', color: '#2f5597' },
  { id: 'K', label: 'Kommunikation', color: '#548235' },
  { id: 'SOZ', label: 'Sozialisation', color: '#bf8f00' },
  { id: 'KOG', label: 'Kognition', color: '#c55a11' },
]

export interface EldibGoal {
  id: string
  domain: EldibDomain
  label: string
}

// --- ELDiB goal catalogue (transcribed from the ISA template) ----------------

const V_LABELS = [
  'Wahrnehmung', 'Orientierung', 'Aufmerksamkeit', 'Motorische Reaktion',
  'Komplexe Reaktion', 'Selbsthilfe', 'Spielmaterial', 'Routineabläufe',
  'Spielerfahrung', 'Warten', 'Sitzen', 'Bewegung', 'Aktivitäten', 'Lob/Erfolg',
  'Beenden', 'Erwartungen', 'Begründungen', 'Alternativen', 'Gruppenwahl',
  'Zurückhalten', 'Kontrolle', 'Fortschritt', 'Flexibilität', 'Neue Erfahrungen',
  'Anwenden', 'Provokation', 'Verantwortung', 'Lösungsvorschläge', 'Gewohnheiten',
  'positive Rolle', 'Recht/Ordnung', 'Selbstverantwortung', 'Einsicht',
]

const K_LABELS = [
  'Laute', 'Sprecher', 'Verbaler Impuls', 'Wort-Annäherung', 'Wörter spontan',
  'Wörter Erwachsene', 'Wörter Peer', 'Wortreihung', 'Beantworten', 'Vokabular',
  'Wortsequenzen', 'Austausch – Erwachsene', 'Merkmale', 'Austausch – Kind',
  'Persönliches', 'Gefühlsreaktionen', 'Gespräche', 'Stolz – Ich',
  'Eigenschaften – Ich', 'Eigenschaften – Du', 'Gefühle – Du', 'Stolz – Wir',
  'Kreativität', 'Fortschritt', 'Beeinflussung', 'Gefühle – Ich', 'Beziehung',
  'Unterstützen', 'Relationen', 'Komplexe Aussagen', 'Ausgleich', 'Anerkennung',
  'Motive', 'Ideale', 'Erhalt / Pflege',
]

const SOZ_LABELS = [
  'Gegenwart', 'Gerichtetheit', 'Eigenname', 'Spiel – allein',
  'Nonverbale Interaktion', 'Kommen', 'Aufforderungen', 'Wörter Erwachsene',
  'Selbstbewusstsein', 'Spiel parallel', 'Wörter – Peer', 'Kontaktsuche',
  'Fantasie', 'Warten', 'Kontakt', 'Teilen', 'Spiel interaktiv', 'Kooperation',
  'Abwechseln', 'Nachahmen', 'Werten', 'Leiten', 'Vorschlag – Andere',
  'Erfahrungen', 'Vorliebe', 'Unterstützung', 'Gruppenregeln', 'Identifizieren',
  'Gruppenerfahrung', 'Gruppenaktivität', 'Verschiedenheit', 'Respekt',
  'Interesse', 'Lösungsvorschlag', 'Wertvorstellung', 'Schlussfolgerungen',
  'Empathie', 'verschiedene Rollen', 'Prinzipien', 'Selbstverständnis',
  'Interpersonalität',
]

const KOG_LABELS = [
  'Orientierung', 'Aufmerksamkeit', 'Kurzzeitgedächtnis', 'komplexe Reaktionen',
  'einfache Imitation', 'Motorik 18 Monate', 'Bezeichnung', 'Wort-Annäherung',
  'Wörter spontan', 'Form', 'Körperteile', 'Details', 'Sortieren',
  'Bilder benennen', 'Gebrauchswert', 'Körper – 3', 'Serie – identisch',
  'Feinmotorik – 3', 'Serie – anders', 'Gegenteile', 'Kategorisieren',
  'Zählen – 4', 'Farben', 'Alternation', 'Zählen – 10', 'Auge-Hand – 5',
  'Unterscheiden', 'Körper – 5', 'Objekte – 5', 'Gedächtnis', 'Bildserie',
  'Auge-Hand – 6', 'Körper – 6', 'Lesen – 50', 'Zahlen – 10', 'Schreiben – 50',
  'Verständnis', 'Erklären', 'Sinnentnahme', 'Plus/Minus – 9', 'Unlogik',
  'Antwortsätze', 'Sport-Spiele', 'Sätze frei', 'Numerische Konzepte',
  'Quantitativa', 'Sachverhalte', 'Operationen', 'Kommunikation',
  'Multiplikation/Division 100', 'Informationsgewinn', 'Geldmenge – 10€',
  'Fiktion', 'Grammatik', 'Wertvorstellungen', 'Konzepte', 'Zeitgeschichte',
  'Meinungen', 'Inkonsistenz', 'Textaufgaben', 'Einsicht', 'Bürger/in',
]

function build(domain: EldibDomain, labels: string[]): EldibGoal[] {
  return labels.map((label, i) => ({ id: `${domain}-${i + 1}`, domain, label }))
}

export const eldibGoals: EldibGoal[] = [
  ...build('V', V_LABELS),
  ...build('K', K_LABELS),
  ...build('SOZ', SOZ_LABELS),
  ...build('KOG', KOG_LABELS),
]

// --- Lookup helpers ----------------------------------------------------------

export const themeById = new Map(themes.map((t) => [t.id, t]))
export const eldibGoalById = new Map(eldibGoals.map((g) => [g.id, g]))
export const ageLevelById = new Map(ageLevels.map((a) => [a.id, a]))
export const materialTypeById = new Map(materialTypes.map((t) => [t.id, t]))
export const participantModeById = new Map(participantModes.map((p) => [p.id, p]))
export const languageById = new Map(languages.map((l) => [l.id, l]))
export const eldibDomainById = new Map(eldibDomains.map((d) => [d.id, d]))

export const themeLabel = (id: string) => themeById.get(id)?.label ?? id
export const eldibGoalsByDomain = (domain: EldibDomain) =>
  eldibGoals.filter((g) => g.domain === domain)

// --- ELDiB bands -------------------------------------------------------------
// The original grid is laid out in six horizontal bands (developmental
// groupings). Each band holds a contiguous range of goal numbers per domain.
// Rendering band-by-band keeps the 4-column grid faithful AND lets the PDF
// page-break cleanly between bands. Ranges are inclusive and verified to
// partition every domain exactly (V=33, K=35, SOZ=41, KOG=62).

export interface EldibBand {
  V: [number, number]
  K: [number, number]
  SOZ: [number, number]
  KOG: [number, number]
}

export const eldibBands: EldibBand[] = [
  { V: [1, 8], K: [1, 8], SOZ: [1, 12], KOG: [1, 14] },
  { V: [9, 12], K: [9, 12], SOZ: [13, 16], KOG: [15, 18] },
  { V: [13, 14], K: [13, 14], SOZ: [17, 18], KOG: [19, 31] },
  { V: [15, 21], K: [15, 22], SOZ: [19, 27], KOG: [32, 48] },
  { V: [22, 28], K: [23, 29], SOZ: [28, 36], KOG: [49, 56] },
  { V: [29, 33], K: [30, 35], SOZ: [37, 41], KOG: [57, 62] },
]

/** Goals of one domain within one band, in order. */
export function goalsInBand(band: EldibBand, domain: EldibDomain): EldibGoal[] {
  const [start, end] = band[domain]
  const out: EldibGoal[] = []
  for (let n = start; n <= end; n++) {
    const g = eldibGoalById.get(`${domain}-${n}`)
    if (g) out.push(g)
  }
  return out
}
