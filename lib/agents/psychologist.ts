import { z } from "zod";
import { runStructured, clampInt } from "@/lib/agents/base";
import { sceneContext } from "@/lib/gym-context";
import type { ChatMessage, RoomRead, Room } from "@/lib/types";

const SCHEMA = {
  type: "object",
  properties: {
    mood: { type: "string" },
    tension: { type: "integer" },
    openness: { type: "integer" },
    read: { type: "string" },
    tell: { type: "string" }
  },
  required: ["mood", "tension", "openness", "read", "tell"]
};
const zRead = z.object({
  mood: z.string(),
  tension: z.number(),
  openness: z.number(),
  read: z.string(),
  tell: z.string()
});

export async function runPsychologist(opts: { room: Partial<Room>; context: string; messages: ChatMessage[] }): Promise<RoomRead> {
  const { room, context, messages } = opts;
  const { data } = await runStructured<RoomRead>({
    prompt: [
      sceneContext(room, context, messages),
      "",
      `As an expert psychologist observing this conversation, read ${room.person || "the other person"}'s current inner state — not what they said, what's underneath it.`,
      "Return: mood (2-3 words for their emotional state right now); tension (0-100, how charged the room is); openness (0-100, how persuadable they are this moment); read (1-2 sentences on the subtext / what's really driving them); tell (one concrete behavioural cue the learner should notice and use)."
    ].join("\n"),
    schema: SCHEMA,
    zodSchema: zRead,
    system: "You are a perceptive behavioural psychologist. Be specific and human; avoid jargon.",
    temperature: 0.6,
    maxOutputTokens: 320,
    fallback: () => ({
      mood: "Composed",
      tension: 45,
      openness: 50,
      read: "They are weighing your last point and haven't committed either way.",
      tell: "Watch whether they ask a follow-up question — that signals real interest."
    })
  });
  return {
    mood: String(data.mood || "").slice(0, 40),
    tension: clampInt(data.tension, 45),
    openness: clampInt(data.openness, 50),
    read: String(data.read || "").slice(0, 220),
    tell: String(data.tell || "").slice(0, 160)
  };
}
