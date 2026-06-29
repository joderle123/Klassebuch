import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
  Svg,
  Path,
  Circle,
  Rect,
  Polygon,
  Line,
} from '@react-pdf/renderer'
import type { ReactNode } from 'react'
import type { Material, WorksheetBlock } from '../types/material'

// Disable automatic hyphenation so goal ids like "[SOZ-5]" never break into
// "[-SOZ-5]". Words wrap at spaces only.
Font.registerHyphenationCallback((word) => [word])
import {
  ageLevels,
  eldibBands,
  eldibDomains,
  goalsInBand,
  materialTypes,
  participantModes,
  themeLabel,
  etepStufen,
} from '../data/taxonomy'

// ---------------------------------------------------------------------------
// Reproduction of the original "ISA – Material" template, built entirely with
// @react-pdf primitives. Uses the standard Helvetica family (no network fonts)
// so generation works fully offline. Checkboxes AND theme icons are drawn as
// vector SVG (not glyphs/images) so the PDF stays self-contained and offline.
// ---------------------------------------------------------------------------

const C = {
  blue: '#dbe5f1',
  blueDeep: '#2f5597',
  gray: '#ededed',
  salmon: '#fbe4d5',
  green: '#e2efda',
  greenDeep: '#548235',
  border: '#bfc7d2',
  ink: '#1f2733',
  faint: '#8a93a0',
}

// Per-theme accent (deep = icon/foreground, light = banner background).
const THEME_COLOR: Record<string, { deep: string; light: string }> = {
  selbstwahrnehmung: { deep: '#2f5597', light: '#dbe5f1' },
  fremdwahrnehmung: { deep: '#2e75b6', light: '#deebf7' },
  selbstwertgefuehl: { deep: '#c55a11', light: '#fbe4d5' },
  identitaet: { deep: '#7030a0', light: '#e7dcf2' },
  kommunikation: { deep: '#548235', light: '#e2efda' },
  beziehungsaufbau: { deep: '#bf8f00', light: '#fff2cc' },
  kooperation: { deep: '#1f8a8a', light: '#d7f0f0' },
  achtsamkeit: { deep: '#4472c4', light: '#dbe5f1' },
  konfliktloesung: { deep: '#7030a0', light: '#e7dcf2' },
  bewegung: { deep: '#548235', light: '#e2efda' },
  'spiel-spass': { deep: '#d18f00', light: '#fff2cc' },
  resilienz: { deep: '#2f6b3c', light: '#dcebe1' },
  impulskontrolle: { deep: '#c55a11', light: '#fbe4d5' },
  emotionen: { deep: '#c00000', light: '#f8dada' },
  stressbewaeltigung: { deep: '#3a8f8f', light: '#d7f0f0' },
  ressourcen: { deep: '#bf8f00', light: '#fff2cc' },
  kreativitaet: { deep: '#9933cc', light: '#efe0f7' },
  grenzen: { deep: '#806000', light: '#f0e6c8' },
  disziplin: { deep: '#44546a', light: '#d6dce5' },
  mobbing: { deep: '#a52a2a', light: '#f3dada' },
  motivation: { deep: '#c55a11', light: '#fbe4d5' },
  gerechtigkeit: { deep: '#44546a', light: '#d6dce5' },
  gewalt: { deep: '#843c0c', light: '#f0dccd' },
  medien: { deep: '#2e75b6', light: '#deebf7' },
  sexualitaet: { deep: '#b0367a', light: '#f6dcea' },
  'etep-epu': { deep: '#2f5597', light: '#dbe5f1' },
  // Jugend-/Sekundar-Themen
  'liebe-beziehungen': { deep: '#d6336c', light: '#fbe0ea' },
  'koerper-selbstbild': { deep: '#c0560f', light: '#fbe4d5' },
  'psychische-gesundheit': { deep: '#2f8f6b', light: '#d7f0e6' },
  'sucht-praevention': { deep: '#9c4221', light: '#f0ddd2' },
  gruppendruck: { deep: '#b08900', light: '#fff2cc' },
  'diskriminierung-vielfalt': { deep: '#7048c4', light: '#e7dcf7' },
  'demokratie-engagement': { deep: '#1f6f8b', light: '#d7eaf0' },
  'zukunft-beruf': { deep: '#2f5597', light: '#dbe5f1' },
  'geld-konsum': { deep: '#3a7d44', light: '#dcefe0' },
}
const themeColor = (id?: string) =>
  (id && THEME_COLOR[id]) || { deep: C.blueDeep, light: C.blue }

