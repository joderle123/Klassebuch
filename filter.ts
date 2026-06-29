import type {
  AgeLevel,
  EldibDomain,
  EtepStufe,
  Language,
  Material,
  MaterialType,
  ParticipantMode,
} from '../types/material'
import { eldibGoalById } from '../data/taxonomy'

/** Provenance value of a material. */
export type MaterialSource = Material['source']

export interface FilterState {
  search: string
  themes: string[]
  ageLevels: AgeLevel[]
  types: MaterialType[]
  participantModes: ParticipantMode[]
  etepStufen: EtepStufe[]
  eldibDomains: EldibDomain[]
  eldibGoals: string[]
  tags: string[]
  authors: string[]
  languages: Language[]
  sources: MaterialSource[]
  /** Only materials that ship a printable worksheet ("Arbeitsblatt"). */
  hasWorksheet: boolean
  /** Minimum star rating (0 = any). Applied in App — ratings live in localStorage. */
  minRating: number
  /** Only materials the user has not rated yet. */
  onlyUnrated: boolean
  /** Sort results best-rated first. */
  sortByRating: boolean
}

export const emptyFilter: FilterState = {
  search: '',
  themes: [],
  ageLevels: [],
  types: [],
  participantModes: [],
  etepStufen: [],
  eldibDomains: [],
  eldibGoals: [],
  tags: [],
  authors: [],
  languages: [],
  sources: [],
  hasWorksheet: false,
  minRating: 0,
  onlyUnrated: false,
  sortByRating: false,
}

const some = <T,>(selected: T[], values: T[]) =>
  selected.length === 0 || selected.some((v) => values.includes(v))

function matchesSearch(m: Material, q: string): boolean {
  if (!q) return true
  const hay = [
    m.title,
    m.author ?? '',
    m.shortDescription,
    m.tags.join(' '),
    m.remark ?? '',
    m.materialsNeeded ?? '',
    m.ablauf.map((a) => `${a.title ?? ''} ${a.text}`).join(' '),
  ]
    .join(' ')
    .toLowerCase()
  // every whitespace-separated token must appear (AND search)
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((tok) => hay.includes(tok))
}

export function matches(m: Material, f: FilterState): boolean {
  if (!matchesSearch(m, f.search)) return false
  if (!some(f.themes, m.themes)) return false
  if (!some(f.ageLevels, m.ageLevels)) return false
  if (!some(f.types, m.type)) return false
  if (!some(f.participantModes, m.participants.map((p) => p.mode))) return false
  if (!some(f.etepStufen, m.etepStufen)) return false
  if (f.eldibGoals.length && !f.eldibGoals.some((g) => m.eldibGoals.includes(g)))
    return false
  if (f.eldibDomains.length) {
    const domains = new Set(
      m.eldibGoals.map((id) => eldibGoalById.get(id)?.domain).filter(Boolean),
    )
    if (!f.eldibDomains.some((d) => domains.has(d))) return false
  }
  if (!some(f.tags, m.tags)) return false
  if (!some(f.authors, m.author ? [m.author] : [])) return false
  if (!some(f.languages, [m.language])) return false
  if (!some(f.sources, [m.source])) return false
  if (f.hasWorksheet && !m.worksheet) return false
  return true
}

export function applyFilters(materials: Material[], f: FilterState): Material[] {
  return materials.filter((m) => matches(m, f))
}

export function activeFilterCount(f: FilterState): number {
  return (
    (f.search ? 1 : 0) +
    f.themes.length +
    f.ageLevels.length +
    f.types.length +
    f.participantModes.length +
    f.etepStufen.length +
    f.eldibDomains.length +
    f.eldibGoals.length +
    f.tags.length +
    f.authors.length +
    f.languages.length +
    f.sources.length +
    (f.hasWorksheet ? 1 : 0) +
    (f.minRating > 0 ? 1 : 0) +
    (f.onlyUnrated ? 1 : 0)
  )
}

/** Unique, sorted tag list across a set of materials (for the tag facet). */
export function collectTags(materials: Material[]): string[] {
  const set = new Set<string>()
  for (const m of materials) for (const t of m.tags) set.add(t)
  return [...set].sort((a, b) => a.localeCompare(b, 'de'))
}

/** Unique, sorted author list (skips materials without an author). */
export function collectAuthors(materials: Material[]): string[] {
  const set = new Set<string>()
  for (const m of materials) if (m.author) set.add(m.author)
  return [...set].sort((a, b) => a.localeCompare(b, 'de'))
}
