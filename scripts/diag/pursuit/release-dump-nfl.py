#!/usr/bin/env python3
"""NFL block-release plays (2022 season, Big Data Bowl 2025), in release-op.py's play format (2026-11-24). Measurement only.

Every scrimmage run and dropback: all 22 players at 10 Hz from the snap to the end of the play, x in yards past the
line of scrimmage (the ball at the snap) toward the offense's goal, y across the field. car = the ball carrier other
than a pocket QB: on runs the QB until the handoff/pitch, then the rusher; on dropbacks the receiver from the catch, or
the QB from a scramble ('run' event) when he is the rusher. Run/pass from plays.csv isDropback; positions from players.csv.
Column layout as scripts/diag/align/nfl_snapframe.py. Writes derived positions only (out/, not committed).

    python3 -I scripts/diag/pursuit/release-dump-nfl.py [--weeks 1 2 ...] [--out out/pursuit/release-nfl.json]
    python3 -I scripts/diag/pursuit/release-op.py out/pursuit/release-nfl.json out/pursuit/release-nfl-rows.json
"""
import argparse, csv, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data/raw/bdb2025/big-data-bowl-data"
WIDTH = 160 / 3
HANDOFF = {"handoff", "pitch", "lateral", "snap_direct"}
CATCH = {"pass_outcome_caught"}
END = {"tackle", "out_of_bounds", "touchdown", "fumble", "pass_outcome_incomplete", "qb_sack", "safety", "pass_outcome_touchdown"}

def rows(name):
    with open(DATA / name, newline="") as h: yield from csv.DictReader(h)

def build(key, rs, p, pp, position):
    frames = {}
    for r in rs: frames.setdefault(int(r[4]), []).append(r)
    ids = sorted(frames)
    snap = next((i for i in ids if frames[i][0][5] == "SNAP"), None)
    if snap is None: return None
    ball = [r for r in frames[snap] if r[2] == "NA"]
    if not ball: return None
    flip = rs[0][9] == "left"
    norm = lambda r: (120 - float(r[10]), WIDTH - float(r[11])) if flip else (float(r[10]), float(r[11]))
    los = norm(ball[0])[0]
    run = p["isDropback"] not in ("1", "TRUE", "True")
    mine = pp.get(key, {})
    rusher = next((n for n, v in mine.items() if v.get("hadRushAttempt") == "1"), None)
    receiver = next((n for n, v in mine.items() if v.get("hadPassReception") == "1"), None)
    qb = next((r[2] for r in frames[snap] if position.get(r[2]) == "QB" and r[8] == p["possessionTeam"]), None)
    car = (qb if run else None); out = []
    for i in ids:
        if i < snap: continue
        fr = frames[i]; ev = {r[17] for r in fr if len(r) > 17}
        if run and rusher and ev & HANDOFF: car = rusher
        if not run and receiver and ev & CATCH: car = receiver
        if not run and rusher and rusher == qb and "run" in ev: car = qb
        f = {"t": round((i - snap) / 10, 1), "car": car, "off": {}, "def": {}}
        for r in fr:
            if r[2] == "NA": continue
            x, y = norm(r)
            f["off" if r[8] == p["possessionTeam"] else "def"][r[2]] = [round(x - los, 2), round(y, 2)]
        out.append(f)
        if ev & END and i > snap: break
    if run and rusher and car == qb and rusher != qb: car = None  # handoff not seen
    dpos = {n: position.get(n, "") for n in out[0]["def"]} if out else {}
    return {"ptype": "run" if run else "pass", "dpos": dpos, "frames": out} if len(out) >= 8 else None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--weeks", type=int, nargs="*", default=list(range(1, 10)))
    ap.add_argument("--out", type=Path, default=ROOT / "out/pursuit/release-nfl.json")
    a = ap.parse_args()
    position = {r["nflId"]: r["position"] for r in rows("players.csv")}
    plays = {(r["gameId"], r["playId"]): r for r in rows("plays.csv")
             if r["playNullifiedByPenalty"] != "Y" and r["qbSpike"] not in ("1", "TRUE") and r["qbKneel"] not in ("1", "TRUE")}
    pp = {}
    for r in rows("player_play.csv"):
        if r.get("hadRushAttempt") == "1" or r.get("hadPassReception") == "1": pp.setdefault((r["gameId"], r["playId"]), {})[r["nflId"]] = r
    out = []
    for week in a.weeks:
        print(f"week {week}: {len(out)} plays", file=sys.stderr)
        by = {}
        with open(DATA / f"tracking_week_{week}.csv", newline="") as h:
            rd = csv.reader(h); next(rd)
            for r in rd:
                if r[5] == "BEFORE_SNAP": continue
                k = (r[0], r[1])
                if k in plays: by.setdefault(k, []).append(r)
        for k, rs in by.items():
            pl = build(k, rs, plays[k], pp, position)
            if pl: out.append(pl)
    a.out.parent.mkdir(parents=True, exist_ok=True)
    json.dump({"source": "bdb2025", "weeks": a.weeks, "plays": out}, open(a.out, "w")); print("plays", len(out))

if __name__ == "__main__":
    main()
