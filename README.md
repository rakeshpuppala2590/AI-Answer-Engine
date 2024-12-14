# AI Answer Engine

## Overview
The **AI Answer Engine** is a web application built using **Next.js** and **TypeScript**. It provides a conversational interface to answer user queries based on content scraped from user-provided URLs. The engine mitigates hallucinations by citing its sources for every response, inspired by platforms like **Perplexity.ai**. Additionally, it includes features like rate limiting, Redis caching, and conversation sharing.

## Features
- **Chat Interface**: Users can:
  - Paste URLs to retrieve contextual information from the content.
  - Ask questions and receive answers with cited sources.
  - Share conversations with others and allow further interactions.

- **Web Scraping**: Utilizes **Puppeteer** and **Cheerio** for robust content extraction from websites.

- **Middleware**:
  - Rate limiting implemented using **Redis** to prevent abuse.
  - Efficient caching for faster responses.

- **Backend**:
  - API design using Next.js API routes.
  - Query handling through integration with Groq and external data scraping.

## Challenges (Optional Enhancements)
1. Comprehensive content extraction from diverse sources such as:
   - YouTube videos.
   - Images and PDFs.
2. Expandable architecture to support advanced features.

## Tech Stack
- **Frontend**: React, Next.js, TypeScript
- **Backend**: API routes, Puppeteer, Cheerio
- **Caching & Middleware**: Redis
- **Deployment**: Vercel (or preferred hosting service)

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- Redis (local or hosted via Upstash)
- Git

### Installation
1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd ai-answer-engine
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Environment Variables**:
   Create a `.env` file in the root directory with the following variables:
   ```env
   REDIS_URL=<your_redis_instance_url>
   NEXT_PUBLIC_API_KEY=<your_api_key>
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

### File Structure
```
.
├── src
│   ├── app
│   │   ├── api
│   │   │   └── chat
│   │   │       └── route.ts      # Chat API implementation
│   │   ├── page.tsx             # Main UI component
│   │   └── middleware.ts        # Rate limiting logic
│   └── utils
│       ├── scraper.ts           # Web scraping logic
│       ├── cache.ts             # Redis caching helper
├── public                       # Static assets
├── .env                         # Environment variables
└── README.md
```

---

## Implementation Guide

### Step 1: UI Setup
Update the chat interface in `src/app/page.tsx` to:
- Allow users to paste URLs.
- Enable real-time chat interactions.
- Display sourced answers.

### Step 2: Chat API
Implement the API in `src/app/api/chat/route.ts`:
- Use **Groq** and **Cheerio** to process content from provided URLs.
- Integrate with an LLM to generate answers.
- Ensure each answer cites its sources.

### Step 3: Middleware
Implement rate limiting in `src/middleware.ts`:
- Use **Redis** to track and enforce limits per user.
- Return appropriate error messages for exceeded limits.

### Step 4: Caching
Optimize performance with **Redis caching**:
- Cache frequently requested responses to reduce processing time.
- Use utilities in `src/utils/cache.ts` for caching logic.

---

## Deployment
1. **Build the Application**:
   ```bash
   npm run build
   ```
2. **Start the Production Server**:
   ```bash
   npm run start
   ```
3. **Deploy to Vercel**:
   - Push the repository to GitHub.
   - Import the project in Vercel and set up environment variables.
   - Deploy with a single click.

---

## Usage
- Navigate to the deployed app.
- Paste URLs to extract context or ask questions directly.
- Share the generated conversations via a unique link.

---

## Example Workflow
1. **Paste URLs**:
   ```
   [URL 1: https://example.com]
   [URL 2: https://example.org]
   ```
2. **Ask a Question**:
   ```
   What are the main differences between the two sources?
   ```
3. **Receive Answer**:
   ```
   Source 1 states... while Source 2 explains...
   Citations: [1](https://example.com), [2](https://example.org)
   ```

---

## Resources
- [How to Build a Web Scraper API with Puppeteer](https://example.com)
- [API Routes with Next.js](https://example.com)
- [Rate Limiting Next.js APIs using Upstash](https://example.com)
- [How to Use Redis Caching](https://example.com)

---

## Contribution
1. Fork the repository.
2. Create a feature branch: `git checkout -b feature-name`.
3. Commit changes: `git commit -m "Add feature"`.
4. Push to the branch: `git push origin feature-name`.
5. Open a pull request.

---

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.

---

## Acknowledgements
Inspired by [Perplexity.ai](https://perplexity.ai) and other similar platforms.
