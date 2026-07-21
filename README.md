# IRL Gym - Rehearse. Perform. Land it.

IRL Gym gives people a safe place to rehearse the conversations that matter, then helps them find and act on real opportunities.

- **Gym** - practice high-stakes conversations against an adaptive roleplay partner. Get move-by-move coaching, a room read, optional hints, and a clear debrief.
- **Field** - turn a goal into action: find live opportunities, save a shortlist, draft outreach, tighten it with an editor, and rehearse the next conversation in the Gym.

One loop: **Find it -> Write it -> Rehearse it -> Land it.**

## Run locally

```bash
npm install
copy .env.example .env.local
# Add your OPENAI_API_KEY to .env.local
npm run dev
```

Open http://localhost:3000. Set `OPENAI_MODEL` only if you want to override the default `gpt-5.6-terra`.

The app stays usable without a key: every agent has a deterministic practice-mode fallback, so demos and UI flows never fail because a provider is unavailable.

## Architecture

- **Next.js App Router + TypeScript + Tailwind** - server-side orchestration keeps the API key out of the browser; Gym replies are delivered over SSE.
- **OpenAI Responses API** - structured JSON for roleplay, coaching, room reads, hints, scenarios, writing, editing, and proactive Field nudges.
- **OpenAI web search** - the Field scout uses hosted web search and only surfaces source links returned by the response.
- **Multi-agent core** - Roleplay + Coach, Psychologist, Guide, Scenario builder, Scout, Writer, Editor, and Watcher. Each structured agent validates model output, retries once, and falls back safely.

## Verify

```bash
npm run typecheck
npm run eval
npm run build
```

## Deploy to Render

Create a Render Web Service from this repository, then add `OPENAI_API_KEY` as a secret environment variable. `render.yaml` contains the build and start commands plus the expected environment-variable names.
