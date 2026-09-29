import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
export function RequireAuth({ children }) {
  const { user, loading, setupRequired } = useAuth();
  const location = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-text-muted">Iniciando DevVault…</div>;
  if (setupRequired) return <Navigate to="/setup" replace />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}
