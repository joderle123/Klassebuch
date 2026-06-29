// ---------------------------------------------------------------------------
// Setting-variants ("Einkleidungen") for narrative materials.
//
// The idea: one well-built activity (e.g. a cooperation game framed as an
// "island rescue") can be re-told in many settings (space, lava, arctic …)
// WITHOUT changing the pedagogy. Instead of storing N full copies, we store a
// small list of word-replacement pairs per setting and transform the base
// material on the fly. This keeps the 500-material library as the single
// source of truth and multiplies it into many printable versions — fully
// offline, no server, no AI at runtime.
//
// Only add variants where the swap genuinely makes sense (a narrative "skin"
// that doesn't touch the learning goals).
// ---------------------------------------------------------------------------

import type { Material } from '../types/material'
import generatedVariants from './variants.generated.json'

export interface VariantSetting {
  /** Chip label incl. emoji, e.g. "🚀 Weltall". */
  label: string
  /** One-line flavour shown under the chips. */
  description?: string
  /**
   * Re-skin pairs `[from, to]`. Matching is case-insensitive and the source
   * casing is preserved (TITLE → Title, ALL-CAPS → ALL-CAPS, lower → lower),
   * so author `to` in its natural (capitalised) German form.
   * Longer `from` strings win over shorter ones, so list stems freely.
   */
  replace: [string, string][]
}

export interface MaterialVariants {
  /** Label for the untouched original, e.g. "🏝️ Insel (Original)". */
  base: string
  settings: VariantSetting[]
}

// ---------------------------------------------------------------------------
// Demo set — two narrative materials, each with three extra settings.
// ---------------------------------------------------------------------------

// Hand-authored, carefully tuned variants. These take precedence over any
// AI-generated overlay for the same material id.
const manualVariants: Record<string, MaterialVariants> = {
  // Cooperation game: cross stepping-stones, leave no one behind.
  'inselrettung-nur-gemeinsam-ans-ufer': {
    base: '🏝️ Insel (Original)',
    settings: [
      {
        label: '🚀 Weltall',
        description: 'Havarierte Raumkapsel — alle müssen über treibende Plattformen zur Raumstation.',
        replace: [
          ['Inselrettung', 'Weltraumrettung'],
          ['Insel', 'Raumkapsel'],
          ['Trittsteinen', 'Plattformen'],
          ['Trittsteine', 'Plattformen'],
          ['Trittstein', 'Plattform'],
          ['Steinen', 'Plattformen'],
          ['Steine', 'Plattformen'],
          ['Stein', 'Plattform'],
          ['Wasser', 'Vakuum'],
          ['Ufer', 'Mutterschiff'],
          ['gestrandet', 'havariert'],
          ['Flut', 'Strahlung'],
          ['schwimmt weg', 'treibt davon'],
          ['schwimmende', 'davontreibende'],
        ],
      },
      {
        label: '🌋 Lava-Tal',
        description: 'Von der Felsplatte über glühende Felsbrocken aufs rettende Festland.',
        replace: [
          ['Inselrettung', 'Lavarettung'],
          ['Insel', 'Felsplatte'],
          ['Trittsteinen', 'Felsbrocken'],
          ['Trittsteine', 'Felsbrocken'],
          ['Trittstein', 'Felsbrocken'],
          ['Steinen', 'Brocken'],
          ['Steine', 'Brocken'],
          ['Stein', 'Brocken'],
          ['Wasser', 'Magma'],
          ['Ufer', 'Festland'],
          ['gestrandet', 'eingeschlossen'],
          ['Flut', 'Lava'],
          ['schwimmt weg', 'versinkt'],
          ['schwimmende', 'versinkende'],
        ],
      },
      {
        label: '🧊 Arktis',
        description: 'Auf treibenden Eisschollen übers Eismeer ans Festland — keiner fällt rein.',
        replace: [
          ['Inselrettung', 'Eisrettung'],
          ['Insel', 'Eisscholle'],
          ['Trittsteinen', 'Eisschollen'],
          ['Trittsteine', 'Eisschollen'],
          ['Trittstein', 'Eisscholle'],
          ['Steinen', 'Schollen'],
          ['Steine', 'Schollen'],
          ['Stein', 'Scholle'],
          ['Wasser', 'Eismeer'],
          ['Ufer', 'Festland'],
          ['schwimmt weg', 'treibt weg'],
          ['schwimmende', 'treibende'],
        ],
      },
      {
        label: '🐊 Krokodilfluss',
        description: 'Von der Sandbank über Baumstämme ans Festland — bloß nicht in den Krokodilfluss fallen.',
        replace: [
          ['Inselrettung', 'Krokodilrettung'],
          ['Insel', 'Sandbank'],
          ['Trittsteinen', 'Baumstämmen'],
          ['Trittsteine', 'Baumstämme'],
          ['Trittstein', 'Baumstamm'],
          ['Steinen', 'Stämmen'],
          ['Steine', 'Stämme'],
          ['Stein', 'Stamm'],
          ['Ufer', 'Festland'],
          ['Flut', 'Strömung'],
          ['schwimmt weg', 'treibt fort'],
          ['schwimmende', 'forttreibende'],
        ],
      },
      {
        label: '🐸 Moor',
        description: 'Über Holzstege durchs Moor — wer danebentritt, versinkt im tiefen Moor.',
        replace: [
          ['Inselrettung', 'Moorrettung'],
          ['Insel', 'Torfinsel'],
          ['Trittsteinen', 'Holzstegen'],
          ['Trittsteine', 'Holzstege'],
          ['Trittstein', 'Holzsteg'],
          ['Steinen', 'Stegen'],
          ['Steine', 'Stege'],
          ['Stein', 'Steg'],
          ['Wasser', 'Moor'],
          ['Ufer', 'Festland'],
          ['gestrandet', 'gefangen'],
          ['Flut', 'Nässe'],
          ['schwimmt weg', 'versinkt'],
          ['schwimmende', 'versinkende'],
        ],
      },
    ],
  },

  // Mindfulness/listening project — swap only the "costume", keep the listening.
  'lauschpiraten-auf-grosser-hoerfahrt': {
    base: '🏴‍☠️ Piraten (Original)',
    settings: [
      {
        label: '🚀 Astronauten',
        description: 'Lausch-Astronauten auf großer Hör-Mission durchs All.',
        replace: [
          ['Lauschpiraten', 'Lausch-Astronauten'],
          ['Piratensohlen', 'Astronautenstiefeln'],
          ['Piraten', 'Astronauten'],
          ['Hörfahrt', 'Hör-Mission'],
        ],
      },
      {
        label: '🦕 Urzeit-Forscher',
        description: 'Lausch-Forscher auf großer Hör-Expedition durch die Urzeit.',
        replace: [
          ['Lauschpiraten', 'Lausch-Forscher'],
          ['Piratensohlen', 'Forschersohlen'],
          ['Piraten', 'Forscher'],
          ['Hörfahrt', 'Hör-Expedition'],
        ],
      },
      {
        label: '🕵️ Detektive',
        description: 'Lausch-Detektive auf leiser Hör-Ermittlung.',
        replace: [
          ['Lauschpiraten', 'Lausch-Detektive'],
          ['Piratensohlen', 'Detektivsohlen'],
          ['Piraten', 'Detektive'],
          ['Hörfahrt', 'Hör-Ermittlung'],
        ],
      },
      {
        label: '🦁 Safari-Ranger',
        description: 'Lausch-Ranger auf großer Hör-Safari durch die Wildnis.',
        replace: [
          ['Lauschpiraten', 'Lausch-Ranger'],
          ['Piratensohlen', 'Rangerstiefeln'],
          ['Piraten', 'Ranger'],
          ['Hörfahrt', 'Hör-Safari'],
        ],
      },
      {
        label: '🤠 Cowboys',
        description: 'Lausch-Cowboys auf leisem Hör-Ritt durch die Prärie.',
        replace: [
          ['Lauschpiraten', 'Lausch-Cowboys'],
          ['Piratensohlen', 'Cowboystiefeln'],
          ['Piraten', 'Cowboys'],
          ['Hörfahrt', 'Hör-Ritt'],
        ],
      },
    ],
  },
}

