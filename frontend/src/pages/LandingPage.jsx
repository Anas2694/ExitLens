import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./LandingPage.css";

const HERO_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4";

const WORKFLOW = [
  { number: "01", title: "Capture", copy: "One script records clicks, scroll depth, exits, routes, and conversions without slowing the page." },
  { number: "02", title: "Detect", copy: "The pattern engine identifies bounce, low engagement, rage clicks, and dead clicks across sessions." },
  { number: "03", title: "Explain", copy: "AI turns the behavior into a plain-English cause, impact, and the exact change to make next." },
];

export default function LandingPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);

  const { scrollYProgress: pageScrollProgress } = useScroll();
  const pageProgress = useSpring(pageScrollProgress, { stiffness: 120, damping: 24, mass: 0.25 });
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, -190]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.47], [1, 0]);

  useEffect(() => {
    if (!authOpen) return undefined;
    const onKeyDown = (event) => event.key === "Escape" && setAuthOpen(false);
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [authOpen]);

  function openAuth(nextMode) {
    setMode(nextMode);
    setError("");
    setForm({ name: "", email: "", password: "" });
    setMenuOpen(false);
    setAuthOpen(true);
  }

  function switchAuthMode(nextMode) {
    setMode(nextMode);
    setError("");
    setForm({ name: "", email: "", password: "" });
  }

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  }

  function moveHeroLight(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY - bounds.top}px`);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
        navigate("/app/dashboard");
      } else {
        if (form.password.length < 8) {
          setError("Password must be at least 8 characters");
          return;
        }
        const response = await register(form.name, form.email, form.password);
        setApiKey(response.data.apiKey);
        setAuthOpen(false);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (apiKey) {
    return (
      <div className="ny-page ny-success-page">
        <section className="ny-success-card">
          <Brand />
          <span className="ny-success-pulse" aria-hidden="true" />
          <p className="ny-kicker">Workspace created</p>
          <h1>Your tracking lens is ready.</h1>
          <p>Save this API key now. It will only be displayed once.</p>
          <div className="ny-key-box"><code>{apiKey}</code></div>
          <button className="ny-primary ny-wide" onClick={() => navigate("/app/dashboard")}>Open dashboard <span>↗</span></button>
        </section>
      </div>
    );
  }

  return (
    <div className="ny-page" id="top">
      <motion.div className="ny-page-progress" style={{ scaleX: pageProgress }} aria-hidden="true" />
      <header className="ny-navbar">
        <div className="ny-nav-left">
          <a href="#top" className="ny-logo-link" aria-label="ExitLens home"><Brand /></a>
          <nav className="ny-desktop-nav" aria-label="Landing page navigation">
            <button type="button" onClick={() => scrollTo("overview")}>Overview</button>
            <button type="button" onClick={() => scrollTo("workflow")}>How it works <span>⌄</span></button>
            <button type="button" onClick={() => scrollTo("principle")}>Why ExitLens</button>
          </nav>
        </div>
        <div className="ny-nav-actions">
          <button className="ny-signin" type="button" onClick={() => openAuth("login")}>Sign in</button>
          <button className={`ny-menu-button ${menuOpen ? "open" : ""}`} type="button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><i /><i /></button>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.nav className="ny-mobile-nav" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} aria-label="Mobile navigation">
              <button type="button" onClick={() => scrollTo("overview")}>Overview</button>
              <button type="button" onClick={() => scrollTo("workflow")}>How it works</button>
              <button type="button" onClick={() => scrollTo("principle")}>Why ExitLens</button>
              <button type="button" onClick={() => openAuth("register")}>Start free</button>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main>
        <section className="ny-hero" ref={heroRef} aria-labelledby="ny-title" onPointerMove={moveHeroLight}>
          <div className="ny-hero-grid" aria-hidden="true" />
          <div className="ny-pointer-glow" aria-hidden="true" />
          <motion.div className="ny-hero-copy" style={{ y: heroY, opacity: heroOpacity }}>
            <motion.div className="ny-liquid-glass ny-release" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span>New</span><p>AI-powered session intelligence</p>
            </motion.div>
            <motion.h1 id="ny-title" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
              Every exit.<br />One clear <em>reason.</em>
            </motion.h1>
            <motion.p className="ny-hero-subtitle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
              ExitLens tracks clicks, scrolls, and session behavior,<br />then explains what is blocking your conversions.
            </motion.p>
            <motion.button className="ny-primary ny-hero-cta" type="button" onClick={() => openAuth("register")} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.6, delay: 0.3 }}>Start tracking for free</motion.button>
          </motion.div>

          <motion.div className="ny-visual-area" id="overview" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}>
            <video src={HERO_VIDEO} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
            <div className="ny-video-scrim" aria-hidden="true" />
          </motion.div>
          <div className="ny-hero-fade" aria-hidden="true" />
        </section>

        <section className="ny-proof-rail" aria-label="ExitLens product facts">
          <div><strong>&lt; 3KB</strong><span>lightweight tracker</span></div>
          <div><strong>Real-time</strong><span>behavior signals</span></div>
          <div><strong>4 patterns</strong><span>detected automatically</span></div>
          <div><strong>Plain English</strong><span>specific recommendations</span></div>
        </section>

        <section className="ny-principle" id="principle">
          <div className="ny-principle-inner">
            <motion.div className="ny-principle-heading" initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: .7 }}>
              <p className="ny-kicker">Why ExitLens</p>
              <h2>Analytics tells you <span>what happened.</span><br />ExitLens tells you <em>why.</em></h2>
              <p>Turn visitor behavior into a clear explanation and a specific change your team can make next.</p>
            </motion.div>
            <div className="ny-answer-flow">
              <motion.article initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .6 }}>
                <span>01 · What happened</span><strong>68% bounce rate</strong><p>Most mobile visitors leave before reaching the pricing action.</p>
              </motion.article>
              <motion.article initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .6, delay: .1 }}>
                <span>02 · Why it happened</span><strong>The call-to-action button appears too late</strong><p>Session paths consistently stop before the button appears on screen.</p>
              </motion.article>
              <motion.article className="ny-answer-action" initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .6, delay: .2 }}>
                <span>03 · What to change</span><strong>Move the main action button above 400px</strong><p>A precise recommendation, ready to test.</p>
              </motion.article>
            </div>
          </div>
        </section>

        <section className="ny-workflow" id="workflow">
          <div className="ny-section-heading">
            <p className="ny-kicker">From signal to action</p>
            <h2>See the journey.<br /><em>Fix the break.</em></h2>
            <p>Everything ExitLens captures is translated into a decision your team can act on.</p>
          </div>
          <div className="ny-workflow-grid">
            {WORKFLOW.map((step, index) => (
              <motion.article key={step.number} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} whileHover={{ y: -7 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 0.65, delay: index * 0.08 }}>
                <div><span>{step.number}</span><i /></div>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
                {index === 0 && <div className="ny-mini-viz ny-capture-viz"><b>click</b><b>scroll 25%</b><b>exit</b></div>}
                {index === 1 && <div className="ny-mini-viz ny-detect-viz"><span><i />rage click</span><span><i />dead click</span></div>}
                {index === 2 && <div className="ny-mini-viz ny-explain-viz"><small>HIGH IMPACT</small><strong>The main action button appears too late.</strong><p>Move it above 400px.</p></div>}
              </motion.article>
            ))}
          </div>
        </section>

        <section className="ny-final-cta">
          <div className="ny-orb" aria-hidden="true" />
          <p className="ny-kicker">Less guessing. More converting.</p>
          <h2>Your next win is hidden<br />inside an <em>exit.</em></h2>
          <p>Add one lightweight script and let ExitLens reveal what your landing page should change next.</p>
          <motion.button className="ny-primary" type="button" onClick={() => openAuth("register")} whileHover={{ scale: 1.035 }} whileTap={{ scale: .98 }}>Get started for free <span>↗</span></motion.button>
        </section>
      </main>

      <footer className="ny-footer">
        <Brand />
        <nav><a href="#overview">Overview</a><a href="#workflow">How it works</a><button type="button" onClick={() => openAuth("login")}>Sign in</button></nav>
        <p>© {new Date().getFullYear()} ExitLens</p>
      </footer>

      <AnimatePresence>
        {authOpen && (
          <motion.div className="ny-auth-overlay" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false); }}>
            <motion.section className="ny-auth-modal ny-liquid-glass" role="dialog" aria-modal="true" aria-labelledby="ny-auth-title" initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15, scale: 0.98 }}>
              <button className="ny-auth-close" type="button" aria-label="Close account form" onClick={() => setAuthOpen(false)}>×</button>
              <Brand />
              <div className="ny-auth-tabs" role="tablist" aria-label="Account access">
                <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => switchAuthMode("login")}>Sign in</button>
                <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => switchAuthMode("register")}>Create account</button>
              </div>
              <div className="ny-auth-heading"><p className="ny-kicker">ExitLens access</p><h2 id="ny-auth-title">{mode === "login" ? "Welcome back" : "Start tracking"}</h2><p>{mode === "login" ? "Sign in to your behavioral dashboard." : "Create your workspace in less than a minute."}</p></div>
              <form className="ny-auth-form" onSubmit={handleSubmit}>
                {mode === "register" && <label>Full name<input type="text" name="exitlens-full-name" autoComplete="off" placeholder="Enter your full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} /></label>}
                <label>Email<input type="email" name="exitlens-email" autoComplete="off" placeholder="Enter your email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
                <label>Password<input type="password" name="exitlens-password" autoComplete="new-password" placeholder={mode === "register" ? "Create a password (8+ characters)" : "Enter your password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={mode === "register" ? 8 : undefined} /></label>
                {error && <p className="ny-auth-error" role="alert">{error}</p>}
                <button className="ny-primary ny-wide" type="submit" disabled={loading}>{loading ? (mode === "login" ? "Signing in..." : "Creating workspace...") : (mode === "login" ? "Open dashboard" : "Create free account")}</button>
              </form>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BrandMark() {
  return <span className="ny-brand-mark" aria-hidden="true"><i /><i /><i /></span>;
}

function Brand() {
  return <span className="ny-brand"><BrandMark />ExitLens</span>;
}
