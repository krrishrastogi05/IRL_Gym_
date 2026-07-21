type Pt = { tension: number; openness: number };

// Affect grid (circumplex-style): x = openness (guarded→open), y = tension (calm→charged).
// The opponent's emotional state plots here and leaves a trail across the conversation.
export function AffectGrid({ points, size = 176, variant = "onDark" }: { points: Pt[]; size?: number; variant?: "onDark" | "onLight" }) {
  const pad = 30;
  const S = size;
  const W = S + pad * 2;
  const H = S + pad * 2;
  const px = (openness: number) => pad + (Math.max(0, Math.min(100, openness)) / 100) * S;
  const py = (tension: number) => pad + (1 - Math.max(0, Math.min(100, tension)) / 100) * S;

  const c =
    variant === "onDark"
      ? { grid: "rgba(255,255,255,0.14)", quad: "rgba(255,255,255,0.28)", trail: "rgba(185,167,255,0.55)", label: "#9195ad", tick: "#c7cadb" }
      : { grid: "var(--border)", quad: "color-mix(in srgb, var(--muted-foreground) 45%, transparent)", trail: "color-mix(in srgb, var(--violet) 55%, transparent)", label: "var(--muted-foreground)", tick: "var(--foreground)" };

  const last = points[points.length - 1];
  const dotColor = last ? `hsl(${Math.round(190 - (last.tension / 100) * 182)} 85% 60%)` : "#b9a7ff";
  const trailPoly = points.map((p) => `${px(p.openness)},${py(p.tension)}`).join(" ");

  const quad = (x: number, y: number, text: string, anchor: "start" | "end") => (
    <text x={x} y={y} textAnchor={anchor} fontSize={8} fontWeight={700} fill={c.quad} style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
      {text}
    </text>
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img" aria-label="Affect grid">
      <rect x={pad} y={pad} width={S} height={S} rx={8} fill="none" stroke={c.grid} strokeWidth={1} />
      <line x1={pad + S / 2} y1={pad} x2={pad + S / 2} y2={pad + S} stroke={c.grid} strokeDasharray="3 4" strokeWidth={1} />
      <line x1={pad} y1={pad + S / 2} x2={pad + S} y2={pad + S / 2} stroke={c.grid} strokeDasharray="3 4" strokeWidth={1} />

      {/* quadrant hints */}
      {quad(pad + 6, pad + 14, "GUARDED", "start")}
      {quad(pad + S - 6, pad + 14, "FIRED UP", "end")}
      {quad(pad + 6, pad + S - 7, "WITHDRAWN", "start")}
      {quad(pad + S - 6, pad + S - 7, "RECEPTIVE", "end")}

      {/* trail + points */}
      {points.length > 1 && <polyline points={trailPoly} fill="none" stroke={c.trail} strokeWidth={1.5} strokeDasharray="2 3" />}
      {points.slice(0, -1).map((p, i) => (
        <circle key={i} cx={px(p.openness)} cy={py(p.tension)} r={2.6} fill={c.trail} />
      ))}
      {last && (
        <>
          <circle cx={px(last.openness)} cy={py(last.tension)} r={9} fill={dotColor} opacity={0.22} />
          <circle cx={px(last.openness)} cy={py(last.tension)} r={5} fill={dotColor} stroke="#fff" strokeWidth={1.5} />
        </>
      )}

      {/* axis ticks */}
      <text x={pad} y={pad + S + 15} textAnchor="start" fontSize={8} fill={c.label} style={{ fontFamily: "var(--font-mono)" }}>← guarded</text>
      <text x={pad + S} y={pad + S + 15} textAnchor="end" fontSize={8} fill={c.label} style={{ fontFamily: "var(--font-mono)" }}>open →</text>
      <text x={pad - 6} y={pad + 4} textAnchor="end" fontSize={8} fill={c.label} style={{ fontFamily: "var(--font-mono)" }}>charged</text>
      <text x={pad - 6} y={pad + S} textAnchor="end" fontSize={8} fill={c.label} style={{ fontFamily: "var(--font-mono)" }}>calm</text>
    </svg>
  );
}
