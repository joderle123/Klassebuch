import { renderToFile } from '@react-pdf/renderer'
import { MaterialDocument } from '../src/pdf/MaterialPdf'
import { originals } from '../src/data/materials/originals'

const out = process.argv[2] || 'scratchpad/test.pdf'
await renderToFile(<MaterialDocument material={originals[0]} />, out)
console.log('Rendered ->', out)
