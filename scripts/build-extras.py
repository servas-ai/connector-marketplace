#!/usr/bin/env python3
"""Erzeugt src/data/extras.json, public/manifests/<id>.json und public/screens/<id>.webp.

Quellen (alle lokal, keine Netzabfragen):
  --audit   Echtheits-Audit (out/*.json = Live-Läufe je Route, webp/*.webp = echte Screenshots, robots-geprüft)
  --index   opencli-connectors index.json (Routen, Lizenz, Homepage)
  --llms    kpi/llms_txt_check.json (llms.txt / llms-full.txt / OpenAPI / MCP je Host)
  --mono    Checkout opencli-connectors (Version + Commit für Mono-Repo-Connectoren, git origin/main)
Nur echte Werte: Fehlt eine Quelle, bleibt das Feld weg (UI zeigt dann "–" bzw. blendet aus).
"""
import argparse, json, os, shutil, subprocess, glob
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument('--audit', default='/workspace/squad/audit')
ap.add_argument('--index', default='/workspace/squad/opencli-connectors/index.json')
ap.add_argument('--llms', default='/workspace/wt-llms/kpi/llms_txt_check.json')
ap.add_argument('--mono', default='/workspace/squad/opencli-connectors')
a = ap.parse_args()

data = json.load(open(os.path.join(ROOT, 'src/data/connectors.json')))
ids = {c['id']: c for c in data['connectors']}
idx = {x['slug']: x for x in json.load(open(a.index))['connectors']} if os.path.exists(a.index) else {}
llms = json.load(open(a.llms)) if os.path.exists(a.llms) else {}

def git(d, *args):
    try: return subprocess.check_output(['git', '-C', d, *args], stderr=subprocess.DEVNULL, text=True).strip()
    except Exception: return None

def host(u):
    try: return urlparse(u).hostname
    except Exception: return None

