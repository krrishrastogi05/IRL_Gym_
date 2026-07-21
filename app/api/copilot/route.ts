import { NextRequest, NextResponse } from "next/server";

import { runWatcher } from "@/lib/agents/watcher";
import { readJson, watcherRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const parsed = watcherRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Send valid activity details for the copilot." }, { status: 400 });
  }

  return NextResponse.json(await runWatcher(parsed.data));
}
