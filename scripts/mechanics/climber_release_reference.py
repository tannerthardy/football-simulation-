#!/usr/bin/env python3
"""Position-only double departures; a candidate measurement, not coaching intent.

Uses run_film_reference.nfl()/sim(), CONCEPTS and puller() unchanged. NFL
input is converted gzip JSONL from BDB2025 (2022 weeks 1-9, not a full season),
NOT the raw tracking archive. Sim input must include time zero and aligned
10 Hz frames. Duo keeps the reference mapping to INSIDE ZONE; original labels
are retained so it can also be reported separately. NFL MAN is not a mapped
reference concept and is excluded/countable; this is NOT a Duo-vs-Duo study.

    python3 -I scripts/mechanics/climber_release_reference.py \
      --nfl out/mechanics/nfl-plays-w12.jsonl.gz --nfl-summary out/nfl-summary.json \
      --sim out/run/trace-seed7.json --sim-source FULL_COMMIT_SHA \
      --sim-settings out/run/settings.json --out out/climber-release.json

Sampling: all loader-eligible runs in the supplied files, with exclusions and
denominators retained; no outcome-selected replacement. A double PROXY is
exactly two OL within 1.2 yd of the same DL, sustained for 0.3 s after 0.2 s
from snap. Only the first such association per DL/play is used. Gap-family
trajectory pullers are excluded using the existing reference rule. A departure
is one OL >=1.5 yd away for 0.3 s while the other remains <=1.2 yd away, with
>=0.5 yd upfield travel since formation. Other separations remain separate.
The nearest eligible box LB is fixed at formation, not chosen after release.
LB depth/motion and DL lateral motion at formation are contexts, not proof of
assignment, perception, blocker choice or cause. All thresholds are candidate
definitions; proximity cannot establish hand contact, load or a successful block.
Whistle, four-second horizon, missing tail and other association endings are
retained; observed departure times describe departures, not uncensored survival.
Uncertainty is a seeded play-cluster bootstrap of observed departure medians.
No statistical result here establishes why a coach/player chose to release.
"""
import argparse
from collections import Counter, defaultdict
import gzip
import hashlib
import json
import math
from pathlib import Path
import random
import re
import statistics
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
import run_film_reference as ref  # noqa: E402

DT = 0.1
NEAR_YD, EXIT_YD, UPFIELD_YD = 1.2, 1.5, 0.5
DWELL_FRAMES, FIRST_FRAME, HORIZON_FRAMES = 3, 2, 40
MOTION_YDS = 0.5
GAP_CONCEPTS = {"POWER", "COUNTER", "TRAP"}
DEFINITIONS = {
    "candidate": True, "dt_s": DT, "near_yd": NEAR_YD, "exit_yd": EXIT_YD,
    "upfield_travel_yd": UPFIELD_YD, "dwell_s": DWELL_FRAMES * DT,
    "first_search_s": FIRST_FRAME * DT, "horizon_s": HORIZON_FRAMES * DT,
    "motion_threshold_yd_s": MOTION_YDS,
    "double": "exactly two OL near one DL for four samples spanning 0.3s; first per DL/play",
    "backer": "nearest at formation among snap LBs 2.5-8yd deep, within 6yd of OL center",
    "context_clock": "formation confirmation, before any counted departure",
    "puller": "reference puller(xy,i,last<=2.5s) on POWER/COUNTER/TRAP only",
    "concepts": ref.CONCEPTS, "sim_mapping": ref.SIM_CONCEPT,
}


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def metadata(path, src, counts):
    """Small identity sidecar; a second read avoids modifying the common loader.

    Metadata uses exactly the loader's eligibility. Extra validation happens
    after joining, so rejected inputs cannot shift subsequent play identities.
    """
    rows = []
    if src == "nfl":
        with gzip.open(path, "rt") as f:
            for ordinal, line in enumerate(f, 1):
                p = json.loads(line)
                counts["input_records"] += 1
                if p["kind"] != "run" or p["carrier"] is None:
                    counts["loader_excluded_nonrun_or_missing_carrier"] += 1
                    continue
                rows.append({"record": ordinal, "id": p.get("id"), "original_concept": p["cell"]["concept"],
                             "clock_valid": p.get("dt") == DT})
    else:
        with open(path) as f:
            raw = json.load(f)
        for ordinal, p in enumerate(raw, 1):
            counts["input_records"] += 1
            if p["nullified"]:
                counts["loader_excluded_nullified"] += 1
                continue
            agents, frames = p["setup"]["agents"], p["frames"]
            # Same selection as ref.sim(); no QB carrier is invented for a failed mesh.
            carrier = next((f["c"] for f in frames if f["c"] >= 0 and agents[f["c"]]["slot"] != "QB"), None)
            if carrier is None:
                counts["loader_excluded_no_nonQB_carrier"] += 1
                continue
            rows.append({"record": ordinal, "id": p.get("id"), "original_concept": p["setup"]["concept"],
                         "clock_valid": all(abs(f["t"] - DT * k) <= 0.011 for k, f in enumerate(frames))})
    return rows


