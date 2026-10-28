#!/usr/bin/env python3
"""Audit the published f7251869 box operator on saved NFL/sim observations.

python3 -I scripts/data/run_box_suite.py --nfl NFL.jsonl.gz --nfl-label '2022 w1-9' \
  --sim TRACE.json --sim-source FULL_SHA --out out/box-suite/report.json

No downloads, simulations, assignment inference or distribution targets.
See docs/reviews/run-box-suite.md. The historical operator remains unedited.
"""
import argparse
from collections import Counter, defaultdict
import gzip
import hashlib
import importlib.util
import itertools
import json
import math
from pathlib import Path
import random
import re
import statistics
import sys

ROOT = Path(__file__).resolve().parents[2]
OPERATOR = ROOT / "scripts/mechanics/box_count_reference.py"
OPERATOR_SHA = "42e02117fe3bcec7a192ab15d4f0d208915b5084338ef2ba8bc0b2303786857a"
BUCKETS = ("light", "even", "+1", "+2 or more")


def sha(path):
    with open(path, "rb") as f:
        return hashlib.file_digest(f, "sha256").hexdigest()


def operator():
    if sha(OPERATOR) != OPERATOR_SHA:
        raise ValueError("published operator changed; review/version the definition before reusing results")
    sys.path.insert(0, str(OPERATOR.parent))
    spec = importlib.util.spec_from_file_location("published_box_count", OPERATOR)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def sink():
    return {k: defaultdict(Counter) for k in ("concept", "personnel", "composition", "touch")}


def valid_frame(frame, n):
    return len(frame) == n and all(len(q) == 2 and all(type(v) in (int, float) and math.isfinite(v) for v in q) for q in frame)


def observe(play, op, live=True):
    """Reuse published counts; only restrict touch admission to the live window."""
    p, xy, players = dict(play), play["xy"], play["players"]
    reasons = []
    if not xy or not valid_frame(xy[0], len(players)):
        return {"status": "unknown", "reasons": ["missing_or_invalid_snap_positions"]}
    if len([q for q in players if q["group"] == "OL"]) < 5:
        return {"status": "excluded", "reasons": ["fewer_than_five_listed_ol"]}
    ids = [q.get("id") for q in players]
    if all(i is not None for i in ids) and len(set(ids)) != len(ids):
        return {"status": "unknown", "reasons": ["duplicate_player_ids"]}
    if len(players) != 22 or Counter(q.get("side") for q in players) != {"O": 11, "D": 11}:
        return {"status": "unknown", "reasons": ["incomplete_or_ambiguous_roster"]}
    known = {"QB", "OL", "RB", "TE", "WR", "DL", "LB", "DB"}
    if any(q.get("group") not in known for q in players):
        return {"status": "unknown", "reasons": ["unknown_position_group"]}
    if any((q["side"] == "O") != (q["group"] in {"QB", "OL", "RB", "TE", "WR"}) for q in players):
        return {"status": "unknown", "reasons": ["listed_position_side_ambiguous"]}
    if type(play["carrier"]) is not int or not 0 <= play["carrier"] < len(players) or players[play["carrier"]]["side"] != "O":
        return {"status": "unknown", "reasons": ["invalid_carrier_identity"]}
    if live:
        end = play.get("end")
        if type(end) not in (int, float) or not math.isfinite(end) or end < 0:
            reasons.append("touch_end_unknown")
            p["xy"] = xy[:1]
        else:
            p["xy"] = xy[:max(1, math.floor((end + 1e-8) / .1) + 1)]
    if any(not valid_frame(f, len(players)) for f in p["xy"]):
        # Preserve the valid initial count even when the later metric is unknown.
        reasons.append("touch_live_positions_missing")
        p["xy"] = xy[:1]
    out = sink()
    op.measure(p, out)
    c = out["concept"][(p["src"], "ALL")]
    if not c["n"]:
        raise ValueError("validated input was not admitted by the pinned operator")
    b = op.bucket(c["surplus"])
    t = out["touch"][(p["src"], "ALL", b)]
    touch_unknown = bool(reasons)
    groups = Counter(q["group"] for q in players if q["side"] == "O")
    return {"status": "observed", "reasons": reasons, "box": c["box"], "blockers": c["blk"], "surplus": c["surplus"], "bucket": b,
            "personnel_proxy": next(iter(out["personnel"]))[1], "listed_composition": dict(groups),
            "carrier_group": players[p["carrier"]]["group"], "backers": None if touch_unknown else t["n"],
            "touched": None if touch_unknown else t["touched"], "touch_status": "unknown" if touch_unknown else "observed",
            "admitted_frames": len(p["xy"]), "shorter_than_touch_start": len(p["xy"]) <= 3,
            "snapshot": "snap-only", "verified_pre_snap": False,
            "player_identity_check": "explicit_ids_unique" if all(i is not None for i in ids) else "loader_indices_only; converter uniqueness not independently rechecked"}


