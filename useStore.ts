import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Patient, DiagnosticEntry, TherapyGoal, SessionNote } from '../types';

interface AppState {
  patients: Patient[];
  diagnosticEntries: DiagnosticEntry[];
  therapyGoals: TherapyGoal[];
  sessionNotes: SessionNote[];

  addPatient: (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  getPatient: (id: string) => Patient | undefined;

  addDiagnosticEntry: (entry: Omit<DiagnosticEntry, 'id'>) => void;
  updateDiagnosticEntry: (id: string, updates: Partial<DiagnosticEntry>) => void;
  deleteDiagnosticEntry: (id: string) => void;
  getEntriesForPatient: (patientId: string) => DiagnosticEntry[];

  addTherapyGoal: (goal: Omit<TherapyGoal, 'id' | 'createdAt'>) => void;
  updateTherapyGoal: (id: string, updates: Partial<TherapyGoal>) => void;
  deleteTherapyGoal: (id: string) => void;
  getGoalsForPatient: (patientId: string) => TherapyGoal[];

  addSessionNote: (note: Omit<SessionNote, 'id'>) => void;
  updateSessionNote: (id: string, updates: Partial<SessionNote>) => void;
  deleteSessionNote: (id: string) => void;
  getNotesForPatient: (patientId: string) => SessionNote[];
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      patients: [],
      diagnosticEntries: [],
      therapyGoals: [],
      sessionNotes: [],

      addPatient: (patientData) => {
        const id = uuidv4();
        const now = new Date().toISOString();
        const patient: Patient = {
          ...patientData,
          id,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ patients: [...state.patients, patient] }));
        return id;
      },

      updatePatient: (id, updates) => {
        set((state) => ({
          patients: state.patients.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        }));
      },

      deletePatient: (id) => {
        set((state) => ({
          patients: state.patients.filter((p) => p.id !== id),
          diagnosticEntries: state.diagnosticEntries.filter((e) => e.patientId !== id),
          therapyGoals: state.therapyGoals.filter((g) => g.patientId !== id),
          sessionNotes: state.sessionNotes.filter((n) => n.patientId !== id),
        }));
      },

      getPatient: (id) => get().patients.find((p) => p.id === id),

      addDiagnosticEntry: (entryData) => {
        const entry: DiagnosticEntry = { ...entryData, id: uuidv4() };
        set((state) => ({ diagnosticEntries: [...state.diagnosticEntries, entry] }));
      },

      updateDiagnosticEntry: (id, updates) => {
        set((state) => ({
          diagnosticEntries: state.diagnosticEntries.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        }));
      },

      deleteDiagnosticEntry: (id) => {
        set((state) => ({
          diagnosticEntries: state.diagnosticEntries.filter((e) => e.id !== id),
        }));
      },

      getEntriesForPatient: (patientId) =>
        get().diagnosticEntries.filter((e) => e.patientId === patientId),

      addTherapyGoal: (goalData) => {
        const goal: TherapyGoal = {
          ...goalData,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ therapyGoals: [...state.therapyGoals, goal] }));
      },

      updateTherapyGoal: (id, updates) => {
        set((state) => ({
          therapyGoals: state.therapyGoals.map((g) =>
            g.id === id ? { ...g, ...updates } : g
          ),
        }));
      },

      deleteTherapyGoal: (id) => {
        set((state) => ({
          therapyGoals: state.therapyGoals.filter((g) => g.id !== id),
        }));
      },

      getGoalsForPatient: (patientId) =>
        get().therapyGoals.filter((g) => g.patientId === patientId),

      addSessionNote: (noteData) => {
        const note: SessionNote = { ...noteData, id: uuidv4() };
        set((state) => ({ sessionNotes: [...state.sessionNotes, note] }));
      },

      updateSessionNote: (id, updates) => {
        set((state) => ({
          sessionNotes: state.sessionNotes.map((n) =>
            n.id === id ? { ...n, ...updates } : n
          ),
        }));
      },

      deleteSessionNote: (id) => {
        set((state) => ({
          sessionNotes: state.sessionNotes.filter((n) => n.id !== id),
        }));
      },

      getNotesForPatient: (patientId) =>
        get().sessionNotes.filter((n) => n.patientId === patientId),
    }),
    {
      name: 'paedpath-storage',
    }
  )
);
