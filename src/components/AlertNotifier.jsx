import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BellRing, ExternalLink, X } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

function loadNotifiedAlertIds() {
  try { return new Set(JSON.parse(sessionStorage.getItem("devvault.notifiedAlerts") || "[]")); } catch { return new Set(); }
}

function AlertToast({ alert, projectName, onDismiss }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(alert.id), 12000);
    return () => window.clearTimeout(timer);
  }, [alert.id, onDismiss]);

  return <article role="alert" className="pointer-events-auto w-full max-w-sm rounded-xl border border-danger-dim bg-surface p-4 shadow-2xl">
    <div className="flex items-start gap-3">
      <BellRing size={18} className="mt-0.5 shrink-0 text-danger" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div><p className="text-sm font-medium">{projectName} no pudo iniciar</p><p className="mt-0.5 text-[11px] uppercase tracking-wide text-text-faint">{alert.type}</p></div>
          <button type="button" onClick={() => onDismiss(alert.id)} aria-label="Cerrar aviso" className="rounded p-1 text-text-faint hover:bg-surface-raised hover:text-text"><X size={14} /></button>
        </div>
        <p className="mt-2 break-words text-xs leading-relaxed text-text-muted">{alert.message}</p>
        <p className="mt-2 text-[11px] text-text-faint">{new Date(alert.createdAt).toLocaleTimeString()}</p>
        <Link to="/monitoring" onClick={() => onDismiss(alert.id)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline">
          Ver alerta en Monitoring <ExternalLink size={12} />
        </Link>
      </div>
    </div>
  </article>;
}

export function AlertNotifier() {
  const seenIds = useRef(loadNotifiedAlertIds());
  
  const [notifications, setNotifications] = useState([]);
  const { data: alertData, isFetched } = useQuery({
    queryKey: ["global-active-alert-notifications"],
    queryFn: () => api.listAlerts({ status: "ACTIVE" }),
    refetchInterval: 5000,
    retry: false,
  });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => api.listProjects(), staleTime: 60000 });
  const alerts = alertData || [];

  useEffect(() => {
    if (!isFetched) return;
    const fresh = alerts.filter((alert) => !seenIds.current.has(alert.id))
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
    if (!fresh.length) return;
    fresh.forEach((alert) => seenIds.current.add(alert.id));
    sessionStorage.setItem("devvault.notifiedAlerts", JSON.stringify(Array.from(seenIds.current).slice(-100)));
    setNotifications((current) => [...current, ...fresh.slice(0, 4)].slice(-4));
  }, [alerts, isFetched]);

  const dismiss = useCallback((id) => {
    setNotifications((current) => current.filter((alert) => alert.id !== id));
  }, []);

  if (!notifications.length) return null;
  return <div aria-label="Avisos de DevVault" aria-live="assertive" className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100vw-2rem)] flex-col gap-2 sm:w-auto">
    {notifications.map((alert) => <AlertToast key={alert.id} alert={alert} projectName={projects.find((project) => project.id === alert.projectId)?.name || "El proyecto"} onDismiss={dismiss} />)}
  </div>;
}




