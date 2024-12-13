import { WebScraperService } from "../../../services/webScraper";
import { ChatService } from "../../../services/chatService";
import { RedisService } from "../../../services/redisService";
// import { ChatMessage } from "../../../types";

const webScraper = new WebScraperService();
const chatService = new ChatService();
const redisService = new RedisService();

export async function POST(req: Request) {
  try {
    const { message, sessionId } = await req.json();
    let urls: string[] = [];

    // Get URLs from message or search
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const explicitUrls = message.match(urlRegex);

    if (explicitUrls) {
      urls = explicitUrls;
    } else if (webScraper.needsWebSearch(message)) {
      urls = await webScraper.getUrlsFromSearch(message);
    }
    // Get context from URLs
    const contextData = await webScraper.scrapeUrls(urls);

    // Get chat history
    const messages = await redisService.getChatHistory(sessionId);

    // Generate response
    const aiResponse = await chatService.generateResponse(
      message,
      contextData.join("\n"),
      messages
    );

    // Store new messages
    await redisService.storeMessages(sessionId, [
      { role: "user", content: message },
      { role: "assistant", content: aiResponse },
    ]);

    return Response.json({
      answer: aiResponse,
      urls: urls,
    });
  } catch (error) {
    console.error("Error:", error);
    return Response.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
