import { NextRequest, NextResponse } from "next/server";

import { runPsychologist } from "@/lib/agents/psychologist";
import { gymContextRequestSchema, readJson } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const parsed = gymContextRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Send a room, context, and conversation messages." }, { status: 400 });
  }

  const read = await runPsychologist(parsed.data);
  return NextResponse.json(read);
}
