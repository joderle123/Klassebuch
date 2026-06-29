#!/usr/bin/env node
// Patch improved worksheets (from improve-worksheets workflow) back into
// generated.ts + generated.data.json. Keeps original on any invalid rewrite.
// Usage: node scripts/integrate-worksheets.mjs <outDir>
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

const sidecar = path.join(ROOT, 'src/data/materials/generated.data.json')
const all = JSON.parse(fs.readFileSync(sidecar, 'utf8'))
const byId = new Map(all.map((m) => [m.id, m]))

const WS_KINDS = new Set(['heading', 'instruction', 'question', 'lines', 'box', 'checklist', 'table', 'scale'])
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
      if (b.kind === 'lines' || b.kind === 'box') return true // space is content
      if (b.kind === 'checklist' || b.kind === 'scale' || b.kind === 'table') return (b.items && b.items.length) || b.text
      return !!b.text // heading/instruction/question
    })
  if (!blocks.length) return undefined
  return {
    title: w.title && String(w.title).trim() ? String(w.title).trim() : undefined,
    intro: w.intro && String(w.intro).trim() ? String(w.intro).trim() : undefined,
    blocks,
  }
}
function score(ws) {
  const b = ws.blocks
  const tasks = b.filter((x) => !['heading', 'instruction'].includes(x.kind)).length
  let wu = 0
  for (const x of b) {
    if (x.kind === 'question') wu += x.lines || 2
    else if (x.kind === 'lines') wu += x.lines || 3
    else if (x.kind === 'box') wu += x.lines || 4
    else if (x.kind === 'table') wu += (x.lines || 3) * ((x.items || []).length || 1)
    else if (x.kind === 'checklist') wu += (x.items || []).length * 0.5
    else if (x.kind === 'scale') wu += 1
  }
  return { tasks, blocks: b.length, wu }
}

const files = fs.existsSync(outDir)
  ? fs.readdirSync(outDir).filter((f) => /^wsout-\d+\.json$/.test(f)).sort()
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

const stats = { files: files.length, badFiles, seen: 0, kept: 0, improved: 0, rejectedThin: 0, invalid: 0, unknown: 0 }
for (const r of raw) {
  if (!r || !r.id) continue
  stats.seen++
  const m = byId.get(r.id)
  if (!m) {
    stats.unknown++
    continue
  }
  if (r.action !== 'improve') {
    stats.kept++
    continue
  }
  const ws = sanitizeWorksheet(r.worksheet)
  if (!ws) {
    stats.invalid++
    continue
  }
  const sNew = score(ws)
  const sOld = m.worksheet ? score(m.worksheet) : { tasks: 0, blocks: 0, wu: 0 }
  // Accept only genuine improvements: enough substance AND not thinner than before.
  if (sNew.tasks < 3 || sNew.blocks < 3 || sNew.wu < Math.max(8, sOld.wu * 0.9)) {
    stats.rejectedThin++
    continue
  }
  m.worksheet = ws
  stats.improved++
}

// Re-emit sidecar + TS module (same shape as scripts/integrate.mjs).
fs.writeFileSync(sidecar, JSON.stringify(all, null, 2) + '\n')
const ts = `import type { Material } from '../../types/material'

// AI-generated library materials (one-time generation; offline thereafter).
// Auto-written by scripts/integrate.mjs — do not edit by hand.
// Each is a draft for human review before classroom use.
export const generated: Material[] = ${JSON.stringify(all, null, 2)}
`
fs.writeFileSync(path.join(ROOT, 'src/data/materials/generated.ts'), ts)

console.log('── Arbeitsblätter verbessern ──')
console.log(stats)
console.log(`\n✓ ${stats.improved} verbessert · ${stats.kept} behalten · ${stats.rejectedThin + stats.invalid} Rewrites verworfen (Original behalten)`)
if (badFiles) console.log(`⚠ ${badFiles} fehlerhafte Batch-Dateien`)
