"""Blocks on box LBs, NFL vs sim, same operator. Box LB: group LB, 2.5-8 yd deep and within 6 yd of the OL centre at the
snap. Block: first frame (>= 0.5 s, before the carrier passes the LB's depth) an OL/TE/RB other than the carrier is within
1.2 yd of him. Per block: blocker speed and closing speed at contact, approach angle (blocker velocity vs line to LB),
leverage (blocker on the carrier's side of the LB laterally), contact frames held in the next 1.0 s, LB's lateral
travel toward the carrier during that 1.0 s, and whether that LB later comes within 1.0 yd of the carrier.
usage: lbfit2.py rfr nfl traces..."""
import importlib.util, math, sys
from collections import defaultdict
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
R = defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2]); yield from rfr.sim(sys.argv[3:])
for p in plays():
    c = p["concept"]
    if c not in ("INSIDE ZONE", "OUTSIDE ZONE", "POWER", "COUNTER"): continue
    xy, pl, car = p["xy"], p["players"], p["carrier"]; n = len(xy)
    if n < 20: continue
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) < 5: continue
    cy = sum(xy[0][i][1] for i in ol) / len(ol)
    olf = sum(xy[min(n-1,10)][i][1] - xy[0][i][1] for i in ol); ps = 1 if olf >= 0 else -1
    blk = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] in ("OL", "TE", "RB") and i != car]
    for j, q in enumerate(pl):
        if q["side"] != "D" or q["group"] != "LB" or not (2.5 <= xy[0][j][0] <= 8 and abs(xy[0][j][1] - cy) < 6): continue
        arrive = next((f for f in range(n) if xy[f][car][0] >= xy[f][j][0] - 1), n - 1)
        hit = None
        for f in range(5, arrive):
            bs = [b for b in blk if math.dist(xy[f][b], xy[f][j]) < 1.2]
            if bs: hit = (min(bs, key=lambda b: math.dist(xy[f][b], xy[f][j])), f); break
        row = {"blocked": hit is not None}
        # Near misses: a blocker comes within 1.5 yd, never holds 1.2 yd for 3 frames, and is 2 yd away within 0.6 s.
        misses = 0
        for bb in blk:
            f0 = next((f for f in range(5, arrive) if math.dist(xy[f][bb], xy[f][j]) < 1.5), None)
            if f0 is None: continue
            win = range(f0, min(n, f0 + 7))
            held3 = any(all(math.dist(xy[k][bb], xy[k][j]) < 1.2 for k in (f, f + 1, f + 2) if k < n) for f in win)
            gone = any(math.dist(xy[k][bb], xy[k][j]) > 2.0 for k in win)
            if not held3 and gone: misses += 1
        row["miss"] = misses > 0
        row["reaches_carrier"] = any(math.dist(xy[f][j], xy[f][car]) < 1.0 for f in range(8, n))
        if hit:
            b, f = hit; g = max(1, f - 1)
            vb = ((xy[f][b][0] - xy[g][b][0]) * 10, (xy[f][b][1] - xy[g][b][1]) * 10)
            vl = ((xy[f][j][0] - xy[g][j][0]) * 10, (xy[f][j][1] - xy[g][j][1]) * 10)
            dx, dy = xy[f][j][0] - xy[f][b][0], xy[f][j][1] - xy[f][b][1]; L = math.hypot(dx, dy) or 1
            sp = math.hypot(*vb); row["speed"] = sp
            row["closing"] = ((vb[0] - vl[0]) * dx + (vb[1] - vl[1]) * dy) / L
            row["angle"] = math.degrees(math.acos(max(-1, min(1, (vb[0] * dx + vb[1] * dy) / (L * sp))))) if sp > .3 else None
            side_c = xy[f][car][1] - xy[f][j][1]; side_b = xy[f][b][1] - xy[f][j][1]
            row["leverage"] = (side_c * side_b > 0) if abs(side_c) > .3 else None
            fr = range(f, min(n, f + 10)); row["held"] = sum(math.dist(xy[k][b], xy[k][j]) < 1.2 for k in fr) / 10
            k2 = min(n - 1, f + 10); row["lb_to_car"] = ((xy[k2][j][1] - xy[f][j][1]) * (1 if side_c > 0 else -1))
            row["blk_ps"] = (xy[k2][b][1] - xy[f][b][1]) * ps; row["lb_ps"] = (xy[k2][j][1] - xy[f][j][1]) * ps
            row["car_ps_of_lb"] = (xy[k2][car][1] - xy[k2][j][1]) * ps
            row["grp"] = pl[b]["group"]; row["blk_to_car"] = ((xy[k2][b][1] - xy[f][b][1]) * (1 if side_c > 0 else -1))
        R[(c, p["src"])].append(row)
def med(v): v = sorted(x for x in v if x is not None); return f"{v[len(v)//2]:.2f}" if v else "-"
print("concept src: box LBs | near-miss by any blocker | blocked | blocked LB reaches carrier | unblocked LB reaches carrier | blocker speed / closing / approach angle at contact | on carrier side | held (share of next 1 s) | LB lateral toward carrier in that 1 s")
for c in ("INSIDE ZONE", "OUTSIDE ZONE", "POWER", "COUNTER"):
    for src in ("nfl", "sim"):
        r = R[(c, src)]
        if not r: continue
        b = [x for x in r if x["blocked"]]; u = [x for x in r if not x["blocked"]]
        lev = [x["leverage"] for x in b if x.get("leverage") is not None]
        print(f"{c[:12]:12s} {src}: {len(r):4d} | {sum(x['miss'] for x in r)/len(r):4.0%} | {len(b)/len(r):4.0%} | {sum(x['reaches_carrier'] for x in b)/max(1,len(b)):4.0%} | {sum(x['reaches_carrier'] for x in u)/max(1,len(u)):4.0%} | "
              f"{med([x['speed'] for x in b])} / {med([x['closing'] for x in b])} / {med([x['angle'] for x in b])} | {sum(lev)/max(1,len(lev)):4.0%} | {med([x['held'] for x in b])} | {med([x['lb_to_car'] for x in b])} | blk {med([x['blk_to_car'] for x in b])} | rel {med([x['lb_to_car'] - x['blk_to_car'] for x in b if 'blk_to_car' in x])} || PLAYSIDE blk {med([x.get('blk_ps') for x in b])} lb {med([x.get('lb_ps') for x in b])} | carrier playside of LB @+1s {med([x.get('car_ps_of_lb') for x in b])} ({sum(1 for x in b if x.get('car_ps_of_lb', 0) > 0)/max(1,len(b)):.0%} outside him)")
