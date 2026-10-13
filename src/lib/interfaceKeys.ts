import type { Interfaces } from './types';
export const INTERFACE_KEYS: [keyof Omit<Interfaces, 'access'>, string][] = [
  ['apiOpen', 'API offen'], ['apiKey', 'API mit Key'], ['ogdDump', 'OGD-Dump'], ['feed', 'Feed'], ['reJson', 'JSON-Backend'], ['mcp', 'MCP'],
  ['cli', 'CLI'], ['opencli', 'OpenCLI'], ['paperclip', 'Paperclip'], ['playwright', 'Playwright'], ['pdf', 'PDF'],
];
