import { useState, type ReactNode } from 'react'
import type { FilterState } from '../lib/filter'
import { activeFilterCount } from '../lib/filter'
import type { EldibDomain } from '../types/material'
import { StarRating } from './StarRating'
import {
  ageLevels,
  eldibDomains,
  eldibGoals,
  etepStufen,
  languages,
  materialTypes,
  participantModes,
  sources,
  themes,
} from '../data/taxonomy'

interface Props {
  filter: FilterState
  update: (partial: Partial<FilterState>) => void
  reset: () => void
  total: number
  shown: number
  /** All distinct tags present in the library (for the tag facet). */
  allTags: string[]
  /** All distinct authors present in the library (for the author facet). */
  allAuthors: string[]
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition ${
        active
          ? 'bg-isa-blue-deep text-white ring-isa-blue-deep'
          : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300'
      }`}
    >
      {children}
    </button>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="border-b border-slate-100 py-3">
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {title}
      </h3>
      {children}
    </div>
  )
}

export function FilterPanel({ filter, update, reset, total, shown, allTags, allAuthors }: Props) {
  const [goalQuery, setGoalQuery] = useState('')
  const [goalDomain, setGoalDomain] = useState<EldibDomain>('V')
  const [tagQuery, setTagQuery] = useState('')

  function toggle<K extends keyof FilterState>(key: K, value: unknown) {
    const arr = filter[key] as unknown[]
    update({
      [key]: arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value],
    } as Partial<FilterState>)
  }

  const active = activeFilterCount(filter)
  // Browsable: with a query → search all domains; otherwise → list the
  // goals of the currently selected browse-domain (so the picker is never empty).
  const goalsToShow = goalQuery
    ? eldibGoals.filter((g) =>
        `${g.label} ${g.id}`.toLowerCase().includes(goalQuery.toLowerCase()),
      )
    : eldibGoals.filter((g) => g.domain === goalDomain)
  const filteredTags = tagQuery
    ? allTags.filter((t) => t.toLowerCase().includes(tagQuery.toLowerCase()))
    : allTags

  return (
    <aside className="flex flex-col">
      <div className="flex items-center justify-between pb-2">
        <div className="text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{shown}</span> von {total}
        </div>
        {active > 0 && (
          <button
            type="button"
            onClick={reset}
            className="text-xs font-medium text-isa-blue-deep hover:underline"
          >
            Zurücksetzen ({active})
          </button>
        )}
      </div>

      <div className="scroll-slim pr-1">
        <Section title="Arbeitsblatt">
          <Chip
            active={filter.hasWorksheet}
            onClick={() => update({ hasWorksheet: !filter.hasWorksheet })}
          >
            Nur mit Arbeitsblatt
          </Chip>
        </Section>

        <Section title="Bewertung">
          <div className="flex items-center gap-2">
            <StarRating
              value={filter.minRating}
              onChange={(n) => update({ minRating: n })}
              size={18}
            />
            <span className="text-xs text-slate-500">
              {filter.minRating ? `ab ${filter.minRating} ★` : 'alle'}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip
              active={filter.onlyUnrated}
              onClick={() => update({ onlyUnrated: !filter.onlyUnrated })}
            >
              nur unbewertete
            </Chip>
            <Chip
              active={filter.sortByRating}
              onClick={() => update({ sortByRating: !filter.sortByRating })}
            >
              Beste zuerst
            </Chip>
          </div>
        </Section>

        {allAuthors.length > 0 && (
          <Section title="Autor">
            <div className="space-y-1">
              {allAuthors.map((a) => (
                <label
                  key={a}
                  className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={filter.authors.includes(a)}
                    onChange={() => toggle('authors', a)}
                    className="accent-isa-blue-deep"
                  />
                  {a}
                </label>
              ))}
            </div>
          </Section>
        )}

        <Section title="Themenbereich">
          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
            {themes.map((t) => (
              <label
                key={t.id}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={filter.themes.includes(t.id)}
                  onChange={() => toggle('themes', t.id)}
                  className="accent-isa-blue-deep"
                />
                {t.label}
              </label>
            ))}
          </div>
        </Section>

        <Section title="Altersstufe">
          <div className="flex flex-wrap gap-1.5">
            {ageLevels.map((a) => (
              <Chip
                key={a.id}
                active={filter.ageLevels.includes(a.id)}
                onClick={() => toggle('ageLevels', a.id)}
              >
                {a.label}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Typ">
          <div className="flex flex-wrap gap-1.5">
            {materialTypes.map((t) => (
              <Chip
                key={t.id}
                active={filter.types.includes(t.id)}
                onClick={() => toggle('types', t.id)}
              >
                {t.labelDe}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Sozialform">
          <div className="flex flex-wrap gap-1.5">
            {participantModes.map((p) => (
              <Chip
                key={p.id}
                active={filter.participantModes.includes(p.id)}
                onClick={() => toggle('participantModes', p.id)}
              >
                {p.labelDe}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="ETEP-Stufe">
          <div className="flex flex-wrap gap-1.5">
            {etepStufen.map((e) => (
              <Chip
                key={e.id}
                active={filter.etepStufen.includes(e.id)}
                onClick={() => toggle('etepStufen', e.id)}
              >
                {e.label}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="ELDiB-Bereich">
          <div className="flex flex-wrap gap-1.5">
            {eldibDomains.map((d) => (
              <Chip
                key={d.id}
                active={filter.eldibDomains.includes(d.id)}
                onClick={() => toggle('eldibDomains', d.id)}
              >
                {d.label}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="ELDiB-Ziel">
          {/* Bereich antippen zum Durchblättern (oder unten suchen) */}
          <div className="mb-2 flex flex-wrap gap-1.5">
            {eldibDomains.map((d) => (
              <button
                key={d.id}
                type="button"
                title={d.label}
                onClick={() => {
                  setGoalDomain(d.id)
                  setGoalQuery('')
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition ${
                  !goalQuery && goalDomain === d.id
                    ? 'bg-isa-blue-deep text-white ring-isa-blue-deep'
                    : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300'
                }`}
              >
                {d.id}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={goalQuery}
            onChange={(e) => setGoalQuery(e.target.value)}
            placeholder="Ziel suchen (alle Bereiche)…"
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-isa-blue-deep"
          />
          {filter.eldibGoals.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {filter.eldibGoals.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle('eldibGoals', id)}
                  className="rounded-full bg-isa-blue-deep px-2 py-0.5 text-[11px] text-white"
                >
                  {id} ✕
                </button>
              ))}
            </div>
          )}
          <div className="mt-2 max-h-52 space-y-0.5 overflow-y-auto pr-1">
            {goalsToShow.map((g) => (
              <label
                key={g.id}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={filter.eldibGoals.includes(g.id)}
                  onChange={() => toggle('eldibGoals', g.id)}
                  className="accent-isa-blue-deep"
                />
                <span className="font-medium">{g.label}</span>
                <span className="text-slate-400">[{g.id}]</span>
              </label>
            ))}
            {goalsToShow.length === 0 && (
              <p className="px-1 py-2 text-xs text-slate-400">Kein Ziel gefunden.</p>
            )}
          </div>
        </Section>

        <Section title="Tags">
          <input
            type="search"
            value={tagQuery}
            onChange={(e) => setTagQuery(e.target.value)}
            placeholder="Tag suchen…"
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-isa-blue-deep"
          />
          {filter.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {filter.tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggle('tags', t)}
                  className="rounded-full bg-isa-blue-deep px-2 py-0.5 text-[11px] text-white"
                >
                  {t} ✕
                </button>
              ))}
            </div>
          )}
          {filteredTags.length > 0 && (
            <div className="mt-2 max-h-44 space-y-0.5 overflow-y-auto pr-1">
              {filteredTags.slice(0, 60).map((t) => (
                <label
                  key={t}
                  className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={filter.tags.includes(t)}
                    onChange={() => toggle('tags', t)}
                    className="accent-isa-blue-deep"
                  />
                  {t}
                </label>
              ))}
            </div>
          )}
        </Section>

        <Section title="Sprache">
          <div className="flex flex-wrap gap-1.5">
            {languages.map((l) => (
              <Chip
                key={l.id}
                active={filter.languages.includes(l.id)}
                onClick={() => toggle('languages', l.id)}
              >
                {l.labelDe}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Quelle">
          <div className="flex flex-wrap gap-1.5">
            {sources.map((s) => (
              <Chip
                key={s.id}
                active={filter.sources.includes(s.id)}
                onClick={() => toggle('sources', s.id)}
              >
                {s.labelDe}
              </Chip>
            ))}
          </div>
        </Section>
      </div>
    </aside>
  )
}
