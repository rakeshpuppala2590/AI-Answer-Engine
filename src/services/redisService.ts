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

    // Store original sessionId with shared messages
    const shareData = {
      messages,
      originalSessionId: sessionId,
      createdAt: new Date().toISOString(),
    };

    // Store with 24h expiry
    await this.redis.setex(
      `share:${shareId}`,
      86400,
      JSON.stringify(shareData)
    );

    return shareId;
  }

  async getSharedChat(shareId: string): Promise<{
    messages: ChatMessage[];
    originalSessionId: string;
  }> {
    try {
      const shared = await this.redis.get<string>(`share:${shareId}`);
      if (!shared) return { messages: [], originalSessionId: "" };

      const data = JSON.parse(shared);
      return {
        messages: data.messages,
        originalSessionId: data.originalSessionId,
      };
    } catch (error) {
      console.error("Failed to get shared chat:", error);
      return { messages: [], originalSessionId: "" };
    }
  }

  async continueFromShared(
    shareId: string,
    newSessionId: string
  ): Promise<boolean> {
    try {
      const { messages, originalSessionId } = await this.getSharedChat(shareId);

      if (messages.length > 0) {
        // Get any messages after the share point from original session
        const originalLatestMessages =
          await this.getChatHistory(originalSessionId);

        // Merge shared messages with any new messages from original conversation
        const allMessages = [
          ...messages,
          ...originalLatestMessages.slice(messages.length),
        ];

        // Store complete history in new session
        for (const msg of allMessages) {
          await this.redis.rpush(`chat:${newSessionId}`, JSON.stringify(msg));
        }
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
      const messages = await this.redis.lrange(`chat:${sessionId}`, 0, -1);
      return messages.map(msg => JSON.parse(msg));
    } catch (error) {
      console.error("Failed to get chat history:", error);
      return [];
    }
  }

  async storeMessages(
    sessionId: string,
    messages: ChatMessage[]
  ): Promise<void> {
    try {
      for (const message of messages) {
        await this.redis.rpush(`chat:${sessionId}`, JSON.stringify(message));
      }
    } catch (error) {
      console.error("Failed to store messages:", error);
    }
  }

  async storeMessage(sessionId: string, message: ChatMessage): Promise<void> {
    try {
      await this.redis.rpush(`chat:${sessionId}`, JSON.stringify(message));
    } catch (error) {
      console.error("Failed to store message:", error);
    }
  }
}
