#!/usr/bin/env python3
"""Observable run geometry from BDB 2025 (2022). No latent fit/contact labels.

Usage: python3 scripts/data/run-game-reference.py DIR OUT [--weeks 1 2]
Tracking streams one play at a time. Only aggregates enter Git.
"""
import argparse
import csv
import hashlib
import itertools
import json
import math
from collections import defaultdict
from pathlib import Path

OL = {"C", "G", "T"}
LINE = {"DE", "DT", "NT", "OLB", "LB", "ILB", "MLB"}
TRUTH = {"1", "TRUE", "True"}


def xy(row):
    x, y = float(row["x"]), float(row["y"])
    return (120 - x, 53.333333333333336 - y) if row["playDirection"] == "left" else (x, y)


def is_run(p):
    try:
        if not math.isfinite(float(p["yardsGained"])): return False
    except (ValueError, KeyError): return False
    return (p["playNullifiedByPenalty"] != "Y" and p["isDropback"] == "FALSE"
            and p["qbKneel"] not in TRUTH and p["qbSpike"] not in TRUTH
            and p["rushLocationType"] not in {"NA", ""})


def stats(values):
    values = sorted(v for v in values if math.isfinite(v))
    if not values:
        return {"n": 0, "mean": None, "p10": None, "p50": None, "p90": None}
    q = lambda f: round(values[int(f * (len(values) - 1))], 3)
    return {"n": len(values), "mean": round(sum(values) / len(values), 3),
            "p10": q(.1), "p50": q(.5), "p90": q(.9)}


def front_proxy(snap, positions, offense, los, by):
    """Geometric presentation, not a coordinator's called front or post-snap fit."""
    defenders = [(positions.get(i), xy(r)[1] - by) for i, r in snap.items()
                 if r["club"] != offense and r["club"] != "football"
                 and positions.get(i) in LINE and -.25 <= xy(r)[0] - los <= 1.8
                 and abs(xy(r)[1] - by) < 6.5]
    core = [y for _, y in defenders if abs(y) < 3]
    guards = [xy(r)[1] - by for i, r in snap.items() if r["club"] == offense and positions.get(i) == "G"]
    tackles = [xy(r)[1] - by for i, r in snap.items() if r["club"] == offense and positions.get(i) == "T"]
    nose = any(abs(y) < .45 for y in core)
    bear = nose and len(guards) == 2 and all(any(g*y>0 and -.2 < abs(y)-abs(g) < .85 for y in core) for g in guards)
    tite = nose and len(tackles) == 2 and all(any(t*y>0 and .15 < abs(t)-abs(y) < .75 for y in core) for t in tackles)
    # A 3-tech and a 4i can overlap under different OL splits. Do not resolve
    # that uncertainty by pretending technique or the called fit is labeled.
    if bear and tite:
        return "Reduced_ambiguous_proxy"
    if bear:
        return "Bear_proxy"
    if tite:
        return "Tite_proxy"
    if nose and len(core) >= 3:
        return "Odd_or_reduced_proxy"
    attached = [xy(r)[1] - by for i, r in snap.items() if positions.get(i) == "TE" and r["club"] == offense
                and abs(xy(r)[0] - los) < 1.5 and abs(xy(r)[1] - by) < 5.8]
    three = [y for y in core if any(g * y > 0 and .2 < abs(y) - abs(g) < .95 for g in guards)]
    if len(attached) == 1 and len(three) == 1:
        return "Over_proxy" if attached[0] * three[0] > 0 else "Under_proxy"
    return "Other_or_ambiguous"


def measure(rows, play, positions, rusher):
    frames = defaultdict(dict)
    snaps = set()
    events = defaultdict(set)
    for row in rows:
        f = int(row["frameId"])
        frames[f][row["nflId"]] = row
        if row["event"] == "ball_snap" or row["frameType"] == "SNAP": snaps.add(f)
        if row["event"] not in {"", "NA"}: events[row["event"]].add(f)
    if len(snaps) != 1:
        return None, "missing_or_ambiguous_snap"
    sf = next(iter(snaps)); snap = frames[sf]
    balls = [r for r in snap.values() if r["club"] == "football"]
    if len(balls) != 1 or rusher not in snap:
        return None, "missing_ball_or_rusher"
    if sum(r["club"] != "football" for r in snap.values()) != 22:
        return None, "incomplete_snap"
    los, by = xy(balls[0]); offense = play["possessionTeam"]
    concept = play["pff_runConceptPrimary"] or "NA"
    result = {"concept": concept, "frontProxy": front_proxy(snap, positions, offense, los, by),
              "yards": float(play["yardsGained"])}
    ol = [i for i, r in snap.items() if r["club"] == offense and positions.get(i) in OL]
    if sf + 5 in frames:
        samples = [(xy(frames[sf+5][i]), xy(snap[i])) for i in ol if i in frames[sf+5]]
        if len(samples) == 5:
            result["olForwardAt0p5"] = sum(p[0]-s[0] for p, s in samples)/5
            result["olLateralAbsAt0p5"] = sum(abs(p[1]-s[1]) for p, s in samples)/5
    if sf - 10 in frames:
        ds = [i for i, r in snap.items() if r["club"] != offense and r["club"] != "football" and i in frames[sf-10]]
        if len(ds) == 11:
            moves = [abs(xy(snap[i])[1] - xy(frames[sf-10][i])[1]) for i in ds]
            result["defensePreSnapLateralMean"] = sum(moves)/11
            result["defensePreSnapMovingCount"] = sum(m > .5 for m in moves)
    handoffs = sorted(events["handoff"])
    if len(handoffs) == 1:
        result["handoffTime"] = (handoffs[0]-sf)/10
    for f in sorted(frames):
        if f < sf or rusher not in frames[f]: continue
        x, _ = xy(frames[f][rusher])
        if x >= los:
            result["timeToLos"] = (f-sf)/10
            break
    contacts = sorted(f for f in events["first_contact"] if f >= sf and rusher in frames[f])
    if contacts:
        f = contacts[0]
        result["firstContactTime"] = (f-sf)/10
        result["yardsBeforeContact"] = xy(frames[f][rusher])[0]-los
    # First same OL/opponent pair within 1.0 yd on two consecutive 10 Hz frames.
    # This is a sustained proximity proxy; it does not reveal hands or control.
    previous = set(); earliest = None
    for f in range(sf, min(max(frames), sf+40)+1):
        near = set(); frame = frames.get(f, {})
        for i in ol:
            if i not in frame: continue
            p = xy(frame[i])
            for j, row in frame.items():
                if row["club"] in {offense, "football"}: continue
                q = xy(row)
                if math.hypot(p[0]-q[0], p[1]-q[1]) <= 1.0: near.add((i,j))
        if near & previous and earliest is None: earliest = max(0,(f-1-sf)/10)
        previous = near
    if earliest is not None: result["firstSustainedOlProximity"] = earliest
    return result, None


