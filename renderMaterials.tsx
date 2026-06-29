import { renderToFile } from '@react-pdf/renderer'
import { MaterialDocument } from '../src/pdf/MaterialPdf'
import { allMaterials } from '../src/data/materials'

// Usage: tsx scripts/renderMaterials.tsx <outDir> [id1 id2 ...]
const outDir = process.argv[2] || '.'
const ids = process.argv.slice(3)
const list = ids.length ? allMaterials.filter((m) => ids.includes(m.id)) : allMaterials

for (const m of list) {
  await renderToFile(<MaterialDocument material={m} />, `${outDir}/${m.id}.pdf`)
  console.log('rendered', m.id)
}
console.log(`done: ${list.length} PDF(s)`)
