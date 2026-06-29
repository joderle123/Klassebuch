import { pdf } from '@react-pdf/renderer'
import { MaterialDocument } from '../pdf/MaterialPdf'
import type { Material } from '../types/material'
import { slug } from './slug'

/** Render a material to a PDF Blob entirely in the browser (no server, no API). */
export async function materialToBlob(material: Material): Promise<Blob> {
  return pdf(<MaterialDocument material={material} />).toBlob()
}

/** Generate and download the material's PDF. */
export async function downloadMaterialPdf(material: Material): Promise<void> {
  const blob = await materialToBlob(material)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ISA-Material_${slug(material.title)}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
