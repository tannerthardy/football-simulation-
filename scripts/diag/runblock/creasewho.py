"""Who frames the crease on an inside run, and who is free to close it. One
operator for NFL tracking and sim common plays.

Inside runs: inside zone, duo and gap/pull concepts. The crossing is the
first frame with the carrier at or past the line (x >= 0). There, among
defenders within 1.5 yd of the carrier's depth, the nearest one on each side
laterally frames the hole. Each defender is classed by his snap depth (line
0-2 yd, second level 2-7.5, deep beyond) and as blocked when an offensive
player is within 1.0 yd of him. Free defenders: unblocked, within 2 / 4 yd of
the carrier. Second level: each off-ball box defender's distance to the
carrier and depth past the line at the crossing. Rows split by outcome
(gain under 10, 10+).

usage: python3 -I creasewho.py LABEL=plays.jsonl.gz [LABEL=...]"""
import gzip
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "mechanics"))
from metrics import CONCEPT_FAMILY, Play  # noqa: E402

INSIDE = ("inside_zone", "man_duo", "gap_pull")
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float("nan")
pct = lambda a, n: f"{100 * a / max(n, 1):.0f}%"


def level(x0):
    return "line" if x0 <= 2 else "second" if x0 <= 7.5 else "deep"


for arg in sys.argv[1:]:
    label, path = arg.split("=", 1)
    rows = {"<10": [], "10+": []}
    for line in gzip.open(path, "rt"):
        raw = json.loads(line)
        if raw.get("kind") != "run" or raw.get("carrier") is None:
            continue
        if CONCEPT_FAMILY.get((raw.get("cell") or {}).get("concept")) not in INSIDE:
            continue
        p = Play(raw)
        c = raw["carrier"]
        k = next((k for k in range(p.frames) if p.pos(c, k)[0] is not None and p.pos(c, k)[0] >= 0), None)
        if not k:
            continue
        cx, cy = p.pos(c, k)
        off = [i for i in p.who("O") if i != c and p.pos(i, k)[0] is not None]
        dfs = [i for i in p.who("D") if p.pos(i, k)[0] is not None and p.pos(i, 0)[0] is not None]
        blocked = {d: any(p.dist(o, d, k) <= 1.0 for o in off) for d in dfs}
        near = [d for d in dfs if abs(p.pos(d, k)[0] - cx) <= 1.5]
        sides = []
        for s in (-1, 1):
            cand = [d for d in near if (p.pos(d, k)[1] - cy) * s > 0 and abs(p.pos(d, k)[1] - cy) <= 8]
            if cand:
                d = min(cand, key=lambda d: abs(p.pos(d, k)[1] - cy))
                kb = max(0, k - round(1.0 / p.dt))
                yb = p.pos(d, kb)[1]
                # Closing: his lateral move toward the hole's y over the last second.
                close = None if yb is None else abs(yb - cy) - abs(p.pos(d, k)[1] - cy)
                sides.append((abs(p.pos(d, k)[1] - cy), level(p.pos(d, 0)[0]), blocked[d], close, None if yb is None else abs(yb - cy)))
        dist = {d: math.hypot(p.pos(d, k)[0] - cx, p.pos(d, k)[1] - cy) for d in dfs}
        free2 = sum(1 for d in dfs if not blocked[d] and dist[d] <= 2)
        free4 = sum(1 for d in dfs if not blocked[d] and dist[d] <= 4)
        second = [d for d in dfs if 2 < p.pos(d, 0)[0] <= 7.5 and abs(p.pos(d, 0)[1] - raw["ball_y"]) <= 6.5]
        sec = [(dist[d], p.pos(d, k)[0], blocked[d]) for d in second]
        rows["10+" if (raw.get("yards") or 0) >= 10 else "<10"].append(
            {"t": k * p.dt, "sides": sides, "free2": free2, "free4": free4, "sec": sec})
    print(f"== {label}")
    for name, rs in rows.items():
        n = len(rs)
        if not n:
            continue
        frame = [s for r in rs for s in r["sides"]]
        near_side = [min(r["sides"])[0] for r in rs if r["sides"]]
        lv = {l: sum(1 for s in frame if s[1] == l) for l in ("line", "second", "deep")}
        bl = sum(1 for s in frame if s[2])
        sec = [s for r in rs for s in r["sec"]]
        cells = []
        for lvl in ("line", "second"):
            for bk in (True, False):
                f = [x for x in frame if x[1] == lvl and x[2] == bk]
                cells.append(f"{lvl}-{'blocked' if bk else 'free'} {pct(len(f), len(frame))} at {q([x[0] for x in f]):.2f} closed {q([x[3] for x in f if x[3] is not None]):+.2f}")
        by_kind = "; ".join(cells)
        print(f"  {name}: runs {n} ({pct(n, sum(len(v) for v in rows.values()))}) | crossed p50 {q([r['t'] for r in rs]):.1f} s"
              f" | near-side framer {q(near_side):.2f} yd | framers line/second/deep {pct(lv['line'], len(frame))}/{pct(lv['second'], len(frame))}/{pct(lv['deep'], len(frame))}, blocked {pct(bl, len(frame))}"
              f" | free within 2 yd {q([r['free2'] for r in rs], .5)} (none {pct(sum(r['free2'] == 0 for r in rs), n)}), within 4 yd {q([r['free4'] for r in rs]):.0f} (none {pct(sum(r['free4'] == 0 for r in rs), n)})"
              f" | framers 1 s before: off the hole {q([f[4] for f in frame if f[4] is not None]):.2f}, closed blocked {q([f[3] for f in frame if f[2] and f[3] is not None]):+.2f} / free {q([f[3] for f in frame if not f[2] and f[3] is not None]):+.2f}"
              f"\n      framers by kind (share, yd off the hole, closed in the last 1 s): {by_kind}"
              f"\n      second level: dist p50 {q([s[0] for s in sec]):.2f}, depth {q([s[1] for s in sec]):+.2f}, blocked {pct(sum(s[2] for s in sec), len(sec))}")
