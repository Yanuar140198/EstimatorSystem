import { Project } from '../App';

interface SidebarProps {
  projects: Project[];
  activeProjectId: number | null;
  onSelectProject: (project: Project) => void;
  onLogout: () => void;
}

export default function Sidebar({ projects, activeProjectId, onSelectProject, onLogout }: SidebarProps) {
  return (
    <aside className="flex w-72 flex-col border-r bg-slate-950 text-white">
      <div className="px-6 py-6">
        <h2 className="text-lg font-semibold">Projects</h2>
        <p className="text-xs text-slate-400">Mining Konawe · IDR</p>
      </div>
      <div className="flex-1 overflow-auto px-4">
        <ul className="space-y-2">
          {projects.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                onClick={() => onSelectProject(project)}
                className={`w-full rounded-lg px-4 py-3 text-left text-sm transition ${
                  activeProjectId === project.id ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-200'
                }`}
              >
                <div className="font-semibold">{project.name}</div>
                <div className="text-xs text-slate-400">{project.location}</div>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-slate-800 px-4 py-4">
        <button
          type="button"
          onClick={onLogout}
          className="w-full rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
