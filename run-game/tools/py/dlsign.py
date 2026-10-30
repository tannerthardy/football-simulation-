"""Zone doubles (two OL within 1.3 yd of a DL for 3 frames, starting in the first 1.0 s), NFL vs sim, same operator.
Window: double start -> first frame either member is >= 2 yd from the DL (cap 2.5 s). Play side = sign of the
carrier's lateral move from snap to his first frame past the LOS (plays that never cross are skipped).
DL lateral displacement signed to the play side (+ = with the play), DL lateral speed, pair members' mean signed
lateral, and shares moving with / against by > 0.5 yd. usage: dlsign.py rfr nfl traces..."""
import importlib.util, math, sys, statistics as st
from collections import defaultdict
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
out = defaultdict(lambda: defaultdict(list))
def plays():
    yield from rfr.nfl(sys.argv[2]); yield from rfr.sim(sys.argv[3:])
for p in plays():
    c = p["concept"]
    if c not in ("INSIDE ZONE", "OUTSIDE ZONE"): continue
    xy, pl, car = p["xy"], p["players"], p["carrier"]
    if len(xy) < 15: continue
    cross = next((k for k in range(len(xy)) if xy[k][car][0] > 0), None)
    if cross is None: continue
    side = xy[cross][car][1] - xy[0][car][1]
    if abs(side) < 0.5: continue
    sgn = 1 if side > 0 else -1
    grp = [q["group"] for q in pl]
    ol = [i for i, g in enumerate(grp) if g == "OL"]; dl = [i for i, g in enumerate(grp) if g == "DL" and xy[3][i][0] < 1.5]
    d = lambda k, a, b: math.dist(xy[k][a], xy[k][b])
    for t in dl:
        found = None
        for ai in range(len(ol)):
            for bi in range(ai + 1, len(ol)):
                a, b = ol[ai], ol[bi]; run = 0
                for k in range(min(10, len(xy))):
                    run = run + 1 if d(k, a, t) < 1.3 and d(k, b, t) < 1.3 else 0
                    if run >= 3: found = (k - 2, a, b); break
                if found: break
            if found: break
        if not found: continue
        k0, a, b = found
        k1 = next((k for k in range(k0, min(25, len(xy))) if d(k, a, t) >= 2 or d(k, b, t) >= 2), min(25, len(xy)) - 1)
        if k1 - k0 < 2: continue
        dur = (k1 - k0) * .1
        lat = (xy[k1][t][1] - xy[k0][t][1]) * sgn
        pair = ((xy[k1][a][1] - xy[k0][a][1]) + (xy[k1][b][1] - xy[k0][b][1])) / 2 * sgn
        O = out[(c, p["src"])]
        O["lat"].append(lat); O["rate"].append(lat / dur); O["pair"].append(pair); O["dur"].append(dur)
        O["with"].append(lat > .5); O["against"].append(lat < -.5)
        O["back"].append(xy[k0][t][0] - xy[k1][t][0])
m = lambda v: f"{st.median(v):5.2f}" if v else "  -  "
q = lambda v, f: f"{sorted(v)[int(len(v)*f)]:5.2f}" if v else "  -  "
s = lambda v: f"{sum(v)/len(v):.2f}" if v else "-"
print("concept src: n | DL lateral with play (p25 med p75) | rate yd/s | pair lateral | with >0.5 / against <-0.5 | DL driven back | window s")
for (c, src), O in sorted(out.items()):
    print(f"  {c:12s} {src}: {len(O['lat']):4d} | {q(O['lat'],.25)} {m(O['lat'])} {q(O['lat'],.75)} | {m(O['rate'])} | {m(O['pair'])} | {s(O['with'])} / {s(O['against'])} | {m(O['back'])} | {m(O['dur'])}")
