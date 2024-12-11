import { Redis } from "@upstash/redis";
import { ChatMessage } from "../types";

export class RedisService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    try {
      const chatHistory =
        (await this.redis.lrange(`chat:${sessionId}`, 0, -1)) || [];
      return chatHistory
        .map(msg => {
          try {
            return JSON.parse(msg) as ChatMessage;
          } catch {
            return null;
          }
        })
        .filter(
          (msg): msg is ChatMessage =>
            msg !== null &&
            typeof msg === "object" &&
            "role" in msg &&
            "content" in msg
        );
    } catch (error) {
      console.error("Failed to retrieve chat history:", error);
      return [];
    }
  }

  async storeMessages(
    sessionId: string,
    messages: ChatMessage[]
  ): Promise<void> {
    try {
      for (const msg of messages) {
        await this.redis.rpush(`chat:${sessionId}`, JSON.stringify(msg));
      }

      const totalMessages = await this.redis.llen(`chat:${sessionId}`);
      if (totalMessages > 20) {
        await this.redis.ltrim(`chat:${sessionId}`, -20, -1);
      }
    } catch (error) {
      console.error("Failed to store messages:", error);
    }
  }
}
