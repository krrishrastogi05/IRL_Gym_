"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChevronRight,
  ExternalLink,
  Loader2,
  Mail,
  PencilLine,
  Search,
  Send,
  Sparkles,
  Target,
  X
} from "lucide-react";
import { useCases } from "@/lib/usecases";
import { useField } from "@/lib/store";
import type { Draft, EditorReport, Lead, Nudge } from "@/lib/types";
import { cn } from "@/lib/utils";

type Workspace = "choose" | "search" | "write";

const emptyDraft: Draft = { subject: "", body: "" };

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error("That request did not go through. Please try again.");
  return response.json() as Promise<T>;
}

export default function FieldClient() {
  const goal = useField((state) => state.goal);
  const useCaseKey = useField((state) => state.useCaseKey);
  const query = useField((state) => state.query);
  const leads = useField((state) => state.leads);
  const saved = useField((state) => state.saved);
  const activity = useField((state) => state.activity);
  const searching = useField((state) => state.searching);
  const selectedLead = useField((state) => state.selectedLead);
  const setGoal = useField((state) => state.setGoal);
  const setQuery = useField((state) => state.setQuery);
  const setLeads = useField((state) => state.setLeads);
  const setSearching = useField((state) => state.setSearching);
  const setSelectedLead = useField((state) => state.setSelectedLead);
  const saveLead = useField((state) => state.saveLead);
  const unsaveLead = useField((state) => state.unsaveLead);
  const logActivity = useField((state) => state.logActivity);
  const reset = useField((state) => state.reset);

  const [workspace, setWorkspace] = useState<Workspace>(goal ? "search" : "choose");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [report, setReport] = useState<EditorReport | null>(null);
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [showSaved, setShowSaved] = useState(false);

  const activeCase = useMemo(() => useCases.find((item) => item.key === useCaseKey), [useCaseKey]);
  const visibleLeads = showSaved ? saved : leads;
  const hasDraft = Boolean(draft.subject || draft.body);

  useEffect(() => {
    if (!goal || workspace === "choose") return;
    const timer = window.setTimeout(() => void refreshCopilot(8), 900);
    return () => window.clearTimeout(timer);
    // The copilot is deliberately event-driven rather than a polling loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal, leads.length, saved.length, hasDraft]);

  async function refreshCopilot(idleSeconds = 0) {
    try {
      const data = await postJson<Nudge>("/api/copilot", {
        goal,
        recentActivity: activity.slice(-6).map((event) => event.detail),
        leadsCount: leads.length,
        savedCount: saved.length,
        hasDraft,
        idleSeconds
      });
      setNudge(data);
    } catch {
      // The Field remains useful when the optional copilot is unavailable.
    }
  }

  function chooseUseCase(key: string) {
    const selected = useCases.find((item) => item.key === key);
    if (!selected) return;
    setGoal(selected.goal, selected.key);
    setQuery(selected.sampleQuery);
    setLeads([]);
    setSelectedLead(null);
    setDraft(emptyDraft);
    setReport(null);
    setError("");
    logActivity("search", `Set a Field goal: ${selected.title}`);
    setWorkspace("search");
  }

  async function findLeads(event?: React.FormEvent) {
    event?.preventDefault();
    if (!query.trim() || searching) return;
    setError("");
    setSearching(true);
    try {
      const result = await postJson<{ leads: Lead[]; mode?: "model" | "fallback" }>("/api/scout", { goal, query });
      setLeads(Array.isArray(result.leads) ? result.leads : []);
      logActivity("search", `Searched: ${query.trim()}`);
      setNudge(result.mode === "fallback" ? { level: "hint", text: "Demo leads are ready. Save the ones you would actually contact.", cta: "" } : null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Search is temporarily unavailable.");
    } finally {
      setSearching(false);
    }
  }

  function toggleSaved(lead: Lead) {
    const exists = saved.some((item) => item.id === lead.id);
    if (exists) {
      unsaveLead(lead.id);
      logActivity("save", `Removed ${lead.name} from saved leads`);
    } else {
      saveLead(lead);
      logActivity("save", `Saved ${lead.name}`);
    }
  }

  async function startDraft(lead: Lead) {
    setSelectedLead(lead);
    setWorkspace("write");
    setCreatingDraft(true);
    setError("");
    setReport(null);
    try {
      const data = await postJson<Draft>("/api/writer", { goal, lead });
      setDraft({ subject: data.subject || "", body: data.body || "" });
      logActivity("draft", `Created outreach for ${lead.name}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The draft could not be created.");
    } finally {
      setCreatingDraft(false);
    }
  }

  async function reviewDraft() {
    const text = [draft.subject, draft.body].filter(Boolean).join("\n\n");
    if (text.trim().split(/\s+/).length < 8 || editing) return;
    setEditing(true);
    setError("");
    try {
      const data = await postJson<EditorReport>("/api/editor", { text });
      setReport(data);
      logActivity("draft", "Asked the editor for a review");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The editor is temporarily unavailable.");
    } finally {
      setEditing(false);
    }
  }

  function applyRewrite() {
    if (!report?.rewrite) return;
    const [maybeSubject, ...rest] = report.rewrite.split("\n");
    const subject = maybeSubject.replace(/^subject:\s*/i, "").trim();
    const body = rest.join("\n").replace(/^body:\s*/i, "").trim();
    setDraft({ subject: body ? subject : draft.subject, body: body || report.rewrite.trim() });
    setReport(null);
    logActivity("draft", "Applied editor rewrite");
  }

  function handleNudge() {
    if (!nudge?.cta) return;
    if (saved.length && !hasDraft) void startDraft(saved[0]);
    else if (nudge.cta.toLowerCase().includes("save")) setShowSaved(false);
    else if (nudge.cta.toLowerCase().includes("rehearse")) window.location.assign(`/gym?room=${activeCase?.room || "offer"}`);
  }

  function beginAgain() {
    reset();
    setSelectedLead(null);
    setDraft(emptyDraft);
    setReport(null);
    setNudge(null);
    setError("");
    setShowSaved(false);
    setWorkspace("choose");
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-extrabold tracking-tight">
            <span className="grid h-8 w-8 -rotate-6 place-items-center rounded-lg bg-yellow text-[#14121c]">↗</span>
            IRL <em className="font-display text-base">Field</em>
          </Link>
          <div className="flex items-center gap-2">
            {goal && <button onClick={beginAgain} className="hidden rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted sm:inline-flex">New goal</button>}
            <Link href="/gym" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-bold hover:bg-muted">
              Practice in Gym <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </header>

      {workspace === "choose" ? (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="max-w-2xl">
            <p className="eyebrow text-coral">From practice to progress</p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-[0.98] tracking-tight sm:text-6xl">Turn your next <em className="text-coral">real opportunity</em> into a move.</h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">Choose a mission. Field finds useful signals, helps you write the first message, then sends you to the Gym to rehearse it.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((item) => (
              <button key={item.key} onClick={() => chooseUseCase(item.key)} className="group rounded-3xl border border-border bg-card p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-violet/45 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet/10 text-xl text-violet">{item.icon}</span>
                <h2 className="mt-5 font-display text-2xl font-bold">{item.title}</h2>
                <p className="mt-2 min-h-12 text-sm leading-relaxed text-muted-foreground">{item.blurb}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-xs font-extrabold text-violet">Choose mission <ChevronRight size={14} /></span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
          <section className="min-w-0">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <button onClick={beginAgain} className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft size={13} /> Change mission</button>
                <p className="eyebrow text-violet">Current mission</p>
                <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">{activeCase?.title || "Build momentum"}</h1>
              </div>
              <div className="inline-flex rounded-full border border-border bg-card p-1 text-xs font-bold">
                <button onClick={() => setWorkspace("search")} className={cn("rounded-full px-3 py-2", workspace === "search" && "bg-primary text-primary-foreground")}>1. Find</button>
                <button onClick={() => selectedLead && setWorkspace("write")} disabled={!selectedLead} className={cn("rounded-full px-3 py-2 disabled:opacity-40", workspace === "write" && "bg-primary text-primary-foreground")}>2. Write</button>
              </div>
            </div>

            {error && <div role="alert" className="mb-5 flex items-start justify-between gap-3 rounded-2xl border border-flag/30 bg-flag/10 px-4 py-3 text-sm text-flag"><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button></div>}

            {workspace === "search" ? (
              <>
                <form onSubmit={findLeads} className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
                  <label htmlFor="field-search" className="eyebrow">Who should we look for?</label>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input id="field-search" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={240} placeholder="Describe the people, companies, or signals you need" className="min-h-12 flex-1 rounded-2xl border border-input bg-background px-4 text-sm outline-none transition focus:border-violet focus:ring-2 focus:ring-violet/20" />
                    <button disabled={!query.trim() || searching} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"><Search size={16} /> {searching ? "Searching" : "Find leads"}</button>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Try a timely signal: “newly funded B2B startups hiring product designers.”</p>
                </form>

                <div className="mt-6 flex items-center justify-between gap-3">
                  <div><p className="eyebrow">{showSaved ? "Your shortlist" : "Opportunity signals"}</p><h2 className="mt-1 text-lg font-extrabold">{showSaved ? `${saved.length} saved lead${saved.length === 1 ? "" : "s"}` : leads.length ? `${leads.length} places to start` : "Search to surface leads"}</h2></div>
                  <button onClick={() => setShowSaved((value) => !value)} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold", showSaved ? "border-violet bg-violet/10 text-violet" : "border-border bg-card") }><Bookmark size={13} fill={showSaved ? "currentColor" : "none"} /> Saved {saved.length}</button>
                </div>

                <div className="mt-4 grid gap-3">
                  {!visibleLeads.length && !searching && <EmptyLeads saved={showSaved} onSearch={() => setShowSaved(false)} />}
                  {visibleLeads.map((lead) => <LeadCard key={lead.id} lead={lead} saved={saved.some((item) => item.id === lead.id)} onSave={() => toggleSaved(lead)} onDraft={() => void startDraft(lead)} />)}
                </div>
              </>
            ) : (
              <DraftDesk
                lead={selectedLead}
                draft={draft}
                report={report}
                busy={creatingDraft || editing}
                onChange={setDraft}
                onReview={() => void reviewDraft()}
                onApply={applyRewrite}
                onBack={() => setWorkspace("search")}
                onRehearse={() => window.location.assign(`/gym?room=${activeCase?.room || "offer"}`)}
              />
            )}
          </section>

          <aside className="space-y-4 lg:pt-14">
            <section className="rounded-3xl border border-[#e4d5ae] bg-[#fff8df] p-5 text-[#3d3420]">
              <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-yellow text-[#14121c]"><Sparkles size={15} /></span><p className="eyebrow !text-[#78652d]">Field copilot</p></div>
              <p className="mt-3 text-sm font-semibold leading-relaxed">{nudge?.text || "Start with a focused search. Strong opportunities leave a signal before they become obvious."}</p>
              {nudge?.cta && <button onClick={handleNudge} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#14121c] px-3 py-2 text-xs font-bold text-white">{nudge.cta} <ArrowRight size={13} /></button>}
            </section>
            <section className="rounded-3xl border border-border bg-card p-5">
              <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-violet/10 text-violet"><Target size={15} /></span><p className="eyebrow">Your path</p></div>
              <ol className="mt-4 space-y-3 text-sm">
                <PathStep done={leads.length > 0} label="Find a live signal" />
                <PathStep done={saved.length > 0} label="Save your best lead" />
                <PathStep done={hasDraft} label="Write the first message" />
                <PathStep done={false} label="Rehearse it in the Gym" />
              </ol>
            </section>
            <p className="px-2 text-xs leading-relaxed text-muted-foreground">Field helps you decide and act. Verify any external opportunity before sharing personal information.</p>
          </aside>
        </div>
      )}
    </main>
  );
}

function LeadCard({ lead, saved, onSave, onDraft }: { lead: Lead; saved: boolean; onSave: () => void; onDraft: () => void }) {
  return <article className="rounded-3xl border border-border bg-card p-5 shadow-sm transition hover:border-violet/30"><div className="flex gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-base font-extrabold leading-snug">{lead.name}</h3><span className="rounded-full bg-good/10 px-2.5 py-1 text-[10px] font-bold text-good">Live signal</span></div><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{lead.why}</p><div className="mt-3 rounded-xl bg-muted/70 px-3 py-2 text-xs font-semibold text-foreground"><span className="mr-1.5 text-coral">Now:</span>{lead.signal}</div>{lead.sourceTitle && <p className="mt-3 text-xs text-muted-foreground">Source: {lead.sourceUrl ? <a href={lead.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline hover:text-foreground">{lead.sourceTitle} <ExternalLink size={11} /></a> : lead.sourceTitle}</p>}</div><button onClick={onSave} aria-label={saved ? `Remove ${lead.name} from saved leads` : `Save ${lead.name}`} className={cn("grid h-9 w-9 flex-none place-items-center rounded-xl border", saved ? "border-violet bg-violet text-white" : "border-border text-muted-foreground hover:bg-muted")}><Bookmark size={15} fill={saved ? "currentColor" : "none"} /></button></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={onDraft} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"><Mail size={13} /> Draft outreach</button>{!saved && <button onClick={onSave} className="rounded-full border border-border px-4 py-2.5 text-xs font-bold hover:bg-muted">Save for later</button>}</div></article>;
}

function EmptyLeads({ saved, onSearch }: { saved: boolean; onSearch: () => void }) {
  return <div className="rounded-3xl border border-dashed border-border bg-card/50 px-6 py-12 text-center"><span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-muted text-muted-foreground">{saved ? <Bookmark size={18} /> : <Search size={18} />}</span><h3 className="mt-4 font-display text-2xl font-bold">{saved ? "Your shortlist is empty." : "A good search starts with a signal."}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{saved ? "Save the leads worth contacting, then come back here to turn one into an outreach draft." : "Look for hiring, launches, funding, new posts, or any moment when a need is visible."}</p>{saved && <button onClick={onSearch} className="mt-4 text-sm font-bold text-violet underline">Browse leads</button>}</div>;
}

function PathStep({ done, label }: { done: boolean; label: string }) {
  return <li className={cn("flex items-center gap-3", done ? "text-foreground" : "text-muted-foreground")}><span className={cn("grid h-5 w-5 place-items-center rounded-full border text-[10px]", done ? "border-good bg-good text-white" : "border-border")}>{done && <Check size={12} />}</span>{label}</li>;
}

function DraftDesk({ lead, draft, report, busy, onChange, onReview, onApply, onBack, onRehearse }: { lead: Lead | null; draft: Draft; report: EditorReport | null; busy: boolean; onChange: (draft: Draft) => void; onReview: () => void; onApply: () => void; onBack: () => void; onRehearse: () => void }) {
  const wordCount = draft.body.trim() ? draft.body.trim().split(/\s+/).length : 0;
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]"><section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6"><button onClick={onBack} className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"><ArrowLeft size={13} /> Back to leads</button><p className="eyebrow mt-5 text-violet">Your first message</p><h2 className="mt-1 font-display text-3xl font-bold">Write to {lead?.name || "your lead"}</h2>{busy && !draft.body ? <div className="flex min-h-72 items-center justify-center gap-3 text-sm font-semibold text-muted-foreground"><Loader2 className="animate-spin" size={18} /> Writing a focused first draft...</div> : <><label className="mt-6 block text-xs font-bold" htmlFor="field-subject">Subject</label><input id="field-subject" value={draft.subject} onChange={(event) => onChange({ ...draft, subject: event.target.value })} maxLength={140} placeholder="A clear, human subject line" className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-violet focus:ring-2 focus:ring-violet/20" /><div className="mt-4 flex items-center justify-between"><label className="text-xs font-bold" htmlFor="field-body">Message</label><span className={cn("font-mono text-[10px]", wordCount > 140 ? "text-warn" : "text-muted-foreground")}>{wordCount} words</span></div><textarea id="field-body" value={draft.body} onChange={(event) => onChange({ ...draft, body: event.target.value })} placeholder="Start with a relevant observation and make one clear ask." className="mt-2 min-h-72 w-full resize-y rounded-2xl border border-input bg-background px-4 py-3 text-sm leading-relaxed outline-none focus:border-violet focus:ring-2 focus:ring-violet/20" /><div className="mt-4 flex flex-wrap gap-2"><button onClick={onReview} disabled={busy || wordCount < 8} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={14} /> : <PencilLine size={14} />} Review with editor</button><button onClick={onRehearse} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs font-bold hover:bg-muted"><Send size={13} /> Rehearse before sending</button></div></>}</section><section className="h-fit rounded-3xl border border-border bg-card p-5"><p className="eyebrow">Editor read</p>{report ? <><div className="mt-3 grid grid-cols-2 gap-2">{Object.entries(report.scores).map(([label, value]) => <div key={label} className="rounded-xl bg-muted p-2.5"><span className="block text-[10px] font-semibold capitalize text-muted-foreground">{label}</span><strong className="mt-1 block text-lg">{value}</strong></div>)}</div>{report.issues.length > 0 && <div className="mt-4 space-y-3">{report.issues.map((issue, index) => <div key={`${issue.label}-${index}`} className="border-l-2 border-coral pl-3"><p className="text-xs font-bold">{issue.label}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">“{issue.quote}” - {issue.fix}</p></div>)}</div>}<button onClick={onApply} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-violet px-4 py-2.5 text-xs font-bold text-white"><Sparkles size={13} /> Apply rewrite</button></> : <div className="mt-4 rounded-2xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">Keep it specific, brief, and easy to answer. The strongest messages give someone one simple next step.</div>}</section></div>;
}
