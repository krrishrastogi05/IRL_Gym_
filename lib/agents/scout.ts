import { z } from "zod";

import { generateGroundedText, isModelConfigured, type GroundedSource } from "@/lib/ai/openai";
import type { Lead } from "@/lib/types";

const leadsZod = z.object({
  leads: z.array(
    z.object({
      name: z.string(),
      why: z.string(),
      signal: z.string(),
      source: z.string().optional()
    })
  )
});

type ScoutOutput = z.infer<typeof leadsZod>;

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  const candidate = (fenced ?? text).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(candidate.slice(start, end + 1));
    throw new Error("The research response did not contain JSON.");
  }
}

function prompt(goal: string, query: string): string {
  return [
    "Research live, useful opportunities for the learner using the available web search tool.",
    `Learner goal: ${goal || "open a valuable professional conversation"}.`,
    `Search focus: ${query || goal || "relevant current opportunities"}.`,
    "Return JSON only, with this shape: {\"leads\":[{\"name\":string,\"why\":string,\"signal\":string,\"source\":string}] }.",
    "Provide 3-6 leads. Each lead must be concrete and currently actionable. why explains fit in 1-2 short sentences; signal is one timely, verifiable signal; source must be an exact source URL from the web-search citations. Do not invent companies, people, or URLs."
  ].join("\n");
}

function sourceFor(value: string | undefined, sources: GroundedSource[], index: number): GroundedSource | undefined {
  if (value) {
    const exact = sources.find((source) => source.url === value);
    if (exact) return exact;
  }
  return sources[index] ?? sources[0];
}

function sourceTitle(source: GroundedSource): string {
  if (source.title) return source.title.slice(0, 120);
  try {
    return new URL(source.url).hostname;
  } catch {
    return "Source";
  }
}

function normalize(output: ScoutOutput, sources: GroundedSource[]): Lead[] {
  return output.leads.slice(0, 6).flatMap((lead, index) => {
    const source = sourceFor(lead.source, sources, index);
    const name = lead.name.trim().slice(0, 100);
    const why = lead.why.trim().slice(0, 240);
    const signal = lead.signal.trim().slice(0, 160);
    if (!source || !name || !why || !signal) return [];
    return [{
      id: `${Date.now()}-${index}`,
      name,
      why,
      signal,
      sourceUrl: source.url,
      sourceTitle: sourceTitle(source)
    }];
  });
}

/** Scout: OpenAI web-search-grounded research -> structured, source-linked opportunities. */
export async function runScout(opts: { goal: string; query: string }): Promise<{ leads: Lead[]; mode: "model" | "fallback" }> {
  const { goal, query } = opts;
  if (!isModelConfigured()) return { leads: fallbackLeads(query || goal), mode: "fallback" };

  try {
    const grounded = await generateGroundedText({
      prompt: prompt(goal, query),
      system: "You are a careful research assistant. Prioritize useful, verifiable, current information and output only valid JSON.",
      maxOutputTokens: 1_000
    });
    const parsed = leadsZod.safeParse(extractJson(grounded.text));
    const leads = parsed.success ? normalize(parsed.data, grounded.sources) : [];
    if (leads.length) return { leads, mode: "model" };
  } catch {
    // A model or search failure should never make the Field unusable.
  }

  return { leads: fallbackLeads(query || goal), mode: "fallback" };
}

function fallbackLeads(query: string): Lead[] {
  const topic = query.trim() || "your goal";
  return [
    {
      id: `${Date.now()}-a`,
      name: `Teams actively hiring around "${topic}"`,
      why: "Job posts are a useful buying signal: someone has a live need and allocated attention.",
      signal: "Look for posts from the last two weeks.",
      sourceUrl: "",
      sourceTitle: "Demo mode - add OPENAI_API_KEY for live research"
    },
    {
      id: `${Date.now()}-b`,
      name: `People publicly discussing ${topic}`,
      why: "A recent post puts the problem top of mind, giving your outreach a relevant opening.",
      signal: "Reference a specific recent post or launch.",
      sourceUrl: "",
      sourceTitle: "Demo mode"
    },
    {
      id: `${Date.now()}-c`,
      name: `Communities and events for ${topic}`,
      why: "Meet people where they already gather to start higher-context conversations.",
      signal: "Find the next upcoming session or active community thread.",
      sourceUrl: "",
      sourceTitle: "Demo mode"
    }
  ];
}
