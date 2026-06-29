import type { Material } from '../../types/material'

// ---------------------------------------------------------------------------
// Faithfully digitised originals from the reference/ PDFs. These seed the
// library and double as ground truth for the PDF template.
// ---------------------------------------------------------------------------

export const originals: Material[] = [
  {
    id: 'reframing',
    title: 'Reframing: Mëch selwer nei gesinn',
    author: 'Liss Mathey',
    ageLevels: ['C4', 'ES'],
    type: ['Aktivitéit'],
    participants: [{ mode: 'Grupp', note: '+/- 8 Kanner' }],
    themes: ['selbstwahrnehmung', 'fremdwahrnehmung', 'selbstwertgefuehl'],
    tags: ['Selbstwahrnehmung', 'Fremdwahrnehmung', 'Selbstbild', 'Reframing'],
    shortDescription:
      'An dëser Aktivitéit setzen sech d’Jugendlecher mat negative Selbstzouschreiwungen auserneen, wéi z. B. „Ech sinn ze haart“, „Ech sinn ze nervös“ oder „Ech sinn ze roueg“. Dës Iwwerzeegungen hunn dacks hiren Ursprong an der Fremdwahrnehmung – also an deem, wat si vun aneren iwwer sech héieren hunn a goufen doropshin an dat eegent Selbstbild internaliséiert. An der Grupp ginn dës Aussoen zesummen ëmgeduecht (reframed): d’Participante fannen nei, positiv Perspektiven op dat selwecht Verhalen. Reframing bedeit, eng Eegenschaft oder Situatioun aus engem anere Bléckwénkel ze gesinn – also eng negativ Iddi an eng méiglech Stäerkt oder Ressource ëmzedeiten.',
    ablauf: [
      {
        title: 'Uleedung',
        text: 'D’Aktivitéit fänkt mat engem kuerze Gespréich un, andeems d’Fro un d’Grupp gestallt gëtt, ob se Aussoe kennen, déi mat „Ech sinn ze …“ ufänken. Dann gi Beispiller wéi ze haart, ze roueg oder ze vill notéiert. Duerno gëtt erkläert, datt mir esou Sätz dacks vun dobaussen héieren – vu Frënn, Elteren oder Léierpersounen – an datt mir se mat der Zäit selwer gleewen a an eist Selbstbild ophuelen.',
      },
      {
        text: 'All Participant schreift ee bis zwee Sätz op, déi en dacks vu baussen héiert oder selwer iwwer sech denkt („Ech sinn ze ...“). Dës ginn op fräiwëlleger Basis an der Grupp gedeelt. D’Grupp sicht zesummen nei, positiv oder neutral Formuléierunge fir all Ausso. Aus „Ech sinn ze haart“ ka „Ech traue mech, meng Meenung ze soen“ ginn, aus „Ech sinn ze roueg“ „Ech ka gutt nolauschteren“. Den Erwuessene passt drop op, datt all Feedback respektvoll a positiv bleift.',
      },
      {
        title: 'Ofschloss',
        text: 'Zum Ofschloss gëtt et eng kuerz Reflexiounsronn mat Froen: „Wat war fir mech iwwerraschend?“, „Wat hunn ech haut Neies iwwer mech geléiert?“ oder „Wéi fillt et sech un, eng Eegenschaft anescht ze gesinn?“. All Participant nennt e Saz oder Wuert, deen hie fir sech mat hëlt.',
      },
    ],
    duration: '45 Minutten',
    materialsNeeded: 'Pabeier / Kaarten, Stëfter, Tafel',
    etepStufen: [3, 4, 5],
    eldibGoals: [
      'V-19', 'V-20', 'V-22', 'V-24', 'V-26', 'V-28', 'V-30',
      'K-15', 'K-16', 'K-17', 'K-18', 'K-19', 'K-20', 'K-21',
      'K-24', 'K-25', 'K-26', 'K-28', 'K-32',
      'SOZ-21', 'SOZ-27', 'SOZ-31', 'SOZ-32', 'SOZ-33', 'SOZ-34', 'SOZ-35', 'SOZ-37',
    ],
    attachments: [
      {
        label: 'Unterrichtseinheit „Ich bin zu …“ (bpb)',
        href: 'https://www.bpb.de/lernen/angebote/vorbild/506699/unterrichtseinheit-4-8-ich-bin-zu/',
        kind: 'link',
      },
    ],
    language: 'lb',
    source: 'original',
  },
]
