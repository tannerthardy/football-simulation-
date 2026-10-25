"""Drive-level reference from Big Data Bowl 2025 plays (2022 weeks 1-9).

Drives are inferred from consecutive scrimmage plays by the same offense
within a game half; points are the offense's score change from the drive's
first snap to the next drive's first snap (touchdown and try, or field goal).
Reports drives per team-game, plays per drive, average start, points per
drive overall and by start zone. Only aggregates are written.

  python3 -I scripts/data/bdb2025_drives.py <bdb2025 dir> <out.json>
"""
import csv
import json
import statistics
import sys
from collections import defaultdict

D, OUT = sys.argv[1], sys.argv[2]
games = {}
with open(f"{D}/games.csv", newline="") as f:
    for r in csv.DictReader(f):
        games[r["gameId"]] = r
rows = defaultdict(list)
with open(f"{D}/plays.csv", newline="") as f:
    for r in csv.DictReader(f):
        rows[r["gameId"]].append(r)

drives = []
for gid, plays in rows.items():
    plays.sort(key=lambda r: int(r["playId"]))
    g = games[gid]
    cur = None
    for r in plays:
        team = r["possessionTeam"]
        half = 1 if int(r["quarter"]) <= 2 else 2 if int(r["quarter"]) <= 4 else 3
        home = team == g["homeTeamAbbr"]
        score = int(r["preSnapHomeScore"]) if home else int(r["preSnapVisitorScore"])
        num = int(r["yardlineNumber"])
        own = 50 if num == 50 else num if r["yardlineSide"] == team else 100 - num
        if cur is None or cur["team"] != team or cur["half"] != half:
            if cur is not None:
                cur["end"] = (int(r["preSnapHomeScore"]), int(r["preSnapVisitorScore"]))
                drives.append(cur)
            cur = {"game": gid, "team": team, "home": home, "half": half, "start": own, "plays": 0, "score0": score}
        cur["plays"] += 1
    if cur is not None:
        cur["end"] = (int(g["homeFinalScore"]), int(g["visitorFinalScore"]))
        drives.append(cur)

for d in drives:
    end = d["end"][0] if d["home"] else d["end"][1]
    d["points"] = max(0, end - d["score0"])

team_games = len(rows) * 2
zones = {"inside 20": lambda s: s < 20, "20-39": lambda s: 20 <= s < 40, "40-59": lambda s: 40 <= s < 60, "60+": lambda s: s >= 60}
out = {
    "source": "Big Data Bowl 2025 (2022 weeks 1-9); drives inferred from scrimmage plays",
    "drivesPerTeamGame": round(len(drives) / team_games, 2),
    "playsPerDrive": round(statistics.mean(d["plays"] for d in drives), 2),
    "avgStart": round(statistics.mean(d["start"] for d in drives), 1),
    "pointsPerDrive": round(statistics.mean(d["points"] for d in drives), 2),
    "pointsPerTeamGame": round(sum(d["points"] for d in drives) / team_games, 2),
    "byStart": {
        k: {"share": round(100 * sum(f(d["start"]) for d in drives) / len(drives), 1), "pointsPerDrive": round(statistics.mean(d["points"] for d in drives if f(d["start"])), 2)}
        for k, f in zones.items()
    },
}
with open(OUT, "w") as fh:
    json.dump(out, fh, indent=1)
print(json.dumps(out, indent=1))
