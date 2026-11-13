"""Interior run reps through time: blocker and defender depth (yd past LOS)
and the defender's speed, for pairs engaged at 1.0 s. Input: film JSON (all runs)."""
import json, sys
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1)
    rows = [r for r in json.load(open(path)) if 'film' in r]
    T = (1.0, 1.5, 2.0, 2.5, 3.0)
    dd = {t: [] for t in T}; bb = {t: [] for t in T}; eng = {t: 0 for t in T}; tot = 0
    for r in rows:
        film = {round(f[0], 1): f for f in r['film']}
        f1 = film.get(1.0)
        if not f1: continue
        for e in f1[3]:
            b, d = e[0], e[1]
            if r['slots'][b] not in ('LT', 'LG', 'C', 'RG', 'RT'): continue
            tot += 1
            for t in T:
                f = film.get(t)
                if not f: continue
                dd[t].append(f[2][d][0]); bb[t].append(f[2][b][0])
                eng[t] += any(x[0] == b and x[1] == d for x in f[3])
    print(f"{label}: OL-defender pairs engaged at 1.0 s: {tot}")
    for t in T: print(f"   t={t}: still engaged {eng[t]/max(1,tot):.2f} | defender depth p25/p50/p75 {q(dd[t],.25):+.2f}/{q(dd[t],.5):+.2f}/{q(dd[t],.75):+.2f} | blocker depth p50 {q(bb[t],.5):+.2f}")
