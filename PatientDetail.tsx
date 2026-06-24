import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Stethoscope,
  Target,
  FileText,
  Trash2,
  Plus,
  Check,
  Pause,
  X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { DOMAINS, getDomainByKey } from '../data/domains';
import type { DiagnosticDomain, TherapyGoal, SessionNote } from '../types';

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = useStore();
  const patient = store.getPatient(id!);
  const entries = store.getEntriesForPatient(id!);
  const goals = store.getGoalsForPatient(id!);
  const notes = store.getNotesForPatient(id!);

  const [activeTab, setActiveTab] = useState<'overview' | 'goals' | 'sessions'>('overview');
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Patient nicht gefunden.</p>
        <Link to="/patients" className="text-indigo-600 text-sm mt-2 inline-block">
          Zurück zur Liste
        </Link>
      </div>
    );
  }

  const handleDelete = () => {
    if (window.confirm(`${patient.firstName} ${patient.lastName} wirklich löschen?`)) {
      store.deletePatient(patient.id);
      navigate('/patients');
    }
  };

  const severityLabel = (s: string) =>
    ({ normal: 'Unauffällig', mild: 'Leicht', moderate: 'Mittel', severe: 'Schwer' })[s] ?? s;

  const severityColor = (s: string) =>
    ({
      normal: 'bg-green-100 text-green-700',
      mild: 'bg-yellow-100 text-yellow-700',
      moderate: 'bg-orange-100 text-orange-700',
      severe: 'bg-red-100 text-red-700',
    })[s] ?? 'bg-gray-100 text-gray-700';

  const entriesByDomain = DOMAINS.map((domain) => ({
    domain,
    entries: entries.filter((e) => e.domain === domain.key),
  })).filter((g) => g.entries.length > 0);

  const tabs = [
    { key: 'overview' as const, label: 'Befunde', icon: Stethoscope },
    { key: 'goals' as const, label: 'Ziele', icon: Target },
    { key: 'sessions' as const, label: 'Sitzungen', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/patients')} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-sm text-gray-500">
              geb. {new Date(patient.dateOfBirth).toLocaleDateString('de-DE')} ·{' '}
              Bezugsperson: {patient.guardianName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/patients/${patient.id}/diagnostic`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Befund erfassen
          </Link>
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {entries.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
              <p className="text-sm text-gray-500">Noch keine Befunde erfasst.</p>
              <Link
                to={`/patients/${patient.id}/diagnostic`}
                className="text-sm text-indigo-600 hover:text-indigo-700 mt-2 inline-block"
              >
                Jetzt Befund erfassen
              </Link>
            </div>
          ) : (
            entriesByDomain.map(({ domain, entries: domainEntries }) => (
              <div key={domain.key} className="bg-white rounded-xl border border-gray-200">
                <div className={`px-5 py-3 border-b border-gray-100 ${domain.bgColor} rounded-t-xl`}>
                  <h3 className={`text-sm font-semibold ${domain.color}`}>{domain.label}</h3>
                </div>
                <ul className="divide-y divide-gray-50">
                  {domainEntries.map((entry) => (
                    <li key={entry.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{entry.subDomain}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{entry.finding}</p>
                        {entry.notes && (
                          <p className="text-xs text-gray-400 mt-0.5">{entry.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.assessmentTool && (
                          <span className="text-xs text-gray-400">{entry.assessmentTool}</span>
                        )}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${severityColor(entry.severity)}`}>
                          {severityLabel(entry.severity)}
                        </span>
                        <button
                          onClick={() => store.deleteDiagnosticEntry(entry.id)}
                          className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'goals' && (
        <GoalsTab
          goals={goals}
          patientId={patient.id}
          showForm={showGoalForm}
          setShowForm={setShowGoalForm}
        />
      )}

      {activeTab === 'sessions' && (
        <SessionsTab
          notes={notes}
          patientId={patient.id}
          showForm={showNoteForm}
          setShowForm={setShowNoteForm}
        />
      )}
    </div>
  );
}

