# Original scratch script supplied by Tanner through the coordinator, 2026-10-28.
# Preserved body: only transport HTML entities were decoded (< and >).
# Loader was chosen by argv and may have been an unpublished overlay. Its bytes,
# original sim inputs and one-off personnel split were not supplied with this text.
# Published successor: tools/run-box-count f7251869ed0f9c9f59242a9a799523c31f685fcb,
# scripts/mechanics/box_count_reference.py. This artifact is not a replacement.
# Raw inputs stay outside Git. No play-side/backside surplus is computed here.
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
