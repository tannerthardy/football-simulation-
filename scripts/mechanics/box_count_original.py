# Original counting script supplied by Tanner through the coordinator,
# 2026-10-28. Body preserved verbatim (HTML comparison entities decoded).
# Historical snapshot proxy, NOT a validated pre-snap eligibility operator.
# No raw inputs embedded. Read-only: prints tables, never writes inputs.
import importlib.util, statistics as st, sys
from collections import defaultdict, Counter
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
R = defaultdict(Counter)
def plays():
    yield from rfr.nfl(sys.argv[2])
    yield from rfr.sim(sys.argv[3:])
for p in plays():
    xy, players, car = p["xy"], p["players"], p["carrier"]
    if not xy: continue
    grp = [q["group"] for q in players]
    ol = [i for i, g in enumerate(grp) if g == "OL"]
    if len(ol) < 5: continue
    cy = st.mean(xy[0][i][1] for i in ol)
    defn = [i for i, g in enumerate(grp) if g in ("DL", "LB", "DB")]
    box = [i for i in defn if xy[0][i][0] < 7.5 and abs(xy[0][i][1] - cy) < 6.5]
    blk = ol + [i for i, g in enumerate(grp) if (g == "TE" and abs(xy[0][i][1] - cy) < 6.5)
                or (g == "RB" and i != car and xy[0][i][0] < -1 and abs(xy[0][i][1] - cy) < 6.5)]
    diff = len(box) - len(blk)
    key = f"{p['src']}"
    for k in (f"{key} ALL", f"{key} {p['concept']}"):
        R[k]['n'] += 1; R[k]['sum'] += diff
        R[k]['+2 or more'] += diff >= 2; R[k]['+1'] += diff == 1; R[k]['even'] += diff == 0; R[k]['light (<0)'] += diff < 0
        R[k]['box'] += len(box); R[k]['blk'] += len(blk)
for k in sorted(R, key=lambda k: (k.split(' ', 1)[1], k)):
    r = R[k]; n = r['n']
    if n < 30: continue
    print(f"{k:28} n {n:5} | box {r['box']/n:.2f} blockers {r['blk']/n:.2f} | surplus mean {r['sum']/n:+.2f} | +2 or more {r['+2 or more']/n:.2f}  +1 {r['+1']/n:.2f}  even {r['even']/n:.2f}  light {r['light (<0)']/n:.2f}")
