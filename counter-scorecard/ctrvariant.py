"""NFL counter variants: OL rule pullers (count, which OL by rank toward the pull side) and non-OL wrappers: TE/RB/FB
(not the carrier) whose lateral move toward the pull side by 2.0 s exceeds 2.5 yd and who start on the backside of
the OL centre; their snap depth (inline < 1.5 deep vs off-ball). usage: ctrvariant.py rfr nfl.jsonl.gz"""
import importlib.util, sys, collections
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
C = collections.Counter(); n = 0
for p in rfr.nfl(sys.argv[2]):
    if p["concept"] != "COUNTER": continue
    xy, pl, car = p["xy"], p["players"], p["carrier"]
    if len(xy) < 22: continue
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) != 5: continue
    pulls = [i for i in ol if rfr.puller(xy, i, 25)]
    cy = sum(xy[0][i][1] for i in ol) / 5
    others = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] in ("TE", "RB", "FB") and i != car]
    if pulls: ps = 1 if sum(xy[15][i][1] - xy[0][i][1] for i in pulls) > 0 else -1
    else: ps = 1 if xy[min(25, len(xy)-1)][car][1] > cy else -1
    rank = sorted(ol, key=lambda i: -(xy[0][i][1] - cy) * ps); name = dict(zip(rank, ("PST", "PSG", "C", "BSG", "BST")))
    wr = []
    for i in others:
        if (xy[0][i][1] - cy) * ps < 0 and (xy[20][i][1] - xy[0][i][1]) * ps > 2.5:
            wr.append(("Y inline" if xy[0][i][0] > -1.5 else "H off-ball") + f" {pl[i]['group']}")
    n += 1
    C["+".join(sorted(name[i] for i in pulls)) + " | " + ("+".join(sorted(wr)) or "-")] += 1
print("NFL counters", n)
for k, v in C.most_common(14): print(f"{v:4} {v/n:.2f} {k}")
