import { NextRequest, NextResponse } from "next/server";

import { runRoleplayTurn } from "@/lib/agents/roleplay";
import { emitTyped, sseResponse } from "@/lib/stream";
import { readJson, simulationRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const parsed = simulationRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Send a room, context, and at least one conversation message." }, { status: 400 });
  }

  const { room, context, messages, resistance } = parsed.data;
  return sseResponse(async (send) => {
    const result = await runRoleplayTurn({ room, context, messages, resistance });
    send("analysis", result.analysis);
    send("meta", { mode: result.mode });
    await emitTyped(send, result.reply);
  });
}
