"""When, where and on whom blocks land, NFL vs sim, through run_film_reference.py's own loaders.
usage: blockmap.py run_film_reference.py nfl.jsonl.gz sim_trace.json ...
Contact proxies (positions only): a blocker meets a DL within 1.2 yd (as the puller rule), a box backer within
1.5 yd with the blocker past -0.5 (as the box-backer rule). Play side = the carrier's side of the OL centre when he
crosses the LOS. x = yd past the LOS (attack positive)."""
import importlib.util, math, statistics as st, sys
from collections import defaultdict
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
L = defaultdict(list); B = defaultdict(list); P = defaultdict(list); N = defaultdict(int)
def plays():
    yield from rfr.nfl(sys.argv[2]); yield from rfr.sim(sys.argv[3:])
for p in plays():
    xy, pl, c, src, con = p["xy"], p["players"], p["carrier"], p["src"], p["concept"]
    n = len(xy)
    if n < 15 or con not in rfr.CONCEPTS: continue
    k = lambda t: max(0, min(n - 1, int(round(t / 0.1))))
    d = lambda i, j, f: math.hypot(xy[f][i][0] - xy[f][j][0], xy[f][i][1] - xy[f][j][1])
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) < 5: continue
    dl = [i for i, q in enumerate(pl) if q["side"] == "D" and q["group"] == "DL"]
    dfn = [i for i, q in enumerate(pl) if q["side"] == "D"]
    cross = next((f for f in range(n) if xy[f][c][0] > 0), None)
    endf = cross if cross is not None else min(n - 1, k(p["end"]))
    cy = st.mean(xy[0][i][1] for i in ol)
    side = 1 if xy[cross if cross is not None else min(n - 1, k(2.5))][c][1] > cy else -1
    N[(con, src)] += 1
    pullers = {i for i in ol if rfr.puller(xy, i, k(2.5))}
    key = (con, src)
    for i in ol:
        if i in pullers: continue
        fdl = next((f for f in range(n) if any(d(i, j, f) < 1.2 for j in dl)), None)
        any_blk = next((f for f in range(0, endf + 1) if any(d(i, j, f) < 1.2 for j in dfn)), None)
        L[key].append((fdl * .1 if fdl is not None else None, fdl is not None and fdl <= 5, any_blk is None))
    for j in dfn:
        x0, y0 = xy[0][j]
        if pl[j]["group"] != "LB" or not (2.5 <= x0 <= 8 and abs(y0 - cy) < 6): continue
        arrive = next((f for f in range(n) if xy[f][c][0] >= xy[f][j][0] - 1), None)
        last = arrive if arrive is not None else min(n, k(p["end"]))
        hit = next(((f, b) for f in range(3, last) for b in range(len(pl))
                    if pl[b]["side"] == "O" and pl[b]["group"] in ("OL", "TE", "RB") and b != c and xy[f][b][0] > -0.5 and d(j, b, f) < 1.5), None)
        if hit:
            f, b = hit
            who = "puller" if b in pullers else pl[b]["group"]
            B[key].append(dict(t=f * .1, who=who, x=xy[f][j][0], y=(xy[f][j][1] - cy) * side,
                               lead=(arrive - f) * .1 if arrive is not None else None, side0=(y0 - cy) * side))
        else:
            B[key].append(None)
    for i in pullers:
        x0, y0 = xy[0][i]
        hit = None
        for f in range(k(0.6), min(n, k(4.0))):
            if abs(xy[f][i][1] - y0) < 2: continue
            h = [j for j in dfn if d(i, j, f) < 1.2]
            if h: hit = (f, h[0]); break
        cyc = xy[cross][c][1] if cross is not None else None
        if hit:
            f, j = hit
            P[key].append(dict(t=f * .1, grp=pl[j]["group"], x=xy[f][j][0], lat=abs(xy[f][i][1] - y0),
                               hole=abs(xy[f][j][1] - cyc) if cyc is not None else None, before=cross is not None and f <= cross))
        else:
            P[key].append(None)
def med(v):
    v = [x for x in v if x is not None]
    return f"{st.median(v):.2f}" if v else "-"
def pct(a, b): return f"{a / b:.2f}" if b else "-"
print("LINE (non-pulling OL): plays | first DL contact t | engaged a DL by 0.5 s | no block on anyone before carrier crosses")
for con in rfr.CONCEPTS:
    for src in ("nfl", "sim"):
        r = L[(con, src)]
        if r: print(f"  {con:12s} {src}: {N[(con, src)]:4d} | {med([x[0] for x in r])} s | {pct(sum(x[1] for x in r), len(r))} | {pct(sum(x[2] for x in r), len(r))}")
print("BOX BACKERS: n | touched before carrier | first touch t | lead over carrier | toucher OL/puller/TE/RB | backer depth at touch | lateral at touch (+ play side) | lateral at snap")
for con in rfr.CONCEPTS:
    for src in ("nfl", "sim"):
        r = B[(con, src)]
        if not r: continue
        h = [x for x in r if x]
        who = {w: sum(x["who"] == w for x in h) for w in ("OL", "puller", "TE", "RB")}
        print(f"  {con:12s} {src}: {len(r):4d} | {pct(len(h), len(r))} | {med([x['t'] for x in h])} s | {med([x['lead'] for x in h])} s | "
              + "/".join(pct(who[w], len(h)) for w in who) + f" | {med([x['x'] for x in h])} | {med([x['y'] for x in h])} | {med([x['side0'] for x in h])}")
print("PULLERS (rule-detected): n | hit someone | hit at t | before carrier crosses | hit DL/LB/DB | hit man's depth | lateral travelled | hit man's distance from carrier's crossing point")
for con in ("POWER", "COUNTER", "TRAP"):
    for src in ("nfl", "sim"):
        r = P[(con, src)]
        if not r: continue
        h = [x for x in r if x]
        g = {w: sum(x["grp"] == w for x in h) for w in ("DL", "LB", "DB")}
        print(f"  {con:8s} {src}: {len(r):4d} ({len(r) / max(1, N[(con, src)]):.2f}/play) | {pct(len(h), len(r))} | {med([x['t'] for x in h])} s | {pct(sum(x['before'] for x in h), len(h))} | "
              + "/".join(pct(g[w], len(h)) for w in g) + f" | {med([x['x'] for x in h])} | {med([x['lat'] for x in h])} | {med([x['hole'] for x in h])}")
