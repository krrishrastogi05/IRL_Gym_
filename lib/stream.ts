// Shared SSE helper for streaming route handlers. Each handler receives a
// `send(event, data)` callback; the stream always ends with a `done` event.
export function sseResponse(
  handler: (send: (event: string, data: unknown) => void) => Promise<void>
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      try {
        await handler(send);
      } catch (error) {
        send("error", { message: error instanceof Error ? error.message : "Something went wrong." });
      } finally {
        send("done", {});
        controller.close();
      }
    }
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no"
    }
  });
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Emit a completed string word-by-word so replies feel typed but never arrive truncated. */
export async function emitTyped(send: (event: string, data: unknown) => void, text: string, delay = 16) {
  for (const token of text.match(/\S+\s*/g) || []) {
    send("token", { text: token });
    await sleep(delay);
  }
}
