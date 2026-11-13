"""Live-play time and what happens after first contact, from NFL tracking
(Big Data Bowl 2025, the tracking weeks present). Uses the football's rows
and their events: ball_snap, handoff, pass_outcome_caught, first_contact,
tackle, out_of_bounds, pass_outcome_incomplete, qb_sack.

- Live time from the snap to the first ending event, by ending.
- Designed runs (handoff, no dropback, no kneel or sneak): snap to handoff,
  handoff to first contact, first contact to tackle, and the ball's progress
  before and after first contact (yards).
- Completions tackled in the field: catch to first contact and first contact to
  tackle, in seconds and yards.

Aggregates only.
  python3 -I scripts/data/bdb2025_contact.py <bdb2025 dir> <out.json>
"""
import csv
import glob
import json
import statistics
import sys
from collections import defaultdict

D, OUT = sys.argv[1], sys.argv[2]
plays = {}
with open(f"{D}/plays.csv", newline="") as f:
    for r in csv.DictReader(f):
        if r["playNullifiedByPenalty"] == "Y":
            continue
        run = r["isDropback"] != "TRUE" and r["qbKneel"] in ("0", "FALSE", "NA", "") and r["qbSneak"] != "TRUE"
        plays[(r["gameId"], r["playId"])] = {"los": float(r["absoluteYardlineNumber"]), "run": run, "caught": r["passResult"] == "C"}

events = defaultdict(dict)
direction = {}
weeks = sorted(glob.glob(f"{D}/tracking_week_*.csv"))
for path in weeks:
    with open(path, newline="") as f:
        header = next(csv.reader([f.readline()]))
        col = {k: i for i, k in enumerate(header)}
        for line in f:
            if '"football"' not in line and ",football," not in line:
                continue
            r = next(csv.reader([line]))
            k = (r[col["gameId"]], r[col["playId"]])
            if k not in plays:
                continue
            direction[k] = r[col["playDirection"]]
            e = r[col["event"]].strip()
            if e != "NA" and e not in events[k]:
                events[k][e] = (int(r[col["frameId"]]), float(r[col["x"]]))

END = {"tackle": "in bounds", "qb_slide": "in bounds", "out_of_bounds": "out of bounds", "pass_outcome_incomplete": "incomplete", "touchdown": "touchdown", "qb_sack": "sack", "qb_strip_sack": "sack"}
live = defaultdict(list)
run = defaultdict(list)
catch = defaultdict(list)
for k, e in events.items():
    if "ball_snap" not in e:
        continue
    s = e["ball_snap"][0]
    ends = sorted((f, END[n]) for n, (f, _) in e.items() if n in END)
    if ends:
        live[ends[0][1]].append((ends[0][0] - s) / 10)
    p = plays[k]
    sign = 1 if direction[k] == "right" else -1
    if p["run"] and all(n in e for n in ("handoff", "first_contact", "tackle")):
        h, fc, tk = e["handoff"], e["first_contact"], e["tackle"]
        if s <= h[0] <= fc[0] <= tk[0]:
            run["snapToHandoff"].append((h[0] - s) / 10)
            run["handoffToContact"].append((fc[0] - h[0]) / 10)
            run["contactToTackle"].append((tk[0] - fc[0]) / 10)
            run["yardsBeforeContact"].append((fc[1] - p["los"]) * sign)
            run["yardsAfterContact"].append((tk[1] - fc[1]) * sign)
    if p["caught"] and all(n in e for n in ("pass_outcome_caught", "first_contact", "tackle")):
        c, fc, tk = e["pass_outcome_caught"], e["first_contact"], e["tackle"]
        if c[0] <= fc[0] <= tk[0]:
            catch["catchToContact"].append((fc[0] - c[0]) / 10)
            catch["contactToTackle"].append((tk[0] - fc[0]) / 10)
            catch["yardsCatchToContact"].append((fc[1] - c[1]) * sign)
            catch["yardsAfterContact"].append((tk[1] - fc[1]) * sign)


def summ(v):
    s = sorted(v)
    return {"n": len(v), "mean": round(statistics.mean(v), 2), "p25": round(s[len(s) // 4], 2), "median": round(statistics.median(v), 2), "p75": round(s[3 * len(s) // 4], 2)}


out = {
    "source": f"Big Data Bowl 2025 tracking, {len(weeks)} week(s); football events",
    "liveSeconds": {k: summ(v) for k, v in sorted(live.items())},
    "designedRuns": {k: summ(v) for k, v in run.items()},
    "completions": {k: summ(v) for k, v in catch.items()},
}
with open(OUT, "w") as fh:
    json.dump(out, fh, indent=1)
print(json.dumps(out, indent=1))
