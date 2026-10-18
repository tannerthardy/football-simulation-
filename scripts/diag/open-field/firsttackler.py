"""Who is nearest the runner at first contact (proxy for the first tackler),
by group and depth at the snap, and yards before contact; one operator for
NFL and sim common plays. usage: firsttackler.py FILE.jsonl.gz [--sim-trace]"""
import gzip, json, math, sys
from collections import Counter
trace = '--sim-trace' in sys.argv
cnt = Counter(); ybc = {}
n = 0
for line in gzip.open(sys.argv[1], 'rt'):
    r = json.loads(line)
    if trace: r = r.get('common')
    if not r or r.get('kind') != 'run' or r.get('carrier') is None: continue
    fc = (r.get('events') or {}).get('first_contact')
    if fc is None: continue
    xy, c, dt, P = r['xy'], r['carrier'], r.get('dt', .1), r['players']
    k = min(len(xy) - 1, int(round(fc / dt)))
    cx, cy = xy[k][2*c], xy[k][2*c+1]
    if cx is None: continue
    best, bi = math.inf, None
    for i, p in enumerate(P):
        if p['side'] != 'D' or xy[k][2*i] is None: continue
        d = math.hypot(xy[k][2*i] - cx, xy[k][2*i+1] - cy)
        if d < best: best, bi = d, i
    if bi is None: continue
    x0 = xy[0][2*bi] or 0
    g = P[bi]['group']
    role = g if g != 'DB' else ('DB deep(10+)' if x0 >= 10 else 'DB mid(5-10)' if x0 >= 5 else 'DB shallow(<5)')
    cnt[role] += 1; ybc.setdefault(role, []).append(cx); n += 1
med = lambda xs: round(sorted(xs)[len(xs)//2], 1)
print(sys.argv[1], 'runs with contact', n)
for role, v in sorted(cnt.items(), key=lambda kv: -kv[1]):
    print(f"   {role:16s} {100*v/n:5.1f}%   ybc median {med(ybc[role])}")
