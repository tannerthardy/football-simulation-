#!/usr/bin/env python3
"""Validate the returned frozen week-1 packet; never query raw tracking."""
import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import time

ROOT = Path(__file__).resolve().parents[2]
RESULT_SHA = "7911a33decb4ce9f2dfef768f37c527936e573506664b273d231b6c0d0f7f60c"
RESULT_COMMIT = "481ad18e5d1cd45a1d5008496b9917511d8397b1"
RESULT_PATH = "data/reviews/current/p045-nfl-week1-return.json"


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def close(a, b):
    assert math.isclose(a, b, rel_tol=1e-9, abs_tol=1e-9), (a, b)


def main():
    start = time.perf_counter()
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", type=Path, default=ROOT / "out/p045-nfl/source/p045-nfl-week1-return.json")
    ap.add_argument("--receipt", type=Path, default=ROOT / "out/p045-nfl/source/bdb2025-existing-restoration.json")
    ap.add_argument("--out", type=Path, default=ROOT / "out/p045-nfl/return-validation.json")
    args = ap.parse_args()
    content = args.input.read_bytes()
    assert len(content) == 13975 and sha(args.input) == RESULT_SHA
    blob = hashlib.sha1(b"blob " + str(len(content)).encode() + b"\0" + content).hexdigest()
    assert blob == "6d667367847fb6313f20f11f4bb61786bedbbea9"
    r = json.loads(content)
    assert r["query_commit"] == "81e43e7279a26c43f2ae5ea29a2282316f42899c"
    for name, expected in r["module_sha256"].items():
        assert sha(ROOT / name) == expected, name
    assert sha(ROOT / "scripts/diag/p045-nfl-execute-handoff.py") == r["runner_sha256"]
    assert sha(args.receipt) == r["receipt"]["sha256"]
    receipt = json.loads(args.receipt.read_text())
    catalog = next(s for s in json.loads((ROOT / "data/sources.json").read_text())["sources"] if s["id"] == "bdb2025-2022")
    assert r["archive"]["expected_sha256"] == receipt["archive"]["sha256"] == catalog["archiveSha256"]
    assert r["archive"]["expected_bytes"] == receipt["archive"]["bytes"] == catalog["archiveBytes"]
    assert r["archive"]["rehashed_here"] and r["query_executed"] and r["simulation_runs"] == 0
    for name, a in r["access"].items():
        assert a["readable"] and a["bytes"] == a["expected_bytes"] == receipt["files"][name]["bytes"]
        assert a["sha256"] == a["expected_sha256"] == receipt["files"][name]["sha256"]
    spec = importlib.util.spec_from_file_location("original_query", ROOT / "scripts/diag/p045-nfl-approach.py")
    query = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(query)
    assert r["query"] == query.QUERY  # original filters, weeks and selection order
    assert r["nfl"]["counts"] == {"label_candidates": 26, "converted": 3, "invalid": 3,
                                  "geometry_matched": 1, "contained": 1, "offensive_win": 0}
    assert list(r["nfl"]["witnesses"]) == ["contained"]
    w = r["nfl"]["witnesses"]["contained"]
    assert w["id"] == "2022091101-4104" and w["target_id"] == w["receiver_id"] == "52595"
    assert w["selected_defender_ids"] == ["46527", "52472"]
    assert len(set(w["player_ids_by_common_index"])) == 22
    assert all(w["labels"][k] for k in ("official_target_had_reception", "all_22_positions_observed_snap_through_endpoint"))
    frames = w["frame_provenance"]
    event_map = {"pass_forward": "pass_forward", "pass_arrived": "pass_arrived",
                 "catch": "pass_outcome_caught", "first_contact": "first_contact", "end": "tackle"}
    for name, original in event_map.items():
        close(w["events"][name], (frames["original_event_frames"][original] - frames["snap_frame"]) / 10)
    summaries, inferred_mass = [], {}
    for s in w["snapshots"]:
        assert [d["id"] for d in s["defenders"]] == w["selected_defender_ids"]
        close(s["position_sample_t_s"], round(s["event_t_s"] / .1) * .1)
        rv = s["receiver_motion"]["velocity_yd_s"]
        for motion in [s["receiver_motion"]] + [d["motion"] for d in s["defenders"]]:
            a, b = motion["sample_window_s"]
            close(b - a, .4)
            assert b <= s["event_t_s"] + 1e-9 and b < w["events"]["first_contact"]
        for d in s["defenders"]:
            assert w["player_ids_by_common_index"][d["index"]] == d["id"]
            rel, dv = d["relative_xy_yd"], d["motion"]["velocity_yd_s"]
            close(d["separation_yd"], math.hypot(*rel))
            close(d["downfield_lead_yd"], rel[0])
            close(d["speed_yd_s"], math.hypot(*dv))
            close(d["closing_yd_s"], -sum(rel[j] * (dv[j] - rv[j]) for j in (0, 1)) / math.hypot(*rel))
            close(d["lead_along_receiver_motion_yd"], sum(rel[j] * rv[j] for j in (0, 1)) / math.hypot(*rv))
            close(d["lateral_to_receiver_motion_yd"], abs(rel[0] * rv[1] - rel[1] * rv[0]) / math.hypot(*rv))
            mass = math.hypot(*d["momentum_kg_m_s"]) / (.9144 * math.hypot(*dv))
            close(mass, inferred_mass.setdefault(d["id"], mass))
            for j in (0, 1):
                close(d["momentum_kg_m_s"][j], mass * .9144 * dv[j])
            if d["catch_landmark_demand"]:
                assert s["position_sample_t_s"] == d["motion"]["sample_window_s"][1]
                pos = [s["receiver_xy"][j] + rel[j] for j in (0, 1)]
                expected = query.demand(pos, dv, w["snapshots"][-1]["receiver_xy"], w["events"]["catch"] - s["position_sample_t_s"])
                for k, v in expected.items():
                    close(v, d["catch_landmark_demand"][k])
        nearest = min(s["defenders"], key=lambda d: d["separation_yd"])
        assert s["nearest_id"] == nearest["id"]
        summaries.append({"phase": s["phase"], "event_t_s": s["event_t_s"],
                          "receiver_velocity_yd_s": rv, "receiver_speed_yd_s": math.hypot(*rv),
                          "defenders": [{k: d[k] for k in ("id", "separation_yd", "downfield_lead_yd", "speed_yd_s")}
                                        | {"momentum_magnitude_kg_m_s": math.hypot(*d["momentum_kg_m_s"])} for d in s["defenders"]]})
    close(w["catch_depth_yd"], w["snapshots"][-1]["receiver_xy"][0])
    assert 15 <= w["catch_depth_yd"] <= 30 and 1 <= w["events"]["catch"] - w["events"]["pass_forward"] <= 2
    assert 1 <= min(d["separation_yd"] for d in w["snapshots"][-1]["defenders"]) <= 4 and w["yac_yd"] <= 5
    result = {"schema": "p045-nfl-return-validation-v1", "status": "validated_closed",
              "result_commit": RESULT_COMMIT, "result_path": RESULT_PATH, "result_bytes": len(content),
              "result_sha256": RESULT_SHA, "result_blob_sha1": blob, "query_commit": r["query_commit"],
              "counts": r["nfl"]["counts"], "contained_witness": {"id": w["id"], "receiver_id": w["receiver_id"],
              "defender_ids": w["selected_defender_ids"], "events": w["events"], "catch_depth_yd": w["catch_depth_yd"],
              "yac_yd": w["yac_yd"], "snapshots": summaries},
              "checks": ["exact result bytes/blob", "pinned modules and runner", "unchanged query", "receipt/catalog/CSV checksum cross-checks",
                         "fixed defender identities", "event frame offsets", "pre-contact windows", "geometry, speeds and momentum consistency", "support demand"],
              "boundary": "Return-packet integrity/internal validation; raw sample validity, velocities, masses, counts and hashes were collected on Catching's executor, not independently remeasured here.",
              "available_week_evidence": {"catalog": catalog["weeks"], "remote_files_verified_in_receipt": [1],
                  "queried_and_reused": [1], "other_restored_weeks_inventoried": False,
                  "posted_directory_visible_here": Path(receipt["rawDirectory"]).exists()},
              "new_raw_queries": 0, "new_simulations": 0, "remote_query_elapsed_s": r["elapsed_s"],
              "validation_elapsed_s": time.perf_counter() - start, "validator_sha256": sha(Path(__file__))}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2, allow_nan=False) + "\n")
    print(json.dumps({"out": str(args.out), "status": result["status"], "contained": 1, "explosive": 0,
                      "validation_elapsed_s": result["validation_elapsed_s"]}))


if __name__ == "__main__":
    main()
