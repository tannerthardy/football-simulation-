#!/usr/bin/env python3
"""When run defenders turn onto the runner, by where the runner is (TKL-2, Stage 4).

Designed runs (a handoff to an RB). From the handoff to the end, each defender
sample uses pursuit_aim.py's filter (1.5-15 yd from the carrier, moving faster
than 2 yd/s, no other offensive player within 1.0 yd, not in the cone more than
135 deg behind the runner, carrier faster than 2 yd/s) and its event (heading
change over 15 deg in the next 0.2 s). Same code on NFL tracking and sim
common-format plays.

  1. Re-steer rate of slow pursuers (under 0.8 of the carrier's speed) at 6-15 yd
     by the carrier's yards past the line at the sample.
  2. Each LB/DB's first turn after the handoff (any distance band above): the
     carrier's yards past the line then, and the seconds since the handoff.
  3. Flow: the first moment each LB/DB moves faster than 2 yd/s with his heading
     within 45 deg of the bearing to the carrier, held 0.3 s. Same two clocks.

    python3 -I scripts/diag/aim-jump/flow_onset.py LABEL=plays.jsonl.gz [...]
"""
import gzip, json, math, os, sys
from collections import defaultdict
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "mechanics"))
from metrics import Play  # noqa: E402
def ang(ax, ay, bx, by): return abs(math.degrees(math.atan2(ax * by - ay * bx, ax * bx + ay * by)))
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float("nan")
XB = ((-99, -2), (-2, 0), (0, 2), (2, 4), (4, 6), (6, 99))
xb = lambda x: next(f"{a if a > -99 else '<'}..{b if b < 99 else '+'}" for a, b in XB if a <= x < b)
for arg in sys.argv[1:]:
    label, path = arg.split("=", 1)
    R = defaultdict(lambda: [0, 0]); first = defaultdict(list); flow = defaultdict(list); runs = 0
    for line in gzip.open(path, "rt"):
        raw = json.loads(line); raw = raw.get("common", raw)
        if not raw.get("xy") or raw["kind"] != "run" or raw.get("carrier") is None: continue
        ev = raw.get("events") or {}; c = raw["carrier"]
        if ev.get("handoff") is None or raw["players"][c]["group"] != "RB": continue
        p = Play(raw); last = min(p.frames - 1, p.k(p.end)); kh = p.k(ev["handoff"])
        if any(p.pos(c, k)[0] is None for k in range(kh, last + 1)): continue
        runs += 1
        mates = [o for o in p.who("O") if o != c]
        for d in p.who("D"):
            g = p.players[d]["group"]
            if p.pos(d, 0)[0] is None: continue
            got_first = False; held = 0
            for k in range(kh, last + 1):
                cx, cy = p.pos(c, k); vcx, vcy = p.velocity(c, k); cs = math.hypot(vcx, vcy)
                dx, dy = p.pos(d, k); rx, ry = cx - dx, cy - dy; dist = math.hypot(rx, ry)
                vdx, vdy = p.velocity(d, k); s = math.hypot(vdx, vdy)
                since = (k - kh) * p.dt
                if g in ("LB", "DB") and not flow[(g, "done", raw["id"], d)]:
                    held = held + 1 if s > 2 and dist > 1.5 and ang(vdx, vdy, rx, ry) <= 45 else 0
                    if held * p.dt >= 0.3 - 1e-9:
                        k0 = k - held + 1
                        flow[(g, "x")].append(p.pos(c, k0)[0]); flow[(g, "t")].append((k0 - kh) * p.dt)
                        flow[(g, "done", raw["id"], d)].append(1)
                if cs < 2 or not 1.5 <= dist <= 15 or ang(vcx, vcy, -rx, -ry) > 135 or s < 2: continue
                if any(p.dist(o, d, k) <= 1.0 for o in mates): continue
                k2 = k + int(round(0.2 / p.dt))
                if k2 > last: continue
                v2 = p.velocity(d, k2)
                if math.hypot(*v2) <= 2: continue
                turned = ang(vdx, vdy, *v2) > 15
                if 6 <= dist <= 15 and s / max(cs, .1) < .8:
                    R[xb(cx)][0] += 1; R[xb(cx)][1] += turned
                if turned and not got_first and g in ("LB", "DB"):
                    got_first = True; first[(g, "x")].append(cx); first[(g, "t")].append(since)
    print(f"== {label}: {runs} designed runs")
    tot = sum(v[0] for v in R.values())
    print("   1. slow pursuers 6-15 yd, re-steer >15 deg by carrier yards past the line:")
    for a, b in XB:
        n, r = R[xb(a if a > -99 else -50)]
        print(f"      carrier at {xb(a if a > -99 else -50):6s} samples {100 * n / max(1, tot):4.0f}%  re-steer {100 * r / max(1, n):5.1f}%")
    for name, D in (("2. first turn", first), ("3. flow onset", flow)):
        for g in ("LB", "DB"):
            X, T = D[(g, "x")], D[(g, "t")]
            if X: print(f"   {name} {g}: n={len(X):5d}  carrier x p25/50/75 {q(X, .25):5.1f} {q(X, .5):5.1f} {q(X, .75):5.1f} yd"
                        f"  | since handoff p25/50/75 {q(T, .25):.2f} {q(T, .5):.2f} {q(T, .75):.2f} s")
