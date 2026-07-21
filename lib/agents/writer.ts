import { z } from "zod";

import { runStructured } from "@/lib/agents/base";
import type { Draft, Lead } from "@/lib/types";

const SCHEMA = {
  type: "object",
  properties: { subject: { type: "string" }, body: { type: "string" } },
  required: ["subject", "body"]
} as const;

const draftZod = z.object({ subject: z.string(), body: z.string() });

export async function runWriter(options: { goal: string; lead: Lead | null }): Promise<Draft> {
  const { goal, lead } = options;
  const leadLine = lead
    ? `Lead: ${lead.name}. Why it fits: ${lead.why}. Timing signal: ${lead.signal}.`
    : "No specific lead selected - write a strong general template for this goal.";

  const { data } = await runStructured<Draft>({
    prompt: [
      "Write a short, high-conversion cold outreach email.",
      `Goal: ${goal || "open a valuable conversation"}.`,
      leadLine,
      "Rules: 90-130 words; specific and warm; reference the timing signal; exactly one clear ask; no filler and no I hope this finds you well; sign as [Your name]. Return a subject line and the body."
    ].join("\n"),
    schema: SCHEMA,
    zodSchema: draftZod,
    system: "You are an expert at outreach that gets replies. Concrete, human, and brief.",
    maxOutputTokens: 500,
    fallback: () => ({
      subject: lead ? `Quick idea for ${lead.name}` : "Quick idea",
      body: `Hi there,\n\nI came across ${lead ? lead.name : "your work"} and noticed ${lead ? lead.signal.toLowerCase() : "a timely opportunity"}. I help with ${goal || "exactly this"}, and I think there is a specific way I could help.\n\nWould you be open to a 15-minute call this week?\n\nThanks,\n[Your name]`
    })
  });

  return { subject: data.subject.slice(0, 140), body: data.body.slice(0, 1_600) };
}
