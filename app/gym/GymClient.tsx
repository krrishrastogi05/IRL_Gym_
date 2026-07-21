"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, Mic, X, Sparkles, ArrowRight, Flag, Loader2, Brain, Lightbulb, Wand2 } from "lucide-react";
import { rooms } from "@/lib/rooms";
import type { Analysis, Move, Room, ChatMessage, RoomRead, Hint, GeneratedScenario } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SkillRadar } from "@/components/gym/SkillRadar";
import { AgentFlow } from "@/components/gym/AgentFlow";
import { AffectGrid } from "@/components/gym/AffectGrid";

const INTENSITY: Record<string, number> = { Gentle: 35, Realistic: 55, Hard: 74 };
const ATTACK = /\b(idiot|stupid|dumb|moron|useless|fool|loser|incompetent|trash|asshole|bitch|fuck|fucking|shut up)\b/i;
const roomBg: Record<Room["color"], string> = { coral: "bg-coral", blue: "bg-blue", yellow: "bg-yellow" };

const avatarUrl = (seed: string) =>
  `https://api.dicebear.com/10.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=eadfdb`;

type Item = { kind: "user"; text: string } | { kind: "moves"; moves: Move[] } | { kind: "assistant"; text: string };
type Screen = "picker" | "brief" | "sim" | "debrief";
type AgentStatus = "idle" | "working" | "done";
type Agents = { coach: AgentStatus; opponent: AgentStatus; psych: AgentStatus; guide: AgentStatus };
type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export default function GymClient({ initialRoom }: { initialRoom?: string }) {
  const startKey = initialRoom && rooms[initialRoom] ? initialRoom : "offer";
  const [screen, setScreen] = useState<Screen>(initialRoom && rooms[initialRoom] ? "brief" : "picker");
  const [roomKey, setRoomKey] = useState<string>(startKey);
  const [customRoom, setCustomRoom] = useState<Room | null>(null);
  const [context, setContext] = useState<string>(rooms[startKey].contexts[0]);
  const [guided, setGuided] = useState(true);
  const [hintMode, setHintMode] = useState(false);
  const [ramp, setRamp] = useState(false);
  const [intensity, setIntensity] = useState("Realistic");

  const [session, setSession] = useState<ChatMessage[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [streaming, setStreaming] = useState("");
  const [sending, setSending] = useState(false);
  const [turn, setTurn] = useState(0);
  const [resistance, setResistance] = useState(55);
  const [current, setCurrent] = useState<Analysis | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [coach, setCoach] = useState("Start with a clear request. You can add context after they understand what you need.");
  const [coachOpen, setCoachOpen] = useState(true);
  const [input, setInput] = useState("");
  const [flag, setFlag] = useState<{ n: number; title: string; body: string } | null>(null);
  const [flagShow, setFlagShow] = useState(false);
  const [listening, setListening] = useState(false);

  const [roomRead, setRoomRead] = useState<RoomRead | null>(null);
  const [roomReads, setRoomReads] = useState<RoomRead[]>([]);
  const [stageTab, setStageTab] = useState<"room" | "you">("room");
  const [hint, setHint] = useState<Hint | null>(null);
  const [apiError, setApiError] = useState("");
  const [modelMode, setModelMode] = useState<"model" | "fallback" | null>(null);
  const [agents, setAgents] = useState<Agents>({ coach: "idle", opponent: "idle", psych: "idle", guide: "idle" });

  // custom scenario builder
  const [customText, setCustomText] = useState("");
  const [creating, setCreating] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRec | null>(null);
  const voiceOnRef = useRef(false);
  const flagTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flagCount = useRef(0);

  const room = customRoom ?? rooms[roomKey];

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [items, streaming]);

  useEffect(() => () => {
    try { recognitionRef.current?.abort(); } catch {}
    window.speechSynthesis?.cancel();
    clearTimeout(flagTimer.current);
  }, []);

  const setAgent = (k: keyof Agents, v: AgentStatus) => setAgents((a) => ({ ...a, [k]: v }));

  const openBrief = (key: string) => {
    setApiError("");
    setCustomRoom(null);
    setRoomKey(key);
    setContext(rooms[key].contexts[0]);
    setScreen("brief");
  };

  const createCustom = async () => {
    const description = customText.trim();
    if (!description || creating) return;
    setCreating(true);
    setApiError("");
    try {
      const response = await fetch("/api/scenario", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description })
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : "The scenario could not be built. Please try again.";
        throw new Error(message);
      }
      const generated = data as Partial<GeneratedScenario>;
      const person = typeof generated.person === "string" ? generated.person.trim() : "";
      const role = typeof generated.role === "string" ? generated.role.trim() : "";
      const situation = typeof generated.situation === "string" ? generated.situation.trim() : "";
      const goal = typeof generated.goal === "string" ? generated.goal.trim() : "";
      const opening = typeof generated.opening === "string" ? generated.opening.trim() : "";
      if (!person || !role || !situation || !goal || !opening) {
        throw new Error("The scenario was incomplete. Please try again.");
      }      const contexts = Array.isArray(generated.contexts)
        ? generated.contexts.filter((value): value is string => typeof value === "string" && Boolean(value.trim())).slice(0, 4)
        : [];
      const title = description.split(/\s+/).slice(0, 5).join(" ");
      const custom: Room = {
        key: "custom",
        icon: "?",
        color: "blue",
        title: title.charAt(0).toUpperCase() + title.slice(1),
        label: "Custom · your situation",
        person,
        role,
        avatar: person,
        situation,
        goal,
        opening,
        contexts: contexts.length >= 2 ? contexts : ["Open", "Guarded", "Rushed", "Skeptical"]
      };
      setCustomRoom(custom);
      setContext(custom.contexts[0]);
      setCustomText("");
      setScreen("brief");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "The scenario could not be built. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const fetchRoomRead = useCallback((messages: ChatMessage[]) => {
    setAgent("psych", "working");
    fetch("/api/psych", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ room, context, messages })
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Room read unavailable");
        return response.json() as Promise<RoomRead>;
      })
      .then((data) => {
        if (!data || typeof data.mood !== "string") throw new Error("Invalid room read");
        setRoomRead(data);
        setRoomReads((previous) => [...previous, data].slice(-8));
      })
      .catch(() => setApiError((currentError) => currentError || "The room read is temporarily unavailable. Your practice can continue."))
      .finally(() => setAgent("psych", "done"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, context]);

  const fetchHint = useCallback((messages: ChatMessage[]) => {
    setAgent("guide", "working");
    setHint(null);
    fetch("/api/hint", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ room, context, messages })
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Hint unavailable");
        return response.json() as Promise<Hint>;
      })
      .then((data) => {
        if (!data || typeof data.approach !== "string" || typeof data.example !== "string") throw new Error("Invalid hint");
        setHint(data);
      })
      .catch(() => setApiError((currentError) => currentError || "The guide is temporarily unavailable. You can keep going without a hint."))
      .finally(() => setAgent("guide", "done"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, context]);
  const begin = () => {
    const opening: ChatMessage[] = [{ role: "assistant", content: room.opening }];
    setSession(opening);
    setItems([{ kind: "assistant", text: room.opening }]);
    setStreaming("");
    setSending(false);
    setTurn(0);
    setResistance(INTENSITY[intensity] ?? 55);
    setCurrent(null);
    setAnalyses([]);
    setRoomRead(null);
    setRoomReads([]);
    setStageTab("room");
    setHint(null);
    setApiError("");
    setModelMode(null);
    setAgents({ coach: "idle", opponent: "idle", psych: "idle", guide: "idle" });
    setCoach("Start with a clear request. You can add context after they understand what you need.");
    setCoachOpen(guided);
    setScreen("sim");
    fetchRoomRead(opening); // psychologist reads the opening line
    if (hintMode) fetchHint(opening);
  };

  const showFlag = (title: string, body: string) => {
    flagCount.current += 1;
    setFlag({ n: flagCount.current, title, body });
    setFlagShow(false);
    requestAnimationFrame(() => setFlagShow(true));
    clearTimeout(flagTimer.current);
    flagTimer.current = setTimeout(() => setFlagShow(false), 6500);
  };

  const speak = (text: string) => {
    if (!voiceOnRef.current || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02;
    window.speechSynthesis.speak(u);
  };

  const submit = async (raw: string) => {
    const text = raw.trim();
    if (!text || sending) return;
    if (listening) recognitionRef.current?.stop();
    setInput("");
    setApiError("");
    setSending(true);
    setHint(null);
    setAgents({ coach: "working", opponent: "working", psych: "idle", guide: "idle" });
    if (ATTACK.test(text)) {
      showFlag("Boundary check", "That wording attacks the person, not the problem. Name the behavior and its impact, then restate what you need.");
    }

    const nextSession: ChatMessage[] = [...session, { role: "user", content: text }];
    setSession(nextSession);
    setItems((previous) => [...previous, { kind: "user", text }]);

    const sendResistance = ramp ? Math.min(100, resistance + turn * 6) : resistance;
    let full = "";
    let analysis: Analysis | null = null;

    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ room, context, messages: nextSession, resistance: sendResistance })
      });
      if (!response.ok || !response.body) {
        const data: unknown = await response.json().catch(() => null);
        const message = data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : "The response stream was not available.";
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let serverError = "";
      const handle = (event: string) => {
        const name = event.split("\n").find((line) => line.startsWith("event: "))?.slice(7) || "message";
        const dataLine = event.split("\n").find((line) => line.startsWith("data: "));
        if (!dataLine) return;

        let payload: unknown;
        try {
          payload = JSON.parse(dataLine.slice(6));
        } catch {
          return;
        }
        if (!payload || typeof payload !== "object") return;
        const data = payload as { text?: unknown; message?: unknown; mode?: unknown; moves?: unknown; coach?: unknown };

        if (name === "analysis") {
          const candidate = payload as Analysis;
          if (typeof candidate.resistance !== "number" || !candidate.scores || !Array.isArray(candidate.moves)) return;
          analysis = candidate;
          setCurrent(candidate);
          setAgent("coach", "done");
          setItems((previous) => [...previous, { kind: "moves", moves: candidate.moves }]);
          if (guided && typeof candidate.coach === "string") {
            setCoach(candidate.coach);
            setCoachOpen(true);
          }
        }
        if (name === "meta" && (data.mode === "model" || data.mode === "fallback")) setModelMode(data.mode);
        if (name === "token" && typeof data.text === "string") {
          full += data.text;
          setStreaming(full);
        }
        if (name === "error" && typeof data.message === "string") serverError = data.message;
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        events.forEach(handle);
      }
      if (buffer.trim()) handle(buffer);
      if (serverError) throw new Error(serverError);
      if (!full.trim()) throw new Error("The roleplay partner returned an empty response.");

      setStreaming("");
      setAgent("opponent", "done");
      setItems((previous) => [...previous, { kind: "assistant", text: full }]);
      const afterReply: ChatMessage[] = [...nextSession, { role: "assistant", content: full }];
      setSession(afterReply);
      speak(full);
      const completedAnalysis = analysis as Analysis | null;
      if (completedAnalysis) {
        setResistance(completedAnalysis.resistance);
        setAnalyses((previous) => [...previous, completedAnalysis]);
      }
      setTurn((currentTurn) => currentTurn + 1);
      fetchRoomRead(afterReply);
      if (hintMode) fetchHint(afterReply);
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "Could not respond. Try again.";
      setStreaming("");
      setApiError(message);
      setAgents({ coach: "idle", opponent: "idle", psych: "idle", guide: "idle" });
      setItems((previous) => [...previous, { kind: "assistant", text: `Warning: ${message}` }]);
    } finally {
      setSending(false);
    }
  };
  const requestHintNow = () => {
    if (agents.guide === "working") return;
    fetchHint(session);
  };

  const toggleMic = useCallback(() => {
    if (listening) { recognitionRef.current?.stop(); return; }
    const Ctor = (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
    if (!Ctor) {
      setApiError("Voice input is not available in this browser. You can type your reply instead.");
      return;
    }
    const rec = new Ctor();
    recognitionRef.current = rec;
    voiceOnRef.current = true;
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    const base = input.trim() ? `${input.trim()} ` : "";
    rec.onresult = (e) => {
      let heard = "";
      for (let i = 0; i < e.results.length; i++) heard += e.results[i][0].transcript;
      setInput(base + heard);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      setApiError("Voice input stopped before it could capture your reply. Please try again or type it.");
    };
    setListening(true);
    try { rec.start(); } catch { setListening(false); }
  }, [listening, input]);

  // Emotional aura driven by the psychologist's read: hue calm(teal)→hot(red) with tension,
  // brightness with openness, pulse speed with tension.
  const auraColor = roomRead ? `hsl(${Math.round(190 - (roomRead.tension / 100) * 182)} 85% ${Math.round(48 + (roomRead.openness / 100) * 12)}%)` : null;
  const auraDur = roomRead ? (2.6 - (roomRead.tension / 100) * 1.6).toFixed(2) : "2";

  // ---------- PICKER ----------
  if (screen === "picker") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-14">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/" className="text-xs font-bold text-muted-foreground hover:text-foreground">Back to story</Link>
      </div>
        <p className="eyebrow">The Gym · rehearse for real life</p>
        <h1 className="mt-3 font-display text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl">
          You were taught calculus.<br />
          <em className="text-coral">Nobody taught you</em> the hard conversation.
        </h1>
        <p className="mt-4 max-w-lg text-muted-foreground">
          The most talented people stall out on the same wall — the raise they never ask for, the boundary they never
          set, the pitch they freeze on. Not for lack of brains. Because no one lets you practice. Here you can.
        </p>

        {apiError && (
          <div role="alert" className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-flag/30 bg-flag/10 px-4 py-3 text-sm text-flag">
            <span>{apiError}</span>
            <button onClick={() => setApiError("")} aria-label="Dismiss error"><X size={15} /></button>
          </div>
        )}
        <p className="eyebrow mt-9">Pick a rep</p>
        <div className="mt-3 grid gap-3">
          {Object.values(rooms).map((r) => (
            <button
              key={r.key}
              onClick={() => openBrief(r.key)}
              className={cn("flex items-center gap-4 rounded-2xl p-4 text-left text-[#14121c] transition hover:translate-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet", roomBg[r.color])}
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/40 text-xl">{r.icon}</span>
              <span className="flex-1">
                <small className="font-mono text-[10px] uppercase tracking-widest opacity-70">{r.label}</small>
                <strong className="block text-base tracking-tight">{r.title}</strong>
              </span>
              <ArrowRight size={18} />
            </button>
          ))}
        </div>

        {/* Custom scenario */}
        <div className="mt-4 rounded-2xl border border-dashed border-border p-4">
          <p className="flex items-center gap-2 text-sm font-semibold"><Wand2 size={15} className="text-violet" /> Practice your own situation</p>
          <p className="mt-1 text-xs text-muted-foreground">Describe a real conversation you&apos;re dreading. The AI builds the room.</p>
          <div className="mt-3 flex gap-2">
            <input
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createCustom()}
              placeholder="e.g. Telling my manager I'm overloaded and need to drop a project"
              className="h-11 flex-1 rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-violet focus:ring-2 focus:ring-violet/20"
            />
            <button onClick={createCustom} disabled={creating || !customText.trim()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {creating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Build
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- BRIEF ----------
  if (screen === "brief") {
    return (
      <div className="mx-auto max-w-xl px-6 py-12">
        <div className="flex items-center gap-4">
          <div className={cn("grid h-14 w-14 place-items-center rounded-2xl text-2xl", roomBg[room.color])}>{room.icon}</div>
          <div>
            <p className="eyebrow text-coral">{room.label}</p>
            <h1 className="font-display text-3xl font-bold tracking-tight">{room.title}</h1>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border p-3">
          <img src={avatarUrl(room.avatar)} alt="" className="h-11 w-11 rounded-full bg-muted" />
          <div className="flex-1">
            <strong className="block text-sm">{room.person}</strong>
            <span className="text-xs text-muted-foreground">{room.role}</span>
          </div>
          <span className="font-mono text-[10px] text-good">● Ready</span>
        </div>
        <div className="mt-5">
          <p className="eyebrow">The moment</p>
          <p className="mt-2 text-sm leading-relaxed">{room.situation}</p>
        </div>
        <div className="mt-4 rounded-2xl bg-violet/10 p-4">
          <p className="eyebrow">Your mission</p>
          <p className="mt-2 text-sm leading-relaxed">{room.goal}</p>
        </div>

        <div className="mt-5">
          <p className="eyebrow">Set the room — their disposition</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {room.contexts.map((c) => (
              <button
                key={c}
                onClick={() => setContext(c)}
                className={cn("rounded-full border px-3 py-2 text-xs font-semibold transition", context === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted")}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="eyebrow">Intensity — how hard they push</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {Object.keys(INTENSITY).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setIntensity(lvl)}
                className={cn("rounded-xl border px-3 py-2.5 text-xs font-semibold transition", intensity === lvl ? "border-coral bg-coral/10 text-coral" : "border-border bg-card text-muted-foreground hover:bg-muted")}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <Toggle label="Live Coach" desc="Quiet cues on how you did." on={guided} set={setGuided} icon="✦" />
          <Toggle label="Real-time hints" desc="A guide agent suggests how to respond, each turn." on={hintMode} set={setHintMode} icon="" />
          <Toggle label="Gradually ramp up" desc="They get firmer every turn — train under rising pressure." on={ramp} set={setRamp} icon="↗" />
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={() => setScreen("picker")} className="rounded-full border border-border px-5 py-3 text-sm font-semibold hover:bg-muted">Back</button>
          <button onClick={begin} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
            Begin practice <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ---------- DEBRIEF ----------
  if (screen === "debrief") {
    const avg = (k: keyof Analysis["scores"]) => (analyses.length ? Math.round(analyses.reduce((s, a) => s + a.scores[k], 0) / analyses.length) : 60);
    const scores = { clarity: avg("clarity"), assertiveness: avg("assertiveness"), empathy: avg("empathy"), composure: avg("composure") };
    const allMoves = analyses.flatMap((a) => a.moves);
    const flagged = allMoves.filter((m) => m.tone === "flag").length;
    const goodMove = allMoves.find((m) => m.tone === "good");
    const moved = (INTENSITY[intensity] ?? 55) - resistance;
    const last = session.filter((m) => m.role === "user").at(-1)?.content || "I would like to discuss something.";
    const strong = flagged ? "You noticed where the conversation needed a reset." : goodMove ? `You led with ${goodMove.label.toLowerCase()}.` : "You stayed in the room and kept it moving.";
    const nextRep = flagged
      ? "Replace the personal label with a neutral description of what happened and what you need next."
      : scores.assertiveness < 60
        ? "State your ask in one direct sentence before you soften it with context."
        : "Lead with the request, then pause — let them respond before you add more.";
    return <Debrief room={room} scores={scores} moved={moved} strong={strong} nextRep={nextRep} last={last} roomReads={roomReads} onRetry={begin} onExit={() => setScreen("picker")} />;
  }

  // ---------- SIMULATION ----------
  const progress = Math.min(turn + 1, 4);
  return (
    <div className="gym-grid bg-background">
      <header className="gym-header flex h-14 items-center border-b border-border px-5">
        <button onClick={() => setScreen("picker")} className="text-sm font-semibold">✕ Leave</button>
        <div className="absolute left-1/2 flex -translate-x-1/2 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cn("h-1 w-6 rounded-full", i <= turn ? "bg-coral" : "bg-border")} />
          ))}
        </div>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">{`0${progress}`.slice(-2)} / 04</span>
      </header>

      {/* Stage */}
      <section className="gym-stage scroll-slim relative flex flex-col items-center bg-[#15182c] px-8 py-9 text-white md:border-r md:border-white/10">
        <div className="relative">
          {auraColor && <span className="aura" style={{ ["--aura"]: auraColor, animationDuration: `${auraDur}s` } as React.CSSProperties} />}
          <img src={avatarUrl(room.avatar)} alt="" className="relative h-20 w-20 rounded-full border-[3px] border-yellow shadow-[0_7px_0_var(--coral)]" />
        </div>
        <div className="mt-3 text-[11px] font-bold">
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-good align-middle" />
          {room.person} is listening
        </div>
        <p className="mt-3 max-w-[330px] text-center font-display text-lg italic">“{room.opening}”</p>

        <div className="mt-4 w-full max-w-[330px] rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
          <p className="font-mono text-[8px] uppercase tracking-widest text-yellow">Mission</p>
          <p className="mt-1 text-[12px] leading-snug text-[#d8dae6]">{room.goal}</p>
        </div>

        <div className="mt-4 w-full max-w-[330px] rounded-xl border border-white/10 bg-white/5 p-3 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-[#c3b8ff]"><Brain size={12} /> Live room read</span>
            {agents.psych === "working" && <Loader2 size={12} className="animate-spin text-[#c3b8ff]" />}
          </div>
          {roomRead ? (
            <>
              <div className="mt-2 flex items-center justify-between text-xs"><strong>{roomRead.mood}</strong><span className="text-[#c7cadb]">tension {roomRead.tension} · openness {roomRead.openness}</span></div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#d8dae6]">{roomRead.read}</p>
            </>
          ) : <p className="mt-2 text-[11px] text-[#9195ad]">The room read appears once you begin.</p>}
          {current && <div className="mt-3 border-t border-white/10 pt-3 text-[11px] text-[#d8dae6]"><span className="font-semibold text-white">Your read:</span> resistance {current.resistance} · clarity {current.scores.clarity} · composure {current.scores.composure}</div>}
        </div>
        {/* Tabbed analytics */}
        <div className="mt-4 hidden w-full max-w-[330px] md:block">
          <div className="flex gap-1 rounded-full bg-white/5 p-1">
            {(["room", "you"] as const).map((t) => (
              <button key={t} onClick={() => setStageTab(t)} className={cn("flex-1 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition", stageTab === t ? "bg-white/15 text-white" : "text-[#9195ad] hover:text-white")}>
                {t === "room" ? "The Room" : "Your Read"}
              </button>
            ))}
          </div>

          {stageTab === "room" ? (
            <div className="mt-3">
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-[#c3b8ff]">
                <Brain size={12} /> Psychologist
                {agents.psych === "working" && <Loader2 size={11} className="animate-spin" />}
              </div>
              {roomReads.length > 0 ? (
                <div className="mt-2 flex justify-center"><AffectGrid points={roomReads} size={172} variant="onDark" /></div>
              ) : (
                <p className="py-6 text-center text-[11px] text-[#9195ad]">{agents.psych === "working" ? "Reading the room…" : "The read appears once you begin."}</p>
              )}
              {roomRead && (
                <div className="mt-1">
                  <span className="text-sm font-semibold text-white">{roomRead.mood}</span>
                  <div className="mt-2 grid grid-cols-[64px_1fr_24px] items-center gap-2 text-[10px] text-[#c7cadb]">
                    <span>Tension</span>
                    <span className="block h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-gradient-to-r from-[#ff9a5e] to-[#ff5e7a] transition-[width] duration-700" style={{ width: `${roomRead.tension}%` }} /></span>
                    <em className="text-right not-italic">{roomRead.tension}</em>
                    <span>Openness</span>
                    <span className="block h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-gradient-to-r from-[#4ec37e] to-[#8be0aa] transition-[width] duration-700" style={{ width: `${roomRead.openness}%` }} /></span>
                    <em className="text-right not-italic">{roomRead.openness}</em>
                  </div>
                  <p className="mt-2.5 text-[11px] leading-relaxed text-[#d8dae6]">{roomRead.read}</p>
                  <p className="mt-1.5 text-[11px] italic leading-relaxed text-[#b8a6ff]">Tell: {roomRead.tell}</p>
                </div>
              )}
            </div>
          ) : (
            <div className={cn("mt-3", current && "read-pulse")}>
              <div className="mb-3 grid grid-cols-[100px_1fr_26px] items-center gap-2">
                <span className="text-[10px] text-[#c7cadb]">Their resistance</span>
                <span className="block h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-gradient-to-r from-[#ff9a5e] to-[#ff5e7a] transition-[width] duration-700" style={{ width: `${current?.resistance ?? resistance}%` }} /></span>
                <em className="text-right font-mono text-[10px] not-italic text-[#eef0f8]">{current?.resistance ?? resistance}</em>
              </div>
              {current ? (
                <div className="flex justify-center pt-1"><SkillRadar scores={current.scores} size={182} variant="onDark" /></div>
              ) : (
                <p className="py-6 text-center text-[11px] text-[#9195ad]">Your skill web fills in after your first reply.</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Chat */}
      <section className="gym-chat mx-auto flex w-full max-w-[760px] flex-col overflow-hidden px-5">
        {/* Visible multi-agent activity + live room read */}
        <div className="flex items-center gap-3 border-b border-border py-1.5">
          <div className="w-full max-w-[400px] overflow-x-auto">
            <AgentFlow agents={agents} opponentName={room.person.split(" ")[0]} showGuide={hintMode} />
          </div>
          {modelMode === "fallback" && <span className="hidden rounded-full bg-muted px-2 py-1 font-mono text-[9px] font-semibold text-muted-foreground sm:inline-flex">Practice mode</span>}
          {roomRead && (
            <div className="ml-auto hidden items-center gap-2 rounded-full border border-violet/30 bg-violet/8 px-3 py-1.5 sm:flex">
              <Brain size={13} className="text-violet" />
              <span className="text-[11px] font-semibold">{roomRead.mood}</span>
              <span className="font-mono text-[10px] text-muted-foreground">tension {roomRead.tension}</span>
            </div>
          )}
        </div>

        {apiError && (
          <div role="alert" className="mt-2 flex items-start justify-between gap-3 rounded-xl border border-flag/30 bg-flag/10 px-3 py-2 text-xs text-flag">
            <span>{apiError}</span>
            <button onClick={() => setApiError("")} aria-label="Dismiss error"><X size={14} /></button>
          </div>
        )}
        {guided && coachOpen && (
          <div className="flex items-start gap-2 rounded-2xl bg-yellow/25 p-3">
            <span className="grid h-6 w-6 flex-none place-items-center rounded-lg bg-primary text-yellow"><Sparkles size={13} /></span>
            <div className="flex-1">
              <small className="font-mono text-[9px] font-bold uppercase tracking-widest">Live coach</small>
              <p className="mt-0.5 text-[11px] leading-snug">{coach}</p>
            </div>
            <button onClick={() => setCoachOpen(false)} aria-label="Dismiss"><X size={14} /></button>
          </div>
        )}

        <div ref={listRef} className="scroll-slim flex flex-1 flex-col gap-2.5 overflow-y-auto py-4">
          {items.length === 0 && !streaming && (
            <div className="flex flex-1 items-center justify-center px-8 text-center text-xs text-muted-foreground">
              Your replies appear here. Take a breath and say it your way.
            </div>
          )}
          {items.map((item, i) =>
            item.kind === "user" ? (
              <div key={i} className="max-w-[82%] self-end rounded-2xl rounded-br-sm bg-violet/25 px-3 py-2.5 text-xs leading-relaxed">{item.text}</div>
            ) : item.kind === "moves" ? (
              <div key={i} className="chip-in ml-[34px] flex max-w-[88%] flex-wrap gap-1.5 self-start">
                {item.moves.map((mv, j) => (<MoveChip key={j} move={mv} />))}
              </div>
            ) : (
              <div key={i} className="flex max-w-[82%] items-end gap-2 self-start">
                <img src={avatarUrl(room.avatar)} alt="" className="h-7 w-7 rounded-full bg-muted" />
                <div className="rounded-2xl rounded-bl-sm bg-card px-3 py-2.5 text-xs leading-relaxed shadow-sm">{item.text}</div>
              </div>
            )
          )}
          {streaming && (
            <div className="flex max-w-[82%] items-end gap-2 self-start">
              <img src={avatarUrl(room.avatar)} alt="" className="h-7 w-7 rounded-full bg-muted" />
              <div className="rounded-2xl rounded-bl-sm bg-card px-3 py-2.5 text-xs leading-relaxed shadow-sm">{streaming}<span className="stream-caret" /></div>
            </div>
          )}
        </div>

        {/* Real-time hint */}
        {hintMode && hint && (
          <div className="chip-in mb-1 flex items-start gap-2 rounded-2xl border border-violet/30 bg-violet/10 p-3">
            <span className="grid h-6 w-6 flex-none place-items-center rounded-lg bg-violet text-white"><Lightbulb size={13} /></span>
            <div className="flex-1">
              <small className="font-mono text-[9px] font-bold uppercase tracking-widest text-violet">How to respond</small>
              <p className="mt-0.5 text-[11px] leading-snug">{hint.approach}</p>
              <button onClick={() => setInput(hint.example)} className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-violet/15 px-2.5 py-1 text-[10px] font-bold text-violet">
                Use: “{hint.example.length > 42 ? hint.example.slice(0, 42) + "…" : hint.example}”
              </button>
            </div>
          </div>
        )}

        <div className="flex min-h-[43px] items-center gap-2 overflow-x-auto py-1">
          {turn >= 3 ? (
            <button onClick={() => setScreen("debrief")} className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[11px] font-bold text-primary-foreground">
              Finish &amp; reflect <ArrowRight size={13} />
            </button>
          ) : (
            ["Can you tell me more about that?", "I hear your concern. Here is what I am proposing…"].map((q) => (
              <button key={q} onClick={() => setInput(q)} className="whitespace-nowrap rounded-full border border-border bg-card px-3 py-2 text-[10px] font-semibold text-muted-foreground">{q}</button>
            ))
          )}
        </div>
      </section>

      {/* Composer */}
      <form className="gym-composer mx-auto flex w-full max-w-[760px] items-center gap-2 bg-background px-5 py-3" onSubmit={(e) => { e.preventDefault(); submit(input); }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); } }}
          rows={1}
          disabled={sending}
          placeholder={listening ? "Listening… speak now" : "Say what you would say…"}
          className="min-h-[44px] flex-1 resize-none rounded-2xl border border-input bg-card px-3 py-3 text-xs outline-none focus:border-violet focus:ring-2 focus:ring-violet/20"
        />
        {hintMode && (
          <button type="button" onClick={requestHintNow} aria-label="Get a hint" className="text-violet" title="Ask the guide how to respond">
            <Lightbulb size={18} />
          </button>
        )}
        <button type="button" onClick={toggleMic} aria-label="Speak your response" className={cn("text-muted-foreground", listening && "mic-live text-flag")}>
          <Mic size={18} />
        </button>
        <button type="submit" disabled={sending} aria-label="Send" className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50">
          <ArrowUp size={18} />
        </button>
      </form>

      {flag && (
        <div className={cn("pointer-events-none fixed left-1/2 top-3.5 z-50 flex w-[min(92%,420px)] items-start gap-3 rounded-2xl border border-[rgba(255,120,90,0.35)] bg-[#2a0f0a] p-3.5 text-white shadow-[0_18px_45px_rgba(120,20,0,0.42)] transition-all duration-300", flagShow ? "translate-x-[-50%] translate-y-0 opacity-100" : "translate-x-[-50%] translate-y-[-150%] opacity-0")}>
          <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-coral"><Flag size={15} /></span>
          <div className="flex-1">
            <small className="font-mono text-[8px] font-bold uppercase tracking-widest text-[#ff9d86]">Flagged · {flag.n} this session</small>
            <strong className="mt-0.5 block text-[12.5px]">{flag.title}</strong>
            <p className="text-[11px] leading-snug text-[#f3d9d2]">{flag.body}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, desc, on, set, icon }: { label: string; desc: string; on: boolean; set: (v: boolean) => void; icon: string }) {
  return (
    <button type="button" onClick={() => set(!on)} aria-pressed={on} className="flex items-center justify-between rounded-2xl border border-border p-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet">
      <span className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-sm">{icon}</span>
        <span>
          <strong className="block text-sm">{label}</strong>
          <span className="text-xs text-muted-foreground">{desc}</span>
        </span>
      </span>
      <span className={cn("relative h-6 w-11 flex-none rounded-full transition", on ? "bg-primary" : "bg-border")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition", on ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

function MoveChip({ move }: { move: Move }) {
  const styles = move.tone === "good" ? "bg-[#e4f8ec] text-[#177a45] border-[#bfeecf]" : move.tone === "flag" ? "bg-[#ffe1da] text-[#a5301c] border-[#ffc2b5]" : "bg-[#fff3d9] text-[#8a5a00] border-[#ffe1a6]";
  const icon = move.tone === "good" ? "✓" : move.tone === "flag" ? "⚑" : "!";
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[10px] font-extrabold", styles)}>{icon} {move.label}</span>;
}

function Debrief({ room, scores, moved, strong, nextRep, last, roomReads, onRetry, onExit }: {
  room: Room; scores: Analysis["scores"]; moved: number; strong: string; nextRep: string; last: string; roomReads: RoomRead[]; onRetry: () => void; onExit: () => void;
}) {
  const [commit, setCommit] = useState("");
  const save = () => {
    try {
      const history = JSON.parse(localStorage.getItem("irlgym-history") || "[]");
      history.push({ title: room.title, date: Date.now(), scores, commitment: commit.trim() });
      localStorage.setItem("irlgym-history", JSON.stringify(history.slice(-50)));
    } catch {}
  };
  const bar = (label: string, value: number) => (
    <div className="mb-2.5 grid grid-cols-[110px_1fr_24px] items-center gap-2">
      <span className="text-[10px]">{label}</span>
      <span className="block h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-coral" style={{ width: `${value}%` }} /></span>
      <strong className="text-right font-mono text-[10px]">{value}</strong>
    </div>
  );
  return (
    <div className="mx-auto max-w-lg px-6 py-14 text-center">
      <div className="mx-auto grid h-12 w-12 -rotate-6 place-items-center rounded-2xl bg-yellow text-2xl">✦</div>
      <p className="eyebrow mt-4">Practice complete</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">You stayed <em className="text-coral">in the room.</em></h1>
      <div className="mt-6 rounded-2xl bg-violet/10 p-4 text-left">
        <p className="eyebrow">Your strongest move</p>
        <strong className="mt-1 block text-sm">{strong}</strong>
        <blockquote className="mt-3 font-display text-base italic">“{last}”</blockquote>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {moved > 0 ? `You moved their resistance down ${moved} points — concrete moves gave them something to say yes to.` : "When you put your need into words, you gave the other person something specific to respond to."}
        </p>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="eyebrow mb-1">Your style</p>
          <div className="flex justify-center"><SkillRadar scores={scores} size={176} variant="onLight" /></div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="eyebrow mb-1">How the room shifted</p>
          {roomReads.length > 1 ? (
            <div className="flex justify-center"><AffectGrid points={roomReads} size={150} variant="onLight" /></div>
          ) : (
            <p className="grid h-[176px] place-items-center text-center text-xs text-muted-foreground">Their emotional trail shows here.</p>
          )}
        </div>
      </div>
      <div className="mt-4 text-left">
        {bar("Clarity", scores.clarity)}
        {bar("Assertiveness", scores.assertiveness)}
        {bar("Empathy", scores.empathy)}
        {bar("Composure", scores.composure)}
      </div>
      <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-dashed border-border p-3 text-left">
        <span className="grid h-6 w-6 flex-none place-items-center rounded-lg bg-yellow text-sm">↗</span>
        <div>
          <p className="eyebrow">Your next rep</p>
          <p className="mt-0.5 text-[11px] leading-relaxed">{nextRep}</p>
        </div>
      </div>
      <div className="mt-4 text-left">
        <p className="eyebrow">Lock it in — an if/then plan</p>
        <input value={commit} onChange={(e) => setCommit(e.target.value)} maxLength={120} placeholder="If they push back on price, I will…" className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-3 text-[13px] outline-none focus:border-violet focus:ring-2 focus:ring-violet/20" />
      </div>
      <div className="mt-5 flex gap-2">
        <button onClick={() => { save(); onExit(); }} className="flex-1 rounded-full bg-muted px-5 py-3 text-sm font-semibold">Save &amp; exit</button>
        <button onClick={() => { save(); onRetry(); }} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Try it again <ArrowRight size={15} /></button>
      </div>
    </div>
  );
}

