// Map each theme to one of a small set of drawn icons.
const THEME_ICON: Record<string, string> = {
  selbstwahrnehmung: 'self', identitaet: 'self', fremdwahrnehmung: 'eye',
  selbstwertgefuehl: 'star', ressourcen: 'star',
  kommunikation: 'talk', beziehungsaufbau: 'team', kooperation: 'team', mobbing: 'team',
  achtsamkeit: 'mind', stressbewaeltigung: 'mind', 'etep-epu': 'mind',
  emotionen: 'heart', sexualitaet: 'heart',
  impulskontrolle: 'shield', grenzen: 'shield', gewalt: 'shield',
  konfliktloesung: 'peace', gerechtigkeit: 'peace',
  bewegung: 'bolt', 'spiel-spass': 'play',
  kreativitaet: 'idea', resilienz: 'mountain', motivation: 'flag',
  disziplin: 'target', medien: 'screen',
  // Jugend-/Sekundar-Themen
  'liebe-beziehungen': 'heart', 'koerper-selbstbild': 'self',
  'psychische-gesundheit': 'mind', 'sucht-praevention': 'shield',
  gruppendruck: 'shield', 'diskriminierung-vielfalt': 'team',
  'demokratie-engagement': 'peace', 'zukunft-beruf': 'flag', 'geld-konsum': 'target',
}

/** Draw a theme icon in a 0..24 viewBox. */
function Icon({ name, size = 22, color = '#fff' }: { name: string; size?: number; color?: string }) {
  const sw = 1.7
  let body: ReactNode = null
  switch (name) {
    case 'self':
      body = (<>
        <Circle cx={12} cy={8} r={3.4} fill={color} />
        <Path d="M5 20c0-4 3.4-6.2 7-6.2s7 2.2 7 6.2" fill="none" stroke={color} strokeWidth={sw} />
      </>); break
    case 'eye':
      body = (<>
        <Path d="M2 12c2.6-4.2 6-6.3 10-6.3S19.4 7.8 22 12c-2.6 4.2-6 6.3-10 6.3S4.6 16.2 2 12z" fill="none" stroke={color} strokeWidth={sw} />
        <Circle cx={12} cy={12} r={3} fill={color} />
      </>); break
    case 'star':
      body = <Polygon points="12,2 14.7,8.6 21.8,9.2 16.4,13.8 18.1,20.8 12,17 5.9,20.8 7.6,13.8 2.2,9.2 9.3,8.6" fill={color} />; break
    case 'talk':
      body = <Path d="M4 4.5h16c1 0 1.6.7 1.6 1.6v8c0 .9-.7 1.6-1.6 1.6H10l-4.6 4v-4H4c-1 0-1.6-.7-1.6-1.6v-8C2.4 5.2 3 4.5 4 4.5z" fill={color} />; break
    case 'team':
      body = (<>
        <Circle cx={8} cy={8} r={2.7} fill={color} />
        <Circle cx={16} cy={8} r={2.7} fill={color} />
        <Path d="M2.5 19c0-3 2.3-4.8 5.5-4.8M21.5 19c0-3-2.3-4.8-5.5-4.8M8.2 19.2c0-3.2 1.8-4.8 3.8-4.8s3.8 1.6 3.8 4.8" fill="none" stroke={color} strokeWidth={sw} />
      </>); break
    case 'mind':
      body = (<>
        <Circle cx={12} cy={12} r={8.2} fill="none" stroke={color} strokeWidth={sw} />
        <Path d="M12 12c0-2 1.6-2.4 1.6-3.9 0-1-.8-1.8-1.9-1.8-1 0-1.8.7-1.9 1.7" fill="none" stroke={color} strokeWidth={sw} />
        <Circle cx={12} cy={15.4} r={1} fill={color} />
      </>); break
    case 'heart':
      body = (<>
        <Circle cx={8.2} cy={9} r={3.3} fill={color} />
        <Circle cx={15.8} cy={9} r={3.3} fill={color} />
        <Polygon points="5,10.7 19,10.7 12,20" fill={color} />
      </>); break
    case 'shield':
      body = <Path d="M12 2.2l8 3v6c0 5-3.5 8.8-8 10.8-4.5-2-8-5.8-8-10.8v-6z" fill={color} />; break
    case 'peace':
      body = (<>
        <Line x1={12} y1={4} x2={12} y2={20} stroke={color} strokeWidth={sw} />
        <Line x1={5} y1={7} x2={19} y2={7} stroke={color} strokeWidth={sw} />
        <Path d="M5 7l-2.6 5h5.2zM19 7l-2.6 5h5.2z" fill="none" stroke={color} strokeWidth={sw} />
        <Line x1={8} y1={20} x2={16} y2={20} stroke={color} strokeWidth={sw} />
      </>); break
    case 'bolt':
      body = <Polygon points="13,2 4,13.5 10.5,13.5 9,22 20,9 13,9" fill={color} />; break
    case 'play':
      body = (<>
        <Circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={sw} />
        <Polygon points="10,8 16,12 10,16" fill={color} />
      </>); break
    case 'idea':
      body = (<>
        <Circle cx={12} cy={9.5} r={5.2} fill={color} />
        <Rect x={9.5} y={14} width={5} height={4.2} rx={1} fill={color} />
        <Line x1={9.8} y1={20} x2={14.2} y2={20} stroke={color} strokeWidth={sw} />
      </>); break
    case 'mountain':
      body = <Polygon points="2,20 9,6.5 13.2,13 16,9 22,20" fill={color} />; break
    case 'flag':
      body = (<>
        <Line x1={6} y1={3} x2={6} y2={21} stroke={color} strokeWidth={sw} />
        <Path d="M6 4h12l-3 3.4 3 3.4H6z" fill={color} />
      </>); break
    case 'target':
      body = (<>
        <Circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={sw} />
        <Circle cx={12} cy={12} r={5.2} fill="none" stroke={color} strokeWidth={sw} />
        <Circle cx={12} cy={12} r={1.8} fill={color} />
      </>); break
    case 'screen':
      body = (<>
        <Rect x={3} y={4.5} width={18} height={12} rx={1.6} fill="none" stroke={color} strokeWidth={sw} />
        <Line x1={9} y1={19.5} x2={15} y2={19.5} stroke={color} strokeWidth={sw} />
        <Line x1={12} y1={16.5} x2={12} y2={19.5} stroke={color} strokeWidth={sw} />
      </>); break
    default:
      body = <Circle cx={12} cy={12} r={8} fill={color} />
  }
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      {body}
    </Svg>
  )
}

