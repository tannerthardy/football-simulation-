#!/usr/bin/env python3
"""Inventory existing BDB2025 weeks, reuse week 1, run the frozen query on others.

No download, extraction, engine import, changed filter or changed measurement.
Default is a cheap inventory; --run enables the explicitly bounded expansion.
"""
import argparse
from collections import Counter
import csv
import hashlib
import importlib.util
import io
import json
import math
import os
from pathlib import Path
import re
import subprocess
import tempfile
import time
import zipfile

QUERY_COMMIT = "81e43e7279a26c43f2ae5ea29a2282316f42899c"
WEEK1_COMMIT = "481ad18e5d1cd45a1d5008496b9917511d8397b1"
WEEK1_SHA = "7911a33decb4ce9f2dfef768f37c527936e573506664b273d231b6c0d0f7f60c"
ARCHIVE_SHA = "743794b44b5ef49da7cb7d3f488a9418ac16c5ef269199a4044eecb8258550d3"
MODULES = {
    "scripts/diag/p045-nfl-approach.py": "c1ef6d08a1e6b736341dee096116799d437f23b6b26694830db3abadd9471f86",
    "scripts/mechanics/metrics.py": "368ac89d2a24ccfb2ab3ea712b9d21734455648f473e76532e3f4ddb4cc541b0",
    "scripts/mechanics/nfl_bdb2025.py": "a964af05d205f094126f08bdbbfb8788190f21fa7df003fbd0a5936446f5235c",
}
PREFIX = "big-data-bowl-data/"
META = ("players.csv", "plays.csv", "player_play.csv")


class CostLimit(RuntimeError):
    pass


class Budget:
    def __init__(self, seconds=300, byte_limit=12 * 1024**3):
        self.started = time.monotonic()
        self.seconds, self.byte_limit, self.bytes = seconds, byte_limit, 0

    def check(self, count=0):
        self.bytes += count
        if self.bytes > self.byte_limit or time.monotonic() - self.started > self.seconds:
            raise CostLimit("Declared wall/input-read budget exhausted")


class DigestReader(io.RawIOBase):
    """Hash exactly the source bytes consumed by the original CSV reader."""
    def __init__(self, source, name, size, budget, records):
        self.source, self.name, self.size = source, name, size
        self.budget, self.records = budget, records
        self.digest, self.count = hashlib.sha256(), 0

    def readable(self):
        return True

    def readinto(self, buffer):
        self.budget.check()
        chunk = self.source.read(len(buffer))
        self.budget.check(len(chunk))
        buffer[:len(chunk)] = chunk
        self.digest.update(chunk)
        self.count += len(chunk)
        return len(chunk)

    def close(self):
        if not self.closed:
            self.records.append({"member": self.name, "bytes": self.count,
                                 "sha256": self.digest.hexdigest(), "complete": self.count == self.size})
            self.source.close()
        super().close()


def zip_open(archive, budget, records):
    def reader(path, mode="r", **kwargs):
        if mode not in ("r", "rt") or kwargs.get("newline") not in (None, ""):
            raise ValueError("Unexpected reader contract")
        name = PREFIX + Path(path).name
        info = archive.getinfo(name)
        raw = DigestReader(archive.open(info), name, info.file_size, budget, records)
        return io.TextIOWrapper(io.BufferedReader(raw), encoding="utf-8", newline=kwargs.get("newline"))
    return reader


def id_key(result):
    return tuple(map(int, result["id"].split("-")))


