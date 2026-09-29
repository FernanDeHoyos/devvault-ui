import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
export function LoginPage() {
  const { user, login, loading, setupRequired, recoveryConfigured } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-text-muted">Iniciando DevVault…</div>;
  if (setupRequired) return <Navigate to="/setup" replace />;
  if (user) return <Navigate to="/" replace />;
  async function submit(event) {
    event.preventDefault(); setError(""); setBusy(true);
    try { await login(username, password); navigate(location.state?.from?.pathname || "/", { replace: true }); }
    catch (cause) { setError(cause.message || "No se pudo iniciar sesión."); }
    finally { setBusy(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-base px-4 text-text"><form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border bg-surface p-7 shadow-2xl">
    <div className="mb-7 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-surface-raised text-accent"><LockKeyhole size={19} /></div><div><p className="font-mono text-sm">dev<span className="text-accent">vault</span></p><h1 className="mt-1 text-xl font-semibold">Iniciar sesión</h1></div></div>
    <p className="mb-6 text-sm leading-relaxed text-text-muted">Accede con tu administrador local de DevVault.</p>
    <label className="mb-4 block text-sm text-text-muted">Usuario<input autoFocus autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-base px-3 py-2.5 text-text outline-none focus:border-accent" /></label>
    <label className="mb-4 block text-sm text-text-muted">Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-base px-3 py-2.5 text-text outline-none focus:border-accent" /></label>
    {error && <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
    <button disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-base transition-opacity hover:opacity-90 disabled:opacity-50">{busy ? "Validando…" : "Entrar"}</button>
    {recoveryConfigured && <p className="mt-4 text-center text-sm"><Link className="text-accent hover:underline" to="/recover">¿Olvidaste tu contraseña?</Link></p>}
    <details className="mt-5 border-t border-border pt-4 text-xs text-text-muted"><summary className="cursor-pointer">Perdí también la clave de recuperación</summary><p className="mt-2 leading-relaxed">Cierra DevVault y elimina el archivo local de autenticación. Al reiniciar podrás crear una contraseña nueva; tus proyectos y datos de PostgreSQL se conservan.</p><code className="mt-2 block break-all">Windows: %LOCALAPPDATA%\DevVault\auth.json</code><p className="mt-1">macOS/Linux: busca DevVault/auth.json dentro de la carpeta de configuración de usuario.</p></details>
  </form></main>;
}



