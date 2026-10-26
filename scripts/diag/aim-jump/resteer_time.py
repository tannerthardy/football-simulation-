#!/usr/bin/env python3
"""Re-steer by time since the carrier got the ball (TKL-2, Stage 4).

The samples and the event are pursuit_aim.py's, unchanged: a defender 1.5-15 yd
from the carrier, moving faster than 2 yd/s, no other offensive player within
1.0 yd, not in the cone more than 135 deg behind the runner, carrier moving faster
than 2 yd/s; a re-steer is a heading change over 15 deg in the next 0.2 s (both
ends faster than 2 yd/s). Split here by pursuer/carrier speed ratio and distance,
and by the time since the carrier window opened (run: carrier past the line;
pass: the catch). A pursuer's entry into the chase happens early in that clock.

    python3 -I scripts/diag/aim-jump/resteer_time.py [--kind=run|pass] LABEL=plays.jsonl.gz [...]
"""
import gzip, json, math, os, sys
from collections import defaultdict
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "mechanics"))
from metrics import Play  # noqa: E402
def ang(ax, ay, bx, by): return abs(math.degrees(math.atan2(ax * by - ay * bx, ax * bx + ay * by)))
TB = ((0, .5), (.5, 1), (1, 2), (2, 99))
KIND = next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--kind=")), None)
for arg in [a for a in sys.argv[1:] if not a.startswith("--kind=")]:
    label, path = arg.split("=", 1)
    R = defaultdict(lambda: [0, 0])
    E = defaultdict(list)  # (play, defender) -> frames of slow re-steers in the first second
    for line in gzip.open(path, "rt"):
        raw = json.loads(line); raw = raw.get("common", raw)
        if not raw.get("xy") or (KIND and raw["kind"] != KIND): continue
        if raw["kind"] == "run" and raw.get("carrier") is not None:
            c = raw["carrier"]; p = Play(raw); last = min(p.frames - 1, p.k(p.end))
            k0 = next((k for k in range(last + 1) if p.pos(c, k)[0] is not None and p.pos(c, k)[0] >= 0), None)
        elif raw["kind"] == "pass" and raw.get("receiver") is not None and "catch" in raw.get("events", {}):
            c = raw["receiver"]; p = Play(raw); last = min(p.frames - 1, p.k(p.end)); k0 = p.k(raw["events"]["catch"]) + 1
        else: continue
        if k0 is None or any(p.pos(c, k)[0] is None for k in range(k0, last + 1)): continue
        dfn = [d for d in p.who("D") if p.pos(d, 0)[0] is not None]
        mates = [o for o in p.who("O") if o != c]
        for k in range(k0, last + 1):
            cx, cy = p.pos(c, k); vcx, vcy = p.velocity(c, k); cs = math.hypot(vcx, vcy)
            if cs < 2: continue
            for d in dfn:
                dx, dy = p.pos(d, k); rx, ry = cx - dx, cy - dy; dist = math.hypot(rx, ry)
                if not 6 <= dist <= 15 or ang(vcx, vcy, -rx, -ry) > 135: continue
                if any(p.dist(o, d, k) <= 1.0 for o in mates): continue
                vdx, vdy = p.velocity(d, k); s = math.hypot(vdx, vdy)
                if s < 2: continue
                k2 = k + int(round(0.2 / p.dt))
                if k2 > last: continue
                v2 = p.velocity(d, k2)
                if math.hypot(*v2) <= 2: continue
                sl = "slow<0.8" if s / max(cs, .1) < .8 else "not slow"
                since = (k - k0) * p.dt
                tb = next(f"{a}-{b if b < 99 else '+'} s" for a, b in TB if a <= since < b)
                for key in (f"{sl} | {tb}", f"{sl} | all"):
                    R[key][0] += 1; R[key][1] += ang(vdx, vdy, *v2) > 15
                if sl == "slow<0.8" and since < 1: E[(raw.get("id"), d, raw["kind"])].append((k, ang(vdx, vdy, *v2) > 15))
    # Separate turns per pursuer in the first second: re-steering windows, merged when they touch.
    turns, kinds = [], []
    for (_, _, kind), frames in E.items():
        ks = sorted(k for k, r in frames if r); n = 0; prev = None
        for k in ks:
            if prev is None or k - prev > 2: n += 1
            prev = k
        turns.append(n); kinds.append(kind)
    print(f"== {label} (6-15 yd): share of samples / re-steer >15 deg")
    if turns:
        for kd in ("run", "pass", None):
            tt = [t for t, k in zip(turns, kinds) if kd is None or k == kd]
            if tt: print(f"   slow pursuers sampled in the first second ({kd or 'all'}): {len(tt)}; turns each: 0 {100 * tt.count(0) / len(tt):.0f}%  1 {100 * tt.count(1) / len(tt):.0f}%  2+ {100 * sum(t >= 2 for t in tt) / len(tt):.0f}%")
    for sl in ("slow<0.8", "not slow"):
        tot = R[f"{sl} | all"][0]
        print(f"   {sl:9s} all {R[f'{sl} | all'][1] / max(1, tot) * 100:5.1f}%  n={tot}")
        for a, b in TB:
            tb = f"{a}-{b if b < 99 else '+'} s"; n, r = R[f"{sl} | {tb}"]
            print(f"      since the ball {tb:8s} samples {100 * n / max(1, tot):4.0f}%  re-steer {100 * r / max(1, n):5.1f}%")
