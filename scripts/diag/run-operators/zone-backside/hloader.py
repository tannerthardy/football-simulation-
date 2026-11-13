"""Shared loader for the zone backside operators (NFL export .jsonl.gz or a sim dump from dump-zone.mts).
Same geometry both sides; NFL frame 0 is the ball_snap tag, unshifted."""
import sys, json, gzip, math, statistics as st, collections
def plays(path):
    if path.endswith(".gz"):
        with gzip.open(path, "rt") as f:
            for line in f:
                p = json.loads(line)
                if p["kind"] != "run" or p["carrier"] is None or p["cell"]["concept"] not in ("OUTSIDE ZONE", "INSIDE ZONE"): continue
                c = p["carrier"]; pl = p["players"]; X = p["xy"]
                OL = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
                if len(OL) != 5: continue
                OT = [i for i, q in enumerate(pl) if q["side"] == "O" and i != c and i not in OL]; D = [i for i, q in enumerate(pl) if q["side"] == "D"]
                fc = p["events"].get("first_contact"); ho = p["events"].get("handoff") or 0
                yield int(round(ho*10))+1,  p["cell"]["concept"][:2], [[(r[2*i], r[2*i+1]) for i in OL] for r in X], [[(r[2*i], r[2*i+1]) for i in OT] for r in X], [[(r[2*i], r[2*i+1]) for i in D] for r in X], [(r[2*c], r[2*c+1]) for r in X], (int(round(fc*10)) if fc else len(X)), 0
    else:
        for line in open(path):
            r = json.loads(line); off = r["off"]
            idx = [min(range(len(off[0])), key=lambda m: sum(abs(off[f][m][1] - r['ol'][f][k]) for f in range(len(off)))) for k in range(5)]
            car = [tuple(p) for p in r["car"]]
            ci = min(range(len(off[0])), key=lambda m: sum(math.dist(off[f][m], car[f]) for f in range(len(off))))
            oth = [m for m in range(len(off[0])) if m not in idx and m != ci]
            fc = r.get("contact"); ho = r.get("handoff") or 0
            yield int(round(ho*10)), r["concept"][:2], [[f[m] for m in idx] for f in off], [[f[m] for m in oth] for f in off], r["def"], car, (int(round(fc*10)) if fc else len(off)), 0
