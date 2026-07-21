type AgentStatus = "idle" | "working" | "done";

type Node = { key: string; label: string; sub: string; status: AgentStatus };

// Live multi-agent diagram: nodes light up and connectors flow as each agent runs.
export function AgentFlow({
  agents,
  opponentName,
  showGuide
}: {
  agents: { coach: AgentStatus; opponent: AgentStatus; psych: AgentStatus; guide: AgentStatus };
  opponentName: string;
  showGuide: boolean;
}) {
  const nodes: Node[] = [
    { key: "coach", label: "Coach", sub: "scores you", status: agents.coach },
    { key: "opponent", label: opponentName, sub: "responds", status: agents.opponent },
    { key: "psych", label: "Psychologist", sub: "reads room", status: agents.psych },
    ...(showGuide ? [{ key: "guide", label: "Guide", sub: "suggests", status: agents.guide } as Node] : [])
  ];
  const n = nodes.length;
  const step = 132;
  const W = n * step;
  const H = 80;
  const cy = 26;
  const x = (i: number) => step / 2 + i * step;

  const nodeFill = (s: AgentStatus) =>
    s === "working" ? "color-mix(in srgb, var(--violet) 16%, var(--card))" : s === "done" ? "color-mix(in srgb, var(--good) 16%, var(--card))" : "var(--card)";
  const nodeStroke = (s: AgentStatus) => (s === "working" ? "var(--violet)" : s === "done" ? "var(--good)" : "var(--border)");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Agent activity" className="w-full">
      {/* connectors */}
      {nodes.slice(0, -1).map((node, i) => {
        const active = node.status === "working" || nodes[i + 1].status === "working";
        return (
          <line
            key={`c${i}`}
            x1={x(i) + 17}
            y1={cy}
            x2={x(i + 1) - 17}
            y2={cy}
            stroke={active ? "var(--violet)" : "var(--border)"}
            strokeWidth={active ? 2 : 1.5}
            strokeDasharray={active ? "4 4" : undefined}
            className={active ? "flow-line" : undefined}
          />
        );
      })}
      {/* nodes */}
      {nodes.map((node, i) => (
        <g key={node.key}>
          {node.status === "working" && (
            <circle cx={x(i)} cy={cy} r={17} fill="none" stroke="var(--violet)" strokeWidth={1.5} className="node-pulse" />
          )}
          <circle cx={x(i)} cy={cy} r={13} fill={nodeFill(node.status)} stroke={nodeStroke(node.status)} strokeWidth={2} className="transition-all duration-300" />
          {node.status === "done" ? (
            <text x={x(i)} y={cy + 4} textAnchor="middle" fontSize={12} fontWeight={800} fill="var(--good)">
              ✓
            </text>
          ) : (
            <circle cx={x(i)} cy={cy} r={2.6} fill={node.status === "working" ? "var(--violet)" : "var(--muted-foreground)"} opacity={node.status === "working" ? 1 : 0.4} />
          )}
          <text x={x(i)} y={cy + 28} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="var(--foreground)">
            {node.label}
          </text>
          <text x={x(i)} y={cy + 41} textAnchor="middle" fontSize={8.5} fill="var(--muted-foreground)" style={{ fontFamily: "var(--font-mono)" }}>
            {node.sub}
          </text>
        </g>
      ))}
    </svg>
  );
}

