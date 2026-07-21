export type Tone = "good" | "warn" | "flag";
export type Move = { label: string; tone: Tone };
export type Scores = { clarity: number; assertiveness: number; empathy: number; composure: number };
export type Analysis = { resistance: number; coach: string; moves: Move[]; scores: Scores };
export type ChatMessage = { role: "user" | "assistant"; content: string };
export type RoomRead = { mood: string; tension: number; openness: number; read: string; tell: string };
export type Hint = { approach: string; example: string };
export type GeneratedScenario = { person: string; role: string; situation: string; goal: string; opening: string; contexts: string[] };

export type Nudge = { level: "hint" | "suggestion" | "action"; text: string; cta: string };

export type Draft = { subject: string; body: string };
export type EditorIssue = { quote: string; label: string; fix: string };
export type EditorScores = { clarity: number; persuasion: number; warmth: number; brevity: number };
export type EditorReport = { issues: EditorIssue[]; scores: EditorScores; rewrite: string };

export type Lead = {
  id: string;
  name: string;
  why: string;
  signal: string;
  sourceUrl: string;
  sourceTitle: string;
};

export type Room = {
  key: string;
  icon: string;
  color: "coral" | "blue" | "yellow";
  title: string;
  label: string;
  person: string;
  role: string;
  avatar: string;
  situation: string;
  goal: string;
  opening: string;
  contexts: string[];
};
