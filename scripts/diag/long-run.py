"""The long-run tail: pursuit, deep support and tackling on designed runs,
the same operator on NFL tracking and sim exports (common play format,
positions quantized to 0.1 yd by metrics.Play; velocities from
metrics.Play.velocity on both).

usage: python3 -I scripts/diag/long-run.py NFL.jsonl.gz SIM.jsonl.gz [...]

Designed runs with a carrier. x = yards past the line (the ball at the
snap). A run "reaches" N if the carrier's x gets to N on any frame.

1. At the first frame he reaches 5 and 10 yd: the three nearest defenders,
   each with distance, group (deep DB = a DB 8+ yd deep at the snap), and
   bearing from his heading (front within 45 degrees, behind beyond 135,
   beside otherwise).
2. For each of those moving over 2 yd/s and not behind him: closing speed
   (rate the distance shrinks), and his heading against the intercept
   heading (the direction that meets the carrier given the carrier's
   velocity and the defender's top speed on the play). "Chasing" = his heading is
   nearer the line to where the carrier is now than to that intercept
   heading; "can't intercept" = no meeting point at those speeds.
3. Deep support: defenders 8+ yd deep and within 12 yd of the ball
   laterally at the snap. At the handoff: depth and lateral distance from
   the ball; then forward speed (toward the line) 0.5 and 1.0 s after it.
   All runs and runs reaching 20, separately; and when the carrier reaches
   10 yd, their distance to him, how far ahead of him and how far lateral.
4. Runs reaching 20: between the frames he reaches 10 and 20, how many
   defenders came within 2.0 yd and within 1.0 yd of him (chances that did
   not stop him), and the first defender within 1.0 yd after 10 yd.
"""
import gzip
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "mechanics"))
from metrics import CONCEPT_FAMILY, Play  # noqa: E402

q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float("nan")
FAMILIES = ("zone", "gap", "other")


def family(raw):
    f = CONCEPT_FAMILY.get((raw.get("cell") or {}).get("concept"))
    return "zone" if f in ("inside_zone", "outside_zone") else "gap" if f in ("gap_pull", "man_duo") else "other"


def intercept(dx, dy, vcx, vcy, s):
    """Unit heading from the defender (at -dx,-dy from the carrier... given as
    carrier minus defender = (dx, dy)) that meets the carrier moving at
    (vcx, vcy) when the defender runs at speed s; None if impossible."""
    a = vcx * vcx + vcy * vcy - s * s
    b = 2 * (dx * vcx + dy * vcy)
    c = dx * dx + dy * dy
    if abs(a) < 1e-9:
        t = -c / b if b < 0 else None
    else:
        disc = b * b - 4 * a * c
        if disc < 0:
            return None
        r = [(-b - math.sqrt(disc)) / (2 * a), (-b + math.sqrt(disc)) / (2 * a)]
        r = [t for t in r if t > 0]
        t = min(r) if r else None
    if t is None:
        return None
    px, py = dx + vcx * t, dy + vcy * t
    n = math.hypot(px, py) or 1.0
    return px / n, py / n


def ang(ax, ay, bx, by):
    return abs(math.degrees(math.atan2(ax * by - ay * bx, ax * bx + ay * by)))


