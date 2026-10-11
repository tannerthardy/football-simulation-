#!/usr/bin/env python3
"""Print the sim-vs-NFL mechanism table.

    python3 -I scripts/mechanics/compare.py [--nfl data/reviews/mechanics/nfl-bdb2022.json] \
        [--sim out/mechanics/sim.json] [--out out/mechanics/report.md]

Shift = (sim median - NFL median) / NFL interquartile range: how far the
typical sim value sits from the typical NFL value, in units of normal NFL
spread. Tail is the same for the 90th percentile, because a right median with
a wrong tail (e.g. linemen driven 4 yd on one play in four) is still wrong.
The worse of the two decides: < 0.25 "ok", < 0.75 "check", otherwise "off".
Rates (0/1 metrics) compare means, flagged by relative difference.
These flags point at mechanisms to investigate. They are not targets to tune.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RATES = {"pass.pressure_2yd_before_throw"}
FAMILIES = ("inside_zone", "outside_zone", "gap_pull", "man_duo", "draw")
BY_FAMILY = ("run.handoff_s", "run.carrier_cross_los_s", "run.yards_before_contact", "run.yards_after_contact",
             "run.max_engaged_dl_driven_back_3s", "run.yards")


def flag(metric, nfl, sim):
    if metric in RATES:
        ref = max(nfl["mean"], 0.01)
        rel = (sim["mean"] - nfl["mean"]) / ref
        return rel, None, "ok" if abs(rel) < 0.15 else "check" if abs(rel) < 0.4 else "off"
    iqr = max(nfl["p75"] - nfl["p25"], 1e-6)
    shift = (sim["p50"] - nfl["p50"]) / iqr
    tail = (sim["p90"] - nfl["p90"]) / iqr
    worst = max(abs(shift), abs(tail))
    return shift, tail, "ok" if worst < 0.25 else "check" if worst < 0.75 else "off"


def fmt(summary, metric):
    if metric in RATES:
        return f"{100 * summary['mean']:.1f}%"
    return f"{summary['p50']:.2f} [{summary['p25']:.2f}, {summary['p75']:.2f}] {summary['p90']:.2f}"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--nfl", type=Path, default=ROOT / "data/reviews/mechanics/nfl-bdb2022.json")
    parser.add_argument("--sim", type=Path, default=ROOT / "out/mechanics/sim.json")
    parser.add_argument("--out", type=Path, default=ROOT / "out/mechanics/report.md")
    parser.add_argument("--min-n", type=int, default=30)
    parser.add_argument("--guard", type=Path, help="JSON list of metrics that already match; exit 1 if any is now 'off'")
    args = parser.parse_args()
    nfl, sim = json.loads(args.nfl.read_text()), json.loads(args.sim.read_text())
    commit = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True, cwd=ROOT).stdout.strip()
    lines = [f"# Sim vs NFL mechanisms ({commit})", "",
             f"NFL: {nfl['source']} ({nfl['plays']['run']} runs, {nfl['plays']['pass']} dropbacks).  ",
             f"Sim: {sim['source']} ({sim['plays']['run']} runs, {sim['plays']['pass']} dropbacks).", "",
             "Values are median [25th, 75th percentile] 90th percentile; rates are shares of plays.",
             "Shift and tail are the sim's median and 90th percentile minus the NFL's, in NFL interquartile ranges.", "",
             "| Metric | NFL | Sim | Shift | Tail | Flag |", "|---|---|---|---:|---:|---|"]
    counts = {"ok": 0, "check": 0, "off": 0, "few": 0}
    marks = {}

    def row(metric, label):
        n, s = nfl["metrics"][metric], sim["metrics"].get(metric)
        if not n.get("n") or not s or s.get("n", 0) < args.min_n:
            counts["few"] += 1
            return f"| {label} | {fmt(n, metric) if n.get('n') else '-'} | n={s.get('n', 0) if s else 0} | | | too few |"
        shift, tail, mark = flag(metric, n, s)
        counts[mark] += 1
        marks[metric] = mark
        tail_text = "" if tail is None else f"{tail:+.2f}"
        return f"| {label} | {fmt(n, metric)} | {fmt(s, metric)} | {shift:+.2f} | {tail_text} | {mark} |"

    lines += [row(m, m) for m in nfl["metrics"] if "@" not in m]
    lines += ["", "## Runs by concept family", "", "| Metric | NFL | Sim | Shift | Tail | Flag |", "|---|---|---|---:|---:|---|"]
    for family in FAMILIES:
        lines += [row(f"{base}@{family}", f"{family}: {base[4:]}") for base in BY_FAMILY
                  if f"{base}@{family}" in nfl["metrics"]]
    lines += ["", f"{counts['ok']} ok, {counts['check']} check, {counts['off']} off, {counts['few']} without enough sim plays.",
              "", "Definitions: see `definitions` in either JSON, or scripts/mechanics/metrics.py."]
    broken = []
    if args.guard:
        guarded = json.loads(args.guard.read_text())["metrics"]
        broken = [m for m in guarded if marks.get(m) == "off"]
        lines += ["", f"Guard: {len(guarded) - len(broken)}/{len(guarded)} matched metrics still match."]
        lines += [f"- GUARD BROKEN: {m} is now off" for m in broken]
    text = "\n".join(lines) + "\n"
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(text)
    print(text)
    return 1 if broken else 0


if __name__ == "__main__":
    sys.exit(main())
