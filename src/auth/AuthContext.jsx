import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setAccessToken } from "../lib/api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [recoveryConfigured, setRecoveryConfigured] = useState(false);

  useEffect(() => {
    let active = true;
    const unauthorized = () => { if (active) { setUser(null); setLoading(false); } };
    window.addEventListener("devvault:unauthorized", unauthorized);
    api.authSetupStatus().then(async ({ setupRequired: required, recoveryConfigured: hasRecovery }) => {
      if (!active) return;
      setSetupRequired(required);
      setRecoveryConfigured(hasRecovery);
      if (required) { setAccessToken(null); return; }
      if (sessionStorage.getItem("devvault.accessToken")) {
        const me = await api.me();
        if (active) setUser(me);
      }
    }).catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; window.removeEventListener("devvault:unauthorized", unauthorized); };
  }, []);

  const value = useMemo(() => ({
    user, loading, setupRequired, recoveryConfigured,
    async login(username, password) {
      const result = await api.login(username, password);
      setAccessToken(result.accessToken);
      setUser({ username: result.username });
    },
    async setupAdministrator(username, password, recoveryKey) {
      await api.setupAdministrator(username, password, recoveryKey);
      setSetupRequired(false);
      const result = await api.login(username, password);
      setAccessToken(result.accessToken);
      setUser({ username: result.username });
    },
    async logout() {
      try { await api.logout(); } catch { /* Local logout must complete if the API is unavailable. */ }
      finally { setAccessToken(null); setUser(null); }
    },
  }), [user, loading, setupRequired]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth requiere AuthProvider.");
  return context;
}



