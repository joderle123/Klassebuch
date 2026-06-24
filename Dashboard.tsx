import { Link } from 'react-router-dom';
import { Users, ClipboardList, Target, Plus, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { DOMAINS } from '../data/domains';

export default function Dashboard() {
  const { patients, diagnosticEntries, therapyGoals, sessionNotes } = useStore();

  const recentPatients = [...patients]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const activeGoals = therapyGoals.filter((g) => g.status === 'active');

  const stats = [
    { label: 'Patienten', value: patients.length, icon: Users, color: 'bg-indigo-500' },
    { label: 'Befunde', value: diagnosticEntries.length, icon: ClipboardList, color: 'bg-emerald-500' },
    { label: 'Aktive Ziele', value: activeGoals.length, icon: Target, color: 'bg-amber-500' },
    { label: 'Sitzungen', value: sessionNotes.length, icon: ClipboardList, color: 'bg-purple-500' },
  ];

  const domainStats = DOMAINS.map((domain) => ({
    ...domain,
    count: diagnosticEntries.filter((e) => e.domain === domain.key).length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Übersicht über alle Patienten und Befunde</p>
        </div>
        <Link
          to="/patients/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neuer Patient
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`${stat.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Patients */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Letzte Patienten</h2>
            <Link to="/patients" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              Alle anzeigen <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentPatients.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-500">
              Noch keine Patienten angelegt.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentPatients.map((patient) => {
                const entryCount = diagnosticEntries.filter((e) => e.patientId === patient.id).length;
                return (
                  <li key={patient.id}>
                    <Link
                      to={`/patients/${patient.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {patient.lastName}, {patient.firstName}
                        </p>
                        <p className="text-xs text-gray-500">
                          geb. {new Date(patient.dateOfBirth).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">{entryCount} Befunde</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Domain Overview */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Befunde nach Bereich</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {domainStats.map((domain) => (
              <div key={domain.key} className="flex items-center gap-3">
                <span className={`text-sm font-medium w-44 ${domain.color}`}>{domain.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${domain.bgColor.replace('bg-', 'bg-').replace('-50', '-400')}`}
                    style={{
                      width: diagnosticEntries.length > 0
                        ? `${(domain.count / diagnosticEntries.length) * 100}%`
                        : '0%',
                    }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-8 text-right">{domain.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
