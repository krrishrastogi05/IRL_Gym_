import { z } from "zod";

import { runStructured } from "@/lib/agents/base";
import type { Nudge } from "@/lib/types";

const SCHEMA = {
  type: "object",
  properties: {
    level: { type: "string", enum: ["hint", "suggestion", "action"] },
    text: { type: "string" },
    cta: { type: "string" }
  },
  required: ["level", "text", "cta"]
} as const;

const nudgeZod = z.object({ level: z.string(), text: z.string(), cta: z.string() });

export type WatcherInput = {
  goal: string;
  recentActivity: string[];
  leadsCount: number;
  savedCount: number;
  hasDrafted: boolean;
  idleSeconds: number;
};

function watcherPrompt(input: WatcherInput): string {
  return [
    `Goal: ${input.goal}.`,
    `Recent activity (newest last): ${input.recentActivity.join("; ") || "none yet"}.`,
    `Leads found: ${input.leadsCount}. Leads saved: ${input.savedCount}. Outreach drafted: ${input.hasDrafted ? "yes" : "no"}. Idle for ${input.idleSeconds}s.`,
    "Give one nudge that moves the learner toward landing the opportunity.",
    "Use level hint when active and on track; suggestion when stalling on the obvious next step; action when clearly stuck or idle over about 25 seconds.",
    "text must be 18 words or fewer and specific to the goal and current state. cta is a 1-3 word next-action label or an empty string."
  ].join("\n");
}

export function fallbackNudge(input: WatcherInput): Nudge {
  if (input.leadsCount === 0) {
    return { level: input.idleSeconds > 20 ? "suggestion" : "hint", text: "Search for who needs help with your goal - start specific.", cta: "" };
  }
  if (input.savedCount === 0) {
    return { level: input.idleSeconds > 25 ? "action" : "suggestion", text: "Save the 2-3 strongest leads so you can act on them.", cta: "Save leads" };
  }
  if (!input.hasDrafted) {
    return { level: input.idleSeconds > 20 ? "action" : "suggestion", text: "Draft outreach to your top saved lead now.", cta: "Draft outreach" };
  }
  return { level: "hint", text: "Sharpen the draft, then rehearse the conversation in the Gym.", cta: "Rehearse" };
}

export async function runWatcher(input: WatcherInput): Promise<Nudge> {
  const { data } = await runStructured<Nudge>({
    prompt: watcherPrompt(input),
    schema: SCHEMA,
    zodSchema: nudgeZod as z.ZodType<Nudge>,
    system: "You are a proactive research copilot. Return exactly one concise, specific nudge. Escalate as the learner stalls.",
    maxOutputTokens: 200,
    fallback: () => fallbackNudge(input)
  });

  const level = (["hint", "suggestion", "action"].includes(data.level) ? data.level : "hint") as Nudge["level"];
  return { level, text: String(data.text || "").slice(0, 160), cta: String(data.cta || "").slice(0, 40) };
}
