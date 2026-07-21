import { NextRequest, NextResponse } from "next/server";

import { runScout } from "@/lib/agents/scout";
import { readJson, scoutRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const parsed = scoutRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Send a short research goal or query." }, { status: 400 });
  }

  return NextResponse.json(await runScout(parsed.data));
}
