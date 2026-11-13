#!/usr/bin/env python3
"""Compact native QB-cue comparison; never runs or modifies the engine.

python scripts/diag/qb-cue-compare.py BEFORE.json.gz AFTER.json.gz OUTPUT.json
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
from statistics import mean


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read(path):
    with gzip.open(path, "rt") as stream:
        return json.load(stream)


def signature(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def key(row):
    return (row["t"], row["observer"])


def pin(path, panel):
    return {"path": str(path), "sha256": sha(path), **{field: panel[field] for field in
        ("sourceSha256", "toolSha256", "sourceVersionToolSha256", "inputSha256", "inspectionSeconds")}}


STAT_FIELDS = ("attempted", "completed", "sacked", "scramble", "dropped", "throwaway",
               "pressured", "brokenTackles", "missedTackles", "interceptedBy", "qbRead",
               "timeToThrow", "target", "airYards", "separation", "yac")


def endpoint(row):
    result = row["result"]
    return {"natural": result is not None, "censored": row["end"]["censored"],
            "inspectionEndT": row["end"]["t"], "outcome": row["end"]["outcome"],
            "yards": result["yards"] if result else None,
            "stats": {name: row["end"]["stats"][name] for name in STAT_FIELDS if name in row["end"]["stats"]},
            "events": [{name: event[name] for name in ("t", "type", "a", "b", "pos", "note") if name in event}
                       for event in row["events"] if event["type"] in
                       ("throw", "catch", "interception", "scramble", "pressure", "sack", "tackle", "slide")]}


def decision_ref(row, decision):
    reads = [row["qbReadEvents"][ordinal] for ordinal in decision["qbReadOrdinals"]]
    # Only a small first-change witness; the full picture arrays remain in raw.
    return {"ordinal": decision["ordinal"], "t": decision["t"], "observer": decision["observer"],
            "slot": decision["slot"], "zone": decision["zone"], "style": decision["style"],
            "beforeTarget": decision["beforeTarget"], "afterTarget": decision["afterTarget"],
            "beforeBody": decision["beforeBody"], "returnedCommand": decision["returnedCommand"],
            "deliveredIntent": decision["deliveredIntent"], "followingSolveCaptured": decision["followingSolveCaptured"],
            "hiddenDiagnosticQbEyes": decision["hiddenDiagnostic"]["qbEyes"],
            "actualQB": decision["hiddenDiagnostic"]["actualQB"],
            "qbReadOrdinals": decision["qbReadOrdinals"],
            "firstConsumedQB": reads[0]["consumedQB"] if reads else None,
            "firstQBObserverInputs": reads[0]["observerInputs"] if reads else None,
            "consumedQBInputs": [{"ordinal": ordinal, "delayScale": picture["delayScale"],
                                   "observerInputs": picture["observerInputs"], "consumedQB": picture["consumedQB"]}
                                  for ordinal, picture in zip(decision["qbReadOrdinals"], reads)],
            "consumedReceiverOrdinals": list(range(len(decision["consumedReceivers"]))) }


def first_body_difference(before, after):
    candidates = {tick["tickStart"]: (ordinal, tick) for ordinal, tick in enumerate(after["ticks"])}
    for ordinal, tick in enumerate(before["ticks"]):
        paired = candidates.get(tick["tickStart"])
        if not paired:
            continue
        after_ordinal, other = paired
        changed = [idx for idx, (a, b) in enumerate(zip(tick["bodies"], other["bodies"])) if a != b]
        if changed:
            return {"beforeTickOrdinal": ordinal, "afterTickOrdinal": after_ordinal,
                    "tickStart": tick["tickStart"], "beforeTickEnd": tick["tickEnd"], "afterTickEnd": other["tickEnd"],
                    "followingSolveCaptured": [tick["followingSolveCaptured"], other["followingSolveCaptured"]],
                    "changedBodies": [{"idx": idx, "slot": before["players"][idx]["slot"],
                                       "before": tick["bodies"][idx], "after": other["bodies"][idx]} for idx in changed]}
    return None


def pair(before, after):
    prior = {key(row): row for row in before["decisions"]}
    current = {key(row): row for row in after["decisions"]}
    common = sorted(prior.keys() & current.keys())
    changed = [k for k in common if prior[k]["returnedCommand"] != current[k]["returnedCommand"]]
    # Global event timestamps are actual engine events; no event-geometry interpolation.
    be, ae = endpoint(before), endpoint(after)
    both = be["natural"] and ae["natural"]
    first = changed[0] if changed else None
    first_velocity = next((k for k in common if prior[k]["returnedCommand"].get("vel") !=
                           current[k]["returnedCommand"].get("vel")), None)
    return {"id": before["id"], "input": before["input"],
            "initialMatches": {field: before[field] == after[field] for field in
                               ("initialSignature", "initialPhysicalSha256", "profileSha256", "initialCallsSha256")},
            "before": be, "after": ae,
            "pairedNaturalYardsDelta": round(ae["yards"] - be["yards"], 8) if both else None,
            "resultExactMatch": before["result"] == after["result"],
            "endpointSummaryChanged": be != ae,
            "outcomeOrStatsChanged": any(be[field] != ae[field] for field in ("natural", "outcome", "yards", "stats")),
            "commonZoneUpdateKeys": len(common), "changedReturnedCommandKeys": len(changed),
            "beforeOnlyZoneUpdateKeys": len(prior.keys() - current.keys()),
            "afterOnlyZoneUpdateKeys": len(current.keys() - prior.keys()),
            "firstChangedCommand": {"before": decision_ref(before, prior[first]),
                                    "after": decision_ref(after, current[first]),
                                    "sameBeforeBody": prior[first]["beforeBody"] == current[first]["beforeBody"],
                                    "sameReceiverPictures": prior[first]["consumedReceivers"] == current[first]["consumedReceivers"]}
                                   if first else None,
            "firstReturnedVelocityDifference": {"beforeDecisionOrdinal": prior[first_velocity]["ordinal"],
                                                "afterDecisionOrdinal": current[first_velocity]["ordinal"],
                                                "t": first_velocity[0], "observer": first_velocity[1],
                                                "slot": prior[first_velocity]["slot"],
                                                "beforeVelocity": prior[first_velocity]["returnedCommand"].get("vel"),
                                                "afterVelocity": current[first_velocity]["returnedCommand"].get("vel")}
                                               if first_velocity else None,
            "firstNativeBodyDifference": first_body_difference(before, after),
            "beforeSummary": before["summary"], "afterSummary": after["summary"]}


def event_geometry(row):
    samples = []
    for event in row["events"]:
        if event["type"] not in ("throw", "catch"):
            continue
        target = event.get("b") if event["type"] == "throw" else event.get("a")
        if target is None:
            continue
        tick_ordinal, tick = min(enumerate(row["ticks"]), key=lambda item: abs(item[1]["tickStart"] - event["t"]))
        body = tick["bodies"][target]
        nearest = sorted((( (defender[0]-body[0])**2 + (defender[1]-body[1])**2 )**.5,
                          idx, defender) for idx, defender in enumerate(tick["bodies"])
                         if row["players"][idx]["team"] == "D")[:3]
        samples.append({"event": event, "nativeTickOrdinal": tick_ordinal, "tickStart": tick["tickStart"],
                        "tickEnd": tick["tickEnd"], "followingSolveCaptured": tick["followingSolveCaptured"],
                        "targetSlot": row["players"][target]["slot"], "postTickTargetBody": body,
                        "nearestPostTickDefenders": [{"distance": distance, "idx": idx,
                            "slot": row["players"][idx]["slot"], "body": defender} for distance, idx, defender in nearest]})
    return samples


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("before", type=Path)
    parser.add_argument("after", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    before, after = read(args.before), read(args.after)
    assert before["schema"] == after["schema"] == "qb-cue-review-v1"
    assert before["toolSha256"] == after["toolSha256"], "Use the same neutral observer tool."
    assert before["inputSha256"] == after["inputSha256"], "Fixed input cohort changed."
    assert before["inputs"] == after["inputs"]
    brow = {row["id"]: row for row in before["rows"]}
    arow = {row["id"]: row for row in after["rows"]}
    assert brow.keys() == arow.keys()
    pairs = [pair(brow[row["id"]], row) for row in after["rows"]]
    for p in pairs:
        assert all(p["initialMatches"].values()), p["id"]
    control_fields = ("initial", "endpoint", "result", "nextRng")
    for panel in (before, after):
        assert all(all(control[field] for field in control_fields) for control in panel["controls"])
    natural = [p for p in pairs if p["pairedNaturalYardsDelta"] is not None]
    groups = {}
    for field in ("coverage", "concept"):
        groups[field] = {}
        for value in sorted({p["input"][field] for p in pairs}):
            cohort = [p for p in natural if p["input"][field] == value]
            groups[field][value] = {"pairedNatural": len(cohort),
                "beforeMeanYards": mean(p["before"]["yards"] for p in cohort) if cohort else None,
                "afterMeanYards": mean(p["after"]["yards"] for p in cohort) if cohort else None}
    adverse_ids = ["QBCUE-R1-gun_doubles_11-four_verts-cover4-S3",
                   "QBCUE-R1-gun_doubles_11-four_verts-cover3_match-S3"]
    post_hoc_ids = [p["id"] for p in natural if abs(p["pairedNaturalYardsDelta"]) >= 2 and p["id"] not in adverse_ids]
    report = {"schema": "qb-cue-compact-comparison-v1", "comparisonToolSha256": sha(__file__),
        "beforePin": pin(args.before, before), "afterPin": pin(args.after, after),
        "scope": "All24 fixed passes retained; 24 observer/plain controls per phase. This is not a league or NFL measurement.",
        "counts": {"pairs": len(pairs), "initialMatches": {field: sum(p["initialMatches"][field] for p in pairs)
                       for field in pairs[0]["initialMatches"]},
            "beforeNeutralControls": {field: sum(c[field] for c in before["controls"]) for field in control_fields},
            "afterNeutralControls": {field: sum(c[field] for c in after["controls"]) for field in control_fields},
            "beforeNatural": sum(p["before"]["natural"] for p in pairs), "afterNatural": sum(p["after"]["natural"] for p in pairs),
            "pairedNatural": len(natural), "pairedNaturalBeforeMeanYards": mean(p["before"]["yards"] for p in natural),
            "pairedNaturalAfterMeanYards": mean(p["after"]["yards"] for p in natural)},
        "censoredBeforeIds": [p["id"] for p in pairs if p["before"]["censored"]],
        "censoredAfterIds": [p["id"] for p in pairs if p["after"]["censored"]],
        "negativeOffenseYardsIds": [p["id"] for p in natural if p["pairedNaturalYardsDelta"] < 0],
        "positiveOffenseYardsIds": [p["id"] for p in natural if p["pairedNaturalYardsDelta"] > 0],
        "groupMeans": groups, "beforeSummary": before["summary"], "afterSummary": after["summary"],
        "observedZoneStyles": {"before": sorted({d["style"] for r in brow.values() for d in r["decisions"]}),
                              "after": sorted({d["style"] for r in arow.values() for d in r["decisions"]})},
        "adverseGeometry": [{"id": ident, "before": event_geometry(brow[ident]), "after": event_geometry(arow[ident])}
                            for ident in adverse_ids],
        "postHocChangedGeometry": {"selection": "Additional paired-natural IDs with absolute yards delta at least2; diagnostic only, never removes any of the24 pairs.",
                                   "rows": [{"id": ident, "before": event_geometry(brow[ident]), "after": event_geometry(arow[ident])}
                                            for ident in post_hoc_ids]},
        "limits": [
            "Higher or lower offensive yards is not a realism verdict. All positive and negative paired-natural gains are listed.",
            "The before and after censored IDs may differ. Means use only the same paired-natural IDs; no live endpoint gets final yards.",
            "Only ZoneCoverage commands and actual consumed sim.see inputs are tapped. Other controller decisions and the private cue-helper return are not recorded.",
            "An existing QB read may already exist in a controller; the candidate adds a directional-evidence sample rather than proving only one total QB read.",
            "Private qbEyes and true QB body are diagnostic fields, not allowed cue inputs. Association is not proof of hidden-ID use.",
            "Event geometry is native post-tick state at the saved tickEnd, not exact pre-event geometry; the saved event position and followingSolve flag remain explicit.",
            "First command/body differences establish the earliest recorded intervention, not sole causation of later random contact/throw outcomes.",
            "All24 initial signatures/profiles/calls match. Source includes both OL cutoff and QB cue changes; isolated outcome attribution is not claimed.",
            "All ordinary zone samples in this panel use match style. Native spotUnderneath applicability is outside this panel.",
        ], "pairs": pairs}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"path": str(args.output), "sha256": sha(args.output), "counts": report["counts"],
                      "beforeSource": before["sourceSha256"], "afterSource": after["sourceSha256"]}))


if __name__ == "__main__":
    main()
