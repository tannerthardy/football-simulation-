"""First defender within 1.0 yd of the carrier (after he has the ball at x<=... any time): share behind the LOS, by DL,
NFL vs sim, same operator via run_film_reference loaders. usage: penref.py rfr.py nfl.gz trace..."""
import importlib.util, math, sys, json, os, tempfile
from collections import Counter, defaultdict
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
C = defaultdict(Counter)
def plays():
    yield from rfr.nfl(sys.argv[2])
    yield from rfr.sim(sys.argv[3:])
for p in plays():
    xy, players, car = p["xy"], p["players"], p["carrier"]
    if not xy: continue
    grp = [q["group"] for q in players]
    end = int(round(p["end"] / 0.1)) + 1 if p.get("end") is not None else len(xy)
    hit = None
    for k in range(min(end, len(xy))):
        for j, g in enumerate(grp):
            if players[j].get("side", "D") in ("D",) or g in ("DL", "LB", "DB"):
                if g in ("DL", "LB", "DB") and math.dist(xy[k][j], xy[k][car]) < 1.0: hit = (k, j); break
        if hit: break
    key = (p['src'], p['concept']); C[key]['n'] += 1
    if hit and xy[hit[0]][car][0] < 0:
        C[key]['behind'] += 1; C[key]['behind ' + grp[hit[1]]] += 1
for (src, c), r in sorted(C.items(), key=lambda kv: (kv[0][1], kv[0][0])):
    if r['n'] < 50 or c not in ('INSIDE ZONE', 'OUTSIDE ZONE', 'POWER', 'COUNTER', 'TRAP'): continue
    print(f"{c:13} {src}: runs {r['n']:5} first contact behind LOS {r['behind']/r['n']:.3f} (by DL {r['behind DL']/r['n']:.3f})")
