#!/usr/bin/env python3
"""Position-only double-to-climb study; no contact, force or release labels.

python3 -I scripts/mechanics/combo_displacement.py --nfl out/nfl-plays.jsonl.gz \
    --sim out/run/trace-seed7.json --out out/combo-reference/report.json

Reuses run_film_reference.nfl/sim, concept buckets and puller() unchanged.
One first sustained adjacent pair per DL, not every recontact. Tables include
failed/unresolved separations; displacement summaries condition on a detected
climb and must not be generalized to all installed combinations. The JSON
contains definitions, exclusions, input hashes, all rows and summary tables.
Only standard-library Python is required. Does not download or simulate.
"""
import argparse
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
import hashlib
import json
import math
from pathlib import Path
import statistics
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from run_film_reference import CONCEPTS, nfl, sim, puller  # noqa: E402

DT = 0.1
VERSION = "combo-proximity-v1"


@dataclass(frozen=True)
class Rules:
    near: float = 1.35
    far: float = 1.65
    sustain: int = 4       # four samples span 0.3 seconds
    confirm: int = 3       # three subsequent intervals, not three samples
    window: int = 25       # first pair must be acquired by 2.5 seconds
    head: float = 0.30
    shade: float = 0.90


def distance(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def alignment(snap, ol, defender, rules):
    """Infer five OL landmarks by snap lateral order, not missing roster slots."""
    j = min(range(5), key=lambda k: abs(snap[ol[k]][1] - snap[defender][1]))
    offset = snap[defender][1] - snap[ol[j]][1]
    if abs(offset) <= rules.head:
        return "head-up", f"over-{'C' if j == 2 else 'G' if j in (1, 3) else 'T'}"
    if abs(offset) > rules.shade:
        return "other", "outside-landmark-envelope"
    if j in (1, 3) and offset * (snap[ol[j]][1] - snap[ol[2]][1]) > 0:
        return "3-tech", "outside-guard"
    if j == 2 or j in (1, 3):
        return "shade", "center-shade" if j == 2 else "inside-guard"
    return "other", "tackle-shade-or-wide"


def measure(play, rules=Rules()):
    """Return rows and exclusion counts. No sim plan/contact fields are read."""
    excluded = Counter()
    xy, players = play["xy"], play["players"]
    end = play.get("end")
    if not xy or end is None or not math.isfinite(end) or end < 0:
        return [], Counter(invalid_end_or_empty=1)
    last = min(len(xy) - 1, math.floor((end + 1e-8) / DT))
    xy = xy[:last + 1]  # never admit a post-whistle frame or clamp a future read
    if any(len(f) != len(players) or any(not all(math.isfinite(v) for v in q) for q in f) for f in xy):
        return [], Counter(invalid_positions=1)
    ol = sorted((i for i, p in enumerate(players) if p["side"] == "O" and p["group"] == "OL"), key=lambda i: xy[0][i][1])
    if len(ol) != 5:
        return [], Counter(not_five_ol=1)
    snap = xy[0]
    # Inline/wing approximation, not a declaration of an installed TE assignment.
    inline = [i for i, p in enumerate(players) if p["side"] == "O" and p["group"] == "TE"
              and snap[i][0] >= -2.2 and min(abs(snap[i][1] - snap[t][1]) for t in (ol[0], ol[-1])) <= 2.3]
    line = sorted(ol + inline, key=lambda i: snap[i][1])
    # The reference's puller rule is defined for gap/pull concepts. Applying
    # it to stretch would instead exclude lateral zone work as if it pulled.
    pulling = {i for i in ol if puller(xy, i, min(last, 25))} if play["concept"] in ("POWER", "COUNTER", "TRAP") else set()
    pairs = [p for p in zip(line, line[1:]) if not set(p) & pulling]
    excluded["pulling_ol"] += len(pulling)
    defenders = [i for i, p in enumerate(players) if p["side"] == "D" and p["group"] == "DL" and -0.5 <= snap[i][0] <= 2]
    backers = [i for i, p in enumerate(players) if p["side"] == "D" and p["group"] == "LB" and 2 <= snap[i][0] <= 8]
    rows = []
    for d in defenders:
        first = None
        for start in range(1, min(last - rules.sustain + 2, rules.window + 1)):
            stop = start + rules.sustain
            good = [pair for pair in pairs if all(all(distance(xy[f][b], xy[f][d]) <= rules.near for b in pair) for f in range(start, stop))]
            # A three-man cluster is ambiguous, not three independent doubles.
            near_others = {b for b in line if any(distance(xy[f][b], xy[f][d]) <= rules.near for f in range(start, stop))}
            if len(good) == 1 and near_others == set(good[0]):
                first = start, good[0]
                break
        if first is None:
            excluded["dl_without_unambiguous_sustained_pair"] += 1
            continue
        start, pair = first
        a, b = pair
        stop = start + rules.sustain - 1
        while stop + 1 <= last and all(distance(xy[stop + 1][i], xy[stop + 1][d]) <= rules.near for i in pair):
            stop += 1
        depart = stop + 1
        row = {"src": play["src"], "concept": play["concept"], "dl": d, "blockers": list(pair),
               "alignment": alignment(snap, ol, d, rules)[0], "alignment_detail": alignment(snap, ol, d, rules)[1],
               "start_s": round(start * DT, 2), "both_near_until_s": round(stop * DT, 2),
               "duration_s": round((stop - start) * DT, 2), "status": "no-separation-before-end"}
        # Record all episodes, even those that end with a lost keeper / no climb.
        if depart <= last:
            row["status"] = "separation-unresolved"
            if depart + rules.confirm > last:
                row["status"] = "separation-right-censored"
            else:
                q = depart + rules.confirm
                choices = []
                for climber, keeper in ((a, b), (b, a)):
                    separated = distance(xy[q][climber], xy[q][d]) >= rules.far and distance(xy[q][climber], xy[q][d]) - distance(xy[stop][climber], xy[stop][d]) >= 0.35
                    retained = all(distance(xy[f][keeper], xy[f][d]) <= rules.near for f in range(depart, q + 1))
                    # A retreat, sideways runoff or a DL simply fleeing both OL
                    # is not silently called a climb. Require movement toward
                    # a fixed, locally present backer reference and upfield.
                    targets = [lb for lb in backers if abs(xy[stop][lb][1] - xy[stop][climber][1]) <= 5]
                    approach = any(distance(xy[q][climber], xy[stop][lb]) <= distance(xy[stop][climber], xy[stop][lb]) - 0.2 for lb in targets)
                    up = xy[q][climber][0] - xy[stop][climber][0] >= 0.2
                    if separated and retained and up and approach:
                        choices.append((climber, keeper))
                if len(choices) == 1:
                    climber, keeper = choices[0]
                    row.update(status="climb-proxy", climber=climber, keeper=keeper, separation_s=round(depart * DT, 2),
                               climber_speed_pre_separation=distance(xy[depart][climber], xy[depart - 3][climber]) / (3 * DT))
                elif not any(all(distance(xy[f][i], xy[f][d]) <= rules.near for f in range(depart, q + 1)) for i in pair):
                    row["status"] = "separation-no-retained-keeper"
        delta = (xy[stop][d][0] - xy[start][d][0], xy[stop][d][1] - xy[start][d][1])
        duration = (stop - start) * DT
        row.update(dl_net_yards=math.hypot(*delta), dl_upfield_yards=delta[0], dl_lateral_yards=abs(delta[1]),
                   dl_net_rate=math.hypot(*delta) / duration,
                   dl_mean_speed=sum(distance(xy[f][d], xy[f - 1][d]) for f in range(start + 1, stop + 1)) / duration,
                   dl_snap_to_last_double_yards=distance(xy[stop][d], xy[0][d]))
        rows.append(row)
    return rows, excluded


def summaries(rows):
    groups = defaultdict(list)
    for r in rows:
        groups[r["src"], r["concept"], r["alignment"]].append(r)
    out = []
    metrics = ["duration_s", "dl_net_yards", "dl_upfield_yards", "dl_lateral_yards", "dl_net_rate", "dl_mean_speed", "dl_snap_to_last_double_yards", "climber_speed_pre_separation"]
    for (src, concept, align), rr in sorted(groups.items()):
        climbs = [r for r in rr if r["status"] == "climb-proxy"]
        values = {k: {"n": len(v), "median": statistics.median(v) if v else None,
                      "p25": percentile(v, .25), "p75": percentile(v, .75)}
                  for k in metrics for v in [[r[k] for r in climbs]]}
        out.append({"src": src, "concept": concept, "alignment": align, "episodes": len(rr),
                    "plays": len({r["play_key"] for r in rr}), "statuses": dict(Counter(r["status"] for r in rr)), "climbs": len(climbs), "climb_metrics": values})
    return out


def percentile(v, fraction):
    if not v:
        return None
    v = sorted(v)
    x = (len(v) - 1) * fraction
    lo = math.floor(x)
    return v[lo] + (v[math.ceil(x)] - v[lo]) * (x - lo)


def digest(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def input_manifest(parser, inputs, output):
    """Preflight before reading cohorts or writing anything; keep caches intact."""
    protected = [*inputs, Path(__file__), Path(__file__).with_name("run_film_reference.py")]
    resolved_output = output.resolve()
    for path in protected:
        if resolved_output == path.resolve() or (output.exists() and path.exists() and output.samefile(path)):
            parser.error("--out must not overwrite an input or operator")
    manifests, seen = [], set()
    for path in inputs:
        sha256 = digest(path)
        if sha256 in seen:
            parser.error("duplicate input digest; refusing to count a cohort twice")
        seen.add(sha256)
        manifests.append({"path": str(path), "sha256": sha256})
    return manifests


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--nfl", type=Path, required=True)
    parser.add_argument("--sim", type=Path, nargs="*", default=[])
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--near", type=float, default=1.35, help="sensitivity only; report separately, do not select a best NFL/sim agreement")
    args = parser.parse_args()
    if not 0.5 < args.near < 1.65:
        parser.error("near must be between 0.5 and the 1.65-yard separation envelope")
    rules = Rules(near=args.near)
    rows, counters = [], defaultdict(Counter)
    inputs = input_manifest(parser, [args.nfl, *args.sim], args.out)
    streams = [(str(args.nfl), nfl(args.nfl))] + [(str(p), sim([p])) for p in args.sim]
    for label, stream in streams:
        for ordinal, play in enumerate(stream):
            counters[label]["loaded_run_plays"] += 1
            if play["concept"] not in CONCEPTS:
                counters[label]["outside_shared_concept_buckets"] += 1
                continue
            result, excluded = measure(play, rules)
            counters[label].update(excluded)
            for r in result:
                r["play_key"] = f"{label}#run-{ordinal}"
            rows.extend(result)
    report = {"version": VERSION, "rules": asdict(rules), "inputs": inputs,
              "loader_sha256": digest(Path(__file__).with_name("run_film_reference.py")),
              "script_sha256": digest(Path(__file__)), "counters": {k: dict(v) for k, v in counters.items()},
              "limitations": ["Proximity is not contact/load, installed release or successful protection.",
                  "Five OL inferred by snap lateral order; head-up <=0.30 yd, shades <=0.90 yd; 3-tech is outside the guard. Not coaching/PFF technique labels.",
                  "Near pair starts by 2.5 s and lasts at least 0.3 s; no triple cluster, pulling OL excluded with shared rule. OL+inline-TE included.",
                  "Climb requires separated climber, near keeper, forward progress and progress toward an existing LB position over 0.3 s; conservative proxy may miss valid fits.",
                  "Climber speed uses preceding 0.3 s ending at first separation, not a future speed or native release.",
                  "Input loader normalizes to 10 Hz; NFL converter may carry missing samples forward. No claim of uninterrupted measured positions.",
                  "Whistle/end clamps every interval. An end may itself be last-recorded fallback from shared loader.",
                  "NFL roster OLB is LB, sim EDGE is DL. Cohort, call mix, source law and repeated seeds must be qualified externally.",
                  "Shared concepts pool Duo/split-zone with IZ, wide-zone/toss with OZ. No independent Duo result.",
                  "play_key is filtered loader ordinal within input hash, not an NFL game/play ID. Multiple episodes in a play are correlated."],
              "summary": summaries(rows), "rows": rows}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2) + "\n")
    print("| Source | Concept | Alignment | Episodes | Climbs | DL net yd | Upfield yd | Lateral yd | Duration s | DL net yd/s | Climber yd/s |")
    print("|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|")
    for s in report["summary"]:
        m = s["climb_metrics"]
        fmt = lambda k: "—" if m[k]["median"] is None else f'{m[k]["median"]:.2f}'
        print(f'| {s["src"]} | {s["concept"]} | {s["alignment"]} | {s["episodes"]} | {s["climbs"]} | ' + " | ".join(fmt(k) for k in ("dl_net_yards", "dl_upfield_yards", "dl_lateral_yards", "duration_s", "dl_net_rate", "climber_speed_pre_separation")) + " |")
    print(f"\n{len(rows)} first-pair episodes; {sum(r['status'] == 'climb-proxy' for r in rows)} climb proxies. Other episodes retained in JSON. Output: {args.out}")


if __name__ == "__main__":
    main()
