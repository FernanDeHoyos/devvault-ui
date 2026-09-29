import { useParams, Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Square, GitBranch, ArrowLeft, ExternalLink, Cpu, Code2, Terminal as TerminalIcon } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { StatusBadge } from "../components/StatusBadge";
import { GitPanel } from "../components/GitPanel";

function formatElapsed(startedAt) {
  if (!startedAt) return null;
  const seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function ProjectDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const hasAutoOpenedRef = useRef(false);
  const [, forceTick] = useState(0);

  const { data: project, isLoading } = useQuery({
    queryKey: ["projects", id],
    queryFn: () => api.getProject(id),
  });

  const { data: runtimeStatus } = useQuery({
    queryKey: ["projects", id, "status"],
    queryFn: () => api.projectStatus(id),
    retry: false,
    refetchInterval: (query) => (query.state.data?.overallStatus === "STARTING" ? 2000 : false),
  });

  const { data: services } = useQuery({
    queryKey: ["projects", id, "services"],
    queryFn: () => api.projectServices(id),
    retry: false,
    refetchInterval: () => (runtimeStatus?.overallStatus === "STARTING" ? 2000 : false),
  });

  const { data: routes = [], isLoading: routesLoading, isError: routesError } = useQuery({
    queryKey: ["projects", id, "routes"],
    queryFn: () => api.projectRoutes(id),
    retry: false,
  });

  const startMutation = useMutation({
    mutationFn: () => api.startProject(id),
    onSuccess: () => {
      hasAutoOpenedRef.current = false; // permite auto-abrir de nuevo en este nuevo arranque
      queryClient.invalidateQueries({ queryKey: ["projects", id, "services"] });
      queryClient.invalidateQueries({ queryKey: ["projects", id, "status"] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => api.stopProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", id, "services"] });
      queryClient.invalidateQueries({ queryKey: ["projects", id, "status"] });
    },
  });

  // Abrir en el editor no invalida ninguna query: no cambia el estado del
  // proyecto, solo lanza un proceso que el sistema operativo administrará.
  const openMutation = useMutation({
    mutationFn: () => api.openInEditor(id),
  });

  const isRunning = runtimeStatus?.overallStatus === "RUNNING";
  const isStarting = runtimeStatus?.overallStatus === "STARTING";
  const openableService = services?.find((s) => s.status === "RUNNING" && s.port);

  // Reloj en vivo para el contador de "corriendo desde hace..."
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Auto-abrir pestaña nueva apenas el proyecto queda RUNNING con un puerto real.
  // Los navegadores bloquean window.open() si no ocurre dentro del mismo gesto
  // de clic del usuario — como esto llega minutos después (tras el health check),
  // es muy probable que el navegador lo bloquee. Por eso NO dependemos solo de
  // esto: si falla, el enlace de abajo sigue siendo el respaldo confiable.
  useEffect(() => {
    if (isRunning && openableService && !hasAutoOpenedRef.current) {
      hasAutoOpenedRef.current = true;
      const newTab = window.open(`http://localhost:${openableService.port}`, "_blank");
      if (!newTab) {
        console.info("El navegador bloqueó la apertura automática — usa el enlace en pantalla.");
      }
    }
  }, [isRunning, openableService]);

  if (isLoading) return <p className="text-text-muted text-sm">Cargando…</p>;
  if (!project) return <p className="text-danger text-sm">Proyecto no encontrado.</p>;

  const isBusy = startMutation.isPending || stopMutation.isPending;
  const lastError = startMutation.error || stopMutation.error;

  return (
    <div>
      <Link to="/projects" className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text mb-4">
        <ArrowLeft size={14} /> Projects
      </Link>

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-medium">{project.name}</h1>
        <StatusBadge status={project.status} />
      </div>
      <p className="text-xs text-text-faint font-mono mb-1">{project.path}</p>

      <GitPanel projectId={id} />

      {project.gitBranch && (
        <p className="flex items-center gap-1.5 text-xs text-text-muted font-mono mb-4">
          <GitBranch size={13} /> {project.gitBranch} @ {project.gitShortCommitHash}
        </p>
      )}

      {runtimeStatus && (
        <div className="flex items-center gap-4 text-xs text-text-muted mb-4 font-mono">
          {runtimeStatus.startedAt && (
            <span>
              Iniciado: {new Date(runtimeStatus.startedAt).toLocaleTimeString()}
              {isRunning && ` · corriendo hace ${formatElapsed(runtimeStatus.startedAt)}`}
            </span>
          )}
          {runtimeStatus.stoppedAt && !isRunning && (
            <span>Detenido: {new Date(runtimeStatus.stoppedAt).toLocaleTimeString()}</span>
          )}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => startMutation.mutate()}
          disabled={isBusy || isRunning || isStarting}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-accent-dim/30 text-accent border border-accent-dim hover:bg-accent-dim/50 transition-colors disabled:opacity-50"
        >
          <Play size={13} />
          {isStarting ? "Iniciando…" : isRunning ? "Corriendo" : startMutation.isPending ? "Iniciando…" : "Start"}
        </button>
        <button
          onClick={() => stopMutation.mutate()}
          disabled={isBusy || !runtimeStatus || runtimeStatus.overallStatus === "STOPPED"}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-surface-raised text-text-muted border border-border hover:text-text transition-colors disabled:opacity-50"
        >
          <Square size={13} /> {stopMutation.isPending ? "Deteniendo…" : "Stop"}
        </button>

        {isRunning && openableService && (
          <a
            href={`http://localhost:${openableService.port}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-surface-raised text-accent border border-accent-dim hover:bg-accent-dim/20 transition-colors ml-auto"
          >
            <ExternalLink size={13} /> Abrir en localhost:{openableService.port}
          </a>
        )}
      </div>

      {/* Abrir en el editor de código. A diferencia de Start/Stop, esto no
          cambia el estado del proyecto: el editor se lanza y queda bajo el
          control del sistema operativo, no del de DevVault. */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3">
        <button
          onClick={() => openMutation.mutate()}
          disabled={openMutation.isPending || !project}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-accent text-base hover:brightness-110 transition-colors disabled:opacity-50"
        >
          <Code2 size={13} /> {openMutation.isPending ? "Abriendo…" : "Abrir en el editor"}
        </button>
        {openMutation.isSuccess && openMutation.data && (
          <span role="status" className="text-xs text-accent">Abierto en {openMutation.data.editorName}.</span>
        )}
        {openMutation.isError && (
          <span role="alert" className="text-xs text-danger">
            {openMutation.error instanceof ApiError ? openMutation.error.message : "No se pudo abrir el editor."}
          </span>
        )}
        {!openMutation.isError && !openMutation.isSuccess && !openMutation.isPending && (
          <span className="text-xs text-text-faint">Abre la carpeta del proyecto en el editor configurado en DevVault.</span>
        )}
      </div>

      {isStarting && (
        <p className="text-xs text-warning mb-4">Iniciando… esto puede tardar unos segundos mientras corre el health check.</p>
      )}

      {lastError && (
        <div className="border border-danger-dim bg-danger-dim/10 text-danger text-xs rounded-md px-3 py-2 mb-6">
          {lastError instanceof ApiError ? lastError.message : "Ocurrió un error inesperado"}
        </div>
      )}

      <section className="mb-7 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><p className="text-sm text-text-muted">Rutas declaradas</p><p className="mt-1 text-xs text-text-faint">Catálogo estático de mappings Spring encontrados en el código.</p></div>
          {!routesLoading && !routesError && <span className="font-mono text-xs text-text-muted">{routes.length} rutas</span>}
        </div>
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          {routesLoading ? <p className="px-4 py-6 text-sm text-text-muted">Buscando rutas en el código…</p>
            : routesError ? <p className="px-4 py-6 text-sm text-danger">No se pudo leer el catálogo de rutas.</p>
              : routes.length === 0 ? <p className="px-4 py-6 text-sm text-text-muted">No se encontraron mappings Spring en src/main/java ni src/main/kotlin.</p>
                : <table className="w-full min-w-[680px] text-sm"><thead><tr className="border-b border-border text-left text-xs text-text-muted"><th className="px-4 py-2 font-normal">Método</th><th className="px-4 py-2 font-normal">Ruta</th><th className="px-4 py-2 font-normal">Handler</th><th className="px-4 py-2 font-normal">Origen</th><th className="px-4 py-2 font-normal">Detección</th></tr></thead><tbody>
                  {routes.map((route, index) => <tr key={`${route.httpMethod}-${route.path}-${route.sourceFile}-${route.line}-${index}`} className="border-b border-border last:border-0 align-top"><td className="px-4 py-2"><span className="rounded border border-accent-dim/50 bg-accent-dim/10 px-1.5 py-0.5 font-mono text-xs text-accent">{route.httpMethod}</span></td><td className="px-4 py-2 font-mono text-xs">{route.path}</td><td className="px-4 py-2 text-xs">{route.controller}.{route.handler}</td><td className="px-4 py-2 font-mono text-xs text-text-muted">{route.sourceFile}:{route.line}</td><td className="px-4 py-2 text-xs">{route.discoveryStatus === "CONDITIONAL" ? <span className="text-warning" title={(route.conditions || []).join("; ")}>Condicionada</span> : <span className="text-text-faint">Estática</span>}</td></tr>)}
                </tbody></table>}
        </div>
        <p className="text-xs text-text-faint">Las condiciones se muestran desde sus anotaciones; el escaneo no confirma qué rutas están activas en ejecución.</p>
      </section>

      <p className="text-sm text-text-muted mb-2">Servicios</p>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        {!services || services.length === 0 ? (
          <p className="px-4 py-6 text-sm text-text-muted text-center">
            Sin datos de runtime todavía — inicia el proyecto para verlos.
          </p>
        ) : (
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-xs text-text-muted text-left border-b border-border">
                <th className="font-normal px-4 py-2">Servicio</th>
                <th className="font-normal px-4 py-2">Tipo</th>
                <th className="font-normal px-4 py-2">Puerto</th>
                <th className="font-normal px-4 py-2">Estado</th>
                <th className="font-normal px-4 py-2">Detalle</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 align-top">
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2 text-text-muted font-mono text-xs">{s.type}</td>
                  <td className="px-4 py-2 text-text-muted font-mono text-xs">{s.port ?? "—"}</td>
                  <td className="px-4 py-2"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-2 text-xs text-text-faint font-mono">
                    {s.kind === "LOCAL_PROCESS" && (
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1"><Cpu size={11} /> PID {s.pid}</span>
                        <span className="flex items-center gap-1 truncate max-w-[220px]" title={s.command}>
                          <TerminalIcon size={11} /> {s.command}
                        </span>
                      </div>
                    )}
                    {s.kind === "DOCKER" && (
                      <span>docker: {s.dockerContainerId?.slice(0, 12)}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link to={`/logs?project=${id}&service=${s.name}`} className="text-xs text-accent hover:underline">
                      Logs
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
