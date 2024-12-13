import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import { SearchResponse } from "../types/search";
import { getJson } from "serpapi";

export class WebScraperService {
  private searchTriggers = [
    "what",
    "when",
    "where",
    "how",
    "why",
    "latest",
    "current",
    "upcoming",
    "news",
    "events",
    "schedule",
    "today",
    "tomorrow",
    "weather",
    "price",
    "cost",
  ];

  needsWebSearch(message: string): boolean {
    return (
      this.searchTriggers.some(trigger =>
        message.toLowerCase().includes(trigger)
      ) && !message.match(/(https?:\/\/[^\s]+)/g)
    );
  }

  async getUrlsFromSearch(query: string): Promise<string[]> {
    if (!process.env.SERPAPI_KEY) {
      throw new Error("SERPAPI_KEY environment variable is not defined");
    }
    const searchResults = await new Promise<SearchResponse>(resolve => {
      getJson(
        {
          q: query,
          num: 3,
        },
        (data: SearchResponse) => resolve(data)
      );
    });

    // Add null check and type guard
    if (
      !searchResults?.organic_results ||
      !Array.isArray(searchResults.organic_results)
    ) {
      return [];
    }

    return searchResults.organic_results
      .filter(result => result?.link)
      .map(result => result.link);
  }

  async scrapeUrls(urls: string[]): Promise<string> {
    if (!Array.isArray(urls)) {
      return "";
    }

    let contextData = "";

    if (urls.length > 0) {
      const browser = await puppeteer.launch({
        headless: true,
      });

      for (const url of urls) {
        try {
          const page = await browser.newPage();
          await page.goto(url, {
            waitUntil: "networkidle0",
            timeout: 30000,
          });
          const content = await page.content();
          const $ = cheerio.load(content);

          const mainContent =
            $("main, article, .content, #content").text() || $("body").text();
          contextData += `From ${url}:\n${mainContent.slice(0, 2000)}\n\n`;
        } catch (error) {
          console.error(`Failed to scrape ${url}:`, error);
        }
      }
      await browser.close();
    }

    return contextData;
  }
}
