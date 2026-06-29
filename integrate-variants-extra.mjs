#!/usr/bin/env node
// Append extra settings (from gen-variants-more) onto the existing overlay.
// Usage: node scripts/integrate-variants-extra.mjs <outDir>
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const outDir = process.argv[2]
if (!outDir) {
  console.error('Bitte outDir angeben')
  process.exit(1)
}

const gen = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/materials/generated.data.json'), 'utf8'))
const dig = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/materials/digitized.data.json'), 'utf8'))
const byId = new Map([...gen, ...dig].map((m) => [m.id, m]))
const overlayPath = path.join(ROOT, 'src/data/variants.generated.json')
const overlay = JSON.parse(fs.readFileSync(overlayPath, 'utf8'))

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
const STOP = new Set(
  'und oder der die das den dem des ein eine einer einem einen mit für auf ans am im in zu zur zum vom von bei aus ist sind war wird man wir ihr sie ich du es als wie wenn dann auch nur noch schon sehr ganz alle alles jeder jede kann soll muss hat hier dort über unter vor nach durch ohne gegen'.split(
    ' ',
  ),
)
function validPair(from, to, hay) {
  if (typeof from !== 'string' || typeof to !== 'string') return false
  from = from.trim()
  to = to.trim()
  if (from.length < 3 || to.length < 1) return false
  if (from.toLowerCase() === to.toLowerCase()) return false
  if (STOP.has(from.toLowerCase())) return false
  return hay.toLowerCase().includes(from.toLowerCase())
}
const norm = (label) => String(label).replace(/[^\p{L}]/gu, '').toLowerCase()

const files = fs.existsSync(outDir)
  ? fs.readdirSync(outDir).filter((f) => /^vout-\d+\.json$/.test(f)).sort()
  : []
const raw = []
let badFiles = 0
for (const f of files) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf8'))
    if (Array.isArray(j.results)) raw.push(...j.results)
    else badFiles++
  } catch {
    badFiles++
  }
}

const MAX = 6
const stats = { added: 0, droppedDup: 0, droppedPairs: 0, droppedWeak: 0, materialsTouched: 0, unknown: 0 }
for (const r of raw) {
  if (!r || !r.id || !Array.isArray(r.settings)) continue
  const entry = overlay[r.id]
  const m = byId.get(r.id)
  if (!entry || !m) {
    stats.unknown++
    continue
  }
  const hay = haystack(m)
  const taken = new Set([norm(entry.base), ...entry.settings.map((s) => norm(s.label))])
  let touched = false
  for (const s of r.settings) {
    if (entry.settings.length >= MAX) break
    if (!s || !s.label || !Array.isArray(s.replace)) continue
    const key = norm(s.label)
    if (!key || taken.has(key)) {
      stats.droppedDup++
      continue
    }
    const seen = new Set()
    const pairs = []
    for (const p of s.replace) {
      const from = (p?.from ?? '').trim()
      const to = (p?.to ?? '').trim()
      const k = from.toLowerCase()
      if (seen.has(k)) continue
      if (!validPair(from, to, hay)) {
        stats.droppedPairs++
        continue
      }
      seen.add(k)
      pairs.push([from, to])
    }
    if (pairs.length < 2) {
      stats.droppedWeak++
      continue
    }
    entry.settings.push({
      label: String(s.label).slice(0, 40),
      ...(s.description ? { description: String(s.description).slice(0, 200) } : {}),
      replace: pairs.slice(0, 18),
    })
    taken.add(key)
    stats.added++
    touched = true
  }
  if (touched) stats.materialsTouched++
}

const sorted = {}
for (const id of Object.keys(overlay).sort()) sorted[id] = overlay[id]
fs.writeFileSync(overlayPath, JSON.stringify(sorted, null, 2) + '\n')

const ids = Object.keys(sorted)
const totalSettings = ids.reduce((a, id) => a + sorted[id].settings.length, 0)
console.log('── Varianten erweitern ──')
console.log(stats)
console.log(
  `\n✓ +${stats.added} neue Settings auf ${stats.materialsTouched} Materialien`,
)
console.log(
  `✓ Overlay jetzt: ${ids.length} Materialien, ${totalSettings} Settings (= ${totalSettings + ids.length} Versionen)`,
)
if (badFiles) console.log(`⚠ ${badFiles} fehlerhafte Batch-Dateien`)
