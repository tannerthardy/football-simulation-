#!/usr/bin/env python3
"""Position-only back paths; no engagement, intent or instantaneous-speed inference.

python3 -I scripts/mechanics/run_path_reference.py --nfl CACHE.jsonl.gz \
    --sim current=trace-seed7.json --out out/path-reference/report.json
python3 -I scripts/mechanics/run_path_reference.py --self-test

Reuses run_film_reference.nfl(), sim(), concepts and puller(), without editing
them. BDB2025 is 2022 weeks1–9; a supplied extract may cover fewer weeks.
Duo is pooled with inside zone by the shared SIM_CONCEPT mapping. Raw data
stays outside Git. The default converted NFL format omits original nflIds,
observed-sample masks and terminal-event provenance; see report limitations.
"""
import argparse
import collections
import gzip
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import platform
import random
import statistics
import subprocess
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("shared_run_film_reference", HERE / "run_film_reference.py")
REF = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(REF)
DT, LOW, HIGH, SPAN, PAIR = .1, -4., 3., .75, 1.5
TERMINAL = {"tackle", "out_of_bounds", "touchdown", "safety", "qb_slide"}
LIMITS = [
    "Positions, not body clearance, engagement, force, intent, gaze or grip. No velocity is differentiated from rounded positions.",
    "NFL release is BDB2025/2022 weeks1–9, not a full season; actual extract coverage needs its input manifest.",
    "Shared sim mapping pools Duo with inside zone; NFL MAN is retained separately, not relabeled Duo.",
    "Default NFL converter rounds XY to 0.01 yd, forward-fills some missing samples, drops nflIds and raw validity masks, and may infer end from the last frame. These cannot be recovered here; finite positions are not proof of observed samples.",
    "Actor identity is input-hash/play-id/actor-index unless the input actually supplies an original ID.",
    "Primary window is post-handoff, before reported first contact/fumble, with anchors at x in[-4,+3]yd. NFL first_contact and native contact/wrap are distinct source event definitions. Missing contact is counted, not certified contact-free; default NFL conversion also drops fumble events.",
    "A 30-degree path-direction change over two 0.75 yd path supports is a cut-or-bend geometry proxy, not a planted-foot cut, measured turn capacity or decision. Supports may extend outside the anchor band, within the reported-contact window. 45-degree sensitivity is also reported.",
    "Straight pattern means no supported 30-degree bend, a closed approach, at least 1.5 yd forward advance and net lateral displacement no greater than tan(30 degrees) times forward advance. Other no-large-bend paths are counted separately.",
    "No-cut requires a closed observed approach and at least two supported anchors; short/open prefixes are unknown, not straight. Contact-closed is not a known play ending.",
    "Passages are first observed eligible relative-x crossings from behind to ahead per fixed actor pair; an actor may retreat. Nonforward-carrier crossings and pairs already ahead at entry are counted separately. Side and center offset do not certify a block or successful evasion.",
    "Potential blockers are OL/TE/noncarrier RB. Near O–D context means center distance<1.5yd only. No double/release is inferred.",
    "Rule-puller rows overlap potential-blocker rows, using the shared motion rule on POWER/COUNTER/TRAP through 2.5 s or the available endpoint. This may use frames after passage/contact; it is not an installed assignment or a pre-passage cue. A short negative prefix is not proof of no future pull.",
    "Intervals are 90% game-cluster bootstrap intervals over the supplied, selected extract; they do not correct concept/roster mix, missingness, censoring or selection. No interval with fewer than two clusters.",
]