def streams(path, src, op, counts):
    """Join retained raw identity to the unmodified published loader selection."""
    if src == "nfl":
        def metadata():
            with gzip.open(path, "rt") as f:
                for line in f:
                    raw = json.loads(line)
                    counts["input_records"] += 1
                    if raw.get("kind") != "run" or raw.get("carrier") is None:
                        counts["loader_excluded_nonrun_or_no_carrier"] += 1
                        continue
                    yield raw
        plays = op.nfl(path)
    else:
        def metadata():
            for raw in json.loads(Path(path).read_text()):
                counts["input_records"] += 1
                if not raw.get("setup", {}).get("concept"):
                    counts["published_excluded_no_run_concept"] += 1
                    continue
                if raw["nullified"]:
                    counts["loader_excluded_nullified"] += 1
                    continue
                agents = raw["setup"]["agents"]
                if not any(f["c"] >= 0 and agents[f["c"]]["slot"] != "QB" for f in raw["frames"]):
                    counts["loader_excluded_no_nonqb_carrier"] += 1
                    continue
                yield raw
        plays = op.run_films([str(path)])
    marker = object()
    for ordinal, (p, raw) in enumerate(itertools.zip_longest(plays, metadata(), fillvalue=marker)):
        if p is marker or raw is marker:
            raise ValueError("metadata/loader selection mismatch; no ordinal substitution")
        # Verify join identity using snap geometry, concept and carrier.
        if src == "nfl":
            expected = [(raw["xy"][0][2 * i], raw["xy"][0][2 * i + 1]) for i in range(len(raw["players"]))]
            concept = raw["cell"]["concept"]
            expected_carrier = raw["carrier"]
        else:
            expected = [(q[0] - raw["setup"]["los"], q[1]) for q in raw["frames"][0]["a"]]
            concept = raw["setup"]["concept"]
            expected_carrier = next(f["c"] for f in raw["frames"] if f["c"] >= 0 and raw["setup"]["agents"][f["c"]]["slot"] != "QB")
        expected_concept = concept if src == "nfl" else op.sim.__globals__["SIM_CONCEPT"].get(concept, concept)
        if p["xy"] and p["xy"][0] != expected:
            raise ValueError("metadata/loader snap mismatch")
        if p["concept"] != expected_concept or p["carrier"] != expected_carrier:
            raise ValueError("metadata/loader concept or carrier mismatch")
        ident = raw.get("id")
        cluster = ident.split("-")[0] if src == "nfl" and re.fullmatch(r"\d{10}-\d+", str(ident)) else None
        yield p, {"play_id": ident, "filtered_run_ordinal": ordinal, "cluster": cluster, "raw_concept": concept,
                  "formation_unmatched": raw.get("setup", {}).get("formation") if src == "sim" else raw.get("cell", {}).get("formation")}


def quantile(v, q):
    if not v:
        return None
    s = sorted(v)
    x = (len(s) - 1) * q
    lo = math.floor(x)
    return s[lo] + (s[math.ceil(x)] - s[lo]) * (x - lo)