const themeIconName = (id?: string) => (id && THEME_ICON[id]) || 'self'

const s = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 44,
    paddingHorizontal: 42,
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    color: C.ink,
    lineHeight: 1.4,
  },
  // Visual title banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  bannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  kicker: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  bannerTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: C.ink, marginTop: 1 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 5 },
  badge: {
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 5,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#fff',
  },
  badgeOutline: {
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 5,
    fontSize: 8,
    borderWidth: 1,
  },
  // Theme chips (with mini icon)
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginRight: 5,
    marginBottom: 3,
  },
  themeChipText: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', marginLeft: 3 },
  // Colored info blocks
  block: { padding: 8, marginBottom: 10, borderRadius: 4 },
  blockBlue: { backgroundColor: C.blue },
  blockGray: { backgroundColor: C.gray },
  blockSalmon: { backgroundColor: C.salmon },
  row: { flexDirection: 'row', marginBottom: 3 },
  label: { width: 120, fontFamily: 'Helvetica-Bold', color: C.blueDeep },
  labelInk: { width: 120, fontFamily: 'Helvetica-Bold' },
  value: { flex: 1 },
  // Checkboxes
  cbRow: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  box: {
    width: 9,
    height: 9,
    borderWidth: 1,
    borderColor: '#5a6473',
    marginRight: 4,
    marginTop: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFill: { width: 5, height: 5, backgroundColor: C.blueDeep },
  inlineChecks: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  sectionLabel: { fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  sectionAccent: { width: 4, height: 14, borderRadius: 2, marginRight: 6 },
  para: { marginBottom: 6 },
  // Ablauf
  ablaufBox: {
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 4,
    padding: 8,
    marginBottom: 8,
    borderRadius: 3,
  },
  phaseTitle: { fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  metaRow: { flexDirection: 'row', borderWidth: 1, borderColor: C.border, borderRadius: 3 },
  metaCell: { padding: 6, borderRightWidth: 1, borderRightColor: C.border },
  // ELDiB grid
  gridHeader: { flexDirection: 'row', marginTop: 6 },
  gridHeadCell: {
    flex: 1,
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#fff',
    marginRight: 2,
  },
  band: { flexDirection: 'row', marginTop: 2 },
  bandCell: {
    flex: 1,
    backgroundColor: '#f4f6f9',
    padding: 4,
    marginRight: 2,
  },
  goal: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 1.5 },
  goalText: { fontSize: 7.5, flex: 1, lineHeight: 1.25 },
  link: { color: C.blueDeep, fontSize: 9 },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 42,
    right: 42,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: C.faint,
  },
  // Worksheet (student-facing, printable) — child-friendly, age-aware
  wsAccent: { height: 7, borderRadius: 4, marginBottom: 12 },
  wsBand: { flexDirection: 'row', alignItems: 'center' },
  wsKicker: { fontSize: 9, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5 },
  wsTitle: { fontFamily: 'Helvetica-Bold', marginTop: 1 },
  wsField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.4,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 9,
    marginRight: 8,
  },
  wsIntro: { borderRadius: 10, padding: 10, marginBottom: 2 },
  wsHeadingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  wsHeadingBar: { width: 6, borderRadius: 3, marginRight: 8 },
  wsTile: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: 1.4,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginRight: 8,
    marginBottom: 7,
  },
  wsTileLabel: { fontFamily: 'Helvetica-Bold', marginTop: 6, textAlign: 'center' },
  wsCheckItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  wsTableCell: { flex: 1, borderWidth: 0.8, borderColor: '#c8cfd8', paddingVertical: 7, paddingHorizontal: 5 },
})

