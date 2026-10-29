import { useEffect, useRef } from "react";
import { AlertTriangle, LoaderCircle, Trash2, X } from "lucide-react";

const buttonClass = "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function ConfirmDeleteDialog({
  open,
  title,
  subject,
  description,
  path,
  fileNotice,
  confirmLabel,
  busy = false,
  error,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!busy) onCancel();
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll("button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return <div
    className="fixed inset-0 z-[80] grid place-items-center bg-black/65 p-4 backdrop-blur-sm"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onCancel();
    }}
  >
    <section
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      aria-describedby="confirm-delete-description"
      tabIndex={-1}
      className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-2xl outline-none"
    >
      <header className="flex items-start gap-3 border-b border-border px-5 py-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-danger-dim/20 text-danger">
          <AlertTriangle size={19} />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-danger">Acción irreversible</p>
          <h2 id="confirm-delete-title" className="mt-1 text-base font-semibold text-text">{title}</h2>
          <p className="mt-1 truncate text-sm text-text-muted" title={subject}>{subject}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          aria-label="Cerrar diálogo"
          className="rounded-md p-1.5 text-text-faint transition-colors hover:bg-surface-raised hover:text-text disabled:opacity-50"
        >
          <X size={16} />
        </button>
      </header>

      <div className="space-y-3 px-5 py-4">
        <p id="confirm-delete-description" className="text-sm leading-relaxed text-text-muted">{description}</p>
        {path && <p className="break-all rounded-md border border-border bg-base px-3 py-2 font-mono text-xs text-text-faint">{path}</p>}
        <div className="rounded-lg border border-accent-dim/50 bg-accent-dim/10 px-3 py-2.5">
          <p className="text-xs leading-relaxed text-text">{fileNotice}</p>
        </div>
        {error && <p role="alert" className="rounded-lg border border-danger-dim bg-danger-dim/10 px-3 py-2.5 text-xs text-danger">{error}</p>}
      </div>

      <footer className="flex flex-wrap justify-end gap-2 border-t border-border bg-base/50 px-5 py-3">
        <button ref={cancelRef} type="button" onClick={onCancel} disabled={busy} className={`${buttonClass} bg-surface-raised text-text-muted hover:text-text`}>
          Cancelar
        </button>
        <button type="button" onClick={onConfirm} disabled={busy} className={`${buttonClass} bg-danger-dim text-danger hover:brightness-125`}>
          {busy ? <LoaderCircle size={15} className="animate-spin" /> : <Trash2 size={15} />}
          {busy ? "Eliminando…" : confirmLabel}
        </button>
      </footer>
    </section>
  </div>;
}
