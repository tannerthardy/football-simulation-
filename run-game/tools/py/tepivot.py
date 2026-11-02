"""Sim run plays: pivots.py's PIVOT operator per offensive non-carrier player, listed with context: trace id, slot,
plan/job, pivot time, his trace target (col 6) and plan kind (col 8) before/after the pivot, and whether his target
changed within 0.3 s of the pivot. env CON (concept), POS (slot prefix, e.g. Y,TE). usage: tepivot.py traces..."""
import json, math, sys, os, collections
CON = os.environ.get("CON", "power"); POS = tuple(os.environ.get("POS", "Y").split(","))
C = collections.Counter(); EX = []
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p["setup"]
        if p["nullified"] or s.get("concept") != CON: continue
        ag = s["agents"]; fr = p["frames"]; n = len(fr); slot = [a["slot"] for a in ag]
        car = next((f["c"] for f in fr if f["c"] >= 0 and slot[f["c"]] != "QB"), None)
        if car is None: continue
        xy = [[(q[0] - s["los"], q[1]) for q in f["a"]] for f in fr]
        crs = next((k for k in range(n) if xy[k][car][0] >= 0), n - 7); end = min(n, crs + 7)
        defs = [i for i, a in enumerate(ag) if a["team"] != ag[car]["team"]]
        for i, a in enumerate(ag):
            if i == car or a["team"] != ag[car]["team"] or not slot[i].startswith(POS): continue
            stop = end
            for f in range(3, end - 2):
                if any(all(math.dist(xy[h][i], xy[h][j]) < 1.2 for h in (f, f + 1, f + 2)) for j in defs): stop = f; break
            if stop - 3 < 5: continue
            C["players"] += 1
            sp = [0.0] + [math.dist(xy[k][i], xy[k-1][i]) * 10 for k in range(1, n)]
            hd = [None] * n
            for k in range(2, n):
                dx, dy = xy[k][i][0] - xy[k-2][i][0], xy[k][i][1] - xy[k-2][i][1]
                if math.hypot(dx, dy) > .08: hd[k] = math.atan2(dx, dy)
            for k in range(5, stop - 3):
                if hd[k] is None or hd[k+3] is None: continue
                d = abs(math.degrees(math.atan2(math.sin(hd[k+3]-hd[k]), math.cos(hd[k+3]-hd[k]))))
                if d > 60 and min(sp[k:k+4]) < 1.5 and max(sp[max(0,k-5):k+1]) > 3:
                    t0 = fr[max(0, k-3)]["a"][i][6]; t1 = fr[min(n-1, k+4)]["a"][i][6]
                    pk0 = fr[max(0, k-3)]["a"][i][8]; pk1 = fr[min(n-1, k+4)]["a"][i][8]
                    sw = t0 != t1; C["pivot"] += 1; C["pivot tgt switch"] += sw; C[f"pivot plan {pk0}->{pk1}"] += 1
                    EX.append((path.split('trace-')[1][:12], p["id"], slot[i], a["plan"], a.get("job"), k / 10, slot[t0] if t0 is not None and t0 >= 0 else None, slot[t1] if t1 is not None and t1 >= 0 else None, round(xy[k][i][0], 2)))
                    break
print(dict(C))
for e in EX[:25]: print(e)