out = {}
os.makedirs(os.path.join(ROOT, 'public/manifests'), exist_ok=True)
os.makedirs(os.path.join(ROOT, 'public/screens'), exist_ok=True)
shots = 0
for cid, c in ids.items():
    e = {}
    au = os.path.join(a.audit, 'out', cid + '.json')
    if os.path.exists(au):
        j = json.load(open(au))
        e['audit'] = {
            'at': j.get('audited_at'), 'verdict': j.get('verdict'), 'liveOk': j.get('live_ok'), 'flags': j.get('flags', []),
            'sourceUrl': j.get('source_url'), 'sourceStatus': j.get('source_http_status'), 'sourceMs': j.get('source_ms'),
            'protocolLastRun': (j.get('evidence') or {}).get('protokoll_last_run'),
            'mockFree': not (j.get('evidence') or {}).get('code_reads_fixtures'), 'network': (j.get('evidence') or {}).get('code_has_network'),
            'runs': [{'case': r.get('case'), 'args': r.get('args'), 'ok': bool(r.get('ok')), 'exit': r.get('exit'), 'ms': r.get('ms'),
                      'records': r.get('records'), 'latestDate': r.get('latest_date'), 'schemaOk': not r.get('schema_errors'),
                      'schemaErrors': len(r.get('schema_errors') or [])} for r in j.get('runs', [])],
        }
        d = j.get('dir') or ''
        repo_dir = d if d.startswith('/') else None
        rel = None if repo_dir else d
    else:
        repo_dir, rel = None, c.get('path')
    # Version + Commit
    if rel and os.path.isdir(a.mono):
        pk = git(a.mono, 'show', f'origin/main:{rel}/package.json')
        if pk:
            try: e['version'] = json.loads(pk).get('version'); e['codeLicense'] = json.loads(pk).get('license')
            except Exception: pass
        lg = git(a.mono, 'log', '-1', '--format=%H|%cI|%s', 'origin/main', '--', rel)
        if lg:
            h, t, s = lg.split('|', 2); e['commit'] = {'sha': h, 'at': t, 'msg': s[:120], 'repo': 'servas-ai/opencli-connectors'}
        hist = git(a.mono, 'log', '-8', '--format=%h|%cI|%s', 'origin/main', '--', rel)
        if hist: e['changelog'] = [dict(zip(('sha', 'at', 'msg'), l.split('|', 2))) for l in hist.splitlines()]
        man = git(a.mono, 'show', f'origin/main:{rel}/opencli-plugin.json') or git(a.mono, 'show', f'origin/main:{rel}/paperclip/manifest.json')
    else:
        rd = repo_dir if repo_dir and os.path.isdir(repo_dir) else f'/workspace/opencli-{cid}'
        man = None
        if os.path.isdir(rd):
            try: pj = json.load(open(os.path.join(rd, 'package.json'))); e['version'] = pj.get('version'); e['codeLicense'] = pj.get('license')
            except Exception: pass
            lg = git(rd, 'log', '-1', '--format=%H|%cI|%s')
            if lg:
                h, t, s = lg.split('|', 2); e['commit'] = {'sha': h, 'at': t, 'msg': s[:120], 'repo': (c.get('repo') or '').replace('https://github.com/', '')}
            hist = git(rd, 'log', '-8', '--format=%h|%cI|%s')
            if hist: e['changelog'] = [dict(zip(('sha', 'at', 'msg'), l.split('|', 2))) for l in hist.splitlines()]
            for m in ('opencli-plugin.json', 'paperclip/manifest.json'):
                p = os.path.join(rd, m)
                if os.path.exists(p): man = open(p).read(); break
    if man:
        try:
            json.dump(json.loads(man), open(os.path.join(ROOT, 'public/manifests', cid + '.json'), 'w'), ensure_ascii=False, indent=2); e['manifest'] = True
        except Exception: pass
    # Beispielantworten aus samples/ (echte, im Test erzeugte Antworten), gekürzt
    def sample_files():
        if rel and os.path.isdir(a.mono):
            names = (git(a.mono, 'ls-tree', '--name-only', f'origin/main:{rel}/samples') or '').splitlines()
            return [(n, git(a.mono, 'show', f'origin/main:{rel}/samples/{n}')) for n in names if n.endswith('.json')][:8]
        rd2 = repo_dir if repo_dir and os.path.isdir(repo_dir) else f'/workspace/opencli-{cid}'
        sd = os.path.join(rd2, 'samples')
        return [(n, open(os.path.join(sd, n)).read()) for n in sorted(os.listdir(sd)) if n.endswith('.json')][:8] if os.path.isdir(sd) else []
    smp = []
    for n, txt in sample_files():
        if not txt: continue
        try: j = json.loads(txt)
        except Exception: continue
        outp = j.get('output', j) if isinstance(j, dict) else j
        rows = outp.get('rows') if isinstance(outp, dict) else outp if isinstance(outp, list) else None
        first = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else (outp if isinstance(outp, dict) else {})
        if isinstance(rows, list): outp = {**outp, 'rows': rows[:2]} if isinstance(outp, dict) else rows[:2]
        body = json.dumps(outp, ensure_ascii=False, indent=2)
        smp.append({'name': n[:-5], 'input': j.get('input') if isinstance(j, dict) else None, 'fields': list(first.keys())[:40],
                    'rows': len(rows) if isinstance(rows, list) else None, 'body': body[:2500] + ('\n…' if len(body) > 2500 else '')})
    if smp: e['samples'] = smp
    # Index-Felder
    x = idx.get(cid) or {}
    if x: e['index'] = x
    if x.get('routes'): e['routes'] = x['routes'][:60]
    for k in ('license', 'homepage'):
        if x.get(k): e[k] = x[k]
    # llms.txt je Host (Domain + Routen-Hosts)
    hosts = [c.get('domain')] + [host(u) for u in (c.get('urls') or []) + [r.get('url') for r in e.get('routes', [])]]
    for h in dict.fromkeys(filter(None, hosts)):
        for hh in (h, 'www.' + h, h.removeprefix('www.')):
            l = llms.get(hh)
            if l:
                e['llms'] = {'host': hh, 'checkedAt': l.get('checked_at'), 'robots': l.get('robots'), 'llmsTxt': l.get('llms_txt'), 'llmsFull': l.get('llms_full'),
                             'openapi': l.get('openapi'), 'openapiPaths': l.get('openapi_paths'), 'mcp': l.get('mcp_endpoint')}
                break
        if 'llms' in e and (e['llms']['llmsTxt'] or e['llms']['openapi']): break
    # echter Screenshot aus Audit (robots ok, kein Captcha), sonst vorhandener aus public/screens
    w = os.path.join(a.audit, 'webp', cid + '.webp')
    if os.path.exists(w):
        shutil.copyfile(w, os.path.join(ROOT, 'public/screens', cid + '.webp')); e['screenshot'] = f'screens/{cid}.webp'; e['screenshotAt'] = (e.get('audit') or {}).get('at')
    elif c.get('screenshot'):
        e['screenshot'] = c['screenshot']
    if e.get('screenshot'): shots += 1
    out[cid] = e
