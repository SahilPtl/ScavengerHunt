import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, MapPin, Route, Users } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
export default function AuthPage({ register = false }) {
  const { user, login, demo } = useAuth(),
    navigate = useNavigate();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [google, setGoogle] = useState(null),
    [params] = useSearchParams();
  useEffect(() => {
    api("/auth/google/config")
      .then(setGoogle)
      .catch(() => setGoogle(null));
  }, []);
  const googleError = {
    cancelled: "Google sign-in was cancelled. Try again or use email/password.",
    expired:
      "Google sign-in expired or could not be verified. Please try again.",
    failed:
      "Google sign-in could not finish. Check your connection and try again, or use email/password.",
    existing_account:
      "This email already has a password account. Sign in with your existing password; accounts are not linked automatically.",
  }[params.get("google_error")];
  if (user) return <Navigate to="/" replace />;
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      login(
        await api("/auth/" + (register ? "register" : "login"), {
          method: "POST",
          body: Object.fromEntries(new FormData(e.target)),
        }),
      );
      navigate("/");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-grid">
      <section className="auth-story">
        <span className="pill">SIX CHECKPOINTS. COUNTLESS STORIES.</span>
        <h1>
          Your campus.
          <br />A different
          <br />
          <em>kind of quest.</em>
        </h1>
        <p>
          Follow the clues, find your way, and turn familiar places into a
          shared adventure.
        </p>
        <div className="story-map">
          <img src="/campus.svg" alt="Illustrative campus paths" />
          <span className="story-pin p1">
            <MapPin />
          </span>
          <span className="story-pin p2">
            <MapPin />
          </span>
          <span className="story-pin p3">
            <MapPin />
          </span>
          <span className="map-note">
            25.49° N / 81.86° E <br />
            <b>PRAYAGRAJ, INDIA</b>
          </span>
        </div>
        <div className="story-bottom">
          <span>
            <Route size={17} /> Six discoveries
          </span>
          <span>
            <Users size={17} /> Better together
          </span>
        </div>
      </section>
      <section className="auth-form">
        <span className="eyebrow">LET THE EXPLORING BEGIN</span>
        <h2>{register ? "Make your mark." : "Welcome, explorer."}</h2>
        <p className="muted">
          {register
            ? "Create your account and find your team."
            : "Your next discovery is just a clue away."}
        </p>
        {googleError && (
          <p className="error" role="alert">
            {googleError}
          </p>
        )}
        {google?.enabled && (
          <>
            <a className="secondary full google-login" href={google.startUrl}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M21.6 12.2c0-.7-.1-1.4-.2-2.2H12v4.2h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.6Z"
                />
                <path
                  fill="#34A853"
                  d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.6c-.9.6-2.1.9-3.4.9-2.6 0-4.8-1.7-5.6-4H3v2.7A10 10 0 0 0 12 22Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.4 13.9a6 6 0 0 1 0-3.8V7.4H3a10 10 0 0 0 0 9.2l3.4-2.7Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9 5.4l3.4 2.7c.8-2.3 3-4 5.6-4Z"
                />
              </svg>
              Sign in with Google
            </a>
            <p className="auth-switch">or continue with email</p>
          </>
        )}
        <form onSubmit={submit}>
          {register && (
            <label>
              Your name
              <input
                name="name"
                required
                maxLength={60}
                autoComplete="name"
                placeholder="Explorer name"
              />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={6}
              maxLength={72}
              autoComplete={register ? "new-password" : "current-password"}
              placeholder="At least 6 characters"
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy
              ? "One moment…"
              : register
                ? "Create account"
                : "Enter the adventure"}
            <ArrowRight size={18} />
          </button>
        </form>
        <p className="auth-switch">
          {register ? "Already an explorer?" : "New around here?"}{" "}
          <Link to={register ? "/login" : "/register"}>
            {register ? "Sign in" : "Create an account"}
          </Link>
        </p>
        {demo && import.meta.env.VITE_PUBLIC !== "true" && (
          <div className="demo-note">
            <strong>Trying the local demo?</strong>
            <p>
              Explorer 1: demo@mnnit.com
              <br />
              Explorer 2: player2@mnnit.com
              <br />
              Password for both: <b>demo123</b>
            </p>
            <small>
              Use separate tabs or browsers for two players. No API keys needed.
            </small>
          </div>
        )}
      </section>
    </main>
  );
}