def aggregate(samples):
    n = len(samples)
    if not n: return {"plays":0,"stuffPct":None,"pct10plus":None,"metrics":{}}
    keys = {k for r in samples for k in r} - {"concept", "frontProxy"}
    return {"plays": n, "stuffPct": round(100*sum(r["yards"] <= 0 for r in samples)/n,3),
            "pct10plus": round(100*sum(r["yards"] >= 10 for r in samples)/n,3),
            "metrics": {k: stats([r[k] for r in samples if k in r]) for k in sorted(keys)}}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("directory", type=Path); ap.add_argument("output", type=Path)
    ap.add_argument("--weeks", type=int, nargs="+", default=[1,2]); args = ap.parse_args()
    read = lambda name: list(csv.DictReader((args.directory/name).open()))
    plays = {(p["gameId"],p["playId"]): p for p in read("plays.csv") if is_run(p)}
    positions = {p["nflId"]: p["position"] for p in read("players.csv")}
    rushers = {}; label_counts = defaultdict(int)
    for p in read("player_play.csv"):
        k = (p["gameId"],p["playId"])
        if k not in plays: continue
        if p["hadRushAttempt"] in TRUTH: rushers.setdefault(k,[]).append(p["nflId"])
        label_counts["runPlayerRows"] += 1
        label_counts["runRowsWithBlockingOpponentId"] += p["blockedPlayerNFLId1"] not in {"NA",""}
    samples = []; excluded = defaultdict(int); sources = []
    for week in args.weeks:
        path = args.directory/f"tracking_week_{week}.csv"
        digest = hashlib.sha256()
        with path.open("rb") as f:
            for b in iter(lambda:f.read(1024*1024), b""):digest.update(b)
        sources.append({"file":path.name,"bytes":path.stat().st_size,"sha256":digest.hexdigest()})
        with path.open() as f:
            for key, rows in itertools.groupby(csv.DictReader(f),lambda r:(r["gameId"],r["playId"])):
                if key not in plays: continue
                if len(rushers.get(key,[])) != 1: excluded["missing_or_multiple_rushers"] += 1; continue
                result, error = measure(rows,plays[key],positions,rushers[key][0])
                if error: excluded[error] += 1
                else:samples.append(result)
        print(f"week {week}: {len(samples)} accepted run tracking plays",flush=True)
    for name in ["plays.csv","player_play.csv","players.csv"]:
        p=args.directory/name;sources.append({"file":name,"bytes":p.stat().st_size,"sha256":hashlib.sha256(p.read_bytes()).hexdigest()})
    by_concept = defaultdict(list); by_front = defaultdict(list); joint = defaultdict(list)
    for r in samples:
        by_concept[r["concept"]].append(r);by_front[r["frontProxy"]].append(r)
        joint[r["concept"]+" / "+r["frontProxy"]].append(r)
    output = {"schemaVersion":1,"source":"BDB 2025, 2022 regular season, selected tracking weeks",
              "trackingWeeks":args.weeks,"sources":sources,"cohort":"Non-nullified designed runs with one labeled rusher and 22 players plus ball at a unique snap frame; excludes kneels/spikes/dropbacks. Includes all runner positions.",
              "definitions":{"coordinates":"Offense attacks +x; left plays rotate both axes. LOS and lateral origin use ball at snap. Times use 10 Hz frame IDs.",
                             "frontProxy":"Heuristic near-LOS geometry at snap, not a true front call. Over/Under require one attached TE and one outside-guard shade. Overlapping Bear/4i windows become Reduced_ambiguous_proxy; mixed presentations stay ambiguous.",
                             "firstSustainedOlProximity":"Same OL/opponent within 1.0 yd for two consecutive 10 Hz frames, first four seconds only. Proximity, not observed hand contact or block success.",
                             "missing":"Each metric has its own n. LOS crossings and contact events are censored/missing on some runs; do not zero-impute.",
                             "blockingLabels":"Opponent labels are sparse on runs; no run assignments or combo releases are inferred from them."},
              "excluded":dict(excluded),"labelCoverageAllWeeks":dict(label_counts),"all":aggregate(samples),
              "byConcept":{k:aggregate(v) for k,v in sorted(by_concept.items())},
              "byFrontProxy":{k:aggregate(v) for k,v in sorted(by_front.items())},
              "byConceptAndFrontProxy":{k:aggregate(v) for k,v in sorted(joint.items())}}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(output,indent=2,allow_nan=False)+"\n")
    print(f"wrote {args.output} ({len(samples)} plays)")


if __name__ == "__main__":main()
