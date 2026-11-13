#!/usr/bin/env python3
"""Download, verify and extract the NFL tracking archives listed in data/sources.json.

    python3 -I scripts/data/fetch_nfl_data.py              # every Drive archive
    python3 -I scripts/data/fetch_nfl_data.py bdb2025-2022 # just one source
    python3 -I scripts/data/fetch_nfl_data.py --list

Archives go to data/raw/zips/ and are checked against the catalog's SHA-256
before extraction into data/raw/. Nothing here enters Git. Kaggle competitions
need KAGGLE_API_TOKEN and use scripts/data/download_kaggle.py instead.
"""
import argparse
import hashlib
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ZIPS = ROOT / "data/raw/zips"


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def archives():
    catalog = json.loads((ROOT / "data/sources.json").read_text())
    for source in catalog["sources"]:
        # archiveUrl (a Drive copy of a Kaggle dataset) wins over sourceUrl, which keeps the original provenance.
        match = re.search(r"drive\.google\.com/file/d/([\w-]+)", source.get("archiveUrl") or source.get("sourceUrl", ""))
        if match and source.get("archiveSha256") and source.get("inputDirectory"):
            yield source, match.group(1)


def fetch(source, drive_id, keep_zip):
    name = source["archiveName"]
    zip_path = ZIPS / name
    # The archive's own folder layout is preserved under data/raw/<dataset>/.
    # archiveExtractTo: where the archive's own top folder lands, when it is not the first three parts of inputDirectory.
    target = ROOT / (Path(source["archiveExtractTo"]) if source.get("archiveExtractTo") else Path(*Path(source["inputDirectory"]).parts[:3]))
    if (ROOT / source["inputDirectory"]).is_dir() and any((ROOT / source["inputDirectory"]).iterdir()):
        print(f"{source['id']}: already extracted at {source['inputDirectory']}")
        return True
    ZIPS.mkdir(parents=True, exist_ok=True)
    if not zip_path.exists() or sha256(zip_path) != source["archiveSha256"]:
        print(f"{source['id']}: downloading {name} ({source.get('archiveBytes', 0) / 1e6:.0f} MB)")
        url = f"https://drive.usercontent.google.com/download?id={drive_id}&export=download&confirm=t"
        subprocess.run(["curl", "-sS", "-L", "--retry", "4", "-o", str(zip_path), url], check=True)
    actual = sha256(zip_path)
    if actual != source["archiveSha256"]:
        print(f"{source['id']}: checksum mismatch ({actual}); not extracting", file=sys.stderr)
        return False
    print(f"{source['id']}: checksum verified; extracting to {target.relative_to(ROOT)}")
    target.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as archive:
        for member in archive.namelist():
            # Refuse absolute or parent-relative members from a downloaded archive.
            if member.startswith("/") or ".." in Path(member).parts:
                print(f"{source['id']}: unsafe member {member!r}; stopping", file=sys.stderr)
                return False
        archive.extractall(target)
    wanted = ROOT / source["inputDirectory"]
    if not wanted.is_dir():
        # e.g. Big-Data-Bowl-master/Data -> data/raw/bdb2019/Data
        nested = [p for p in target.glob(f"*/{wanted.name}") if p.is_dir()]
        if len(nested) == 1:
            nested[0].rename(wanted)
    if not wanted.is_dir():
        print(f"{source['id']}: expected {source['inputDirectory']} after extraction", file=sys.stderr)
        return False
    if not keep_zip:
        zip_path.unlink()
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("ids", nargs="*", help="catalog ids (default: all Drive archives)")
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--keep-zip", action="store_true", help="keep the verified archive after extraction")
    args = parser.parse_args()
    available = list(archives())
    if args.list:
        for source, _ in available:
            print(f"{source['id']:16} season {source.get('season')}  {source['archiveName']}  -> {source['inputDirectory']}")
        return 0
    chosen = [(s, d) for s, d in available if not args.ids or s["id"] in args.ids]
    unknown = set(args.ids) - {s["id"] for s, _ in available}
    if unknown:
        parser.error(f"unknown ids: {', '.join(sorted(unknown))} (see --list)")
    ok = all([fetch(source, drive_id, args.keep_zip) for source, drive_id in chosen])
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
