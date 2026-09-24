const LABELS = { ACTIVE: "Activo", RUNNING: "En ejecución", COMPLETED: "Completado", STOPPED: "Detenido", FAILED: "Fallido", IN_PROGRESS: "En curso", STARTING: "Iniciando", NOT_FOUND: "No encontrado", ARCHIVED: "Archivado" };

const STYLES = {
  ACTIVE: "bg-accent-dim/30 text-accent",
  RUNNING: "bg-accent-dim/30 text-accent",
  COMPLETED: "bg-accent-dim/30 text-accent",
  STOPPED: "bg-surface-raised text-text-muted",
  FAILED: "bg-danger-dim/30 text-danger",
  IN_PROGRESS: "bg-warning-dim/30 text-warning",
  STARTING: "bg-warning-dim/30 text-warning",
  NOT_FOUND: "bg-danger-dim/30 text-danger",
};

export function StatusBadge({ status }) {
  const style = STYLES[status] || "bg-surface-raised text-text-muted";
  return (
    <span className={`inline-block text-xs font-mono px-2 py-0.5 rounded ${style}`}>
      {LABELS[status] || status?.toLowerCase()}
    </span>
  );
}
