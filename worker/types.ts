export interface AssetsFetcher {
  fetch(input: Request | URL | string, init?: RequestInit): Promise<Response>;
}

export interface WorkerEnv {
  ASSETS?: AssetsFetcher;
  WP_STORE_URL?: string;
  WC_CONSUMER_KEY?: string;
  WC_CONSUMER_SECRET?: string;
}

export interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}
