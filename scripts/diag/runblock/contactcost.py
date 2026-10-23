"""What first contact costs a ball carrier who gets through it. One operator
for NFL tracking and sim common plays (first_contact event from each source).

Designed runs whose carrier gains 5+ yd after the first contact (he got
through it). His speed just before contact (0.2 s) and 0.3 / 0.6 / 1.0 /
1.5 s after it, the lowest speed in the first second after it, and the time
to get back to his pre-contact speed. Split by the yard line of the contact
(behind / at the line, 0-5 yd, 5+ yd).

usage: python3 -I contactcost.py LABEL=plays.jsonl.gz [...]"""
import gzip
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "mechanics"))
from metrics import Play  # noqa: E402

q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float("nan")


def speed(p, i, k):
    a, b = max(0, k - 2), min(p.frames - 1, k + 2)
    (x0, y0), (x1, y1) = p.pos(i, a), p.pos(i, b)
    if x0 is None or x1 is None or b == a:
        return None
    return math.hypot(x1 - x0, y1 - y0) / ((b - a) * p.dt)


for arg in sys.argv[1:]:
    label, path = arg.split("=", 1)
    rows = {}
    for line in gzip.open(path, "rt"):
        raw = json.loads(line)
        if raw.get("kind") != "run" or raw.get("carrier") is None:
            continue
        fc = (raw.get("events") or {}).get("first_contact")
        if fc is None:
            continue
        p = Play(raw)
        c = raw["carrier"]
        k0 = p.k(fc)
        x0 = p.pos(c, k0)[0]
        if x0 is None or (raw.get("yards") or 0) - x0 < 5:
            continue
        before = speed(p, c, max(0, k0 - p.k(0.2)))
        if before is None or before < 1:
            continue
        zone = "behind/at line" if x0 < 0.5 else "0-5 yd" if x0 < 5 else "5+ yd"
        # Clean contact: the first contact's man is the nearest defender then;
        # no other defender comes within 1.5 yd of the carrier in the next 1 s.
        ds = [d for d in p.who("D") if p.pos(d, k0)[0] is not None]
        first_man = min(ds, key=lambda d: p.dist(d, c, k0)) if ds else None
        crowd = any(p.dist(d, c, kk) <= 1.5 for d in ds if d != first_man
                    for kk in range(k0, min(p.frames, k0 + p.k(1.0) + 1)))
        zone += " (crowd)" if crowd else " (clean)"
        r = rows.setdefault(zone, {"before": [], 0.3: [], 0.6: [], 1.0: [], 1.5: [], "min": [], "back": []})
        r["before"].append(before)
        sp = []
        for kk in range(k0, min(p.frames, k0 + p.k(1.5) + 1)):
            s = speed(p, c, kk)
            sp.append(s)
        for t in (0.3, 0.6, 1.0, 1.5):
            kk = k0 + p.k(t)
            if kk < p.frames:
                s = speed(p, c, kk)
                if s is not None:
                    r[t].append(s / before)
        first = [s for s in sp[: p.k(1.0) + 1] if s is not None]
        if first:
            r["min"].append(min(first) / before)
        back = next((i * p.dt for i, s in enumerate(sp) if i > 0 and s is not None and s >= before), None)
        r["back"].append(back if back is not None else 9)
    print(f"== {label} (speeds as a share of his speed 0.2 s before contact)")
    for zone in [z + suffix for z in ("behind/at line", "0-5 yd", "5+ yd") for suffix in (" (clean)", " (crowd)")]:
        r = rows.get(zone)
        if not r:
            continue
        print(f"  contact {zone:23s} n {len(r['before']):4d} | before {q(r['before']):.2f} yd/s | after 0.3/0.6/1.0/1.5 s {q(r[0.3]):.2f}/{q(r[0.6]):.2f}/{q(r[1.0]):.2f}/{q(r[1.5]):.2f}"
              f" | lowest in 1 s {q(r['min']):.2f} | back to that speed p50 {q(r['back']):.1f} s")