def audited_week(query, data, week, game_weeks, budget):
    """Passive wrappers return every original value and re-raise its errors.

    Assert the audit reconciles with original counters/witnesses. No extra
    tracking pass, event changes or player observations are introduced.
    """
    adapter = query.adapter
    stream, convert, measure = adapter.stream, adapter.convert, query.measure
    current, seen = {}, set()
    failures, memberships, outcomes = Counter(), Counter(), Counter()
    cases, examples, metadata_by_week = [], {"contained": [], "offensive_win": []}, Counter()
    counts = Counter()

    def reject(reason, **detail):
        failures[reason] += 1
        cases.append({"id": "-".join(current["key"]), "reason": reason, **detail})

    def observe_stream(weeks, plays, positions):
        assert weeks == [week]
        for key in plays:
            metadata_by_week[game_weeks[key[0]]] += 1
        for key, rows in stream(weeks, plays, positions):
            budget.check()
            if game_weeks[key[0]] != week:
                raise ValueError("Cross-week game detected; cannot combine caches safely")
            current["key"] = key
            counts["fragments"] += 1
            if key in seen:
                reject("duplicate_fragment")
            seen.add(key)
            yield key, rows

    def observe_convert(key, rows, meta, positions):
        raw = convert(key, rows, meta, positions)
        if raw is None:
            reject("conversion_rejected_unspecified")
        else:
            missing = [e for e in ("pass_forward", "pass_arrived", "catch") if e not in raw["events"]]
            if missing:
                reject("missing_required_events", missing=missing)
            else:
                counts["converted"] += 1
                if len(raw["players"]) != 22:
                    reject("not_22_player_ids")
        return raw

    def observe_measure(raw):
        try:
            result = measure(raw)
        except ValueError as error:
            reject("sample_validity", detail=str(error))
            raise
        ev = raw["events"]
        near = min(d["separation_yd"] for d in result["snapshots"][-1]["defenders"])
        flight = ev["catch"] - ev["pass_forward"]
        tests = {"depth": query.QUERY["catch_depth_yd"][0] <= result["catch_depth_yd"] <= query.QUERY["catch_depth_yd"][1],
                 "flight": query.QUERY["flight_s"][0] <= flight <= query.QUERY["flight_s"][1],
                 "separation": query.QUERY["nearest_at_catch_yd"][0] <= near <= query.QUERY["nearest_at_catch_yd"][1]}
        failed = [name for name, passed in tests.items() if not passed]
        if failed:
            memberships.update(failed)
            reject("geometry_" + failed[0], failed_filters=failed, depth_yd=result["catch_depth_yd"],
                   flight_s=flight, nearest_yd=near)
        else:
            counts["geometry_matched"] += 1
            group = "contained" if result["yac_yd"] <= 5 else "offensive_win" if result["yac_yd"] >= 15 else "middle_yac"
            outcomes[group] += 1
            cases.append({"id": result["id"], "outcome_bin": group, "yac_yd": result["yac_yd"]})
            if group in examples:
                examples[group] = sorted(examples[group] + [result], key=id_key)[:3]
        return result

    adapter.stream, adapter.convert, query.measure = observe_stream, observe_convert, observe_measure
    try:
        original = query.nfl_query(data, [week])
    except Exception as error:
        error.p045_partial_audit = {"complete": False, "stream_fragments": counts["fragments"],
                                    "cases": cases, "disjoint_first_failure": dict(failures)}
        raise
    finally:
        adapter.stream, adapter.convert, query.measure = stream, convert, measure
    for name in ("converted", "geometry_matched"):
        assert counts[name] == original["counts"][name]
    invalid = sum(failures[k] for k in ("duplicate_fragment", "conversion_rejected_unspecified", "missing_required_events", "not_22_player_ids", "sample_validity"))
    assert invalid == original["counts"]["invalid"]
    for group in ("contained", "offensive_win"):
        assert outcomes[group] == original["counts"][group]
        if examples[group]:
            assert examples[group][0] == original["witnesses"][group]
        else:
            assert group not in original["witnesses"]
    assert counts["fragments"] == sum(failures.values()) + sum(outcomes.values())
    return {"status": "complete", "week": week, "original": original,
            "audit": {"stream_fragments": counts["fragments"], "distinct_label_play_ids_seen": len(seen),
                      "metadata_candidates_by_week": dict(sorted(metadata_by_week.items())),
                      "disjoint_first_failure": dict(failures), "geometry_failure_memberships_overlap": dict(memberships),
                      "outcome_bins": dict(outcomes), "cases": cases, "reconciles_with_unchanged_query": True},
            "examples": examples}


