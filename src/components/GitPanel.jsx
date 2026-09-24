import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowDown, ArrowUp, Check, Clock3, GitBranch, GitCommit, GitPullRequest, RefreshCw } from "lucide-react";
import { api } from "../lib/api";

function dateLabel(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function Count({ label, value, tone = "text-text-muted" }) {
  return <span className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs">
    <span className={tone}>{value}</span><span className="ml-1 text-text-faint">{label}</span>
  </span>;
}

export function GitPanel({ projectId }) {
  const queryClient = useQueryClient();
  const queryKey = ["projects", projectId, "git"];
  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => api.projectGit(projectId),
    retry: false,
  });
  const fetchMutation = useMutation({
    mutationFn: () => api.fetchGit(projectId),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKey, result);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  return <section className="mb-7 overflow-hidden rounded-xl border border-border bg-surface">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        <GitBranch size={16} className="text-accent" />
        <div><h2 className="text-sm font-medium">Git</h2><p className="mt-0.5 text-xs text-text-faint">Ramas, commits y sincronización remota</p></div>
      </div>
      {data?.repository && <button type="button" onClick={() => fetchMutation.mutate()} disabled={fetchMutation.isPending}
        className="inline-flex items-center gap-2 rounded-md border border-accent-dim bg-accent-dim/10 px-3 py-2 text-xs text-accent transition-colors hover:bg-accent-dim/20 disabled:opacity-50">
        <RefreshCw size={13} className={fetchMutation.isPending ? "animate-spin" : ""} />
        {fetchMutation.isPending ? "Consultando remotos…" : "Fetch ahora"}
      </button>}
    </div>
    <div className="p-4">
      {isLoading ? <p className="text-sm text-text-muted">Leyendo repositorio…</p>
        : isError ? <div className="flex items-start gap-2 text-sm text-danger"><AlertTriangle size={15} className="mt-0.5 shrink-0" /><span>{error?.message || "No se pudo consultar Git."}</span></div>
          : !data?.repository ? <p className="text-sm text-text-muted">Este proyecto no está dentro de un repositorio Git.</p>
            : <div className="space-y-5">
              {fetchMutation.isError && <div className="flex items-start gap-2 rounded-lg border border-danger-dim bg-danger-dim/10 px-3 py-2 text-xs text-danger"><AlertTriangle size={14} className="mt-0.5 shrink-0" /><span>{fetchMutation.error?.message || "Falló el fetch. Revisa Git y sus credenciales."}</span></div>}
              {fetchMutation.isSuccess && <div className="flex items-center gap-2 rounded-lg border border-accent-dim/40 bg-accent-dim/10 px-3 py-2 text-xs text-accent"><Check size={14} />Referencias remotas actualizadas.</div>}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-accent-dim/50 bg-accent-dim/10 px-2.5 py-1.5 font-mono text-xs text-accent"><GitBranch size={13} />{data.branch || "(detached)"}</span>
                <span className="font-mono text-xs text-text-muted">{data.commit || "Sin commits"}</span>
                {data.upstream && <span className="text-xs text-text-faint">siguiendo {data.upstream}</span>}
                {data.upstream && <span className="inline-flex items-center gap-1 text-xs text-accent"><ArrowUp size={12} />{data.ahead} por subir</span>}
                {data.upstream && <span className="inline-flex items-center gap-1 text-xs text-warning"><ArrowDown size={12} />{data.behind} por traer</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Count label="preparados" value={data.staged} />
                <Count label="modificados" value={data.modified} />
                <Count label="sin seguimiento" value={data.untracked} />
                {data.conflicted > 0 && <Count label="conflictos" value={data.conflicted} tone="text-danger" />}
              </div>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
                <div>
                  <div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-medium text-text-muted">Historial</h3><span className="text-xs text-text-faint">Últimos {data.commits.length} commits · todas las ramas</span></div>
                  {data.commits.length === 0 ? <p className="text-xs text-text-faint">Aún no hay commits.</p> :
                    <div className="relative space-y-0">
                      <div className="absolute bottom-3 left-[7px] top-3 w-px bg-border" />
                      {data.commits.map((commit) => <article key={commit.hash} className="relative pb-3 pl-7 last:pb-0">
                        <span className="absolute left-0 top-1 grid h-[15px] w-[15px] place-items-center rounded-full border border-accent-dim bg-surface text-accent"><GitCommit size={10} /></span>
                        <div className="rounded-lg border border-border bg-base/50 px-3 py-2.5">
                          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1"><p className="min-w-0 flex-1 text-xs font-medium text-text">{commit.subject || "(sin mensaje)"}</p><code className="font-mono text-[11px] text-accent">{commit.shortHash}</code></div>
                          <p className="mt-1 text-[11px] text-text-muted">{commit.author} · {dateLabel(commit.committedAt)}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {commit.decorations?.split(", ").filter(Boolean).map((label) => <span key={label} className="rounded border border-accent-dim/40 px-1.5 py-0.5 font-mono text-[10px] text-accent">{label}</span>)}
                            {commit.parents?.length > 1 && <span className="inline-flex items-center gap-1 text-[10px] text-text-faint"><GitPullRequest size={10} />merge · {commit.parents.length} padres</span>}
                          </div>
                        </div>
                      </article>)}
                    </div>}
                </div>
                <aside className="space-y-5">
                  <div>
                    <h3 className="mb-3 text-xs font-medium text-text-muted">Ramas</h3>
                    <div className="flex max-h-44 flex-wrap content-start gap-1.5 overflow-y-auto">
                      {data.branches.map((branch) => <span key={(branch.remote ? "remote/" : "local/") + branch.name} title={branch.commit + (branch.upstream ? " · " + branch.upstream : "")}
                        className={"rounded-md border px-2 py-1 font-mono text-[10px] " + (branch.current ? "border-accent-dim bg-accent-dim/15 text-accent" : branch.remote ? "border-border bg-surface-raised text-text-faint" : "border-border text-text-muted")}>
                        {branch.remote ? "remoto · " : ""}{branch.name}{branch.current ? " · actual" : ""}
                      </span>)}
                      {data.branches.length === 0 && <span className="text-xs text-text-faint">Sin ramas todavía.</span>}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-medium text-text-muted">Fetch de DevVault</h3>
                    <p className="mb-2 flex items-center gap-1.5 text-[11px] text-text-faint"><Clock3 size={12} />Último exitoso: {dateLabel(data.lastFetchAt)}</p>
                    <div className="space-y-1.5">
                      {data.fetchHistory.slice(0, 5).map((event, index) => <p key={event.fetchedAt + index} className="flex items-center justify-between gap-2 text-[10px]">
                        <span className={event.status === "SUCCESS" ? "text-accent" : "text-danger"}>{event.status === "SUCCESS" ? "Completado" : "Fallido"} · {event.remotes}</span>
                        <span className="shrink-0 text-text-faint">{dateLabel(event.fetchedAt)}</span>
                      </p>)}
                      {data.fetchHistory.length === 0 && <p className="text-[11px] text-text-faint">Aún no hay ejecuciones de fetch desde DevVault.</p>}
                    </div>
                  </div>
                </aside>
              </div>
            </div>}
    </div>
  </section>;
}
