"""Where pressure comes from: the same operator on NFL tracking and sim
exports (common play format, positions quantized to 0.1 yd by metrics.Play).

usage: python3 -I scripts/diag/pass-pressure.py NFL.jsonl.gz SIM.jsonl.gz [...]

Dropbacks without play action (as pass-contact.py), five OL, a QB.
Pressure is metrics.py's: the first frame from 0.5 s to the throw (or the
end, capped at 4 s) with a defender within 2.0 yd of the QB. The pressurer
is the defender nearest the QB at that frame.

Everything below is from positions, identically on both sources (no block
labels or contact events):
- Who, by alignment at the snap: interior (on the defense's side within 2
  yd of the line, between the tackles), edge (on the line, outside them),
  off the ball (more than 2 yd deep: blitzing LB/DB, or a late rusher).
- Engaged: within 1.0 yd of an offensive non-QB player for 2+ consecutive
  frames (0.2 s). Never engaged before the pressure = unblocked.
- Release: his last engaged frame before the pressure. Still engaged = that
  frame is the pressure frame or the one before (the blocker is driven into
  the QB). Otherwise the escape is read on the next frame, relative to that
  blocker, with forward = blocker to QB: through (within 35 degrees of
  forward), outside (farther from the QB laterally than the blocker) or
  inside.
- Rep outcome for every engaged line rusher: free = after his last
  engagement, 2+ frames with no offensive player within 1.5 yd while nearer
  the QB than that blocker, before the window ends.
Times are from the play's line start (pass-contact.py), which cancels the
tracked NFL snap frame's lag.
"""
import gzip
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "mechanics"))
from metrics import PRESSURE_OPERATOR, Play  # noqa: E402

CONTACT, FREE = 1.0, 1.5
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


def episodes(p, d, blockers, last):
    """Engagement frames (k, nearest blocker) where some blocker is within
    CONTACT yd for 2+ consecutive frames, through frame `last`."""
    near = []
    for k in range(last + 1):
        ds = [(p.dist(b, d, k), b) for b in blockers]
        m = min(ds) if ds else (math.inf, None)
        near.append(m if m[0] <= CONTACT else None)
    eng = []
    for k in range(last + 1):
        if near[k] and ((k > 0 and near[k - 1]) or (k < last and near[k + 1])):
            eng.append((k, near[k][1]))
    return eng


def escape(p, d, b, k, qb):
    bx, by = p.pos(b, k)
    rx, ry = p.pos(d, k)
    qx, qy = p.pos(qb, k)
    if None in (bx, rx, qx):
        return None
    ux, uy = qx - bx, qy - by
    n = math.hypot(ux, uy) or 1.0
    ux, uy = ux / n, uy / n
    along = (rx - bx) * ux + (ry - by) * uy
    lat = (rx - bx) * -uy + (ry - by) * ux
    out = math.copysign(1.0, by - qy) if abs(by - qy) > 0.05 else 1.0
    lat_out = (ry - by) * out  # + = farther from the QB laterally than the blocker
    if along > 0 and abs(math.degrees(math.atan2(abs(lat), along))) < 35:
        return "through"
    return "outside" if lat_out > 0 else "inside"


