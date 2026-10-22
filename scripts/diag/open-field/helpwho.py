"""One operator for NFL tracking and sim common plays. At a run's first contact (runbreak admission), the nearest OTHER defender: his group, distance to the
carrier, whether an offensive player is within 1.0 yd of him (tied up), and whether he arrives (within 1.5 yd
in 0.5 s). Shares by group; where contact happens (depth past the line)."""
import gzip, json, sys, math
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
for path in sys.argv[1:]:
    R = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
        t = (raw.get('events') or {}).get('first_contact')
        p = Play(raw); c = raw['carrier']
        if t is None or not p.live(t) or not p.live(t + .5): continue
        k = p.k(t)
        if p.pos(c, k)[0] is None: continue
        ds = [d for d in p.who('D') if p.pos(d, k)[0] is not None]
        first = min(ds, key=lambda d: p.dist(d, c, k))
        others = sorted([d for d in ds if d != first], key=lambda d: p.dist(d, c, k))
        off = [o for o in p.who('O') if o != c]
        for rank, d in enumerate(others[:3]):
            arrives = any(p.pos(d, kk)[0] is not None and p.dist(d, c, kk) <= 1.5 for kk in range(k, p.k(t + .5) + 1))
            tied = any(p.dist(o, d, k) <= 1.0 for o in off)
            R.append(dict(rank=rank, grp=p.players[d]['group'], dist=p.dist(d, c, k), arrives=arrives, tied=tied, depth=p.pos(c, k)[0], first=p.players[first]['group']))
    print(path.split('/')[-1])
    S0 = [r for r in R if r['rank'] == 0]
    print(f'  contacts {len(S0)} | contact depth p50 {q([r["depth"] for r in S0])} | first tackler DL/LB/DB ' + ' '.join(f'{100 * sum(r["first"] == g for r in S0) / len(S0):.0f}' for g in ('DL', 'LB', 'DB')))
    for rank in range(3):
        S = [r for r in R if r['rank'] == rank]
        print(f'  next-nearest #{rank + 1}: dist p50 {q([r["dist"] for r in S])} | tied up {100 * sum(r["tied"] for r in S) / len(S):.0f}% | arrives within 0.5 s {100 * sum(r["arrives"] for r in S) / len(S):.0f}% | group DL/LB/DB ' +
              ' '.join(f'{100 * sum(r["grp"] == g for r in S) / len(S):.0f}' for g in ('DL', 'LB', 'DB')) + ' | arrives by group ' +
              ' '.join(f'{g} {100 * sum(r["arrives"] for r in S if r["grp"] == g) / max(1, sum(r["grp"] == g for r in S)):.0f}%' for g in ('DL', 'LB', 'DB')))
