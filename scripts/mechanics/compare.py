#!/usr/bin/env python3
"""Print the sim-vs-NFL mechanism tables.

    python3 -I scripts/mechanics/compare.py [--nfl data/reviews/mechanics/nfl-bdb2022.json] \
        [--sim out/mechanics/sim.json] [--out out/mechanics/report.md] [--guard FILE]

Shift = (sim median - NFL median) / NFL interquartile range: how far the
typical sim value sits from the typical NFL value, in units of normal NFL
spread. Tail is the same for the 90th percentile, because a right median with
a wrong tail (e.g. linemen driven 4 yd on one play in four) is still wrong.
The worse of the two decides: < 0.25 "ok", < 0.75 "check", otherwise "off".
Rates (0/1 metrics) compare means, flagged by relative difference.
Other seasons (2017 all plays, 2021 dropbacks, 2023 ball in the air) are shown
for replication when their summaries exist; flags use 2022.
These flags point at mechanisms to investigate. They are not targets to tune.
With --guard, "check" remains an accepted warning; "off" or unavailable
evidence exits 1. Without a guard the report remains descriptive.
"""
import argparse
import json
import math
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPLICATIONS = (("2017", ROOT / "data/reviews/mechanics/nfl-bdb2017.json"),
                ("2021", ROOT / "data/reviews/mechanics/nfl-bdb2021-pass.json"),
                ("2023", ROOT / "data/reviews/mechanics/nfl-bdb2023-air.json"))
RATES = {"pass.pressure_2yd_before_throw", "block.pass.still_engaged_2s",
         "contact.run.broke_contact", "contact.catch.broke_contact",
         "contact.run.approach_headon", "contact.catch.approach_headon"}
PRESSURE_METRICS = {"pass.pressure_2yd_before_throw", "pass.time_to_pressure", "pass.pressure_2yd_unknown"}
SECTIONS = (("Movement (every player, every play)", ("move.",)),
            ("Runs", ("run.",)),
            ("Contact and tackling", ("contact.",)),
            ("Blocks (labeled pairs)", ("block.",)),
            ("Pass protection and rush", ("pass.",)),
            ("Routes and catches", ("route.", "catch.")),
            ("Ball in the air", ("air.",)))
CELLS = (("Runs by concept family", ("inside_zone", "outside_zone", "gap_pull", "man_duo", "draw")),
         ("Runs by box count", ("box6-", "box7", "box8+")),
         ("Passes by coverage", ("man", "zone")))
BY_CELL = ("run.handoff_s", "run.carrier_cross_los_s", "run.yards_before_contact", "run.yards_after_contact",
           "run.max_engaged_dl_driven_back_3s", "contact.run.carrier_speed_0_5s_after", "run.yards",
           "route.separation_1.5s", "route.separation_2.5s", "air.separation_at_throw", "air.defender_closing",
           "air.separation_at_arrival", "catch.yards_after_catch", "pass.time_to_throw")


def flag(metric, nfl, sim):
    if metric.split("@")[0] in RATES:
        rel = (sim["mean"] - nfl["mean"]) / max(nfl["mean"], 0.01)
        return rel, None, "ok" if abs(rel) < 0.15 else "check" if abs(rel) < 0.4 else "off"
    iqr = max(nfl["p75"] - nfl["p25"], 1e-6)
    shift = (sim["p50"] - nfl["p50"]) / iqr
    tail = (sim["p90"] - nfl["p90"]) / iqr
    worst = max(abs(shift), abs(tail))
    return shift, tail, "ok" if worst < 0.25 else "check" if worst < 0.75 else "off"


def summary_issue(summary, metric, source, min_n=1):
    if not isinstance(summary, dict) or not summary:
        return f"{source} metric missing"
    n = summary.get("n")
    if not isinstance(n, (int, float)) or isinstance(n, bool) or not math.isfinite(n) or n < 0:
        return f"{source} sample count unavailable"
    if n == 0:
        return f"no known {source} samples"
    if n < min_n:
        return f"too few {source} samples (n={n}, minimum {min_n})"
    fields = ("mean",) if metric.split("@")[0] in RATES else ("p25", "p50", "p75", "p90")
    unknown = [field for field in fields if not isinstance(summary.get(field), (int, float))
               or isinstance(summary[field], bool) or not math.isfinite(summary[field])]
    if unknown:
        return f"{source} statistics unavailable ({', '.join(unknown)})"
    return None


def pressure_operator_issue(nfl, sim):
    operators = (nfl.get("pressureOperator"), sim.get("pressureOperator"))
    if operators[0] != operators[1]:
        return "pressure operator differs"
    if any(not isinstance(value, str) or not value.strip() for value in operators):
        return "pressure operator unavailable"
    return None


