#!/usr/bin/env python3
"""Restore selected historical evidence without carrying it in each new checkout."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import subprocess
import tempfile
from urllib.parse import quote


ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "data/archive/generated-artifacts.json"


def safe_path(name: str) -> PurePosixPath:
    path = PurePosixPath(name)
    if not name or path.is_absolute() or ".." in path.parts or "\\" in name:
        raise ValueError(f"Unsafe archive path: {name!r}")
    if path.parts[0] not in {"data", "viewer"}:
        raise ValueError(f"Not an evidence path: {name!r}")
    return path


def verify(path: Path, entry: dict) -> None:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    if path.stat().st_size != entry["bytes"] or digest.hexdigest() != entry["sha256"]:
        raise ValueError(f"Evidence bytes do not match the catalog: {entry['path']}")


def restore(entry: dict, destination: Path, commit: str, repository: str, root: Path = ROOT) -> Path:
    relative = safe_path(entry["path"])
    destination = destination.resolve()
    target = (destination / relative).resolve()
    if not target.is_relative_to(destination):
        raise ValueError(f"Archive path escapes the destination: {entry['path']}")
    if target.exists():
        verify(target, entry)  # Never replace different existing evidence.
        return target
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(dir=target.parent, delete=False) as output:
            temporary = Path(output.name)
            local = subprocess.run(["git", "cat-file", "-e", f"{commit}^{{commit}}"],
                                   cwd=root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if local.returncode == 0:
                command = ["git", "show", f"{commit}:{relative.as_posix()}"]
            else:
                endpoint = f"repos/{repository}/contents/{quote(relative.as_posix())}?ref={commit}"
                command = ["gh", "api", endpoint, "--header", "Accept: application/vnd.github.raw+json"]
            subprocess.run(command, cwd=root, stdout=output, check=True)
        verify(temporary, entry)
        temporary.replace(target)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    return target


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", help="Original paths listed in the catalog")
    parser.add_argument("--prefix", help="Select a whole original folder, e.g. data/reviews/rushing-benchmark")
    parser.add_argument("--list", action="store_true", help="List selected paths without restoring")
    parser.add_argument("--destination", type=Path, default=ROOT / "out/evidence-archive",
                        help="Root of restored paths; use --destination . for legacy commands")
    args = parser.parse_args()
    catalog = json.loads(CATALOG.read_text())
    if not args.paths and args.prefix is None and not args.list:
        parser.error("Choose paths or --prefix; use --list to browse")
    names = {entry["path"] for entry in catalog["files"]}
    missing = set(args.paths) - names
    if missing:
        parser.error("Not in the catalog: " + ", ".join(sorted(missing)))
    prefix = args.prefix.rstrip("/") + "/" if args.prefix is not None else None
    selected = [entry for entry in catalog["files"] if entry["path"] in args.paths
                or prefix is not None and entry["path"].startswith(prefix)
                or args.list and not args.paths and prefix is None]
    if not selected:
        parser.error("No catalog entries match the selection")
    for entry in selected:
        if args.list:
            print(f"{entry['bytes']:>10}  {entry['path']}")
        else:
            print(restore(entry, args.destination, catalog["commit"], catalog["repository"]))


if __name__ == "__main__":
    main()
