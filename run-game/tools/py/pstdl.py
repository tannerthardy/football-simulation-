"""Power (one OL rule puller), NFL vs sim, same operator: plays with a DL/LB on the line (snap depth < 1.6) within
1.0 yd lateral of the play-side tackle's snap spot. Who first blocks that man (1.2 yd x 3 frames, before carrier cross
+0.6 s): the kicker / the PST / another OL / TE / nobody; and the kicker's first block: that man / the EMLOS / other.
usage: pstdl.py rfr nfl.jsonl.gz traces..."""
import sys, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
C = collections.defaultdict(collections.Counter)
def first_block(xy, i, defs, end):
    for f in range(3, end - 2):
        for j in defs:
            if all(math.dist(xy[h][i], xy[h][j]) < 1.2 for h in (f, f+1, f+2)): return j, f
    return None, None
def go(p):
    if p["concept"] != "POWER": return
    xy, pl, car = p["xy"], p["players"], p["carrier"]; n = len(xy); s = p["src"]
    if n < 26: return
    k = lambda t: min(n - 1, int(round(t / .1)))
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) != 5: return
    pulls = [i for i in ol if rfr.puller(xy, i, k(2.5))]
    if len(pulls) != 1: return
    kk = pulls[0]; cy = sum(xy[0][i][1] for i in ol) / 5
    ps = 1 if xy[k(1.5)][kk][1] - xy[0][kk][1] > 0 else -1
    stay = [i for i in ol if i != kk]; pst = max(stay, key=lambda i: (xy[0][i][1] - cy) * ps)
    defs = [j for j, q in enumerate(pl) if q["side"] == "D"]
    line = [j for j in defs if pl[j]["group"] in ("DL", "LB") and xy[0][j][0] < 1.6]
    cross = next((f for f in range(n) if xy[f][car][0] >= 0), n - 7); end = min(n, cross + 7)
    C[s]["plays"] += 1
    on = [j for j in line if abs(xy[0][j][1] - xy[0][pst][1]) < 1.0]
    if not on: return
    m = min(on, key=lambda j: abs(xy[0][j][1] - xy[0][pst][1]))
    emlos = max(line, key=lambda j: (xy[0][j][1] - cy) * ps)
    C[s]["DL on PST"] += 1; C[s]["...he is the EMLOS"] += (m == emlos)
    # who blocks him first
    best = None
    for b in [i for i, q in enumerate(pl) if q["side"] == "O" and i != car and q["group"] in ("OL", "TE", "RB", "FB", "WR")]:
        j, f = first_block(xy, b, [m], end)
        if j is not None and (best is None or f < best[1]): best = (b, f)
    if best is None: who = "nobody"
    else:
        b = best[0]; who = "kicker" if b == kk else "PST" if b == pst else pl[b]["group"]
    C[s]["him first blocked by " + who] += 1
    j, f = first_block(xy, kk, defs, end)
    C[s]["kicker first blocks " + ("him" if j == m else "EMLOS" if j == emlos else "nobody" if j is None else "other")] += 1
for p in rfr.nfl(sys.argv[2]): go(p)
for p in rfr.sim(sys.argv[3:]): go(p)
for s in ("nfl", "sim"):
    c = C[s]; d = max(1, c["DL on PST"])
    print(s, "plays", c["plays"], "DL on PST", c["DL on PST"], " ".join(f"| {k} {v} ({v/d:.0%})" for k, v in sorted(c.items()) if k not in ("plays", "DL on PST")))
