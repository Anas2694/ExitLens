import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/app/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.glow} />
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.dot} />
          <h1 style={s.logo}>ExitLens</h1>
        </div>
        <h2 style={s.title}>Welcome back</h2>
        <p style={s.sub}>Sign in to your analytics dashboard</p>

        <form onSubmit={handleSubmit} style={s.form}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p style={s.footer}>
          Don't have an account?{" "}
          <Link to="/register">Create one free</Link>
        </p>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "var(--bg)", padding: 20, position: "relative", overflow: "hidden",
  },
  glow: {
    position: "absolute", width: 600, height: 600,
    borderRadius: "50%", top: "50%", left: "50%",
    transform: "translate(-50%, -50%)",
    background: "radial-gradient(circle, rgba(91,127,255,0.07) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  card: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)", padding: "40px 36px",
    width: "100%", maxWidth: 420, position: "relative", zIndex: 1,
    boxShadow: "var(--shadow)",
  },
  header: { display: "flex", alignItems: "center", gap: 8, marginBottom: 28 },
  dot: {
    width: 10, height: 10, borderRadius: "50%",
    background: "var(--accent)", boxShadow: "0 0 10px var(--accent)",
  },
  logo: {
    fontFamily: "var(--font-display)", fontSize: "1.1rem",
    fontWeight: 800, color: "var(--text)",
  },
  title: {
    fontFamily: "var(--font-display)", fontSize: "1.5rem",
    color: "var(--text)", marginBottom: 6,
  },
  sub: { color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: 28 },
  form: { display: "flex", flexDirection: "column", gap: 18 },
  footer: { textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 24 },
};
