import * as puppeteer from "puppeteer";
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
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--window-size=1920,1080",
          "--disable-blink-features=AutomationControlled", // Hide automation
        ],
      });

      const page = await browser.newPage();

      // Improve stealth
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      });

      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      // Add consent handling
      await page.goto("https://www.google.com", { waitUntil: "networkidle0" });
      await new Promise(r => setTimeout(r, 1000));

      // Perform search
      await page.goto(
        `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        {
          waitUntil: "networkidle0",
          timeout: 60000,
        }
      );

      await page.waitForFunction("setTimeout(() => true, 2000)");

      // Better selector targeting
      const urls = await page.evaluate(() => {
        const anchors = Array.from(
          document.querySelectorAll(
            'div.g h3.r > a, div.g div.yuRUbf > a, div#search div.g a[href^="http"]'
          )
        );
        return Array.from(
          new Set(
            anchors
              .map(a => a.getAttribute("href"))
              .filter(
                (url): url is string =>
                  url !== null && !url.includes("google.com")
              )
              .slice(0, 3)
          )
        );
      });

      await browser.close();
      console.log("Scraped URLs:", urls); // Debug log
      return urls;
    } catch (error) {
      console.error("Error details:", error);
      return [];
    }
  }

  async scrapeUrls(urls: string[]): Promise<string[]> {
    const MAX_WORKERS = 5;
    const browsers: puppeteer.Browser[] = [];
    const results: string[] = new Array(urls.length).fill("");

    try {
      // Initialize browser pool
      for (let i = 0; i < MAX_WORKERS; i++) {
        const browser = await puppeteer.launch({
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-blink-features=AutomationControlled",
          ],
        });
        browsers.push(browser);
      }

      // Create scraping workers
      const scrapeWorker = async (
        url: string,
        browserIndex: number
      ): Promise<string> => {
        const browser = browsers[browserIndex];
        const page = await browser.newPage();

        try {
          await page.setRequestInterception(true);
          page.on("request", (req: puppeteer.HTTPRequest) => {
            if (["image", "stylesheet", "font"].includes(req.resourceType())) {
              req.abort();
            } else {
              req.continue();
            }
          });

          await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 15000,
          });

          const content = await page.evaluate(() => {
            const article = document.querySelector("article") || document.body;
            return article.innerText.slice(0, 1500);
          });

          return content;
        } catch (error) {
          console.error(`Failed to scrape ${url}:`, error);
          return "";
        } finally {
          await page.close();
        }
      };

      // Process URLs in parallel batches
      for (let i = 0; i < urls.length; i += MAX_WORKERS) {
        const batch = urls.slice(i, Math.min(i + MAX_WORKERS, urls.length));
        const batchPromises = batch.map((url, index) =>
          scrapeWorker(url, index % MAX_WORKERS)
        );

        const batchResults = await Promise.all(batchPromises);
        results.splice(i, batchResults.length, ...batchResults);
      }
    } catch (error) {
      console.error("Scraping error:", error);
    } finally {
      // Cleanup browser instances
      await Promise.all(browsers.map(browser => browser.close()));
    }

    return results;
  }
}
