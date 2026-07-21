import { z } from "zod";
import { runStructured } from "@/lib/agents/base";
import type { GeneratedScenario } from "@/lib/types";

const SCHEMA = {
  type: "object",
  properties: {
    person: { type: "string" },
    role: { type: "string" },
    situation: { type: "string" },
    goal: { type: "string" },
    opening: { type: "string" },
    contexts: { type: "array", items: { type: "string" } }
  },
  required: ["person", "role", "situation", "goal", "opening", "contexts"]
};
const zScenario = z.object({
  person: z.string(),
  role: z.string(),
  situation: z.string(),
  goal: z.string(),
  opening: z.string(),
  contexts: z.array(z.string())
});

export async function runScenario(description: string): Promise<GeneratedScenario> {
  const { data } = await runStructured<GeneratedScenario>({
    prompt: [
      `The learner wants to practice this real situation: "${description}".`,
      "Design a realistic 1-on-1 roleplay for it. Return:",
      "person (a realistic first + last name for the other party); role (their role relative to the learner); situation (2 sentences of concrete setup); goal (the learner's objective in one sentence); opening (the other person's first spoken line, natural and in-character, no quotes); contexts (exactly 4 short 1-2 word disposition labels the room could take, e.g. Warm, Skeptical, Rushed, Defensive)."
    ].join("\n"),
    schema: SCHEMA,
    zodSchema: zScenario,
    system: "You design realistic conversation simulations. Make it specific, plausible, and worth practicing.",
    temperature: 0.8,
    maxOutputTokens: 500,
    fallback: () => ({
      person: "Alex Rivera",
      role: "The other person in your situation",
      situation: `${description.slice(0, 160)}. It matters to you, and the outcome is not guaranteed.`,
      goal: "Say what you need clearly and stay composed under pressure.",
      opening: "Okay, I'm here. What did you want to talk about?",
      contexts: ["Open", "Guarded", "Rushed", "Skeptical"]
    })
  });
  const contexts = (data.contexts || []).map((c) => String(c).slice(0, 20)).filter(Boolean).slice(0, 4);
  return {
    person: String(data.person || "Alex Rivera").slice(0, 60),
    role: String(data.role || "The other person").slice(0, 80),
    situation: String(data.situation || description).slice(0, 320),
    goal: String(data.goal || "Communicate clearly and stay composed.").slice(0, 200),
    opening: String(data.opening || "What did you want to talk about?").slice(0, 240),
    contexts: contexts.length >= 2 ? contexts : ["Open", "Guarded", "Rushed", "Skeptical"]
  };
}