def inventory(archive, data):
    with zipfile.ZipFile(archive) as z:
        members = {}
        for info in z.infolist():
            match = re.fullmatch(PREFIX + r"tracking_week_(\d+)\.csv", info.filename)
            if match:
                week = int(match.group(1))
                if week in members:
                    raise ValueError("Duplicate tracking member")
                local = data / Path(info.filename).name
                members[week] = {"week": week, "member": info.filename, "bytes": info.file_size,
                                 "compressed_bytes": info.compress_size, "crc32": f"{info.CRC:08x}",
                                 "restored_readable": local.is_file() and os.access(local, os.R_OK),
                                 "restored_bytes": local.stat().st_size if local.is_file() else None}
        required = [PREFIX + n for n in META] + [PREFIX + "games.csv"]
        for name in required:
            z.getinfo(name)
        sizes = {name: z.getinfo(PREFIX + name).file_size for name in META}
        new = sorted(w for w in members if w != 1 and 1 <= w <= 9)
        estimate = archive.stat().st_size + sum(members[w]["bytes"] for w in new)
        estimate += len(new) * (2 * sizes["players.csv"] + sizes["plays.csv"] + 2 * sizes["player_play.csv"])
        estimate += z.getinfo(PREFIX + "games.csv").file_size
    return {"archive": str(archive), "archive_bytes": archive.stat().st_size,
            "weeks": [members[w] for w in sorted(members)], "new_weeks": new,
            "outside_catalog_weeks": sorted(w for w in members if not 1 <= w <= 9),
            "planned_input_read_bytes": estimate, "source_mode": "Existing verified ZIP streams; no extraction or new download"}


def git_bytes(repo, commit, name):
    return subprocess.check_output(["git", "-C", str(repo), "show", f"{commit}:{name}"])


