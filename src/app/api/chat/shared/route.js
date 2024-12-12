// src/app/api/chat/shared/route.ts
import { RedisService } from "@/services/redisService";

const redisService = new RedisService();

export async function POST(request) {
  try {
    const { shareId } = await request.json();

    if (!shareId) {
      return Response.json({ error: "Share ID is required" }, { status: 400 });
    }

    const messages = await redisService.getSharedChat(shareId);

    if (!messages || messages.length === 0) {
      return Response.json({ error: "Shared chat not found" }, { status: 404 });
    }

    return Response.json({ messages });
  } catch (error) {
    console.error("Failed to get shared chat:", error);
    return Response.json(
      { error: "Failed to get shared chat" },
      { status: 500 }
    );
  }
}
