#!/usr/bin/env node
// Read the workflow's per-batch outputs, validate every replacement against the
// real material text, and write a clean overlay to src/data/variants.generated.json.
//
// Usage: node scripts/integrate-variants.mjs <outDir>
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const outDir = process.argv[2]
if (!outDir) {
  console.error('Bitte outDir angeben: node scripts/integrate-variants.mjs <outDir>')
  process.exit(1)
}

// ---- Load all materials and build a per-id text haystack -------------------
const gen = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/materials/generated.data.json'), 'utf8'))
const dig = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/materials/digitized.data.json'), 'utf8'))
const all = [...gen, ...dig]
const byId = new Map(all.map((m) => [m.id, m]))

function haystack(m) {
  const parts = [m.title, m.shortDescription, m.materialsNeeded, m.remark, m.duration]
  for (const a of m.ablauf || []) parts.push(a.title, a.text)
  for (const t of m.tags || []) parts.push(t)
  for (const p of m.participants || []) parts.push(p.note)
  if (m.worksheet) {
    parts.push(m.worksheet.title, m.worksheet.intro)
    for (const b of m.worksheet.blocks || []) {
      parts.push(b.text)
      for (const it of b.items || []) parts.push(it)
    }
  }
  return parts.filter(Boolean).join('  ')
}

// Words too generic/risky to ever use as a `from` token.
const STOP = new Set(
  'und oder der die das den dem des ein eine einer einem einen mit für auf ans am im in zu zur zum vom von bei aus ist sind war wird man wir ihr sie ich du es als wie wenn dann auch nur noch schon sehr ganz alle alles jeder jede kann soll muss hat hier dort über unter vor nach durch ohne gegen'
    .split(' '),
)

function validPair(from, to, hay) {
  if (typeof from !== 'string' || typeof to !== 'string') return false
  from = from.trim()
  to = to.trim()
  if (from.length < 3 || to.length < 1) return false
  if (from.toLowerCase() === to.toLowerCase()) return false
  if (STOP.has(from.toLowerCase())) return false
  // must actually occur in the material text (case-insensitive)
  return hay.toLowerCase().includes(from.toLowerCase())
}

// ---- Read every vout-*.json ------------------------------------------------
const files = fs.existsSync(outDir)
  ? fs.readdirSync(outDir).filter((f) => /^vout-\d+\.json$/.test(f)).sort()
  : []

let rawResults = []
let badFiles = 0
for (const f of files) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf8'))
    if (Array.isArray(j.results)) rawResults.push(...j.results)
    else badFiles++
  } catch {
    badFiles++
  }
}

// ---- Validate + build overlay ---------------------------------------------
const overlay = {}
const stats = {
  files: files.length,
  badFiles,
  seen: 0,
  suitable: 0,
  integrated: 0,
  settings: 0,
  droppedPairs: 0,
  droppedSettings: 0,
  unknownId: 0,
}

for (const r of rawResults) {
  stats.seen++
  if (!r || !r.id || r.suitable === false || !Array.isArray(r.settings)) continue
  const m = byId.get(r.id)
  if (!m) {
    stats.unknownId++
    continue
  }
  stats.suitable++
  const hay = haystack(m)
  const settings = []
  for (const s of r.settings.slice(0, 4)) {
    if (!s || !s.label || !Array.isArray(s.replace)) {
      stats.droppedSettings++
      continue
    }
    const seenFrom = new Set()
    const pairs = []
    for (const p of s.replace) {
      const from = (p?.from ?? '').trim()
      const to = (p?.to ?? '').trim()
      const key = from.toLowerCase()
      if (seenFrom.has(key)) continue
      if (!validPair(from, to, hay)) {
        stats.droppedPairs++
        continue
      }
      seenFrom.add(key)
      pairs.push([from, to])
    }
    // Need at least 2 grounded replacements to be a meaningful version.
    if (pairs.length < 2) {
      stats.droppedSettings++
      continue
    }
    settings.push({
      label: String(s.label).slice(0, 40),
      ...(s.description ? { description: String(s.description).slice(0, 200) } : {}),
      replace: pairs.slice(0, 18),
    })
  }
  if (settings.length === 0) continue
  overlay[r.id] = {
    base: (r.base && String(r.base).slice(0, 40)) || '✨ Original',
    settings: settings.slice(0, 3),
  }
  stats.integrated++
  stats.settings += settings.length
}

// ---- Write sorted overlay --------------------------------------------------
const sorted = {}
for (const id of Object.keys(overlay).sort()) sorted[id] = overlay[id]
const outPath = path.join(ROOT, 'src/data/variants.generated.json')
fs.writeFileSync(outPath, JSON.stringify(sorted, null, 2) + '\n')

const versions = stats.settings + stats.integrated // settings + each base
console.log('── Varianten-Integration ──')
console.log(stats)
console.log(
  `\n✓ ${stats.integrated} Materialien mit Varianten → ${stats.settings} Settings (+${stats.integrated} Originale = ${versions} wählbare Versionen)`,
)
console.log(`✓ geschrieben: ${path.relative(ROOT, outPath)}`)
if (badFiles) console.log(`⚠ ${badFiles} fehlerhafte/fehlende Batch-Dateien`)