def digest(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def point(play, frame, actor):
    try:
        p = play["xy"][frame][actor]
        return tuple(p) if len(p) == 2 and all(isinstance(v, (int, float)) and math.isfinite(v) for v in p) else None
    except (IndexError, TypeError):
        return None


def distance(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def input_rows(kind, path, audit):
    """Metadata scan is joined in loader order; no replacement coordinate loader.
    Two streaming reads preserve original play IDs/phase metadata the shared
    loader does not return. No raw archive access or network operation.
    """
    sha = digest(path)
    if kind == "nfl":
        def raw_rows():
            with gzip.open(path, "rt") as f:
                for line in f:
                    yield json.loads(line)
        shared = iter(REF.nfl(path))
    else:
        raw_rows = lambda: iter(json.loads(Path(path).read_text()))
        shared = iter(REF.sim([str(path)]))
    seen_ids = set()
    for ordinal, raw in enumerate(raw_rows()):
        audit["input_rows"] += 1
        if kind == "nfl":
            if raw.get("source") != "nfl-bdb2025":
                raise ValueError(f"{path}: this study requires the BDB2025/2022 converted source")
            if raw.get("kind") != "run" or raw.get("carrier") is None:
                audit["shared_loader_excluded"] += 1
                continue
            if raw.get("dt") != DT:
                raise ValueError(f"{path}: NFL dt must be0.1")
        else:
            if raw.get("nullified"):
                audit["nullified"] += 1
                continue
            agents, frames = raw["setup"]["agents"], raw["frames"]
            if any(a.get("i", k) != k for k, a in enumerate(agents)):
                raise ValueError(f"{path}: actor indices do not match frame indexing")
            if any(abs(f["t"] - k * DT) > .011 for k, f in enumerate(frames)):
                raise ValueError(f"{path}: require time-zero/aligned10Hz frames throughout; no re-timing")
            if not any(f["c"] >= 0 and agents[f["c"]]["slot"] != "QB" for f in frames):
                audit["shared_loader_excluded"] += 1
                continue
        p = next(shared)
        identifier = str(raw.get("id", f"ordinal:{ordinal}"))
        if identifier in seen_ids:
            raise ValueError(f"{path}: duplicate play identity {identifier}")
        seen_ids.add(identifier)
        cluster = identifier.rsplit("-", 1)[0] if "-" in identifier else "unknown-game"
        events = raw["events"]
        if kind == "nfl":
            event_map = events
            known_end = bool(raw.get("end_observed", False))
        else:
            event_map = {e["type"]: e["t"] for e in reversed(events)}
            known_end = any(e["type"] in TERMINAL for e in events) or bool(raw["frames"] and raw["frames"][-1].get("ph") == "dead")
        actors = raw["players"] if kind == "nfl" else raw["setup"]["agents"]
        identities = [{"index": k, "original_id": a.get("nflId", a.get("id")), "slot": a.get("slot")}
                      for k, a in enumerate(actors)]
        audit["original_player_ids_unavailable"] += int(all(a["original_id"] is None for a in identities))
        audit["original_player_ids_incomplete"] += int(any(a["original_id"] is None for a in identities))
        audit["reported_contact_unavailable"] += int(p.get("contact") is None)
        p.update(id=identifier, source_hash=sha, cluster=f"{kind}:{sha}:{cluster}", actor_identity=identities,
                 known_end=known_end, fumble=event_map.get("fumble"),
                 original_concept=raw.get("setup", {}).get("concept", p["concept"]))
        yield p
    if next(shared, None) is not None:
        raise ValueError("Shared loader / metadata identity mismatch")


def measure(p):
    n, c = len(p["xy"]), p["carrier"]
    if p["players"][c].get("side") != "O" or p["players"][c].get("group") != "RB":
        return {"excluded": "carrier_not_offensive_RB_group"}
    handoff = p.get("handoff")
    if handoff is None or not math.isfinite(handoff) or handoff < 0:
        return {"excluded": "handoff_unavailable"}
    last_time = (n - 1) * DT
    if handoff > last_time:
        return {"excluded": "handoff_outside_observation"}
    start = max(0, math.ceil(handoff / DT - 1e-8))
    end = p.get("end")
    if not isinstance(end, (int, float)) or not math.isfinite(end) or end < handoff:
        return {"excluded": "invalid_endpoint"}
    cap, closure = min(end, last_time), "endpoint_unverified"
    if p.get("known_end") and end <= last_time + 1e-8:
        closure = "known_play_end"
    for name in ("contact", "fumble"):
        t = p.get(name)
        if t is not None and (not isinstance(t, (int, float)) or not math.isfinite(t)):
            return {"excluded": f"invalid_{name}_time"}
        if t is not None and t > last_time + 1e-8:
            return {"excluded": f"{name}_outside_observation"}
        if t is not None and t < handoff - 1e-8:
            return {"excluded": f"{name}_before_handoff"}
        if t is not None and handoff <= t <= cap + 1e-8:
            cap, closure = t - 1e-8, f"{name}_closed"
    stop = min(n - 1, math.floor(cap / DT + 1e-9))
    points = [point(p, k, c) for k in range(start, stop + 1)]
    if not points or any(q is None for q in points):
        return {"excluded": "missing_carrier_sample_in_window"}
    if not any(LOW <= q[0] <= HIGH for q in points):
        return {"excluded": "no_near_line_exposure"}
    if any(q[0] > HIGH for q in points):
        closure = "geometric_exit"
    complete = closure != "endpoint_unverified"

    angles = []
    for i in range(1, len(points) - 1):
        if not LOW <= points[i][0] <= HIGH:
            continue
        ends = []
        for direction in (-1, 1):
            length, j = 0., i
            while 0 <= j + direction < len(points) and abs(j - i) < 8 and length < SPAN:
                length += distance(points[j], points[j + direction]); j += direction
            ends.append(j if length >= SPAN else None)
        if None in ends:
            continue
        a, b = points[ends[0]], points[ends[1]]
        u = (points[i][0] - a[0], points[i][1] - a[1])
        v = (b[0] - points[i][0], b[1] - points[i][1])
        if min(math.hypot(*u), math.hypot(*v)) < .5:
            continue
        angles.append(abs(math.degrees(math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]))))
    max_angle = max(angles, default=None)
    cut = lambda threshold: True if max_angle is not None and max_angle >= threshold else False if complete and len(angles) >= 2 else None
    near = [q for q in points if LOW <= q[0] <= HIGH]
    dx, dy = near[-1][0] - near[0][0], near[-1][1] - near[0][1]
    straight = cut(30) is False and dx >= 1.5 and abs(dy) <= dx * math.tan(math.pi / 6)

    ol = [i for i, a in enumerate(p["players"]) if a["side"] == "O" and a["group"] == "OL"]
    centers = [point(p, 0, i)[1] for i in ol if point(p, 0, i) is not None]
    center = statistics.mean(centers) if len(centers) >= 3 else None
    defenders = [i for i, a in enumerate(p["players"]) if a["side"] == "D"]
    blockers = [i for i, a in enumerate(p["players"]) if a["side"] == "O" and a["group"] in ("OL", "TE", "RB") and i != c]
    pullers, short_pull = set(), 0
    if p["concept"] in ("POWER", "COUNTER", "TRAP"):
        for i in ol:
            if any(point(p, f, i) is None for f in range(min(n, 26))):
                continue
            if REF.puller(p["xy"], i, min(n - 1, 25)):
                pullers.add(i)
            elif n < 26:
                short_pull += 1
    passages, missing_pairs, left_censored = [], 0, 0
    for actor in blockers + defenders:
        initial_actor, initial_carrier = point(p, start, actor), point(p, start, c)
        left_censored += int(initial_actor is not None and initial_carrier is not None and initial_carrier[0] >= initial_actor[0])
        for f in range(start, stop):
            a, b = point(p, f, actor), point(p, f + 1, actor)
            ca, cb = point(p, f, c), point(p, f + 1, c)
            if None in (a, b, ca, cb):
                missing_pairs += 1; continue
            r0, r1 = ca[0] - a[0], cb[0] - b[0]
            if not r0 < 0 <= r1:
                continue
            u = -r0 / (r1 - r0)
            x = ca[0] + u * (cb[0] - ca[0])
            if not LOW <= x <= HIGH:
                continue
            ay, cy = a[1] + u * (b[1] - a[1]), ca[1] + u * (cb[1] - ca[1])
            offset = cy - ay
            side = "unknown" if center is None else "central_actor" if abs(ay - center) <= .5 else "aligned" if abs(offset) <= .25 else "outside" if offset * (ay - center) > 0 else "inside"
            opposite = defenders if actor in blockers else blockers
            close = []
            for j in opposite:
                ja, jb = point(p, f, j), point(p, f + 1, j)
                if ja is not None and jb is not None:
                    q = (ja[0] + u * (jb[0] - ja[0]), ja[1] + u * (jb[1] - ja[1]))
                    if distance((x, ay), q) < PAIR:
                        close.append(j)
            classes = ["potential_blocker" if actor in blockers else "defender"]
            if actor in pullers:
                classes.append("rule_puller")
            passages.append({"actor_index": actor, "classes": classes, "t": round((f + u) * DT, 6),
                             "actor_identity": p.get("actor_identity", [{}] * len(p["players"]))[actor],
                             "x": x, "lateral_offset": offset, "center_distance": abs(offset), "side": side,
                             "carrier_forward_step": cb[0] - ca[0], "near_opposite_indices": close})
            break  # first eligible passage per fixed actor, no nearest-ID switching
    return {"id": p["id"], "source_hash": p["source_hash"], "cluster": p["cluster"], "src": p["src"],
            "concept": p["concept"] or "UNKNOWN", "original_concept": p["original_concept"], "closure": closure,
            "carrier_identity": p.get("actor_identity", [{}] * len(p["players"]))[c],
            "contact_available": p.get("contact") is not None, "known_play_end": bool(p.get("known_end")),
            "cut30": cut(30), "cut45": cut(45), "straight": straight, "supported_anchors": len(angles),
            "max_path_angle": max_angle, "missing_pair_samples": missing_pairs, "left_censored_actor_pairs": left_censored,
            "short_negative_pullers": short_pull,
            "passages": passages}


