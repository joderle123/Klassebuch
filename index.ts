export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'diverse';
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  referralSource: string;
  referralReason: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiagnosticEntry {
  id: string;
  patientId: string;
  date: string;
  domain: DiagnosticDomain;
  subDomain: string;
  finding: string;
  severity: 'normal' | 'mild' | 'moderate' | 'severe';
  notes: string;
  assessmentTool?: string;
}

export type DiagnosticDomain =
  | 'motorik_grob'
  | 'motorik_fein'
  | 'wahrnehmung'
  | 'sprache'
  | 'kognition'
  | 'sozial_emotional'
  | 'selbststaendigkeit';

export interface DomainInfo {
  key: DiagnosticDomain;
  label: string;
  color: string;
  bgColor: string;
  subDomains: string[];
  assessmentTools: string[];
}

export interface TherapyGoal {
  id: string;
  patientId: string;
  domain: DiagnosticDomain;
  description: string;
  status: 'active' | 'achieved' | 'paused';
  createdAt: string;
  targetDate?: string;
}

export interface SessionNote {
  id: string;
  patientId: string;
  date: string;
  duration: number;
  domains: DiagnosticDomain[];
  activities: string;
  observations: string;
  progress: string;
  nextSteps: string;
}
