#!/usr/bin/env python3
"""Measure plays in the common format (from either adapter) with the shared metrics.

    python3 -I scripts/mechanics/measure.py out/mechanics/sim-plays.jsonl.gz out/mechanics/sim.json
"""
import argparse
import gzip
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from metrics import DEFINITIONS, Collector  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("plays", type=Path)
    parser.add_argument("out", type=Path)
    parser.add_argument("--label", default=None)
    parser.add_argument("--provenance-from", type=Path, help="copy source/provenance from an existing summary (re-measuring saved NFL plays)")
    args = parser.parse_args()
    collector = Collector()
    with gzip.open(args.plays, "rt") as handle:
        for line in handle:
            collector.add(json.loads(line))
    if args.label is None:
        commit = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True,
                                cwd=Path(__file__).resolve().parent).stdout.strip()
        args.label = f"{args.plays.name} at {commit or 'unknown commit'}"
    summary = {"source": args.label, **collector.summary(), "definitions": DEFINITIONS}
    if args.provenance_from:
        previous = json.loads(args.provenance_from.read_text())
        summary = {"source": previous["source"], "provenance": previous.get("provenance"),
                   **{k: v for k, v in summary.items() if k != "source"}}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(summary, indent=1) + "\n")
    print(f"{summary['plays']} plays measured -> {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
