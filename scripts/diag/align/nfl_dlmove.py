"""Tracked line movement at the snap (2022, BDB 2025 weeks 1-9).

For every play, every player's position at the snap and at 0.1, 0.2, 0.3 and
0.5 s after it (frames after `ball_snap`), normalized so the offense moves
toward +x and y is across from the ball, with the play's context. The
operator that reads it is dlmove.py. Observation only.

    python3 -I scripts/diag/align/nfl_dlmove.py   # -> out/align/nfl-dlmove.csv.gz
"""
import csv
import gzip
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data/raw/bdb2025/big-data-bowl-data"
OUT = ROOT / "out/align/nfl-dlmove.csv.gz"
OFFSETS = (0, 1, 2, 3, 5)   # frames after the snap (10 Hz)


def rows(name):
    with open(DATA / name, newline="") as handle:
        yield from csv.DictReader(handle)


def main():
    plays = {(r["gameId"], r["playId"]): r for r in rows("plays.csv")}
    positions = {r["nflId"]: r["position"] for r in rows("players.csv")}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    cols = ["gameId", "playId", "nflId", "side", "position", "x0", "y0", "y1", "y2", "y3", "y5", "x5",
            "down", "yardsToGo", "offenseFormation", "isDropback", "pff_runConceptPrimary", "pff_passCoverage"]
    out = gzip.open(OUT, "wt", newline="")
    w = csv.DictWriter(out, fieldnames=cols)
    w.writeheader()
    n = 0

    def flush(k, fr):
        nonlocal n
        s = next((f for f, players in sorted(fr.items()) if any(r["event"] == "ball_snap" for r in players.values())), None)
        if s is None or not all((s + o) in fr for o in OFFSETS) or "NA" not in fr[s]:
            return
        p = plays[k]
        ball = fr[s]["NA"]
        bx, by = float(ball["x"]), float(ball["y"])
        sg = 1 if ball["playDirection"] == "right" else -1
        off = p["possessionTeam"]
        for nid, a in fr[s].items():
            if nid == "NA" or not all(nid in fr[s + o] for o in OFFSETS):
                continue
            y = lambda o: round((float(fr[s + o][nid]["y"]) - by) * sg, 2)
            w.writerow({"gameId": k[0], "playId": k[1], "nflId": nid, "side": "O" if a["club"] == off else "D",
                        "position": positions.get(nid, ""), "x0": round((float(a["x"]) - bx) * sg, 2),
                        "y0": y(0), "y1": y(1), "y2": y(2), "y3": y(3), "y5": y(5),
                        "x5": round((float(fr[s + 5][nid]["x"]) - bx) * sg, 2),
                        "down": p["down"], "yardsToGo": p["yardsToGo"], "offenseFormation": p["offenseFormation"],
                        "isDropback": p["isDropback"], "pff_runConceptPrimary": p["pff_runConceptPrimary"],
                        "pff_passCoverage": p["pff_passCoverage"]})
        n += 1

    for week in range(1, 10):
        key, fr = None, {}
        for r in rows(f"tracking_week_{week}.csv"):
            k = (r["gameId"], r["playId"])
            if k != key:
                if key in plays:
                    flush(key, fr)
                key, fr = k, {}
            if k in plays:
                fr.setdefault(int(r["frameId"]), {})[r["nflId"]] = r
        if key in plays:
            flush(key, fr)
        print(f"week {week}: {n} plays", flush=True)
    out.close()
    print(f"{n} plays -> {OUT}")


if __name__ == "__main__":
    main()
