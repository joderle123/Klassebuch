#!/usr/bin/env node
// Apply re-categorised ELDiB goals back into generated.ts + youth.ts.
// Keeps a material's current goals if the new set is missing/invalid.
// Usage: node scripts/integrate-eldib.mjs <outDir>
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const outDir = process.argv[2]
if (!outDir) { console.error('Bitte outDir angeben'); process.exit(1) }

const ELDIB_MAX = { V: 33, K: 35, SOZ: 41, KOG: 62 }
const validEldib = (id) => {
  const m = /^(V|K|SOZ|KOG)-(\d+)$/.exec(id)
  return m && Number(m[2]) >= 1 && Number(m[2]) <= ELDIB_MAX[m[1]]
}

const files = fs.existsSync(outDir) ? fs.readdirSync(outDir).filter((f) => /^eldibout-\d+\.json$/.test(f)).sort() : []
const fixes = new Map()
let badFiles = 0
for (const f of files) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf8'))
    for (const r of j.results || []) {
      if (!r || !r.id || !Array.isArray(r.eldibGoals)) continue
      const goals = [...new Set(r.eldibGoals.filter(validEldib))]
      if (goals.length >= 2) fixes.set(r.id, goals)
    }
  } catch { badFiles++ }
}

function patch(file) {
  const p = path.join(ROOT, 'src/data/materials', file)
  const arr = JSON.parse(fs.readFileSync(p, 'utf8'))
  let changed = 0
  for (const m of arr) {
    const g = fixes.get(m.id)
    if (g) { m.eldibGoals = g; changed++ }
  }
  fs.writeFileSync(p, JSON.stringify(arr, null, 2) + '\n')
  return { arr, changed }
}
function emitTs(file, varName, arr) {
  const ts = `import type { Material } from '../../types/material'

// Auto-written — do not edit by hand.
export const ${varName}: Material[] = ${JSON.stringify(arr, null, 2)}
`
  fs.writeFileSync(path.join(ROOT, 'src/data/materials', file), ts)
}

const g = patch('generated.data.json')
emitTs('generated.ts', 'generated', g.arr)
const y = patch('youth.data.json')
emitTs('youth.ts', 'youth', y.arr)

console.log('── ELDiB neu zuordnen ──')
console.log({ files: files.length, badFiles, fixesLoaded: fixes.size, generatedUpdated: g.changed, youthUpdated: y.changed })
console.log(`\n✓ ${g.changed + y.changed} Materialien mit korrigierten ELDiB-Zielen`)
if (badFiles) console.log(`⚠ ${badFiles} fehlerhafte Batch-Dateien`)
