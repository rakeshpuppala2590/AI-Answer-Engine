import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { ChatMessage } from "../types";

export class RedisService {
  private redis: Redis;
  private ratelimit: Ratelimit;

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      automaticDeserialization: false,
    });
    this.ratelimit = new Ratelimit({
      redis: this.redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"), // 50 requests per minute
      prefix: "app:ratelimit",
    });
  }

  async createShareableLink(sessionId: string): Promise<string> {
    try {
      const messages = await this.getChatHistory(sessionId);

      if (!messages || !Array.isArray(messages)) {
        throw new Error("Invalid chat history");
      }

      const shareId = crypto.randomUUID();
      const shareData = {
        messages,
        originalSessionId: sessionId,
        createdAt: new Date().toISOString(),
      };

      await this.redis.setex(
        `share:${shareId}`,
        86400,
        JSON.stringify(shareData)
      );

      return shareId;
    } catch (error) {
      console.error("Share creation error:", error);
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  // Add connection retry logic
  private async withRetry<T>(
    operation: () => Promise<T>,
    retries = 3
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve =>
          setTimeout(resolve, 1000 * Math.pow(2, i))
        );
      }
    }
    throw new Error("Operation failed after retries");
  }

  async getSharedChat(shareId: string): Promise<{
    messages: ChatMessage[];
    originalSessionId: string;
  }> {
    try {
      const data = await this.redis.get(`share:${shareId}`);

      if (!data) {
        return { messages: [], originalSessionId: "" };
      }

      const parsed = JSON.parse(data as string);
      return {
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        originalSessionId: parsed.originalSessionId || "",
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
      const rawMessages = await this.withRetry(() =>
        this.redis.lrange(`chat:${sessionId}`, 0, -1)
      );

      // Ensure we have an array
      if (!Array.isArray(rawMessages)) {
        console.error("Invalid response format:", rawMessages);
        return [];
      }

      // Safely parse and validate each message
      const validMessages: ChatMessage[] = [];

      for (const msg of rawMessages) {
        try {
          const parsed = JSON.parse(msg);
          if (this.isValidChatMessage(parsed)) {
            validMessages.push(parsed);
          }
        } catch (error) {
          console.error("Failed to parse message:", msg, error);
        }
      }

      return validMessages;
    } catch (error) {
      console.error("Failed to get chat history:", error);
      return [];
    }
  }

  private isValidChatMessage(message: unknown): message is ChatMessage {
    if (!message || typeof message !== "object") {
      return false;
    }

    const candidate = message as Record<string, unknown>;

    return (
      typeof candidate.role === "string" &&
      ["user", "assistant", "system"].includes(candidate.role) &&
      typeof candidate.content === "string" &&
      (!candidate.urls ||
        (Array.isArray(candidate.urls) &&
          candidate.urls.every(url => typeof url === "string")))
    );
  }

  async storeMessages(
    sessionId: string,
    messages: ChatMessage[]
  ): Promise<void> {
    try {
      // Validate input
      if (!Array.isArray(messages)) {
        console.error("Invalid messages format:", messages);
        return;
      }

      // Filter out invalid messages
      const validMessages = messages.filter(msg =>
        this.isValidChatMessage(msg)
      );

      await this.withRetry(async () => {
        for (const message of validMessages) {
          await this.redis.rpush(`chat:${sessionId}`, JSON.stringify(message));
        }
      });
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
