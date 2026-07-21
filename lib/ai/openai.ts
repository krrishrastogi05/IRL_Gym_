type JsonSchema = Record<string, unknown>;

type Citation = { type?: unknown; url?: unknown; title?: unknown };
type OutputContent = { type?: unknown; text?: unknown; annotations?: Citation[] };
type OpenAIResponse = {
  output_text?: unknown;
  output?: Array<{ type?: unknown; content?: OutputContent[] }>;
};

export type GroundedSource = { url: string; title: string };

type GenerateOptions = {
  prompt: string;
  system?: string;
  maxOutputTokens?: number;
};

const DEFAULT_MODEL = "gpt-5.6-terra";
const REQUEST_TIMEOUT_MS = 18_000;

function configuredModel(): string {
  const candidate = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
  return /^[A-Za-z0-9._-]+$/.test(candidate) ? candidate : DEFAULT_MODEL;
}

function apiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("The model provider is not configured.");
  return key;
}

export function isModelConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

async function callOpenAI(body: Record<string, unknown>): Promise<OpenAIResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey()}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`The model provider returned ${response.status}.`);
    }

    return (await response.json()) as OpenAIResponse;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The model provider timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function responseText(response: OpenAIResponse): string {
  if (typeof response.output_text === "string" && response.output_text.trim()) return response.output_text.trim();

  const text = (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text" && typeof content.text === "string")
    .map((content) => String(content.text))
    .join("")
    .trim();

  if (text) return text;
  throw new Error("The model provider returned no text.");
}

function parseJson(text: string): unknown {
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse((fenced?.[1] ?? text).trim());
}

function requestBase(options: GenerateOptions): Record<string, unknown> {
  return {
    model: configuredModel(),
    ...(options.system ? { instructions: options.system } : {}),
    input: options.prompt,
    max_output_tokens: options.maxOutputTokens ?? 700,
    reasoning: { effort: "low" },
    text: { verbosity: "low" },
    store: false
  };
}

/** Generate JSON with the Responses API's structured-output mode. Validate with Zod in the caller. */
export async function generateJson<T>(options: GenerateOptions & { schema: JsonSchema; name?: string }): Promise<T> {
  const response = await callOpenAI({
    ...requestBase(options),
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: options.name || "agent_result",
        schema: options.schema,
        strict: false
      }
    }
  });

  return parseJson(responseText(response)) as T;
}

/** Search the live web with OpenAI's hosted web-search tool and preserve the returned citations. */
export async function generateGroundedText(options: GenerateOptions): Promise<{ text: string; sources: GroundedSource[] }> {
  const response = await callOpenAI({
    ...requestBase(options),
    tools: [{ type: "web_search" }]
  });

  const seen = new Set<string>();
  const sources = (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .flatMap((content) => content.annotations ?? [])
    .flatMap((citation) => {
      if (citation.type !== "url_citation" || typeof citation.url !== "string" || !citation.url) return [];
      if (seen.has(citation.url)) return [];
      seen.add(citation.url);
      return [{ url: citation.url, title: typeof citation.title === "string" ? citation.title : "" }];
    });

  return { text: responseText(response), sources };
}
