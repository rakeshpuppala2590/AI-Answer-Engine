// TODO: Implement the code here to add rate limiting with Redis
// Refer to the Next.js Docs: https://nextjs.org/docs/app/building-your-application/routing/middleware
// Refer to Redis docs on Rate Limiting: https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(2, "1 m"),
  analytics: true,
});

export async function middleware(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    if (!success) {
      const resetInSeconds = Math.ceil((reset - Date.now()) / 1000);
      const errorResponse = {
        answer: `Rate limit exceeded. Please wait ${resetInSeconds} seconds before trying again. You are limited to ${limit} requests per minute.`,
        error: true,
        rateLimit: {
          limit,
          remaining: 0,
          reset,
          resetIn: resetInSeconds,
        },
      };

      return new NextResponse(JSON.stringify(errorResponse), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": reset.toString(),
        },
      });
    }
    return NextResponse.next();
  } catch (error) {
    console.error("Rate limiting error:", error);
    return NextResponse.next();
  }
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images
     */
    "/api/chat",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
