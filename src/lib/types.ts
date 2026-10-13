export type Robots = 'allowed' | 'disallowed' | 'unknown';
export interface Kpi { stability: number | null; p50: number | null; p95: number | null; throughput: number | null; captchaRate: number | null; dataQuality: number | null; score: number | null; blocked: boolean; }
export interface LivePoint { t: string; v: number }
export interface LiveInfo { realtime: boolean; label: string; unit: string; view: string; refreshS: number; series: LivePoint[]; endpoint: LiveEndpoint | null }
export type LiveEndpoint = 'kraken-ohlc' | 'coinbase-candles' | 'binance-klines';
export interface Connector extends Enriched {
  id: string; name: string; path?: string | null; endpoint?: string | null; domain: string | null; description: string; category: string; country: string; status: string;
  repo: string; records: number | null; commands: string[]; logo: string | null; logoSource?: string | null; paperclip: boolean; lastRun: string | null;
  e2ePassed: number | null; e2eTotal: number | null; kpi: Kpi | null; loginRequired: boolean | null; captcha: boolean | null;
  apiAvailable: boolean | null; apiVersion: string | null; robots: Robots; robotsNote: string | null; incidents: string[];
  links: { skill: string | null; protocol: string | null; samples: string | null }; source: string | null;
  live?: LiveInfo | null;
  /** Precomputed on list.json for fast Home filters */
  ent?: 'grün' | 'gelb' | 'rot';
  kom?: 'ja' | 'mit Namensnennung' | 'prüfen' | 'nein';
}
export interface Dataset { generatedAt: string; sourceRepo: string; sourceGeneratedAt: string; count: number; connectors: Connector[]; enrichedAt?: string; gatesSource?: string | null; egress?: { ip: string; at: string; rdns?: string | null } | null; observationsAt?: string; observationCount?: number; timeline?: ({ day: string } & Record<string, number | string>)[]; }
export interface Server {
  ip: string | null; asn: string | null; hoster: string | null; country: string | null; city: string | null; cdn: string | null;
  webserver: string | null; poweredBy: string | null; cms: string | null; tech: string[]; hsts: boolean | null; csp: boolean | null;
  tlsIssuer: string | null; tlsNotAfter: string | null; registered: string | null; domainAgeYears: number | null; rdap: string | null;
  robotsBlockedProbe: boolean; probedAt: string;
}
export interface Interfaces { access: string; apiOpen: boolean; apiKey: boolean; ogdDump: boolean; reJson: boolean; feed: boolean; mcp: boolean; cli: boolean; opencli: boolean; paperclip: boolean; playwright: boolean; pdf: boolean; }
export interface Gates { state: 'pass' | 'fail' | 'extern' | 'unknown'; errors: number; codes: string[]; path?: string; top?: string[]; note?: string; }
export type AmpelLevel = 'green' | 'yellow' | 'red';
export interface Ampel { level: AmpelLevel; reasons: string[]; }
export interface Signals { counts: Record<string, number>; captchaTypes: Record<string, number>; observations: number; uptime: number | null; last: string | null; }
export interface Net { rdns: string | null; network: string | null; cdn: string | null; cdnAll: string[]; evidence: string[]; waf: boolean; proxy: boolean; datacenter: string | null; }
export interface Enriched { ampel?: Ampel; signals?: Signals; net?: Net | null; screenshot?: string | null; server?: Server | null; sourceType?: string; interfaces?: Interfaces; features?: string[]; covered?: string[]; gaps?: string[]; urls?: string[]; gates?: Gates; }
