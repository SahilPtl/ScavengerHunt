import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
export default function GoogleCompletePage() {
  const { login } = useAuth(),
    navigate = useNavigate(),
    started = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api("/auth/google/session", { method: "POST", body: {} })
      .then((result) => {
        login(result);
        navigate("/", { replace: true });
      })
      .catch((e) => setError(e.message));
  }, [login, navigate]);
  return (
    <main className="page">
      <h1>
        {error ? "Sign-in needs another try." : "Welcome back, explorer."}
      </h1>
      <p role={error ? "alert" : "status"}>
        {error || "Finishing your Google sign-in…"}
      </p>
      {error && (
        <Link className="secondary" to="/login">
          Return to sign in
        </Link>
      )}
    </main>
  );
}
