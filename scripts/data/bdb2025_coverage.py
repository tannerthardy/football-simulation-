"""Target separation at release, arrival and catch; BDB 2025 (2022 season).

python3 -I scripts/data/bdb2025_coverage.py INPUT OUTPUT --weeks 1 2
Two streaming passes retain event frames only. Require the target plus all
11 defenders at each measurement; aggregate only, no tracking identifiers.
Arrival includes off-target balls and is NOT the engine's catch-contest sample.
"""
import argparse
import csv
import json
import math
import statistics
from collections import Counter, defaultdict
from pathlib import Path


def separation(frame, target, defensive_team):
    """Missing participants must not turn into artificial open receivers."""
    receiver = frame.get(target)
    defenders = [p for p in frame.values() if p[2] == defensive_team]
    if receiver is None or len(defenders) != 11:
        return None
    return min(math.hypot(d[0] - receiver[0], d[1] - receiver[1]) for d in defenders)


def summary(values):
    values = sorted(values)
    if not values:
        return {"n": 0}
    return {"n": len(values), "mean": statistics.mean(values), "median": statistics.median(values),
            "p10": values[int(.1 * len(values))], "p90": values[int(.9 * len(values))],
            "under1Pct": 100 * sum(v < 1 for v in values) / len(values)}


def extract(directory, weeks):
    plays, targets, routes = {}, {}, {}
    with open(directory / "plays.csv", newline="") as f:
        for r in csv.DictReader(f):
            if r["playNullifiedByPenalty"] == "Y" or r["passResult"] not in ("C", "I", "IN") or r["qbSpike"] in ("1", "TRUE"):
                continue
            plays[(r["gameId"], r["playId"])] = r
    ambiguous = set()
    with open(directory / "player_play.csv", newline="") as f:
        for r in csv.DictReader(f):
            k = (r["gameId"], r["playId"])
            if k not in plays or r["wasTargettedReceiver"] != "1":
                continue
            if k in targets:
                ambiguous.add(k)
            targets[k], routes[k] = r["nflId"], r["routeRan"]
    events = defaultdict(dict)
    wanted = {"pass_forward": "throw", "pass_arrived": "arrival", "pass_outcome_caught": "catch"}
    paths = [directory / f"tracking_week_{week}.csv" for week in weeks]
    for path in paths:
        with open(path, newline="") as f:
            header = next(csv.reader(f))
            col = {k: i for i, k in enumerate(header)}
            for line in f:
                if ',football,' not in line and '"football"' not in line:
                    continue
                r = next(csv.reader([line]))
                k = (r[col["gameId"]], r[col["playId"]])
                e = r[col["event"]]
                if k in targets and k not in ambiguous and e in wanted:
                    events[k].setdefault(wanted[e], int(r[col["frameId"]]))
    frames = defaultdict(dict)
    needed = {(k, frame) for k, ev in events.items() for frame in ev.values()}
    for path in paths:
        with open(path, newline="") as f:
            header = next(csv.reader(f))
            col = {k: i for i, k in enumerate(header)}
            for line in f:
                parts = line.split(',', 2)
                k = (parts[0].strip('"'), parts[1].strip('"'))
                if k not in events:
                    continue
                r = next(csv.reader([line]))
                frame = int(r[col["frameId"]])
                if (k, frame) in needed and r[col["nflId"]] not in ('NA', ''):
                    frames[(k, frame)][r[col["nflId"]]] = (float(r[col["x"]]), float(r[col["y"]]), r[col["club"]])
    values = defaultdict(list)
    by_coverage, by_route = defaultdict(lambda: defaultdict(list)), defaultdict(lambda: defaultdict(list))
    excluded = Counter()
    for k, ev in events.items():
        for event, frame in ev.items():
            if event == 'catch' and plays[k]["passResult"] != 'C':
                continue
            sep = separation(frames[(k, frame)], targets[k], plays[k]["defensiveTeam"])
            if sep is None:
                excluded[event] += 1
                continue
            values[event].append(sep)
            by_coverage[plays[k]["pff_passCoverage"]][event].append(sep)
            by_route[routes[k]][event].append(sep)
    return {"source": "Big Data Bowl 2025; NFL 2022", "weeks": weeks,
            "definitions": {"separation": "Target center to nearest of all 11 defenders, at labeled football event frame (10 Hz).",
                            "cohort": "Non-nullified C/I/IN passes, excluding spikes; one labeled target; complete target/defender frame.",
                            "comparison": "Catch is completed passes only. Arrival includes off-target passes; engine opportunity separation excludes those. Coverage/route labels are observational, not randomized."},
            "excludedIncompleteFrames": dict(excluded), "ambiguousTargetPlays": len(ambiguous),
            "overall": {k: summary(v) for k, v in values.items()},
            "byCoverage": {k: {e: summary(v) for e, v in ev.items()} for k, ev in sorted(by_coverage.items())},
            "byRoute": {k: {e: summary(v) for e, v in ev.items()} for k, ev in sorted(by_route.items())}}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--weeks', nargs='+', type=int, default=[1, 2])
    args = parser.parse_args()
    result = extract(args.input, args.weeks)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result['overall'], indent=2))