def measure(path):
    A = {"plays": 0, "pressured": 0, "pressureObserved": 0, "pressureUnknown": 0}
    L = lambda k: A.setdefault(k, [])

    for line in gzip.open(path, "rt"):
        raw = json.loads(line)
        raw = raw.get("common", raw)
        if raw.get("kind") != "pass" or not raw.get("xy") or raw["xy"][0] is None or play_action(raw):
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
        throw = p.events.get("pass_forward")
        wend = throw if throw is not None else min(p.end, 4.0)
        last = min(p.frames - 1, p.k(wend))
        blockers = [i for i in p.who("O") if i != qb]
        ys = sorted(p.pos(i, 0)[1] for i in ol)
        defenders = p.who("D")

        def group(d):
            x0, y0 = p.pos(d, 0)
            if x0 is None:
                return None
            if x0 > 2.0:
                return "offBall"
            if x0 <= 0:
                return None
            return "interior" if ys[0] < y0 < ys[-1] else "edge"

        A["plays"] += 1
        eng = {}
        for d in defenders:
            g = group(d)
            if g is None:
                continue
            eng[d] = (g, episodes(p, d, blockers, last))
        # Rep outcome for engaged line rushers.
        for d, (g, e) in eng.items():
            if g == "offBall" or not e:
                continue
            kr, b = e[-1]
            free, run = None, 0
            for k in range(kr + 1, last + 1):
                clear = min(p.dist(o, d, k) for o in blockers) > FREE
                past = p.dist(d, qb, k) < p.dist(b, qb, k)
                run = run + 1 if clear and past else 0
                if run >= 2:
                    free = k - 1
                    break
            L(f"rep:{g}").append(free is not None)
            if free is not None:
                L(f"repFreeTime:{g}").append(free * p.dt - t0)
                L(f"repEngagedFor:{g}").append((kr - e[0][0] + 1) * p.dt)
        pressure = p.pressure(qb)
        A["pressureObserved"] += pressure.value is not None
        A["pressureUnknown"] += pressure.value is None
        pk = pressure.first
        if pk is None:
            continue
        A["pressured"] += 1
        d = min(defenders, key=lambda d: p.dist(d, qb, pk))
        g, e = eng.get(d, (group(d) or "other", []))
        e = [(k, b) for k, b in e if k < pk]
        L("pressureTime").append(pk * p.dt - t0)
        if not e:
            cls = f"{g}:unblocked"
            L(cls).append(1)
            L(f"time:{cls}").append(pk * p.dt - t0)
            continue
        cls = f"{g}:engaged"
        L(cls).append(1)
        k0, b0 = e[0]
        kr, br = e[-1]
        L(f"time:{cls}").append(pk * p.dt - t0)
        L(f"contact:{g}").append(k0 * p.dt - t0)
        L(f"engagedFrames:{g}").append(len(e) * p.dt)
        L(f"contactToFree:{g}").append((kr + 1 - k0) * p.dt)
        L(f"freeToPressure:{g}").append((pk - kr - 1) * p.dt)
        L(f"blocker:{g}:{p.players[br]['group']}").append(1)
        if kr >= pk - 1:
            L(f"escape:{g}:stillEngaged").append(1)
        else:
            L(f"escape:{g}:{escape(p, d, br, kr + 1, qb)}").append(1)
            L(f"releasedToPressure:{g}").append((pk - kr - 1) * p.dt)
    return A


for path in sys.argv[1:]:
    A = measure(path)
    n, pr, observed = A["plays"], A["pressured"], A["pressureObserved"]
    rate = f"{100 * pr / observed:.1f}%" if observed else "unknown"
    print(f"== {os.path.basename(path)}: dropbacks without play action {n}, pressured {pr} ({rate}; known {observed}, unknown {A['pressureUnknown']}; {PRESSURE_OPERATOR})")
    print(f"  pressure time after line start p25/50/75 {q(A.get('pressureTime', []), .25):.2f}/{q(A.get('pressureTime', []), .5):.2f}/{q(A.get('pressureTime', []), .75):.2f}")
    print("  pressurer                share of pressures  per 100 dropbacks  time p50")
    for g in ("interior", "edge", "offBall", "other"):
        for s in ("engaged", "unblocked"):
            c = len(A.get(f"{g}:{s}", []))
            if c:
                print(f"    {g + ' ' + s:22s} {100 * c / pr:6.1f}%  {100 * c / n:8.1f}  {q(A[f'time:{g}:{s}'], .5):8.2f}")
    for g in ("interior", "edge", "offBall"):
        c = len(A.get(f"{g}:engaged", []))
        if not c:
            continue
        esc = {k.split(":")[-1]: len(v) for k, v in A.items() if k.startswith(f"escape:{g}:")}
        blk = {k.split(":")[-1]: len(v) for k, v in A.items() if k.startswith(f"blocker:{g}:")}
        print(f"  {g} engaged pressurers ({c}): contact p50 {q(A[f'contact:{g}'], .5):.2f} s; engaged {q(A[f'engagedFrames:{g}'], .5):.2f} s; contact to free p25/50/75 "
              f"{q(A[f'contactToFree:{g}'], .25):.2f}/{q(A[f'contactToFree:{g}'], .5):.2f}/{q(A[f'contactToFree:{g}'], .75):.2f} s; released to pressure (when released) {q(A.get(f'releasedToPressure:{g}', []), .5):.2f} s")
        print("    escape " + ", ".join(f"{k} {100 * v / c:.0f}%" for k, v in sorted(esc.items())) + " | last blocker " + ", ".join(f"{k} {100 * v / c:.0f}%" for k, v in sorted(blk.items())))
    for g in ("interior", "edge"):
        r = A.get(f"rep:{g}", [])
        if r:
            f = A.get(f"repFreeTime:{g}", [])
            print(f"  engaged {g} reps {len(r)}: free before the window ends {100 * sum(r) / len(r):.1f}%; when free, at p25/50/75 {q(f, .25):.2f}/{q(f, .5):.2f}/{q(f, .75):.2f} s after line start, after {q(A.get(f'repEngagedFor:{g}', []), .5):.2f} s engaged")
