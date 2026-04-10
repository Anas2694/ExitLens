import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function LandingPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
        navigate("/app/dashboard");
      } else {
        if (form.password.length < 8) { setError("Password must be 8+ characters"); setLoading(false); return; }
        const res = await register(form.name, form.email, form.password);
        setApiKey(res.data.apiKey);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (apiKey) {
    return (
      <div style={s.page}>
        <div style={s.apiKeyCard}>
          <div style={s.dot} />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", marginBottom: 8 }}>
            🎉 Account Created!
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 20, fontSize: "0.9rem" }}>
            Save your API key — <strong style={{ color: "var(--warning)" }}>shown only once.</strong>
          </p>
          <div style={s.keyBox}><code style={s.keyText}>{apiKey}</code></div>
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 20 }}
            onClick={() => navigate("/app/dashboard")}>
            Go to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* Background glow effects */}
      <div style={s.glowTop} />
      <div style={s.glowBottom} />

      {/* Nav */}
      <nav style={s.nav}>
        <div style={s.navLogo}>
          <span style={s.dot} />
          <span style={s.logoText}>ExitLens</span>
        </div>
        <div style={s.navLinks}>
          <a href="#features" style={s.navLink}>Features</a>
          <a href="#how" style={s.navLink}>How it works</a>
        </div>
      </nav>

      {/* Main grid — hero left, auth right */}
      <div style={s.grid}>

        {/* LEFT — Hero */}
        <div style={s.hero}>
          <div style={s.heroBadge}>✦ AI-Powered Analytics</div>
          <h1 style={s.heroTitle}>
            
            Know exactly why users <span style={s.heroAccent}>leave</span> your landing page
          </h1>
          <p style={s.heroSubtitle}>
            ExitLens tracks clicks, scroll depth, and session behavior — then uses AI to explain
            what's blocking your conversions in plain English.
          </p>

          {/* Stats row */}
          <div style={s.statsRow}>
            <Stat value="< 3KB" label="Tracker size" />
            <Stat value="Real-time" label="Pattern detection" />
            <Stat value="AI" label="Plain English insights" />
          </div>

{/* Features */}
<div style={s.features} id="features">
  {FEATURES.map((f, i) => (
    <div key={i} className="feature-item" style={s.featureItem}>
      <span style={s.featureIcon}>{f.icon}</span>
      <div>
        <div style={s.featureTitle}>{f.title}</div>
        <div style={s.featureDesc}>{f.desc}</div>
      </div>
    </div>
  ))}