function Box({ checked }: { checked: boolean }) {
  return <View style={s.box}>{checked ? <View style={s.boxFill} /> : null}</View>
}

function Check({ checked, label }: { checked: boolean; label: string }) {
  return (
    <View style={s.cbRow}>
      <Box checked={checked} />
      <Text>{label}</Text>
    </View>
  )
}

/** Small heading with a colored accent bar. */
function SectionHead({ children, color }: { children: ReactNode; color: string }) {
  return (
    <View style={s.sectionHead}>
      <View style={[s.sectionAccent, { backgroundColor: color }]} />
      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 12 }}>{children}</Text>
    </View>
  )
}

// --- Age-aware sizing: younger kids get bigger text, taller lines, larger tiles.
interface WsScale {
  q: number // prompt/body font
  head: number // heading font
  line: number // writing-line height
  box: number // checkbox / number-badge size
  glyph: number // pictorial glyph size (faces, weather, colour dots)
  gap: number // vertical gap before a task
  extraLines: number // extra writing lines (young kids write big & need room)
}
function wsScale(ageLevels: string[]): WsScale {
  const young = ageLevels.includes('C1') || ageLevels.includes('C2')
  const mid = !young && ageLevels.includes('C3')
  if (young) return { q: 13, head: 16, line: 40, box: 19, glyph: 40, gap: 14, extraLines: 1 }
  if (mid) return { q: 12, head: 15, line: 33, box: 17, glyph: 35, gap: 11, extraLines: 1 }
  return { q: 11, head: 14, line: 27, box: 15, glyph: 30, gap: 9, extraLines: 0 }
}

/** Numbered circle badge that opens each task. */
function NumBadge({ n, color, size }: { n: number; color: string; size: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        marginTop: 1,
      }}
    >
      <Text style={{ color: '#fff', fontSize: size * 0.62, fontFamily: 'Helvetica-Bold' }}>{n}</Text>
    </View>
  )
}

/** Large, easy-to-tick empty box. */
function BigBox({ size, color = '#5a6473' }: { size: number; color?: string }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderWidth: 1.6,
        borderColor: color,
        borderRadius: Math.max(3, size * 0.22),
        marginRight: 8,
      }}
    />
  )
}

const COLOR_WORD: Record<string, string> = {
  grün: '#43a047', gruen: '#43a047', gelb: '#ffd21f', orange: '#fb8c00',
  rot: '#e53935', blau: '#1e88e5', grau: '#9e9e9e', rosa: '#ec407a',
  lila: '#8e24aa', violett: '#8e24aa', braun: '#795548', schwarz: '#37474f',
  türkis: '#1f8a8a', tuerkis: '#1f8a8a',
}

function ColorDot({ size, color }: { size: number; color: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Circle cx={12} cy={12} r={9} fill={color} stroke="#33415566" strokeWidth={1} />
    </Svg>
  )
}

function CloudShape({ color }: { color: string }) {
  return (
    <>
      <Circle cx={9} cy={13} r={3.6} fill={color} />
      <Circle cx={14.5} cy={11.5} r={4.4} fill={color} />
      <Rect x={5.5} y={13} width={13} height={4.6} rx={2.3} fill={color} />
    </>
  )
}

