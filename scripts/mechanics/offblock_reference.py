"""Off every blocker within 1.0 s (Defense's definition, as I reconstruct it): the first frame a defender is within 3 yd of
the carrier and blocked (an OL/TE/back other than the carrier within 1.2 yd), is he unblocked at any frame in the next 1.0 s,
and does he reach the carrier (< 1.0 yd) within 1.5 s. By group DL/LB/DB. usage: python3 -I offblock.py rfr.py nfl.jsonl.gz"""
import sys, math, importlib.util, collections
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
R = collections.defaultdict(lambda: [0, 0, 0])
for p in rfr.nfl(sys.argv[2]):
    xy, pl, c = p["xy"], p["players"], p["carrier"]
    if c is None or len(xy) < 15: continue
    O = [i for i, x in enumerate(pl) if x["side"] == "O" and i != c]; D = [i for i, x in enumerate(pl) if x["side"] == "D"]
    blocked = lambda f, j: any(math.dist(xy[f][j], xy[f][o]) < 1.2 for o in O); done = set()
    for f in range(len(xy)):
        for j in D:
            if j in done or math.dist(xy[f][j], xy[f][c]) >= 3.0: continue
            done.add(j)
            if not blocked(f, j) or f + 10 >= len(xy): continue
            g = pl[j]["group"]; R[g][0] += 1
            if any(not blocked(h, j) for h in range(f, f + 11)): R[g][1] += 1
            if any(math.dist(xy[h][j], xy[h][c]) < 1.0 for h in range(f, min(len(xy), f + 16))): R[g][2] += 1
for g, (n, off, reach) in sorted(R.items()):
    if n >= 30: print(f"NFL {g:3} n {n:5} | off every blocker within 1.0 s {100*off/n:4.0f}% | reaches carrier within 1.5 s {100*reach/n:4.0f}%")
