import { NextRequest, NextResponse } from "next/server";

import { runEditor } from "@/lib/agents/editor";
import { editorRequestSchema, readJson } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const parsed = editorRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Send a draft no longer than 4,000 characters." }, { status: 400 });
  }

  const words = parsed.data.text.split(/\s+/).filter(Boolean);
  if (words.length < 8) {
    return NextResponse.json({
      issues: [],
      scores: { clarity: 0, persuasion: 0, warmth: 0, brevity: 0 },
      rewrite: parsed.data.text
    });
  }

  return NextResponse.json(await runEditor(parsed.data.text));
}
