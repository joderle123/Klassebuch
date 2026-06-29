import { useMemo, useState, type ReactNode } from 'react'
import { allMaterials } from '../data/materials'
import { applyFilters, emptyFilter, type FilterState } from '../lib/filter'
import type { AgeLevel, Material, MaterialType } from '../types/material'
import { ageColors } from '../lib/ui'
import { StarRating } from './StarRating'

// Friendly "Anliegen" buckets that map to one or more taxonomy theme ids.
const ANLIEGEN: { label: string; themes: string[] }[] = [
  { label: '😊 Gefühle & Wut', themes: ['emotionen', 'impulskontrolle', 'stressbewaeltigung', 'achtsamkeit'] },
  { label: '🤝 Streit & Miteinander', themes: ['konfliktloesung', 'kooperation', 'kommunikation', 'beziehungsaufbau'] },
  { label: '💪 Selbstvertrauen & Ich', themes: ['selbstwertgefuehl', 'selbstwahrnehmung', 'identitaet', 'resilienz', 'ressourcen'] },
  { label: '⚖️ Fairness, Grenzen & Mobbing', themes: ['mobbing', 'gerechtigkeit', 'grenzen', 'gewalt', 'fremdwahrnehmung'] },
  { label: '🎯 Konzentration & Motivation', themes: ['disziplin', 'motivation'] },
  { label: '📱 Medien', themes: ['medien'] },
  { label: '🎨 Spiel, Bewegung & Kreativität', themes: ['spiel-spass', 'bewegung', 'kreativitaet'] },
  { label: '🌱 ETEP-Rituale & Aufklärung', themes: ['etep-epu', 'sexualitaet'] },
]
const AGES: { id: AgeLevel; label: string }[] = [
  { id: 'C1', label: 'C1 · Précoce/Spillschoul' },
  { id: 'C2', label: 'C2' },
  { id: 'C3', label: 'C3' },
  { id: 'C4', label: 'C4' },
  { id: 'ES', label: 'ES · Sekundar' },
]
const FORMATS: { id: MaterialType; label: string }[] = [
  { id: 'Aktivitéit', label: '⚡ Kurze Aktivität' },
  { id: 'ganz Stonn', label: '🕐 Ganze Stunde' },
  { id: 'Projet', label: '📅 Projekt' },
]

interface Sel {
  themes: string[]
  age: AgeLevel | null
  type: MaterialType | null
  ws: boolean
}
const INIT: Sel = { themes: [], age: null, type: null, ws: false }
const QUESTIONS = [
  'Worum geht es? Wobei brauchst du Material?',
  'Für welche Altersstufe?',
  'Wie viel Zeit hast du?',
  'Brauchst du ein druckbares Arbeitsblatt?',
]

interface Props {
  onClose: () => void
  onApply: (f: FilterState) => void
  onOpen: (m: Material) => void
  onDownload: (m: Material) => void
  downloadingId: string | null
  ratings: Record<string, number>
}

function ChoiceButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-isa-blue-deep hover:text-isa-blue-deep hover:shadow-sm"
    >
      {children}
    </button>
  )
}