os.makedirs(os.path.join(ROOT, 'public/x'), exist_ok=True)
summary = {}
for cid, e in out.items():
    json.dump(e, open(os.path.join(ROOT, 'public/x', cid + '.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    au = e.get('audit') or {}; l = e.get('llms') or {}
    summary[cid] = {k: v for k, v in {'shot': e.get('screenshot'), 'v': e.get('version'), 'verdict': au.get('verdict'), 'liveOk': au.get('liveOk'),
                    'auditAt': au.get('at'), 'llms': bool(l.get('llmsTxt')), 'openapi': bool(l.get('openapi')), 'lic': e.get('license'), 'codeLic': e.get('codeLicense'), 'cmds': [r['case'] for r in (e.get('audit') or {}).get('runs', [])][:20] or None, 'rc': len(e.get('routes') or []) or len((e.get('audit') or {}).get('runs') or []) or None}.items() if v}
growth = []
if os.path.isdir(a.mono):
    seen = {}
    for l in (git(a.mono, 'log', '--format=%H|%cI', 'origin/main', '--', 'index.json') or '').splitlines():
        h, t = l.split('|'); seen.setdefault(t[:13], h)  # letzter Stand je Stunde
    for hour, h in sorted(seen.items())[-80:]:
        try: cc = json.loads(git(a.mono, 'show', f'{h}:index.json'))['connectors']
        except Exception: continue
        if isinstance(cc, dict): cc = list(cc.values())
        growth.append({'t': hour + ':00', 'total': len(cc), 'passing': sum(1 for x in cc if x.get('status') == 'passing'),
                       'green': sum(1 for x in cc if (x.get('ampel') if isinstance(x.get('ampel'), str) else (x.get('ampel') or {}).get('level')) in ('green', 'gruen', 'grün')) or None})
json.dump({'growth': growth, 'builtFrom': {'audit': bool(glob.glob(os.path.join(a.audit, 'out/*.json'))), 'index': bool(idx), 'llms': bool(llms)}, 'connectors': summary},
          open(os.path.join(ROOT, 'src/data/extras.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
if False: json.dump({'builtFrom': {'audit': bool(glob.glob(os.path.join(a.audit, 'out/*.json'))), 'index': bool(idx), 'llms': bool(llms)}, 'connectors': out},
          open(os.path.join(ROOT, 'src/data/extras.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print(f'{len(out)} Connectoren, {shots} mit echtem Screenshot, {sum(1 for e in out.values() if "audit" in e)} mit Audit, {sum(1 for e in out.values() if e.get("version"))} mit Version, {sum(1 for e in out.values() if e.get("manifest"))} Manifeste, {sum(1 for e in out.values() if (e.get("llms") or {}).get("llmsTxt"))} llms.txt')
