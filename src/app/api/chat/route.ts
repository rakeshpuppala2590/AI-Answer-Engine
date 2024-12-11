// TODO: Implement the chat API with Groq and web scraping with Cheerio and Puppeteer
// Refer to the Next.js Docs on how to read the Request body: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
// Refer to the Groq SDK here on how to use an LLM: https://www.npmjs.com/package/groq-sdk
// Refer to the Cheerio docs here on how to parse HTML: https://cheerio.js.org/docs/basics/loading
// Refer to Puppeteer docs here: https://pptr.dev/guides/what-is-puppeteer

import { Groq } from "groq-sdk";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    // Extract URL from message if present
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.match(urlRegex);
    let contextData = "";

    // Scrape content if URLs are found
    if (urls && urls.length > 0) {
      const browser = await puppeteer.launch({
        headless: true,
      });

      for (const url of urls) {
        try {
          const page = await browser.newPage();
          await page.goto(url);
          const content = await page.content();
          const $ = cheerio.load(content);
          // Concatenate scraped text from each URL
          contextData += $("body").text() + "\n";
        } catch (error) {
          console.error(`Failed to scrape ${url}:`, error);
        }
      }
      await browser.close();
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that answers questions based on the provided context.",
        },
        {
          role: "user",
          content: contextData
            ? `Context from URLs:\n${contextData}\n\nQuestion: ${message}`
            : message,
        },
      ],
      model: "mixtral-8x7b-32768",
      temperature: 0.7,
      max_tokens: 2048,
    });

    return Response.json({
      answer: completion.choices[0]?.message?.content || "No answer generated",
      urls: urls || [],
    });
  } catch (error) {
    console.error("Error:", error);
    return Response.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
