"""Edge pass-rep geometry and unblocked edge pressures: the same operator on
NFL tracking and sim exports (common play format, positions quantized to 0.1
yd by metrics.Play; velocities from metrics.Play.velocity on both).

usage: python3 -I scripts/diag/edge-rep.py NFL.jsonl.gz SIM.jsonl.gz [...]

Cohort, line start, engagement, pressure and "free" as pass-pressure.py:
dropbacks without play action; edge rusher = on the defense's side within 2
yd of the line at the snap, outside the tackles; engaged = within 1.0 yd of
an offensive non-QB player for 2+ frames. Each edge rusher whose first
engagement is with an OL is one rep, followed from that first contact (the
blocker at that frame is "his blocker") to the throw, the play's pressure
frame or 4 s, whichever is first.

Outcome: free (after his last engagement, 2+ frames with no offensive player
within 1.5 yd while nearer the QB than his last blocker), engaged at the end
(his last engagement reaches the final frame), or other (released without
getting free: dropped, stunted, peeled off).

Geometry relative to his first blocker, + side = away from the ball (the
tackle's outside):
- hip: blocker x - rusher x, yards the rusher is past the blocker toward the
  QB's depth (+ = rusher deeper than the blocker);
- lateral: rusher y - blocker y on the outside axis (+ = outside him);
- heading: angle between the rusher's velocity and his line to the QB
  (0 = straight at the QB), when moving over 1 yd/s;
- blocker retreat speed (-vx) and outward speed; rusher speed and outward
  speed.
Free reps also report where they leave (pass-pressure.py's escape) and the
hip at release.

Unblocked edge pressures (the pressurer is an edge rusher never engaged
before the pressure): at 0.5 s after line start, the offensive non-QB
player nearest him (group, distance, his side relative to the rusher), and
whether that player is engaged with another defender then (and that
defender's alignment group); the same-side tackle's engagement then; and
whom the same-side tackle and the nearest RB/TE first block (2+ frames
within 1.0 yd) before the pressure.
"""
import gzip
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "mechanics"))
from metrics import PRESSURE_OPERATOR, Play  # noqa: E402

CONTACT, FREE = 1.0, 1.5
STEPS = (0.0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2)
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


def escape(p, d, b, k, qb):
    (bx, by), (rx, ry), (qx, qy) = p.pos(b, k), p.pos(d, k), p.pos(qb, k)
    ux, uy = qx - bx, qy - by
    n = math.hypot(ux, uy) or 1.0
    along = ((rx - bx) * ux + (ry - by) * uy) / n
    lat = ((rx - bx) * -uy + (ry - by) * ux) / n
    if along > 0 and math.degrees(math.atan2(abs(lat), along)) < 35:
        return "through"
    out = math.copysign(1.0, by - qy) if abs(by - qy) > 0.05 else 1.0
    return "outside" if (ry - by) * out > 0 else "inside"


