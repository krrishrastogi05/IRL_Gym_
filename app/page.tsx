"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowDown } from "lucide-react";

// Renders a supporting illustration from /public, but degrades gracefully:
// if the image isn't there yet, the CSS/type visuals still carry the scene.
function Art({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return <img src={src} alt={alt} onError={() => setOk(false)} className={className} />;
}

export default function StoryLanding() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const els = rootRef.current?.querySelectorAll(".scene-fade") ?? [];
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("scene-in")),
      { threshold: 0.35 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <main ref={rootRef} className="h-screen snap-y snap-mandatory overflow-y-scroll scroll-smooth">
      <Link href="/problem" className="fixed left-5 top-5 z-50 rounded-full border border-border bg-card/80 px-4 py-1.5 text-xs font-semibold backdrop-blur">
        Problem slide
      </Link>
      <Link href="/gym" className="fixed right-5 top-5 z-50 rounded-full border border-border bg-card/80 px-4 py-1.5 text-xs font-semibold backdrop-blur">
        Skip intro →
      </Link>

      {/* 1 — MASTERY */}
      <Scene className="bg-background">
        <div className="scene-fade flex flex-col items-center">
          <Art src="/story-mastery.png" alt="A brilliant student surrounded by equations and code" className="mb-7 max-h-[42vh] w-auto max-w-[92vw] rounded-2xl border border-border object-contain shadow-xl" />
          <p className="eyebrow">top of the class · ships the code · solves the proof</p>
          <h2 className="mt-3 max-w-2xl text-center font-display text-4xl font-bold tracking-tight sm:text-6xl">
            You were the <em className="text-coral">brilliant</em> one.
          </h2>
        </div>
        <div className="bob absolute bottom-8 text-muted-foreground"><ArrowDown size={22} /></div>
      </Scene>

      {/* 2 — REAL LIFE */}
      <Scene className="bg-muted/40">
        <div className="scene-fade flex flex-col items-center">
          <Art src="/story-frozen.png" alt="Frozen in a tense face-to-face conversation" className="mb-6 max-h-[38vh] w-auto max-w-[92vw] rounded-2xl border border-border object-contain shadow-xl" />
          <div className="flex max-w-2xl flex-wrap justify-center gap-2.5">
            {["The appraisal.", "The negotiation.", "The raise.", "The hard feedback.", "The boundary."].map((t, i) => (
              <span key={t} className="floaty rounded-full border-2 border-coral/40 bg-card px-4 py-2 text-sm font-extrabold text-foreground" style={{ animationDelay: `${i * 0.35}s` }}>
                {t}
              </span>
            ))}
          </div>
          <h2 className="mt-5 max-w-2xl text-center font-display text-4xl font-bold tracking-tight sm:text-6xl">
            Then real life asked a <em className="text-coral">different question.</em>
          </h2>
          <p className="mt-3 font-display text-2xl italic text-muted-foreground">…and you froze.</p>
        </div>
      </Scene>

      {/* 3 — THE SELF-HELP TRAP */}
      <Scene className="bg-[#101328] text-white">
        <div className="scene-fade flex flex-col items-center">
          <Art src="/story-books.png" alt="A towering trap of self-help books" className="mb-7 max-h-[42vh] w-auto max-w-[92vw] rounded-2xl border border-white/10 object-contain shadow-2xl" />
          <p className="eyebrow text-white/60">the promised fix</p>
          <h2 className="mt-3 max-w-2xl text-center font-display text-4xl font-bold tracking-tight sm:text-6xl">
            You read the books. <br /> <em className="text-yellow">Nothing changed.</em>
          </h2>
          <p className="mt-4 rounded-full bg-white/10 px-4 py-2 font-mono text-sm">Reading isn&apos;t reps.</p>
        </div>
      </Scene>

      {/* 4 — THE TURN: PRACTICE */}
      <Scene className="bg-background">
        <div className="scene-fade flex flex-col items-center">
          <Art src="/story-practice.png" alt="Rehearsing a conversation with an AI partner in a training gym" className="mb-7 max-h-[40vh] w-auto max-w-[92vw] rounded-2xl border border-border object-contain shadow-xl" />
          <p className="eyebrow text-violet">what if…</p>
          <h2 className="mt-3 max-w-2xl text-center font-display text-4xl font-bold tracking-tight sm:text-6xl">
            You don&apos;t need another book. <br /> You need to <em className="text-violet">practice.</em>
          </h2>
          <p className="mt-4 max-w-md text-center text-muted-foreground">
            Pilots don&apos;t read about flying. Surgeons don&apos;t read about surgery. They rehearse — until it&apos;s muscle.
          </p>
        </div>
      </Scene>

      {/* 5 — THE PRODUCT */}
      <Scene className="bg-[#101328] text-white">
        <div className="scene-fade flex flex-col items-center">
          <span className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            <span className="grid h-8 w-8 -rotate-6 place-items-center rounded-lg bg-yellow text-[#14121c]">↗</span>
            IRL <span className="font-display italic">Gym</span>
          </span>
          <h2 className="mt-4 max-w-3xl text-center font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Rehearse the moment <br /> <em className="text-coral">before it&apos;s real.</em>
          </h2>
          <p className="mt-4 max-w-xl text-center text-[15px] leading-relaxed text-white/75">
            <strong className="text-white">IRL Gym is an AI simulator for real-life conversations.</strong> Practice your appraisal,
            a salary negotiation, or a hard talk against an AI that pushes back, reads the room, and coaches you as you speak — then retry until you own it.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px] font-semibold text-white/60">
            <span className="rounded-full bg-white/10 px-3 py-1">Any scenario</span>
            <span className="rounded-full bg-white/10 px-3 py-1">An AI that adapts &amp; pushes back</span>
            <span className="rounded-full bg-white/10 px-3 py-1">Real-time coaching</span>
          </div>

          {/* live-read mini mock, reusing the product's own visual language */}
          <div className="mt-5 flex w-full max-w-md flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-white/50">
              <span className="h-1.5 w-1.5 rounded-full bg-good" /> Live read · a real AI reading your every move
            </div>
            {[["Their resistance", 42, "from-[#ff9a5e] to-[#ff5e7a]"], ["Your clarity", 84, "from-[#8b7be8] to-[#b9a7ff]"], ["Composure", 78, "from-[#8b7be8] to-[#b9a7ff]"]].map(([label, val, grad]) => (
              <div key={label as string} className="grid grid-cols-[92px_1fr_26px] items-center gap-2">
                <span className="text-[10px] text-white/70">{label}</span>
                <span className="block h-1.5 overflow-hidden rounded-full bg-white/10"><span className={`block h-full rounded-full bg-gradient-to-r ${grad}`} style={{ width: `${val}%` }} /></span>
                <em className="text-right font-mono text-[10px] not-italic">{val as number}</em>
              </div>
            ))}
            <div className="mt-1 flex gap-1.5">
              <span className="rounded-full bg-[#e4f8ec] px-2 py-0.5 text-[10px] font-extrabold text-[#177a45]">✓ Made a clear ask</span>
              <span className="rounded-full bg-[#fff3d9] px-2 py-0.5 text-[10px] font-extrabold text-[#8a5a00]">! Hedged</span>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/gym" className="inline-flex items-center gap-2 rounded-full bg-yellow px-6 py-3.5 text-sm font-bold text-[#14121c]">
              Step into the Gym <ArrowRight size={16} />
            </Link>
            <Link href="/field" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/10">
              Explore the Field
            </Link>
          </div>
        </div>
      </Scene>
    </main>
  );
}

function Scene({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`relative flex h-screen snap-start flex-col items-center justify-center px-6 ${className ?? ""}`}>
      {children}
    </section>
  );
}
