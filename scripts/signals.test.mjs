import { describe, expect, it } from 'vitest';
import { ampelOf, badgeSvg, captchaTypeOf, classify, summarize, timelineOf } from './signals.mjs';
import { edgeOf, inCidr } from './netintel.mjs';

const base = { status: 'passing', gates: { state: 'pass', errors: 0 }, robots: 'allowed', captcha: false, kpi: { stability: 100, captchaRate: 0, dataQuality: 5 }, loginRequired: false, lastRun: '2026-10-13T00:00:00Z' };
describe('captcha + klassifizierung', () => {
  it('erkennt Captcha-Typen', () => {
    expect(captchaTypeOf('<script src="https://www.google.com/recaptcha/api.js">')).toBe('reCAPTCHA');
    expect(captchaTypeOf('<div class="h-captcha">')).toBe('hCaptcha');
    expect(captchaTypeOf('challenges.cloudflare.com/turnstile/v0/api.js')).toBe('Turnstile');
    expect(captchaTypeOf('<title>Just a moment...</title>')).toBe('Cloudflare-Challenge');
    expect(captchaTypeOf('normale Seite')).toBeNull();
  });
  it('klassifiziert HTTP/Fehler', () => {
    expect(classify({ http: 200 }).kind).toBe('ok'); expect(classify({ http: 403 }).kind).toBe('403'); expect(classify({ http: 429 }).kind).toBe('429');
    expect(classify({ error: 'spawnSync python3 ETIMEDOUT' }).kind).toBe('timeout'); expect(classify({ error: '[SSL: UNEXPECTED_EOF_WHILE_READING]' }).kind).toBe('offline');
    expect(classify({ error: '{"status": "blocked", "http": 200}' }).kind).toBe('robots');
    expect(classify({ error: 'Kein Login, kein Captcha-Umgehen' }).kind).not.toBe('captcha');
    expect(classify({ http: 200, text: 'g-recaptcha' })).toEqual({ kind: 'captcha', captcha: 'reCAPTCHA' });
  });
  it('summarize + uptime + timeline', () => {
    const ev = [{ kind: 'ok', at: '2026-10-12T01:00:00Z' }, { kind: 'offline', at: '2026-10-13T01:00:00Z' }, { kind: 'captcha', captcha: 'hCaptcha', at: '2026-10-13T02:00:00Z' }];
    const s = summarize(ev); expect(s.counts.offline).toBe(1); expect(s.uptime).toBe(67); expect(s.captchaTypes).toEqual({ hCaptcha: 1 });
    expect(timelineOf(ev).map((d) => [d.day, d.ok, d.offline, d.captcha])).toEqual([['2026-10-12', 1, 0, 0], ['2026-10-13', 0, 1, 1]]);
  });
});
describe('ampel', () => {
  const sig = { counts: {}, uptime: 100, now: '2026-10-13T03:00:00Z' };
  it('grün wenn alles ok', () => expect(ampelOf(base, sig)).toEqual({ level: 'green', reasons: [] }));
  it('gelb bei 429, Drift, extern', () => {
    expect(ampelOf(base, { ...sig, counts: { 429: 2 } }).level).toBe('yellow');
    expect(ampelOf({ ...base, lastRun: '2026-09-01T00:00:00Z' }, sig).reasons).toContain('Drift: letzter Lauf > 7 Tage');
    expect(ampelOf({ ...base, gates: { state: 'extern' } }, sig).level).toBe('yellow');
  });
  it('rot bei e2e rot, Captcha, robots, viele Gate-Fehler', () => {
    expect(ampelOf({ ...base, status: 'failing' }, sig).level).toBe('red'); expect(ampelOf({ ...base, captcha: true }, sig).level).toBe('red');
    expect(ampelOf({ ...base, robots: 'disallowed' }, sig).level).toBe('red'); expect(ampelOf({ ...base, gates: { state: 'fail', errors: 25 } }, sig).level).toBe('red');
    expect(ampelOf({ ...base, gates: { state: 'fail', errors: 3 } }, sig).level).toBe('yellow');
  });
  it('SVG-Badge ist valide und escaped', () => {
    const s = badgeSvg('a<b', { level: 'red', reasons: ['403 ×3'] });
    expect(s).toMatch(/^<svg /); expect(s).toContain('a&lt;b'); expect(s).toContain('#ef4444'); expect(s).toContain('rot · 403 ×3');
  });
});
describe('netintel', () => {
  it('CIDR', () => { expect(inCidr('104.16.1.1', '104.16.0.0/13')).toBe(true); expect(inCidr('8.8.8.8', '104.16.0.0/13')).toBe(false); expect(inCidr('x', '1.0.0.0/8')).toBe(false); });
  it('CDN/WAF/Proxy', () => {
    const r = { cloudflare: ['104.16.0.0/13'], fastly: ['151.101.0.0/16'], cloudfront: ['13.32.0.0/15'] };
    expect(edgeOf({ ip: '104.16.5.5' }, r)).toMatchObject({ cdn: 'Cloudflare', waf: true, proxy: true });
    expect(edgeOf({ ip: '1.2.3.4', asn: 'AS20940' }, r).cdn).toBe('Akamai');
    expect(edgeOf({ ip: '1.2.3.4', via: '1.1 abc.cloudfront.net (CloudFront)' }, r).cdn).toBe('CloudFront');
    expect(edgeOf({ ip: '1.2.3.4', asn: 'AS1' }, r)).toMatchObject({ cdn: null, waf: false, proxy: false });
  });
});
