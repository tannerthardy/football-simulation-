#!/usr/bin/env python3
"""Extract rigid torso/foot shape priors from pinned Hamner OpenSim poses.

All masses, inertias and locations are processed-model assignments, not direct
measurements. This does not fit contact forces or infer NFL anthropometry.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
MANIFEST_DEFAULT = ROOT / "data/reviews/biomechanics-support/manifest.json"
FEET = {"l": ("talus_l", "calcn_l", "toes_l"), "r": ("talus_r", "calcn_r", "toes_r")}
M_TO_YD = 1.0 / 0.9144
INERTIA_M2_TO_YD2 = M_TO_YD ** 2


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def inertia_matrix(values: list[float]) -> np.ndarray:
    if len(values) != 6:
        raise ValueError(f"Expected six inertia values, got {values}")
    xx, yy, zz, xy, xz, yz = values
    # OpenSim's six symmetric inertia entries are expressed about the body COM.
    return np.array([[xx, xy, xz], [xy, yy, yz], [xz, yz, zz]], dtype=float)


def aggregate(parts: list[dict]) -> tuple[float, np.ndarray, np.ndarray]:
    mass = sum(part["mass"] for part in parts)
    if not mass > 0:
        raise ValueError("Cannot aggregate an empty or zero-mass group")
    center = sum((part["mass"] * part["center"] for part in parts), np.zeros(3)) / mass
    tensor = np.zeros((3, 3))
    identity = np.eye(3)
    for part in parts:
        delta = part["center"] - center
        tensor += part["inertiaWorld"] + part["mass"] * ((delta @ delta) * identity - np.outer(delta, delta))
    return mass, center, tensor


def check_parallel_axis_identity() -> None:
    """Two equal point masses at +/-a on x have I=(0, 2ma², 2ma²)."""
    mass, a = 3.0, 0.7
    points = [np.array([-a, 0.0, 0.0]), np.array([a, 0.0, 0.0])]
    parts = [{"mass": mass, "center": point, "inertiaWorld": np.zeros((3, 3))}
             for point in points]
    _, _, result = aggregate(parts)
    expected = np.diag([0.0, 2 * mass * a * a, 2 * mass * a * a])
    if not np.allclose(result, expected, atol=1e-12, rtol=0):
        raise AssertionError(f"Parallel-axis analytic check failed: {result} != {expected}")


def vec(value: np.ndarray) -> list[float]:
    return [float(x) for x in np.asarray(value).reshape(3)]


def tensor(value: np.ndarray) -> list[list[float]]:
    return [[float(x) for x in row] for row in value]


def inertia_summary(value: np.ndarray) -> dict:
    eigen = np.linalg.eigvalsh(value)
    if eigen.min() < -1e-8:
        raise ValueError(f"Aggregated inertia is not positive semidefinite: {eigen}")
    return {"tensorKgM2": tensor(value),
            "tensorKgYd2": tensor(value * INERTIA_M2_TO_YD2),
            "principalMomentsKgM2Ascending": vec(eigen),
            "principalMomentsKgYd2Ascending": vec(eigen * INERTIA_M2_TO_YD2),
            "traceKgM2": float(np.trace(value)),
            "isotropicRotorTraceOver3KgM2": float(np.trace(value) / 3),
            "isotropicRotorTraceOver3KgYd2": float(np.trace(value) / 3 * INERTIA_M2_TO_YD2)}


def body_priors(skeleton, xml_text: str) -> tuple[dict[str, dict], list[dict]]:
    root = ET.fromstring(xml_text)
    xml_bodies = {node.attrib["name"]: node for node in root.iter("Body") if "name" in node.attrib}
    result = {}
    for index in range(skeleton.getNumBodyNodes()):
        body = skeleton.getBodyNode(index)
        name = body.getName()
        if name not in xml_bodies:
            raise ValueError(f"Skeleton body {name!r} is missing from embedded model XML")
        node = xml_bodies[name]
        mass = float(node.findtext("mass", "nan"))
        local_com = np.array([float(x) for x in node.findtext("mass_center", "nan nan nan").split()])
        inertia_values = [float(x) for x in node.findtext("inertia", "nan nan nan nan nan nan").split()]
        if not np.isfinite(mass) or not np.all(np.isfinite(local_com)):
            raise ValueError(f"Invalid embedded model body {name!r}")
        if abs(mass - body.getMass()) > 1e-7 or not np.allclose(local_com, body.getLocalCOM(), atol=1e-8, rtol=0):
            raise ValueError(f"Native reader and XML mass/COM disagree for {name!r}")
        # The pinned wheel exposes getMomentOfInertia(Ixx,...,Iyz) as a void
        # output-argument binding; Python floats cannot receive those C++ refs.
        # BodyNodeProperties also exposes no readable mInertia field. Thus its
        # native inertia matrix cannot be independently retrieved here.
        result[name] = {"mass": mass, "localCOM": local_com, "inertiaLocal": inertia_matrix(inertia_values),
                        "inertiaOffDiagonalXml": inertia_values[3:], "body": body}
    extra_names = sorted(set(xml_bodies) - set(result))
    excluded = [{"name": name, "xmlMassKg": float(xml_bodies[name].findtext("mass", "nan")),
                 "reason": "present in embedded XML but absent from native readSkel body set; excluded from aggregation"}
                for name in extra_names]
    if abs(sum(x["mass"] for x in result.values()) - skeleton.getMass()) > 1e-6:
        raise ValueError("Native body masses do not sum to the native skeleton mass")
    return result, excluded


def marker_position(marker_map, name: str) -> np.ndarray:
    if name not in marker_map:
        raise KeyError(name)
    body, local = marker_map[name]
    transform = body.getWorldTransform()
    return np.asarray(transform.translation()) + np.asarray(transform.rotation()) @ np.asarray(local)


def pose_priors(opensim_file, body_map: dict[str, dict]) -> dict:
    skeleton = opensim_file.skeleton
    parts = {}
    for name, prior in body_map.items():
        body = prior["body"]
        transform = body.getWorldTransform()
        rotation = np.asarray(transform.rotation())
        parts[name] = {"mass": prior["mass"], "center": np.asarray(body.getCOM()).copy(),
                       "inertiaWorld": rotation @ prior["inertiaLocal"] @ rotation.T,
                       "rotation": rotation, "origin": np.asarray(transform.translation()).copy()}

    foot_parts = {side: [parts[name] for name in names] for side, names in FEET.items()}
    nonfoot_parts = [part for name, part in parts.items() if not any(name in names for names in FEET.values())]
    total_mass, torso_center, torso_inertia_world = aggregate(nonfoot_parts)
    pelvis = skeleton.getBodyNode("pelvis")
    pelvis_transform = pelvis.getWorldTransform()
    pelvis_rotation = np.asarray(pelvis_transform.rotation())
    world_to_pelvis = pelvis_rotation.T
    torso_inertia_pelvis = world_to_pelvis @ torso_inertia_world @ pelvis_rotation
    torso_center_pelvis = world_to_pelvis @ (torso_center - np.asarray(pelvis_transform.translation()))
    joints = skeleton.getJointWorldPositionsMap()

    geometry = {}
    for side, names in FEET.items():
        foot_mass, foot_center, foot_inertia_world = aggregate(foot_parts[side])
        calcn = parts[f"calcn_{side}"]
        foot_frame_R = calcn["rotation"]
        world_to_foot = foot_frame_R.T
        foot_inertia_local = world_to_foot @ foot_inertia_world @ foot_frame_R
        features = {
            "ankle": np.asarray(joints[f"ankle_{side}"]),
            "subtalar": np.asarray(joints[f"subtalar_{side}"]),
            "mtp": np.asarray(joints[f"mtp_{side}"]),
            "modelHeelMarker": marker_position(opensim_file.markersMap, f"{side.upper()}CAL"),
            "modelToeMarker": marker_position(opensim_file.markersMap, f"{side.upper()}TOE"),
        }
        geometry[side] = {"massKg": float(foot_mass), "comWorldM": vec(foot_center),
                          "comWorldYd": vec(foot_center * M_TO_YD),
                          "comRelativeCalcaneusOriginInCalcaneusFrameYd": vec(world_to_foot @ (foot_center - calcn["origin"]) * M_TO_YD),
                          "inertiaInCalcaneusFrame": inertia_summary(foot_inertia_local),
                          "calcaneusFrameOriginWorldM": vec(calcn["origin"]),
                          "featureOffsetsFromFootCOMInCalcaneusFrameM": {
                              key: vec(world_to_foot @ (point - foot_center)) for key, point in features.items()},
                          "featureOffsetsFromFootCOMInCalcaneusFrameYd": {
                              key: vec(world_to_foot @ (point - foot_center) * M_TO_YD) for key, point in features.items()},
                          "componentMassKg": {name: float(parts[name]["mass"]) for name in names}}

    hip_offsets = {}
    for side in ("l", "r"):
        hip_offsets[side] = vec(world_to_pelvis @ (np.asarray(joints[f"hip_{side}"]) - torso_center))
    return {"interpretation": "pose-dependent rigid aggregation of embedded model assignments; not measured anatomy",
            "frameConvention": "world mass-weighted COM and world-rotated component inertias; reported torso/foot tensors and offsets are transformed to pelvis/calcaneus orientation without changing the mass-weighted COM basis",
            "heelToeConvention": "modelHeelMarker/modelToeMarker are embedded model markers; they are not measured sole geometry, cleat surface, or contact points",
            "totalSkeletonMassKg": float(skeleton.getMass()), "nonFootTorsoProxyMassKg": float(total_mass),
            "nonFootTorsoCOMWorldM": vec(torso_center), "nonFootTorsoCOMRelativePelvisOriginInPelvisFrameM": vec(torso_center_pelvis),
            "nonFootTorsoCOMWorldYd": vec(torso_center * M_TO_YD),
            "nonFootTorsoCOMRelativePelvisOriginInPelvisFrameYd": vec(torso_center_pelvis * M_TO_YD),
            "pelvisFrameWorldRotation": tensor(pelvis_rotation), "nonFootTorsoInertiaInPelvisFrame": inertia_summary(torso_inertia_pelvis),
            "hipJointOffsetsFromNonFootTorsoCOMInPelvisFrameM": hip_offsets,
            "feet": geometry}


def run(args) -> dict:
    check_parallel_axis_identity()
    script_path = Path(__file__).resolve()
    script_sha_start = sha256(script_path)
    manifest_bytes = args.manifest.read_bytes()
    manifest_sha = hashlib.sha256(manifest_bytes).hexdigest()
    manifest = json.loads(manifest_bytes)
    raw_root = args.data_dir
    reader_root = args.reader_dir
    sys.path.insert(0, str(reader_root))
    import nimblephysics_libs._nimblephysics as nimble

    subjects = []
    inertia_xml_audit = []
    selected_ids = {"hamner-subject01", "hamner-subject02"}
    for descriptor in manifest["subjects"]:
        if descriptor["id"] not in selected_ids:
            continue
        path = raw_root / descriptor["file"]
        actual_sha = sha256(path)
        if path.stat().st_size != descriptor["fileSize"] or actual_sha != descriptor["sha256"]:
            raise ValueError(f"Pinned complete subject mismatch for {path}")
        subject = nimble.biomechanics.SubjectOnDisk(str(path))
        if abs(subject.getMassKg() - 1.0) < 1e-12:
            raise ValueError(f"Unexpected header mass for {descriptor['id']}")
        pass_models = {}
        for suffix in ("KINEMATICS", "LOW_PASS_FILTER"):
            pass_index = next(i for i in range(subject.getNumProcessingPasses())
                              if str(subject.getProcessingPassType(i)).endswith(suffix))
            opensim_file = subject.readOpenSimFile(pass_index, "", True)
            skeleton = opensim_file.skeleton
            body_map, excluded_xml_bodies = body_priors(skeleton, subject.getOpensimFileText(pass_index))
            inertia_xml_audit.extend((descriptor["id"], suffix, name, prior["inertiaOffDiagonalXml"])
                                     for name, prior in body_map.items())
            pass_models[suffix] = {"index": pass_index, "openSim": opensim_file,
                                   "skeleton": skeleton, "bodyMap": body_map,
                                   "excludedXmlBodies": excluded_xml_bodies}
        kinematics = pass_models["KINEMATICS"]["index"]
        skeleton = pass_models["KINEMATICS"]["skeleton"]
        contact_bodies = list(subject.getGroundForceBodies())
        if contact_bodies != ["calcn_r", "calcn_l"]:
            raise ValueError(f"Unexpected contact-body ordering: {contact_bodies}")
        windows = []
        for selection in descriptor["selections"]:
            trial = int(selection["trial"])
            frame_count = subject.getTrialLength(trial)
            frames = subject.readFrames(trial, 0, frame_count, contactThreshold=1.0)
            choices = {body: None for body in contact_bodies}
            for frame in frames:
                if not str(frame.missingGRFReason).endswith("notMissingGRF"):
                    continue
                vertical_force = float(np.asarray(frame.rawForcePlateForces)[:, 1].sum())
                if vertical_force < 50:
                    continue
                pose = frame.processingPasses[kinematics]
                for contact_index, body_name in enumerate(contact_bodies):
                    if int(pose.contact[contact_index]) != 1:
                        continue
                    current = choices[body_name]
                    if current is None or vertical_force > current["verticalForceN"]:
                        choices[body_name] = {"frame": frame, "verticalForceN": vertical_force}
            representatives = []
            for contact_body, candidate in choices.items():
                if candidate is None:
                    representatives.append({"contactBody": contact_body, "status": "no-valid-stance-frame-over-50N"})
                    continue
                frame = candidate["frame"]
                pose = frame.processingPasses[kinematics]
                model_by_pass = {}
                for pass_name, pass_model in pass_models.items():
                    current_skeleton = pass_model["skeleton"]
                    current_pose = frame.processingPasses[pass_model["index"]]
                    positions = np.asarray(current_pose.pos, dtype=float)
                    if positions.shape != (current_skeleton.getNumDofs(),):
                        raise ValueError(f"DOF position length mismatch in {descriptor['id']} trial {trial} frame {frame.t}")
                    # The native wheel's vector setPositions binding crashes in this
                    # pinned build; set each native DOF through its supported scalar API.
                    for index, value in enumerate(positions):
                        current_skeleton.getDofByIndex(index).setPosition(float(value))
                    current_skeleton.computeForwardKinematics()
                    model_by_pass[pass_name] = {"processingPassIndex": pass_model["index"],
                                                 "posePriors": pose_priors(pass_model["openSim"], pass_model["bodyMap"])}
                representatives.append({"contactBody": contact_body, "status": "selected",
                                        "selection": "valid kinematics-pass contact flag (>1 N per contact body in the native reader) and raw total vertical plate force > 50 N; maximum total force in this subset",
                                        "frameIndex": int(frame.t), "timeS": float(frame.t * subject.getTrialTimestep(trial)),
                                        "dtS": float(subject.getTrialTimestep(trial)),
                                        "rawTotalVerticalForceN": candidate["verticalForceN"],
                                        "rawTotalVerticalForceBodyWeights": candidate["verticalForceN"] /
                                            (subject.getMassKg() * 9.81),
                                        "posePriorsByPass": model_by_pass})
            windows.append({"trialIndex": trial, "trialName": subject.getTrialName(trial),
                            "selectionLabel": selection["label"], "frameCount": frame_count,
                            "groundForceBodies": contact_bodies, "representatives": representatives})
        subjects.append({"subject": descriptor["id"], "b3dFile": descriptor["file"],
                         "b3dBytes": path.stat().st_size, "b3dSha256": actual_sha,
                         "headerMassKg": subject.getMassKg(), "heightM": subject.getHeightM(),
                         "nativeSkeletonMassKgByPass": {name: float(info["skeleton"].getMass()) for name, info in pass_models.items()},
                         "processingPassIndexes": {name: info["index"] for name, info in pass_models.items()},
                         "xmlBodiesExcludedFromNativeSkeleton": {name: info["excludedXmlBodies"] for name, info in pass_models.items()},
                         "windows": windows})
    if hashlib.sha256(args.manifest.read_bytes()).hexdigest() != manifest_sha:
        raise RuntimeError("Input manifest changed during extraction")
    script_sha_end = sha256(script_path)
    if script_sha_start != script_sha_end:
        raise RuntimeError("Diagnostic script changed during extraction")
    nonzero_xml_offdiagonal_count = sum(any(abs(float(value)) > 1e-12 for value in values)
                                        for _, _, _, values in inertia_xml_audit)
    return {"schemaVersion": 1, "reader": "nimblephysics native SubjectOnDisk/readOpenSimFile; 0.10.52.1",
            "readerSourceCommit": manifest["reader"]["readerSourceCommit"],
            "readerSourceSha256": manifest["reader"]["readerSourceSha256"],
            "manifestSha256": manifest_sha, "scriptSha256AtStart": script_sha_start,
            "scriptSha256AtEnd": script_sha_end, "pythonVersion": sys.version.split()[0],
            "units": {"mass": "kg", "length": "m", "inertia": "kg m^2 and kg yd^2", "coordinates": "embedded OpenSim model world, Y up",
                      "conversion": "1 m = 1/0.9144 yd; multiply kg m^2 by 1/(0.9144^2) = 1.1959900463010802 for kg yd^2"},
            "nativeInertiaAudit": {"result": "not independently readable through pinned Python wheel API",
                                   "reason": "BodyNode.getMomentOfInertia has six scalar output arguments and returns None; BodyNodeProperties exposes no readable inertia member",
                                   "offDiagonalSignConvention": "not verified against native values; must not infer from diagonal-only entries",
                                   "xmlBodyPassEntriesInspected": len(inertia_xml_audit),
                                   "entriesWithNonzeroOffDiagonalTerms": nonzero_xml_offdiagonal_count},
            "parallelAxisAnalyticCheck": "passed: two equal point masses at +/-a on x yield Ix=0 and Iy=Iz=2ma^2",
            "interpretation": "MODEL ASSIGNMENTS and pose-dependent rigid-shape priors only; no human measurement/NFL population claim; no contact force fit",
            "grouping": {"footPointMassBodies": {side: list(names) for side, names in FEET.items()},
                         "torsoProxy": "all native skeleton bodies except the six listed foot bodies",
                         "rigidRotorApproximation": "isotropic I = trace(full grouped inertia tensor)/3; full tensor and eigenvalues retained"},
            "inputSubjects": subjects}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=MANIFEST_DEFAULT)
    parser.add_argument("--data-dir", type=Path, default=ROOT / "out/virtual-foot-data")
    parser.add_argument("--reader-dir", type=Path, default=ROOT / "out/virtual-foot-data/reader")
    parser.add_argument("--out", type=Path, default=ROOT / "out/biomechanics-rigid-priors.json")
    args = parser.parse_args()
    report = run(args)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"out": str(args.out), "source": report["manifestSha256"],
                      "scriptSha": report["scriptSha256AtStart"],
                      "subjects": len(report["inputSubjects"]),
                      "windows": sum(len(s["windows"]) for s in report["inputSubjects"]),
                      "selectedStances": sum(r["status"] == "selected" for s in report["inputSubjects"]
                                              for w in s["windows"] for r in w["representatives"])}))


if __name__ == "__main__":
    main()
