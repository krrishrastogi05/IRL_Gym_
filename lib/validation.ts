import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: text(1_600).min(1)
});

export const roomInputSchema = z.object({
  key: text(60).optional(),
  icon: text(12).optional(),
  color: z.enum(["coral", "blue", "yellow"]).optional(),
  title: text(140).optional(),
  label: text(100).optional(),
  person: text(100).optional(),
  role: text(100).optional(),
  avatar: text(120).optional(),
  situation: text(700).optional(),
  goal: text(360).optional(),
  opening: text(420).optional(),
  contexts: z.array(text(40)).max(8).optional()
});

export const simulationRequestSchema = z.object({
  room: roomInputSchema.optional().default({}),
  context: text(60).min(1).optional().default("Neutral"),
  messages: z.array(chatMessageSchema).min(1).max(24),
  resistance: z.coerce.number().finite().min(0).max(100).optional().default(55)
});

export const gymContextRequestSchema = z.object({
  room: roomInputSchema.optional().default({}),
  context: text(60).min(1).optional().default("Neutral"),
  messages: z.array(chatMessageSchema).min(1).max(24)
});

export const scenarioRequestSchema = z.object({
  description: text(400).min(4)
});

export const scoutRequestSchema = z.object({
  goal: text(320).optional().default(""),
  query: text(320).optional().default("")
});

export const writerRequestSchema = z.object({
  goal: text(320).optional().default(""),
  lead: z
    .object({
      id: text(160),
      name: text(160),
      why: text(360),
      signal: text(240),
      sourceUrl: text(1_200).optional().default(""),
      sourceTitle: text(180).optional().default("")
    })
    .nullable()
    .optional()
    .default(null)
});

export const editorRequestSchema = z.object({
  text: text(4_000).optional().default("")
});

export const watcherRequestSchema = z.object({
  goal: text(320).optional().default(""),
  recentActivity: z.array(text(160)).max(6).optional().default([]),
  leadsCount: z.coerce.number().finite().min(0).max(100).optional().default(0),
  savedCount: z.coerce.number().finite().min(0).max(100).optional().default(0),
  hasDrafted: z.boolean().optional().default(false),
  idleSeconds: z.coerce.number().finite().min(0).max(86_400).optional().default(0)
});

export async function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => undefined);
}


