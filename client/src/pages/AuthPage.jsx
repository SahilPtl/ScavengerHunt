import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, MapPin, Route, Users } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
export default function AuthPage({ register = false }) {
  const { user, login, demo } = useAuth(),
    navigate = useNavigate();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
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
