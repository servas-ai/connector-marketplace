export type Robots = 'allowed' | 'disallowed' | 'unknown';
export interface Kpi { stability: number | null; p50: number | null; p95: number | null; throughput: number | null; captchaRate: number | null; dataQuality: number | null; score: number | null; blocked: boolean; }
export interface LivePoint { t: string; v: number }
export interface LiveInfo { realtime: boolean; label: string; unit: string; view: string; refreshS: number; series: LivePoint[]; endpoint: LiveEndpoint | null }
export type LiveEndpoint = 'kraken-ohlc' | 'coinbase-candles' | 'binance-klines';
export interface Connector {
  id: string; name: string; domain: string | null; description: string; category: string; country: string; status: string;
  repo: string; records: number | null; commands: string[]; logo: string | null; paperclip: boolean; lastRun: string | null;
  e2ePassed: number | null; e2eTotal: number | null; kpi: Kpi | null; loginRequired: boolean | null; captcha: boolean | null;
  apiAvailable: boolean | null; apiVersion: string | null; robots: Robots; robotsNote: string | null; incidents: string[];
  links: { skill: string | null; protocol: string | null; samples: string | null }; source: string | null;
  live?: LiveInfo | null;
  llms?: LlmsInfo | null;
}
export interface Dataset { generatedAt: string; sourceRepo: string; sourceGeneratedAt: string; count: number; connectors: Connector[]; }
export interface LlmsInfo { llmsTxt: string | null; llmsFull: string | null; openapi: string | null; mcp: string | null; aiPolicy: string | null }