def measure(path):
    A = {}
    L = lambda k: A.setdefault(k, [])
    for line in gzip.open(path, "rt"):
        raw = json.loads(line)
        raw = raw.get("common", raw)
        if raw.get("kind") != "run" or raw.get("carrier") is None or not raw.get("xy") or raw["xy"][0] is None:
            continue
        p = Play(raw)
        c = raw["carrier"]
        fam = family(raw)
        last = min(p.frames - 1, p.k(p.end))
        xs = [p.pos(c, k)[0] for k in range(last + 1)]
        if any(x is None for x in xs):
            continue
        dfn = [d for d in p.who("D") if p.pos(d, 0)[0] is not None]
        deep0 = {d for d in dfn if p.players[d]["group"] == "DB" and p.pos(d, 0)[0] >= 8}
        gname = lambda d: "deepDB" if d in deep0 else p.players[d]["group"]
        top = max(xs)
        tops = {}

        def top_speed(d):
            if d not in tops:
                tops[d] = max(math.hypot(*p.velocity(d, k)) for k in range(last + 1))
            return tops[d]
        for g in (fam, "all"):
            L(f"{g}:runs").append(1)
            for n in (10, 20, 40):
                if top >= n:
                    L(f"{g}:reach{n}").append(1)
        # 3. Deep support at the handoff.
        kh = p.k(p.events.get("handoff", 0.0))
        by = raw["ball_y"]
        support = [d for d in dfn if p.pos(d, 0)[0] >= 8 and abs(p.pos(d, 0)[1] - by) <= 12]
        for d in support:
            for tag in ("all",) + (("reach20",) if top >= 20 else ()):
                L(f"deep:{tag}:depth").append(p.pos(d, kh)[0])
                L(f"deep:{tag}:width").append(abs(p.pos(d, kh)[1] - by))
                for t in (0.5, 1.0):
                    k = kh + int(round(t / p.dt))
                    if k <= last:
                        L(f"deep:{tag}:fwd@{t}").append(-p.velocity(d, k)[0])
        if top < 10:
            continue
        band = "reach20" if top >= 20 else "10to19"
        # 1-2. Nearest defenders at 5 and 10 yd.
        for mark in (5, 10):
            k = next(k for k in range(last + 1) if xs[k] >= mark)
            cx, cy = p.pos(c, k)
            vcx, vcy = p.velocity(c, k)
            if math.hypot(vcx, vcy) < 0.5:
                continue
            near = sorted(dfn, key=lambda d: p.dist(d, c, k))[:3]
            for rank, d in enumerate(near):
                dx, dy = p.pos(d, k)
                rx, ry = dx - cx, dy - cy
                dist = math.hypot(rx, ry)
                b = ang(vcx, vcy, rx, ry)
                where = "front" if b < 45 else "behind" if b > 135 else "beside"
                key = f"{band}@{mark}"
                L(f"{key}:dist{rank}").append(dist)
                L(f"{key}:who").append(f"{gname(d)} {where}")
                vdx, vdy = p.velocity(d, k)
                s = math.hypot(vdx, vdy)
                if where == "behind" or s < 2.0 or dist < 1e-6:
                    continue
                s = max(s, top_speed(d))
                L(f"{key}:closing").append(-((vdx - vcx) * rx + (vdy - vcy) * ry) / dist)
                it = intercept(cx - dx, cy - dy, vcx, vcy, s)
                if it is None:
                    L(f"{key}:pursuit").append("can't intercept")
                    continue
                err = ang(vdx, vdy, *it)
                L(f"{key}:angleErr").append(err)
                pure = ang(vdx, vdy, cx - dx, cy - dy)
                L(f"{key}:pursuit").append("chasing" if pure < err else "leading")
            if mark == 10:
                for d in support:
                    dx, dy = p.pos(d, k)
                    L(f"deep:{band}@10:dist").append(p.dist(d, c, k))
                    L(f"deep:{band}@10:ahead").append(dx - cx)
                    L(f"deep:{band}@10:lateral").append(abs(dy - cy))
        if top < 20:
            continue
        k10 = next(k for k in range(last + 1) if xs[k] >= 10)
        k20 = next(k for k in range(last + 1) if xs[k] >= 20)
        within2 = {d for d in dfn for k in range(k10, k20 + 1) if p.dist(d, c, k) <= 2.0}
        within1 = {d for d in dfn for k in range(k10, k20 + 1) if p.dist(d, c, k) <= 1.0}
        L("long:within2").append(len(within2))
        L("long:within1").append(len(within1))
        first = next((d for k in range(k10, last + 1) for d in dfn if p.dist(d, c, k) <= 1.0), None)
        L("long:firstTouch").append(gname(first) if first is not None else "none")
    return A


def counts(v):
    out = {}
    for x in v:
        out[x] = out.get(x, 0) + 1
    return ", ".join(f"{k} {100 * c / len(v):.0f}%" for k, c in sorted(out.items(), key=lambda z: -z[1]))


for path in [a for a in sys.argv[1:] if a.endswith(".gz")]:
    A = measure(path)
    print(f"== {os.path.basename(path)}")
    for g in FAMILIES + ("all",):
        n = len(A.get(f"{g}:runs", []))
        if n:
            print(f"  {g:5s} runs {n:5d}: reach 10/20/40 yd " + "/".join(f"{100 * len(A.get(f'{g}:reach{m}', [])) / n:.1f}" for m in (10, 20, 40)) + "%")
    for band in ("10to19", "reach20"):
        for mark in (5, 10):
            key = f"{band}@{mark}"
            if not A.get(f"{key}:who"):
                continue
            d = [q(A.get(f"{key}:dist{r}", []), .5) for r in range(3)]
            print(f"  {band} at {mark} yd: nearest 3 defenders {d[0]:.1f}/{d[1]:.1f}/{d[2]:.1f} yd; {counts(A[f'{key}:who'])}")
            print(f"    movers not behind him: closing {q(A.get(f'{key}:closing', []), .5):+.2f} yd/s; heading off the intercept {q(A.get(f'{key}:angleErr', []), .5):.0f} deg; {counts(A.get(f'{key}:pursuit', ['n/a']))}")
    for tag in ("all", "reach20"):
        g = lambda k: A.get(f"deep:{tag}:{k}", [])
        if g("depth"):
            print(f"  deep support ({tag}, {len(g('depth'))} defenders): at the handoff depth {q(g('depth'), .5):.1f}, width {q(g('width'), .5):.1f}; forward speed +0.5/+1.0 s {q(g('fwd@0.5'), .5):+.2f}/{q(g('fwd@1.0'), .5):+.2f} yd/s")
    for band in ("10to19", "reach20"):
        g = lambda k: A.get(f"deep:{band}@10:{k}", [])
        if g("dist"):
            print(f"  deep support when he reaches 10 yd ({band}, {len(g('dist'))} defenders): distance {q(g('dist'), .5):.1f}, ahead of him {q(g('ahead'), .5):+.1f}, lateral {q(g('lateral'), .5):.1f} yd")
    if A.get("long:within2"):
        print(f"  runs reaching 20 ({len(A['long:within2'])}): defenders within 2 / 1 yd between 10 and 20 yd, mean {sum(A['long:within2']) / len(A['long:within2']):.2f} / {sum(A['long:within1']) / len(A['long:within1']):.2f}; none within 2 yd {100 * sum(1 for x in A['long:within2'] if x == 0) / len(A['long:within2']):.0f}%")
        print(f"    first within 1 yd after 10 yd: {counts(A['long:firstTouch'])}")
