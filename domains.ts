import type { DomainInfo } from '../types';

export const DOMAINS: DomainInfo[] = [
  {
    key: 'motorik_grob',
    label: 'Grobmotorik',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    subDomains: [
      'Gleichgewicht',
      'Koordination',
      'Kraft',
      'Ausdauer',
      'Bewegungsplanung',
      'Tonus',
      'Haltungskontrolle',
    ],
    assessmentTools: [
      'M-ABC-2',
      'BOT-2',
      'ZNA',
      'Klinische Beobachtung',
    ],
  },
  {
    key: 'motorik_fein',
    label: 'Feinmotorik',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    subDomains: [
      'Handgeschicklichkeit',
      'Graphomotorik',
      'Schneiden',
      'Hand-Auge-Koordination',
      'Greifformen',
      'Stifthaltung',
      'Kraftdosierung',
    ],
    assessmentTools: [
      'FEW-JE',
      'HPG',
      'GMT',
      'Klinische Beobachtung',
    ],
  },
  {
    key: 'wahrnehmung',
    label: 'Wahrnehmung',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    subDomains: [
      'Visuell',
      'Auditiv',
      'Taktil-kinästhetisch',
      'Vestibulär',
      'Propriozeptiv',
      'Intermodal',
    ],
    assessmentTools: [
      'FEW-3',
      'DTVP-3',
      'SPM',
      'Sensorisches Profil',
      'Klinische Beobachtung',
    ],
  },
  {
    key: 'sprache',
    label: 'Sprache / Kommunikation',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    subDomains: [
      'Sprachverständnis',
      'Sprachproduktion',
      'Wortschatz',
      'Pragmatik',
      'Mundmotorik',
    ],
    assessmentTools: [
      'SETK',
      'Klinische Beobachtung',
      'Elternfragebogen',
    ],
  },
  {
    key: 'kognition',
    label: 'Kognition',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    subDomains: [
      'Aufmerksamkeit',
      'Konzentration',
      'Merkfähigkeit',
      'Problemlösen',
      'Handlungsplanung',
      'Exekutive Funktionen',
    ],
    assessmentTools: [
      'TEA-Ch',
      'KiTAP',
      'Klinische Beobachtung',
    ],
  },
  {
    key: 'sozial_emotional',
    label: 'Sozial-Emotional',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    subDomains: [
      'Emotionsregulation',
      'Soziale Interaktion',
      'Spielverhalten',
      'Selbstbewusstsein',
      'Frustrationstoleranz',
      'Regelverständnis',
    ],
    assessmentTools: [
      'SDQ',
      'CBCL',
      'Klinische Beobachtung',
      'Elternfragebogen',
    ],
  },
  {
    key: 'selbststaendigkeit',
    label: 'Selbstständigkeit / ADL',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    subDomains: [
      'An-/Ausziehen',
      'Essen/Trinken',
      'Körperpflege',
      'Schreiben',
      'Schulranzen packen',
      'Organisation',
    ],
    assessmentTools: [
      'COPM',
      'PEDI',
      'Klinische Beobachtung',
      'Elternfragebogen',
    ],
  },
];

export function getDomainByKey(key: string): DomainInfo | undefined {
  return DOMAINS.find((d) => d.key === key);
}
