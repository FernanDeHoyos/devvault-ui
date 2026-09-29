import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ShieldCheck, KeyRound } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

function createRecoveryKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function SetupPage() {
  const { user, loading, setupRequired, setupAdministrator } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [recoveryKey] = useState(createRecoveryKey);
  const [recoveryConfirmation, setRecoveryConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-text-muted">Iniciando DevVault…</div>;
  if (!setupRequired) return <Navigate to={user ? "/" : "/login"} replace />;
  async function submit(event) {
    event.preventDefault(); setError("");
    if (password !== confirmation) { setError("Las contraseñas no coinciden."); return; }
    if (recoveryKey !== recoveryConfirmation.trim()) { setError("La clave de recuperación no coincide."); return; }
    setBusy(true);
    try { await setupAdministrator(username, password, recoveryKey); navigate("/", { replace: true }); }
    catch (cause) { setError(cause.message || "No se pudo configurar DevVault."); }
    finally { setBusy(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-base px-4 py-8 text-text"><form onSubmit={submit} className="w-full max-w-lg rounded-2xl border border-border bg-surface p-7 shadow-2xl">
    <div className="mb-6 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-surface-raised text-accent"><ShieldCheck size={19} /></div><div><p className="font-mono text-sm">dev<span className="text-accent">vault</span></p><h1 className="mt-1 text-xl font-semibold">Configurar DevVault</h1></div></div>
    <p className="mb-6 text-sm leading-relaxed text-text-muted">Crea el administrador local. La clave de recuperación te permitirá cambiar la contraseña si la olvidas.</p>
    <label className="mb-4 block text-sm text-text-muted">Usuario<input autoFocus autoComplete="username" minLength={3} maxLength={64} required value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-base px-3 py-2.5 text-text outline-none focus:border-accent" /></label>
    <label className="mb-4 block text-sm text-text-muted">Contraseña<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-base px-3 py-2.5 text-text outline-none focus:border-accent" /><span className="mt-1 block text-xs text-text-faint">Usa al menos 12 caracteres.</span></label>
    <label className="mb-5 block text-sm text-text-muted">Confirmar contraseña<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-base px-3 py-2.5 text-text outline-none focus:border-accent" /></label>
    <section className="mb-5 rounded-xl border border-accent/30 bg-accent/5 p-4"><div className="flex items-center gap-2 text-sm font-medium"><KeyRound size={16} className="text-accent" />Clave de recuperación</div><p className="mt-2 text-xs leading-relaxed text-text-muted">Guárdala en un gestor de contraseñas o lugar seguro. Solo se mostrará ahora.</p><code className="mt-3 block break-all rounded-lg bg-base p-3 font-mono text-xs text-text">{recoveryKey}</code></section>
    <label className="mb-5 block text-sm text-text-muted">Confirma la clave de recuperación<input autoComplete="off" required value={recoveryConfirmation} onChange={(e) => setRecoveryConfirmation(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-base px-3 py-2.5 font-mono text-xs text-text outline-none focus:border-accent" /></label>
    {error && <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
    <button disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-base transition-opacity hover:opacity-90 disabled:opacity-50">{busy ? "Configurando…" : "Guardar y crear administrador"}</button>
  </form></main>;
}
