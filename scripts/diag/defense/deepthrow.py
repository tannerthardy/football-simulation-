"""usage: deepthrow.py FILE [FILE ...] (common plays: NFL tracking or sim export).
Deep defenders at the throw: the two deepest defensive backs' downfield
speed (+ retreating) and depth at pass_forward, and at +0.3 s; and the
underneath zone defenders (DB/LB 4-12 yd deep). One operator, NFL and sim."""
import gzip, json, sys, re
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f=.5: round(sorted(v)[int(f*(len(v)-1))], 2) if v else None
for path in sys.argv[1:]:
    deep_v, deep_d, deep_v3, under_v = [], [], [], []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'pass': continue
        t = raw['events'].get('pass_forward')
        if t is None or t < 1.5: continue
        p = Play(raw); k = int(round(t / p.dt))
        if k + 3 >= len(raw['xy']): continue
        v = lambda i, kk: (p.pos(i, kk + 1)[0] - p.pos(i, kk - 1)[0]) / (2 * p.dt) if p.pos(i, kk + 1)[0] is not None and p.pos(i, kk - 1)[0] is not None else None
        dbs = [i for i in p.who('D', 'DB') if p.pos(i, k)[0] is not None]
        for i in sorted(dbs, key=lambda i: -p.pos(i, k)[0])[:2]:
            a, b = v(i, k), v(i, k + 3)
            if a is None or b is None: continue
            deep_v.append(a); deep_v3.append(b); deep_d.append(p.pos(i, k)[0])
        for i in p.who('D', 'LB') + p.who('D', 'DB'):
            x = p.pos(i, k)[0]
            if x is not None and 4 <= x <= 12 and v(i, k) is not None: under_v.append(v(i, k))
    print(path.split('/')[-1], f"deepest two DBs at the throw: depth {q(deep_d)} | retreating p25/50/75 {q(deep_v,.25)}/{q(deep_v)}/{q(deep_v,.75)} yd/s, +0.3 s {q(deep_v3)} | underneath (4-12 yd) retreating p50 {q(under_v)} (n {len(deep_v)})")
