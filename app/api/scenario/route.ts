import { NextRequest, NextResponse } from "next/server";

import { runScenario } from "@/lib/agents/scenario";
import { readJson, scenarioRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const parsed = scenarioRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Describe the situation you want to practice." }, { status: 400 });
  }

  return NextResponse.json(await runScenario(parsed.data.description));
}
