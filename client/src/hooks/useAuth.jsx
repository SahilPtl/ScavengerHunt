import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api";
const Context = createContext();
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [demo, setDemo] = useState(false);
  useEffect(() => {
    api("/health")
      .then((x) => setDemo(x.demo))
      .catch(() => {});
    if (sessionStorage.getItem("hunt-token"))
      api("/auth/me")
        .then(setUser)
        .catch(() => {})
        .finally(() => setLoading(false));
    else setLoading(false);
    const logout = () => setUser(null);
    window.addEventListener("hunt-logout", logout);
    return () => window.removeEventListener("hunt-logout", logout);
  }, []);
  const login = (result) => {
    sessionStorage.setItem("hunt-token", result.token);
    setUser(result.user);
  };
  const logout = () => {
    sessionStorage.removeItem("hunt-token");
    setUser(null);
  };
  return (
    <Context.Provider value={{ user, loading, login, logout, demo }}>
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
