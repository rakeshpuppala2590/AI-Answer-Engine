export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface SearchResult {
  link: string;
  title: string;
  snippet: string;
}

export interface SearchResponse {
  organic_results: SearchResult[];
}
