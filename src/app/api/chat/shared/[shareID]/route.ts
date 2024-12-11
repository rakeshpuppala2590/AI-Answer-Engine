import { RedisService } from "@/services/redisService";
const redisService = new RedisService();
export async function GET(
  req: Request,
  { params }: { params: { shareId: string } }
) {
  try {
    const messages = await redisService.getSharedChat(params.shareId);
    return Response.json({ messages });
  } catch (error) {
    return Response.json(
      { error: "Failed to get shared chat" },
      { status: 500 }
    );
  }
}
