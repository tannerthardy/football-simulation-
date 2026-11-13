"""Build ignored matched movement inputs from BDB2027 combine trajectories.

python3 scripts/data/movement_task_fixtures.py <raw-directory> out/movement-inputs.json
No fitting. One earliest eligible attempt per athlete/drill; 2025 reserved as
holdout. Requires the pinned movement-analysis numpy/pandas dependencies.
"""
import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd
from bdb2027_movement import motion

DRILLS = {"FORTY_YARD_DASH", "SHORT_SHUTTLE", "THREE_CONE_DRILL",
          "OL_PULL_DRILL_LONG_PULL_RIGHT", "BACK_PEDAL_AND_90_DEGREE_BREAK_TO_BALL"}
FIELDS = {"heightIn": "combine_height", "weightLb": "combine_weight", "armIn": "arm_length",
          "handIn": "hand_size", "tenSplit": "ten_yd_split", "forty": "forty",
          "vertical": "vertical", "broad": "broad_jump", "threeCone": "three_cone",
          "shuttle": "short_shuttle", "bench": "bench_reps"}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("directory", type=Path)
    ap.add_argument("out", type=Path)
    args = ap.parse_args()
    players = pd.read_csv(args.directory / "combine_results.csv", dtype={"nfl_id": str})
    profiles = {r["nfl_id"]: r for r in players.to_dict("records")}
    tracks = pd.read_csv(args.directory / "combine_tracking.csv", dtype={"nfl_id": str, "event_id": str})
    missing_drills = DRILLS - set(tracks.drill_name.dropna())
    if missing_drills:
        raise ValueError(f"Requested drill labels absent from this snapshot: {sorted(missing_drills)}")
    tracks = tracks[(tracks.entity_type == "PLAYER") & tracks.drill_name.isin(DRILLS)].copy()
    tracks["seconds"] = pd.to_datetime(tracks.time).astype("int64") / 1e9
    fixtures, audit, seen = [], Counter(), set()
    for (event, athlete, drill), rows in tracks.groupby(["event_id", "nfl_id", "drill_name"], sort=True):
        p = profiles.get(athlete)
        if p is None:
            audit["missingPlayer"] += 1
            continue
        required = [p[FIELDS[k]] for k in ("heightIn", "weightLb", "armIn", "tenSplit", "forty")]
        if not all(pd.notna(v) and np.isfinite(v) and v > 0 for v in required):
            audit["missingBodyOrSprintMeasurements"] += 1
            continue
        key = athlete, drill
        if key in seen:
            audit["laterAttempt"] += 1
            continue
        reference = motion(rows)
        if reference is None:
            audit["shortGappedOrOutlier"] += 1
            continue
        rows = rows.sort_values("seconds").drop_duplicates("seconds")
        t = rows.seconds.to_numpy() - rows.seconds.iloc[0]
        times = np.arange(0, t[-1] + 1e-5, .1)
        x, y = np.interp(times, t, rows.x), np.interp(times, t, rows.y)
        vx, vy = np.gradient(x, .1), np.gradient(y, .1)
        moving = np.flatnonzero(np.hypot(vx, vy) >= .5)
        if not len(moving):
            audit["stationary"] += 1
            continue
        first = max(1, int(moving[0]))
        # Trim both derivative edges. Preserve the observed window/geometry;
        # do not reset official drill timing to an inferred movement start.
        times, x, y, vx, vy = [a[first:-1] for a in (times, x, y, vx, vy)]
        if len(times) < 9:
            audit["shortMovingWindow"] += 1
            continue
        seen.add(key)
        m = {k: float(p[v]) for k, v in FIELDS.items() if pd.notna(p[v]) and np.isfinite(p[v])}
        points = [[round(float(tt-times[0]), 6), float(xx-x[0]), float(yy-y[0]), float(ux), float(uy)]
                  for tt, xx, yy, ux, uy in zip(times, x, y, vx, vy)]
        fixtures.append({"athlete": athlete, "draftYear": int(p["draft_year"]),
                         "split": "holdout2025" if int(p["draft_year"]) == 2025 else "development2023_2024",
                         "group": p["combine_position"], "drill": drill, "event": event,
                         "measurables": m, "missingMeasurements": sorted(set(FIELDS)-set(m)),
                         "completeAgility": "shuttle" in m and "threeCone" in m,
                         "contactUnknown": drill.startswith("OL_"), "points": points})
    inputs = {}
    split_athletes = {split: {f["athlete"] for f in fixtures if f["split"] == split}
                      for split in ("development2023_2024", "holdout2025")}
    if set.intersection(*split_athletes.values()):
        raise ValueError("An athlete occurs in both development and holdout")
    for name in ("combine_results.csv", "combine_tracking.csv"):
        path = args.directory / name
        inputs[name] = {"bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
    report = {"inputs": inputs, "extractorSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              "selection": "One earliest eligible event per athlete/drill; measured body, ten split and forty required. Trim derivative edges and start at first >=0.5 yd/s observed movement. 2025 reserved; no fitting.",
              "audit": dict(audit), "fixtures": fixtures}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, separators=(",", ":"), allow_nan=False) + "\n")
    print(len(fixtures), "fixtures", len({f["athlete"] for f in fixtures}), "athletes", dict(audit))


if __name__ == "__main__":
    main()
