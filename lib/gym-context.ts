import type { ChatMessage, Room } from "@/lib/types";

/** Compact scene + transcript shared by the psychologist and guide agents. */
export function sceneContext(room: Partial<Room>, context: string, messages: ChatMessage[]): string {
  const dialogue = messages
    .map((m) => `${m.role === "assistant" ? room.person || "Partner" : "Learner"}: ${m.content}`)
    .join("\n");
  return [
    `Scenario: ${room.situation || room.title || "a high-stakes conversation"}.`,
    `The other person is ${room.person || "the partner"} (${room.role || "conversation partner"}).`,
    `The learner's goal: ${room.goal || "communicate clearly and get a good outcome"}.`,
    `Room disposition: ${context}.`,
    `\nConversation so far:\n${dialogue || "(not started)"}`
  ].join(" ");
}
