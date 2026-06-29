import type { Material } from '../../types/material'
import { originals } from './originals'
import { digitized } from './digitized'
import { generated } from './generated'
import { youth } from './youth'

/** Full library = digitised originals + generated + youth/secondary set. */
export const allMaterials: Material[] = [...originals, ...digitized, ...generated, ...youth]
