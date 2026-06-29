import type { Material } from '../types/material'
import { materialTypeById, themeLabel } from '../data/taxonomy'
import { ageColors, truncate } from '../lib/ui'
import { StarRating } from './StarRating'
import { variantCount } from '../data/variants'

interface Props {
  material: Material
  onOpen: (m: Material) => void
  onDownload: (m: Material) => void
  downloading: boolean
  rating: number
  onRate: (n: number) => void
}

export function MaterialCard({ material: m, onOpen, onDownload, downloading, rating, onRate }: Props) {
  return (
    <article
      onClick={() => onOpen(m)}
      className="group flex cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-snug text-slate-800 group-hover:text-isa-blue-deep">
          {m.title}
        </h3>
        {m.source === 'generated' && (
          <span
            title="KI-Entwurf – vor Einsatz prüfen"
            className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600 ring-1 ring-indigo-100"
          >
            Entwurf
          </span>
        )}
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {m.ageLevels.map((a) => (
          <span
            key={a}
            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ${ageColors[a]}`}
          >
            {a}
          </span>
        ))}
        {m.type.map((t) => (
          <span
            key={t}
            className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600"
          >
            {materialTypeById.get(t)?.labelDe ?? t}
          </span>
        ))}
        {m.worksheet && (
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-100">
            + Arbeitsblatt
          </span>
        )}
        {variantCount(m.id) > 0 && (
          <span
            title="Wählbare Setting-Varianten (z.B. Piraten/Astronauten)"
            className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-600 ring-1 ring-indigo-100"
          >
            🎭 {variantCount(m.id)} Versionen
          </span>
        )}
      </div>

      <p className="mb-3 grow text-sm leading-relaxed text-slate-600">
        {truncate(m.shortDescription, 180)}
      </p>

      <div className="mb-3 flex flex-wrap gap-1">
        {m.themes.slice(0, 3).map((t) => (
          <span
            key={t}
            className="rounded-full bg-isa-blue/60 px-2 py-0.5 text-[11px] text-isa-blue-deep"
          >
            {themeLabel(t)}
          </span>
        ))}
      </div>

      <div className="mb-2 flex items-center gap-2">
        <StarRating value={rating} onChange={onRate} size={15} />
        {rating > 0 && <span className="text-[11px] text-slate-400">{rating}/5</span>}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="truncate text-xs text-slate-400">
          {m.author || 'ISA-App'}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDownload(m)
          }}
          disabled={downloading}
          className="inline-flex items-center gap-1 rounded-lg bg-isa-blue-deep px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#264a82] disabled:opacity-50"
        >
          {downloading ? 'Erstelle…' : 'PDF'}
        </button>
      </div>
    </article>
  )
}