def summary(rows, draws, seed):
    observed = [r for r in rows if r["status"] == "observed"]
    measured = [r for r in observed if r["backers"] is not None]
    n, nb = len(observed), sum(r["backers"] for r in measured)
    point = {"runs": len(rows), "counted_runs": n, "status": dict(Counter(r["status"] for r in rows)),
             "reasons": dict(Counter(x for r in rows for x in r["reasons"])), "touch_observed_runs": len(measured),
             "box_mean": statistics.mean(r["box"] for r in observed) if n else None,
             "blockers_mean": statistics.mean(r["blockers"] for r in observed) if n else None,
             "raw_counts": dict(Counter(f"B{r['blockers']}:D{r['box']}" for r in observed)),
             "bucket_counts": dict(Counter(r["bucket"] for r in observed)),
             "backers": nb, "touched": sum(r["touched"] for r in measured),
             "backer_touch_fraction": sum(r["touched"] for r in measured) / nb if nb else None}
    clusters = defaultdict(list)
    for r in observed:
        if r.get("cluster"):
            clusters[r["cluster"]].append(r)
    point["clusters"] = len(clusters)
    point["few_clusters"] = len(clusters) < 10
    point["ci95_touch"], point["ci95_box_mean"], point["ci95_blockers_mean"], point["ci95_bucket_shares"] = None, None, None, None
    point["ci_unavailable"] = "missing_cluster_identity" if any(not r.get("cluster") for r in observed) else "fewer_than_two_clusters" if len(clusters) < 2 else None
    if point["ci_unavailable"] is None:
        vectors = [[len(rs), sum(r["box"] for r in rs), sum(r["blockers"] for r in rs),
                    *[sum(r["bucket"] == b for r in rs) for b in BUCKETS],
                    sum(r["backers"] for r in rs if r["backers"] is not None),
                    sum(r["touched"] for r in rs if r["touched"] is not None)] for _, rs in sorted(clusters.items())]
        rng, values, no_denominator = random.Random(seed), [[] for _ in range(7)], 0
        for _ in range(draws):
            picked = [rng.choice(vectors) for _ in vectors]
            total = [sum(v[k] for v in picked) for k in range(9)]
            for k in range(6):
                values[k].append(total[k + 1] / total[0])
            if total[7]:
                values[6].append(total[8] / total[7])
            else:
                no_denominator += 1
        point["ci95_box_mean"] = [quantile(values[0], .025), quantile(values[0], .975)]
        point["ci95_blockers_mean"] = [quantile(values[1], .025), quantile(values[1], .975)]
        point["ci95_bucket_shares"] = {b: [quantile(values[k + 2], .025), quantile(values[k + 2], .975)] for k, b in enumerate(BUCKETS)}
        point["bootstrap_zero_denominator_draws"] = no_denominator
        if no_denominator:
            point["ci_unavailable"] = "bootstrap_draws_without_backers"
        else:
            point["ci95_touch"] = [quantile(values[6], .025), quantile(values[6], .975)]
    return point


def tables(rows, draws=400, seed=20221009):
    out = []
    for dims in ((), ("bucket",), ("concept", "bucket"), ("concept", "personnel_proxy", "carrier_group", "bucket"), ("concept", "personnel_proxy", "carrier_group", "blockers", "box")):
        cells = defaultdict(list)
        for r in rows:
            cells[(r["source"], *(r.get(k, "unknown") for k in dims))].append(r)
        for key, rr in sorted(cells.items(), key=lambda kv: str(kv[0])):
            out.append({"source": key[0], "dimensions": dims, "cell": key[1:], **summary(rr, draws, seed)})
    return out