function Weather({ kind, size, color }: { kind: string; size: number; color: string }) {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315]
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      {kind === 'sun' && (
        <>
          {rays.map((a, i) => {
            const r = (a * Math.PI) / 180
            return (
              <Line
                key={i}
                x1={12 + Math.cos(r) * 6.5}
                y1={12 + Math.sin(r) * 6.5}
                x2={12 + Math.cos(r) * 9.5}
                y2={12 + Math.sin(r) * 9.5}
                stroke={color}
                strokeWidth={1.8}
              />
            )
          })}
          <Circle cx={12} cy={12} r={5} fill={color} />
        </>
      )}
      {kind === 'cloud' && <CloudShape color={color} />}
      {kind === 'rain' && (
        <>
          <CloudShape color={color} />
          {[8, 12, 16].map((x, i) => (
            <Line key={i} x1={x} y1={18.5} x2={x - 1.4} y2={22} stroke={color} strokeWidth={1.8} />
          ))}
        </>
      )}
      {kind === 'storm' && (
        <>
          <CloudShape color={color} />
          <Polygon points="12,17 9,22 11.5,22 10,24.5 15,20 12,20" fill="#f5a623" />
        </>
      )}
      {kind === 'snow' && (
        <>
          <CloudShape color={color} />
          {[8, 12, 16].map((x, i) => (
            <Circle key={i} cx={x} cy={20.5} r={1.1} fill={color} />
          ))}
        </>
      )}
    </Svg>
  )
}

/** Simple smiley whose mouth goes from sad (0) to happy (1). */
function Face({ size, happiness, color }: { size: number; happiness: number; color: string }) {
  const cy = 15 + (happiness - 0.5) * 8 // mouth control point
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Circle cx={12} cy={12} r={10} fill="#fff" stroke={color} strokeWidth={1.6} />
      <Circle cx={8.6} cy={10} r={1.3} fill={color} />
      <Circle cx={15.4} cy={10} r={1.3} fill={color} />
      <Path d={`M7.5 15 Q12 ${cy} 16.5 15`} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  )
}

/** Pick a pictorial glyph for a scale/checklist label, else null. */
function glyphFor(label: string, size: number, color: string): ReactNode {
  const k = label.toLowerCase().replace(/[^a-zäöüß]/g, '')
  for (const [w, c] of Object.entries(COLOR_WORD)) {
    if (k === w) return <ColorDot size={size} color={c} />
  }
  if (k.includes('sonn')) return <Weather kind="sun" size={size} color={color} />
  if (k.includes('wolk') || k.includes('bewölk') || k.includes('bewoelk')) return <Weather kind="cloud" size={size} color={color} />
  if (k.includes('regen') || k.includes('regn')) return <Weather kind="rain" size={size} color={color} />
  if (k.includes('gewitter') || k.includes('sturm') || k.includes('blitz') || k.includes('donner'))
    return <Weather kind="storm" size={size} color={color} />
  if (k.includes('schnee')) return <Weather kind="snow" size={size} color={color} />
  return null
}

function WriteLines({ n, h, indent = 0 }: { n: number; h: number; indent?: number }) {
  return (
    <View style={{ marginLeft: indent, marginTop: 5 }}>
      {Array.from({ length: Math.max(1, n) }).map((_, i) => (
        <View key={i} style={{ borderBottomWidth: 1.4, borderBottomColor: '#cdd5df', height: h }} />
      ))}
    </View>
  )
}

/** A task prompt: numbered colour badge + bold question text. */
function Prompt({ num, text, sc, tc }: { num: number | null; text: string; sc: WsScale; tc: { deep: string; light: string } }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      {num ? <NumBadge n={num} color={tc.deep} size={sc.box} /> : null}
      <Text style={{ flex: 1, fontSize: sc.q, fontFamily: 'Helvetica-Bold', color: C.ink, lineHeight: 1.3 }}>
        {text}
      </Text>
    </View>
  )
}

