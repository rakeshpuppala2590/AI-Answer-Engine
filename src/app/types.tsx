export interface Message {
  role: "user" | "assistant";
  content: string;
  urls?: string[];
}
