"""Interior pass rush: the pocket's depth, how interior rushers win, and the
QB's launch point. The same operator on NFL tracking and sim exports (common
play format, positions quantized to 0.1 yd by metrics.Play; velocities from
metrics.Play.velocity on both).

usage: python3 -I scripts/diag/interior-rush.py NFL.jsonl.gz SIM.jsonl.gz [...]

Cohort, line start, engagement and "free" as pass-pressure.py: dropbacks
without play action; interior rusher = on the defense's side within 2 yd
of the line at the snap, between the tackles; engaged = within 1.0 yd of an
offensive non-QB player for 2+ frames; free = after his last engagement,
2+ frames with no offensive player within 1.5 yd while nearer the QB than
his last blocker, before the window (throw, or the end capped at 4 s)
ends. A rep is an interior rusher whose first engagement is with an OL
(his blocker; guard or center by the line's snap order, T otherwise).

Depth = yards behind the line (+ = backfield). Times after line start.
1. Pocket: at 0.5/1.0/1.5/2.0 s, the blocker's depth, his retreat since
   contact ("push"), and the rusher's depth, by outcome (engaged at the
   end, free, other).
2. How he wins: in the 0.5 s before a free rusher's release, his mean
   velocity relative to the blocker, split into toward the QB (along the
   blocker-to-QB line) and across it; and the escape side (pass-pressure's
   through / inside / outside). The same relative velocity for engaged reps
   at 1.0 s, for comparison.
Window-controlled: among reps whose window is still open at T (1.5-3.0 s),
the share free by T, and the share off the block by T (after his last
engagement, a frame with nobody within 1.0 yd: free, stunting, dropping).
3. QB: depth at 1.0/1.5/2.0 s (live samples), step-up (deepest depth minus
   depth at the throw), and at the throw the nearest interior rusher to him.
"""
import gzip
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "mechanics"))
from metrics import Play  # noqa: E402

CONTACT, FREE = 1.0, 1.5
SLICES = (0.5, 1.0, 1.5, 2.0)
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


def engaged_frames(p, d, others, last):
    near = []
    for k in range(last + 1):
        m = min(((p.dist(b, d, k), b) for b in others), default=(math.inf, None))
        near.append(m if m[0] <= CONTACT else None)
    return [(k, near[k][1]) for k in range(last + 1)
            if near[k] and ((k > 0 and near[k - 1]) or (k < last and near[k + 1]))]


def frame_axes(p, b, qb, k):
    (bx, by), (qx, qy) = p.pos(b, k), p.pos(qb, k)
    ux, uy = qx - bx, qy - by
    n = math.hypot(ux, uy) or 1.0
    return ux / n, uy / n


def escape(p, d, b, k, qb):
    ux, uy = frame_axes(p, b, qb, k)
    (bx, by), (rx, ry), (qx, qy) = p.pos(b, k), p.pos(d, k), p.pos(qb, k)
    along = (rx - bx) * ux + (ry - by) * uy
    lat = (rx - bx) * -uy + (ry - by) * ux
    if along > 0 and math.degrees(math.atan2(abs(lat), along)) < 35:
        return "through"
    out = math.copysign(1.0, by - qy) if abs(by - qy) > 0.05 else 1.0
    return "outside" if (ry - by) * out > 0 else "inside"


