#!/usr/bin/env python3
"""Download a competition to ignored raw storage and fingerprint its files.

Install requirements-kaggle.txt, then provide KAGGLE_API_TOKEN as an environment
secret. Credentials are neither printed nor written to the manifest.
"""

import argparse
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("competition", nargs="?", default="nfl-big-data-bowl-2027")
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", args.competition):
        parser.error("competition must be a Kaggle slug")
    if not os.environ.get("KAGGLE_API_TOKEN"):
        print("KAGGLE_API_TOKEN is missing in this execution environment. Add it as a cloud secret; do not paste it into chat.", file=sys.stderr)
        return 2

    root = Path(__file__).resolve().parents[2]
    output = (args.output_dir or root / "data/raw/kaggle" / args.competition).resolve()
    manifest = args.manifest or root / "out/kaggle" / f"{args.competition}-manifest.json"
    os.environ.setdefault("KAGGLEHUB_CACHE", str(root / "data/raw/kaggle-cache"))
    try:
        import kagglehub
    except ImportError:
        print("Install scripts/data/requirements-kaggle.txt in your Python environment first.", file=sys.stderr)
        return 2

    try:
        result = kagglehub.competition_download(
            args.competition, output_dir=str(output), force_download=args.force
        )
    except Exception as error:
        # Avoid exception text: HTTP errors can contain signed URLs or other
        # request details. Print only the class and safe numerical status.
        response = getattr(error, "response", None)
        status = getattr(response, "status_code", None)
        detail = f", HTTP {status}" if isinstance(status, int) else ""
        print(f"Download failed ({type(error).__name__}{detail}). Check credentials, competition availability, network access and your account's competition access/rules status.", file=sys.stderr)
        return 1

    path = Path(result).resolve()
    files = []
    for file in sorted(path.rglob("*")):
        if not file.is_file() or file.relative_to(path).parts[0] == ".complete":
            continue
        digest = hashlib.sha256()
        with file.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        files.append({"path": str(file.relative_to(path)), "bytes": file.stat().st_size,
                      "sha256": digest.hexdigest()})
    if not files:
        print("Download returned no files; no dataset manifest was written.", file=sys.stderr)
        return 1

    document = {
        "source": f"https://www.kaggle.com/competitions/{args.competition}",
        "competition": args.competition,
        "downloadedAtUtc": datetime.now(timezone.utc).isoformat(),
        "note": "Latest available files at retrieval time. Hashes identify this snapshot; season, schema and cohort remain to be inspected.",
        "fileCount": len(files), "totalBytes": sum(file["bytes"] for file in files),
        "files": files,
    }
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(json.dumps(document, indent=2) + "\n", encoding="utf-8")
    print(f"Path to competition files: {path}")
    print(f"Manifest: {manifest} ({len(files)} files)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
