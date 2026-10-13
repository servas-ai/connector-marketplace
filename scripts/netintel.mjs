#!/usr/bin/env node
// Passive Server-/CDN-/Proxy-Analyse. KEIN Request an Ziel-Hosts.
// Netz: je 1 Request an veröffentlichte IP-Range-Listen (Cloudflare, Fastly, AWS/CloudFront) + 1 an api.ipify.org (eigene Egress-IP),
// Reverse-DNS über den System-Resolver. Ergebnis: data/netintel.json (Re-Run mit --offline = 0 Requests).
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns/promises';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'data/netintel.json');
const OFFLINE = process.argv.includes('--offline');

export const ipToInt = (ip) => ip.split('.').reduce((a, o) => a * 256 + Number(o), 0);
export function inCidr(ip, cidr) {
  const [base, bits] = cidr.split('/'); const n = Number(bits);
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip) || !/^\d+\.\d+\.\d+\.\d+$/.test(base)) return false;
  const size = 2 ** (32 - n); const b = Math.floor(ipToInt(base) / size) * size; const v = ipToInt(ip);
  return v >= b && v < b + size;
}
const AKAMAI_ASN = ['AS16625', 'AS20940', 'AS21342', 'AS16702', 'AS18680'];
const CF_ASN = ['AS13335', 'AS209242'];
const FASTLY_ASN = ['AS54113'];
// reine Klassifizierung (getestet): CDN/WAF aus IP-Ranges, ASN, Headern; Proxy = Antwort kam nicht vom Origin.
export function edgeOf({ ip, asn, via, server, cdnHeader }, ranges) {
  const ev = [];
  const hit = (name, list) => list?.some((c) => inCidr(ip ?? '', c)) && ev.push(`${name}: IP-Range`);
  hit('Cloudflare', ranges?.cloudflare); hit('Fastly', ranges?.fastly); hit('CloudFront', ranges?.cloudfront);
  if (CF_ASN.includes(asn)) ev.push('Cloudflare: ASN'); if (AKAMAI_ASN.includes(asn)) ev.push('Akamai: ASN'); if (FASTLY_ASN.includes(asn)) ev.push('Fastly: ASN');
  const h = `${via ?? ''} ${server ?? ''} ${cdnHeader ?? ''}`.toLowerCase();
  if (/cloudflare/.test(h)) ev.push('Cloudflare: Header'); if (/akamai/.test(h)) ev.push('Akamai: Header');
  if (/cloudfront/.test(h)) ev.push('CloudFront: Header'); if (/fastly|varnish/.test(h)) ev.push('Fastly/Varnish: Header');
  if (/\bgoogle\b|gfe/.test(h)) ev.push('Google Frontend: Header');
  const names = [...new Set(ev.map((e) => e.split(':')[0]))];
  const waf = names.some((n) => ['Cloudflare', 'Akamai', 'CloudFront', 'Fastly'].includes(n));
  const proxy = names.length > 0 || /\b1\.[01] /.test(via ?? '');
  return { cdn: names[0] ?? null, cdnAll: names, evidence: ev, waf, proxy };
}

async function get(url, json = true) { const r = await fetch(url, { headers: { 'user-agent': 'servas-connector-marketplace/0.2 (+https://github.com/servas-ai)' } }); if (!r.ok) throw new Error(`${url} ${r.status}`); return json ? r.json() : r.text(); }

// PTR über DNS-over-HTTPS (dns.google), System-Resolver als Fallback
async function ptr(ip) {
  try { const j = await get(`https://dns.google/resolve?name=${ip.split('.').reverse().join('.')}.in-addr.arpa&type=PTR`); const a = j.Answer?.find((x) => x.type === 12); if (a) return a.data.replace(/\.$/, ''); } catch { /* weiter */ }
  try { return (await dns.reverse(ip))[0] ?? null; } catch { return null; }
}

async function main() {
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  const cache = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/enrich-cache.json'), 'utf8'));
  let ranges = prev.ranges, egress = prev.egress; const rdns = {};
  if (!OFFLINE) {
    const cf = (await get('https://www.cloudflare.com/ips-v4', false)).split('\n').map((s) => s.trim()).filter(Boolean);
    await new Promise((r) => setTimeout(r, 1100));
    const fastly = (await get('https://api.fastly.com/public-ip-list')).addresses;
    await new Promise((r) => setTimeout(r, 1100));
    const aws = await get('https://ip-ranges.amazonaws.com/ip-ranges.json');
    const cloudfront = aws.prefixes.filter((p) => p.service === 'CLOUDFRONT').map((p) => p.ip_prefix);
    ranges = { cloudflare: cf, fastly, cloudfront, fetchedAt: new Date().toISOString() };
    const e = await get('https://api.ipify.org?format=json');
    egress = { ip: e.ip, at: new Date().toISOString() };
    for (const [d, p] of Object.entries(cache)) {
      if (!p?.ip || p.ip in rdns && rdns[p.ip] !== null) continue;
      rdns[p.ip] = await ptr(p.ip); await new Promise((r) => setTimeout(r, 1100));
      process.stderr.write(`\rrDNS ${d}          `);
    }
  }
  if (egress?.ip && !OFFLINE) {
    egress.rdns = await ptr(egress.ip);
  }
  const hosts = {};
  for (const [d, p] of Object.entries(cache)) {
    if (!p) continue;
    const wt = p.webtech ?? {};
    hosts[d] = { ip: p.ip ?? null, rdns: p.ip ? rdns[p.ip] ?? null : null, network: p.geo?.network ?? null,
      ...edgeOf({ ip: p.ip, asn: p.geo?.asn, via: wt.cdn, server: wt.server, cdnHeader: wt.cdn }, ranges) };
  }
  fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), egress, ranges, rdns, hosts }, null, 1) + '\n');
  console.log(`netintel: ${Object.keys(hosts).length} Hosts, CDN/WAF: ${Object.values(hosts).filter((h) => h.cdn).length}, rDNS: ${Object.values(hosts).filter((h) => h.rdns).length}, Egress ${egress?.ip ?? '?'}`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
