"""The QB's pocket movement after the drop: the same operator on NFL tracking
and sim exports (common play format, positions quantized to 0.1 yd by
metrics.Play).

usage: python3 -I scripts/diag/qb-pocket.py NFL.jsonl.gz SIM.jsonl.gz [...]

Dropbacks without play action (as pass-pressure.py) that end in a throw
at least 1.0 s after line start. Depth = yards behind the line.

- Set: the frame of the QB's deepest depth before the throw. Step-up =
  set depth minus depth at the throw; climb onset = the first frame after
  the set 0.3 yd shallower than it. Slide = largest lateral distance from
  the set point before the throw.
- Edge level: the first frame an edge rusher (on the line at the snap,
  outside the tackles) is within 1.0 yd of the QB's depth or deeper, and
  within 4 yd of him laterally. For plays with one before the throw: the
  QB's depth change over the 0.5 s after it (+ = climbed), against the
  same window on plays without one (from 1.0 s after the set).
- Interior: the nearest interior rusher's distance to the QB at the edge
  level frame, binned, against the climb that follows.
"""
import gzip
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "mechanics"))
from metrics import Play  # noqa: E402

q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float("nan")


def first_move(p, i, thr=0.15):
    x0, y0 = p.pos(i, 0)
    prev = 0.0
    for k in range(1, min(p.frames, 25)):
        x, y = p.pos(i, k)
        if x is None:
            return None
        d = math.hypot(x - x0, y - y0)
        if d >= thr:
            return (k - 1 + (thr - prev) / max(d - prev, 1e-9)) * p.dt
        prev = d
    return None


def play_action(raw):
    c = (raw.get("cell") or {}).get("concept")
    if raw.get("source") == "sim":
        return bool(c) and c.startswith("pa_")
    return c not in (None, "NA", "")


def measure(path):
    A = {}
    L = lambda k: A.setdefault(k, [])
    for line in gzip.open(path, "rt"):
        raw = json.loads(line)
        raw = raw.get("common", raw)
        if raw.get("kind") != "pass" or not raw.get("xy") or raw["xy"][0] is None or play_action(raw):
            continue
        throw = raw.get("events", {}).get("pass_forward")
        if throw is None:
            continue
        p = Play(raw)
        qbs = p.who("O", "QB")
        ol = [i for i in p.who("O", "OL") if p.pos(i, 0)[0] is not None]
        if not qbs or len(ol) != 5:
            continue
        qb = qbs[0]
        starts = [first_move(p, i) for i in ol]
        if any(s is None for s in starts):
            continue
        t0 = sorted(starts)[2]
        kt = min(p.frames - 1, p.k(throw))
        if throw - t0 < 1.0 or any(p.pos(qb, k)[0] is None for k in range(kt + 1)):
            continue
        dep = lambda i, k: -p.pos(i, k)[0]
        ks = max(range(kt + 1), key=lambda k: dep(qb, k))
        sx, sy = p.pos(qb, ks)
        L("setDepth").append(dep(qb, ks))
        L("setTime").append(ks * p.dt - t0)
        L("setToThrow").append((kt - ks) * p.dt)
        up = dep(qb, ks) - dep(qb, kt)
        L("stepUp").append(up)
        on = next((k for k in range(ks, kt + 1) if dep(qb, ks) - dep(qb, k) >= 0.3), None)
        if on is not None:
            L("climbOnset").append(on * p.dt - t0)
        L("slide").append(max(abs(p.pos(qb, k)[1] - sy) for k in range(ks, kt + 1)))
        ol.sort(key=lambda i: p.pos(i, 0)[1])
        ylo, yhi = p.pos(ol[0], 0)[1], p.pos(ol[-1], 0)[1]
        line_d = [d for d in p.who("D") if p.pos(d, 0)[0] is not None and 0 < p.pos(d, 0)[0] <= 2.0]
        edges = [d for d in line_d if not ylo < p.pos(d, 0)[1] < yhi and ylo - 4 <= p.pos(d, 0)[1] <= yhi + 4]
        inter = [d for d in line_d if ylo < p.pos(d, 0)[1] < yhi]
        kl = next((k for k in range(kt + 1) for d in edges
                   if p.pos(d, k)[0] is not None and dep(d, k) >= dep(qb, k) - 1.0 and abs(p.pos(d, k)[1] - p.pos(qb, k)[1]) <= 4.0), None)
        k5 = lambda k: min(kt, k + 5)
        if kl is not None:
            climb = dep(qb, kl) - dep(qb, k5(kl))
            L("level:time").append(kl * p.dt - t0)
            L("level:climb").append(climb)
            L("level:qbDepth").append(dep(qb, kl))
            if inter:
                ni = min(p.dist(d, qb, kl) for d in inter)
                b = "<3" if ni < 3 else "3-5" if ni < 5 else "5+"
                L(f"level:climb:int{b}").append(climb)
            L("level:stepUpAfter").append(dep(qb, kl) - dep(qb, kt))
            L("level:slideAfter").append(max(abs(p.pos(qb, k)[1] - p.pos(qb, kl)[1]) for k in range(kl, kt + 1)))
        else:
            k = min(kt, ks + 10)
            L("nolevel:climb").append(dep(qb, k) - dep(qb, k5(k)))
            L("nolevel:stepUpAfterSet").append(up)
            L("nolevel:slide").append(L("slide")[-1])
        L("plays").append(1)
    return A


