import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

const WS_BASE = "ws://127.0.0.1:8080/api/v1";

function useLogStream(projectId, serviceName) {
  const [lines, setLines] = useState([]);
  const [connectionState, setConnectionState] = useState("idle"); // idle | connecting | open | closed | error

  useEffect(() => {
    if (!projectId || !serviceName) { setConnectionState("idle"); setLines([]); return; }

    setLines([]);
    setConnectionState("connecting");

    let active = true;
    let ws;
    api.createWebSocketTicket(projectId, serviceName).then(({ ticket }) => {
      if (!active) return;
      const query = new URLSearchParams({ service: serviceName, ticket });
      ws = new WebSocket(`${WS_BASE}/projects/${projectId}/logs?${query}`);
      ws.onopen = () => setConnectionState("open");
      ws.onclose = () => setConnectionState("closed");
      ws.onerror = () => setConnectionState("error");
      ws.onmessage = (event) => { try { const parsed = JSON.parse(event.data); setLines((prev) => [...prev.slice(-500), parsed]); } catch { setLines((prev) => [...prev.slice(-500), { message: event.data, timestamp: "" }]); } };
    }).catch(() => { if (active) setConnectionState("error"); });
    return () => { active = false; ws?.close(); };
  }, [projectId, serviceName]);

  return { lines, connectionState };
}

export function LogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get("project") || "";
  const serviceName = searchParams.get("service") || "";
  const scrollRef = useRef(null);

  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => api.listProjects() });
  const { data: services } = useQuery({
    queryKey: ["projects", projectId, "services"],
    queryFn: () => api.projectServices(projectId),
    enabled: !!projectId,
  });

  const { lines, connectionState } = useLogStream(projectId, serviceName);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  const statusColor = {
    idle: "text-text-faint",
    connecting: "text-warning",
    open: "text-accent",
    closed: "text-text-faint",
    error: "text-danger",
  }[connectionState];

  const statusLabel = {
    idle: "selecciona un servicio",
    connecting: "conectando…",
    open: "en vivo",
    closed: "desconectado",
    error: "error de conexión",
  }[connectionState];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Logs</h1>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3">
        <select
          value={projectId}
          onChange={(e) => setSearchParams({ project: e.target.value, service: "" })}
          className="bg-surface border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:border-border-strong"
        >
          <option value="">Selecciona un proyecto…</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={serviceName}
          onChange={(e) => setSearchParams({ project: projectId, service: e.target.value })}
          disabled={!projectId}
          className="bg-surface border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:border-border-strong disabled:opacity-50"
        >
          <option value="">Selecciona un servicio…</option>
          {services?.map((s) => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>

        <span className={`ml-auto flex items-center gap-1.5 text-xs font-mono ${statusColor}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
          {statusLabel}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="h-[min(65vh,620px)] overflow-y-auto rounded-xl border border-border bg-surface p-4 font-mono text-xs leading-relaxed"
      >
        {lines.length === 0 && (
          <p className="text-text-faint">
            {projectId && serviceName ? "Esperando líneas de log…" : "Elige un proyecto y un servicio para ver sus logs en vivo."}
          </p>
        )}
        {lines.map((line, i) => (
          <div key={i} className="text-text-muted">
            {line.timestamp && (
              <span className="text-text-faint">{new Date(line.timestamp).toLocaleTimeString()} </span>
            )}
            <span>{line.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
