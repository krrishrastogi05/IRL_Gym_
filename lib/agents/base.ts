import { z } from "zod";
import { generateJson, isModelConfigured } from "@/lib/ai/openai";

/**
 * The robustness backbone every structured agent runs through:
 * no key -> deterministic fallback; invalid output -> retry once; failure -> fallback.
 * Nothing downstream needs to render malformed model output.
 */
export async function runStructured<T>(opts: {
  prompt: string;
  schema: Record<string, unknown>;
  zodSchema: z.ZodType<T>;
  fallback: () => T;
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<{ data: T; mode: "model" | "fallback" }> {
  const { prompt, schema, zodSchema, fallback, system, maxOutputTokens } = opts;

  if (!isModelConfigured()) return { data: fallback(), mode: "fallback" };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await generateJson<unknown>({ prompt, schema, system, maxOutputTokens });
      const parsed = zodSchema.safeParse(raw);
      if (parsed.success) return { data: parsed.data, mode: "model" };
    } catch {
      // Retry once. API routes always keep a deterministic fallback available.
    }
  }

  return { data: fallback(), mode: "fallback" };
}

export const clampInt = (value: unknown, fallback = 50, min = 0, max = 100) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};