def save(path, packet):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(packet, indent=2, allow_nan=False) + "\n")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--repo", type=Path, default=Path.cwd())
    ap.add_argument("--archive", type=Path, default=Path("/workspace/football-yac-angle/data/raw/zips/archive.zip"))
    ap.add_argument("--data", type=Path, default=Path("/workspace/football-yac-angle/data/raw/bdb2025/big-data-bowl-data"))
    ap.add_argument("--week1", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--run", action="store_true")
    args = ap.parse_args()
    if args.out.exists():
        raise FileExistsError("Preserve existing evidence; choose a fresh --out")
    packet = {"schema": "p045-nfl-available-weeks-v1", "status": "inventory_pending", "query_commit": QUERY_COMMIT,
              "module_sha256": MODULES, "driver_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              "budget": {"wall_seconds": 300, "input_read_bytes": 12 * 1024**3}, "simulation_runs": 0}
    if not args.archive.is_file():
        packet.update(status="access_blocked", blocker="Existing archive is not readable on this executor", archive=str(args.archive))
        save(args.out, packet)
        print(json.dumps({"status": packet["status"], "out": str(args.out)}))
        return 2
    packet["inventory"] = inventory(args.archive, args.data)
    packet["status"] = "inventoried_not_executed"
    save(args.out, packet)
    print(json.dumps({"inventory": packet["inventory"], "budget": packet["budget"]}), flush=True)
    if not args.run:
        return 0
    if packet["inventory"]["planned_input_read_bytes"] > packet["budget"]["input_read_bytes"]:
        packet.update(status="cost_blocked", blocker="Inventory exceeds declared input-read budget; no query executed")
        save(args.out, packet)
        return 2
    budget = Budget()
    stat = args.archive.stat()
    archive_identity = (stat.st_dev, stat.st_ino, stat.st_size, stat.st_mtime_ns)
    records, per_week = [], []
    packet["per_week"] = per_week
    try:
        digest = hashlib.sha256()
        with args.archive.open("rb") as f:
            for block in iter(lambda: f.read(1 << 20), b""):
                budget.check(len(block)); digest.update(block)
        assert digest.hexdigest() == ARCHIVE_SHA, "Archive checksum mismatch"
        packet["archive_sha256"] = digest.hexdigest()
        cache_bytes = args.week1.read_bytes() if args.week1 else git_bytes(args.repo, WEEK1_COMMIT, "data/reviews/current/p045-nfl-week1-return.json")
        assert hashlib.sha256(cache_bytes).hexdigest() == WEEK1_SHA
        cache = json.loads(cache_bytes)
        assert cache["query_commit"] == QUERY_COMMIT and cache["module_sha256"] == MODULES
        assert cache["receipt"]["catalog_archive_sha256"] == ARCHIVE_SHA and cache["query"]["weeks"] == [1]
        per_week.append({"week": 1, "status": "reused", "original": cache["nfl"], "result_sha256": WEEK1_SHA,
                         "audit": {"reason_detail": "Legacy week-1 invalid/geometry reasons were not collected; no rescan"}})
        packet.update(status="running", reused_weeks=[1], new_query_weeks_attempted=[])
        with tempfile.TemporaryDirectory(prefix="p045-expand-") as tmp, zipfile.ZipFile(args.archive) as archive:
            root = Path(tmp)
            for name, expected in MODULES.items():
                content = git_bytes(args.repo, QUERY_COMMIT, name)
                assert hashlib.sha256(content).hexdigest() == expected
                p = root / name; p.parent.mkdir(parents=True, exist_ok=True); p.write_bytes(content)
            spec = importlib.util.spec_from_file_location("p045_frozen_query", root / "scripts/diag/p045-nfl-approach.py")
            query = importlib.util.module_from_spec(spec); spec.loader.exec_module(query)
            assert cache["query"] == query.QUERY
            opener = zip_open(archive, budget, records)
            with opener(args.data / "games.csv", newline="") as f:
                game_weeks = {r["gameId"]: int(r["week"]) for r in csv.DictReader(f)}
            query.adapter.open = opener
            for week in packet["inventory"]["new_weeks"]:
                began = time.monotonic()
                packet["new_query_weeks_attempted"].append(week)
                try:
                    result = audited_week(query, args.data, week, game_weeks, budget)
                    result["elapsed_s"] = time.monotonic() - began
                    for record in records:
                        assert record["complete"], "Incomplete CSV read cannot issue a complete week"
                        filename = Path(record["member"]).name
                        if filename in META:
                            assert record["sha256"] == cache["access"][filename]["sha256"], "Metadata differs from week-1 cache"
                    budget.check()
                    per_week.append(result)
                    save(args.out, packet | {"input_reads": records})
                    print(json.dumps({"week": week, "counts": result["original"]["counts"], "elapsed_s": result["elapsed_s"]}), flush=True)
                except Exception as error:
                    per_week.append({"week": week, "status": "incomplete", "error": str(error),
                                     "partial_audit": getattr(error, "p045_partial_audit", None),
                                     "elapsed_s": time.monotonic() - began})
                    raise
        aggregate = dict(cache["nfl"]["counts"])
        examples = {g: [cache["nfl"]["witnesses"][g]] if g in cache["nfl"]["witnesses"] else [] for g in ("contained", "offensive_win")}
        for result in per_week[1:]:
            assert result["original"]["counts"]["label_candidates"] == aggregate["label_candidates"]
            for name in aggregate:
                if name != "label_candidates": aggregate[name] += result["original"]["counts"][name]
            for group in examples:
                examples[group] = sorted(examples[group] + result["examples"][group], key=id_key)[:3]
        after = args.archive.stat()
        assert (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns) == archive_identity, "Archive changed during execution"
        assert budget.bytes == stat.st_size + sum(r["bytes"] for r in records), "Input-read accounting mismatch"
        packet.update(status="complete", aggregate_counts=aggregate, examples=examples,
                      query=cache["query"] | {"weeks": [1] + packet["inventory"]["new_weeks"]},
                      label_candidates_scope="Global metadata count appears once, not summed across weeks",
                      exclusion_detail_scope="New weeks only; week 1 reuses original pooled counters without invented reasons")
    except Exception as error:
        packet.update(status="incomplete", blocker=f"{type(error).__name__}: {error}")
    packet.update(input_reads=records, input_read_bytes=budget.bytes, elapsed_s=time.monotonic() - budget.started,
                  unrun_weeks=[w for w in packet["inventory"]["new_weeks"] if not any(p["week"] == w and p["status"] == "complete" for p in per_week)])
    save(args.out, packet)
    print(json.dumps({"status": packet["status"], "out": str(args.out), "elapsed_s": packet["elapsed_s"], "unrun_weeks": packet["unrun_weeks"]}))
    return 0 if packet["status"] == "complete" else 2


if __name__ == "__main__":
    raise SystemExit(main())
