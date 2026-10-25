#!/usr/bin/env python3
"""Verify committed packet bytes; optionally require its exact producing source."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    packet = Path(__file__).resolve().parents[1]
    repo = packet.parents[2]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify-source", action="store_true")
    args = parser.parse_args()
    manifest = json.loads((packet / "artifact-manifest.json").read_text())
    for entry in manifest["artifacts"]:
        path = packet / entry["path"]
        if path.stat().st_size != entry["bytes"] or digest(path) != entry["sha256"]:
            raise ValueError(f"Published bytes differ: {entry['path']}")
        if path.name.endswith(".json.gz"):
            json.loads(gzip.decompress(path.read_bytes()))
        elif path.suffix == ".json":
            json.loads(path.read_text())
    if args.verify_source:
        for entry in manifest["producingFiles"]:
            if digest(repo / entry["path"]) != entry["sha256"]:
                raise ValueError(f"Producing file differs: {entry['path']}")
        source = hashlib.sha256()
        for name in sorted(p.relative_to(repo).as_posix()
                           for p in (repo / "src").rglob("*") if p.is_file()):
            source.update(name.encode())
            source.update(b"\0")
            source.update((repo / name).read_bytes())
            source.update(b"\0")
        if source.hexdigest() != manifest["productionSourceSha256"]:
            raise ValueError("Engine src differs from the producing source")
    print(json.dumps({"verifiedArtifacts": len(manifest["artifacts"]),
                      "producingSourceVerified": args.verify_source,
                      "status": "passed"}))


if __name__ == "__main__":
    main()
