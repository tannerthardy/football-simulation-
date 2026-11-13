"""Zone runs, NFL vs sim, by concept: do play-side line defenders get off their blocks, and where?

Population: defenders 0-1.6 yd deep at the snap, within 6 yd of the OL centre, on the play side (the
side the OL's mean lateral motion takes at 1.0 s, as in run-operators/deephit2.py).
Blocked at a frame: an offensive non-carrier within 1.2 yd (hitblk's rule). His block starts at the
first frame he is blocked in the first 1.5 s. Released within W: unblocked at any frame in the next W
(offblock's rule). Depth at release: x at that first unblocked frame (+ = defensive side of the LOS).
Frames are 0.1 s. NFL rows: out/mechanics/nfl-plays.jsonl.gz; sim rows: run-operators dump-zone.mts
with the `off` argument.
usage: python3 -I scripts/diag/offblock-concept.py <nfl.jsonl.gz or sim.jsonl> [more files]"""
import sys, json, gzip, math, statistics as st, collections


def plays(path):
    if path.endswith(".gz"):
        with gzip.open(path, "rt") as f:
            for line in f:
                p = json.loads(line)
                if p["kind"] != "run" or p["carrier"] is None or p["cell"]["concept"] not in ("OUTSIDE ZONE", "INSIDE ZONE"):
                    continue
                c, pl, X = p["carrier"], p["players"], p["xy"]
                OL = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
                if len(OL) != 5:
                    continue
                O = [i for i, q in enumerate(pl) if q["side"] == "O" and i != c]
                D = [i for i, q in enumerate(pl) if q["side"] == "D"]
                yield (p["cell"]["concept"][:2], [[r[2 * i + 1] for i in OL] for r in X],
                       [[(r[2 * i], r[2 * i + 1]) for i in O] for r in X], [[(r[2 * i], r[2 * i + 1]) for i in D] for r in X])
    else:
        for line in open(path):
            r = json.loads(line)
            yield r["concept"][:2], r["ol"], [[tuple(q) for q in f] for f in r["off"]], [[tuple(q) for q in f] for f in r["def"]]


for path in sys.argv[1:]:
    N = collections.Counter(); R = collections.Counter(); DEP = collections.defaultdict(list)
    for con, ol, off, df in plays(path):
        if len(df) < 26:
            continue
        cy = sum(ol[0]) / 5
        flow = sum(ol[10]) / 5 - cy
        if abs(flow) < 0.2:
            continue
        for j, (x0, y0) in enumerate(df[0]):
            if not (0 < x0 <= 1.6 and abs(y0 - cy) <= 6) or (y0 - cy) * flow <= 0:
                continue
            blocked = lambda f: min(math.dist(o, df[f][j]) for o in off[f]) <= 1.2
            start = next((f for f in range(1, 16) if blocked(f)), None)
            if start is None:
                continue
            N[con] += 1
            for w in (10, 15):
                rel = next((f for f in range(start + 1, min(len(df), start + w + 1)) if not blocked(f)), None)
                if rel is not None:
                    R[(con, w)] += 1
                    if w == 15:
                        DEP[con].append(df[rel][j][0])
    print("==", path.split("/")[-1])
    for con in ("OU", "IN"):
        n = N[con]
        if not n:
            continue
        d = DEP[con]
        print(f"  {con} play-side line defenders blocked n {n}: off within 1.0 s {100 * R[(con, 10)] / n:.0f}%,"
              f" within 1.5 s {100 * R[(con, 15)] / n:.0f}%; depth at release median {st.median(d):+.2f}"
              f" (p25 {st.quantiles(d, n=4)[0]:+.2f}), in backfield (< -1 yd) {100 * sum(x < -1 for x in d) / n:.0f}% of all" if len(d) > 3 else "")
