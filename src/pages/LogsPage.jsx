import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import { api } from "../lib/api";

const WS_BASE = import.meta.env.DEV
  ? "ws://127.0.0.1:8080/api/v1"
  : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/v1`;
const MAX_LOG_LINES = 2000;

function useLogStreams(projectId, serviceNames) {
  const [lines, setLines] = useState([]);
  const [connectionStates, setConnectionStates] = useState({});
  const lineId = useRef(0);
  const servicesKey = serviceNames.join("\u001f");

  useEffect(() => {
    const names = servicesKey ? servicesKey.split("\u001f") : [];
    setLines([]);
    if (!projectId || names.length === 0) {
      setConnectionStates({});
      return undefined;
    }

    let active = true;
    const sockets = new Map();
    setConnectionStates(Object.fromEntries(names.map((name) => [name, "connecting"])));

    names.forEach((serviceName) => {
      try {
        const query = new URLSearchParams({ service: serviceName });
        const socket = new WebSocket(`${WS_BASE}/projects/${projectId}/logs?${query}`);
        sockets.set(serviceName, socket);
        socket.onopen = () => {
          if (active) setConnectionStates((previous) => ({ ...previous, [serviceName]: "open" }));
        };
        socket.onerror = () => {
          if (active) setConnectionStates((previous) => ({ ...previous, [serviceName]: "error" }));
        };
        socket.onclose = () => {
          if (active) setConnectionStates((previous) => ({ ...previous, [serviceName]: "closed" }));
        };
        socket.onmessage = (event) => {
          if (!active) return;
          let entry;
          try {
            const parsed = JSON.parse(event.data);
            entry = typeof parsed === "string" ? { message: parsed } : parsed;
          } catch {
            entry = { message: event.data };
          }
          lineId.current += 1;
          setLines((previous) => [...previous, {
            ...entry,
            id: lineId.current,
            serviceName,
            message: String(entry.message ?? ""),
            timestamp: entry.timestamp || "",
          }].slice(-MAX_LOG_LINES));
        };
      } catch {
        setConnectionStates((previous) => ({ ...previous, [serviceName]: "error" }));
      }
    });

    return () => {
      active = false;
      sockets.forEach((socket) => socket.close());
    };
  }, [projectId, servicesKey]);

  return { lines, connectionStates };
}

function getLogLevel(line) {
  const suppliedLevel = String(line.level || "").toUpperCase();
  if (suppliedLevel && suppliedLevel !== "INFO") return suppliedLevel;
  const message = line.message || "";
  if (/\b(error|fatal|exception|failed)\b/i.test(message)) return "ERROR";
  if (/\b(warn|warning)\b/i.test(message)) return "WARN";
  if (/\b(debug|trace)\b/i.test(message)) return "DEBUG";
  return suppliedLevel || "INFO";
}

function formatTimestamp(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return Number.isNaN(date.valueOf()) ? "" : date.toLocaleTimeString();
}

function connectionSummary(states, count) {
  if (count === 0) return { label: "sin servicios activos", color: "text-text-faint" };
  const values = Object.values(states);
  const open = values.filter((state) => state === "open").length;
  if (open === count) return { label: `${open} servicio${open === 1 ? "" : "s"} en vivo`, color: "text-accent" };
  if (open > 0) return { label: `${open}/${count} servicios conectados`, color: "text-warning" };
  if (values.some((state) => state === "connecting")) return { label: "conectando…", color: "text-warning" };
  if (values.some((state) => state === "error")) return { label: "error de conexión", color: "text-danger" };
  return { label: "desconectado", color: "text-text-faint" };
}

export function LogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get("project") || "";
  const serviceName = searchParams.get("service") || "";
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const scrollRef = useRef(null);

  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => api.listProjects() });
  const { data: services } = useQuery({
    queryKey: ["projects", projectId, "services"],
    queryFn: () => api.projectServices(projectId),
    enabled: !!projectId,
  });

  const selectedServices = useMemo(() => {
    if (!projectId || !services) return [];
    const runningServices = services.filter((service) => service.status === "RUNNING");
    if (serviceName) return runningServices.some((service) => service.name === serviceName) ? [serviceName] : [];
    return runningServices.map((service) => service.name);
  }, [projectId, serviceName, services]);
  const { lines, connectionStates } = useLogStreams(projectId, selectedServices);
  const summary = connectionSummary(connectionStates, selectedServices.length);

  const filteredLines = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return lines.filter((line) => {
      const level = getLogLevel(line);
      const matchesLevel = levelFilter === "ALL" || level === levelFilter;
      const haystack = `${line.serviceName} ${level} ${line.message}`.toLocaleLowerCase();
      return matchesLevel && (!query || haystack.includes(query));
    });
  }, [lines, search, levelFilter]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [filteredLines]);

  const exportLogs = () => {
    if (filteredLines.length === 0) return;
    const content = filteredLines.map((line) => {
      const timestamp = line.timestamp || "sin hora";
      return `${timestamp} [${getLogLevel(line)}] [${line.serviceName}] ${line.message}`;
    }).join("\n");
    const file = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `devvault-logs-${new Date().toISOString().replaceAll(":", "-")}.log`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const changeProject = (nextProjectId) => setSearchParams(nextProjectId ? { project: nextProjectId } : {});
  const changeService = (nextService) => setSearchParams({ project: projectId, ...(nextService ? { service: nextService } : {}) });
  const activeServices = services?.filter((service) => service.status === "RUNNING") || [];

  return <div className="space-y-4">
    <header>
      <p className="text-xs uppercase tracking-[0.18em] text-accent">Diagnóstico en vivo</p>
      <h1 className="mt-1 text-2xl font-semibold">Logs</h1>
      <p className="mt-1 text-xs text-text-muted">Combina servicios activos, busca texto y exporta el resultado filtrado.</p>
    </header>

    <section className="space-y-3 rounded-xl border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={projectId} onChange={(event) => changeProject(event.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-border-strong">
          <option value="">Selecciona un proyecto…</option>
          {projects?.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>

        <select value={serviceName} onChange={(event) => changeService(event.target.value)} disabled={!projectId}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-border-strong disabled:opacity-50">
          <option value="">Todos los servicios activos</option>
          {activeServices.map((service) => <option key={service.id} value={service.name}>{service.name}</option>)}
        </select>

        <span className={`ml-auto inline-flex items-center gap-1.5 text-xs font-mono ${summary.color}`}>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />{summary.label}
        </span>
      </div>

      {selectedServices.length > 1 && <div className="flex flex-wrap gap-1.5" aria-label="Estado de conexiones por servicio">
        {selectedServices.map((name) => {
          const state = connectionStates[name] || "connecting";
          const color = state === "open" ? "text-accent" : state === "error" ? "text-danger" : "text-text-faint";
          return <span key={name} className={`rounded border border-border px-2 py-0.5 text-[11px] ${color}`}>{name}: {state}</span>;
        })}
      </div>}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <label className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en logs…"
            className="w-full rounded-md border border-border bg-base py-1.5 pl-8 pr-3 text-xs outline-none focus:border-accent/60" />
        </label>
        <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}
          className="rounded-md border border-border bg-base px-2.5 py-1.5 text-xs text-text">
          <option value="ALL">Todos los niveles</option>
          <option value="ERROR">Errores</option><option value="WARN">Advertencias</option>
          <option value="INFO">Información</option><option value="DEBUG">Debug</option>
        </select>
        <span className="text-xs text-text-faint">{filteredLines.length}/{lines.length} líneas</span>
        <button type="button" onClick={exportLogs} disabled={filteredLines.length === 0}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-text-muted hover:text-text disabled:opacity-40">
          <Download size={13} /> Exportar .log
        </button>
      </div>
    </section>

    <div ref={scrollRef} className="h-[min(65vh,620px)] overflow-y-auto rounded-xl border border-border bg-surface p-4 font-mono text-xs leading-relaxed">
      {filteredLines.length === 0 && <p className="py-4 text-center text-text-faint">
        {!projectId ? "Elige un proyecto para conectar sus logs." : selectedServices.length === 0 ? "No hay servicios activos para seguir." : lines.length === 0 ? "Esperando líneas de log…" : "No hay líneas que coincidan con estos filtros."}
      </p>}
      {filteredLines.map((line) => {
        const level = getLogLevel(line);
        const levelColor = level === "ERROR" ? "text-danger" : level === "WARN" ? "text-warning" : "text-text-muted";
        return <div key={line.id} className={`grid grid-cols-[auto_auto_1fr] gap-x-2 border-b border-border/40 py-1 last:border-0 ${levelColor}`}>
          <span className="text-text-faint">{formatTimestamp(line.timestamp)}</span>
          <span className="text-accent">[{line.serviceName}]</span>
          <span className="whitespace-pre-wrap break-words">{line.message}</span>
        </div>;
      })}
    </div>
    <p className="text-xs text-text-faint">Se conservan las últimas {MAX_LOG_LINES} líneas recibidas en esta vista. Si el runtime no envía nivel, DevVault lo infiere por palabras como error, warn o debug.</p>
  </div>;
}
