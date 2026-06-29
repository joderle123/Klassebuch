// Integrate faithfully digitised ORIGINAL materials into
// src/data/materials/digitized.ts (+ .data.json sidecar).
//
//   node scripts/integrate-originals.mjs <input.json> [--append]
//
// Like integrate.mjs but: forces source:'original', keeps author + language
// (de/lb/fr/en), and does NOT drop titles that appear in the 316-entry
// reference catalogue (these materials ARE that catalogue).

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const THEME_IDS = new Set([
  'selbstwahrnehmung','kommunikation','beziehungsaufbau','kooperation','fremdwahrnehmung',
  'achtsamkeit','konfliktloesung','bewegung','spiel-spass','resilienz','selbstwertgefuehl',
  'impulskontrolle','emotionen','identitaet','stressbewaeltigung','ressourcen','kreativitaet',
  'grenzen','disziplin','mobbing','motivation','gerechtigkeit','gewalt','medien','sexualitaet','etep-epu',
])
const ELDIB_MAX = { V: 33, K: 35, SOZ: 41, KOG: 62 }
const AGE = new Set(['C1','C2','C3','C4','ES'])
const TYPE = new Set(['Aktivitéit','ganz Stonn','Projet','Hospi'])
const MODE = new Set(['Individuel','Grupp','Klass'])
const LANG = new Set(['de','lb','fr','en'])
const WS_KINDS = new Set(['heading','instruction','question','lines','box','checklist','table','scale'])

function sanitizeWorksheet(w) {
  if (!w || !Array.isArray(w.blocks)) return undefined
  const blocks = w.blocks
    .filter((b) => b && WS_KINDS.has(b.kind))
    .map((b) => ({
      kind: b.kind,
      text: typeof b.text === 'string' ? b.text : undefined,
      lines: Number.isFinite(b.lines) ? Math.min(12, Math.max(1, b.lines)) : undefined,
      items: Array.isArray(b.items) ? b.items.filter((x) => typeof x === 'string') : undefined,
    }))
  if (!blocks.length) return undefined
  return { title: w.title || undefined, intro: w.intro || undefined, blocks }
}

function slug(s) {
  return String(s).toLowerCase()
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .replace(/[ëèé]/g,'e').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
}
function normTitle(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9äöüëéè]+/g,' ').trim()
}
function validEldib(id) {
  const m = /^(V|K|SOZ|KOG)-(\d+)$/.exec(id)
  return m && Number(m[2]) >= 1 && Number(m[2]) <= ELDIB_MAX[m[1]]
}

const argv = process.argv.slice(2)
const append = argv.includes('--append')
const inputs = argv.filter((a) => !a.startsWith('--'))
if (!inputs.length) { console.error('usage: integrate-originals.mjs <input.json|dir> [--append]'); process.exit(1) }

const files = []
for (const p of inputs) {
  let st
  try { st = statSync(p) } catch { console.error(`skip (not found): ${p}`); continue }
  if (st.isDirectory()) {
    for (const f of readdirSync(p).sort()) if (f.endsWith('.json')) files.push(join(p, f))
  } else { files.push(p) }
}

let incoming = []
for (const f of files) {
  let raw
  try { raw = JSON.parse(readFileSync(f, 'utf8')) }
  catch (e) { console.error(`skip (bad JSON): ${f} — ${e.message}`); continue }
  const arr = Array.isArray(raw) ? raw : raw.items || raw.materials || []
  for (const x of arr) { const m = x && x.material ? x.material : x; if (m) incoming.push(m) }
}
if (!incoming.length) { console.error('no materials found in inputs'); process.exit(1) }
console.error(`Loaded ${incoming.length} material(s) from ${files.length} file(s).`)

const sidecar = join(ROOT, 'src/data/materials/digitized.data.json')
let kept = []
if (append && existsSync(sidecar)) kept = JSON.parse(readFileSync(sidecar, 'utf8'))

const seen = new Set(kept.map((m) => normTitle(m.title)))
const usedIds = new Set(kept.map((m) => m.id))
let dropped = 0
const cleaned = []

for (const m of incoming) {
  if (!m.title || !m.shortDescription || !Array.isArray(m.ablauf) || m.ablauf.length < 1) { dropped++; continue }
  const nt = normTitle(m.title)
  if (seen.has(nt)) { dropped++; continue }
  seen.add(nt)

  let id = slug(m.title) || 'material'
  let base = id, n = 2
  while (usedIds.has(id)) id = `${base}-${n++}`
  usedIds.add(id)

  cleaned.push({
    id,
    title: m.title.trim(),
    author: m.author || undefined,
    ageLevels: (m.ageLevels || []).filter((a) => AGE.has(a)),
    type: (m.type || []).filter((t) => TYPE.has(t)),
    participants: (m.participants || []).filter((p) => p && MODE.has(p.mode)),
    themes: (m.themes || []).filter((t) => THEME_IDS.has(t)).slice(0, 6),
    tags: (m.tags || []).map((t) => String(t).replace(/^#/,'')).filter(Boolean),
    shortDescription: m.shortDescription.trim(),
    ablauf: m.ablauf.filter((p) => p && p.text).map((p) => ({ title: p.title || undefined, text: p.text })),
    duration: m.duration || undefined,
    materialsNeeded: m.materialsNeeded || undefined,
    remark: m.remark || undefined,
    etepStufen: (m.etepStufen || []).filter((s) => s >= 1 && s <= 5),
    eldibGoals: [...new Set((m.eldibGoals || []).filter(validEldib))],
    attachments: m.attachments || undefined,
    worksheet: sanitizeWorksheet(m.worksheet),
    language: LANG.has(m.language) ? m.language : 'de',
    source: 'original',
  })
}

const all = [...kept, ...cleaned]
writeFileSync(sidecar, JSON.stringify(all, null, 2) + '\n')
const ts = `import type { Material } from '../../types/material'

// Faithfully digitised ISA original worksheets (from reference/ PDFs).
// Auto-written by scripts/integrate-originals.mjs — do not edit by hand.
export const digitized: Material[] = ${JSON.stringify(all, null, 2)}
`
writeFileSync(join(ROOT, 'src/data/materials/digitized.ts'), ts)
console.log(`Integrated ${cleaned.length} original(s) (dropped ${dropped}). Total digitised: ${all.length}.`)