def bootstrap(rows, statistic):
    groups = collections.defaultdict(list)
    for r in rows:
        groups[r["cluster"]].append(r)
    if len(groups) < 2:
        return None
    keys, rng, estimates = list(groups), random.Random(20261028), []
    for _ in range(200):
        trial = [r for key in rng.choices(keys, k=len(keys)) for r in groups[key]]
        value = statistic(trial)
        if value is not None:
            estimates.append(value)
    estimates.sort()
    return [estimates[int(.05 * (len(estimates) - 1))], estimates[int(.95 * (len(estimates) - 1))]] if estimates else None


def summaries(rows):
    result = []
    for src, concept in sorted({(r["src"], r["concept"]) for r in rows}):
        rs = [r for r in rows if (r["src"], r["concept"]) == (src, concept)]
        rate = lambda sample: statistics.mean(r["cut30"] for r in sample if r["cut30"] is not None) if any(r["cut30"] is not None for r in sample) else None
        known = [r for r in rs if r["cut30"] is not None]
        ncut = sum(r["cut30"] is True for r in rs)
        row = {"src": src, "concept": concept, "plays": len(rs), "clusters": len({r["cluster"] for r in rs}),
               "cut30": [ncut, len(known)], "cut30_rate_ci90": bootstrap(rs, rate),
               "cut45": [sum(r["cut45"] is True for r in rs), sum(r["cut45"] is not None for r in rs)],
               "straight": sum(r["straight"] for r in rs), "unknown30": len(rs) - len(known),
               "no_large_bend_other": sum(r["cut30"] is False and not r["straight"] for r in rs),
               "cut30_censor_bounds": [ncut / len(rs), (ncut + len(rs) - len(known)) / len(rs)],
               "closures": dict(collections.Counter(r["closure"] for r in rs)), "passages": []}
        row.update(missing_contact=sum(not r["contact_available"] for r in rs),
                   plays_with_missing_pairs=sum(r["missing_pair_samples"] > 0 for r in rs),
                   left_censored_actor_pairs=sum(r["left_censored_actor_pairs"] for r in rs),
                   short_negative_pullers=sum(r["short_negative_pullers"] for r in rs))
        for cls in ("potential_blocker", "rule_puller", "defender"):
            events = [e for r in rs for e in r["passages"] if cls in e["classes"]]
            med = lambda sample: statistics.median(v) if (v := [e["center_distance"] for r in sample for e in r["passages"] if cls in e["classes"]]) else None
            row["passages"].append({"class": cls, "encounters": len(events),
                "plays": sum(any(cls in e["classes"] for e in r["passages"]) for r in rs),
                "median_center_offset": med(rs), "ci90": bootstrap(rs, med) if events else None,
                "sides": dict(collections.Counter(e["side"] for e in events)),
                "carrier_nonforward_encounters": sum(e["carrier_forward_step"] <= 0 for e in events),
                "near_OD_pair": sum(bool(e["near_opposite_indices"]) for e in events)})
        result.append(row)
    return result


