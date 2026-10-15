#!/usr/bin/env python3
"""One saved-only P045 comparison. No download, engine execution or aggregate rewrite.

Requires sim-common.json exported by the existing commonPlay function (see report).
Optional restored NFL2022 inputs must have Catching's checksum restoration receipt.
Detailed positions/IDs stay under ignored out/. This is an exploratory query, not
a new shared metric or an NFL MOD responsibility label.
"""
import argparse
import csv
import hashlib
import json
import math
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts/mechanics"))
import nfl_bdb2025 as adapter
from metrics import Play

ARCHIVE_SHA = "743794b44b5ef49da7cb7d3f488a9418ac16c5ef269199a4044eecb8258550d3"
QUERY = {
    "weeks": [1], "coverage": "QUARTERS", "official_catcher_route": "POST",
    "catch_depth_yd": [15, 30], "flight_s": [1, 2], "nearest_at_catch_yd": [1, 4],
    "witnesses": "Smallest numeric gameId/playId in each bin: YAC <=5; YAC >=15. No automatic widening.",
    "purpose": "Post catch within Y-Cross; illustrative containment/offensive-win controls, not frequency estimates.",
}


def sha(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def vector(a, b):
    return a[0] - b[0], a[1] - b[1]


def dot(a, b):
    return a[0] * b[0] + a[1] * b[1]


def check_samples(raw, end):
    """Refuse imputation and nonfinite coordinates through the endpoint."""
    p = Play(raw)
    if not p.live(end):
        raise ValueError("endpoint outside recording/whistle")
    for k in range(p.k(end) + 1):
        if len(p.xy[k]) != 2 * p.n or any(v is None or not math.isfinite(v) for v in p.xy[k]):
            raise ValueError("missing/nonfinite position")
        if "observed" in raw and not all(raw["observed"][k]):
            raise ValueError("adapter carry-forward would conceal an unobserved sample")


def pre_velocity(p, i, t, first_contact=None):
    """Full trailing .4 s; last sample <=t and strictly before contact.

    Unlike Play.velocity's +/- .2 s, this cannot include post-contact samples.
    A phase after contact is censored, rather than assigned an old velocity.
    """
    if first_contact is not None and t > first_contact + 1e-9:
        return None
    b = int(math.floor(t / p.dt + 1e-9))
    if first_contact is not None:
        b = min(b, int(math.ceil(first_contact / p.dt - 1e-9)) - 1)
    a = b - 4
    if a < 0 or b >= p.frames:
        return None
    v = vector(p.pos(i, b), p.pos(i, a))
    return {"velocity_yd_s": [v[0] / .4, v[1] / .4],
            "sample_window_s": [round(a * p.dt, 4), round(b * p.dt, 4)]}


def demand(pos, vel, landmark, horizon, radius=1.0):
    """Necessary bounds to reach a hindsight 1-yd center disk, not sufficiency.

    |integral(v)| <= vmax*T; |integral((T-t)*a)| <= amax*T^2/2.
    No invented acceleration/speed budget, instant turning, cue or tackle award.
    """
    if horizon <= 0:
        return None
    drift = [pos[j] + vel[j] * horizon for j in (0, 1)]
    return {"horizon_s": horizon, "radius_yd": radius,
            "speed_cap_required_at_least_yd_s": max(0, math.dist(pos, landmark) - radius) / horizon,
            "peak_accel_required_at_least_yd_s2": 2 * max(0, math.dist(drift, landmark) - radius) / horizon ** 2}


def measure(raw):
    p = Play(raw)
    ev, target = p.events, raw["target"]
    endpoint = ev.get("catch", ev["pass_arrived"])
    check_samples(raw, endpoint)
    phases = [("release", ev["pass_forward"]), ("flight_midpoint", (ev["pass_forward"] + endpoint) / 2),
              ("catch" if "catch" in ev else "interception_arrival", endpoint)]
    nearest = lambda t: sorted(p.who("D"), key=lambda d: (p.dist(d, target, p.k(t)), d))
    # Freeze the union once, never splice two players into an apparent approach.
    defenders = sorted(set(nearest(phases[0][1])[:2] + nearest(endpoint)[:2]))
    contact = ev.get("first_contact")
    # NFL first_contact lacks actor identity. Conservatively censor after it
    # even when it precedes the catch; never assume it was somebody else's hit.
    rows = []
    landmark = p.pos(target, p.k(endpoint))
    for label, t in phases:
        k = p.k(t)
        receiver = pre_velocity(p, target, t, contact)
        snapshot = {"phase": label, "event_t_s": t, "position_sample_t_s": round(k * p.dt, 4),
                    "receiver_xy": p.pos(target, k), "receiver_motion": receiver,
                    "nearest_id": raw["identities"][nearest(t)[0]]["id"], "defenders": []}
        for d in defenders:
            identity = raw["identities"][d]
            motion = pre_velocity(p, d, t, contact)
            rel = vector(p.pos(d, k), p.pos(target, k))
            row = {"id": identity["id"], "index": d, "slot": identity.get("slot"),
                   "separation_yd": p.dist(d, target, k), "relative_xy_yd": rel,
                   "downfield_lead_yd": rel[0], "motion": motion}
            if motion and receiver:
                dv, rv = motion["velocity_yd_s"], receiver["velocity_yd_s"]
                speed = math.hypot(*dv)
                row["speed_yd_s"] = speed
                row["closing_yd_s"] = -dot(rel, vector(dv, rv)) / max(1e-9, math.hypot(*rel))
                if identity.get("massKg"):
                    row["momentum_kg_m_s"] = [v * .9144 * identity["massKg"] for v in dv]
                if math.hypot(*rv) > 1:
                    row["lead_along_receiver_motion_yd"] = dot(rel, rv) / math.hypot(*rv)
                    row["lateral_to_receiver_motion_yd"] = abs(rel[0] * rv[1] - rel[1] * rv[0]) / math.hypot(*rv)
                # Match position and velocity time for the reachability bounds.
                b = p.k(motion["sample_window_s"][1])
                row["catch_landmark_demand"] = (demand(p.pos(d, b), dv, landmark,
                    (p.k(endpoint) - b) * p.dt) if label != phases[-1][0] else None)
            snapshot["defenders"].append(row)
        rows.append(snapshot)
    return {"id": raw["id"], "events": ev, "target_id": raw["identities"][target]["id"],
            "receiver_id": raw["identities"][raw.get("receiver", target)]["id"] if raw.get("receiver", target) is not None else None,
            "endpoint": phases[-1][0], "selected_defender_ids": [raw["identities"][i]["id"] for i in defenders],
            "catch_depth_yd": landmark[0], "yac_yd": raw["yards"] - landmark[0] if "catch" in ev else None,
            "player_ids_by_common_index": [r["id"] for r in raw["identities"]],
            "frame_provenance": raw.get("frame_provenance"),
            "native_stats": raw.get("nativeStats"), "snapshots": rows}


def nfl_query(data, weeks):
    adapter.DATA = data
    position, meta = adapter.load_meta()  # retains adapter's penalty/spike/kneel admissions
    weights, labels = {}, {}
    for r in adapter.read_csv("players.csv"):
        weights[r["nflId"]] = float(r["weight"]) * .45359237
    for r in adapter.read_csv("player_play.csv"):
        if "hadPassReception" not in r or "routeRan" not in r:
            raise ValueError("missing hadPassReception/routeRan labels")
        if r["wasTargettedReceiver"] == "1" and r["hadPassReception"] == "1":
            labels[(r["gameId"], r["playId"])] = r["routeRan"]
    selected_meta = {k: v for k, v in meta.items() if v["kind"] == "pass"
                     and v["coverage"].upper() == "QUARTERS" and labels.get(k, "").upper() == "POST"}
    counts = {"label_candidates": len(selected_meta), "converted": 0, "invalid": 0,
              "geometry_matched": 0, "contained": 0, "offensive_win": 0}
    chosen, seen = {}, set()
    for key, rows in adapter.stream(weeks, selected_meta, position):
        if key in seen:
            counts["invalid"] += 1
            continue
        seen.add(key)
        raw = adapter.convert(key, rows, selected_meta[key], position)
        if raw is None or not all(e in raw["events"] for e in ("pass_forward", "pass_arrived", "catch")):
            counts["invalid"] += 1
            continue
        counts["converted"] += 1
        tracks = {}
        snap = next(int(r[4]) for r in rows if r[5] == "SNAP")
        clubs = {}
        for r in rows:
            if r[2] != "NA":
                tracks.setdefault(r[2], set()).add(int(r[4])); clubs[r[2]] = r[8]
        ids = sorted(tracks, key=lambda i: (clubs[i] != selected_meta[key]["offense"], i))
        if len(ids) != 22:
            counts["invalid"] += 1
            continue
        raw["identities"] = [{"id": i, "massKg": weights[i]} for i in ids]
        raw["observed"] = [[snap + k in tracks[i] for i in ids] for k in range(len(raw["xy"]))]
        raw["receiver"] = raw["target"]  # official targeted AND reception labels were required
        raw["frame_provenance"] = {"snap_frame": snap, "original_event_frames": {}}
        for r in rows:
            if r[17] != "NA":
                raw["frame_provenance"]["original_event_frames"].setdefault(r[17], int(r[4]))
        try:
            result = measure(raw)
        except ValueError:
            counts["invalid"] += 1
            continue
        result["labels"] = {"gameId": key[0], "playId": key[1], "pff_passCoverage": selected_meta[key]["coverage"],
                            "routeRan": labels[key], "official_target_had_reception": True,
                            "all_22_positions_observed_snap_through_endpoint": True}
        ev = raw["events"]
        near = min(d["separation_yd"] for d in result["snapshots"][-1]["defenders"])
        if not (15 <= result["catch_depth_yd"] <= 30 and 1 <= ev["catch"] - ev["pass_forward"] <= 2 and 1 <= near <= 4):
            continue
        counts["geometry_matched"] += 1
        group = "contained" if result["yac_yd"] <= 5 else "offensive_win" if result["yac_yd"] >= 15 else None
        if group:
            counts[group] += 1
            if group not in chosen or tuple(map(int, key)) < chosen[group][0]:
                chosen[group] = (tuple(map(int, key)), result)
    return {"status": "measured", "counts": counts, "witnesses": {k: v[1] for k, v in chosen.items()}}


def main():
    started = time.perf_counter()
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--sim-common", type=Path, default=ROOT / "out/p045-nfl/sim-common.json")
    ap.add_argument("--nfl-data", type=Path, default=adapter.DATA)
    ap.add_argument("--restoration-receipt", type=Path)
    ap.add_argument("--weeks", nargs="+", type=int, default=[1])
    ap.add_argument("--out", type=Path, default=ROOT / "out/p045-nfl/comparison.json")
    args = ap.parse_args()
    files = ["players.csv", "plays.csv", "player_play.csv"] + [f"tracking_week_{w}.csv" for w in args.weeks]
    missing = [str(args.nfl_data / f) for f in files if not (args.nfl_data / f).is_file()]
    nfl = {"status": "blocked", "missing_files": missing, "restoration_receipt": None,
           "reason": "Reuse Catching's checksum-verified restoration; no competing download was attempted."}
    if not missing:
        if not args.restoration_receipt or not args.restoration_receipt.is_file():
            nfl["reason"] = "Restored files found, but Catching's restoration receipt is missing."
        elif ARCHIVE_SHA not in args.restoration_receipt.read_text():
            nfl["reason"] = "Restoration receipt does not bind the catalog archive SHA256."
        else:
            nfl = nfl_query(args.nfl_data, args.weeks)
            nfl["restoration_receipt"] = {"path": str(args.restoration_receipt), "sha256": sha(args.restoration_receipt)}
            nfl["input_sha256"] = {f: sha(args.nfl_data / f) for f in files}
            nfl["provenance_limit"] = "Receipt supplies archive verification provenance; file hashes identify this query's restored inputs."
    reference = json.loads((ROOT / "data/reviews/mechanics/nfl-bdb2022.json").read_text())
    keys = ["air.separation_at_throw", "air.separation_at_arrival", "air.defender_closing", "catch.speed_at_catch",
            "catch.yards_after_catch", "catch.defenders_within_5yd_at_catch", "contact.catch.tackler_speed_at_contact"]
    packet = {"schema": "p045-nfl-approach-v1", "query": {**QUERY, "weeks": args.weeks},
              "nfl": nfl, "sim_witnesses": [measure(r) for r in json.loads(args.sim_common.read_text())],
              "aggregate_context_only": {k: reference["metrics"][k] for k in keys},
              "operators_sha256": {str(p.relative_to(ROOT)): sha(p) for p in
                  [Path(__file__).resolve(), ROOT / "scripts/mechanics/metrics.py", ROOT / "scripts/mechanics/nfl_bdb2025.py",
                   ROOT / "scripts/mechanics/sim-export.ts", ROOT / "data/reviews/mechanics/nfl-bdb2022.json"]},
              "sim_input_sha256": sha(args.sim_common), "elapsed_s": time.perf_counter() - started,
              "simulation_runs": 0}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(packet, indent=2, allow_nan=False) + "\n")
    print(json.dumps({"out": str(args.out), "NFL": nfl["status"], "sim_witnesses": len(packet["sim_witnesses"]),
                      "elapsed_s": packet["elapsed_s"], "simulation_runs": 0}))


if __name__ == "__main__":
    main()
