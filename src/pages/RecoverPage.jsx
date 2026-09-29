import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { api } from "../lib/api";

export function RecoverPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError("");
    if (password !== confirmation) { setError("Las contraseñas no coinciden."); return; }
    setBusy(true);
    try { await api.recoverPassword(username, recoveryKey.trim(), password); setDone(true); }
    catch (cause) { setError(cause.message || "No se pudo recuperar el acceso."); }
    finally { setBusy(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-base px-4 text-text"><form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border bg-surface p-7 shadow-2xl">
    <div className="mb-6 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-surface-raised text-accent"><KeyRound size={19} /></div><div><p className="font-mono text-sm">dev<span className="text-accent">vault</span></p><h1 className="mt-1 text-xl font-semibold">Recuperar acceso</h1></div></div>
    {done ? <><p className="mb-5 text-sm leading-relaxed text-text-muted">La contraseña cambió y las sesiones anteriores se cerraron. Ya puedes iniciar sesión.</p><button type="button" onClick={() => navigate("/login", { replace: true })} className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium">Ir al inicio de sesión</button></> : <>
      <p className="mb-5 text-sm leading-relaxed text-text-muted">Usa el usuario y la clave de recuperación guardada durante la configuración inicial.</p>
      <label className="mb-4 block text-sm text-text-muted">Usuario<input autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-base px-3 py-2.5 text-text outline-none focus:border-accent" /></label>
      <label className="mb-4 block text-sm text-text-muted">Clave de recuperación<input autoComplete="off" required value={recoveryKey} onChange={(e) => setRecoveryKey(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-base px-3 py-2.5 font-mono text-xs text-text outline-none focus:border-accent" /></label>
      <label className="mb-4 block text-sm text-text-muted">Nueva contraseña<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-base px-3 py-2.5 text-text outline-none focus:border-accent" /></label>
      <label className="mb-5 block text-sm text-text-muted">Confirmar contraseña<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-base px-3 py-2.5 text-text outline-none focus:border-accent" /></label>
      {error && <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium disabled:opacity-50">{busy ? "Restableciendo…" : "Cambiar contraseña"}</button>
      <p className="mt-4 text-center text-sm text-text-muted"><Link className="text-accent hover:underline" to="/login">Volver al inicio de sesión</Link></p>
    </>}</form></main>;
}
