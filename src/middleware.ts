// TODO: Implement the code here to add rate limiting with Redis
// Refer to the Next.js Docs: https://nextjs.org/docs/app/building-your-application/routing/middleware
// Refer to Redis docs on Rate Limiting: https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms

// src/middleware.ts
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
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: true,
});

export async function middleware(request: NextRequest) {
  // Add CORS headers to all responses
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const { success, limit, reset } = await ratelimit.limit(ip);

    if (!success) {
      const resetInSeconds = Math.ceil((reset - Date.now()) / 1000);
      const errorResponse = {
        answer: `Rate limit exceeded. Please wait ${resetInSeconds} seconds before trying again.`,
        error: true,
        rateLimit: { limit, reset, resetIn: resetInSeconds },
      };

      return new NextResponse(JSON.stringify(errorResponse), {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      });
    }

    const response = NextResponse.next();
    // Add CORS headers to successful responses
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  } catch (err) {
    console.error("Rate limit error:", err);
    const response = NextResponse.next();
    // Add CORS headers to error responses
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
}

export const config = {
  matcher: ["/api/:path*"],
};
