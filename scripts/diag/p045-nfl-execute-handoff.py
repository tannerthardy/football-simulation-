#!/usr/bin/env python3
"""Run only the existing week-1 NFL query where Catching's files already live.

Verifies the published receipt, actual CSVs, available original ZIP and three
pinned query modules. No download, extraction, engine import or sim packet is
needed. Return the small output JSON to the measurement owner.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time

QUERY_COMMIT = "81e43e7279a26c43f2ae5ea29a2282316f42899c"
RECEIPT_COMMIT = "747bb24bd2c17c8b4a6f572fcb3ee8e459375fb8"
RECEIPT_SHA = "d8e3cdc71461117439f2dafe84f1d87a3c74952d713f7167b436e4d82a53449b"
ARCHIVE_SHA = "743794b44b5ef49da7cb7d3f488a9418ac16c5ef269199a4044eecb8258550d3"
MODULES = {
    "scripts/diag/p045-nfl-approach.py": "c1ef6d08a1e6b736341dee096116799d437f23b6b26694830db3abadd9471f86",
    "scripts/mechanics/metrics.py": "368ac89d2a24ccfb2ab3ea712b9d21734455648f473e76532e3f4ddb4cc541b0",
    "scripts/mechanics/nfl_bdb2025.py": "a964af05d205f094126f08bdbbfb8788190f21fa7df003fbd0a5936446f5235c",
}


def sha(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def main():
    started = time.perf_counter()
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--repo", type=Path, default=Path.cwd())
    ap.add_argument("--receipt", type=Path, required=True)
    ap.add_argument("--data", type=Path, help="Existing restored directory; defaults to receipt path")
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()
    if sha(args.receipt) != RECEIPT_SHA:
        raise ValueError("Receipt bytes differ from the published 747bb24 receipt")
    receipt = json.loads(args.receipt.read_text())
    if receipt["archive"]["sha256"] != ARCHIVE_SHA or receipt["archive"]["bytes"] != 1219840421:
        raise ValueError("Receipt archive does not match the catalog pin")
    data = args.data or Path(receipt["rawDirectory"])
    names = ["players.csv", "plays.csv", "player_play.csv", "tracking_week_1.csv"]
    access = {n: {"path": str(data / n), "readable": (data / n).is_file() and os.access(data / n, os.R_OK),
                  "expected_bytes": receipt["files"][n]["bytes"], "expected_sha256": receipt["files"][n]["sha256"]}
              for n in names}
    packet = {"schema": "p045-nfl-execution-handoff-v1", "query_commit": QUERY_COMMIT,
              "receipt": {"commit": RECEIPT_COMMIT, "sha256": RECEIPT_SHA, "catalog_archive_sha256": ARCHIVE_SHA,
                          "published_verification_verified_zip_members": True},
              "module_sha256": MODULES, "access": access, "simulation_runs": 0,
              "nfl": {"status": "blocked", "reason": "Restored CSVs are not readable on this executor"}}
    archive = Path(receipt["archive"]["path"])
    packet["archive"] = {"path": str(archive), "readable": archive.is_file() and os.access(archive, os.R_OK),
                         "expected_bytes": receipt["archive"]["bytes"], "expected_sha256": ARCHIVE_SHA,
                         "rehashed_here": False}
    code = 2
    if all(v["readable"] for v in access.values()):
        for n, v in access.items():
            v["bytes"] = (data / n).stat().st_size
            v["sha256"] = sha(data / n)
            if v["bytes"] != v["expected_bytes"] or v["sha256"] != v["expected_sha256"]:
                raise ValueError(f"Restored file checksum/size mismatch: {n}; query not run")
        if packet["archive"]["readable"]:
            if archive.stat().st_size != receipt["archive"]["bytes"] or sha(archive) != ARCHIVE_SHA:
                raise ValueError("Existing archive checksum/size mismatch; query not run")
            packet["archive"]["rehashed_here"] = True
        # Only these three Python files enter a temporary directory; no branch
        # switch, caller code changes, engine modules or full-game inputs.
        with tempfile.TemporaryDirectory(prefix="p045-nfl-query-") as tmp:
            root = Path(tmp)
            for name, expected in MODULES.items():
                content = subprocess.check_output(["git", "-C", str(args.repo), "show", f"{QUERY_COMMIT}:{name}"])
                if hashlib.sha256(content).hexdigest() != expected:
                    raise ValueError(f"Pinned query module mismatch: {name}")
                p = root / name
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_bytes(content)
            spec = importlib.util.spec_from_file_location("p045_original_query", root / "scripts/diag/p045-nfl-approach.py")
            query = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(query)
            if query.QUERY["weeks"] != [1]:
                raise ValueError("Week-1 query scope mismatch")
            packet["query"] = query.QUERY
            packet["nfl"] = query.nfl_query(data, [1])
            packet["query_executed"] = True
            code = 0
    packet["query_executed"] = packet.get("query_executed", False)
    packet["elapsed_s"] = time.perf_counter() - started
    packet["runner_sha256"] = sha(Path(__file__))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(packet, indent=2, allow_nan=False) + "\n")
    print(json.dumps({"out": str(args.out), "NFL": packet["nfl"]["status"],
                      "query_executed": packet["query_executed"], "elapsed_s": packet["elapsed_s"]}))
    return code


if __name__ == "__main__":
    sys.exit(main())
