"""Runs: DBs that are ahead of the carrier when he crosses the line (along >= -0.5) but behind him when he
crosses 5 yd. How: blocked (an offensive player within 1.0 yd of him at the 5-yd frame, or for 3+ frames
between), met (came within 1.0 yd of the carrier in between: a failed tackle), or ran past/out-angled.
Their position at the LOS crossing (along, lateral) and speed.

usage: python3 -I scripts/diag/g1/passed.py NFL.jsonl.gz SIM.jsonl.gz  (common play format; run from the repository root)"""
import gzip, json, math, sys
from collections import Counter
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 1) if v else None
for path in sys.argv[1:]:
    how = Counter(); n = 0; geo = {}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'run': continue
        c = raw.get('carrier'); ev = raw.get('events') or {}
        if c is None or ev.get('handoff') is None or raw['players'][c]['group'] != 'RB': continue
        p = Play(raw); k1 = min(p.frames - 1, p.k(p.end))
        k0 = next((k for k in range(p.k(ev['handoff']), k1) if (p.pos(c, k)[0] or -9) >= 0), None)
        k5 = next((k for k in range(p.k(ev['handoff']), k1) if (p.pos(c, k)[0] or -9) >= 5), None)
        if k0 is None or k5 is None: continue
        n += 1
        off = [o for o in p.who('O') if o != c]
        for d in p.who('D'):
            if p.players[d]['group'] != 'DB': continue
            (ax, ay), (cx, cy) = p.pos(d, k0), p.pos(c, k0)
            if ax is None or ax - cx < -0.5: continue
            bx = p.pos(d, k5)[0]
            if bx is None or bx - p.pos(c, k5)[0] >= -0.5: continue
            blocked = sum(1 for k in range(k0, k5 + 1) if any(p.dist(o, d, k) <= 1.0 for o in off)) >= 3
            met = any(p.dist(c, d, k) <= 1.0 for k in range(k0, k5 + 1))
            h = 'met' if met else 'blocked' if blocked else 'passed'
            how[h] += 1
            g = geo.setdefault(h, {'along': [], 'lat': [], 'sp': [], 'mind': []})
            g['along'].append(ax - cx); g['lat'].append(abs(ay - cy)); g['sp'].append(p.speed(d, k0))
            g['mind'].append(min(p.dist(c, d, k) for k in range(k0, k5 + 1)))
    print(f'{path.split("/")[-1][:24]}: runs reaching 5 {n}; DBs ahead at the line, behind at 5, per run: ' + '  '.join(f'{h} {v / n:.2f}' for h, v in how.most_common()))
    for h, g in geo.items():
        print(f'   {h:8s} at the line: along {q(g["along"])} lateral {q(g["lat"])} his speed {q(g["sp"])} | closest to the carrier {q(g["mind"])}')
