import type { Connector } from './types';
import { extra } from './extras';

export type Tri = true | false | null;
export interface Cap { key: string; label: string; hint: string; value: Tri }
const has = (c: Connector, re: RegExp) => [...(c.features ?? []), ...c.commands, ...(extra(c).cmds ?? [])].some((x) => re.test(x));
export function capabilities(c: Connector): Cap[] {
  const i = c.interfaces; const e = extra(c);
  return [
    { key: 'mcp', label: 'MCP-Tool', hint: 'als Tool in MCP-/Paperclip-Hosts', value: i ? i.mcp || c.paperclip : c.paperclip },
    { key: 'cli', label: 'CLI', hint: 'node bin/cli.js mit JSON-Ausgabe', value: i ? i.cli || i.opencli : null },
    { key: 'http', label: 'HTTP / API', hint: 'öffentlicher HTTP-Endpunkt der Quelle', value: i ? i.apiOpen || !!c.endpoint : !!c.endpoint },
    { key: 'search', label: 'Suche', hint: 'Suchbefehl oder Suchfunktion', value: has(c, /such|search/i) || null },
    { key: 'detail', label: 'Detail', hint: 'Einzeldatensatz abrufbar', value: has(c, /detail|dokument/i) || null },
    { key: 'export', label: 'Export', hint: 'Listen / Downloads / Feeds', value: has(c, /listen|download|feed|export|scrape-all/i) || null },
    { key: 'nologin', label: 'Ohne Login', hint: 'kein Konto nötig', value: c.loginRequired == null ? null : !c.loginRequired },
    { key: 'robots', label: 'robots.txt ok', hint: 'Zugriff laut robots.txt erlaubt', value: c.robots === 'allowed' ? true : c.robots === 'disallowed' ? false : null },
    { key: 'llms', label: 'llms.txt', hint: 'Quelle bietet llms.txt an', value: e.llms ? true : null },
    { key: 'openapi', label: 'OpenAPI', hint: 'maschinenlesbare API-Beschreibung', value: e.openapi ? true : null },
  ];
}
export const capOn = (c: Connector, key: string) => capabilities(c).find((x) => x.key === key)?.value === true;
