"""Pursuit angles on designed runs: the same operator on NFL tracking and sim
exports (common play format, positions quantized to 0.1 yd by metrics.Play;
velocities from metrics.Play.velocity on both).

usage: python3 -I scripts/diag/pursuit.py NFL.jsonl.gz SIM.jsonl.gz [...]

Samples: every other frame from the carrier crossing the line (x >= 0) until
he is 15 yd past it or the play ends. Pursuers at a sample: defenders not
within 1.0 yd of any offensive player other than the carrier (not engaged),
more than 1.0 yd from the carrier, moving over 1.5 yd/s, and not behind him
(bearing from his heading within 135 degrees).

- Intercept heading: the direction that meets the carrier if he keeps his
  current velocity and the defender runs at his top speed on the play;
  "can't intercept" when no meeting point exists.
- Error vs intercept: angle between the defender's velocity and that
  heading. Error vs pure pursuit: angle between his velocity and his line
  to the carrier now. Lead = angle between the two ideal headings (how much
  aiming at the carrier costs). Aims at the carrier = nearer the pure line
  than the intercept heading.
- Speed fraction: his speed over his top speed on the play.

Bins: distance to the carrier (0-3, 3-6, 6-10, 10+ yd), carrier speed (<4,
4-6, 6+ yd/s), and carrier just cut (heading changed over 30 degrees within
the last 0.5 s, both speeds over 2 yd/s); and how far the run went (under
10, 10-19, 20+ yd), overall and within / beyond 6 yd of the carrier.
"""
import gzip
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "mechanics"))
from metrics import Play  # noqa: E402

q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float("nan")
DIST = ((0, 3), (3, 6), (6, 10), (10, 99))
SPEED = ((0, 4), (4, 6), (6, 99))


def ang(ax, ay, bx, by):
    return abs(math.degrees(math.atan2(ax * by - ay * bx, ax * bx + ay * by)))


def intercept(dx, dy, vcx, vcy, s):
    """Heading from the defender meeting a carrier at offset (dx, dy) moving
    at (vcx, vcy) when the defender runs at speed s; None if impossible."""
    a = vcx * vcx + vcy * vcy - s * s
    b = 2 * (dx * vcx + dy * vcy)
    c = dx * dx + dy * dy
    if abs(a) < 1e-9:
        t = -c / b if b < 0 else None
    else:
        disc = b * b - 4 * a * c
        if disc < 0:
            return None
        r = [t for t in ((-b - math.sqrt(disc)) / (2 * a), (-b + math.sqrt(disc)) / (2 * a)) if t > 0]
        t = min(r) if r else None
    if t is None:
        return None
    return dx + vcx * t, dy + vcy * t


def binof(v, bins):
    return next(f"{lo}-{hi if hi < 99 else '+'}" for lo, hi in bins if lo <= v < hi)


def measure(path):
    A = {}
    for line in gzip.open(path, "rt"):
        raw = json.loads(line)
        raw = raw.get("common", raw)
        if raw.get("kind") != "run" or raw.get("carrier") is None or not raw.get("xy") or raw["xy"][0] is None:
            continue
        p = Play(raw)
        c = raw["carrier"]
        last = min(p.frames - 1, p.k(p.end))
        if any(p.pos(c, k)[0] is None for k in range(last + 1)):
            continue
        k0 = next((k for k in range(last + 1) if p.pos(c, k)[0] >= 0), None)
        if k0 is None:
            continue
        dfn = [d for d in p.who("D") if p.pos(d, 0)[0] is not None]
        mates = [o for o in p.who("O") if o != c]
        reach = max(p.pos(c, k)[0] for k in range(last + 1))
        band = "r20" if reach >= 20 else "r10" if reach >= 10 else "r0"
        top = {d: max(math.hypot(*p.velocity(d, k)) for k in range(last + 1)) for d in dfn}
        for k in range(k0, last + 1, 2):
            cx, cy = p.pos(c, k)
            if cx > 15:
                break
            vcx, vcy = p.velocity(c, k)
            cs = math.hypot(vcx, vcy)
            if cs < 1.0:
                continue
            cut = False
            if k >= 5:
                pvx, pvy = p.velocity(c, k - 5)
                cut = math.hypot(pvx, pvy) > 2 and cs > 2 and ang(vcx, vcy, pvx, pvy) > 30
            for d in dfn:
                dx, dy = p.pos(d, k)
                rx, ry = cx - dx, cy - dy
                dist = math.hypot(rx, ry)
                if dist <= 1.0 or ang(vcx, vcy, -rx, -ry) > 135:
                    continue
                if any(p.dist(o, d, k) <= 1.0 for o in mates):
                    continue
                vdx, vdy = p.velocity(d, k)
                s = math.hypot(vdx, vdy)
                if s < 1.5:
                    continue
                keys = ("all", "d" + binof(dist, DIST), "c" + binof(cs, SPEED), "cut" if cut else "nocut", band, band + ("near" if dist < 6 else "far"))
                frac = s / max(top[d], 1e-6)
                it = intercept(rx, ry, vcx, vcy, top[d])
                for key in keys:
                    B = A.setdefault(key, {"n": 0, "noInt": 0, "eI": [], "eP": [], "lead": [], "aim": 0, "frac": []})
                    B["n"] += 1
                    B["frac"].append(frac)
                    B["eP"].append(ang(vdx, vdy, rx, ry))
                    if it is None:
                        B["noInt"] += 1
                        continue
                    eI = ang(vdx, vdy, *it)
                    B["eI"].append(eI)
                    B["lead"].append(ang(rx, ry, *it))
                    B["aim"] += ang(vdx, vdy, rx, ry) < eI
    return A


LABELS = [("all", "all")] + [("d" + binof(lo, DIST), f"distance {binof(lo, DIST)} yd") for lo, _ in DIST] + \
         [("c" + binof(lo, SPEED), f"carrier {binof(lo, SPEED)} yd/s") for lo, _ in SPEED] + [("nocut", "no recent cut"), ("cut", "just cut (>30 deg in 0.5 s)")] + \
         [(b + n, f"run reaching {lab}" + {"": "", "near": ", <6 yd", "far": ", 6+ yd"}[n]) for b, lab in (("r0", "<10"), ("r10", "10-19"), ("r20", "20+")) for n in ("", "near", "far")]

for path in [a for a in sys.argv[1:] if a.endswith(".gz")]:
    A = measure(path)
    print(f"== {os.path.basename(path)}")
    print(f"  {'bin':28s} {'samples':>8s} {'err vs intercept':>17s} {'err vs pure':>12s} {'lead needed':>12s} {'aim at carrier':>15s} {'cannot int.':>12s} {'speed/max':>10s}")
    for key, label in LABELS:
        B = A.get(key)
        if not B:
            continue
        ok = len(B["eI"])
        print(f"  {label:28s} {B['n']:8d} {q(B['eI'], .5):13.0f} deg {q(B['eP'], .5):8.0f} deg {q(B['lead'], .5):8.0f} deg {100 * B['aim'] / max(1, ok):14.0f}% {100 * B['noInt'] / B['n']:11.0f}% {q(B['frac'], .5):10.2f}")
