#!/usr/bin/env python3
"""Fetch and audit four pinned core subjects without downloading large archives.

Moore files are sparse: only the pinned header and selected sensor/processing
frame ranges are present. Never ask SubjectOnDisk to load all their frames.
No engine parameters are fitted. See the accompanying README for limitations.
"""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import importlib
import json
from pathlib import Path
import struct
import sys
import urllib.request

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = ROOT / "data/reviews/biomechanics-support/manifest.json"
G = 9.81  # SI normalization only; not an engine parameter.


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def obtain(url: str, length: int, sha: str, span: tuple[int, int] | None = None,
           total: int | None = None) -> bytes:
    headers = {"Range": f"bytes={span[0]}-{span[1]}"} if span else {}
    # Default urllib context verifies HTTPS certificates. Reject ignored Range
    # requests before reading a multi-gigabyte response.
    assert url.startswith("https://")
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=45) as r:
        assert r.url.startswith("https://"), "Refusing an insecure download redirect"
        if span:
            assert r.status == 206, "Server did not honor the selected byte range"
            assert r.headers["Content-Range"] == f"bytes {span[0]}-{span[1]}/{total}"
        else:
            assert r.status == 200
        data = r.read(length + 1)
    assert len(data) == length and digest(data) == sha, "Downloaded bytes differ from pinned source"
    return data


def fetch(manifest: dict, root: Path) -> None:
    root.mkdir(parents=True, exist_ok=True)
    for subject in manifest["subjects"]:
        path = root / subject["file"]
        if subject["storage"] == "complete":
            path.write_bytes(obtain(subject["url"], subject["fileSize"], subject["sha256"]))
        else:
            # A sparse apparent size does not mean that these bytes were fetched.
            with path.open("wb") as out:
                out.truncate(subject["fileSize"])
                for span in subject["ranges"]:
                    out.seek(span["firstByte"])
                    out.write(obtain(subject["url"], span["bytes"], span["sha256"],
                                     (span["firstByte"], span["lastByte"]), subject["fileSize"]))
        print("fetched", subject["id"], flush=True)


def varint(data: bytes, offset: int) -> tuple[int, int]:
    value, shift = 0, 0
    while True:
        byte = data[offset]
        offset += 1
        value |= (byte & 127) << shift
        if byte < 128:
            return value, offset
        shift += 7
        assert shift < 64


def frame_sizes(path: Path) -> tuple[int, int, int]:
    # Official SubjectOnDisk.proto fields 3/4 provide fixed sensor/pass sizes.
    # Parse the wire format rather than assuming that header field order is fixed.
    with path.open("rb") as source:
        size = struct.unpack("<q", source.read(8))[0]
        data = source.read(size)
    fields, offset = {}, 0
    while offset < len(data):
        tag, offset = varint(data, offset)
        field, wire = tag >> 3, tag & 7
        if wire == 0:
            value, offset = varint(data, offset)
            fields[field] = value
        elif wire == 1:
            offset += 8
        elif wire == 2:
            length, offset = varint(data, offset)
            offset += length
        elif wire == 5:
            offset += 4
        else:
            raise ValueError(f"Unsupported protobuf wire type {wire}")
    return size + 8, fields[3], fields[4]


def verify(subject: dict, root: Path, native) -> tuple[object, tuple[int, int, int]]:
    path = root / subject["file"]
    assert path.stat().st_size == subject["fileSize"]
    if subject["storage"] == "complete":
        assert digest(path.read_bytes()) == subject["sha256"]
    else:
        with path.open("rb") as source:
            for span in subject["ranges"]:
                source.seek(span["firstByte"])
                assert digest(source.read(span["bytes"])) == span["sha256"]
    model = native.biomechanics.SubjectOnDisk(str(path))
    header, sensor, processing = frame_sizes(path)
    expected = header + sum(model.getTrialLength(t) *
                            (sensor + processing * model.getTrialNumProcessingPasses(t))
                            for t in range(model.getNumTrials()))
    assert expected == subject["fileSize"], "Frame layout differs from the pinned format"
    return model, (header, sensor, processing)


def quantiles(values) -> dict | None:
    array = np.asarray(values, dtype=float).reshape(-1)
    array = array[np.isfinite(array)]
    if not len(array):
        return None
    return {k: float(np.quantile(array, q))
            for k, q in [("min", 0), ("p05", .05), ("p50", .5), ("p95", .95), ("max", 1)]}


