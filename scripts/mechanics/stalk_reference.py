#!/usr/bin/env python3
"""Stalk blocks on WR/TE screens: the blocker and his man, NFL vs sim, same code.

    python3 -I scripts/mechanics/stalk_reference.py out/screens/nfl-screens.jsonl.gz out/screens/sim-screens.jsonl.gz

Blocker: a detached (> 3.5 yd from the ball) WR/TE on a WR/TE screen who is not
the target and runs no route (NFL: routeRan empty; sim: tagged screen.blockers).
His man: the first defender he stays within 1.2 yd of for >= 0.3 s (the
block), else the defender nearest him at the snap ("no block"). Grouped by
the man's group; the DB rows are the perimeter stalk.
Per time t in 0, 0.3, 0.6, 0.9, 1.2 s, and at the catch: gap to his man; the
blocker's downfield/lateral displacement since the snap; his man's downfield
displacement (negative = toward the LOS) and speed. First contact: first time
the gap is <= 1.2 yd, relative to the catch.
"""
import gzip, json, math, sys, collections

T = (0.0, 0.3, 0.6, 0.9, 1.2)


def q(v):
    v = sorted(x for x in v if x is not None)
    return f"{v[len(v)//4]:.1f}/{v[len(v)//2]:.1f}/{v[(3*len(v))//4]:.1f}" if v else "-"


def rows(path):
    with gzip.open(path, "rt") as fh:
        for line in fh:
            p = json.loads(line)
            sc = p.get("screen") or {}
            r = sc.get("receiver")
            if r is None or p["players"][r]["group"] not in ("WR", "TE"):
                continue
            ev = p["events"]; tc = ev.get("catch", ev.get("pass_arrived"))
            xy = p["xy"]; dt = p.get("dt", 0.1); n = len(xy)
            P = lambda k, j: (xy[min(k, n - 1)][2 * j], xy[min(k, n - 1)][2 * j + 1])
            if "blockers" in sc:
                cands = sc["blockers"]
            else:
                cands = [j for j, rt in enumerate(sc.get("routes", [])) if j < len(p["players"]) and p["players"][j]["side"] == "O" and not rt]
            de = [j for j, pl in enumerate(p["players"]) if pl["side"] == "D"]
            for b in cands:
                if b == r or p["players"][b]["group"] not in ("WR", "TE"):
                    continue
                if abs(P(0, b)[1] - p.get("ball_y", 26.65)) <= 3.5:
                    continue
                m, blocked = None, False
                for k in range(2, n):
                    for d in de:
                        if all(math.dist(P(k + i, b), P(k + i, d)) <= 1.2 for i in range(3)):
                            m, blocked = d, True
                            break
                    if m is not None:
                        break
                if m is None:
                    m = min(de, key=lambda d: math.dist(P(0, b), P(0, d)))
                ks = [int(round(t / dt)) for t in T] + ([int(round(tc / dt))] if tc is not None else [])
                out = []
                for k in ks:
                    bx, by = P(k, b); mx, my = P(k, m)
                    a, c = max(0, k - 2), min(n - 1, k + 2)
                    ms = math.dist(P(a, m), P(c, m)) / max(dt, (c - a) * dt)
                    out.append({"gap": math.dist((bx, by), (mx, my)), "bdown": bx - P(0, b)[0],
                                "blat": abs(by - P(0, b)[1]), "mdown": mx - P(0, m)[0], "mspd": ms})
                first = next((k for k in range(n) if math.dist(P(k, b), P(k, m)) <= 1.2), None)
                yield {"t": out, "contact": None if first is None or tc is None else first * dt - tc, "has_catch": tc is not None,
                       "mgroup": p["players"][m]["group"] + ("" if blocked else " (no block)")}


for path in sys.argv[1:]:
  allR = list(rows(path))
  for grp in ("DB", "LB", "DL"):
    R = [r for r in allR if r["mgroup"] == grp]
    if not R:
        continue
    print(f"\n== man {grp}")
    print(f"{path}: {len(R)} of {len(allR)} blockers; all men: {dict(collections.Counter(r['mgroup'] for r in allR))}")
    labels = [f"{t:.1f}s" for t in T] + ["catch"]
    for i, lab in enumerate(labels):
        S = [r["t"][i] for r in R if i < len(r["t"])]
        print(f"  {lab:6} gap {q([s['gap'] for s in S])} | blocker down {q([s['bdown'] for s in S])} lat {q([s['blat'] for s in S])} | man down {q([s['mdown'] for s in S])} speed {q([s['mspd'] for s in S])}")
    C = [r["contact"] for r in R if r["contact"] is not None]
    print(f"  first contact (gap <= 1.2) rel. catch {q(C)} s; never {sum(r['contact'] is None for r in R)}/{len(R)}")
