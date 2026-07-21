import type { Analysis, Move, Scores } from "@/lib/types";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

/** Trim a reply back to its last complete sentence so partial model output never hangs unfinished. */
export function clampToSentence(text = ""): string {
  const trimmed = text.trim();
  if (!trimmed || /[.!?]["')\]]?$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^[\s\S]*[.!?]["')\]]?(?=\s|$)/);
  return (match ? match[0] : trimmed).trim();
}

/** Strip a leading speaker label the model sometimes echoes, then clamp. */
export function cleanReply(text = "", labels: string[] = []): string {
  let output = text.trim();
  for (const label of labels.filter(Boolean)) {
    output = output.replace(new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*`, "i"), "").trim();
  }
  return clampToSentence(output);
}

const PERSONAL_ATTACK = /\b(idiot|stupid|dumb|moron|useless|fool|loser|incompetent|trash|asshole|bitch|fuck|fucking|shut up)\b/i;

const localReplies = [
  "I appreciate you bringing this to me. What specifically are you asking for?",
  "I understand the situation. Help me understand how you would make this work fairly.",
  "That is a clearer proposal. I can work with that next step."
];

/** Client and server fallback read, so live meters and move chips stay useful with no model key. */
export function heuristicAnalysis(text: string, previousResistance: number): Analysis {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const hasAsk = /\b(i need|i would like|i'd like|can we|could we|i am asking|i propose|let's|lets|i want)\b/i.test(text);
  const hasQuestion = /\?/.test(text);
  const hedges = (text.match(/\b(sorry|just|maybe|probably|i guess|kind of|whatever|um+|i think)\b/gi) || []).length;
  const attack = PERSONAL_ATTACK.test(text);
  const scores: Scores = {
    clarity: clamp(35 + (hasAsk ? 35 : 0) + Math.min(words.length, 24) - hedges * 8),
    assertiveness: clamp(30 + (hasAsk ? 40 : 0) - hedges * 12 + (attack ? 15 : 0)),
    empathy: clamp(45 + (hasQuestion ? 25 : 0) - (attack ? 45 : 0)),
    composure: clamp(attack ? 30 : 82 - hedges * 5)
  };
  const moves: Move[] = [];

  if (attack) {
    moves.push({ label: "Personal attack", tone: "flag" });
  } else {
    if (hasAsk) moves.push({ label: "Made a clear ask", tone: "good" });
    if (hasQuestion) moves.push({ label: "Invited their view", tone: "good" });
    if (hedges > 1) moves.push({ label: "Hedged language", tone: "warn" });
    if (words.length > 55) moves.push({ label: "Long turn", tone: "warn" });
  }

  if (!moves.length) moves.push({ label: "Held the room", tone: "good" });
  const delta = attack ? 12 : (hasAsk ? -6 : 4) + hedges * 3;
  const coach = attack
    ? "Name the behavior, not the person, then restate your need."
    : hasAsk
      ? "Good, specific ask - now pause and let them respond."
      : "Lead with a clear request before adding context.";

  return { resistance: clamp(previousResistance + delta), coach, moves: moves.slice(0, 3), scores };
}

export function heuristicReply(text: string, turnIndex: number): string {
  if (PERSONAL_ATTACK.test(text)) {
    return "I want to work through this with you, but I need us to keep the language respectful. Can you tell me what happened and what you need next?";
  }
  return localReplies[Math.min(turnIndex, localReplies.length - 1)];
}
