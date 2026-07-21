import type { Scores } from "@/lib/types";

const AXES: { key: keyof Scores; label: string }[] = [
  { key: "clarity", label: "Clarity" },
  { key: "assertiveness", label: "Assertive" },
  { key: "empathy", label: "Empathy" },
  { key: "composure", label: "Composure" }
];

// 4-axis radar (the "web"): Clarity / Assertiveness / Empathy / Composure.
// A generous padded viewBox keeps the axis labels from ever clipping.
export function SkillRadar({ scores, size = 168, variant = "onDark" }: { scores: Scores; size?: number; variant?: "onDark" | "onLight" }) {
  const R = size / 2;
  const padX = 62;
  const padY = 24;
  const W = size + padX * 2;
  const H = size + padY * 2;
  const cx = W / 2;
  const cy = H / 2;
  const angle = (i: number) => (-90 + i * 90) * (Math.PI / 180);
  const point = (i: number, value: number) => {
    const rad = (Math.max(0, Math.min(100, value)) / 100) * R;
    return [cx + rad * Math.cos(angle(i)), cy + rad * Math.sin(angle(i))];
  };
  const ring = (level: number) => AXES.map((_, i) => point(i, level).join(",")).join(" ");
  const dataPoly = AXES.map((a, i) => point(i, scores[a.key]).join(",")).join(" ");

  const c =
    variant === "onDark"
      ? { grid: "rgba(255,255,255,0.12)", axis: "rgba(255,255,255,0.22)", fill: "rgba(139,123,232,0.38)", stroke: "#b9a7ff", label: "#c7cadb", dot: "#d9cfff" }
      : { grid: "var(--border)", axis: "color-mix(in srgb, var(--muted-foreground) 40%, transparent)", fill: "rgba(139,123,232,0.20)", stroke: "var(--violet)", label: "var(--muted-foreground)", dot: "var(--violet)" };

  const label = (i: number) => {
    const [x, y] = point(i, 100);
    if (i === 0) return { x, y: y - 9, anchor: "middle" as const };
    if (i === 1) return { x: x + 7, y: y + 3, anchor: "start" as const };
    if (i === 2) return { x, y: y + 16, anchor: "middle" as const };
    return { x: x - 7, y: y + 3, anchor: "end" as const };
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img" aria-label="Skill radar">
      {[25, 50, 75, 100].map((lvl) => (
        <polygon key={lvl} points={ring(lvl)} fill="none" stroke={c.grid} strokeWidth={1} />
      ))}
      {AXES.map((_, i) => {
        const [x, y] = point(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={c.axis} strokeWidth={1} />;
      })}
      <polygon points={dataPoly} fill={c.fill} stroke={c.stroke} strokeWidth={2} className="transition-all duration-500" />
      {AXES.map((a, i) => {
        const [x, y] = point(i, scores[a.key]);
        return <circle key={a.key} cx={x} cy={y} r={2.6} fill={c.dot} />;
      })}
      {AXES.map((a, i) => {
        const p = label(i);
        return (
          <text key={a.key} x={p.x} y={p.y} textAnchor={p.anchor} fontSize={10} fontWeight={700} fill={c.label} style={{ fontFamily: "var(--font-mono)" }}>
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}