def loaded(path, src, counts):
    meta = metadata(path, src, counts)
    counts["loader_eligible_runs"] = len(meta)
    iterator = ref.nfl(path) if src == "nfl" else ref.sim([path])
    seen = 0
    for seen, play in enumerate(iterator, 1):
        if seen > len(meta):
            raise ValueError("metadata/common-loader identity mismatch")
        item = meta[seen - 1]
        if not item["clock_valid"]:
            counts["excluded_clock"] += 1
            continue
        play.update(item)
        yield play
    if seen != len(meta):
        raise ValueError("metadata/common-loader identity mismatch")


def distance(xy, i, j, k):
    return math.dist(xy[k][i], xy[k][j])


def velocity(xy, i, k):
    a = max(0, k - DWELL_FRAMES)
    if a == k:
        return (0.0, 0.0)
    return tuple((xy[k][i][axis] - xy[a][i][axis]) / ((k - a) * DT) for axis in (0, 1))


def context(xy, dl, lb, k):
    dx, dy = velocity(xy, dl, k)
    if lb is None:
        return {"backer_depth": None, "backer_vx": None, "backer_vy": None,
                "backer_motion": "unavailable", "dl_vx": dx, "dl_vy": dy}
    vx, vy = velocity(xy, lb, k)
    # Signed x is toward the offense's goal; negative LB vx is toward the LOS.
    toward, lateral = vx < -MOTION_YDS, abs(vy) > MOTION_YDS
    motion = "toward_los+lateral" if toward and lateral else "toward_los" if toward else "lateral" if lateral else "other"
    return {"backer_depth": xy[k][lb][0], "backer_vx": vx, "backer_vy": vy,
            "backer_motion": motion, "dl_vx": dx, "dl_vy": dy}


def measure(play, counts):
    """Return at most one first-association row per DL. Never inspect sim plans."""
    xy, players = play["xy"], play["players"]
    if play["concept"] not in ref.CONCEPTS:
        counts["excluded_unmapped_concept:" + str(play["concept"])] += 1
        return []
    if len(players) != 22 or len(xy) < 1 or any(len(f) != 22 for f in xy):
        counts["excluded_incomplete_22_players"] += 1
        return []
    if not math.isfinite(play["end"]) or any(not math.isfinite(v) for f in xy for p in f for v in p):
        counts["excluded_nonfinite"] += 1
        return []
    if players[play["carrier"]]["group"] == "QB":
        counts["excluded_QB_carrier_for_source_parity"] += 1
        return []
    ol = [i for i, p in enumerate(players) if p["side"] == "O" and p["group"] == "OL"]
    dl = [i for i, p in enumerate(players) if p["side"] == "D" and p["group"] == "DL"]
    if len(ol) < 5:
        counts["excluded_fewer_than_five_OL"] += 1
        return []
    counts["eligible_runs"] += 1
    last = min(len(xy) - 1, HORIZON_FRAMES, math.floor(play["end"] / DT + 1e-7))
    if last < FIRST_FRAME + DWELL_FRAMES:
        counts["eligible_too_short_for_double"] += 1
        return []
    cy = statistics.mean(xy[0][i][1] for i in ol)
    lbs = [i for i, p in enumerate(players) if p["side"] == "D" and p["group"] == "LB"
           and 2.5 <= xy[0][i][0] <= 8 and abs(xy[0][i][1] - cy) < 6]
    pulls = {i for i in ol if play["concept"] in GAP_CONCEPTS and ref.puller(xy, i, min(last, 25))}
    rows = []
    for d in dl:
        near = [tuple(i for i in ol if distance(xy, i, d, k) <= NEAR_YD) for k in range(last + 1)]
        start = next((k for k in range(FIRST_FRAME, last - DWELL_FRAMES + 1)
                      if len(near[k]) == 2 and all(near[f] == near[k] for f in range(k, k + DWELL_FRAMES + 1))), None)
        if start is None:
            continue
        pair, formed = near[start], start + DWELL_FRAMES
        if pulls.intersection(pair):
            counts["double_excluded_trajectory_puller"] += 1
            continue  # Do not search for a later more favorable association.
        middle = tuple(statistics.mean(xy[formed][i][axis] for i in pair) for axis in (0, 1))
        lb = min(lbs, key=lambda i: (math.dist(xy[formed][i], middle), i)) if lbs else None
        status, at, departed, keeper = "observation_end", last, None, None
        for k in range(formed + 1, last - DWELL_FRAMES + 1):
            window = range(k, k + DWELL_FRAMES + 1)
            if all(len(near[f]) >= 3 for f in window):
                status, at = "third_OL_joined", k
                break
            if all(not any(i in near[f] for i in pair) for f in window):
                status, at = "pair_lost", k
                break
            for i, other in (pair, pair[::-1]):
                if all(distance(xy, i, d, f) >= EXIT_YD and distance(xy, other, d, f) <= NEAR_YD for f in window):
                    status = "upfield_departure" if xy[k][i][0] - xy[formed][i][0] >= UPFIELD_YD else "other_separation"
                    at, departed, keeper = k, i, other
                    break
            if departed is not None:
                break
        reason = "whistle" if math.floor(play["end"] / DT + 1e-7) == last else "analysis_horizon" if last == HORIZON_FRAMES else "recording_tail"
        rows.append({"source": play["src"], "concept": play["concept"], "original_concept": play["original_concept"],
                     "record": play["record"], "play_id": play["id"], "dl": d, "pair": pair,
                     "double_start_s": round(start * DT, 3), "formed_s": round(formed * DT, 3),
                     "status": status, "observation_end_reason": reason if status == "observation_end" else None,
                     "observed_until_s": round(at * DT, 3),
                     "departure_s": round(at * DT, 3) if status == "upfield_departure" else None,
                     "departure_confirmation_s": round((at + DWELL_FRAMES) * DT, 3) if status == "upfield_departure" else None,
                     "departed": departed, "keeper": keeper, "backer_index": lb,
                     "formation": context(xy, d, lb, formed),
                     "ending": context(xy, d, lb, at),
                     "dl_lateral_since_formation_yd": xy[at][d][1] - xy[formed][d][1],
                     "identity": [{"index": i, **players[i]} for i in (*pair, d, *([lb] if lb is not None else []))]})
    counts["double_associations"] += len(rows)
    counts["runs_with_double"] += bool(rows)
    return rows


