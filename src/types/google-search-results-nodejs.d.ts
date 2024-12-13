import { SearchResponse } from "./search";
declare module "google-search-results-nodejs" {
  export class GoogleSearch {
    constructor(apiKey: string);
    json(
      params: { q: string; num?: number },
      callback: (data: SearchResponse) => void
    ): void;
  }
}
