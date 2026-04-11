import { useEffect, useRef } from "react";

export default function Heatmap({ points = [] }) {

console.log("HEATMAP POINTS:", points);
  const canvasRef = useRef(null);

  useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // 🔥 Delay to ensure layout is ready
  setTimeout(() => {
    const parent = canvas.parentElement;
    const width = parent.offsetWidth;
    const height = parent.offsetHeight;

    console.log("Canvas size:", width, height);

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    points.forEach((p) => {
      const xVal = p.xPct ?? p.x;
      const yVal = p.yPct ?? p.y;

      if (xVal == null || yVal == null) return;

      const x = (xVal / 100) * width;
      const y = (yVal / 100) * height;

      // 🔴 DEBUG DOT (MUST SHOW)
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();

      // 🔥 Heatmap glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 50);
      gradient.addColorStop(0, "rgba(255, 80, 80, 0.7)");
      gradient.addColorStop(0.5, "rgba(255, 180, 0, 0.3)");
      gradient.addColorStop(1, "rgba(255, 0, 0, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, 50, 0, Math.PI * 2);
      ctx.fill();
    });
  }, 50); // 🔥 IMPORTANT DELAY
}, [points]);

  return (
  <div style={s.wrap}>
    <div style={s.label}>
      🔥 Click Heatmap — {points.length} click{points.length !== 1 ? "s" : ""}
    </div>

    <div style={s.canvasWrap}>
      <canvas ref={canvasRef} style={s.canvas} />

      {!points.length && (
        <div style={s.emptyOverlay}>
          No click data recorded
        </div>
      )}
    </div>
  </div>
);

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
  emptyOverlay: {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--text-muted)",
  fontSize: "0.85rem",
}
};