def common_support(rows):
    cells = {"nfl": defaultdict(list), "sim": defaultdict(list)}
    for r in rows:
        if r["status"] != "observed":
            continue
        key = (r["concept"], json.dumps(r["listed_composition"], sort_keys=True), r["carrier_group"], r["blockers"], r["box"])
        cells[r["source"]][key].append(r)
    common = set(cells["nfl"]) & set(cells["sim"])
    result = {"key": ["shared_count_definition", "snap-only instant", "concept", "listed_composition", "carrier_group", "raw_blockers", "raw_defenders"],
              "matched_formation": False, "common_cells": len(common), "cells": []}
    for src in cells:
        total = sum(r["source"] == src for r in rows)
        matched = sum(len(cells[src][k]) for k in common)
        result[src] = {"all_runs": total, "counted_runs": sum(map(len, cells[src].values())), "common_runs": matched,
                       "unmatched_cells": len(set(cells[src]) - common), "coverage_of_all_runs": matched / total if total else None}
    for key in sorted(common):
        item = {"key": key}
        for src in cells:
            rr = cells[src][key]
            known = [r for r in rr if r["backers"] is not None]
            nb, nt = sum(r["backers"] for r in known), sum(r["touched"] for r in known)
            item[src] = {"runs": len(rr), "backers": nb, "touched": nt, "fraction": nt / nb if nb else None}
        result["cells"].append(item)
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--nfl", type=Path, required=True)
    p.add_argument("--nfl-label", required=True)
    p.add_argument("--sim", nargs="*", type=Path, default=[])
    p.add_argument("--sim-source")
    p.add_argument("--sim-settings", type=Path)
    p.add_argument("--sim-clusters", type=Path, help="JSON object: exact input SHA256 -> parent seed/roster cluster, never an individual RNG shift")
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--bootstrap", type=int, default=400)
    p.add_argument("--seed", type=int, default=20221009)
    args = p.parse_args()
    if args.bootstrap < 1 or (args.sim and not re.fullmatch(r"[0-9a-f]{40}", args.sim_source or "")):
        p.error("positive bootstrap / full sim producer commit required")
    protected = [args.nfl, *args.sim, OPERATOR, OPERATOR.with_name("run_film_reference.py"), Path(__file__), *[q for q in (args.sim_settings, args.sim_clusters) if q]]
    for path in protected:
        if args.out.resolve() == path.resolve() or (args.out.exists() and path.exists() and args.out.samefile(path)):
            p.error("output must not overwrite input/operator/provenance")
    inputs = [{"path": str(q), "sha256": sha(q)} for q in [args.nfl, *args.sim]]
    if len({q["sha256"] for q in inputs}) != len(inputs):
        p.error("duplicate input digest")
    clusters = json.loads(args.sim_clusters.read_text()) if args.sim_clusters else {}
    op, rows, counts, changes = operator(), [], {}, 0
    identities = set()
    for path, manifest in zip([args.nfl, *args.sim], inputs):
        src = "nfl" if path == args.nfl else "sim"
        tally = Counter()
        counts[str(path)] = tally
        for play, meta in streams(path, src, op, tally):
            tally["loaded_runs"] += 1
            if meta["play_id"]:
                key = (manifest["sha256"], meta["play_id"])
                if key in identities:
                    if src == "nfl":
                        p.error("duplicate NFL game/play identity within an input")
                    tally["repeated_sim_logical_id_execution_unverified"] += 1
                    meta["logical_id_repeated"] = True
                identities.add(key)
            row = observe(play, op)
            historical = observe(play, op, live=False)
            changed = (row.get("backers"), row.get("touched")) != (historical.get("backers"), historical.get("touched"))
            changes += changed
            row.update(meta, source=src, concept=play["concept"], input_sha256=manifest["sha256"],
                       historical_touch={k: historical.get(k) for k in ("backers", "touched")}, live_admission_changed=changed)
            if src == "sim":
                row["cluster"] = clusters.get(manifest["sha256"])
            rows.append(row)
    result = {"schema": "run-box-suite-v1", "operator_commit": "f7251869ed0f9c9f59242a9a799523c31f685fcb", "operator_sha256": sha(OPERATOR),
              "loader_sha256": sha(OPERATOR.with_name("run_film_reference.py")), "script_sha256": sha(Path(__file__)),
              "nfl_label": args.nfl_label, "sim_source": args.sim_source, "sim_settings_sha256": sha(args.sim_settings) if args.sim_settings else None,
              "inputs": inputs, "counts": counts, "live_admission_changed_runs": changes,
              "bootstrap": {"draws": args.bootstrap, "seed": args.seed, "unit": "NFL game or supplied sim parent-seed cluster; no invented IID play uncertainty"},
              "tables": tables(rows, args.bootstrap, args.seed), "common_support": common_support(rows), "rows": rows,
              "limits": ["SNAP-only composition proxy; strict pre-snap instant is unavailable in the shared loaders.",
                         "Backer proximity is not useful protection, load, an assignment, or missed attainable work.",
                         "Equal surplus is not equal raw counts. Inspect exact B,D/concept/listed-personnel/carrier cells and unstratified results.",
                         "QB-carrier NFL runs remain; shared sim loader excludes plays without non-QB carrier, including some failed exchanges.",
                         "Position groups pool RB/FB. Formation, player quality, play selection and defensive leverage remain unmatched.",
                         "No causal effect, source-independent technique label, or current-engine inference from older sim receipts."]}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2) + "\n")
    print("Source | Cell | Counted runs | Backers | Touched | Fraction | Game/seed-cluster CI")
    for t in result["tables"]:
        if len(t["dimensions"]) <= 2:
            print(t["source"], t["cell"] or "ALL", t["counted_runs"], t["backers"], t["touched"], t["backer_touch_fraction"], t["ci95_touch"] or t["ci_unavailable"], sep=" | ")
    print("Live-window admission changed", changes, "runs; all historical values retained in JSON.")


if __name__ == "__main__":
    main()
