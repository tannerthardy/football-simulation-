"""Shallow box backers (1.6-3.5 yd, within 6 yd of OL centre) on zone runs: by alignment (outside the tackles / stacked over a DL /
in a gap / over an OL with no DL), outcome by 1.5 s: blocked first (offensive non-carrier within 1.0 yd before he crosses the LOS),
rushed untouched, sat untouched. Works on NFL file or a sim dump (same operator)."""
import sys, json, gzip, math, collections
exec(open(__file__.replace("mugsplit3.py","lbwho.py")).read().split("\nfor path in sys.argv[1:]:")[0])
for path in sys.argv[1:]:
    R = collections.defaultdict(collections.Counter)
    for con, ol, ot, df, fc, sh in plays(path):
        if len(ol) < 16: continue
        off = [[*ol[f], *ot[f]] for f in range(len(ol))]
        ys = sorted(o[1] for o in ol[0]); cy = sum(ys) / 5
        fl = sum(o[1] for o in ol[min(10,len(ol)-1)]) / 5 - cy
        dl = [d for d in df[0] if abs(d[0]) <= 1.6]
        for j, (x0, y0) in enumerate(df[0]):
            if not (0.0 < x0 < 3.5 and abs(y0 - cy) <= 6): continue
            db = '0-1.6' if x0 <= 1.6 else '1.6-2.5' if x0 <= 2.5 else '2.5-3.5'
            wide = max(ys[0]-y0, y0-ys[-1])
            if y0 < ys[0] - .5 or y0 > ys[-1] + .5: al = 'outside tackles ' + ('<2.5w' if wide < 2.5 else '>=2.5w') + (' overTE' if any(abs(t[1]-y0) <= 1.0 and t[0] > -2.0 for t in ot[0]) else ' noTE') + (' PS' if (y0-cy)*fl > 0 else ' BS')
            elif any(abs(d[1] - y0) <= 1.0 for d in dl): al = 'stacked over a DL'
            elif min(abs(y0 - y) for y in ys) > .5: al = 'in a gap'
            else: al = 'over an OL, no DL'
            end = min(16, len(df))
            cross = next((f for f in range(1, end) if df[f][j][0] < 0), None)
            touch = next((f for f in range(1, end) if min(math.dist(o, df[f][j]) for o in off[f]) <= 1.0), None)
            out = 'blocked first' if touch is not None and (cross is None or touch <= cross) else 'rushed untouched' if cross is not None else 'sat untouched'
            R[(con, db, al)][out] += 1; R[(con, db, al)]['n'] += 1
    print("==", path.split('/')[-1])
    for k in sorted(R):
        c = R[k]; n = c['n']
        if 'outside' not in k[2] and k[1]=='0-1.6': continue
        print(f"  {k[0]} {k[1]:8} {k[2]:26} n{n:5} " + "  ".join(f"{o} {100*c[o]/n:.0f}%" for o in ('blocked first', 'rushed untouched', 'sat untouched')))