for path in [a for a in sys.argv[1:] if a.endswith(".gz")]:
    A = measure(path)
    n = len(A.get("plays", []))
    g = lambda k: A.get(k, [])
    f3 = lambda v: f"{q(v, .25):.2f}/{q(v, .5):.2f}/{q(v, .75):.2f}/{q(v, .9):.2f}"
    print(f"== {os.path.basename(path)}: dropbacks without PA ending in a throw 1.0+ s after line start {n}")
    print(f"  set: depth {q(g('setDepth'), .5):.2f} yd at {q(g('setTime'), .5):.2f} s after line start; throw {q(g('setToThrow'), .5):.2f} s later")
    print(f"  step-up p25/50/75/90 {f3(g('stepUp'))} yd; 0.5 yd or more {100 * sum(x >= .5 for x in g('stepUp')) / max(1, n):.0f}%, 1.0 or more {100 * sum(x >= 1 for x in g('stepUp')) / max(1, n):.0f}%; climb onset {q(g('climbOnset'), .5):.2f} s ({100 * len(g('climbOnset')) / max(1, n):.0f}% of plays)")
    print(f"  slide p25/50/75/90 {f3(g('slide'))} yd")
    lv = g("level:climb")
    print(f"  edge level before the throw on {100 * len(lv) / max(1, n):.0f}% at {q(g('level:time'), .5):.2f} s (QB depth then {q(g('level:qbDepth'), .5):.2f}); climb in the next 0.5 s p50/75 {q(lv, .5):+.2f}/{q(lv, .75):+.2f}, "
          f"0.3+ yd {100 * sum(x >= .3 for x in lv) / max(1, len(lv)):.0f}%; step-up from then to the throw p50/75 {q(g('level:stepUpAfter'), .5):+.2f}/{q(g('level:stepUpAfter'), .75):+.2f}")
    nl = g("nolevel:climb")
    print(f"  no edge level: climb in a 0.5 s window from 1.0 s after the set p50/75 {q(nl, .5):+.2f}/{q(nl, .75):+.2f}, 0.3+ yd {100 * sum(x >= .3 for x in nl) / max(1, len(nl)):.0f}%; step-up after the set p50/75 {q(g('nolevel:stepUpAfterSet'), .5):+.2f}/{q(g('nolevel:stepUpAfterSet'), .75):+.2f}")
    print(f"  slide p50/75/90: from edge level to the throw {q(g('level:slideAfter'), .5):.2f}/{q(g('level:slideAfter'), .75):.2f}/{q(g('level:slideAfter'), .9):.2f}; set to throw on plays without one {q(g('nolevel:slide'), .5):.2f}/{q(g('nolevel:slide'), .75):.2f}/{q(g('nolevel:slide'), .9):.2f}")
    print("  climb after edge level by nearest interior rusher then: " + "  ".join(
        f"{b} yd {q(g(f'level:climb:int{b}'), .5):+.2f} (0.3+ {100 * sum(x >= .3 for x in g(f'level:climb:int{b}')) / max(1, len(g(f'level:climb:int{b}'))):.0f}%, n {len(g(f'level:climb:int{b}'))})" for b in ("<3", "3-5", "5+")))
