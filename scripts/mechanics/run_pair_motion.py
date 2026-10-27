#!/usr/bin/env python3
"""Engaged OL-DL pairs by proximity, NFL vs sim, same operator.
    python3 -I scripts/mechanics/run_pair_motion.py <nfl.jsonl.gz> <trace.json>...
A pair at time t: an OL and the nearest DL within R yd of him. Per pair at
t = 1.0 and 1.5 s: each body's speed, the pair centroid's velocity split
into downfield (+x, toward the defense) and lateral (|y|), and the closing
speed. Runs only. Both sources at 10 Hz on the snap clock (frame k = 0.1k s)."""
import gzip, json, math, statistics as st, sys
sys.path.insert(0, "scripts/mechanics")
import run_film_reference as R
RAD = 1.1
def med(v):
    v = [x for x in v if x is not None]; return f"{st.median(v):5.2f}" if v else "    -"
def q(v, p):
    v = sorted(x for x in v if x is not None); return f"{v[int(p*(len(v)-1))]:5.2f}" if v else "    -"
out = {}
for play in list(R.nfl(sys.argv[1])) + list(R.sim(sys.argv[2:])):
    xy, players, n = play["xy"], play["players"], len(play["xy"])
    if n < 18: continue
    ol = [i for i, p in enumerate(players) if p["side"] == "O" and p["group"] == "OL"]
    dl = [i for i, p in enumerate(players) if p["side"] == "D" and p["group"] == "DL"]
    vel = lambda i, f: ((xy[f+1][i][0] - xy[f-1][i][0]) / .2, (xy[f+1][i][1] - xy[f-1][i][1]) / .2)
    for t in (1.0, 1.5):
        f = int(round(t / .1))
        if f + 1 >= n: continue
        for i in ol:
            d = min(dl, key=lambda j: math.hypot(xy[f][i][0]-xy[f][j][0], xy[f][i][1]-xy[f][j][1]), default=None)
            if d is None or math.hypot(xy[f][i][0]-xy[f][d][0], xy[f][i][1]-xy[f][d][1]) > RAD: continue
            vo, vd = vel(i, f), vel(d, f)
            cx, cy = (vo[0]+vd[0])/2, (vo[1]+vd[1])/2
            ux, uy = xy[f][d][0]-xy[f][i][0], xy[f][d][1]-xy[f][i][1]; L = math.hypot(ux, uy) or 1
            closing = ((vo[0]-vd[0])*ux + (vo[1]-vd[1])*uy) / L
            out.setdefault((t, play["src"]), []).append((math.hypot(*vo), math.hypot(*vd), cx, abs(cy), math.hypot(cx, cy), closing))
print(f"pairs within {RAD} yd; medians (p25/p75 for centroid speed)")
print(f"{'t':4s} {'src':4s} {'n':>5s}  OLspd DLspd  cent-x |cent-y| centspd (p25  p75)  closing")
for t in (1.0, 1.5):
    for src in ("nfl", "sim"):
        r = out.get((t, src), [])
        if r: print(f"{t:4.1f} {src:4s} {len(r):5d}  {med([x[0] for x in r])} {med([x[1] for x in r])}  {med([x[2] for x in r])}  {med([x[3] for x in r])}  {med([x[4] for x in r])} ({q([x[4] for x in r],.25)} {q([x[4] for x in r],.75)})  {med([x[5] for x in r])}")
