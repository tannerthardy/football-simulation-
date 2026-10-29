"""Acceleration vs speed (run film; NFL vs sim arms).
    python3 -I scripts/diag/accel_envelope.py <nfl.jsonl.gz> LABEL=trace1.json,trace2.json [...]
Acceleration vs speed, same position-only operator on NFL and sim run film.
Speed from positions over +-0.1 s, tangential accel from speeds over +-0.2 s.
Free running only: before the carrier's first contact, no opponent within 1.5 yd.
Per group and speed bin: p50 and p90 of accel while speeding up (a>0.5)."""
import math, statistics as st, sys
sys.path.insert(0, "scripts/mechanics")
import run_film_reference as R
BINS = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 8)]
def q(v, p): v = sorted(v); return v[int(p * (len(v) - 1))] if v else None
def collect(plays):
    out = {}
    for p in plays:
        xy, n, c = p["xy"], len(p["xy"]), p["carrier"]
        tc = p["contact"] if p["contact"] is not None else p["end"]
        kend = min(n - 3, int(tc / .1), 30)
        pl = p["players"]
        sp = [[math.dist(xy[k + 1][i], xy[k - 1][i]) / .2 for i in range(len(pl))] for k in range(1, n - 1)]
        for i, who in enumerate(pl):
            g = "carrier" if i == c else who["group"]
            if g not in ("carrier", "OL", "DL", "LB", "DB", "WR", "TE"): continue
            for k in range(3, kend):
                near = min((math.dist(xy[k][i], xy[k][j]) for j, o in enumerate(pl) if o["side"] != who["side"]), default=9)
                if near < 1.5: continue
                v = sp[k - 1][i]; a = (sp[k + 1][i] - sp[k - 3][i]) / .4
                if a > .5: out.setdefault(g, []).append((v, a, k * .1))
    return out
srcs = {}
nfl = sys.argv[1]; sims = sys.argv[2:]
srcs["NFL"] = collect(R.nfl(nfl))
for s in sims:
    lab, paths = s.split("=", 1)
    srcs[lab] = collect(R.sim(paths.split(",")))
for g in ("carrier", "OL", "LB", "DL", "DB", "WR"):
    print(f"== {g}: accel p50/p90 (yd/s^2) by speed, n")
    print("  speed    " + "  ".join(f"{lab:>18s}" for lab in srcs))
    for lo, hi in BINS:
        cells = []
        for lab in srcs:
            v = [a for (s, a, t) in srcs[lab].get(g, []) if lo <= s < hi]
            cells.append(f"{q(v,.5) or 0:5.2f}/{q(v,.9) or 0:5.2f} n{len(v):5d}" if v else " " * 18)
        print(f"  {lo}-{hi}     " + "  ".join(cells))
