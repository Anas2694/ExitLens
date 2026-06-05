import { useEffect, useRef } from "react";

export default function Heatmap({ points = [], title = "Click Heatmap", subtitle }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const ctx = canvas.getContext("2d");
    const width = parent.offsetWidth || 600;
    const height = parent.offsetHeight || 300;
    const ratio = window.devicePixelRatio || 1;
    const maxCount = Math.max(1, ...points.map((p) => p.count || 1));

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    points.forEach((p) => {
      const xVal = p.xPct ?? p.x;
      const yVal = p.yPct ?? p.y;
      if (xVal == null || yVal == null) return;

      const x = (Number(xVal) / 100) * width;
      const y = (Number(yVal) / 100) * height;
      const intensity = Math.max(0.18, Math.min(1, (p.count || 1) / maxCount));
      const radius = 28 + intensity * 34;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

      gradient.addColorStop(0, `rgba(255, 82, 82, ${0.75 * intensity})`);
      gradient.addColorStop(0.45, `rgba(255, 188, 66, ${0.35 * intensity})`);
      gradient.addColorStop(1, "rgba(255, 82, 82, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [points]);

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div>
          <div style={s.label}>{title}</div>
          {subtitle && <div style={s.sub}>{subtitle}</div>}
        </div>
        <span className="badge badge-info">{points.length} point{points.length !== 1 ? "s" : ""}</span>
      </div>
      <div style={s.canvasWrap}>
        <canvas ref={canvasRef} style={s.canvas} />
        {!points.length && <div style={s.emptyOverlay}>No click data recorded</div>}
      </div>
    </div>
  );
}

const s = {
  wrap: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: 20,
    marginBottom: 20,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 12,
  },
  label: {
    fontSize: "0.92rem",
    color: "var(--text-soft)",
    fontWeight: 700,
  },
  sub: {
    color: "var(--text-muted)",
    fontSize: "0.8rem",
    marginTop: 4,
  },
  canvasWrap: {
    position: "relative",
    width: "100%",
    height: 300,
    background: "linear-gradient(180deg, #0d1117, #111827)",
    borderRadius: "var(--radius)",
    overflow: "hidden",
  },
  canvas: {
    display: "block",
  },
  emptyOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-muted)",
    fontSize: "0.85rem",
  },
};
