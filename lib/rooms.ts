import type { Room } from "@/lib/types";

export const rooms: Record<string, Room> = {
  extension: {
    key: "extension",
    icon: "⌇",
    color: "coral",
    title: "Ask for more time",
    label: "Academic · 06 min",
    person: "Professor Maya Chen",
    role: "Your professor",
    avatar: "maya-chen",
    situation:
      "Your research paper is due tomorrow. A family commitment disrupted your plan, and you need two more days to submit work you are proud of.",
    goal: "Request a short extension clearly, without over-explaining or assuming the answer is no.",
    opening: "Hi. I saw your note about the paper deadline. What did you want to discuss?",
    contexts: ["Supportive", "Rushed", "Stressed", "Skeptical"]
  },
  team: {
    key: "team",
    icon: "◫",
    color: "blue",
    title: "Address the teammate",
    label: "Collaboration · 08 min",
    person: "Jordan Patel",
    role: "Your project teammate",
    avatar: "jordan-patel",
    situation:
      "Your group presentation is in two days. Jordan missed the last two meetings and their section is unfinished.",
    goal: "Address the impact directly, invite their perspective, and agree on a concrete next step.",
    opening: "Hey, I know I have been quiet. I had a lot going on. What is up?",
    contexts: ["Open", "Distracted", "Defensive", "Overwhelmed"]
  },
  offer: {
    key: "offer",
    icon: "⌁",
    color: "yellow",
    title: "Negotiate your offer",
    label: "Career · 10 min",
    person: "Elena Ruiz",
    role: "Campus recruiter",
    avatar: "elena-ruiz",
    situation:
      "You received your first internship offer. You are excited, but the stipend is lower than the range discussed in the interview.",
    goal: "Show enthusiasm, explain your value, and make a specific counteroffer without accepting too quickly.",
    opening:
      "Congratulations again. We are excited about the possibility of you joining us. Do you have any questions about the offer?",
    contexts: ["Warm", "Rushed", "Budget-conscious", "Skeptical"]
  },
  ship: {
    key: "ship",
    icon: "⚠",
    color: "coral",
    title: "Push back on shipping",
    label: "AI Lab · 10 min",
    person: "Marcus Feld",
    role: "Head of Product",
    avatar: "marcus-feld",
    situation:
      "Your team's model ships Friday for the board demo. Your evals surfaced a reproducible jailbreak and a fairness regression that the release notes don't mention. Marcus owns the launch and the date is political.",
    goal: "Hold the line on a responsible release: name the risk in terms he cares about, propose a concrete path that protects users, and don't cave to the deadline or get branded 'the blocker'.",
    opening:
      "Hey — we're locked for Friday, right? The board demo's on the calendar and marketing already has the post queued. Anything you need from me to get it over the line?",
    contexts: ["Deadline-driven", "Skeptical", "Collaborative", "Dismissive"]
  }
};

export const contextGuidance: Record<string, string> = {
  Supportive: "warm and open, but still responsible for fair academic standards",
  Rushed: "short on time; acknowledge the request but ask for a concise version or a follow-up time",
  Stressed: "under deadline pressure; not hostile, but focused on immediate constraints",
  Skeptical: "needs a credible and specific case before agreeing",
  Open: "willing to repair the relationship and solve the problem",
  Distracted: "has little attention available and needs a concise conversation",
  Defensive: "initially protects themself, but can engage with a calm impact statement",
  Overwhelmed: "struggling with capacity; needs specific, practical next steps",
  Warm: "positive and encouraging while still representing the organization",
  "Budget-conscious": "interested but constrained by an actual budget",
  Firm: "polite but has clear limits and needs evidence to change course",
  "Deadline-driven": "fixated on hitting Friday and the board demo; will only consider changes that protect the date",
  Dismissive: "treats the risk as an edge case at first; needs concrete evidence and business framing before taking it seriously",
  Collaborative: "wants to do the right thing and will co-own a plan once the risk and a path are made clear"
};
