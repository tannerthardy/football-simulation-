#!/usr/bin/env python3
"""PA backer witness (presented-possession spec, docs/reviews/2026-11-14-presented-possession-spec.md, I4).

Does play action hold a second-level defender? Same operator for NFL and sim plays in the common play format
(scripts/mechanics/metrics.py `Play`: x = yards past the line toward the defense, frame 0 = the snap, dt 0.1 s).

Population: dropbacks (raw["kind"] == "pass") whose raw["cell"]["pa"] is True or False (plays without the label are
skipped). Per play, every off-ball second-level defender: a defender (side "D") at the snap 3-7 yd past the line and
inside the tackles (laterally within the widest OL +/- 1 yd; the ball +/- 4.5 yd when OL are missing).

Per defender:
  step_0p6  displacement toward the line in the first 0.6 s (yd, + = toward the line; x at 0 s minus x at 0.6 s);
  drop_t    first time his velocity points away from the line by more than 1 yd/s (s; None if he never drops by
            the throw or 3 s, whichever is first; reported as the share that drop and the p50 of those who do).

Cells: pa (True/False) x coverage family (from cell.coverage) x box count (Play.box_count, <=6 / 7 / 8+), plus the
pooled pa / no-pa rows. Optional secondary columns, never for calibration (Integration, 2026-11-14): if a player
record carries "age" or "snaps", rows split at the median of each. If it carries "role" (Tools' per-defender coverage
role for the same weeks), the same-look comparison is also reported per role.

The witness is the PA-minus-no-PA difference in the same cell, not either level.

    python3 -I scripts/diag/possession/pa_backer_witness.py PLAYS.jsonl.gz OUT.json [--label NAME]
"""
import argparse
import gzip
import json
import statistics
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "mechanics"))
from metrics import Play, describe  # noqa: E402

DEPTH = (3.0, 7.0)
WINDOW = 0.6
DROP_SPEED = 1.0
DROP_HORIZON = 3.0


def coverage_family(c):
    c = (c or "").lower()
    if not c:
        return "unknown"
    if "0" in c or "1" in c or "man" in c:
        return "man"
    if "2" in c:
        return "two-high"
    if "3" in c:
        return "three"
    if "4" in c or "6" in c or "quarters" in c:
        return "quarters"
    return "other"


def box_cell(p):
    b = p.box_count()
    return "box6-" if b <= 6 else "box7" if b == 7 else "box8+"


def inside(p, i):
    ol = p.who("O", "OL")
    y = p.pos(i, 0)[1]
    ys = [p.pos(j, 0)[1] for j in ol if p.pos(j, 0)[1] is not None]
    if len(ys) >= 4:
        return min(ys) - 1.0 <= y <= max(ys) + 1.0
    return abs(y - p.raw["ball_y"]) <= 4.5


def measure(p):
    throw = p.events.get("pass_forward")
    horizon = min(DROP_HORIZON, throw if throw is not None else DROP_HORIZON, p.end)
    rows = []
    for i in p.who("D"):
        x0, y0 = p.pos(i, 0)
        if x0 is None or not (DEPTH[0] <= x0 <= DEPTH[1]) or not inside(p, i):
            continue
        k6 = p.k(WINDOW)
        x6 = p.pos(i, k6)[0]
        if x6 is None or WINDOW > p.end:
            continue
        drop = None
        for k in range(1, p.k(horizon) + 1):
            vx, _ = p.velocity(i, k)
            if vx > DROP_SPEED:
                drop = round(k * p.dt, 2)
                break
        rows.append({"i": i, "step_0p6": round(x0 - x6, 2), "drop_t": drop, "player": p.players[i]})
    return rows


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("plays", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--label", default=None)
    args = ap.parse_args()
    cells = defaultdict(lambda: {"step": [], "drop": [], "dropped": 0, "n": 0, "plays": set()})
    secondary = defaultdict(list)
    for line in gzip.open(args.plays, "rt"):
        raw = json.loads(line)
        cell = raw.get("cell") or {}
        if raw.get("kind") != "pass" or cell.get("pa") not in (True, False):
            continue
        p = Play(raw)
        pa = "pa" if cell["pa"] else "no-pa"
        keys = [(pa,), (pa, coverage_family(cell.get("coverage"))), (pa, box_cell(p)),
                (pa, coverage_family(cell.get("coverage")), box_cell(p))]
        for r in measure(p):
            role = r["player"].get("role")
            ks = keys + ([(pa, "role:" + role)] if role else [])
            for k in ks:
                c = cells[k]
                c["n"] += 1
                c["plays"].add(id(raw))
                c["step"].append(r["step_0p6"])
                if r["drop_t"] is not None:
                    c["dropped"] += 1
                    c["drop"].append(r["drop_t"])
            for f in ("age", "snaps"):
                if r["player"].get(f) is not None:
                    secondary[f].append((r["player"][f], pa, r["step_0p6"], r["drop_t"]))
    out = {"source": args.label or str(args.plays), "definitions": __doc__, "cells": {}, "difference": {}, "secondary": {}}
    for k, c in sorted(cells.items()):
        out["cells"][" / ".join(k)] = {"defenders": c["n"], "plays": len(c["plays"]), "step_0p6": describe(c["step"]),
                                       "drop_share": round(c["dropped"] / c["n"], 3) if c["n"] else None,
                                       "drop_t": describe(c["drop"])}
    for k, c in cells.items():
        if k[0] != "pa":
            continue
        other = cells.get(("no-pa",) + k[1:])
        if not other or not c["step"] or not other["step"]:
            continue
        out["difference"][" / ".join(k[1:]) or "pooled"] = {
            "step_0p6_mean": round(statistics.mean(c["step"]) - statistics.mean(other["step"]), 3),
            "drop_t_p50": (round(statistics.median(c["drop"]) - statistics.median(other["drop"]), 3)
                           if c["drop"] and other["drop"] else None),
            "defenders": [c["n"], other["n"]]}
    for f, rows in secondary.items():
        med = statistics.median(v for v, *_ in rows)
        for half, sel in (("low", lambda v: v <= med), ("high", lambda v: v > med)):
            for pa in ("pa", "no-pa"):
                s = [st for v, q, st, _ in rows if sel(v) and q == pa]
                out["secondary"][f"{f} {half} (median {med}) / {pa}"] = describe(s)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(out, indent=1) + "\n")
    print(f"{sum(c['n'] for k, c in cells.items() if len(k) == 1)} defenders -> {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
