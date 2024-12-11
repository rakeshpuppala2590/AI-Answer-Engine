import { Groq } from "groq-sdk";
import { ChatMessage } from "../types";

export class ChatService {
  private groq: Groq;

  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async generateResponse(
    message: string,
    context: string,
    history: ChatMessage[]
  ): Promise<string> {
    const systemMessage: ChatMessage = {
      role: "system",
      content:
        "You are a helpful assistant that answers questions based on the provided context. If using information from the web, cite the source.",
    };
    const userMessage: ChatMessage = {
      role: "user",
      content: context
        ? `Context from web search:\n${context}\n\nQuestion: ${message}`
        : message,
    };

    const completion = await this.groq.chat.completions.create({
      messages: [systemMessage, ...history, userMessage],
      model: "mixtral-8x7b-32768",
      temperature: 0.7,
      max_tokens: 2048,
    });

    return completion.choices[0]?.message?.content || "No answer generated";
  }
}
