#!/usr/bin/env python3
"""Pursuit flow on runs: who gets to the runner, and where everyone else is.
One operator for NFL tracking and sim common plays (metrics.Play).

Designed runs (RB carrier, handoff) reaching 5 yd past the line. Per
defender:
  got there  within 1.5 yd of the carrier at some frame after he crosses 5 yd
  state when the carrier crosses 0 and 5 yd:
    blocked   an offensive player other than the carrier within 1.0 yd
    ahead     level with or ahead of him along his heading (>= -0.5 yd)
    closing   behind him and closing at 0.5+ yd/s
    losing    behind him and not closing
  for blocked defenders at 5 yd: how long until no blocker is within 1.0 yd
  (released) before the play ends
  for behind defenders at 5 yd: speed as a share of his own top speed on
  the play (effort), distance to the carrier

    python3 -I scripts/diag/g1/flow.py LABEL=plays.jsonl.gz [...]
"""
import gzip
import json
import math
import os
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "mechanics"))
from metrics import Play  # noqa: E402

q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float("nan")
GROUPS = ("DL", "LB", "DB")


def state(p, c, d, k, off):
    (cx, cy), (dx, dy) = p.pos(c, k), p.pos(d, k)
    if cx is None or dx is None:
        return None, None, None
    if any(p.dist(o, d, k) <= 1.0 for o in off):
        return "blocked", math.hypot(dx - cx, dy - cy), None
    cv, dv = p.velocity(c, k), p.velocity(d, k)
    s = math.hypot(*cv)
    rx, ry = dx - cx, dy - cy
    along = (rx * cv[0] + ry * cv[1]) / s if s > 0.5 else rx
    dist = math.hypot(rx, ry)
    if along >= -0.5:
        return "ahead", dist, None
    closing = ((dv[0] - cv[0]) * -rx + (dv[1] - cv[1]) * -ry) / (dist or 1)
    return ("closing" if closing >= 0.5 else "losing"), dist, closing


for arg in sys.argv[1:]:
    label, path = arg.split("=", 1)
    runs = 0
    got = Counter(); n = Counter()
    st = defaultdict(Counter)          # (group, mark, got) -> state counts
    release = defaultdict(list)        # group -> seconds to release (inf if never)
    effort = defaultdict(list); gap = defaultdict(list)
    bdist = defaultdict(list)          # blocked defenders' distance to the carrier
    for line in gzip.open(path, "rt"):
        raw = json.loads(line)
        raw = raw.get("common", raw) if "common" in raw else raw
        if raw.get("kind") != "run" or raw.get("carrier") is None:
            continue
        ev = raw.get("events") or {}
        c = raw["carrier"]
        if ev.get("handoff") is None or raw["players"][c]["group"] != "RB":
            continue
        p = Play(raw)
        k1 = min(p.frames - 1, p.k(p.end))
        marks = {}
        for m in (0, 5):
            marks[m] = next((k for k in range(p.k(ev["handoff"]), k1) if (p.pos(c, k)[0] or -9) >= m), None)
        if marks[5] is None or marks[0] is None:
            continue
        runs += 1
        off = [o for o in p.who("O") if o != c]
        for d in p.who("D"):
            g = p.players[d]["group"]
            if g not in GROUPS:
                continue
            n[g] += 1
            reached = any(p.dist(c, d, k) <= 1.5 for k in range(marks[5], k1 + 1))
            got[g] += reached
            top = max((p.speed(d, k) for k in range(0, k1 + 1)), default=0) or 1
            for m in (0, 5):
                s, dist, _ = state(p, c, d, marks[m], off)
                if s is None:
                    continue
                st[(g, m, reached)][s] += 1
                if s == "blocked":
                    bdist[(g, m, reached)].append(dist)
                if m == 5 and s == "blocked":
                    kr = next((k for k in range(marks[5], k1 + 1) if not any(p.dist(o, d, k) <= 1.0 for o in off)), None)
                    release[g].append(math.inf if kr is None else (kr - marks[5]) * p.dt)
                if m == 5 and s in ("closing", "losing") and not reached:
                    effort[g].append(p.speed(d, marks[5]) / top)
                    gap[g].append(dist)
    print(f"== {label}: runs reaching 5 yd {runs}")
    print("   got there per run: " + "  ".join(f"{g} {got[g] / runs:.2f} ({100 * got[g] / max(1, n[g]):.0f}% of them)" for g in GROUPS)
          + f"  | all {sum(got.values()) / runs:.2f}")
    for g in GROUPS:
        for m in (0, 5):
            for r in (True, False):
                C = st[(g, m, r)]
                tot = sum(C.values())
                if not tot:
                    continue
                print(f"   {g} {'got there' if r else 'did not  '} at {m} yd (per run {tot / runs:.2f}): "
                      + "  ".join(f"{s} {100 * C[s] / tot:.0f}%" for s in ("blocked", "ahead", "closing", "losing")))
        print(f"   {g} blocked, distance to the carrier p25/50/75: " + " | ".join(
            f"{'got there' if r else 'did not'} at {m} yd {q(bdist[(g, m, r)], .25):.1f}/{q(bdist[(g, m, r)]):.1f}/{q(bdist[(g, m, r)], .75):.1f}"
            for m in (0, 5) for r in (True, False) if bdist[(g, m, r)]))
        R = release[g]
        if R:
            fin = [x for x in R if x != math.inf]
            print(f"   {g} blocked at 5 yd: released later {100 * len(fin) / len(R):.0f}%, after p50 {q(fin):.2f} s"
                  + (f" | behind and did not get there: effort p50 {q(effort[g]):.2f} of his top speed, {q(gap[g]):.1f} yd away" if effort[g] else ""))