</div>
</div>

        {/* RIGHT — Auth card */}
        <div style={s.authCard}>
          {/* Tabs */}
          <div style={s.tabs}>
            <button
              style={{ ...s.tab, ...(mode === "login" ? s.tabActive : {}) }}
              onClick={() => { setMode("login"); setError(""); }}
            >
              Sign In
            </button>
            <button
              style={{ ...s.tab, ...(mode === "register" ? s.tabActive : {}) }}
              onClick={() => { setMode("register"); setError(""); }}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} style={s.form} autoComplete="off">
            {mode === "register" && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" type="text" placeholder="Ada Lovelace"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  required minLength={2} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
  className="form-input"
  type="email"
  name="random-email"
  autoComplete="off"
  placeholder="you@company.com"
  value={form.email}
  onChange={e => setForm({ ...form, email: e.target.value })}
/>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
  className="form-input"
  type="password"
  name="new-password"
  autoComplete="new-password"
  placeholder={mode === "register" ? "Min. 8 characters" : "••••••••"}
  value={form.password}
  onChange={e => setForm({ ...form, password: e.target.value })}
/>
            </div>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ width: "100%", justifyContent: "center" }}>
              {loading ? (mode === "login" ? "Signing in…" : "Creating account…")
                       : (mode === "login" ? "Sign In →" : "Create Free Account →")}
            </button>
          </form>

          {mode === "login" && (
            <p style={s.switchText}>
              No account?{" "}
              <button style={s.switchLink} onClick={() => setMode("register")}>
                Create one free
              </button>
            </p>
          )}
        </div>
      </div>

      {/* How it works */}
      <div style={s.howSection} id="how">
        <h2 style={s.howTitle}>How it works</h2>
        <div style={s.steps}>
          {STEPS.map((step, i) => (
            <div key={i} style={s.step}>
              <div style={s.stepNum}>{i + 1}</div>
              <div style={s.stepIcon}>{step.icon}</div>
              <div style={s.stepTitle}>{step.title}</div>
              <div style={s.stepDesc}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", fontWeight: 800, color: "var(--accent)" }}>
        {value}
      </div>
      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

const FEATURES = [
  { icon: "🖱️", title: "Click & Rage Click Tracking", desc: "See exactly where users click and when they get frustrated" },
  { icon: "📜", title: "Scroll Depth Analysis", desc: "Know how far users read before giving up" },
  { icon: "🤖", title: "AI-Powered Insights", desc: "Gemini AI explains behavior in plain English with specific fixes" },
  { icon: "🔥", title: "Visual Heatmaps", desc: "See click concentration overlaid on your page layout" },
  { icon: "⚡", title: "Pattern Detection", desc: "Bounces, dead clicks, low engagement — auto-detected" },
  { icon: "📊", title: "Session Dashboard", desc: "Full analytics dashboard with exportable sessions" },
];

const STEPS = [
  { icon: "📋", title: "Paste one script tag", desc: "Add our 3KB tracker to your landing page. No framework needed." },
  { icon: "👁️", title: "We track behavior", desc: "Clicks, scrolls, session time and exit patterns collected automatically." },
  { icon: "🤖", title: "AI analyzes sessions", desc: "Gemini AI identifies patterns and explains them in plain English." },
  { icon: "🚀", title: "You fix and convert", desc: "Get specific recommendations. Implement. Watch conversions improve." },
];

const s = {
  page: {
  minHeight: "100vh",
  background: "var(--bg)",
  color: "var(--text)",
  position: "relative",
  overflow: "hidden",    
 fontFamily: "var(--font-body)",
},
  glowTop: {
    position: "absolute", width: 700, height: 700,
    borderRadius: "50%", top: -200, left: -100,
    background: "radial-gradient(circle, rgba(91,127,255,0.08) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  glowBottom: {
    position: "absolute", width: 500, height: 500,
    borderRadius: "50%", bottom: -100, right: -100,
    background: "radial-gradient(circle, rgba(91,127,255,0.06) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  nav: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "20px 40px", position: "relative", zIndex: 10,
    borderBottom: "1px solid var(--border)",
  },
  navLogo: { display: "flex", alignItems: "center", gap: 10 },
  dot: {
    width: 10, height: 10, borderRadius: "50%",
    background: "var(--accent)", boxShadow: "0 0 12px var(--accent)",
    display: "inline-block",
  },
  logoText: {
    fontFamily: "var(--font-display)", fontSize: "1.1rem",
    fontWeight: 800, color: "var(--text)",
  },
  navLinks: { display: "flex", gap: 28 },
  navLink: { color: "var(--text-muted)", fontSize: "0.9rem", textDecoration: "none", transition: "color 0.15s" },
  grid: {
    display: "grid", gridTemplateColumns: "1fr 420px",
    gap: 60, padding: "60px 40px",
    maxWidth: 1200, margin: "0 auto",
    position: "relative", zIndex: 1,
    alignItems: "start",
  },
  hero: {},
  heroBadge: {
    display: "inline-flex", alignItems: "center",
    padding: "6px 14px", borderRadius: 100,
    background: "var(--accent-glow)",
    border: "1px solid rgba(91,127,255,0.3)",
    color: "var(--accent)", fontSize: "0.8rem", fontWeight: 600,
    marginBottom: 24,
  },
heroTitle: {
  fontFamily: "var(--font-display)",
  fontSize: "clamp(2rem, 4vw, 3rem)",
  fontWeight: 800,
  lineHeight: 1.2,
  transform: "translateY(2px)",   // ✅ THIS fixes clipping
  color: "var(--text)",
  marginBottom: 20,
},
  heroAccent: {
    color: "var(--accent)",
    textShadow: "0 0 30px rgba(91,127,255,0.4)",
  },
  heroSubtitle: {
    color: "var(--text-muted)", fontSize: "1.05rem",
    lineHeight: 1.7, marginBottom: 32, maxWidth: 520,
  },
  statsRow: {
    display: "flex", gap: 32, marginBottom: 36,
    paddingBottom: 32, borderBottom: "1px solid var(--border)",
  },
  features: { display: "flex", flexDirection: "column", gap: 16 },
 featureItem: {
  display: "flex",
  gap: 14,
  alignItems: "flex-start",
  padding: "14px 16px",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  transition: "background 0.2s ease, border-color 0.2s ease",
},
  featureIcon: { fontSize: "1.3rem", flexShrink: 0 },
  featureTitle: { fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", marginBottom: 2 },
  featureDesc: { fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5 },
  authCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "28px",
    boxShadow: "var(--shadow)",
    position: "sticky", top: 24,
  },
  tabs: {
    display: "flex", gap: 0, marginBottom: 24,
    background: "var(--bg)", borderRadius: "var(--radius)",
    padding: 4,
  },
  tab: {
    flex: 1, padding: "8px 16px", border: "none",
    background: "transparent", color: "var(--text-muted)",
    cursor: "pointer", borderRadius: 8,
    fontSize: "0.88rem", fontWeight: 500,
    fontFamily: "var(--font-body)",
    transition: "all 0.15s",
  },
  tabActive: {
    background: "var(--bg-card)",
    color: "var(--text)",
    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
  },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  switchText: {
    textAlign: "center", color: "var(--text-muted)",
    fontSize: "0.85rem", marginTop: 16,
  },
  switchLink: {
    background: "none", border: "none", color: "var(--accent)",
    cursor: "pointer", fontSize: "0.85rem", padding: 0,
    fontFamily: "var(--font-body)",
  },
  apiKeyCard: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)", padding: "40px",
    maxWidth: 480, margin: "100px auto", textAlign: "center",
  },
  keyBox: {
    background: "var(--bg)", border: "1px solid var(--border-soft)",
    borderRadius: "var(--radius)", padding: "14px 16px",
    wordBreak: "break-all", textAlign: "left",
  },
  keyText: { color: "var(--success)", fontSize: "0.8rem", fontFamily: "monospace" },
  howSection: {
    padding: "60px 40px",
    borderTop: "1px solid var(--border)",
    maxWidth: 1200, margin: "0 auto",
  },
  howTitle: {
    fontFamily: "var(--font-display)", fontSize: "1.8rem",
    textAlign: "center", marginBottom: 40, color: "var(--text)",
  },
  steps: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 20,
  },
  step: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)", padding: "24px",
    textAlign: "center",
  },
  stepNum: {
    width: 28, height: 28, borderRadius: "50%",
    background: "var(--accent)", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.85rem",
    margin: "0 auto 12px",
  },
  stepIcon: { fontSize: "1.8rem", marginBottom: 12 },
  stepTitle: { fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 8, color: "var(--text)" },
  stepDesc: { fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 },
};