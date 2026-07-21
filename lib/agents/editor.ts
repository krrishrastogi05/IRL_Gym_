import { z } from "zod";

import { clampInt, runStructured } from "@/lib/agents/base";
import type { EditorIssue, EditorReport } from "@/lib/types";

const SCHEMA = {
  type: "object",
  properties: {
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          quote: { type: "string" },
          label: { type: "string" },
          fix: { type: "string" }
        },
        required: ["quote", "label", "fix"]
      }
    },
    scores: {
      type: "object",
      properties: {
        clarity: { type: "integer" },
        persuasion: { type: "integer" },
        warmth: { type: "integer" },
        brevity: { type: "integer" }
      },
      required: ["clarity", "persuasion", "warmth", "brevity"]
    },
    rewrite: { type: "string" }
  },
  required: ["issues", "scores", "rewrite"]
} as const;

const reportZod = z.object({
  issues: z.array(z.object({ quote: z.string(), label: z.string(), fix: z.string() })),
  scores: z.object({
    clarity: z.number(),
    persuasion: z.number(),
    warmth: z.number(),
    brevity: z.number()
  }),
  rewrite: z.string()
});

const WEAK = [
  { re: /\bI hope this (email )?finds you well\b/i, label: "Filler opener", fix: "Cut it. Open with why you are reaching out." },
  { re: /\bjust wanted to\b/i, label: "Hedge", fix: "Drop just - it shrinks your ask." },
  { re: /\b(circle back|touch base|synergy|leverage)\b/i, label: "Jargon", fix: "Say it in plain words." },
  { re: /\bsorry to bother\b/i, label: "Apologetic", fix: "Do not apologize for reaching out - lead with value." },
  { re: /\bI think\b/i, label: "Weak qualifier", fix: "State it directly without I think." }
];

export function heuristicReport(text: string): EditorReport {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const hasAsk = /\?/.test(text);
  const issues: EditorIssue[] = [];

  for (const weak of WEAK) {
    const match = text.match(weak.re);
    if (match) issues.push({ quote: match[0], label: weak.label, fix: weak.fix });
  }
  if (words > 180) issues.push({ quote: text.split(/\s+/).slice(0, 5).join(" "), label: "Too long", fix: "Cut to under 130 words - short outreach converts." });
  if (!hasAsk) issues.push({ quote: text.split(/\s+/).slice(-5).join(" "), label: "No clear ask", fix: "End with one specific, easy-to-say-yes-to request." });

  const score = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
  return {
    issues: issues.slice(0, 4),
    scores: {
      clarity: score(80 - issues.length * 10),
      persuasion: score((hasAsk ? 70 : 45) - issues.length * 6),
      warmth: score(65),
      brevity: score(words < 130 ? 88 : words < 180 ? 70 : 45)
    },
    rewrite: text
  };
}

export async function runEditor(text: string): Promise<EditorReport> {
  const { data } = await runStructured<EditorReport>({
    prompt: [
      "Critique this outreach draft for conversion, then rewrite it.",
      `Draft:\n${text}`,
      "Return issues (1-4 items; quote must be an exact weak substring from the draft; label is a 2-4 word problem; fix explains the improvement); scores clarity, persuasion, warmth, brevity each 0-100; rewrite is an improved full version no more than 20% longer than the original."
    ].join("\n"),
    schema: SCHEMA,
    zodSchema: reportZod,
    system: "You are a sharp outreach editor. Be specific and honest; quotes must be verbatim from the draft.",
    maxOutputTokens: 900,
    fallback: () => heuristicReport(text)
  });

  return {
    issues: data.issues.filter((issue) => issue.quote && issue.label).slice(0, 4).map((issue) => ({
      quote: issue.quote.slice(0, 120),
      label: issue.label.slice(0, 40),
      fix: issue.fix.slice(0, 160)
    })),
    scores: {
      clarity: clampInt(data.scores.clarity),
      persuasion: clampInt(data.scores.persuasion),
      warmth: clampInt(data.scores.warmth),
      brevity: clampInt(data.scores.brevity)
    },
    rewrite: (data.rewrite || text).slice(0, 2_000)
  };
}