function WsBlock({
  block,
  sc,
  tc,
  num,
}: {
  block: WorksheetBlock
  sc: WsScale
  tc: { deep: string; light: string }
  num: number | null
}) {
  const { kind, text, lines, items } = block
  const indent = num ? sc.box + 8 : 0

  if (kind === 'heading')
    return (
      <View style={[s.wsHeadingRow, { marginTop: sc.gap + 4 }]} wrap={false} minPresenceAhead={70}>
        <View style={[s.wsHeadingBar, { height: sc.head + 3, backgroundColor: tc.deep }]} />
        <Text style={{ fontSize: sc.head, fontFamily: 'Helvetica-Bold', color: tc.deep }}>{text}</Text>
      </View>
    )

  if (kind === 'instruction')
    return (
      <View style={{ backgroundColor: tc.light, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 9, marginTop: 7, marginBottom: 2 }}>
        <Text style={{ fontSize: sc.q - 0.5, color: tc.deep }}>{text}</Text>
      </View>
    )

  if (kind === 'question' || (kind === 'lines' && text))
    return (
      <View wrap={false} style={{ marginTop: sc.gap }}>
        <Prompt num={num} text={text!} sc={sc} tc={tc} />
        <WriteLines n={(lines ?? 2) + sc.extraLines} h={sc.line} indent={indent} />
      </View>
    )

  if (kind === 'lines')
    return <WriteLines n={(lines ?? 3) + sc.extraLines} h={sc.line} />

  if (kind === 'box') {
    const h = Math.min(360, (lines ?? 5) * sc.line * 0.8)
    return (
      <View wrap={false} style={{ marginTop: sc.gap }}>
        {text ? <Prompt num={num} text={text} sc={sc} tc={tc} /> : null}
        <View
          style={{
            borderWidth: 1.4,
            borderColor: '#c2c9d2',
            borderStyle: 'dashed',
            borderRadius: 10,
            height: h,
            marginTop: 6,
            marginLeft: indent,
          }}
        />
      </View>
    )
  }

  if (kind === 'checklist')
    return (
      <View style={{ marginTop: sc.gap, marginLeft: indent }}>
        {(items ?? []).map((it, i) => {
          const g = glyphFor(it, sc.box + 4, tc.deep)
          return (
            <View key={i} style={s.wsCheckItem}>
              <BigBox size={sc.box} color={tc.deep} />
              {g ? <View style={{ marginRight: 6 }}>{g}</View> : null}
              <Text style={{ flex: 1, fontSize: sc.q }}>{it}</Text>
            </View>
          )
        })}
      </View>
    )

  if (kind === 'scale') {
    const its = items ?? []
    const tileW = its.length <= 4 ? 98 : its.length <= 6 ? 74 : 58
    return (
      <View style={{ marginTop: sc.gap }} wrap={false}>
        {text ? <Prompt num={num} text={text} sc={sc} tc={tc} /> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginLeft: indent }}>
          {its.map((lab, i) => {
            const g =
              glyphFor(lab, sc.glyph, tc.deep) ??
              <Face size={sc.glyph} happiness={its.length > 1 ? i / (its.length - 1) : 0.5} color={tc.deep} />
            return (
              <View key={i} style={[s.wsTile, { borderColor: tc.deep, width: tileW }]}>
                {g}
                <Text style={[s.wsTileLabel, { fontSize: sc.q - 1.5, color: C.ink }]}>{lab}</Text>
              </View>
            )
          })}
        </View>
      </View>
    )
  }

  if (kind === 'table') {
    const cols = items ?? []
    const rows = lines ?? 3
    return (
      <View style={{ marginTop: sc.gap }}>
        {text ? <Prompt num={num} text={text} sc={sc} tc={tc} /> : null}
        <View style={{ marginTop: 6, borderRadius: 8, overflow: 'hidden', borderWidth: 0.8, borderColor: '#c8cfd8' }}>
          <View style={{ flexDirection: 'row' }}>
            {cols.map((c, i) => (
              <Text key={i} style={[s.wsTableCell, { backgroundColor: tc.deep, color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: sc.q - 1.5 }]}>
                {c}
              </Text>
            ))}
          </View>
          {Array.from({ length: rows }).map((_, r) => (
            <View key={r} style={{ flexDirection: 'row' }} wrap={false}>
              {cols.map((_, c) => (
                <Text key={c} style={[s.wsTableCell, { minHeight: sc.line + 6, backgroundColor: r % 2 ? '#f6f9fc' : '#fff' }]}>
                  {' '}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </View>
    )
  }
  return null
}

function WorksheetPage({ material: m }: { material: Material }) {
  const w = m.worksheet!
  const tc = themeColor(m.themes[0])
  const sc = wsScale(m.ageLevels)
  let task = 0
  return (
    <Page size="A4" style={s.page}>
      <View style={[s.wsAccent, { backgroundColor: tc.deep }]} />
      <View style={s.wsBand}>
        <View style={[s.bannerIcon, { width: 40, height: 40, borderRadius: 20, backgroundColor: tc.deep, marginRight: 11 }]}>
          <Icon name={themeIconName(m.themes[0])} size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.wsKicker, { color: tc.deep }]}>ARBEITSBLATT</Text>
          <Text style={[s.wsTitle, { fontSize: sc.head + 4 }]}>{w.title || m.title}</Text>
        </View>
      </View>

      {/* Name / Datum fields */}
      <View style={{ flexDirection: 'row', marginTop: 10, marginBottom: 8 }}>
        <View style={[s.wsField, { borderColor: tc.deep, flex: 1 }]}>
          <Text style={{ color: tc.deep, fontFamily: 'Helvetica-Bold', fontSize: sc.q - 0.5 }}>Numm:</Text>
          <Text> </Text>
        </View>
        <View style={[s.wsField, { borderColor: tc.deep, width: 150, marginRight: 0 }]}>
          <Text style={{ color: tc.deep, fontFamily: 'Helvetica-Bold', fontSize: sc.q - 0.5 }}>Datum:</Text>
          <Text> </Text>
        </View>
      </View>

      {w.intro ? (
        <View style={[s.wsIntro, { backgroundColor: tc.light }]}>
          <Text style={{ fontSize: sc.q, color: C.ink }}>{w.intro}</Text>
        </View>
      ) : null}

      {w.blocks.map((b, i) => {
        const isTask = b.kind !== 'heading' && b.kind !== 'instruction'
        if (isTask) task += 1
        return <WsBlock key={i} block={b} sc={sc} tc={tc} num={isTask ? task : null} />
      })}

      <Text
        style={s.footer}
        render={({ pageNumber, totalPages }) =>
          `ISA-App · Arbeitsblatt · ${m.title}                          ${pageNumber} / ${totalPages}`
        }
        fixed
      />
    </Page>
  )
}

export function MaterialDocument({ material: m }: { material: Material }) {
  const has = <T,>(arr: T[], v: T) => arr.includes(v)
  const goalSet = new Set(m.eldibGoals)
  const tc = themeColor(m.themes[0])

  return (
    <Document
      title={m.title}
      author={m.author || 'ISA-App'}
      subject={m.themes.map(themeLabel).join(', ')}
      keywords={m.tags.join(', ')}
    >
      {/* ---------------- Page 1 · Deckblatt ---------------- */}
      <Page size="A4" style={s.page}>
        {/* Visual title banner with theme icon + badges */}
        <View style={[s.banner, { backgroundColor: tc.light, borderLeftWidth: 5, borderLeftColor: tc.deep }]}>
          <View style={[s.bannerIcon, { backgroundColor: tc.deep }]}>
            <Icon name={themeIconName(m.themes[0])} size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.kicker, { color: tc.deep }]}>ISA · MATERIAL</Text>
            <Text style={s.bannerTitle}>{m.title}</Text>
            <View style={s.badgeRow}>
              {m.ageLevels.map((a) => (
                <Text key={a} style={[s.badge, { backgroundColor: tc.deep }]}>{a}</Text>
              ))}
              {m.type.map((t) => (
                <Text key={t} style={[s.badgeOutline, { borderColor: tc.deep, color: tc.deep }]}>
                  {materialTypes.find((x) => x.id === t)?.labelDe ?? t}
                </Text>
              ))}
              {m.worksheet ? (
                <Text style={[s.badge, { backgroundColor: C.greenDeep }]}>+ Arbeitsblatt</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Blue block: Titel / Autor / Altersstuf */}
        <View style={[s.block, s.blockBlue]}>
          <View style={s.row}>
            <Text style={s.label}>Titel:</Text>
            <Text style={[s.value, { fontFamily: 'Helvetica-Bold' }]}>{m.title}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Duerchgefouert vum</Text>
            <Text style={s.value}>{m.author || '—'}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Altersstuf:</Text>
            <View style={[s.value, s.inlineChecks]}>
              {ageLevels.map((a) => (
                <Check key={a.id} checked={has(m.ageLevels, a.id)} label={a.label} />
              ))}
            </View>
          </View>
        </View>

        {/* Description */}
        <Text style={s.sectionLabel}>Kuerz Beschreiwung:</Text>
        <Text style={s.para}>{m.shortDescription}</Text>

        {/* Gray block: Typ + Participants */}
        <View style={[s.block, s.blockGray]}>
          <View style={[s.inlineChecks, { marginBottom: 6 }]}>
            {materialTypes.map((t) => (
              <Check key={t.id} checked={has(m.type, t.id)} label={t.id} />
            ))}
          </View>
          <View style={s.row}>
            <Text style={s.labelInk}>Participants:</Text>
            <View style={s.value}>
              {participantModes.map((p) => {
                const found = m.participants.find((x) => x.mode === p.id)
                const lbl = found?.note ? `${p.id} (${found.note})` : p.id
                return <Check key={p.id} checked={!!found} label={lbl} />
              })}
            </View>
          </View>
        </View>

        {/* Salmon block: Tags + Themeberäich (with mini icons) */}
        <View style={[s.block, s.blockSalmon]}>
          <View style={s.row}>
            <Text style={s.labelInk}>Tags:</Text>
            <Text style={s.value}>
              {m.tags.length ? m.tags.map((t) => `#${t}`).join(' ') : '—'}
            </Text>
          </View>
          <View style={[s.row, { alignItems: 'center' }]}>
            <Text style={s.labelInk}>Themeberäich:</Text>
            <View style={[s.value, { flexDirection: 'row', flexWrap: 'wrap' }]}>
              {m.themes.length
                ? m.themes.map((t) => {
                    const c = themeColor(t)
                    return (
                      <View key={t} style={[s.themeChip, { backgroundColor: c.light, borderWidth: 1, borderColor: c.deep }]}>
                        <Icon name={themeIconName(t)} size={11} color={c.deep} />
                        <Text style={[s.themeChipText, { color: c.deep }]}>{themeLabel(t)}</Text>
                      </View>
                    )
                  })
                : <Text>—</Text>}
            </View>
          </View>
        </View>

        <Text
          style={s.footer}
          render={({ pageNumber, totalPages }) =>
            `ISA-App · ${m.title}                                    ${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>

      {/* ---------------- Page 2 · Oflaf + Ziler ---------------- */}
      <Page size="A4" style={s.page}>
        <SectionHead color={tc.deep}>Oflaf</SectionHead>

        {m.ablauf.map((phase, i) => (
          <View key={i} style={[s.ablaufBox, { borderLeftColor: tc.deep }]} wrap>
            {phase.title ? <Text style={s.phaseTitle}>{phase.title}</Text> : null}
            <Text>{phase.text}</Text>
          </View>
        ))}

        {/* Dauer / Material */}
        <View style={[s.metaRow, { marginTop: 2, marginBottom: 8 }]}>
          <View style={[s.metaCell, { flex: 1 }]}>
            <Text style={s.phaseTitle}>Dauer</Text>
            <Text>{m.duration || '—'}</Text>
          </View>
          <View style={[s.metaCell, { flex: 2, borderRightWidth: 0 }]}>
            <Text style={s.phaseTitle}>Material</Text>
            <Text>{m.materialsNeeded || '—'}</Text>
          </View>
        </View>

        {m.remark ? (
          <View style={[s.ablaufBox, { marginBottom: 8, borderLeftColor: C.faint }]}>
            <Text style={s.phaseTitle}>Umierkung</Text>
            <Text>{m.remark}</Text>
          </View>
        ) : null}

        {/* ETEP-Stuf */}
        <Text style={s.sectionLabel}>Méiglech ETEP-Stuf:</Text>
        <View style={[s.inlineChecks, { marginBottom: 8 }]}>
          {etepStufen.map((e) => (
            <Check key={e.id} checked={has(m.etepStufen, e.id)} label={e.label} />
          ))}
        </View>

        {/* ELDiB grid */}
        <Text style={s.sectionLabel}>Méiglech ELDiB-Ziler:</Text>
        <View style={s.gridHeader}>
          {eldibDomains.map((d) => (
            <Text
              key={d.id}
              style={[s.gridHeadCell, { backgroundColor: d.color }]}
            >
              {d.label}
            </Text>
          ))}
        </View>
        {eldibBands.map((band, bi) => (
          <View key={bi} style={s.band} wrap={false}>
            {eldibDomains.map((d) => (
              <View key={d.id} style={s.bandCell}>
                {goalsInBand(band, d.id).map((g) => (
                  <View key={g.id} style={s.goal}>
                    <Box checked={goalSet.has(g.id)} />
                    <Text style={s.goalText}>
                      {g.label} [{g.id}]
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}

        {/* Weider passend Piècen */}
        {m.attachments?.length ? (
          <View style={{ marginTop: 10 }}>
            <Text style={s.sectionLabel}>Weider passend Piècen:</Text>
            {m.attachments.map((a, i) => (
              <Text key={i} style={s.link}>
                • {a.label} — {a.href}
              </Text>
            ))}
          </View>
        ) : null}

        <Text
          style={s.footer}
          render={({ pageNumber, totalPages }) =>
            `ISA-App · ${m.title}                                    ${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>

      {/* ---------------- Page 3 · Arbeitsblatt (optional) ---------------- */}
      {m.worksheet ? <WorksheetPage material={m} /> : null}
    </Document>
  )
}
