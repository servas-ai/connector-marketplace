#!/usr/bin/env node
// Erzeugt public/llms.txt, public/llms-full.txt und public/agent-prompt.txt aus src/data/connectors.json (vor dem Build).
import fs from 'node:fs';
const SITE = 'https://servas-ai.github.io/connector-marketplace/';
const d = JSON.parse(fs.readFileSync('src/data/connectors.json', 'utf8'));
const list = [...d.connectors].sort((a, b) => a.id.localeCompare(b.id));
const green = list.filter((c) => c.ampel?.level === 'green').length;
const head = `# servas-ai Connector Marketplace

> Katalog von ${d.count} read-only Datenconnectoren (MCP, CLI, HTTP) für öffentliche Quellen, ${green} mit grüner Ampel. Ausgabe einheitlich im Schema servas.record.v1. Stand ${d.sourceGeneratedAt}.

- Quelle: https://github.com/${d.sourceRepo}
- Katalog: ${SITE}
- Agent-Prompt: ${SITE}agent-prompt.txt
- Detaildaten je Connector: ${SITE}x/<id>.json
`;
const line = (c) => `- [${c.id}](${SITE}#/c/${c.id}): ${(c.description || "").replace(/\s+/g, ' ').slice(0, 160)} (Ampel ${c.ampel?.level ?? '?'}, ${c.country})`;
fs.writeFileSync('public/llms.txt', `${head}\n## Connectoren mit grüner Ampel\n\n${list.filter((c) => c.ampel?.level === 'green').map(line).join('\n')}\n\n## Optional\n\n- [Vollständige Liste](${SITE}llms-full.txt)\n`);
fs.writeFileSync('public/llms-full.txt', `${head}\n## Alle Connectoren\n\n${list.map((c) => `${line(c)}\n  Befehle: ${c.commands.join(', ') || '–'} · robots: ${c.robots} · Login: ${c.loginRequired ?? '?'} · Repo: ${c.repo}${c.path ? ` (${c.path})` : ''}`).join('\n')}\n`);
fs.writeFileSync('public/agent-prompt.txt', `Du bist ein Daten-Agent mit Zugriff auf den servas-ai Connector-Katalog (${d.count} Connectoren, read-only).

So arbeitest du:
1. Passenden Connector finden: ${SITE}llms-full.txt (ID, Beschreibung, Befehle, robots-Status). Bevorzuge Ampel "green".
2. Details laden: ${SITE}x/<id>.json (Audit-Läufe je Befehl, Routen, Beispielantworten mit Feldern, Version, Lizenz).
3. Installieren: Mono-Repo-Connectoren: git clone https://github.com/servas-ai/opencli-connectors.git && cd opencli-connectors/<path> && npm install; eigenständige: git clone https://github.com/servas-ai/opencli-<id>.git.
4. Aufrufen: node bin/cli.js <befehl> --format json  (oder als MCP-Tool über opencli-plugin.json / paperclip/manifest.json).
5. Ausgabe: servas.record.v1 { schema, source, fetched_at, rows: [{ id, type, … }] }.

Grenzen: robots.txt "disallowed" bedeutet nicht abrufen. Captchas, Logins und Sperren nie umgehen. Höchstens 1 Anfrage/Sekunde je Quelle, bei 403/429 abbrechen. Lizenz der Quelle beachten (Feld license).
`);
console.log(`llms.txt: ${green} grüne, llms-full.txt: ${list.length}`);