def measure(path):
    A = {"reps": 0, "plays": 0}
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
        others = [i for i in p.who("O") if i != qb]
        ol.sort(key=lambda i: p.pos(i, 0)[1])
        role = {ol[0]: "T", ol[4]: "T", ol[1]: "G", ol[3]: "G", ol[2]: "C"}
        ylo, yhi = p.pos(ol[0], 0)[1], p.pos(ol[-1], 0)[1]
        dfn = p.who("D")
        inter = [d for d in dfn if p.pos(d, 0)[0] is not None and 0 < p.pos(d, 0)[0] <= 2.0 and ylo < p.pos(d, 0)[1] < yhi]
        A["plays"] += 1
        dep = lambda i, k: -p.pos(i, k)[0]
        # 3. QB depth and launch point.
        for t in SLICES:
            k = p.k(t0 + t)
            if k <= last:
                L(f"qbDepth@{t}").append(dep(qb, k))
        if throw is not None and inter:
            kt = min(p.frames - 1, p.k(throw))
            L("qbStepUp").append(max(dep(qb, k) for k in range(kt + 1)) - dep(qb, kt))
            L("qbDepthAtThrow").append(dep(qb, kt))
            L("nearestInteriorAtThrow").append(min(p.dist(d, qb, kt) for d in inter))
        for d in inter:
            e = engaged_frames(p, d, others, last)
            if not e or p.players[e[0][1]]["group"] != "OL":
                continue
            k0, b = e[0]
            kr, br = e[-1]
            A["reps"] += 1
            free = None
            run = 0
            for k in range(kr + 1, last + 1):
                clear = min(p.dist(o, d, k) for o in others) > FREE
                past = p.dist(d, qb, k) < p.dist(br, qb, k)
                run = run + 1 if clear and past else 0
                if run >= 2:
                    free = k - 1
                    break
            oc = "free" if free is not None else "engaged" if kr >= last - 1 else "other"
            off = next((k for k in range(kr + 1, last + 1) if min(p.dist(o, d, k) for o in others) > CONTACT), None)
            for T in (1.5, 2.0, 2.5, 3.0):
                kT = p.k(t0 + T)
                if kT <= last:
                    L(f"live@{T}").append(1)
                    L(f"freeBy@{T}").append(free is not None and free <= kT)
                    L(f"offBy@{T}").append(off is not None and off <= kT)
            L(f"outcome:{oc}").append(1)
            L(f"blockerRole:{role.get(b, 'T')}").append(1)
            for t in SLICES:
                k = p.k(t0 + t)
                if k > last or (free is not None and k > free):
                    continue
                L(f"{oc}:bDepth@{t}").append(dep(b, k))
                L(f"{oc}:dDepth@{t}").append(dep(d, k))
                if k >= k0:
                    L(f"{oc}:push@{t}").append(dep(b, k) - dep(b, k0))
            if oc == "engaged":
                k = p.k(t0 + 1.0)
                if k0 <= k <= last:
                    ux, uy = frame_axes(p, b, qb, k)
                    (dvx, dvy), (bvx, bvy) = p.velocity(d, k), p.velocity(b, k)
                    rvx, rvy = dvx - bvx, dvy - bvy
                    L("engaged:relAlong@1.0").append(rvx * ux + rvy * uy)
                    L("engaged:relAcross@1.0").append(abs(rvx * -uy + rvy * ux))
                    L("engaged:pairLateral@1.0").append(abs(bvy))
            if oc == "free":
                L("free:escape").append(escape(p, d, br, min(kr + 1, last), qb))
                L("free:time").append(free * p.dt - t0)
                L("free:engagedFor").append((kr - k0 + 1) * p.dt)
                along, across, n = 0.0, 0.0, 0
                for k in range(max(k0, kr - 5), kr + 1):
                    ux, uy = frame_axes(p, br, qb, k)
                    (dvx, dvy), (bvx, bvy) = p.velocity(d, k), p.velocity(br, k)
                    rvx, rvy = dvx - bvx, dvy - bvy
                    along += rvx * ux + rvy * uy
                    across += abs(rvx * -uy + rvy * ux)
                    n += 1
                L("free:relAlong").append(along / n)
                L("free:relAcross").append(across / n)
                L("free:pushAtRelease").append(dep(br, kr) - dep(br, k0))
    return A


def counts(v):
    out = {}
    for x in v:
        out[x] = out.get(x, 0) + 1
    return ", ".join(f"{k} {100 * c / len(v):.0f}%" for k, c in sorted(out.items(), key=lambda z: -z[1]))


for path in [a for a in sys.argv[1:] if a.endswith(".gz")]:
    A = measure(path)
    n = A["reps"]
    print(f"== {os.path.basename(path)}: dropbacks {A['plays']}, interior reps engaged first by an OL {n}: " +
          ", ".join(f"{oc} {100 * len(A.get(f'outcome:{oc}', [])) / max(1, n):.1f}%" for oc in ("engaged", "free", "other")) +
          " | blocker " + ", ".join(f"{r} {100 * len(A.get(f'blockerRole:{r}', [])) / max(1, n):.0f}%" for r in ("G", "C", "T")))
    print("  among reps still live at T (window not yet over): free by T / off the block by T: " + "  ".join(
        f"{T}s {100 * sum(A.get(f'freeBy@{T}', [])) / max(1, len(A.get(f'live@{T}', []))):.1f}% / {100 * sum(A.get(f'offBy@{T}', [])) / max(1, len(A.get(f'live@{T}', []))):.0f}% (n {len(A.get(f'live@{T}', []))})"
        for T in (1.5, 2.0, 2.5, 3.0)))
    for oc in ("engaged", "free"):
        if not A.get(f"outcome:{oc}"):
            continue
        print(f"  {oc}: medians at " + "  ".join(
            f"{t}s blocker {q(A.get(f'{oc}:bDepth@{t}', []), .5):.2f} (push {q(A.get(f'{oc}:push@{t}', []), .5):+.2f}) rusher {q(A.get(f'{oc}:dDepth@{t}', []), .5):+.2f}"
            for t in SLICES))
    if A.get("engaged:relAlong@1.0"):
        print(f"  engaged at 1.0 s: rusher relative to blocker toward the QB {q(A['engaged:relAlong@1.0'], .5):+.2f} yd/s, across {q(A['engaged:relAcross@1.0'], .5):.2f}; pair lateral speed {q(A['engaged:pairLateral@1.0'], .5):.2f}")
    if A.get("free:escape"):
        print(f"  free ({len(A['free:escape'])}): at {q(A['free:time'], .5):.2f} s after {q(A['free:engagedFor'], .5):.2f} s engaged; leaves {counts(A['free:escape'])}; last 0.5 s before release relative to blocker: toward the QB {q(A['free:relAlong'], .5):+.2f} yd/s, across {q(A['free:relAcross'], .5):.2f}; push at release {q(A['free:pushAtRelease'], .5):+.2f}")
    print("  QB depth at " + "  ".join(f"{t}s {q(A.get(f'qbDepth@{t}', []), .5):.2f}" for t in SLICES) +
          f" | at the throw {q(A.get('qbDepthAtThrow', []), .5):.2f}, step-up {q(A.get('qbStepUp', []), .5):.2f} (p75 {q(A.get('qbStepUp', []), .75):.2f}); nearest interior rusher {q(A.get('nearestInteriorAtThrow', []), .5):.2f} yd (p25 {q(A.get('nearestInteriorAtThrow', []), .25):.2f})")
