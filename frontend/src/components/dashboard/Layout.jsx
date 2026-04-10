import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const NAV = [
  { to: "/app/dashboard", label: "Overview",  icon: "⬡" },
  { to: "/app/projects",  label: "Projects",  icon: "◉" },
  { to: "/app/sessions",  label: "Sessions",  icon: "◈" },
  { to: "/app/insights",  label: "Insights",  icon: "◎" },
  { to: "/app/settings",  label: "Settings",  icon: "◻" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <div style={styles.shell}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div style={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside style={{ ...styles.sidebar, ...(mobileOpen ? styles.sidebarOpen : {}) }}>
        {/* Logo */}
        <div style={styles.logo}>
          <span style={styles.logoDot} />
          <span style={styles.logoText}>ExitLens</span>
        </div>

        {/* Nav */}
        <nav style={styles.nav}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              })}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={styles.userBlock}>
          <div style={styles.avatar}>
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div style={styles.userInfo}>
            <div style={styles.userName}>{user?.name}</div>
            <div style={styles.userEmail}>{user?.plan} plan</div>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn} title="Logout">⏻</button>
        </div>
      </aside>

      {/* Main */}
      <div style={styles.main}>
        {/* Mobile header */}
        <header style={styles.mobileHeader}>
          <button style={styles.menuBtn} onClick={() => setMobileOpen(true)}>☰</button>
          <span style={styles.logoText}>ExitLens</span>
          <div style={{ width: 36 }} />
        </header>

        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles = {
  shell: {
    display: "flex", minHeight: "100vh", background: "var(--bg)",
  },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    zIndex: 99, display: "none",
    "@media(max-width:768px)": { display: "block" },
  },
  sidebar: {
    width: "var(--sidebar-w, 240px)",
    minWidth: 240,
    background: "var(--bg-card)",
    borderRight: "1px solid var(--border)",
    display: "flex", flexDirection: "column",
    padding: "0 0 16px",
    position: "sticky", top: 0, height: "100vh",
    flexShrink: 0,
    transition: "transform 0.25s ease",
  },
  sidebarOpen: {
    position: "fixed", inset: "0 auto 0 0",
    zIndex: 100, transform: "translateX(0)",
  },
  logo: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "22px 24px 20px",
    borderBottom: "1px solid var(--border)",
    marginBottom: 8,
  },
  logoDot: {
    width: 10, height: 10, borderRadius: "50%",
    background: "var(--accent)",
    boxShadow: "0 0 10px var(--accent)",
    display: "block",
  },
  logoText: {
    fontFamily: "var(--font-display)",
    fontSize: "1.1rem", fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.01em",
  },
  nav: {
    display: "flex", flexDirection: "column",
    padding: "8px 12px", gap: 2, flex: 1,
  },
  navItem: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 14px", borderRadius: "var(--radius)",
    color: "var(--text-muted)", fontSize: "0.9rem",
    fontWeight: 500, textDecoration: "none",
    transition: "all 0.15s",
  },
  navItemActive: {
    background: "var(--accent-glow)",
    color: "var(--accent)",
    borderLeft: "2px solid var(--accent)",
  },
  navIcon: { fontSize: "1.1rem", width: 20, textAlign: "center" },
  userBlock: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "14px 16px",
    margin: "0 12px",
    borderRadius: "var(--radius)",
    background: "var(--bg)",
    border: "1px solid var(--border)",
  },
  avatar: {
    width: 32, height: 32, borderRadius: "50%",
    background: "var(--accent-glow)",
    border: "1px solid var(--accent)",
    color: "var(--accent)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--font-display)",
    fontSize: "0.85rem", fontWeight: 700,
    flexShrink: 0,
  },
  userInfo: { flex: 1, minWidth: 0 },
  userName: {
    fontSize: "0.85rem", fontWeight: 600,
    color: "var(--text)", whiteSpace: "nowrap",
    overflow: "hidden", textOverflow: "ellipsis",
  },
  userEmail: { fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "capitalize" },
  logoutBtn: {
    background: "none", border: "none",
    color: "var(--text-muted)", cursor: "pointer",
    fontSize: "1rem", padding: 4,
    transition: "color 0.15s",
    flexShrink: 0,
  },
  mobileHeader: {
    display: "none",
    "@media(max-width:768px)": {
      display: "flex",
    },
    alignItems: "center", justifyContent: "space-between",
    padding: "14px 20px",
    borderBottom: "1px solid var(--border)",
    background: "var(--bg-card)",
    position: "sticky", top: 0, zIndex: 10,
  },
  menuBtn: {
    background: "none", border: "none",
    color: "var(--text)", fontSize: "1.3rem",
    cursor: "pointer", width: 36,
  },
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  content: { flex: 1, padding: "32px", maxWidth: 1200, width: "100%", margin: "0 auto" },
};
