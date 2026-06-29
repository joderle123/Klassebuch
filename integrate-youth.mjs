#!/usr/bin/env node
// Rebuild youth.ts + youth.data.json from all youthgen/*.json batch files.
// Adolescent (ES) set: NO cross-catalogue title dedup (different age on purpose).
// Usage: node scripts/integrate-youth.mjs <youthgenDir>
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const dir = process.argv[2]
if (!dir) {
  console.error('Bitte youthgenDir angeben')
  process.exit(1)
}

const THEME_IDS = new Set([
  'selbstwahrnehmung', 'kommunikation', 'beziehungsaufbau', 'kooperation', 'fremdwahrnehmung',
  'achtsamkeit', 'konfliktloesung', 'bewegung', 'spiel-spass', 'resilienz', 'selbstwertgefuehl',
  'impulskontrolle', 'emotionen', 'identitaet', 'stressbewaeltigung', 'ressourcen', 'kreativitaet',
  'grenzen', 'disziplin', 'mobbing', 'motivation', 'gerechtigkeit', 'gewalt', 'medien', 'sexualitaet', 'etep-epu',
  'liebe-beziehungen', 'koerper-selbstbild', 'psychische-gesundheit', 'sucht-praevention', 'gruppendruck',
  'diskriminierung-vielfalt', 'demokratie-engagement', 'zukunft-beruf', 'geld-konsum',
])
const ELDIB_MAX = { V: 33, K: 35, SOZ: 41, KOG: 62 }
const AGE = new Set(['C1', 'C2', 'C3', 'C4', 'ES'])
const TYPE = new Set(['Aktivitéit', 'ganz Stonn', 'Projet', 'Hospi'])
const MODE = new Set(['Individuel', 'Grupp', 'Klass'])
const WS_KINDS = new Set(['heading', 'instruction', 'question', 'lines', 'box', 'checklist', 'table', 'scale'])

function slug(s) {
  return String(s).toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[ëèé]/g, 'e').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
function validEldib(id) {
  const m = /^(V|K|SOZ|KOG)-(\d+)$/.exec(id)
  return m && Number(m[2]) >= 1 && Number(m[2]) <= ELDIB_MAX[m[1]]
}
function sanitizeWorksheet(w) {
  if (!w || !Array.isArray(w.blocks)) return undefined
  const blocks = w.blocks
    .filter((b) => b && WS_KINDS.has(b.kind))
    .map((b) => ({
      kind: b.kind,
      text: typeof b.text === 'string' && b.text.trim() ? b.text.trim() : undefined,
      lines: Number.isFinite(b.lines) ? Math.min(12, Math.max(1, b.lines)) : undefined,
      items: Array.isArray(b.items) ? b.items.map((x) => String(x)).filter((x) => x.trim()) : undefined,
    }))
    .filter((b) => {
      if (b.kind === 'lines' || b.kind === 'box') return true
      if (b.kind === 'checklist' || b.kind === 'scale' || b.kind === 'table') return (b.items && b.items.length) || b.text
      return !!b.text
    })
  if (!blocks.length) return undefined
  return { title: w.title || undefined, intro: w.intro || undefined, blocks }
}

// Existing ids (avoid collisions across the whole library).
const usedIds = new Set()
for (const f of ['generated.data.json', 'digitized.data.json']) {
  const p = path.join(ROOT, 'src/data/materials', f)
  if (fs.existsSync(p)) for (const m of JSON.parse(fs.readFileSync(p, 'utf8'))) usedIds.add(m.id)
}

const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^youth-\d+\.json$/.test(f)).sort() : []
let incoming = []
let badFiles = 0
for (const f of files) {
  try {
    const arr = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
    if (Array.isArray(arr)) incoming.push(...arr)
    else badFiles++
  } catch {
    badFiles++
  }
}

const out = []
let dropped = 0
for (const m of incoming) {
  if (!m || !m.title || !m.shortDescription || !Array.isArray(m.ablauf) || m.ablauf.length < 1) {
    dropped++
    continue
  }
  let id = slug(m.title) || 'jugend-material'
  let base = id, n = 2
  while (usedIds.has(id)) id = `${base}-${n++}`
  usedIds.add(id)

  const tags = [...new Set((m.tags || []).map((t) => String(t).replace(/^#/, '')).filter(Boolean))]
  if (!tags.some((t) => t.toLowerCase() === 'jugend')) tags.unshift('Jugend')
  const ages = (m.ageLevels || []).filter((a) => AGE.has(a))

  out.push({
    id,
    title: m.title.trim(),
    author: m.author || 'ISA-Toolbox',
    ageLevels: ages.length ? ages : ['ES'],
    type: (m.type || []).filter((t) => TYPE.has(t)).length ? m.type.filter((t) => TYPE.has(t)) : ['ganz Stonn'],
    participants: (m.participants || []).filter((p) => p && MODE.has(p.mode)),
    themes: [...new Set((m.themes || []).filter((t) => THEME_IDS.has(t)))].slice(0, 3),
    tags,
    shortDescription: m.shortDescription.trim(),
    ablauf: m.ablauf.filter((p) => p && p.text).map((p) => ({ title: p.title || undefined, text: p.text })),
    duration: m.duration || undefined,
    materialsNeeded: m.materialsNeeded || undefined,
    remark: m.remark || undefined,
    etepStufen: [...new Set((m.etepStufen || []).filter((s) => s >= 1 && s <= 5))],
    eldibGoals: [...new Set((m.eldibGoals || []).filter(validEldib))],
    attachments: m.attachments || undefined,
    worksheet: sanitizeWorksheet(m.worksheet),
    language: 'de',
    source: 'generated',
  })
}

fs.writeFileSync(path.join(ROOT, 'src/data/materials/youth.data.json'), JSON.stringify(out, null, 2) + '\n')
const ts = `import type { Material } from '../../types/material'

// Youth / secondary (ES) materials — AI-generated, adolescent-focused set.
// Auto-written by scripts/integrate-youth.mjs — do not edit by hand.
// Each is a draft for human review before classroom use.
export const youth: Material[] = ${JSON.stringify(out, null, 2)}
`
fs.writeFileSync(path.join(ROOT, 'src/data/materials/youth.ts'), ts)

const withWs = out.filter((m) => m.worksheet).length
console.log('── Jugend-Materialien integrieren ──')
console.log({ files: files.length, badFiles, built: out.length, dropped, withWorksheet: withWs })
console.log(`\n✓ ${out.length} Jugend-Materialien geschrieben (${withWs} mit Arbeitsblatt) → youth.ts`)
if (badFiles) console.log(`⚠ ${badFiles} fehlerhafte Batch-Dateien`)
