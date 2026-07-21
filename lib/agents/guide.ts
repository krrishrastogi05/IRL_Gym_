import { z } from "zod";
import { runStructured } from "@/lib/agents/base";
import { sceneContext } from "@/lib/gym-context";
import type { ChatMessage, Hint, Room } from "@/lib/types";

const SCHEMA = {
  type: "object",
  properties: { approach: { type: "string" }, example: { type: "string" } },
  required: ["approach", "example"]
};
const zHint = z.object({ approach: z.string(), example: z.string() });

/** Guide: given what the opponent just said, how should the learner respond next?
 * A tactic + one example opener — not a full script. */
export async function runGuide(opts: { room: Partial<Room>; context: string; messages: ChatMessage[] }): Promise<Hint> {
  const { room, context, messages } = opts;
  const { data } = await runStructured<Hint>({
    prompt: [
      sceneContext(room, context, messages),
      "",
      `${room.person || "The other person"} just spoke. Coach the learner on how to respond next.`,
      "Return: approach (one sentence naming the tactic/strategy that fits this exact moment); example (one natural sentence the learner could actually say to open their response — a starting move, not the whole script)."
    ].join("\n"),
    schema: SCHEMA,
    zodSchema: zHint,
    system: "You are an elite communication coach. Practical, specific to this moment, never generic.",
    temperature: 0.6,
    maxOutputTokens: 260,
    fallback: () => ({
      approach: "Acknowledge what they said, then make one clear, specific request.",
      example: "That makes sense — here's what I'm hoping we can do…"
    })
  });
  return { approach: String(data.approach || "").slice(0, 200), example: String(data.example || "").slice(0, 200) };
}
