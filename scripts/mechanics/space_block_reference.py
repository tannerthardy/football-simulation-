#!/usr/bin/env python3
"""Blocks in space on screens: what happens inside the block, and whether the
carrier runs off it. Same position-only code for NFL (nfl_screens.py) and the
sim screen lab.

    python3 -I scripts/mechanics/space_block_reference.py PLAYS.jsonl.gz [...] [--by group|type]

Blocks: as screen_reference.py (an offensive non-carrier within 1.2 yd of a
defender for >= 0.3 s, starting after the catch - 1.0 s, past the line or
wide). For each block, over its contact (until apart > 1.2 yd for 0.2 s):
- defender speed and blocker speed (yd/s, mean over the contact);
- the pair's travel: how far the contact midpoint moves (yd) per second;
- the defender's progress toward the carrier: his distance to the carrier at
  the start minus at the end, per second of contact (yd/s; + = he gains).
Running off the block: for blocks under way when the carrier first comes
within 3 yd of the pair's midpoint (after the catch), the side the carrier
passes the blocker on relative to his own direction, compared with the side
the defender is on. "Off the block" = opposite sides (the blocker is between
the defender and the carrier); "into the man" = same side.
"""
import argparse, collections, gzip, json, math, sys

NEAR, HOLD, APART = 1.2, 3, 2


def q(v):
    v = sorted(x for x in v if x is not None)
    return f"{v[len(v)//4]:.2f}/{v[len(v)//2]:.2f}/{v[(3*len(v))//4]:.2f}" if v else "-"


def measure(p):
    sc = p.get("screen") or {}
    r = sc.get("receiver", p.get("target"))
    ev = p.get("events", {})
    tc = ev.get("pass_arrived", ev.get("catch")) if "catch" in ev else None
    if r is None or tc is None:
        return None
    xy, dt = p["xy"], p.get("dt", 0.1)
    n = len(xy)
    P = lambda f, j: (xy[min(f, n - 1)][2 * j], xy[min(f, n - 1)][2 * j + 1])
    k = lambda t: max(0, min(n - 1, int(round(t / dt))))
    kc, k1 = k(tc), k(ev.get("end", (n - 1) * dt))
    by = p.get("ball_y", 26.65)
    players = p["players"]
    off = [j for j, q in enumerate(players) if q["side"] == "O" and j != r]
    de = [j for j, q in enumerate(players) if q["side"] == "D"]
    dist = lambda f, a, b: math.hypot(P(f, a)[0] - P(f, b)[0], P(f, a)[1] - P(f, b)[1])
    blocks = []
    for b in off:
        for d in de:
            run = 0
            for f in range(k(max(0, tc - 1.0)), k1 + 1):
                if dist(f, b, d) <= NEAR:
                    run += 1
                    if run == HOLD:
                        f0 = f - HOLD + 1
                        cx, cy = (P(f0, b)[0] + P(f0, d)[0]) / 2, (P(f0, b)[1] + P(f0, d)[1]) / 2
                        if cx > 1.0 or abs(cy - by) > 5:
                            g, apart = f0, 0
                            while g < k1 and apart < APART:
                                g += 1
                                apart = apart + 1 if dist(g, b, d) > NEAR else 0
                            f1 = max(f0 + 1, g - apart)
                            blocks.append((b, d, f0, f1))
                        break
                else:
                    run = 0
    rows = []
    for b, d, f0, f1 in blocks:
        T = (f1 - f0) * dt
        sp = lambda j: sum(math.hypot(P(f + 1, j)[0] - P(f, j)[0], P(f + 1, j)[1] - P(f, j)[1]) for f in range(f0, f1)) / T
        mid = lambda f: ((P(f, b)[0] + P(f, d)[0]) / 2, (P(f, b)[1] + P(f, d)[1]) / 2)
        m0, m1 = mid(f0), mid(f1)
        start = max(f0, kc)
        gain = (dist(start, d, r) - dist(f1, d, r)) / max(dt, (f1 - start) * dt) if f1 > start else None
        rows.append({"kind": "block", "group": players[b]["group"], "d_speed": sp(d), "b_speed": sp(b),
                     "travel": math.hypot(m1[0] - m0[0], m1[1] - m0[1]) / T, "gain": gain, "dur": T})
        # Running off the block: first frame after the catch the carrier is within 3 yd of the pair, while in contact.
        for f in range(max(f0, kc), f1 + 1):
            m = mid(f)
            cx, cy = P(f, r)
            if math.hypot(cx - m[0], cy - m[1]) <= 3.0:
                vx, vy = P(min(n - 1, f + 2), r)[0] - P(max(0, f - 2), r)[0], P(min(n - 1, f + 2), r)[1] - P(max(0, f - 2), r)[1]
                L = math.hypot(vx, vy)
                if L < 0.2:
                    break
                ux, uy = vx / L, vy / L
                side = lambda j: math.copysign(1, ux * (P(f, j)[1] - cy) - uy * (P(f, j)[0] - cx))
                rows.append({"kind": "pass", "off": side(b) != side(d) or dist(f, b, d) > NEAR and False,
                             "carrier_side_of_blocker": None})
                # Carrier relative to the blocker: which side of the blocker is the defender, and which side is the carrier?
                bx, by2 = P(f, b)
                d_side = math.copysign(1, ux * (P(f, d)[1] - by2) - uy * (P(f, d)[0] - bx))
                c_side = math.copysign(1, ux * (cy - by2) - uy * (cx - bx))
                rows[-1]["off"] = d_side != c_side
                break
    return {"group": players[r]["group"], "type": sc.get("type") or players[r]["group"], "rows": rows}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("plays", nargs="+")
    ap.add_argument("--by", default="group", choices=["group", "type"])
    a = ap.parse_args()
    groups = collections.defaultdict(list)
    for path in a.plays:
        for line in gzip.open(path, "rt"):
            m = measure(json.loads(line))
            if m:
                groups[m[a.by]].extend(m["rows"])
    for g, R in sorted(groups.items()):
        B = [x for x in R if x["kind"] == "block"]
        S = [x for x in R if x["kind"] == "pass"]
        if not B:
            continue
        print(f"== {g}: {len(B)} blocks in space")
        print(f"  in contact: defender speed {q([x['d_speed'] for x in B])} yd/s, blocker {q([x['b_speed'] for x in B])} yd/s, pair travel {q([x['travel'] for x in B])} yd/s, duration {q([x['dur'] for x in B])} s")
        print(f"  defender's gain on the carrier while blocked {q([x['gain'] for x in B])} yd/s")
        if S:
            print(f"  carrier passing a live block (n {len(S)}): off the block {sum(x['off'] for x in S)/len(S):.0%}, into the defender's side {1 - sum(x['off'] for x in S)/len(S):.0%}")


if __name__ == "__main__":
    sys.exit(main())
