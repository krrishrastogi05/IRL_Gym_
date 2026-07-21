import { NextRequest, NextResponse } from "next/server";

import { runWriter } from "@/lib/agents/writer";
import { readJson, writerRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const parsed = writerRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Send a short goal and, optionally, a valid lead." }, { status: 400 });
  }

  return NextResponse.json(await runWriter(parsed.data));
}
