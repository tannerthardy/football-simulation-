"""usage: cushion.py FILE [FILE ...] (common plays: NFL tracking or sim export).
Cushion at the throw: for each of the two deepest DBs, his depth minus the
depth of the deepest receiver within 8 yd laterally of him (yd), and the
deepest receiver's downfield speed. One operator, NFL and sim."""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f=.5: round(sorted(v)[int(f*(len(v)-1))], 2) if v else None
for path in sys.argv[1:]:
    cush, rv, none = [], [], 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'pass': continue
        t = raw['events'].get('pass_forward')
        if t is None or t < 1.5: continue
        p = Play(raw); k = int(round(t / p.dt))
        if k + 1 >= len(raw['xy']): continue
        recs = [i for i in p.who('O', 'WR') + p.who('O', 'TE') + p.who('O', 'RB') if p.pos(i, k)[0] is not None]
        dbs = [i for i in p.who('D', 'DB') if p.pos(i, k)[0] is not None]
        for d in sorted(dbs, key=lambda i: -p.pos(i, k)[0])[:2]:
            dx, dy = p.pos(d, k)
            near = [r for r in recs if abs(p.pos(r, k)[1] - dy) < 8]
            if not near: none += 1; continue
            r = max(near, key=lambda r: p.pos(r, k)[0])
            cush.append(dx - p.pos(r, k)[0])
            a, b = p.pos(r, k - 1), p.pos(r, k + 1)
            if a[0] is not None and b[0] is not None: rv.append((b[0] - a[0]) / (2 * p.dt))
    print(path.split('/')[-1], f"cushion over the deepest nearby receiver at the throw p25/50/75 {q(cush,.25)}/{q(cush)}/{q(cush,.75)} yd | that receiver's downfield speed p50 {q(rv)} | no receiver within 8 yd {none}")
