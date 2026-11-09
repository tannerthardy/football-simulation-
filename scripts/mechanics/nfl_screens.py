#!/usr/bin/env python3
"""Extract NFL screen passes (BDB 2025, 2022 weeks 1-9) into the common play
format, for the screen-blocking operator (screen_reference.py).

    python3 -I scripts/mechanics/nfl_screens.py [--weeks 1 2 ...] [--out out/screens/nfl-screens.jsonl.gz]

A screen play is a dropback whose targeted receiver ran routeRan == SCREEN.
Each play gets the common fields from nfl_bdb2025.convert plus:
  screen.receiver   index of the screen receiver (the target)
  screen.group      his position group (WR/TE/RB)
  screen.routes     per-player routeRan ("" for none), offense only
  screen.align      PFF receiverAlignment, screen.formation
  screen.tacklers   indices credited with a solo tackle or assist
Raw tracking stays in ignored data/raw; output goes to ignored out/.
"""
import argparse
import gzip
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import nfl_bdb2025 as nfl  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--weeks", type=int, nargs="+", default=list(range(1, 10)))
    ap.add_argument("--out", type=Path, default=nfl.ROOT / "out/screens/nfl-screens.jsonl.gz")
    a = ap.parse_args()
    position, plays = nfl.load_meta()
    pp = {}
    for r in nfl.read_csv("player_play.csv"):
        pp.setdefault((r["gameId"], r["playId"]), []).append(r)
    meta_rows = {r["gameId"] + "-" + r["playId"]: r for r in nfl.read_csv("plays.csv")}
    keep = {}
    for key, meta in plays.items():
        rows = pp.get(key, [])
        tgt = [r for r in rows if r["wasTargettedReceiver"] == "1"]
        if meta["kind"] != "pass" or not tgt or tgt[0]["routeRan"] != "SCREEN":
            continue
        meta["routes"] = {r["nflId"]: r["routeRan"] if r["routeRan"] != "NA" else "" for r in rows}
        meta["tacklers"] = [r["nflId"] for r in rows if r["soloTackle"] == "1" or r["tackleAssist"] == "1"]
        keep[key] = meta
    print(f"{len(keep)} targeted screens", file=sys.stderr)
    a.out.parent.mkdir(parents=True, exist_ok=True)
    n, seen = 0, set()
    with gzip.open(a.out, "wt") as sink:
        for key, rows in nfl.stream(a.weeks, keep, position):
            if key in seen:
                continue
            seen.add(key)
            play = nfl.convert(key, rows, keep[key], position)
            if play is None or play["target"] is None:
                continue
            ids = sorted({r[2] for r in rows if r[2] != "NA"}, key=lambda i: (next(rr[8] for rr in rows if rr[2] == i) != keep[key]["offense"], i))
            m = meta_rows[f"{key[0]}-{key[1]}"]
            play["screen"] = {"receiver": play["target"], "group": play["players"][play["target"]]["group"],
                              "routes": [keep[key]["routes"].get(i, "") for i in ids],
                              "align": m["receiverAlignment"], "formation": m["offenseFormation"],
                              "passResult": m["passResult"], "yac": None,
                              "tacklers": [ids.index(i) for i in keep[key]["tacklers"] if i in ids]}
            sink.write(json.dumps(play, separators=(",", ":")) + "\n")
            n += 1
    print(f"wrote {n} -> {a.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
