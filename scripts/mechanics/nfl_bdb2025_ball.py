#!/usr/bin/env python3
"""Ball track and pass labels for BDB 2025 dropbacks, keyed like nfl_bdb2025.py's common records ("gameId-playId").

    python3 -I scripts/mechanics/nfl_bdb2025_ball.py [--weeks 1 2 ...] [--out out/mechanics/nfl-ball.jsonl.gz]

The common play records carry players only; this side file adds the football's (x, y) per 0.1 s frame from the snap
in the same normalized frame (x yards past the line of scrimmage, offense moving +x; y mirrored for plays going
left), so operators can measure where the ball went. Labels are copied from plays.csv / player_play.csv for
cross-checking geometric operators, never as the operator itself: passResult, passTippedAtLine, whether the play
description names a receiver ("pass ... to X" / "[X]"; a pass with no named receiver is how the league scores a
throwaway), passDefensed (any defender), hadInterception.
"""
import argparse, csv, gzip, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/raw/bdb2025/big-data-bowl-data"
WIDTH = 160 / 3


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--weeks", type=int, nargs="*", default=list(range(1, 10)))
    ap.add_argument("--out", default=str(ROOT / "out/mechanics/nfl-ball.jsonl.gz"))
    a = ap.parse_args()
    lab = {}
    with open(DATA / "plays.csv", newline="") as h:
        for r in csv.DictReader(h):
            if r["isDropback"] != "TRUE": continue
            d = r["playDescription"]
            named = bool(re.search(r"\bpass (?:incomplete )?(?:(?:short|deep) )?(?:(?:left|middle|right) )?(?:to|intended for) [A-Z]", d))
            lab[(r["gameId"], r["playId"])] = {"passResult": r["passResult"], "tipped": r["passTippedAtLine"] == "TRUE",
                                               "namedReceiver": named, "desc": d, "pbu": False, "int": False}
    with open(DATA / "player_play.csv", newline="") as h:
        for r in csv.DictReader(h):
            m = lab.get((r["gameId"], r["playId"]))
            if m is None: continue
            if r["passDefensed"] == "1": m["pbu"] = True
            if r["hadInterception"] == "1": m["int"] = True
    out = gzip.open(a.out, "wt"); n = 0
    for w in a.weeks:
        print(f"week {w}", file=sys.stderr)
        cur = None; rows = []
        def flush():
            nonlocal n
            if cur is None or cur not in lab or not rows: return
            snap = next((f for f, ft, *_ in rows if ft == "SNAP"), None)
            if snap is None: return
            rows.sort()
            left = rows[0][2] == "left"
            pts = {f: ((120 - x, WIDTH - y) if left else (x, y)) for f, _, _, x, y in rows}
            if snap not in pts: return
            los = pts[snap][0]
            b = [[round(pts[f][0] - los, 2), round(pts[f][1], 2)] for f in sorted(pts) if f >= snap]
            out.write(json.dumps({"id": f"{cur[0]}-{cur[1]}", "b": b, **lab[cur]}) + "\n"); n += 1
        with open(DATA / f"tracking_week_{w}.csv", newline="") as h:
            next(h)
            for line in h:
                if ',NA,"football",' not in line: continue
                r = next(csv.reader([line]))
                key = (r[0], r[1])
                if key != cur:
                    flush(); cur = key; rows = []
                rows.append((int(r[4]), r[5], r[9], float(r[10]), float(r[11])))
        flush()
    out.close(); print(f"{n} dropbacks with a ball track -> {a.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
