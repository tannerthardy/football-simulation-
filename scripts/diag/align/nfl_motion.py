"""Tracked defensive responses to pre-snap motion (2022, BDB 2025 weeks 1-9).

For every play with exactly one offensive player in motion since the line set
(player_play.motionSinceLineset), write each player's position at the line
set and at the snap, with the play's PFF man/zone, coverage and formation and,
for defenders, their PFF man matchup. Observation only; the operator that reads
it is motionlook.py (shared with the sim's export).

    python3 -I scripts/diag/align/nfl_motion.py   # -> out/align/nfl-motion.csv.gz
"""
import csv
import gzip
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data/raw/bdb2025/big-data-bowl-data"
OUT = ROOT / "out/align/nfl-motion.csv.gz"


def rows(name):
    with open(DATA / name, newline="") as handle:
        yield from csv.DictReader(handle)


def main():
    plays = {(r["gameId"], r["playId"]): r for r in rows("plays.csv")}
    per_play, info = {}, {}
    for r in rows("player_play.csv"):
        k = (r["gameId"], r["playId"])
        info[(k, r["nflId"])] = r
        if r["motionSinceLineset"].upper() == "TRUE":
            per_play.setdefault(k, []).append(r["nflId"])
    motion = {k: v[0] for k, v in per_play.items() if len(v) == 1 and k in plays}
    positions = {r["nflId"]: r["position"] for r in rows("players.csv")}
    # (play) -> {"line_set": {nflId: row}, "ball_snap": {...}}
    frames = {}
    for week in range(1, 10):
        for r in rows(f"tracking_week_{week}.csv"):
            k = (r["gameId"], r["playId"])
            if k not in motion:
                continue
            ev = r["event"]
            if ev not in ("line_set", "ball_snap"):
                continue
            slot = frames.setdefault(k, {}).setdefault(ev, {})
            # The first frame carrying the event (events repeat across one frame's players only).
            if r["nflId"] in slot:
                continue
            slot[r["nflId"]] = r
    OUT.parent.mkdir(parents=True, exist_ok=True)
    cols = ["gameId", "playId", "nflId", "side", "position", "isMotion", "xLS", "yLS", "xSN", "ySN", "ballY", "los",
            "down", "yardsToGo", "offenseFormation", "receiverAlignment", "pff_passCoverage", "pff_manZone", "isDropback",
            "inMotionAtBallSnap", "matchup", "assignment"]
    n = 0
    with gzip.open(OUT, "wt", newline="") as handle:
        w = csv.DictWriter(handle, fieldnames=cols)
        w.writeheader()
        for k, fr in frames.items():
            ls, sn = fr.get("line_set"), fr.get("ball_snap")
            if not ls or not sn or "NA" not in ls or "NA" not in sn:
                continue
            p = plays[k]
            right = next(iter(ls.values()))["playDirection"] == "right"
            # Normalize: offense moves toward +x; x relative to the line of scrimmage, y across.
            los = float(p["absoluteYardlineNumber"])
            ball = sn["NA"]
            bx, by = float(ball["x"]), float(ball["y"])
            sgn = 1 if right else -1
            off_club = p["possessionTeam"]
            for nid, a in ls.items():
                if nid == "NA" or nid not in sn:
                    continue
                b = sn[nid]
                pi = info.get((k, nid), {})
                side = "O" if a["club"] == off_club else "D"
                fx = lambda x: (float(x) - bx) * sgn
                fy = lambda y: (float(y) - by) * sgn
                w.writerow({"gameId": k[0], "playId": k[1], "nflId": nid, "side": side, "position": positions.get(nid, ""),
                            "isMotion": int(nid == motion[k]), "xLS": round(fx(a["x"]), 2), "yLS": round(fy(a["y"]), 2),
                            "xSN": round(fx(b["x"]), 2), "ySN": round(fy(b["y"]), 2), "ballY": round(by, 2), "los": los,
                            "down": p["down"], "yardsToGo": p["yardsToGo"], "offenseFormation": p["offenseFormation"],
                            "receiverAlignment": p["receiverAlignment"], "pff_passCoverage": p["pff_passCoverage"],
                            "pff_manZone": p["pff_manZone"], "isDropback": p["isDropback"],
                            "inMotionAtBallSnap": pi.get("inMotionAtBallSnap", ""),
                            "matchup": pi.get("pff_primaryDefensiveCoverageMatchupNflId", ""),
                            "assignment": pi.get("pff_defensiveCoverageAssignment", "")})
            n += 1
    print(f"{len(motion)} single-motion plays; {n} with line-set and snap frames -> {OUT}")


if __name__ == "__main__":
    main()
