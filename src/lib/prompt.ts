import type { Connector } from './types';
import type { Detail } from './extras';
import { capabilities } from './capabilities';
import { categoryOf } from './taxonomy';

export const SITE = 'https://servas-ai.github.io/connector-marketplace/';
export function source(c: Connector) {
  const mono = !!c.path;
  const repo = mono ? 'servas-ai/opencli-connectors' : (c.repo?.replace(/^https:\/\/github.com\//, '') || `servas-ai/opencli-${c.id}`);
  const dir = mono ? `opencli-connectors/${c.path}` : repo.split('/').pop()!;
  return { repo, dir, clone: `git clone https://github.com/${repo}.git`, ghClone: `gh repo clone ${repo}`, url: `https://github.com/${repo}${mono ? `/tree/main/${c.path}` : ''}` };
}
export function snippets(c: Connector) {
  const s = source(c); const cmd = c.commands[0] ?? '--help';
  return {
    MCP: `${s.clone}\ncd ${s.dir} && npm install\n# MCP-/Paperclip-Host: Manifest einbinden (opencli-plugin.json bzw. paperclip/manifest.json)\n# jedes CLI-Kommando wird als Tool registriert`,
    CLI: `${s.clone}\ncd ${s.dir} && npm install\nnode bin/cli.js ${cmd} --format json`,
    HTTP: c.endpoint ? `curl -sL "${c.endpoint}"   # Quelle direkt, gedrosselt nutzen` : '# kein öffentlicher HTTP-Endpunkt dokumentiert',
  };
}
export function agentPrompt(c: Connector, d?: Detail | null): string {
  const s = source(c); const caps = capabilities(c);
  const yes = caps.filter((x) => x.value === true).map((x) => x.label).join(', ') || 'keine bestätigt';
  const routes = (d?.audit?.runs ?? []).map((r) => `- \`node bin/cli.js ${r.args} --format json\` (zuletzt ${r.ok ? 'ok' : 'fehlgeschlagen'}${r.records != null ? `, ${r.records} Datensätze` : ''})`);
  const cmds = routes.length ? routes : c.commands.map((x) => `- \`node bin/cli.js ${x} --format json\``);
  const http = (d?.routes ?? []).slice(0, 15).map((r) => `- ${r.method} ${r.url} (${r.kind})`);
  return `Du bist ein Agent mit Zugriff auf den Connector "${c.id}" (${c.domain ?? c.id}) aus dem servas-ai Connector-Katalog.

## Zweck
${c.description}
Kategorie: ${categoryOf(c).label} · Land: ${c.country || 'unbekannt'} · Ampel: ${c.ampel?.level ?? 'unbekannt'}${c.ampel?.reasons.length ? ` (${c.ampel.reasons.join('; ')})` : ''}
Fähigkeiten: ${yes}

## Bezug
Repo: https://github.com/${s.repo}${c.path ? `\nPfad: ${c.path}` : ''}
${s.clone}
cd ${s.dir} && npm install${d?.version ? `\nVersion: ${d.version}${d.commit ? ` (Commit ${d.commit.sha.slice(0, 7)})` : ''}` : ''}

## Aufruf
CLI: node bin/cli.js <befehl> --format json
MCP: Manifest (opencli-plugin.json bzw. paperclip/manifest.json) im MCP-/Paperclip-Host registrieren; jeder Befehl ist ein Tool.
${c.endpoint ? `HTTP (Quelle): ${c.endpoint}` : 'HTTP: kein öffentlicher Endpunkt dokumentiert'}

## Befehle
${cmds.join('\n') || '- siehe node bin/cli.js --help'}
${http.length ? `\n## HTTP-Routen der Quelle\n${http.join('\n')}\n` : ''}
## Ausgabe
JSON-Hülle nach Schema servas.record.v1: { schema: "servas.record.v1", source, fetched_at, rows: [{ id, type, … }] }. Felder der Zeilen siehe Beispielantworten im Katalog.

## Lizenz
Daten: ${(d?.license) ?? 'unbekannt – vor Nutzung prüfen'} · Adapter-Code: ${d?.codeLicense ?? 'nicht festgelegt'}

## Grenzen
- robots.txt: ${c.robots === 'allowed' ? 'erlaubt' : c.robots === 'disallowed' ? 'Disallow – nicht abrufen, nur dokumentiert' : 'unbekannt – vor Abruf prüfen'}${c.robotsNote ? ` (${c.robotsNote})` : ''}
- Login: ${c.loginRequired ? 'nötig' : c.loginRequired === false ? 'nicht nötig' : 'unbekannt'} · Captcha: ${c.captcha ? 'ja – nicht umgehen' : c.captcha === false ? 'nein' : 'unbekannt'}
- Rate-Limit: höchstens 1 Anfrage/Sekunde, bei 403/429 abbrechen und nicht wiederholen.
- Nur lesend. Keine Captchas, Logins oder Sperren umgehen.

Katalog: ${SITE}#/c/${c.id}`;
}
