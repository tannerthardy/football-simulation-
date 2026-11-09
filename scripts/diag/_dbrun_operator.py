"""DB run commit, NFL vs sim, same operator. Zone runs (IZ/OZ) and gap runs (POWER/COUNTER/TRAP).
Each DB, split by depth at the snap: deep (x0 >= 10), mid (5-10), shallow (< 5); x = yards past the LOS on the
defense side. Downhill speed = -dx/dt (toward the LOS) by 0.2 s central difference at t = 0.5/1.0/1.5/2.0/2.5 s.
Commit = first frame >= 0.3 s with downhill >= 1.5 yd/s held for 2 frames; also relative to the carrier crossing
the LOS. NFL time shifted by one frame (t - 0.1 s), Run Game's clock-offset convention.
Sim input: JSON lines from scripts/diag/_dbrun.mts {concept, car:[[x,y]..], dbs:[[[x,y]..]..]} on the same axes.
usage: dbrun.py rfr nfl [sim.jsonl ...]"""
import sys, json, importlib.util, collections, statistics as st
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
T = [5, 10, 15, 20, 25]; FAM = {"INSIDE ZONE": "zone", "OUTSIDE ZONE": "zone", "POWER": "gap", "COUNTER": "gap", "TRAP": "gap"}
R = collections.defaultdict(list)
def go(src, fam, car, dbs, sh):
    n = len(car)
    if n < 27: return
    cross = next((f for f in range(n) if car[f][0] >= 0), None)
    for d in dbs:
        x0 = d[0][0]; cls = ("deep" if x0 >= 10 else "mid" if x0 >= 5 else "shallow") + ("-wide" if abs(d[0][1] - car[0][1]) > 8 else "-in")
        k = (src, fam, cls)
        def dh(f): return -(d[f + 1][0] - d[f - 1][0]) / .2 if 0 < f < n - 1 else None
        for t in T:
            v = dh(t + sh)
            if v is not None: R[k + ("dh", t)].append(v)
        c = next((f for f in range(3 + sh, n - 2) if dh(f) >= 1.5 and dh(f + 1) >= 1.5), None)
        R[k + ("commit",)].append((c - sh) / 10 if c is not None else None)
        if c is not None and cross is not None: R[k + ("vsx",)].append((c - cross) / 10)
for p in rfr.nfl(sys.argv[2]):
    fam = FAM.get(p["concept"])
    if not fam: continue
    xy, pl = p["xy"], p["players"]
    dbs = [[xy[f][i] for f in range(len(xy))] for i, q in enumerate(pl) if q["side"] == "D" and q["group"] == "DB"]
    go("nfl", fam, [xy[f][p["carrier"]] for f in range(len(xy))], dbs, 1)
for path in sys.argv[3:]:
    tag = path.split("/")[-1]
    for line in open(path):
        r = json.loads(line); fam = FAM.get(r["concept"])
        if fam: go(tag, fam, r["car"], r["dbs"], 0)
for k in sorted({k[:3] for k in R}):
    cm = R[k + ("commit",)]; got = sorted(x for x in cm if x is not None); vs = sorted(R[k + ("vsx",)])
    if len(cm) < 30: continue
    print(f"{k[0]:16} {k[1]:4} {k[2]:12} n {len(cm):5} | downhill " + " / ".join(f"{st.median(R[k + ('dh', t)]):+.2f}" for t in T) +
          f" @0.5..2.5s | commit by 2.5s {100*sum(x <= 2.5 for x in got)/len(cm):.0f}% p50 {got[len(got)//2] if got else float('nan'):.1f}s" +
          (f" | vs carrier crossing p25/50/75 {vs[len(vs)//4]:+.1f}/{vs[len(vs)//2]:+.1f}/{vs[3*len(vs)//4]:+.1f}s" if vs else ""))
# Receivers on runs: WR downfield speed (+ = away from the LOS, toward the defense) at 0.5/1.0/1.5/2.0 s, and the share
# still going downfield faster than 3 yd/s (running off, not stalking) at 1.0/1.5 s.
W = collections.defaultdict(list)
for p in rfr.nfl(sys.argv[2]):
    fam = FAM.get(p["concept"])
    if not fam: continue
    xy, pl = p["xy"], p["players"]; n = len(xy)
    for i, q in enumerate(pl):
        if q["side"] != "O" or q["group"] != "WR" or n < 23: continue
        for t in (5, 10, 15, 20): W[(fam, t)].append((xy[t + 2][i][0] - xy[t][i][0]) / .2)
for fam in ("zone", "gap"):
    print(f"nfl WR {fam}: downfield " + " / ".join(f"{st.median(W[(fam, t)]):+.2f}" for t in (5, 10, 15, 20)) + f" @0.5..2.0s | >3 yd/s at 1.0/1.5 s {100*sum(v > 3 for v in W[(fam,10)])/len(W[(fam,10)]):.0f}% / {100*sum(v > 3 for v in W[(fam,15)])/len(W[(fam,15)]):.0f}%")
SW = collections.defaultdict(list)
for path in sys.argv[3:]:
    for line in open(path):
        r = json.loads(line); fam = FAM.get(r["concept"])
        if not fam or "wrs" not in r: continue
        for w in r["wrs"]:
            if len(w) < 23: continue
            for t in (5, 10, 15, 20): SW[(path.split("/")[-1], fam, t)].append((w[t + 1][0] - w[t - 1][0]) / .2)
for k in sorted({k[:2] for k in SW}):
    v = lambda t: SW[k + (t,)]
    print(f"{k[0]} WR {k[1]}: downfield " + " / ".join(f"{st.median(v(t)):+.2f}" for t in (5, 10, 15, 20)) + f" @0.5..2.0s | >3 yd/s at 1.0/1.5 s {100*sum(x > 3 for x in v(10))/len(v(10)):.0f}% / {100*sum(x > 3 for x in v(15))/len(v(15)):.0f}%")
