import type { Connector } from './types';
import { extra } from './extras';
import { categoryOf } from './taxonomy';

/** Compliance-Einschätzung aus belegbaren Feldern. Keine Rechtsberatung: was nicht belegt ist, heißt "prüfen". */
export type Level = 'ok' | 'warn' | 'bad' | 'check';
export interface Item { key: string; label: string; value: string; level: Level; basis: string }
export type Commercial = 'ja' | 'mit Namensnennung' | 'prüfen' | 'nein';
const EU = new Set('AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO'.split(' '));

export function codeLicense(c: Connector) { const l = extra(c).codeLic; return !l ? 'nicht festgelegt' : l === 'UNLICENSED' ? 'nicht freigegeben (UNLICENSED)' : l; }
export function dataLicense(c: Connector) { return extra(c).lic ?? null; }
export function commercial(c: Connector): { v: Commercial; basis: string } {
  const l = dataLicense(c);
  if (!l) return { v: 'prüfen', basis: 'Datenlizenz nicht hinterlegt' };
  if (/\bNC\b|non-?commercial|nicht kommerziell/i.test(l)) return { v: 'nein', basis: l };
  if (/^je Dataset|Bedingungen der Quelle|Terms/i.test(l)) return { v: 'prüfen', basis: `${l} (je Datensatz/Terms)` };
  if (/CC0|public.?domain|gemeinfrei|PDDL|Universal \(Public Domain/i.test(l)) return { v: 'ja', basis: l };
  if (/CC.?BY|DL-DE-BY|ODbL|OGL|Open Government Licen|Etalab|Licence Ouverte|Quellenangabe|nennen/i.test(l)) return { v: 'mit Namensnennung', basis: l };
  return { v: 'prüfen', basis: l };
}
export function personal(c: Connector): { v: string; level: Level; basis: string } {
  const cat = categoryOf(c).id;
  if (cat === 'register') return { v: 'Firmendaten (kann Personennamen enthalten)', level: 'check', basis: 'Kategorie Register & Firmen' };
  if (cat === 'recht' || cat === 'gesundheit') return { v: 'prüfen', level: 'check', basis: `Kategorie ${categoryOf(c).label}` };
  if (/person|people|members|lobby|edikt|insolvenz/i.test(`${c.id} ${c.description}`)) return { v: 'möglicherweise personenbezogen', level: 'warn', basis: 'Stichwort in Beschreibung' };
  return { v: 'keiner erkennbar (Sachdaten)', level: 'ok', basis: `Einstufung nach Kategorie ${categoryOf(c).label}, nicht einzeln geprüft` };
}
export function serverRegion(c: Connector): { v: string; level: Level } {
  const cc = c.server?.country; if (!cc) return { v: 'unbekannt', level: 'check' };
  return EU.has(cc) ? { v: `EU/EWR (${cc})`, level: 'ok' } : { v: `außerhalb EU (${cc})`, level: 'warn' };
}

export function items(c: Connector): Item[] {
  const com = commercial(c); const p = personal(c); const sr = serverRegion(c); const dl = dataLicense(c);
  const official = c.sourceType === 'Behörde' || c.sourceType === 'Register';
  const attrib = com.v === 'mit Namensnennung';
  return [
    { key: 'code', label: 'Adapter-Code-Lizenz', value: codeLicense(c), level: extra(c).codeLic === 'MIT' || /Apache/.test(extra(c).codeLic ?? '') ? 'ok' : 'check', basis: 'package.json des Connectors' },
    { key: 'data', label: 'Lizenz der Quelldaten', value: dl ?? 'unbekannt – prüfen', level: dl ? (com.v === 'prüfen' ? 'check' : 'ok') : 'check', basis: 'index.json (Feld license)' },
    { key: 'commercial', label: 'Kommerziell nutzbar', value: com.v, level: com.v === 'ja' ? 'ok' : com.v === 'mit Namensnennung' ? 'ok' : com.v === 'nein' ? 'bad' : 'check', basis: com.basis },
    { key: 'attribution', label: 'Namensnennungspflicht', value: attrib ? 'ja' : com.v === 'ja' ? 'nein' : 'prüfen', level: com.v === 'prüfen' ? 'check' : 'ok', basis: com.basis },
    { key: 'personal', label: 'Personenbezug (DSGVO)', value: p.v, level: p.level, basis: p.basis },
    { key: 'legal', label: 'Rechtsgrundlage', value: official ? 'öffentlich bereitgestellte Daten (Weiterverwendung nach Lizenz/IWG)' : 'prüfen', level: official && dl ? 'ok' : 'check', basis: official ? `Quellentyp ${c.sourceType}` : 'kein amtlicher Herausgeber belegt' },
    { key: 'source', label: 'Datenquelle', value: official ? 'amtlich' : c.sourceType ? `öffentlich (${c.sourceType})` : 'unbekannt', level: official ? 'ok' : 'check', basis: 'Quellentyp' },
    { key: 'region', label: 'Server-Land der Quelle', value: sr.v, level: sr.level, basis: c.server ? `${c.server.hoster ?? ''} ${c.server.asn ?? ''}`.trim() || 'IP-Geolokation' : 'nicht analysiert' },
    { key: 'robots', label: 'robots.txt eingehalten', value: c.robots === 'allowed' ? 'ja, erlaubt' : c.robots === 'disallowed' ? 'Disallow – nicht abrufen' : 'unbekannt', level: c.robots === 'allowed' ? 'ok' : c.robots === 'disallowed' ? 'bad' : 'check', basis: 'robots.txt-Prüfung' },
    { key: 'login', label: 'Kein Login, keine Umgehung', value: c.loginRequired ? 'Login nötig' : c.captcha ? 'Captcha – wird nicht umgangen' : c.loginRequired === false ? 'ja' : 'unbekannt', level: c.loginRequired || c.captcha ? 'bad' : c.loginRequired === false ? 'ok' : 'check', basis: 'Index + Beobachtungen' },
    { key: 'rate', label: 'Rate-Limit-konform', value: (c.signals?.counts?.['429'] ?? 0) > 0 ? `${c.signals!.counts['429']}× 429 beobachtet` : c.signals ? 'ja, keine 429 beobachtet' : 'keine Beobachtungen', level: (c.signals?.counts?.['429'] ?? 0) > 0 ? 'warn' : c.signals ? 'ok' : 'check', basis: 'Beobachtungen (signals)' },
  ];
}

export type Enterprise = 'grün' | 'gelb' | 'rot';
export function enterprise(c: Connector): { level: Enterprise; reasons: string[] } {
  const it = items(c); const bad = it.filter((x) => x.level === 'bad'); const open = it.filter((x) => x.level === 'check' || x.level === 'warn');
  if (bad.length) return { level: 'rot', reasons: bad.map((x) => `${x.label}: ${x.value}`) };
  if (open.length) return { level: 'gelb', reasons: open.map((x) => `${x.label}: ${x.value}`) };
  return { level: 'grün', reasons: ['alle Punkte belegt und unkritisch'] };
}
