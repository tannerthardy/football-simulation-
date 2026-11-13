#!/usr/bin/env python3
"""How much a ball carrier's speed moves over 0.2 s while he holds his line.
Same operator on NFL tracking and sim common-format plays (metrics.Play): speed and
heading from positions with the shared +/-0.2 s smoothing. This is the change that
pursuitPoint's forecast reads as acceleration ((speed now - speed 0.2 s earlier) / 0.2)
and carries forward for 0.3-0.6 s.

Carrier: designed-run carrier once past the line, or the receiver after the catch,
until the end (as pursuit_aim.py). A sample: carrier faster than 4 yd/s, heading within
10 deg over the last 0.6 s ("holding his line").

    python3 -I scripts/diag/aim-jump/runner_speed.py LABEL=plays.jsonl.gz [...]
"""
import gzip, json, math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "mechanics"))
from metrics import Play  # noqa: E402
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float("nan")
def hd(v): return math.degrees(math.atan2(v[1], v[0]))
def turn(a, b): return abs((a - b + 540) % 360 - 180)
for arg in sys.argv[1:]:
    label, path = arg.split("=", 1)
    acc, rev, n = [], 0, 0
    for line in gzip.open(path, "rt"):
        raw = json.loads(line); raw = raw.get("common", raw)
        if not raw.get("xy"): continue
        if raw["kind"] == "run" and raw.get("carrier") is not None:
            c = raw["carrier"]; p = Play(raw); last = min(p.frames - 1, p.k(p.end))
            k0 = next((k for k in range(last + 1) if p.pos(c, k)[0] is not None and p.pos(c, k)[0] >= 0), None)
        elif raw["kind"] == "pass" and raw.get("receiver") is not None and "catch" in raw.get("events", {}):
            c = raw["receiver"]; p = Play(raw); last = min(p.frames - 1, p.k(p.end)); k0 = p.k(raw["events"]["catch"]) + 1
        else: continue
        if k0 is None or any(p.pos(c, k)[0] is None for k in range(k0, last + 1)): continue
        n += 1
        a = {}
        for k in range(k0 + 6, last - 1):
            v = p.velocity(c, k); s = math.hypot(*v)
            if s < 4: continue
            hs = [hd(p.velocity(c, j)) for j in range(k - 6, k + 1)]
            if max(turn(h, hs[0]) for h in hs) >= 10: continue
            a[k] = (s - p.speed(c, k - 2)) / 0.2
            acc.append(a[k])
            if k - 4 in a and a[k] * a[k - 4] < 0 and abs(a[k]) > 1.5 and abs(a[k - 4]) > 1.5: rev += 1
    A = [abs(x) for x in acc]
    print(f"== {label}: {n} carriers, {len(acc)} samples holding the line at 4+ yd/s")
    print(f"   |speed change / 0.2 s| (yd/s^2) p50 {q(A, .5):.2f}  p75 {q(A, .75):.2f}  p90 {q(A, .9):.2f}  p99 {q(A, .99):.2f}")
    print(f"   share above 2.5 yd/s^2 {100 * sum(x > 2.5 for x in A) / len(A):.1f}%  above 5 {100 * sum(x > 5 for x in A) / len(A):.1f}%"
          f"  | sign reversals (both >1.5) 0.4 s apart: {100 * rev / len(A):.1f}% of samples")