// AI-generated overlay (validated & integrated by scripts/integrate-variants.mjs).
// Manual entries win on id collision.
export const variants: Record<string, MaterialVariants> = {
  ...(generatedVariants as unknown as Record<string, MaterialVariants>),
  ...manualVariants,
}

// ---------------------------------------------------------------------------
// Transform engine
// ---------------------------------------------------------------------------

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Apply the source token's casing to the replacement. */
function applyCase(source: string, repl: string): string {
  const hasLetters = /[a-zäöüß]/i.test(source)
  if (hasLetters && source === source.toUpperCase()) return repl.toUpperCase()
  const first = source.charAt(0)
  if (first && first === first.toLowerCase() && first !== first.toUpperCase())
    return repl.charAt(0).toLowerCase() + repl.slice(1)
  return repl // TITLE-case (German nouns) → use as authored
}

/** Re-skin a single string in one left-to-right pass (no double-replacement). */
export function reskin(text: string, pairs: [string, string][]): string {
  if (!text || pairs.length === 0) return text
  const sorted = [...pairs].sort((a, b) => b[0].length - a[0].length)
  const lookup = new Map(sorted.map(([f, t]) => [f.toLowerCase(), t]))
  const re = new RegExp(sorted.map(([f]) => escapeRe(f)).join('|'), 'gi')
  return text.replace(re, (m) => applyCase(m, lookup.get(m.toLowerCase()) ?? m))
}

/** Return a copy of `m` with the chosen setting applied to all text fields. */
export function applyVariant(m: Material, setting: VariantSetting): Material {
  const p = setting.replace
  const s = (t: string) => reskin(t, p)
  const opt = (t?: string) => (t === undefined ? undefined : reskin(t, p))
  return {
    ...m,
    title: s(m.title),
    shortDescription: s(m.shortDescription),
    materialsNeeded: opt(m.materialsNeeded),
    remark: opt(m.remark),
    duration: opt(m.duration),
    tags: m.tags.map(s),
    participants: m.participants.map((pi) => ({ ...pi, note: opt(pi.note) })),
    ablauf: m.ablauf.map((a) => ({ title: opt(a.title), text: s(a.text) })),
    worksheet: m.worksheet
      ? {
          ...m.worksheet,
          title: opt(m.worksheet.title),
          intro: opt(m.worksheet.intro),
          blocks: m.worksheet.blocks.map((b) => ({
            ...b,
            text: opt(b.text),
            items: b.items?.map(s),
          })),
        }
      : undefined,
  }
}

/** Number of selectable versions (base + settings), or 0 if none. */
export function variantCount(id: string): number {
  const v = variants[id]
  return v ? v.settings.length + 1 : 0
}
