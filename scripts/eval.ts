// Deterministic agent-logic evals — no network, no framework.
// Run: npm run eval
import { clampToSentence, cleanReply, heuristicAnalysis } from "../lib/gym-heuristic";
import { heuristicReport } from "../lib/agents/editor";
import { fallbackNudge } from "../lib/agents/watcher";

let passed = 0;
const assert = (cond: boolean, msg: string) => {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exitCode = 1;
  } else {
    passed++;
  }
};

// --- Gym: reply hygiene ---
assert(clampToSentence("Of course. What is on your mind regarding the") === "Of course.", "clampToSentence trims a dangling fragment");
assert(clampToSentence("All good. Any questions?") === "All good. Any questions?", "clampToSentence keeps a complete reply");
assert(cleanReply("Elena Ruiz: I understand. It is fixed.", ["Elena Ruiz"]) === "I understand. It is fixed.", "cleanReply strips a leading speaker label");

// --- Gym: move reading ---
const weak = heuristicAnalysis("um ok maybe that is fine i guess whatever", 55);
assert(weak.scores.assertiveness < 40, "weak reply scores low assertiveness");
const attack = heuristicAnalysis("you are an idiot", 55);
assert(attack.moves.some((m) => m.tone === "flag"), "an insult is flagged");

// --- Editor: catches filler + no ask ---
const report = heuristicReport("Hi, I hope this email finds you well. I just wanted to touch base.");
assert(report.issues.some((i) => /filler|opener/i.test(i.label)), "editor flags the filler opener");
assert(report.issues.some((i) => /ask/i.test(i.label)), "editor flags the missing ask");

// --- Watcher: escalates as the user stalls ---
assert(fallbackNudge({ goal: "g", recentActivity: [], leadsCount: 0, savedCount: 0, hasDrafted: false, idleSeconds: 2 }).level === "hint", "no leads yet → hint");
assert(fallbackNudge({ goal: "g", recentActivity: [], leadsCount: 5, savedCount: 0, hasDrafted: false, idleSeconds: 40 }).level === "action", "leads but idle & unsaved → action");

console.log(process.exitCode ? "\nEVAL FAILED" : `\n✓ eval ok — ${passed} checks passed`);
