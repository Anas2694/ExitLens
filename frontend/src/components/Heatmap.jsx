import { useEffect, useRef } from "react";

export default function Heatmap({ points = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!points.length) return;

    points.forEach((p) => {
      if (p.xPct == null || p.yPct == null) return;

      const x = (p.xPct / 100) * canvas.width;
const y = (p.yPct / 100) * canvas.height;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 40);
      gradient.addColorStop(0, "rgba(255, 80, 80, 0.75)");
      gradient.addColorStop(0.4, "rgba(255, 180, 0, 0.35)");
      gradient.addColorStop(1, "rgba(255, 0, 0, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, 40, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [points]);

  if (!points.length) {
    return (
      <div style={s.empty}>
        No click data recorded for this session
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <div style={s.label}>
        🔥 Click Heatmap — {points.length} click{points.length !== 1 ? "s" : ""}
      </div>
      <div style={s.canvasWrap}>
        <canvas ref={canvasRef} style={s.canvas} />
      </div>
    </div>
  );
}

const s = {
  wrap: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "20px",
    marginBottom: 20,
  },
  label: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    marginBottom: 12,
    fontWeight: 600,
  },
  canvasWrap: {
    position: "relative",
    width: "100%",
    height: 300,
    background: "#0d1117",
    borderRadius: "var(--radius)",
    overflow: "hidden",
  },
  canvas: {
    width: "100%",
    height: "100%",
    display: "block",
  },
  empty: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "20px",
    color: "var(--text-muted)",
    fontSize: "0.85rem",
    marginBottom: 20,
  },
};