def quantile(values, q):
    v = sorted(values)
    if not v:
        return None
    x = (len(v) - 1) * q
    i = math.floor(x)
    return v[i] + (v[min(i + 1, len(v) - 1)] - v[i]) * (x - i)


def estimate(rows, draws, seed):
    """CI of the median among observed departures; resample whole plays."""
    times = [r["departure_s"] for r in rows if r["departure_s"] is not None]
    clusters = defaultdict(list)
    for r in rows:
        clusters[r["play_key"]].append(r)
    boots, rng, keys = [], random.Random(seed), list(clusters)
    departure_plays = sum(any(r["departure_s"] is not None for r in v) for v in clusters.values())
    if departure_plays >= 2:
        for _ in range(draws):
            sample = [r["departure_s"] for _ in keys for r in clusters[rng.choice(keys)] if r["departure_s"] is not None]
            if sample:
                boots.append(statistics.median(sample))
    return {"plays": len(clusters), "associations": len(rows), "observed_departures": len(times), "departure_plays": departure_plays,
            "other_endings": dict(Counter(r["status"] for r in rows if r["departure_s"] is None)),
            "departure_median_s": statistics.median(times) if times else None,
            "departure_median_ci95_s": [quantile(boots, .025), quantile(boots, .975)] if boots else None,
            "bootstrap_valid": len(boots), "bootstrap_requested": draws,
            "backer_depth_at_formation_median_yd": quantile([r["formation"]["backer_depth"] for r in rows if r["backer_index"] is not None], .5),
            "dl_abs_lateral_speed_at_formation_median_yd_s": quantile([abs(r["formation"]["dl_vy"]) for r in rows], .5)}


def summarize(rows, draws=500, seed=53):
    tables = {}
    for name, key in (("concept", lambda r: (r["source"], r["concept"])),
                      ("backer_motion", lambda r: (r["source"], r["concept"], r["formation"]["backer_motion"])),
                      ("original_concept", lambda r: (r["source"], r["original_concept"])),
                      ("backer_depth", lambda r: (r["source"], r["concept"], "unavailable" if r["backer_index"] is None else
                                                 "under3yd" if r["formation"]["backer_depth"] < 3 else
                                                 "3to5yd" if r["formation"]["backer_depth"] < 5 else "5plusyd")),
                      ("dl_lateral_motion", lambda r: (r["source"], r["concept"],
                                                       "over0.5yd_s" if abs(r["formation"]["dl_vy"]) > MOTION_YDS else "at_most0.5yd_s"))):
        groups = defaultdict(list)
        for row in rows:
            groups[key(row)].append(row)
        tables[name] = [{"group": list(k), **estimate(v, draws, seed)} for k, v in sorted(groups.items())]
    return tables


