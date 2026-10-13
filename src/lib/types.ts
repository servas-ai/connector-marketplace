export type Robots = 'allowed' | 'disallowed' | 'unknown';
export interface Kpi { stability: number | null; p50: number | null; p95: number | null; throughput: number | null; captchaRate: number | null; dataQuality: number | null; score: number | null; blocked: boolean; }
export interface Connector extends Enriched {
  id: string; name: string; domain: string | null; description: string; category: string; country: string; status: string;
  repo: string; records: number | null; commands: string[]; logo: string | null; logoSource?: string | null; paperclip: boolean; lastRun: string | null;
  e2ePassed: number | null; e2eTotal: number | null; kpi: Kpi | null; loginRequired: boolean | null; captcha: boolean | null;
  apiAvailable: boolean | null; apiVersion: string | null; robots: Robots; robotsNote: string | null; incidents: string[];
  links: { skill: string | null; protocol: string | null; samples: string | null }; source: string | null;
}
export interface Dataset { generatedAt: string; sourceRepo: string; sourceGeneratedAt: string; count: number; connectors: Connector[]; enrichedAt?: string; gatesSource?: string | null; }
export interface Server {
  ip: string | null; asn: string | null; hoster: string | null; country: string | null; city: string | null; cdn: string | null;
  webserver: string | null; poweredBy: string | null; cms: string | null; tech: string[]; hsts: boolean | null; csp: boolean | null;
  tlsIssuer: string | null; tlsNotAfter: string | null; registered: string | null; domainAgeYears: number | null; rdap: string | null;
  robotsBlockedProbe: boolean; probedAt: string;
}
export interface Interfaces { access: string; apiOpen: boolean; apiKey: boolean; ogdDump: boolean; reJson: boolean; feed: boolean; mcp: boolean; cli: boolean; opencli: boolean; paperclip: boolean; playwright: boolean; pdf: boolean; }
export interface Gates { state: 'pass' | 'fail' | 'extern' | 'unknown'; errors: number; codes: string[]; path?: string; top?: string[]; note?: string; }
export interface Enriched { server?: Server | null; sourceType?: string; interfaces?: Interfaces; features?: string[]; covered?: string[]; gaps?: string[]; urls?: string[]; gates?: Gates; }
