import { RedisService } from "@/services/redisService";
const redisService = new RedisService();

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();
    const shareId = await redisService.createShareableLink(sessionId);

    return Response.json({ shareId });
  } catch {
    return Response.json(
      { error: "Failed to create share link" },
      { status: 500 }
    );
  }
}
