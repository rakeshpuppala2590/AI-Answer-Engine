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

  async createShareableLink(sessionId: string): Promise<string> {
    const shareId = crypto.randomUUID();
    const messages = await this.getChatHistory(sessionId);

    // Store shared conversation with 24h expiry
    await this.redis.setex(`share:${shareId}`, 86400, JSON.stringify(messages));

    return shareId;
  }
  async getSharedChat(shareId: string): Promise<ChatMessage[]> {
    try {
      const shared = await this.redis.get<string>(`share:${shareId}`);
      return shared ? JSON.parse(shared) : [];
    } catch (error) {
      console.error("Failed to get shared chat:", error);
      return [];
    }
  }
  async continueFromShared(
    shareId: string,
    newSessionId: string
  ): Promise<boolean> {
    try {
      const sharedMessages = await this.getSharedChat(shareId);
      if (sharedMessages.length > 0) {
        await Promise.all(
          sharedMessages.map(msg =>
            this.redis.rpush(`chat:${newSessionId}`, JSON.stringify(msg))
          )
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to continue from shared:", error);
      return false;
    }
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
