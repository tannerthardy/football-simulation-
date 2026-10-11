#!/usr/bin/env python3
"""Fetch public reference files from immutable manifest byte/SHA-256 pins.

Only Python's standard library is required. Existing matching files are reused;
existing mismatching files are rejected rather than overwritten. Original
manifests are never changed. No credentials or GitHub client are required.

python3 scripts/data/fetch_rushing_reference.py \
  --manifest data/reviews/nflverse/input-manifest.json --out data/raw/nflverse

Supply --manifest repeatedly to combine additive manifests in one directory.
Use --verify-only to audit already downloaded files without network access.
This fetcher preserves acquisition provenance; it does not interpret the data
or change the attribution/license attached to each source or derived aggregate.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import tempfile
import urllib.parse
import urllib.request


SAFE_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
SHA256 = re.compile(r"^[0-9a-f]{64}$")
SAFE_HEADERS = ("content-type", "content-length", "last-modified", "etag",
                "date", "content-disposition")
CHUNK = 1024 * 1024


def utc_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def file_sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(CHUNK), b""):
            digest.update(chunk)
    return digest.hexdigest()


def public_https_url(url):
    if not isinstance(url, str):
        raise ValueError("Pinned file URL must be a string")
    parsed = urllib.parse.urlsplit(url)
    if (parsed.scheme != "https" or not parsed.hostname or parsed.username is not None
            or parsed.password is not None or parsed.fragment):
        raise ValueError("Pinned files require public HTTPS URLs without credentials or fragments")
    return parsed


class HttpsRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, new_url):
        public_https_url(new_url)
        return super().redirect_request(request, response, code, message, headers, new_url)


def read_manifests(paths):
    """Reject unsafe names and conflicting pins before any file or network write."""
    sources, pins = [], {}
    for path in paths:
        body = path.read_bytes()
        manifest = json.loads(body)
        if not isinstance(manifest, dict) or not isinstance(manifest.get("files"), list):
            raise ValueError(f"Manifest needs a files array: {path}")
        source = {"manifest": str(path), "sha256": hashlib.sha256(body).hexdigest()}
        sources.append(source)
        for entry in manifest["files"]:
            if not isinstance(entry, dict):
                raise ValueError(f"Malformed file pin: {path}")
            name, size, sha, url = (entry.get(k) for k in ("name", "bytes", "sha256", "url"))
            if not isinstance(name, str) or not SAFE_NAME.fullmatch(name):
                raise ValueError(f"File names must be plain basenames: {name!r}")
            if not isinstance(size, int) or isinstance(size, bool) or size < 0:
                raise ValueError(f"Invalid pinned byte count: {name}")
            if not isinstance(sha, str) or not SHA256.fullmatch(sha):
                raise ValueError(f"Invalid SHA-256 pin: {name}")
            public_https_url(url)
            pin = {"name": name, "bytes": size, "sha256": sha, "url": url,
                   "manifestSources": [source]}
            if name in pins:
                previous = pins[name]
                if any(previous[key] != pin[key] for key in ("bytes", "sha256", "url")):
                    raise ValueError(f"Conflicting additive manifests for file: {name}")
                previous["manifestSources"].append(source)
            else:
                pins[name] = pin
    if not pins:
        raise ValueError("No pinned files in supplied manifests")
    return sources, list(pins.values())


def verify_file(path, pin):
    if path.is_symlink() or not path.is_file():
        raise ValueError(f"Reference must be an ordinary file: {path}")
    if path.stat().st_size != pin["bytes"] or file_sha256(path) != pin["sha256"]:
        raise ValueError(f"Reference differs from pinned size/SHA-256; existing file kept: {path}")


def fetch_file(pin, out, verify_only=False, opener=None):
    path = out / pin["name"]
    if path.is_symlink():
        raise ValueError(f"Reference destination cannot be a symlink: {path}")
    receipt = {**pin, "path": str(path), "verifiedUtc": utc_now()}
    if path.exists():
        verify_file(path, pin)
        return {**receipt, "status": "verifiedExisting", "downloaded": False}
    if verify_only:
        raise ValueError(f"Pinned reference is missing; --verify-only performs no download: {path}")
    if opener is None:
        opener = urllib.request.build_opener(HttpsRedirectHandler())
    req = urllib.request.Request(pin["url"], headers={"User-Agent": "football-simulation-reference/1.0"})
    temporary = None
    try:
        started = utc_now()
        with opener.open(req, timeout=90) as response:
            final = public_https_url(response.geturl())
            # Signed public redirects may include transient query strings. Store
            # only the final host/path and safe content headers in the receipt.
            final_origin_path = urllib.parse.urlunsplit((final.scheme, final.netloc, final.path, "", ""))
            headers = {key: response.headers[key] for key in SAFE_HEADERS if key in response.headers}
            digest, size = hashlib.sha256(), 0
            with tempfile.NamedTemporaryFile(prefix=".reference-", suffix=".part", dir=out, delete=False) as stream:
                temporary = Path(stream.name)
                while True:
                    chunk = response.read(min(CHUNK, pin["bytes"] - size + 1))
                    if not chunk:
                        break
                    size += len(chunk)
                    if size > pin["bytes"]:
                        raise ValueError(f"Downloaded file exceeds pinned byte count: {pin['name']}")
                    digest.update(chunk)
                    stream.write(chunk)
        if size != pin["bytes"] or digest.hexdigest() != pin["sha256"]:
            raise ValueError(f"Downloaded file differs from pinned size/SHA-256: {pin['name']}")
        # A concurrent collector may have supplied the file while we downloaded.
        # Accept it only if it has the same pin; never replace conflicting data.
        if path.exists() or path.is_symlink():
            verify_file(path, pin)
            temporary.unlink()
        else:
            temporary.replace(path)
        temporary = None
        return {**receipt, "status": "downloadedVerified", "downloaded": True,
                "downloadStartedUtc": started, "verifiedUtc": utc_now(),
                "finalOriginPath": final_origin_path, "httpResponseHeaders": headers}
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, action="append", required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()
    sources, pins = read_manifests(args.manifest)
    receipt_path = args.out / "fetch-receipt.json"
    if any(receipt_path.resolve() == path.resolve() for path in args.manifest):
        raise ValueError("Receipt destination would overwrite an input manifest")
    if any(pin["name"] == receipt_path.name for pin in pins):
        raise ValueError("Pinned filename is reserved for the additive fetch receipt")
    if any((args.out / pin["name"]).resolve() == path.resolve()
           for pin in pins for path in args.manifest):
        raise ValueError("Reference destination would overwrite an input manifest")
    args.out.mkdir(parents=True, exist_ok=True)
    results = []
    for pin in pins:
        result = fetch_file(pin, args.out, args.verify_only)
        results.append(result)
        print(json.dumps({"name": pin["name"], "status": result["status"],
                          "bytes": pin["bytes"], "sha256": pin["sha256"]}), flush=True)
    # Detect manifest replacement during collection; original files are immutable.
    if any(file_sha256(Path(source["manifest"])) != source["sha256"] for source in sources):
        raise ValueError("Input manifest changed during reference collection")
    receipt = {"schema": "manifest-pinned-reference-fetch-v1", "verifiedUtc": utc_now(),
               "manifestSources": sources, "verifyOnly": args.verify_only, "files": results}
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps({"receipt": str(receipt_path), "files": len(results)}))


if __name__ == "__main__":
    main()