def table(report):
    lines = ["Position-only back paths (not intent/contact/engagement labels)",
             "source | concept | plays | cut30 n/classified [game-cluster90%] | cut45 n/classified | straight-pattern | no-large-bend-other | unknown30"]
    for r in report["summary"]:
        lines.append(f"{r['src']} | {r['concept']} | {r['plays']} | {r['cut30']} {r['cut30_rate_ci90']} | {r['cut45']} | {r['straight']} | {r['no_large_bend_other']} | {r['unknown30']}")
    lines += ["", "source | concept | class | plays/encounters | median center offset yd [90%] | sides | near O-D pair"]
    for r in report["summary"]:
        for e in r["passages"]:
            lines.append(f"{r['src']} | {r['concept']} | {e['class']} | {e['plays']}/{e['encounters']} | {e['median_center_offset']} {e['ci90']} | {e['sides']} | {e['near_OD_pair']}")
    lines += ["", "Input/exclusion audit: " + json.dumps(report["audit"], sort_keys=True), "", *LIMITS]
    return "\n".join(lines) + "\n"


def self_test():
    class Checks(unittest.TestCase):
        def play(self, coords=None, contact=None, end_known=True):
            xy = [[q, (0., -2.), (0., 0.), (0., 2.), (0., 4.)] for q in
                  (coords or [(i * .5 - 3, 3.) for i in range(15)])]
            return {"src": "nfl", "concept": "POWER", "original_concept": "POWER", "id": "game-play", "source_hash": "test",
                    "cluster": "test-game", "carrier": 0, "players": [{"side": "O", "group": "RB"}]
                    + [{"side": "O", "group": "OL"}] * 3 + [{"side": "D", "group": "LB"}],
                    "xy": xy, "handoff": 0., "contact": contact, "fumble": None, "end": (len(xy) - 1) * DT, "known_end": end_known}
        def test_straight_and_fixed_passage(self):
            r = measure(self.play()); self.assertFalse(r["cut30"]); self.assertTrue(r["straight"])
            self.assertEqual(len(r["passages"]), 4)
        def test_mirror_keeps_distances_and_inside_outside(self):
            p = self.play(); q = self.play(); q["xy"] = [[(x, -y) for x, y in row] for row in p["xy"]]
            a, b = measure(p), measure(q)
            self.assertEqual([(e["center_distance"], e["side"]) for e in a["passages"]], [(e["center_distance"], e["side"]) for e in b["passages"]])
        def test_cut_is_geometric(self):
            coords = [(-3 + .5 * k, 0.) for k in range(5)] + [(-1., .5 * k) for k in range(1, 9)]
            self.assertTrue(measure(self.play(coords))["cut45"])
        def test_short_prefix_not_straight(self):
            r = measure(self.play([(-3., 0.), (-2.8, 0.), (-2.6, 0.)], end_known=False))
            self.assertIsNone(r["cut30"]); self.assertFalse(r["straight"])
        def test_missing_carrier_not_filled(self):
            p = self.play(); p["xy"][3][0] = (None, None)
            self.assertEqual(measure(p)["excluded"], "missing_carrier_sample_in_window")
        def test_postcontact_turn_not_counted(self):
            coords = [(-3 + .5 * k, 0.) for k in range(5)] + [(-1., .5 * k) for k in range(1, 9)]
            self.assertIsNot(measure(self.play(coords, contact=.4))["cut30"], True)
        def test_puller_uses_common_rule(self):
            xy = [[(0., 0.), (-.5, i * .2)] for i in range(26)]
            self.assertTrue(REF.puller(xy, 1, 25))
        def test_open_endpoint_does_not_become_known_ending(self):
            p = self.play([(-3 + .1 * k, 0.) for k in range(25)], end_known=False)
            r = measure(p); self.assertEqual(r["closure"], "endpoint_unverified"); self.assertIsNone(r["cut30"])
        def test_no_interval_from_one_game(self):
            self.assertIsNone(bootstrap([measure(self.play())], lambda r: 0.))
        def test_distinct_sim_arms_are_not_pooled(self):
            a, b = measure(self.play()), measure(self.play())
            a["src"], b["src"] = "sim:base", "sim:head"
            self.assertEqual({r["src"] for r in summaries([a, b])}, {"sim:base", "sim:head"})
        def test_known_end_is_distinct_from_unverified_endpoint(self):
            coords = [(-3 + .1 * k, 0.) for k in range(25)]
            self.assertFalse(measure(self.play(coords, end_known=True))["cut30"])
            self.assertIsNone(measure(self.play(coords, end_known=False))["cut30"])
        def test_missing_actor_does_not_bridge_an_encounter(self):
            p = self.play(); p["xy"][6][1] = (None, None)
            r = measure(p)
            self.assertNotIn(1, [e["actor_index"] for e in r["passages"]])
            self.assertGreater(r["missing_pair_samples"], 0)
        def test_contact_beyond_trace_is_not_extrapolated(self):
            self.assertEqual(measure(self.play(contact=3.))["excluded"], "contact_outside_observation")
        def test_nfl_loader_metadata_does_not_invent_player_ids_or_end_labels(self):
            p = self.play()
            raw = {"id": "2022090800-10", "source": "nfl-bdb2025", "kind": "run", "carrier": 0,
                   "dt": .1, "players": p["players"], "cell": {"concept": "POWER"},
                   "xy": [[v for point_ in frame for v in point_] for frame in p["xy"]], "events": {"handoff": 0., "end": 1.4}}
            with tempfile.TemporaryDirectory() as td:
                path = Path(td) / "synthetic-loader-control.jsonl.gz"
                with gzip.open(path, "wt") as f:
                    f.write(json.dumps(raw) + "\n")
                audit = collections.Counter(); result = list(input_rows("nfl", path, audit))[0]
                self.assertEqual(result["id"], raw["id"])
                self.assertFalse(result["known_end"])
                self.assertTrue(all(a["original_id"] is None for a in result["actor_identity"]))
                self.assertEqual(audit["original_player_ids_unavailable"], 1)
        def test_loader_refuses_shifted_sim_time(self):
            with tempfile.TemporaryDirectory() as td:
                p = Path(td) / "bad.json"
                p.write_text(json.dumps([{"nullified": False, "setup": {"agents": [{"slot": "RB"}]}, "frames": [{"t": .05, "c": 0}]}]))
                with self.assertRaises(ValueError):
                    list(input_rows("sim", p, collections.Counter()))
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(Checks))
    return 0 if result.wasSuccessful() else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--nfl", type=Path)
    ap.add_argument("--sim", nargs="*", default=[], metavar="ARM=TRACE.json",
                    help="repeat a label to pool seeds for that arm; distinct arms are never pooled")
    ap.add_argument("--out", type=Path)
    ap.add_argument("--rows", type=Path, help="optional reduced per-play JSONL.gz, outside Git")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    if args.nfl is None:
        ap.error("--nfl must name an existing converted gzip JSONL, not a raw archive; no automatic download")
    sim_inputs = []
    for value in args.sim:
        if "=" not in value or not value.split("=", 1)[0]:
            ap.error("sim inputs require explicit ARM=TRACE.json labels")
        label, path = value.split("=", 1)
        sim_inputs.append(("sim", "sim:" + label, Path(path)))
    rows, inputs, audits, seen = [], [], {}, set()
    for kind, label, path in [("nfl", "nfl", args.nfl)] + sim_inputs:
        if not path.is_file():
            ap.error(f"missing existing input: {path}")
        sha = digest(path)
        if (label, sha) in seen:
            ap.error("duplicate input bytes would duplicate exposure")
        seen.add((label, sha)); audit = collections.Counter(); audits[f"{label}:{path}"] = audit
        inputs.append({"kind": kind, "arm": label, "path": str(path), "bytes": path.stat().st_size, "sha256": sha,
                       "producing_source": "needs existing owner manifest; not the analysis checkout commit"})
        for p in input_rows(kind, path, audit):
            if kind == "sim" and p["original_concept"] not in REF.SIM_CONCEPT:
                audit["sim_non_reference_run_concept"] += 1; continue
            p["src"] = label
            r = measure(p)
            if "excluded" in r:
                audit[r["excluded"]] += 1
            else:
                audit["measured_back_approaches"] += 1; rows.append(r)
    try:
        commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=HERE, text=True, stderr=subprocess.DEVNULL).strip()
    except (OSError, subprocess.CalledProcessError):
        commit = None
    report = {"schema": "position-only-back-path-v1", "analysis_source_commit": commit,
              "python_version": platform.python_version(),
              "script_sha256": digest(__file__), "shared_loader_sha256": digest(HERE / "run_film_reference.py"),
              "inputs": inputs, "audit": audits, "summary": summaries(rows), "limitations": LIMITS,
              "concept_mapping": REF.SIM_CONCEPT, "actual_extract_weeks": "not exposed by shared loader; supply existing input manifest"}
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True); args.out.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    if args.rows:
        args.rows.parent.mkdir(parents=True, exist_ok=True)
        with gzip.open(args.rows, "wt") as f:
            for r in rows:
                f.write(json.dumps(r, allow_nan=False) + "\n")
    print(table(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
