"""The early-throw split (Rules, 2026-11-24): quick routes on the field, how many are thrown under 2.0 s, release times of
quick-route targets, and the QB's retreat by the release, NFL against ours on non-PA dropbacks.
  python3 -I early_split.py nfl-routes.jsonl.gz sim.jsonl.gz"""
import sys, collections, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from route_combos import plays, combos
QUICK = lambda r: r['lab'] in ('SLANT','FLAT','ANGLE') or (r['lab'] in ('HITCH','OUT','IN') and r['d'] is not None and r['d'] < 7.5)
for path in sys.argv[1:]:
    nfl = 'nfl' in path; n=0; avail=0; scr=0; early_ns=0; early_q=0; early_avail=0; rel_q=[]; retreat=[]
    for p, ball, runners in plays(path, nfl):
        n += 1
        import numpy as _np
        X = _np.array(p['x'], float); qb = p['qb']; rel = p.get('rel')
        if rel is not None:
            retreat.append(float(X[qb,0] - X[qb,:rel+1].min()))
        isscr = any(r['lab']=='SCREEN' for r in runners) or bool(p.get('screen'))
        scr += isscr
        a = any(QUICK(r) for r in runners) and not isscr
        avail += a
        t = next((r for r in runners if r['tgt']), None)
        if rel is not None and rel/10 < 2.0 and not isscr and t is not None:
            early_ns += 1
            if a: early_avail += 1
            if QUICK(t): early_q += 1
        if t is not None and QUICK(t) and rel is not None and not isscr: rel_q.append(rel/10)
    rq = np.array(rel_q); rt=np.array(retreat)
    print(f"== {'NFL' if nfl else 'ours'}: non-PA dropbacks {n}")
    print(f"  screens on the play {100*scr/n:.1f}% | non-screen plays with a quick route on the field {100*avail/n:.1f}%")
    print(f"  non-screen throws < 2.0 s: {100*early_ns/n:.1f}% of dropbacks; of those to a quick route {100*early_q/max(1,early_ns):.0f}%")
    print(f"  given a quick route on the field (non-screen): share thrown < 2.0 s {100*early_avail/max(1,avail):.1f}%")
    print(f"  quick-route targets: n {len(rq)}, release p25/50/75 {np.percentile(rq,25):.2f}/{np.median(rq):.2f}/{np.percentile(rq,75):.2f}, share < 2.0 s {100*(rq<2.0).mean():.0f}%")
    print(f"  QB retreat from his snap spot by the release (yd) p10/25/50/75/90: {np.round(np.percentile(rt,[10,25,50,75,90]),1)}")
