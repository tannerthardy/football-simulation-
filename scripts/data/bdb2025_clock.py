"""Game clock per snap in the NFL (Big Data Bowl 2025 plays, 2022 weeks 1-9).

Seconds of game clock between consecutive scrimmage snaps of the same drive,
by how the earlier play ended, outside the late-half windows (last 2:00 of
the 2nd quarter, last 5:00 of the 4th) where the clock rules change.
Timeouts are not in the file, so the low tail includes them; medians are the
reference. Also the play clock at the snap. Aggregates only.

  python3 -I scripts/data/bdb2025_clock.py <bdb2025 dir> <out.json>
"""
import csv
import json
import re
import statistics
import sys
from collections import defaultdict

D, OUT = sys.argv[1], sys.argv[2]


def secs(c):
    m, s = c.split(":")
    return int(m) * 60 + int(s)


rows = []
with open(f"{D}/plays.csv", newline="") as f:
    for r in csv.DictReader(f):
        rows.append(r)
rows.sort(key=lambda r: (r["gameId"], int(r["playId"])))
games = {r["gameId"] for r in rows}

OOB = re.compile(r"\b(ran ob|pushed ob|out of bounds)\b", re.I)


def kind(r):
    d = r["playDescription"]
    if r["playNullifiedByPenalty"] == "Y" or "PENALTY" in d and r["penaltyYards"] not in ("NA", ""):
        return "penalty"
    if r["qbSpike"] == "TRUE":
        return "spike"
    if r["qbKneel"] not in ("0", "FALSE", "NA", ""):
        return "kneel"
    if "TOUCHDOWN" in d or "INTERCEPTED" in d or "FUMBLES" in d:
        return None
    pr = r["passResult"]
    if pr == "I":
        return "incomplete"
    if pr == "S":
        return "sack"
    if OOB.search(d):
        return "out of bounds"
    return "in bounds"


gap = defaultdict(list)
clock_at_snap = defaultdict(list)
for a, b in zip(rows, rows[1:]):
    if a["gameId"] != b["gameId"] or a["quarter"] != b["quarter"] or a["possessionTeam"] != b["possessionTeam"]:
        continue
    q = int(a["quarter"])
    ta, tb = secs(a["gameClock"]), secs(b["gameClock"])
    if (q == 2 and tb < 120) or (q >= 4 and tb < 300) or q > 4:
        continue
    k = kind(a)
    if k is None:
        continue
    dt = ta - tb
    if dt < 0 or dt > 80:
        continue
    gap[k].append(dt)
    if b["playClockAtSnap"] not in ("NA", ""):
        clock_at_snap[k].append(float(b["playClockAtSnap"]))


def summ(v):
    s = sorted(v)
    return {"n": len(v), "mean": round(statistics.mean(v), 2), "p25": s[len(s) // 4], "median": statistics.median(v), "p75": s[3 * len(s) // 4]}


out = {
    "source": "Big Data Bowl 2025 plays (2022 weeks 1-9); game clock between consecutive snaps of a drive, outside the last 2:00 of Q2 and 5:00 of Q4",
    "games": len(games),
    "scrimmagePlaysPerTeamGame": round(len(rows) / len(games) / 2, 2),
    "secondsBetweenSnaps": {k: summ(v) for k, v in sorted(gap.items())},
    "playClockAtNextSnap": {k: summ(v) for k, v in sorted(clock_at_snap.items())},
}
allg = [x for v in gap.values() for x in v]
out["secondsBetweenSnaps"]["all"] = summ(allg)
with open(OUT, "w") as fh:
    json.dump(out, fh, indent=1)
print(json.dumps(out, indent=1))
