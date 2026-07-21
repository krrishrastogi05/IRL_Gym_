import { z } from "zod";

import { generateJson, isModelConfigured } from "@/lib/ai/openai";
import { clampInt } from "@/lib/agents/base";
import { cleanReply, heuristicAnalysis, heuristicReply } from "@/lib/gym-heuristic";
import { contextGuidance } from "@/lib/rooms";
import type { Analysis, ChatMessage, Room, Tone } from "@/lib/types";

const TURN_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    resistance: { type: "integer", minimum: 0, maximum: 100 },
    coach: { type: "string" },
    moves: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          tone: { type: "string", enum: ["good", "warn", "flag"] }
        },
        required: ["label", "tone"]
      }
    },
    scores: {
      type: "object",
      properties: {
        clarity: { type: "integer", minimum: 0, maximum: 100 },
        assertiveness: { type: "integer", minimum: 0, maximum: 100 },
        empathy: { type: "integer", minimum: 0, maximum: 100 },
        composure: { type: "integer", minimum: 0, maximum: 100 }
      },
      required: ["clarity", "assertiveness", "empathy", "composure"]
    }
  },
  required: ["reply", "resistance", "coach", "moves", "scores"]
} as const;

const turnZod = z.object({
  reply: z.string(),
  resistance: z.number(),
  coach: z.string(),
  moves: z.array(z.object({ label: z.string(), tone: z.string() })),
  scores: z.object({
    clarity: z.number(),
    assertiveness: z.number(),
    empathy: z.number(),
    composure: z.number()
  })
});
type TurnRaw = z.infer<typeof turnZod>;

function scenarioPrompt(room: Partial<Room>, context: string, messages: ChatMessage[]): string {
  const dialogue = messages
    .map((message) => `${message.role === "assistant" ? room.person || "Roleplay partner" : "Learner"}: ${message.content}`)
    .join("\n");

  return [
    "You are the roleplay partner in IRL Gym, an educational simulator for high-stakes human conversations.",
    "Stay entirely in character. Make practice realistic, not easy and not cruel.",
    `Role: ${room.person || "The other person in the scenario"} (${room.role || "conversation partner"}).`,
    `Scenario: ${room.situation || room.title || "A high-stakes conversation"}.`,
    `Learner objective: ${room.goal || "Communicate clearly and respectfully"}.`,
    `Current room state: ${context}. Behave as: ${contextGuidance[context] || "calm, realistic, and responsive to the learner's choices"}.`,
    "Reply in 1-3 natural sentences. Respond directly to the learner's last message, build on earlier dialogue, and never repeat an earlier line or re-introduce yourself.",
    "Bring in one realistic constraint, question, or trade-off where useful. Do not coach, grade, mention AI, or narrate stage directions in the reply.",
    "Do not prefix the reply with a name, role, or speaker label. If the learner uses insults, threats, or demeaning labels, calmly set a boundary and invite a respectful restatement.",
    "Use the dialogue below as ground truth. Never invent commitments that were not made.",
    `Dialogue:\n${dialogue || "(The other person has just opened the conversation.)"}`
  ].join("\n\n");
}

function coachInstruction(resistance: number): string {
  return [
    "You are also a hidden expert communication coach who silently reads the learner's LAST message only.",
    `The partner's current resistance is ${resistance}/100 (0 = ready to agree, 100 = very firm). Effective, respectful moves lower it; weak, vague, or hostile moves raise it. Let the reply reflect the new level.`,
    "Return JSON only: reply (1-3 finished in-character sentences, no speaker label); resistance (0-100 integer); coach (one specific encouraging cue under 16 words); moves (1-3 items naming what the learner did in 2-4 words, each tone good, warn, or flag; use flag only for insults, threats, or demeaning language); scores (clarity, assertiveness, empathy, composure, 0-100 for this one message)."
  ].join("\n");
}

function normalize(raw: TurnRaw, previousResistance: number): Analysis {
  const moves = raw.moves
    .filter((move) => move && move.label)
    .slice(0, 3)
    .map((move) => ({
      label: String(move.label).slice(0, 42),
      tone: (["good", "warn", "flag"].includes(move.tone) ? move.tone : "warn") as Tone
    }));

  return {
    resistance: clampInt(raw.resistance, previousResistance),
    coach: String(raw.coach || "").slice(0, 140),
    moves,
    scores: {
      clarity: clampInt(raw.scores.clarity),
      assertiveness: clampInt(raw.scores.assertiveness),
      empathy: clampInt(raw.scores.empathy),
      composure: clampInt(raw.scores.composure)
    }
  };
}

export type RoleplayInput = { room: Partial<Room>; context: string; messages: ChatMessage[]; resistance: number };
export type RoleplayResult = { reply: string; analysis: Analysis; mode: "model" | "fallback" };

export async function runRoleplayTurn(input: RoleplayInput): Promise<RoleplayResult> {
  const { room, context, messages, resistance } = input;
  const labels = [room.person, room.role].filter(Boolean) as string[];
  const turnIndex = Math.max(0, messages.filter((message) => message.role === "user").length - 1);
  const fallback = (): RoleplayResult => {
    const last = messages.at(-1)?.content || "";
    return { reply: heuristicReply(last, turnIndex), analysis: heuristicAnalysis(last, resistance), mode: "fallback" };
  };

  if (!isModelConfigured()) return fallback();

  const prompt = `${scenarioPrompt(room, context, messages)}\n\n${coachInstruction(resistance)}`;
  const system = "You are a realistic roleplay partner and a hidden communication coach. Follow the scenario exactly and never break character in the reply field.";

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await generateJson<unknown>({
        prompt,
        schema: TURN_SCHEMA,
        system,
        maxOutputTokens: 700,
        name: "roleplay_turn"
      });
      const parsed = turnZod.safeParse(raw);
      if (parsed.success) {
        const reply = cleanReply(parsed.data.reply, labels);
        if (reply.length >= 2) return { reply, analysis: normalize(parsed.data, resistance), mode: "model" };
      }
    } catch {
      // Retry once, then use the deterministic on-stage fallback.
    }
  }

  return fallback();
}

