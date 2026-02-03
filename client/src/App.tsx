import { useEffect, useMemo, useState } from 'react';
import api, { setAuthToken } from './lib/api';
import Sidebar from './components/Sidebar';
import WbsTable from './components/WbsTable';
import AhspPanel from './components/AhspPanel';

export interface Project {
  id: number;
  name: string;
  location: string;
  ohPct: number;
  profitPct: number;
  contingencyPct: number;
  ppnPct: number;
  fuelEscalationPct: number;
}

export interface WbsItem {
  id: number;
  projectId: number;
  wbsCode: string;
  level: number;
  parentId: number | null;
  name: string;
  unit: string;
  quantity: number;
  remarks?: string | null;
  sortOrder: number;
}

export interface AhspLine {
  type: 'material' | 'labor' | 'equipment';
  refCode: string | null;
  name: string;
  unit: string;
  coefficient: number;
  unitPrice: number;
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
  const [activeWbs, setActiveWbs] = useState<WbsItem | null>(null);

  useEffect(() => {
    setAuthToken(token);
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    api.get<Project[]>('/projects')
      .then((response) => {
        setProjects(response.data);
        setActiveProject(response.data[0] ?? null);
      })
      .catch(() => {
        setProjects([]);
      });
  }, [token]);

  useEffect(() => {
    if (!token || !activeProject) return;
    api.get<WbsItem[]>(`/projects/${activeProject.id}/wbs`)
      .then((response) => {
        setWbsItems(response.data);
      })
      .catch(() => {
        setWbsItems([]);
      });
  }, [token, activeProject]);

  const treeItems = useMemo(() => wbsItems.sort((a, b) => a.sortOrder - b.sortOrder), [wbsItems]);

  if (!token) {
    return <Login onLogin={setToken} />;
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        projects={projects}
        activeProjectId={activeProject?.id ?? null}
        onSelectProject={(project) => {
          setActiveProject(project);
          setActiveWbs(null);
        }}
        onLogout={() => setToken(null)}
      />
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">AHSP Estimator WBS</h1>
              <p className="text-sm text-slate-500">{activeProject?.location ?? 'Mining Konawe'} · Currency IDR</p>
            </div>
            <div className="text-right text-sm">
              <div>OH: {activeProject?.ohPct ?? 0}% · Profit: {activeProject?.profitPct ?? 0}%</div>
              <div>Contingency: {activeProject?.contingencyPct ?? 0}% · PPN: {activeProject?.ppnPct ?? 0}%</div>
            </div>
          </div>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <section className="flex-1 overflow-auto p-6">
            <WbsTable
              items={treeItems}
              onSelect={setActiveWbs}
              activeId={activeWbs?.id ?? null}
            />
          </section>
          <aside className="w-[420px] border-l bg-white p-6">
            <AhspPanel
              project={activeProject}
              wbsItem={activeWbs}
              onRefresh={() => {
                if (activeProject) {
                  api.get<WbsItem[]>(`/projects/${activeProject.id}/wbs`).then((response) => {
                    setWbsItems(response.data);
                  });
                }
              }}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('admin@ahsp.local');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const response = await api.post<{ token: string }>('/auth/login', { email, password });
      onLogin(response.data.token);
    } catch {
      setError('Login gagal. Periksa email dan password.');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-900">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-2 text-2xl font-semibold">AHSP Estimator WBS</h1>
        <p className="mb-6 text-sm text-slate-500">Masuk untuk mengelola proyek jalan tambang Konawe.</p>
        {error && <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</div>}
        <label className="mb-3 block text-sm font-medium text-slate-700">
          Email
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            type="email"
          />
        </label>
        <label className="mb-4 block text-sm font-medium text-slate-700">
          Password
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            type="password"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Login
        </button>
      </form>
    </div>
  );
}
