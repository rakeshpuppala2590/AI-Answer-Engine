import { RedisService } from "@/services/redisService";
const redisService = new RedisService();
export async function POST(req: Request) {
  try {
    const { shareId, newSessionId } = await req.json();
    const success = await redisService.continueFromShared(
      shareId,
      newSessionId
    );
    return Response.json({ success });
  } catch (err) {
    console.error("Continue error:", err);
    return Response.json(
      { error: "Failed to continue conversation" },
      { status: 500 }
    );
  }
}