def markdown(report):
    print("Candidate proximity associations; NOT contact/load/intent measurements.\n")
    for name, rows in report["tables"].items():
        print(f"\n{name} (contexts measured at formation):\n")
        print("| Source / stratum | Plays | Double proxies | Upfield departures | Other endings | Departure median [95% CI], s |")
        print("|---|---:|---:|---:|---:|---|")
        for r in rows:
            m, ci = r["departure_median_s"], r["departure_median_ci95_s"]
            text = "unavailable" if m is None else f"{m:.2f} " + (f"[{ci[0]:.2f}, {ci[1]:.2f}]" if ci else "[CI unavailable]")
            print(f"| {' / '.join(r['group'])} | {r['plays']} | {r['associations']} | {r['observed_departures']} | {sum(r['other_endings'].values())} | {text} |")
    print("\nCounts/exclusions: " + json.dumps(report["counts"], sort_keys=True))
    print("Intervals condition on observed departures; endings are informative censoring/competing separations, not failed climbs.")
    print("Duo is grouped with inside zone by the reference mapping; original-concept rows are retained in JSON.")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--nfl", type=Path)
    parser.add_argument("--nfl-summary", type=Path, help="Optional source-declaration file; not proof of the converted file's week coverage")
    parser.add_argument("--sim", type=Path, nargs="*", default=[])
    parser.add_argument("--sim-source", help="Exact producer source commit, not the analysis checkout")
    parser.add_argument("--sim-settings", type=Path, help="Producer settings file; missing settings remain explicitly unavailable")
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--bootstrap", type=int, default=500)
    parser.add_argument("--seed", type=int, default=53, help="Analysis bootstrap seed only; no games are generated")
    args = parser.parse_args(argv)
    if not args.nfl and not args.sim:
        parser.error("supply converted --nfl and/or existing --sim input; this script never downloads or simulates")
    if args.sim and not re.fullmatch(r"[0-9a-f]{40}", args.sim_source or ""):
        parser.error("--sim-source must be the full 40-character producer commit")
    if args.bootstrap < 1:
        parser.error("--bootstrap must be positive")
    inputs = ([('nfl', args.nfl)] if args.nfl else []) + [('sim', p) for p in args.sim]
    protected = [p for _, p in inputs] + [p for p in (args.nfl_summary, args.sim_settings) if p]
    if args.out.resolve() in {p.resolve() for p in protected}:
        parser.error("--out must not overwrite an input, settings or provenance file")
    counts, manifests, rows, seen = {}, [], [], set()
    for src, path in inputs:
        digest = sha256(path)
        if (src, digest) in seen:
            parser.error("duplicate input digest; refusing to count the same cohort twice")
        seen.add((src, digest))
        tally = Counter({k: 0 for k in ("input_records", "loader_eligible_runs", "excluded_clock", "eligible_runs",
                                        "eligible_too_short_for_double", "double_associations", "runs_with_double",
                                        "double_excluded_trajectory_puller")})
        for play in loaded(path, src, tally):
            for row in measure(play, tally):
                row["input_sha256"] = digest
                row["play_key"] = f"{src}:{digest}:{row['record']}"
                rows.append(row)
        counts[f"{src}:{digest}"] = dict(tally)
        manifests.append({"source": src, "file": path.name, "bytes": path.stat().st_size, "sha256": digest})
    report = {"operator": "climber-release-proximity-v1-candidate", "definitions": DEFINITIONS, "nfl_measured": bool(args.nfl),
              "reference_loader_sha256": sha256(Path(ref.__file__)), "script_sha256": sha256(Path(__file__)),
              "analysis_python": sys.version, "inputs": manifests,
              "nfl_scope": "BDB2025 is 2022 weeks1-9, not the entire season; actual file subset not inferred from filename",
              "nfl_source_declaration": json.loads(args.nfl_summary.read_text()).get("source") if args.nfl_summary else None,
              "nfl_summary_sha256": sha256(args.nfl_summary) if args.nfl_summary else None,
              "sim_producer_commit": args.sim_source, "sim_source_status": "caller declaration; legacy trace has no embedded source proof",
              "sim_settings_sha256": sha256(args.sim_settings) if args.sim_settings else None,
              "sim_settings_status": "provided digest; consumer must retain settings file" if args.sim_settings else "unavailable; no settings-compatible comparison certified",
              "bootstrap": {"seed": args.seed, "replicates": args.bootstrap, "unit": "play", "interval": "percentile95, observed-departure median"},
              "counts": counts, "episodes": rows, "tables": summarize(rows, args.bootstrap, args.seed)}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    markdown(report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