export function FinderAssistant({ onClose, onApply, onOpen, onDownload, downloadingId, ratings }: Props) {
  const [step, setStep] = useState(0)
  const [sel, setSel] = useState<Sel>(INIT)
  const [path, setPath] = useState<string[]>([])

  const filter: FilterState = useMemo(
    () => ({
      ...emptyFilter,
      themes: sel.themes,
      ageLevels: sel.age ? [sel.age] : [],
      types: sel.type ? [sel.type] : [],
      hasWorksheet: sel.ws,
    }),
    [sel],
  )
  const results = useMemo(
    () =>
      [...applyFilters(allMaterials, filter)].sort(
        (a, b) => (ratings[b.id] || 0) - (ratings[a.id] || 0),
      ),
    [filter, ratings],
  )

  function answer(label: string, partial: Partial<Sel>) {
    setSel((s) => ({ ...s, ...partial }))
    setPath((p) => [...p.slice(0, step), label])
    setStep((s) => s + 1)
  }
  function back() {
    setStep((s) => Math.max(0, s - 1))
    setPath((p) => p.slice(0, -1))
  }
  function restart() {
    setStep(0)
    setSel(INIT)
    setPath([])
  }

  const atResults = step >= QUESTIONS.length

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div
        className="my-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-isa-blue-deep text-lg">
              ✨
            </div>
            <div>
              <div className="font-bold text-slate-800">Material-Finder</div>
              <div className="text-xs text-slate-400">
                Beantworte ein paar Fragen — ich finde passende Materialien
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Schließen"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Chosen-answers recap */}
          {path.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {path.map((p, i) => (
                <span
                  key={i}
                  className="rounded-full bg-isa-blue/60 px-2.5 py-0.5 text-xs text-isa-blue-deep"
                >
                  {p}
                </span>
              ))}
            </div>
          )}

          {!atResults ? (
            <>
              {/* Live count */}
              <div className="text-xs text-slate-400">
                Aktuell <span className="font-semibold text-slate-600">{results.length}</span> passende
                Materialien · Frage {step + 1} von {QUESTIONS.length}
              </div>
              {/* Question */}
              <div className="text-base font-semibold text-slate-800">{QUESTIONS[step]}</div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {step === 0 &&
                  ANLIEGEN.map((a) => (
                    <ChoiceButton key={a.label} onClick={() => answer(a.label, { themes: a.themes })}>
                      {a.label}
                    </ChoiceButton>
                  ))}
                {step === 1 &&
                  AGES.map((a) => (
                    <ChoiceButton key={a.id} onClick={() => answer(`Stufe ${a.id}`, { age: a.id })}>
                      {a.label}
                    </ChoiceButton>
                  ))}
                {step === 2 &&
                  FORMATS.map((f) => (
                    <ChoiceButton key={f.id} onClick={() => answer(f.label, { type: f.id })}>
                      {f.label}
                    </ChoiceButton>
                  ))}
                {step === 3 && (
                  <>
                    <ChoiceButton onClick={() => answer('Mit Arbeitsblatt', { ws: true })}>
                      📄 Ja, mit Arbeitsblatt
                    </ChoiceButton>
                    <ChoiceButton onClick={() => answer('Arbeitsblatt egal', { ws: false })}>
                      Egal
                    </ChoiceButton>
                  </>
                )}
              </div>

              {/* Skip / back */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={back}
                  disabled={step === 0}
                  className="text-xs font-medium text-slate-400 hover:text-slate-600 disabled:opacity-0"
                >
                  ← zurück
                </button>
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => answer('—', {})}
                    className="text-xs font-medium text-slate-400 hover:text-slate-600"
                  >
                    überspringen
                  </button>
                )}
              </div>
            </>
          ) : (
            /* ---------------- Results ---------------- */
            <>
              <div className="text-base font-semibold text-slate-800">
                {results.length > 0
                  ? `Ich habe ${results.length} passende Materialien gefunden 🎉`
                  : 'Keine Treffer — lockere eine Frage.'}
              </div>

              {results.length > 0 && (
                <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
                  {results.slice(0, 30).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-slate-300"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-800">{m.title}</span>
                          {m.worksheet && (
                            <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-100">
                              + AB
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {m.ageLevels.map((a) => (
                            <span key={a} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${ageColors[a]}`}>
                              {a}
                            </span>
                          ))}
                          <StarRating value={ratings[m.id] || 0} size={12} readOnly />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpen(m)}
                        className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-isa-blue-deep hover:bg-isa-blue/40"
                      >
                        Öffnen
                      </button>
                      <button
                        type="button"
                        onClick={() => onDownload(m)}
                        disabled={downloadingId === m.id}
                        className="shrink-0 rounded-lg bg-isa-blue-deep px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#264a82] disabled:opacity-50"
                      >
                        {downloadingId === m.id ? '…' : 'PDF'}
                      </button>
                    </div>
                  ))}
                  {results.length > 30 && (
                    <div className="px-1 pt-1 text-xs text-slate-400">
                      … und {results.length - 30} weitere — „Alle anzeigen" für die volle Liste.
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={restart}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  ↻ Neu starten
                </button>
                {results.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onApply(filter)}
                    className="rounded-lg bg-isa-blue-deep px-4 py-2 text-sm font-semibold text-white hover:bg-[#264a82]"
                  >
                    Alle {results.length} in der Liste anzeigen
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