function GoalsTab({
  goals,
  patientId,
  showForm,
  setShowForm,
}: {
  goals: TherapyGoal[];
  patientId: string;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
}) {
  const { addTherapyGoal, updateTherapyGoal, deleteTherapyGoal } = useStore();
  const [domain, setDomain] = useState<DiagnosticDomain>('motorik_grob');
  const [description, setDescription] = useState('');

  const handleAdd = () => {
    if (!description.trim()) return;
    addTherapyGoal({ patientId, domain, description, status: 'active' });
    setDescription('');
    setShowForm(false);
  };

  const statusIcon = (s: string) => {
    if (s === 'achieved') return <Check className="w-3.5 h-3.5 text-green-600" />;
    if (s === 'paused') return <Pause className="w-3.5 h-3.5 text-yellow-600" />;
    return <Target className="w-3.5 h-3.5 text-indigo-600" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neues Ziel
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value as DiagnosticDomain)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            {DOMAINS.map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Zielbeschreibung..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">
              Abbrechen
            </button>
            <button onClick={handleAdd} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Speichern
            </button>
          </div>
        </div>
      )}

      {goals.length === 0 && !showForm ? (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center text-sm text-gray-500">
          Noch keine Therapieziele definiert.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {goals.map((goal) => {
            const domainInfo = getDomainByKey(goal.domain);
            return (
              <div key={goal.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {statusIcon(goal.status)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{goal.description}</p>
                    <p className={`text-xs ${domainInfo?.color ?? 'text-gray-500'}`}>
                      {domainInfo?.label}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {goal.status === 'active' && (
                    <>
                      <button
                        onClick={() => updateTherapyGoal(goal.id, { status: 'achieved' })}
                        className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600"
                        title="Erreicht"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => updateTherapyGoal(goal.id, { status: 'paused' })}
                        className="p-1 rounded hover:bg-yellow-50 text-gray-400 hover:text-yellow-600"
                        title="Pausieren"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {goal.status !== 'active' && (
                    <button
                      onClick={() => updateTherapyGoal(goal.id, { status: 'active' })}
                      className="p-1 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-600"
                      title="Aktivieren"
                    >
                      <Target className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteTherapyGoal(goal.id)}
                    className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SessionsTab({
  notes,
  patientId,
  showForm,
  setShowForm,
}: {
  notes: SessionNote[];
  patientId: string;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
}) {
  const { addSessionNote, deleteSessionNote } = useStore();
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    duration: 45,
    activities: '',
    observations: '',
    progress: '',
    nextSteps: '',
  });

  const handleAdd = () => {
    addSessionNote({
      patientId,
      date: form.date,
      duration: form.duration,
      domains: [],
      activities: form.activities,
      observations: form.observations,
      progress: form.progress,
      nextSteps: form.nextSteps,
    });
    setForm({ date: new Date().toISOString().split('T')[0], duration: 45, activities: '', observations: '', progress: '', nextSteps: '' });
    setShowForm(false);
  };

  const sortedNotes = [...notes].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neue Sitzung
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Datum</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Dauer (Min.)</label>
              <input
                type="number"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Aktivitäten</label>
            <textarea value={form.activities} onChange={(e) => setForm({ ...form, activities: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Beobachtungen</label>
            <textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fortschritt</label>
            <textarea value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nächste Schritte</label>
            <textarea value={form.nextSteps} onChange={(e) => setForm({ ...form, nextSteps: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Abbrechen</button>
            <button onClick={handleAdd} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Speichern</button>
          </div>
        </div>
      )}

      {sortedNotes.length === 0 && !showForm ? (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center text-sm text-gray-500">
          Noch keine Sitzungen dokumentiert.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedNotes.map((note) => (
            <div key={note.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(note.date).toLocaleDateString('de-DE')}
                  </span>
                  <span className="text-xs text-gray-400">{note.duration} Min.</span>
                </div>
                <button
                  onClick={() => deleteSessionNote(note.id)}
                  className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {note.activities && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-gray-500">Aktivitäten</p>
                  <p className="text-sm text-gray-700">{note.activities}</p>
                </div>
              )}
              {note.observations && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-gray-500">Beobachtungen</p>
                  <p className="text-sm text-gray-700">{note.observations}</p>
                </div>
              )}
              {note.progress && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-gray-500">Fortschritt</p>
                  <p className="text-sm text-gray-700">{note.progress}</p>
                </div>
              )}
              {note.nextSteps && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Nächste Schritte</p>
                  <p className="text-sm text-gray-700">{note.nextSteps}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