def fmt(summary, metric):
    if summary_issue(summary, metric, "summary"):
        return "-"
    if metric.split("@")[0] in RATES:
        return f"{100 * summary['mean']:.1f}%"
    return f"{summary['p50']:.2f} [{summary['p25']:.2f}, {summary['p75']:.2f}] {summary['p90']:.2f}"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--nfl", type=Path, default=ROOT / "data/reviews/mechanics/nfl-bdb2022.json")
    parser.add_argument("--sim", type=Path, default=ROOT / "out/mechanics/sim.json")
    parser.add_argument("--out", type=Path, default=ROOT / "out/mechanics/report.md")
    parser.add_argument("--min-n", type=int, default=30, help="minimum known sim samples; NFL needs positive n")
    parser.add_argument("--guard", type=Path, help="JSON metrics list; exit 1 if any is 'off' or unavailable ('check' remains a warning)")
    args = parser.parse_args()
    nfl, sim = json.loads(args.nfl.read_text()), json.loads(args.sim.read_text())
    pressure_issue = pressure_operator_issue(nfl, sim)
    others = [(season, json.loads(path.read_text())) for season, path in REPLICATIONS if path.exists()]
    commit = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True, cwd=ROOT).stdout.strip()
    lines = [f"# Sim vs NFL mechanisms ({commit})", "",
             f"NFL 2022: {nfl['source']} ({nfl['plays']['run']} runs, {nfl['plays']['pass']} dropbacks).  ",
             *[f"NFL {season} (replication): {data['source']}.  " for season, data in others],
             f"Sim: {sim['source']} ({sim['plays']['run']} runs, {sim['plays']['pass']} dropbacks).", "",
             "Values are median [25th, 75th percentile] 90th percentile; rates are shares.",
             "Shift and tail: sim median and 90th percentile minus the 2022 NFL's, in 2022 NFL interquartile ranges.",
             f"Pressure operators: NFL `{nfl.get('pressureOperator', 'legacy/unspecified')}`, sim `{sim.get('pressureOperator', 'legacy/unspecified')}`. Missing or different versions are unavailable."]
    counts = {"ok": 0, "check": 0, "off": 0, "unavailable": 0}
    marks = {}
    reasons = {}
    header = ["| Metric | NFL 2022 | " + " | ".join(f"NFL {season}" for season, _ in others) + " | Sim | Shift | Tail | Flag |",
              "|---|---|" + "---|" * len(others) + "---|---:|---:|---|"]

    def row(metric, label):
        n, s = nfl["metrics"][metric], sim["metrics"].get(metric)
        is_pressure = metric.split("@")[0] in PRESSURE_METRICS
        rep = " | ".join((pressure_operator_issue(nfl, data) if is_pressure else None)
                         or fmt(data["metrics"].get(metric), metric) for _, data in others)
        # Keep the existing sample policy: positive NFL n, sim n >= --min-n.
        reason = ((pressure_issue if is_pressure else None) or summary_issue(n, metric, "NFL")
                  or summary_issue(s, metric, "sim", args.min_n))
        if reason:
            marks[metric] = "unavailable"
            reasons[metric] = reason
            counts["unavailable"] += 1
            label_state = reason.replace("pressure ", "", 1) if is_pressure and pressure_issue else f"unavailable: {reason}"
            return f"| {label} | {fmt(n, metric)} | {rep} | {fmt(s, metric)} | | | {label_state} |"
        shift, tail, mark = flag(metric, n, s)
        counts[mark] += 1
        marks[metric] = mark
        tail_text = "" if tail is None else f"{tail:+.2f}"
        return f"| {label} | {fmt(n, metric)} | {rep} | {fmt(s, metric)} | {shift:+.2f} | {tail_text} | {mark} |"

    plain = [m for m in nfl["metrics"] if "@" not in m]
    for title, prefixes in SECTIONS:
        chosen = [m for m in plain if m.startswith(prefixes)]
        lines += ["", f"## {title}", "", *header, *[row(m, m) for m in chosen]]
    bins = [m for m in nfl["metrics"] if m.startswith("contact.") and "@" in m and m.split("@")[1] in
            ("slow", "mid", "fast", "headon", "side", "behind")]
    lines += ["", "## Yards after contact by entry speed and tackle angle", "", *header, *[row(m, m) for m in bins]]
    for title, cells in CELLS:
        lines += ["", f"## {title}", "", *header]
        for cell in cells:
            lines += [row(f"{base}@{cell}", f"{cell}: {base}") for base in BY_CELL if f"{base}@{cell}" in nfl["metrics"]]
    lines += ["", f"{counts['ok']} ok, {counts['check']} check, {counts['off']} off, {counts['unavailable']} unavailable comparisons.",
              "", "Definitions: see `definitions` in either JSON, or scripts/mechanics/metrics.py."]
    broken = []
    unavailable = []
    if args.guard:
        guarded = json.loads(args.guard.read_text())["metrics"]
        for metric in guarded:
            if metric not in marks:
                marks[metric] = "unavailable"
                reasons[metric] = "NFL metric missing" if metric not in nfl["metrics"] else "not evaluated by report"
        broken = [m for m in guarded if marks.get(m) == "off"]
        unavailable = [m for m in guarded if marks.get(m) == "unavailable"]
        ok = sum(marks[m] == "ok" for m in guarded)
        check = sum(marks[m] == "check" for m in guarded)
        lines += ["", f"Guard: {ok + check}/{len(guarded)} guarded metrics within policy ({ok} ok, {check} check/warning); {len(broken)} off, {len(unavailable)} unavailable."]
        for metric in guarded:
            mark = marks[metric]
            if mark == "unavailable":
                lines += [f"- GUARD UNAVAILABLE: {metric} {reasons[metric]}; reuse compatible evidence or explicitly remeasure saved plays."]
            elif mark == "off":
                lines += [f"- GUARD BROKEN: {metric} is now off"]
            elif mark == "check":
                lines += [f"- GUARD CHECK: {metric} is check (warning accepted by existing guard policy)"]
            else:
                lines += [f"- GUARD OK: {metric} is ok"]
    text = "\n".join(lines) + "\n"
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(text)
    print(text)
    return 1 if broken or unavailable else 0


if __name__ == "__main__":
    sys.exit(main())
