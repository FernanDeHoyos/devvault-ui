import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AlertNotifier } from "./AlertNotifier";
import {
  LayoutDashboard,
  FolderGit2,
  Folder,
  Container,
  Terminal,
  Zap,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/projects", label: "Projects", icon: FolderGit2 },
  { to: "/workspaces", label: "Workspace", icon: Folder },
  { to: "/docker", label: "Docker", icon: Container },
  { to: "/logs", label: "Logs", icon: Terminal },
  { to: "/automation", label: "Automation", icon: Zap },
  { to: "/monitoring", label: "Monitoring", icon: BarChart3 },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  async function handleLogout() { await logout(); navigate("/login", { replace: true }); }
  return (
    <div className="flex min-h-screen flex-col bg-base text-text md:flex-row">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-surface py-4 md:sticky md:top-0 md:h-screen md:flex md:flex-col">
        <div className="px-4 pb-4 mb-2 border-b border-border">
          <span className="font-mono text-sm tracking-tight text-text">
            dev<span className="text-accent">vault</span>
          </span>
        </div>

        <nav className="flex flex-col gap-0.5 px-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-surface-raised text-text"
                    : "text-text-muted hover:text-text hover:bg-surface-raised/50"
                }`
              }
            >
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-2">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-surface-raised text-text"
                  : "text-text-muted hover:text-text hover:bg-surface-raised/50"
              }`
            }
          >
            <Settings size={16} strokeWidth={1.75} />
            Settings
          </NavLink>
          <div className="mt-3 flex items-center justify-between border-t border-border px-2 pt-3"><span className="max-w-28 truncate text-xs text-text-muted">{user?.username}</span><button onClick={handleLogout} aria-label="Cerrar sesión" title="Cerrar sesión" className="rounded-md p-2 text-text-muted hover:bg-surface-raised hover:text-text"><LogOut size={16} /></button></div>
        </div>
      </aside>
      <div className="sticky top-0 z-40 border-b border-border bg-surface md:hidden">
        <div className="flex items-center justify-between px-4 py-3"><span className="font-mono text-sm tracking-tight">dev<span className="text-accent">vault</span></span><button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-text-muted"><LogOut size={14} />Salir</button></div>
        <nav aria-label="Navegación principal" className="flex gap-1 overflow-x-auto px-2 pb-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs ${isActive ? "bg-surface-raised text-text" : "text-text-muted"}`}><Icon size={13} />{label}</NavLink>)}
        </nav>
      </div>
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
      <AlertNotifier />
    </div>
  );
}