def measure(path):
    A = {"reps": 0, "pressureUnknown": 0}
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
        ylo, yhi = p.pos(ol[0], 0)[1], p.pos(ol[-1], 0)[1]
        by0 = raw["ball_y"]
        dfn = p.who("D")
        pressure = p.pressure(qb)
        A["pressureUnknown"] += pressure.value is None
        pk = pressure.first
        end = pk if pk is not None else last
        presser = min(dfn, key=lambda d: p.dist(d, qb, pk)) if pk is not None else None

        def align(d):
            x0, y0 = p.pos(d, 0)
            if x0 is None or x0 <= 0:
                return None
            if x0 > 2.0:
                return "offBall"
            return "interior" if ylo < y0 < yhi else "edge" if ylo - 4 <= y0 <= yhi + 4 else None

        for d in dfn:
            if align(d) != "edge":
                continue
            out = 1.0 if p.pos(d, 0)[1] > by0 else -1.0
            e = engaged_frames(p, d, others, end)
            if not e:
                if d == presser:
                    k5 = min(end, p.k(t0 + 0.5))
                    near = min(others, key=lambda o: p.dist(o, d, k5))
                    nd = p.dist(near, d, k5)
                    side = "outside" if (p.pos(near, k5)[1] - p.pos(d, k5)[1]) * out > 0 else "inside"
                    busy = [x for x in dfn if x != d and p.dist(near, x, k5) <= CONTACT]
                    tag = f"{p.players[near]['group']}:{'engaged with ' + (align(busy[0]) or 'other') if busy else 'free'}"
                    L("unblocked:nearest").append(tag)
                    L("unblocked:nearestDist").append(nd)
                    L("unblocked:nearestSide").append(side)
                    tk = ol[-1] if out > 0 else ol[0]
                    tb = [x for x in dfn if x != d and p.dist(tk, x, k5) <= CONTACT]
                    L("unblocked:tackle").append(f"engaged with {align(tb[0]) or 'other'}" if tb else "not engaged")
                    L("unblocked:tackleDist").append(p.dist(tk, d, k5))
                    rel = lambda x: ("outside him" if (p.pos(x, 0)[1] - p.pos(d, 0)[1]) * out > 0 else "inside him")

                    def first_block(o):
                        for k in range(end):
                            hit = [x for x in dfn if x != d and p.dist(o, x, k) <= CONTACT and p.dist(o, x, k + 1) <= CONTACT]
                            if hit:
                                x = hit[0]
                                g = align(x) or "other"
                                return f"{g} {rel(x)}" if g == "edge" else g
                        return "nobody"
                    L("unblocked:tackleBlocked").append(first_block(tk))
                    backs = [o for o in others if p.players[o]["group"] in ("RB", "TE")]
                    if backs:
                        bk = min(backs, key=lambda o: p.dist(o, d, k5))
                        L("unblocked:back").append(f"{p.players[bk]['group']} blocked {first_block(bk)}")
                        L("unblocked:backDist").append(p.dist(bk, d, k5))
                    else:
                        L("unblocked:back").append("no RB/TE")
                    L("unblocked:rushersSide").append(sum(1 for x in dfn if align(x) in ("edge", "interior", "offBall") and (p.pos(x, 0)[1] - by0) * out > 0 and p.pos(x, 0)[0] <= 6))
                    L("unblocked:time").append(pk * p.dt - t0)
                continue
            k0, b = e[0]
            if p.players[b]["group"] != "OL":
                continue
            A["reps"] += 1
            kr, br = e[-1]
            free = None
            run = 0
            for k in range(kr + 1, end + 1):
                clear = min(p.dist(o, d, k) for o in others) > FREE
                past = p.dist(d, qb, k) < p.dist(br, qb, k)
                run = run + 1 if clear and past else 0
                if run >= 2:
                    free = k - 1
                    break
            oc = "free" if free is not None else "engaged" if kr >= end - 1 else "other"
            L(f"outcome:{oc}").append(1)
            L(f"{oc}:contact").append(k0 * p.dt - t0)
            if oc == "free":
                L("free:engagedFor").append((kr - k0 + 1) * p.dt)
                L("free:escape").append(escape(p, d, br, min(kr + 1, end), qb))
                L("free:hipAtRelease").append(p.pos(br, kr)[0] - p.pos(d, kr)[0])
                L("free:latAtRelease").append((p.pos(d, kr)[1] - p.pos(br, kr)[1]) * out)
            stop = free if free is not None else end
            for s in STEPS:
                k = k0 + int(round(s / p.dt))
                if k > stop:
                    break
                (bx, by), (rx, ry), (qx, qy) = p.pos(b, k), p.pos(d, k), p.pos(qb, k)
                bvx, bvy = p.velocity(b, k)
                rvx, rvy = p.velocity(d, k)
                L(f"{oc}:hip@{s}").append(bx - rx)
                L(f"{oc}:lat@{s}").append((ry - by) * out)
                L(f"{oc}:bRetreat@{s}").append(-bvx)
                L(f"{oc}:bOut@{s}").append(bvy * out)
                L(f"{oc}:rSpeed@{s}").append(math.hypot(rvx, rvy))
                L(f"{oc}:rOut@{s}").append(rvy * out)
                if math.hypot(rvx, rvy) > 1.0:
                    h = math.atan2(rvy, rvx) - math.atan2(qy - ry, qx - rx)
                    L(f"{oc}:heading@{s}").append(abs(math.degrees(math.atan2(math.sin(h), math.cos(h)))))
    return A


def counts(v):
    out = {}
    for x in v:
        out[x] = out.get(x, 0) + 1
    return ", ".join(f"{k} {100 * c / len(v):.0f}%" for k, c in sorted(out.items(), key=lambda z: -z[1]))


for path in [a for a in sys.argv[1:] if a.endswith(".gz")]:
    A = measure(path)
    n = A["reps"]
    print(f"  pressure: {PRESSURE_OPERATOR}; unknown windows {A['pressureUnknown']}")
    print(f"== {os.path.basename(path)}: edge reps engaged first by an OL {n}: " + ", ".join(
        f"{oc} {100 * len(A.get(f'outcome:{oc}', [])) / max(1, n):.0f}%" for oc in ("engaged", "free", "other")))
    for oc in ("engaged", "free"):
        if not A.get(f"outcome:{oc}"):
            continue
        print(f"  {oc}: first contact {q(A[f'{oc}:contact'], .5):.2f} s after line start; medians by time after first contact")
        print("    t      hip   lateral  heading  OL retreat  OL out  rusher speed  rusher out")
        for s in STEPS:
            g = lambda k: A.get(f"{oc}:{k}@{s}", [])
            if not g("hip"):
                continue
            print(f"    {s:.1f}s {q(g('hip'), .5):+6.2f}  {q(g('lat'), .5):+6.2f}  {q(g('heading'), .5):6.0f}  {q(g('bRetreat'), .5):9.2f}  {q(g('bOut'), .5):+6.2f}  {q(g('rSpeed'), .5):11.2f}  {q(g('rOut'), .5):+9.2f}   (n {len(g('hip'))})")
    if A.get("free:escape"):
        print(f"  free: engaged {q(A['free:engagedFor'], .5):.2f} s; leaves {counts(A['free:escape'])}; at release hip {q(A['free:hipAtRelease'], .5):+.2f}, lateral {q(A['free:latAtRelease'], .5):+.2f}")
    u = A.get("unblocked:nearest", [])
    if u:
        print(f"  unblocked edge pressures {len(u)} (pressure at {q(A['unblocked:time'], .5):.2f} s): at 0.5 s nearest offensive player {counts(u)}")
        print(f"    nearest {q(A['unblocked:nearestDist'], .5):.2f} yd away, {counts(A['unblocked:nearestSide'])} of him; same-side tackle {q(A['unblocked:tackleDist'], .5):.2f} yd away, {counts(A['unblocked:tackle'])}; rushers aligned on that side (within 6 yd deep) median {q(A['unblocked:rushersSide'], .5):.0f}")
        print(f"    same-side tackle's first block before the pressure: {counts(A['unblocked:tackleBlocked'])}")
        print(f"    nearest RB/TE at 0.5 s ({q(A.get('unblocked:backDist', []), .5):.1f} yd away): {counts(A['unblocked:back'])}")
