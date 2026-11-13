#!/usr/bin/env python3
"""Yards to the goal at the snap for every BDB2025 play, the "NFL60" filter the
run-tail operators use (scripts/diag/stretch/*.py --ytg60, bands.py, report.py).
Own half: 100 - yardline; opponent's half: yardline; midfield: 50.

    python3 -I scripts/mechanics/nfl_ytg.py [PLAYS_CSV] [OUT_JSON]

Defaults: data/raw/bdb2025/big-data-bowl-data/plays.csv -> out/mechanics/nfl-ytg.json
({"gameId-playId": yards}, the id format of nfl_bdb2025.py --plays-out)."""
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
src = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "data/raw/bdb2025/big-data-bowl-data/plays.csv"
dst = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "out/mechanics/nfl-ytg.json"
out = {}
with open(src, newline="") as handle:
    for r in csv.DictReader(handle):
        n, side = int(r["yardlineNumber"]), r["yardlineSide"]
        out[f"{r['gameId']}-{r['playId']}"] = 50 if n == 50 or not side else (100 - n if side == r["possessionTeam"] else n)
dst.parent.mkdir(parents=True, exist_ok=True)
dst.write_text(json.dumps(out))
print(f"{len(out)} plays, {sum(v >= 60 for v in out.values())} with 60+ yd to go -> {dst}")
