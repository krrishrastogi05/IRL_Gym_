import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, BookOpen, BrainCircuit, MessageCircleMore } from "lucide-react";

export default function ProblemSlide() {
  return (
    <main className="min-h-dvh overflow-hidden bg-[#fbf8f2] px-5 py-5 text-[#14121c] sm:px-8 sm:py-8 lg:px-12 lg:py-10">
      <div className="relative mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-[#e8e2d7] bg-white shadow-[0_28px_80px_rgba(36,31,23,0.12)] sm:min-h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-5rem)] lg:min-h-0">
        <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-yellow/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -top-20 h-80 w-80 rounded-full bg-violet/15 blur-3xl" />

        <header className="relative z-10 flex items-center justify-between border-b border-[#eee8de] px-5 py-3 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground transition hover:text-foreground">
            <ArrowLeft size={15} /> Back to story
          </Link>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">01 / The problem</span>
          <Link href="/gym" className="hidden items-center gap-2 rounded-full bg-[#14121c] px-4 py-2 text-xs font-bold text-white sm:inline-flex">
            Try the Gym <ArrowRight size={14} />
          </Link>
        </header>

        <section className="relative grid flex-1 items-center gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[0.76fr_1.24fr] lg:gap-10 lg:px-14 lg:py-2">
          <div className="relative mx-auto w-full max-w-[440px] lg:max-w-none">
            <div className="absolute inset-x-[10%] bottom-[2%] top-[8%] rounded-[2.25rem] bg-[#f5c945]" />
            <div className="relative rotate-[-2deg] overflow-hidden rounded-[2.25rem] border-[7px] border-white bg-[#101328] shadow-[0_22px_42px_rgba(20,18,28,0.22)]">
              <img src="/story-books.png" alt="A growing pile of self-help books" className="aspect-square w-full object-cover" />
            </div>
            <div className="absolute -right-2 bottom-5 rotate-[4deg] rounded-2xl border border-[#e8e2d7] bg-white px-4 py-3 shadow-lg sm:-right-8 sm:bottom-9">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">The default answer</p>
              <p className="mt-1 text-sm font-extrabold">Read more. Freeze less?</p>
            </div>
          </div>

          <div className="relative z-10 max-w-3xl">
            <p className="eyebrow text-coral">The gap school leaves behind</p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-[0.96] tracking-tight sm:text-5xl lg:text-[clamp(3rem,5.1vw,4.25rem)]">
              You can be brilliant <em className="text-coral">and still lose the room.</em>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              School trains us to know the answer. Real life asks us to say it when the stakes are high, the other person pushes back, and our nerves take over.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ProblemCard icon={<BrainCircuit size={18} />} label="What we rehearse" items={["Exams", "Equations", "Presentations"]} tone="violet" />
              <ProblemCard icon={<MessageCircleMore size={18} />} label="What costs us later" items={["The raise", "Hard feedback", "A clear boundary"]} tone="coral" />
            </div>

            <div className="mt-5 rounded-2xl border border-[#eadfbd] bg-[#fff7dd] p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-yellow text-[#14121c]"><BookOpen size={18} /></span>
                <div>
                  <p className="font-display text-xl font-bold leading-tight sm:text-2xl">Forget the pile of self-help books.</p>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#66552a] sm:text-base">
                    Advice tells you what to do. It cannot teach your body what to do when someone says no. That takes safe, realistic reps.
                  </p>
                </div>
              </div>
            </div>


          </div>
        </section>

        <footer className="relative z-10 flex items-center justify-between border-t border-[#eee8de] px-5 py-3 sm:px-8">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">IRL Gym / An education product for real life</span>
          <Link href="/gym" className="inline-flex items-center gap-2 text-xs font-bold text-coral hover:text-[#d94c33]">
            The answer: practice <ArrowRight size={14} />
          </Link>
        </footer>
      </div>
    </main>
  );
}

function ProblemCard({ icon, label, items, tone }: { icon: ReactNode; label: string; items: string[]; tone: "violet" | "coral" }) {
  const color = tone === "violet" ? "border-violet/25 bg-violet/10 text-violet" : "border-coral/25 bg-coral/10 text-coral";
  return (
    <div className={`rounded-2xl border p-3.5 sm:p-4 ${color}`}>
      <div className="flex items-center gap-2 text-sm font-extrabold">{icon} {label}</div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => <li key={item} className="rounded-full bg-white/75 px-2.5 py-1 text-xs font-semibold text-[#14121c]">{item}</li>)}
      </ul>
    </div>
  );
}