def report_window(subject: dict, selection: dict, model, layout: tuple[int, int, int]) -> dict:
    trial, first = selection["trial"], selection["firstFrame"]
    count = model.getTrialLength(trial) if selection["frameCount"] == "entire-trial" else selection["frameCount"]
    header, sensor, processing = layout
    offset = header + sum(model.getTrialLength(t) *
                          (sensor + processing * model.getTrialNumProcessingPasses(t)) for t in range(trial))
    stride = sensor + processing * model.getTrialNumProcessingPasses(trial)
    start, end = offset + first * stride, offset + (first + count) * stride - 1
    if subject["storage"] != "complete":
        assert any(s["firstByte"] <= start and end <= s["lastByte"] for s in subject["ranges"]), \
            "Refusing to read a sparse-file hole as data"
    frames = model.readFrames(trial, first, count)
    assert len(frames) == count
    assert [f.t for f in frames] == list(range(first, first + count)), "Frame.t is an index, not seconds"
    dt, mass, height = model.getTrialTimestep(trial), model.getMassKg(), model.getHeightM()
    valid = np.array([str(f.missingGRFReason).endswith(".notMissingGRF") for f in frames])
    forces = np.asarray([f.rawForcePlateForces for f in frames], dtype=float)
    cops = np.asarray([f.rawForcePlateCenterOfPressures for f in frames], dtype=float)
    assert forces.shape == cops.shape == (count, model.getNumForcePlates(trial), 3)
    assert np.all(np.isfinite(forces[valid])) and np.all(np.isfinite(cops[valid]))
    total = forces.sum(axis=1)
    bw = mass * G
    loaded = valid & (total[:, 1] > 50)
    cop_weights = np.maximum(forces[:, :, 1], 0)
    weighted_cop = np.sum(cops * cop_weights[:, :, None], axis=1) / np.maximum(cop_weights.sum(axis=1), 1e-12)[:, None]
    passes = []
    com_kine = None
    for p in range(model.getTrialNumProcessingPasses(trial)):
        states = [f.processingPasses[p] for f in frames]
        com = np.asarray([state.comPos for state in states])
        acc = np.asarray([state.comAcc for state in states])
        assert np.all(np.isfinite(com[valid])) and np.all(np.isfinite(acc[valid]))
        # SubjectOnDisk.cpp computeValues stores comAcc = COM linear
        # acceleration - gravity: it already includes the support of weight.
        # Adding gravity again would create an erroneous ~1 BW discrepancy.
        computed = np.linalg.norm(mass * acc - total, axis=1) / bw
        if str(states[0].type).endswith(".KINEMATICS"):
            com_kine = com
        passes.append({"type": str(states[0].type), "modelComHeightOverStature": quantiles(com[valid, 1] / height),
                       "markerRmsM": quantiles([states[i].markerRMS for i in np.flatnonzero(valid)]),
                       "storedLinearResidualBW": quantiles([states[i].linearResidual / bw for i in np.flatnonzero(valid)]),
                       "storedAngularResidualBWHeight": quantiles([states[i].angularResidual / (bw * height) for i in np.flatnonzero(valid)]),
                       "computedMeasuredForceMinusMassSpecificComAccelerationBW": quantiles(computed[valid])})
    assert com_kine is not None
    marker_width, foot_centers = [], []
    for f in frames:
        markers = dict(f.markerObservations)
        heel = "CAL" if subject["study"] == "Hamner2013" else "HEE"
        left, right = .5 * (markers["L" + heel] + markers["LTOE"]), .5 * (markers["R" + heel] + markers["RTOE"])
        marker_width.append(np.linalg.norm((left - right)[[0, 2]]))
        foot_centers.append([left, right])
    foot_centers = np.asarray(foot_centers)
    valid_foot_markers = np.all(np.isfinite(foot_centers), axis=(1, 2)) & valid
    # A registration sanity check, not a claim that this midpoint is the CoP.
    distances = np.linalg.norm(cops[:, :, None, [0, 2]] - foot_centers[:, None, :, [0, 2]], axis=-1).min(axis=-1)
    stance = []
    for threshold in [25, 50, 100]:
        runs = []
        for plate in range(forces.shape[1]):
            # A force-invalid boundary is not a measured liftoff/landing event.
            mask = (forces[:, plate, 1] > threshold) & valid
            changes = np.diff(np.r_[False, mask, False].astype(int))
            for a, b in zip(np.flatnonzero(changes == 1), np.flatnonzero(changes == -1)):
                if a > 0 and b < count and valid[a - 1] and valid[b]:
                    runs.append(float((b - a) * dt))
        stance.append({"forceThresholdN": threshold, "completePlateLoadedIntervals": len(runs),
                       "durationS": quantiles(runs),
                       "noPlateAboveThresholdFractionValid": float(np.mean(np.max(forces[valid, :, 1], axis=1) <= threshold))})
    plate_loaded = (forces[:, :, 1] > 50) & valid_foot_markers[:, None]
    return {"subjectId": subject["id"], "trialIndex": trial, "trialName": model.getTrialName(trial),
            "originalTrialName": model.getTrialOriginalName(trial), "splitIndex": model.getTrialSplitIndex(trial),
            "selectionLabel": selection["label"], "firstFrame": first, "frameCount": count,
            "dtS": dt, "sampledDurationS": count * dt, "frameTimeStartS": first * dt,
            "originalStartTimeHeaderS": model.getHeaderProto().getTrials()[trial].getOriginalTrialStartTime(),
            "missingForceReasons": dict(Counter(str(f.missingGRFReason) for f in frames)),
            "validForceFrames": int(valid.sum()), "plates": forces.shape[1],
            "validForceAndFiniteFootMarkerFrames": int(valid_foot_markers.sum()),
            "verticalTotalForceBW": quantiles(total[valid, 1] / bw),
            "horizontalForceOverVerticalDemand": quantiles(np.linalg.norm(total[loaded][:, [0, 2]], axis=1) / total[loaded, 1]),
            "loadedPlateCopToNearestHeelToeMidpointM": quantiles(distances[plate_loaded]),
            "kinematicComToWeightedCopHorizontalM": quantiles(np.linalg.norm((com_kine - weighted_cop)[loaded][:, [0, 2]], axis=1)),
            "rawHeelToeMidpointFootSeparationM": quantiles(np.asarray(marker_width)[valid_foot_markers]),
            "plateLoadedIntervals": stance, "processingPasses": passes}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--raw", type=Path, default=ROOT / "out/virtual-foot-data")
    parser.add_argument("--reader-root", type=Path, default=ROOT / "out/virtual-foot-data/reader")
    parser.add_argument("--fetch", action="store_true", help="Fetch only pinned subject bytes, then exit")
    parser.add_argument("--out", type=Path, default=ROOT / "out/virtual-foot-data/support-summary.json")
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text())
    if args.fetch:
        fetch(manifest, args.raw)
        return
    sys.path.insert(0, str(args.reader_root))
    native = importlib.import_module("nimblephysics_libs._nimblephysics")
    windows, subjects = [], []
    for subject in manifest["subjects"]:
        model, layout = verify(subject, args.raw, native)
        subjects.append({"id": subject["id"], "massKg": model.getMassKg(), "heightM": model.getHeightM(),
                         "sex": model.getBiologicalSex(), "quality": str(model.getQuality()),
                         "subjectTags": model.getSubjectTags(), "embeddedNotes": model.getNotes(),
                         "embeddedHref": model.getHref(), "originalTrialCount": model.getNumTrials(),
                         "allPlateCornersZero": all(np.allclose(model.getForcePlateCorners(t, p), 0)
                                                    for t in range(model.getNumTrials()) for p in range(model.getNumForcePlates(t))),
                         "customValueNames": model.getCustomValues()})
        windows.extend(report_window(subject, selection, model, layout) for selection in subject["selections"])
    report = {"schemaVersion": 1, "manifestSha256": digest(args.manifest.read_bytes()),
              "extractorSha256": digest(Path(__file__).read_bytes()), "nativeReaderVersion": manifest["reader"]["version"],
              "measured": ["raw force-plate force/torque/CoP", "raw optical marker locations"],
              "derived": ["all processing-pass COM/acceleration", "model residuals", "thresholded plate-loading intervals", "marker heel/toe midpoint"],
              "noClaim": ["maximum traction", "football grip/strike force", "perturbation-aligned recovery", "engine parameter calibration"],
              "subjects": subjects, "windows": windows,
              "counts": {"subjects": len(subjects), "windows": len(windows), "frames": sum(w["frameCount"] for w in windows),
                         "validForceFrames": sum(w["validForceFrames"] for w in windows), "downloadedDataBytes": manifest["downloadedDataBytes"]}}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report["counts"]))


if __name__ == "__main__":
    main()
