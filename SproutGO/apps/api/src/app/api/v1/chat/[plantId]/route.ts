// GET  /api/v1/chat/:plantId — recent conversation history (oldest first).
// POST /api/v1/chat/:plantId — send a message to the plant persona, persist the exchange,
// return the reply (API_CONTRACT §plant chat, AI_INTEGRATION.md). Gated on the caller having a
// PlantDexEntry for this plant (chat unlocks on discovery). Rate-limited from persisted rows.

import { NextResponse } from "next/server";
import type { ChatHistoryResponse, ChatReply, ChatTurn } from "@sproutgo/shared";
import type { ChatMessage as ChatMessageRow } from "@sproutgo/db";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { errors, errorResponse } from "@/lib/errors";
import { chatMessageSchema } from "@/lib/validation";
import { SCORING } from "@/config/scoring";
import { getPlantChatter, type PlantChatTurn } from "@/lib/chat";
import { buildSystemPrompt } from "@/lib/chat/persona";

export const dynamic = "force-dynamic";

// One persisted row holds a user message + the plant's reply → two display turns.
function rowToTurns(row: ChatMessageRow): ChatTurn[] {
  const createdAt = row.createdAt.toISOString();
  return [
    { role: "user", content: row.userMessage, createdAt },
    { role: "plant", content: row.aiResponse, createdAt },
  ];
}

async function requireDiscoveredPlant(userId: string, plantId: string) {
  const entry = await prisma.plantDexEntry.findUnique({
    where: { userId_plantId: { userId, plantId } },
    select: { id: true },
  });
  if (!entry) {
    throw errors.forbidden("Discover this plant before chatting with it");
  }
  const plant = await prisma.plant.findUnique({ where: { id: plantId } });
  if (!plant) throw errors.notFound("Plant not found");
  return plant;
}

export async function GET(
  req: Request,
  { params }: { params: { plantId: string } },
): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(req);
    await requireDiscoveredPlant(userId, params.plantId);

    const rows = await prisma.chatMessage.findMany({
      where: { userId, plantId: params.plantId },
      orderBy: { createdAt: "desc" },
      take: SCORING.chatHistoryTurns,
    });
    // Fetched newest-first for the limit; present oldest-first.
    const messages: ChatTurn[] = rows.reverse().flatMap(rowToTurns);
    const body: ChatHistoryResponse = { messages };
    return NextResponse.json(body);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(
  req: Request,
  { params }: { params: { plantId: string } },
): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(req);
    const parsed = chatMessageSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw errors.validation(parsed.error.issues[0]?.message ?? "Invalid body");
    }

    const plant = await requireDiscoveredPlant(userId, params.plantId);

    // Rate limit from persisted rows (protects OpenAI spend).
    const recent = await prisma.chatMessage.count({
      where: { userId, createdAt: { gte: new Date(Date.now() - SCORING.chatWindowSeconds * 1000) } },
    });
    if (recent >= SCORING.chatWindowMax) {
      throw errors.quota("You're chatting very fast — give the plant a moment to breathe.");
    }

    // Replay recent turns for context (oldest first).
    const priorRows = await prisma.chatMessage.findMany({
      where: { userId, plantId: params.plantId },
      orderBy: { createdAt: "desc" },
      take: SCORING.chatHistoryTurns,
    });
    const history: PlantChatTurn[] = priorRows
      .reverse()
      .flatMap((r) => [
        { role: "user" as const, content: r.userMessage },
        { role: "plant" as const, content: r.aiResponse },
      ]);

    let reply: string;
    try {
      reply = await getPlantChatter().reply({
        systemPrompt: buildSystemPrompt(plant),
        history,
        message: parsed.data.message,
      });
    } catch {
      throw errors.server("The plant is resting right now — please try again in a moment.");
    }

    await prisma.chatMessage.create({
      data: { userId, plantId: params.plantId, userMessage: parsed.data.message, aiResponse: reply },
    });

    const body: ChatReply = { reply };
    return NextResponse.json(body);
  } catch (err) {
    return errorResponse(err);
  }
}
