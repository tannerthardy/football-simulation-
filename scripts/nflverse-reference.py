"""Reproducible NFL context, outcome and anonymous body-profile references.

python3 scripts/nflverse-reference.py --download --out out/nflverse-reference.json
Raw public CSVs stay in data/raw/nflverse/ (ignored). Requires only Python's
standard library. This measures references; it changes no engine parameters.
"""
import argparse
import csv
import gzip
import hashlib
import json
import math
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

RELEASE_ROOT = "https://github.com/nflverse/nflverse-data/releases/download"
ATTRIBUTION = "FTN Data via nflverse; charting and derived charting aggregates: CC-BY-SA-4.0"
POSITIONS = {"QB": "QB", "RB": "RB", "FB": "RB", "WR": "WR", "TE": "TE",
             "OL": "OL", "C": "OL", "G": "OL", "T": "OL", "OT": "OL", "OG": "OL",
             "DL": "DL", "DE": "DL", "DT": "DL", "NT": "DL", "LB": "LB",
             "ILB": "LB", "OLB": "LB", "MLB": "LB", "DB": "DB", "CB": "DB", "S": "DB",
             "FS": "DB", "SS": "DB"}


def number(value):
    try:
        x = float(value)
        return x if math.isfinite(x) else None
    except (TypeError, ValueError):
        return None


def flag(value):
    if str(value).lower() in ("1", "1.0", "true"):
        return True
    if str(value).lower() in ("0", "0.0", "false"):
        return False
    return None


def rate(n, d):
    return {"count": n, "denominator": d, "percent": 100 * n / d if d else None}


def distribution(values):
    xs = sorted(x for x in values if x is not None)
    def q(p):
        if not xs:
            return None
        index = p * (len(xs) - 1)
        a = int(index)
        return xs[a] + (xs[min(a + 1, len(xs) - 1)] - xs[a]) * (index - a)
    return {"n": len(xs), "mean": sum(xs) / len(xs) if xs else None,
            "p10": q(.1), "p50": q(.5), "p90": q(.9)}


def read_csv(path):
    opener = gzip.open if str(path).endswith(".gz") else open
    with opener(path, "rt", encoding="utf-8-sig", newline="") as f:
        yield from csv.DictReader(f)


def play_key(row, chart=False):
    raw = number(row.get("nflverse_play_id" if chart else "play_id"))
    if raw is None or raw != int(raw):
        raise ValueError("Play id must be a numeric integer")
    return row["nflverse_game_id" if chart else "game_id"], int(raw)


def classify(row):
    """REG live scrimmage only. A scramble is a dropback, never designed run."""
    if row["season_type"] != "REG" or row["play_type"] not in ("pass", "run"):
        return None
    if flag(row.get("qb_kneel")) or flag(row.get("qb_spike")):
        return None
    if flag(row.get("qb_dropback")) or flag(row.get("pass_attempt")):
        return "dropback"
    if flag(row.get("rush_attempt")) and not flag(row.get("qb_scramble")):
        return "designedRun"
    return None


def is_throw(row):
    # nflfastR pass_attempt includes sacks. Final recorded throw outcomes
    # avoid counting those as attempts at completion or interception.
    return not flag(row.get("sack")) and any(flag(row.get(k)) for k in
                                           ("complete_pass", "incomplete_pass", "interception"))


def context(row):
    d = number(row.get("ydstogo"))
    field = number(row.get("yardline_100"))
    score = number(row.get("score_differential"))
    seconds = number(row.get("game_seconds_remaining"))
    return {"down": int(number(row.get("down")) or 0),
            "distance": "unknown" if d is None else "1-3" if d <= 3 else "4-7" if d <= 7 else "8+",
            "field": "unknown" if field is None else "redZone" if field <= 20 else "ownTerritory" if field > 50 else "plusTerritory",
            "score": "unknown" if score is None else "trailing9+" if score <= -9 else "leading9+" if score >= 9 else "within8",
            "period": "last10min" if seconds is not None and seconds <= 600 else "earlier"}


def outcomes(rows):
    db = [r for r in rows if classify(r) == "dropback"]
    runs = [r for r in rows if classify(r) == "designedRun"]
    throws = [r for r in db if is_throw(r)]
    completions = [r for r in throws if flag(r.get("complete_pass"))]
    def yards(r):
        return number(r.get("yards_gained"))
    def success(r):
        down, distance, gained = number(r.get("down")), number(r.get("ydstogo")), yards(r)
        if down not in (1, 2, 3, 4) or distance is None or gained is None:
            return None
        return gained >= distance * (.4 if down == 1 else .6 if down == 2 else 1)
    def subset(rs, threshold):
        known = [r for r in rs if success(r) is not None]
        epa = [number(r.get("epa")) for r in rs]
        epa = [e for e in epa if e is not None]
        return {"plays": len(rs), "yards": distribution(yards(r) for r in rs),
                "explosiveThresholdYd": threshold,
                "explosive": rate(sum(yards(r) is not None and yards(r) >= threshold for r in rs), len(rs)),
                "success4060100": rate(sum(success(r) for r in known), len(known)),
                "positiveEPA": rate(sum(e > 0 for e in epa), len(epa))}
    return {"plays": len(rows), "dropback": subset(db, 20), "designedRun": subset(runs, 10),
            "dropbackShare": rate(len(db), len(rows)), "throws": len(throws),
            "completion": rate(len(completions), len(throws)),
            "interception": rate(sum(bool(flag(r.get("interception"))) for r in throws), len(throws)),
            "sackPerDropback": rate(sum(bool(flag(r.get("sack"))) for r in db), len(db)),
            "scramblePerDropback": rate(sum(bool(flag(r.get("qb_scramble"))) for r in db), len(db)),
            "qbHitAnnotationPerDropback": rate(sum(bool(flag(r.get("qb_hit"))) for r in db), len(db)),
            "twentyYardCompletionPerThrow": rate(sum((yards(r) or 0) >= 20 for r in completions), len(throws)),
            "stuffPerDesignedRun": rate(sum(yards(r) is not None and yards(r) <= 0 for r in runs), len(runs)),
            "completionYards": distribution(yards(r) for r in completions),
            "completedYAC": distribution(number(r.get("yards_after_catch")) for r in completions),
            "throwAirYards": distribution(number(r.get("air_yards")) for r in throws)}


def charting_reference(rows, charts):
    indexed = {}
    for r in charts:
        key = play_key(r, True)
        if key in indexed:
            raise ValueError(f"Duplicate FTN play id: {key}")
        indexed[key] = r
    throws = [r for r in rows if is_throw(r)]
    matched = [(r, indexed[play_key(r)]) for r in throws if play_key(r) in indexed]
    incomplete = [(r, c) for r, c in matched if flag(r.get("incomplete_pass")) and not flag(r.get("interception"))]
    counts = Counter()
    for r, c in matched:
        # Final result has priority over overlapping charting annotations.
        outcome = "interception" if flag(r.get("interception")) else "completion" if flag(r.get("complete_pass")) else "drop" if flag(c.get("is_drop")) else "throwaway" if flag(c.get("is_throw_away")) else "otherIncomplete"
        counts[outcome] += 1
    fields = ("is_drop", "is_throw_away", "is_catchable_ball", "is_contested_ball",
              "is_interception_worthy", "is_qb_out_of_pocket")
    def labels(pairs):
        return {field: rate(sum(flag(c.get(field)) is True for _, c in pairs),
                            sum(flag(c.get(field)) is not None for _, c in pairs)) for field in fields}
    return {"attribution": ATTRIBUTION, "throws": len(throws), "matchedThrows": len(matched),
            "unmatchedThrows": len(throws) - len(matched), "finalOutcomes": dict(counts),
            "nonInterceptionIncompletions": len(incomplete),
            "dropShareOfIncompletions": rate(counts["drop"], len(incomplete)),
            "labelsOnThrows": labels(matched), "labelsOnIncompletions": labels(incomplete),
            "note": "Charting labels overlap. Catchability/interception-worthiness are judgments; QB hit is not all pressure, and no label establishes the cause of an inaccurate throw."}


def roster_reference(rosters, snaps, combine, team, year, players=()):
    crosswalk = {}
    for p in players:
        gsis, pfr = p.get("gsis_id"), p.get("pfr_id")
        if not gsis or not pfr:
            continue
        if gsis in crosswalk and crosswalk[gsis] != pfr:
            raise ValueError(f"Ambiguous player-ID crosswalk: {gsis}")
        crosswalk[gsis] = pfr
    weights = defaultdict(float)
    snap_positions = {}
    for r in snaps:
        if r["team"] == team and r["game_type"] == "REG" and int(r["season"]) == year:
            key = r["pfr_player_id"]
            weights[key] += (number(r["offense_snaps"]) or 0) + (number(r["defense_snaps"]) or 0)
            snap_positions[key] = r["position"]
    history = defaultdict(list)
    for r in combine:
        if r.get("pfr_id") and (number(r.get("season")) or math.inf) <= year:
            history[r["pfr_id"]].append(r)
    for rs in history.values():
        rs.sort(key=lambda r: int(r["season"]))
    seen, profiles, filled_ids = set(), [], 0
    for r in rosters:
        if r["team"] != team or int(r["season"]) != year:
            continue
        direct, linked = r["pfr_id"], crosswalk.get(r.get("gsis_id"))
        if direct and linked and direct != linked:
            raise ValueError(f"Conflicting roster/crosswalk identity: {r.get('gsis_id')}")
        key = direct or linked
        if not key or weights[key] <= 0:
            continue
        if key in seen:
            raise ValueError(f"Duplicate team/season roster id: {team}/{year}/{key}")
        seen.add(key)
        filled_ids += int(not direct)
        group = POSITIONS.get(r["position"])
        height, weight = number(r["height"]), number(r["weight"])
        if group is None or height is None or weight is None:
            continue
        drills = history.get(key, [])
        last = drills[-1] if drills else None
        profiles.append({"positionGroup": group, "sourcePosition": r["position"],
                         "snapPosition": snap_positions.get(key), "heightIn": height, "massKg": weight * .45359237,
                         "scrimmageSnaps": weights[key], "yearsExperience": number(r.get("years_exp")),
                         "historicalCombine": {"yearsBeforeSeason": year - int(last["season"]),
                             **{k: number(last[k]) for k in ("forty", "bench", "vertical", "broad_jump", "cone", "shuttle")}} if last else None})
    profiles.sort(key=lambda p: (p["positionGroup"], p["massKg"], p["heightIn"]))
    groups = {}
    for group in sorted({p["positionGroup"] for p in profiles}):
        rs = [p for p in profiles if p["positionGroup"] == group]
        total = sum(p["scrimmageSnaps"] for p in rs)
        groups[group] = {"players": len(rs), "scrimmageSnaps": total,
                         "heightIn": distribution(p["heightIn"] for p in rs), "massKg": distribution(p["massKg"] for p in rs),
                         "snapWeightedHeightIn": sum(p["heightIn"] * p["scrimmageSnaps"] for p in rs) / total,
                         "snapWeightedMassKg": sum(p["massKg"] * p["scrimmageSnaps"] for p in rs) / total,
                         "historicalCombineMatches": sum(p["historicalCombine"] is not None for p in rs)}
    return {"team": team, "season": year, "groups": groups, "anonymousProfiles": profiles,
            "joinCoverage": {"snapPlayersWithScrimmageParticipation": sum(v > 0 for v in weights.values()),
                             "rosterIdsMatched": len(seen), "matchedIdsFilledByGsisCrosswalk": filled_ids,
                             "profilesWithKnownBodyAndPosition": len(profiles),
                             "totalScrimmagePlayerSnaps": sum(weights.values()),
                             "matchedProfileScrimmagePlayerSnaps": sum(p["scrimmageSnaps"] for p in profiles)},
            "note": "Season roster snapshot joined to actual REG participation by exact PFR ID. Preserve measured height/mass pairs when sampling. Broad OL/DL/LB/DB labels do not identify every on-field role. Historical combine drills are not current capacity, technique, cognition or quality ratings; missing drills stay missing."}


def filenames(years, chart_year):
    return {"pbp": [f"play_by_play_{y}.csv.gz" for y in years],
            "rosters": [f"roster_{y}.csv" for y in years], "combine": ["combine.csv"],
            "players": ["players.csv"],
            "snap_counts": [f"snap_counts_{chart_year}.csv"],
            "ftn_charting": [f"ftn_charting_{chart_year}.csv"]}


def download(root, wanted, manifest_name="download-manifest.json"):
    root.mkdir(parents=True, exist_ok=True)
    previous_path = root / manifest_name
    previous = {r["name"]: r for r in json.loads(previous_path.read_text())["files"]} if previous_path.exists() else {}
    records = []
    for tag, names in wanted.items():
        url = f"https://api.github.com/repos/nflverse/nflverse-data/releases/tags/{tag}"
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "football-simulation-research"}), timeout=45) as r:
            release = json.load(r)
        for name in names:
            asset = next(a for a in release["assets"] if a["name"] == name)
            path, partial = root / name, root / (name + ".partial")
            published = asset.get("digest")
            cached = path.exists() and path.stat().st_size == asset["size"]
            if cached and published:
                cached = published == "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()
            elif cached:
                # Older assets lack published digests. Reuse only a locally
                # verified snapshot with the same upstream identity/version.
                old = previous.get(name, {})
                cached = (old.get("assetId") == asset["id"] and old.get("updatedAt") == asset["updated_at"]
                          and old.get("sha256") == hashlib.sha256(path.read_bytes()).hexdigest())
            if not cached:
                with urllib.request.urlopen(asset["browser_download_url"], timeout=45) as r, partial.open("wb") as f:
                    size = 0
                    while chunk := r.read(1024 * 1024):
                        size += len(chunk)
                        if size > asset["size"]:
                            raise ValueError("Response exceeds release asset size")
                        f.write(chunk)
                if size != asset["size"]:
                    raise ValueError("Truncated release asset")
                partial.replace(path)
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if published and published != "sha256:" + digest:
                raise ValueError(f"Published digest mismatch: {name}")
            records.append({"name": name, "url": asset["browser_download_url"], "bytes": path.stat().st_size,
                            "sha256": digest, "assetId": asset["id"], "updatedAt": asset["updated_at"], "publishedDigest": published})
            print(f"Verified {name}", flush=True)
    previous_path.write_text(json.dumps({"source": "nflverse-data releases", "files": records}, indent=2) + "\n")


def study(root, years, chart_year, teams):
    manifest = json.loads((root / "download-manifest.json").read_text())
    wanted = {name for names in filenames(years, chart_year).values() for name in names}
    records = [r for r in manifest["files"] if r["name"] in wanted]
    if {r["name"] for r in records} != wanted:
        raise ValueError("Missing input provenance; run with --download first")
    for r in records:
        if hashlib.sha256((root / r["name"]).read_bytes()).hexdigest() != r["sha256"]:
            raise ValueError(f"Input checksum mismatch: {r['name']}")
    season_reports, team_reports, cells, all_clean, benchmark_calls = {}, [], [], [], []
    for year in years:
        raw = list(read_csv(root / f"play_by_play_{year}.csv.gz"))
        # Duplicates make rates look precise while weighting plays twice.
        keys = [play_key(r) for r in raw]
        if len(set(keys)) != len(keys):
            raise ValueError(f"Duplicate PBP key in {year}")
        live = [r for r in raw if classify(r)]
        clean = [r for r in live if flag(r.get("penalty")) is False]
        all_clean.extend(clean)
        season_reports[str(year)] = {"rawRows": len(raw), "liveScrimmageRows": len(live),
                                     "excludedAcceptedPenaltyRows": len(live) - len(clean), **outcomes(clean)}
        by_team = defaultdict(list)
        by_context = defaultdict(list)
        for r in clean:
            by_team[r["posteam"]].append(r)
        # Calling context retains penalized live plays. Outcome reference
        # below excludes them so penalty yards do not become physical yards.
        for r in live:
            by_context[tuple(context(r).items())].append(r)
        for team, rs in sorted(by_team.items()):
            team_reports.append({"season": year, "team": team, **outcomes(rs)})
        for c, rs in sorted(by_context.items()):
            clean_cell = [r for r in rs if flag(r.get("penalty")) is False]
            db = sum(classify(r) == "dropback" for r in rs)
            cells.append({"season": year, **dict(c), "callingLivePlays": len(rs),
                          "callingDropbackShare": rate(db, len(rs)), "sparse": len(rs) < 40,
                          "cleanOutcomes": outcomes(clean_cell)})
        if year == chart_year:
            # These are observed choices within state, not recommended policy
            # or evidence that score causally changes a quarterback's psyche.
            for team in teams:
                team_live = [r for r in live if r["posteam"] == team]
                situations = defaultdict(list)
                for r in team_live:
                    c = context(r)
                    situations[(c["down"], c["distance"], c["score"], c["period"])].append(r)
                benchmark_calls.append({"team": team, "season": year, "livePlays": len(team_live),
                    "dropbackShare": rate(sum(classify(r) == "dropback" for r in team_live), len(team_live)),
                    "situations": [{"down": key[0], "distance": key[1], "score": key[2], "period": key[3],
                        "sparse": len(rs) < 40, "dropbackShare": rate(sum(classify(r) == "dropback" for r in rs), len(rs))}
                                   for key, rs in sorted(situations.items())]})
    chart_rows = list(read_csv(root / f"ftn_charting_{chart_year}.csv"))
    chart_clean = [r for r in all_clean if int(r["season"]) == chart_year]
    ranges = {key: distribution(r[key]["percent"] for r in team_reports) for key in
              ("completion", "interception", "sackPerDropback", "scramblePerDropback", "twentyYardCompletionPerThrow", "stuffPerDesignedRun")}
    ranges.update({"meanCompletionYards": distribution(r["completionYards"]["mean"] for r in team_reports),
                   "meanCompletedYAC": distribution(r["completedYAC"]["mean"] for r in team_reports)})
    roster = list(read_csv(root / f"roster_{chart_year}.csv"))
    snaps = list(read_csv(root / f"snap_counts_{chart_year}.csv"))
    combine = list(read_csv(root / "combine.csv"))
    players = list(read_csv(root / "players.csv"))
    return {"provenance": {"extractorSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "inputs": records},
            "definitions": {"cohort": "2022/2023 REG unless overridden; live pass/run excluding kneels, spikes, no_play and all special teams. Physical outcomes exclude accepted penalties.",
                "dropback": "qb_dropback or pass_attempt: sacks and scrambles included; designed rush excludes scrambles.",
                "throw": "Recorded complete/incomplete/interception outcome; sacks excluded even though pass_attempt includes them.",
                "success": "40/60/100% of yards to go; positiveEPA separately uses nflfastR's model.",
                "ranges": "Equal-weight observed team-season means, p10/p50/p90. Descriptive variation, not confidence intervals or mandatory acceptance bands.",
                "context": "Offense-relative preplay score; observational cells, no causal claim about risk or pressure. Sparse flag below 40 calling plays; inspect every metric's denominator."},
            "seasons": season_reports, "teamSeasonRanges": ranges, "teamSeasons": team_reports,
            "conditionalCells": cells, "ftnCharting": charting_reference(chart_clean, chart_rows),
            "benchmarkCallingContexts": benchmark_calls,
            "rosterBenchmarks": [roster_reference(roster, snaps, combine, t, chart_year, players) for t in teams]}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--raw", type=Path, default=Path("data/raw/nflverse"))
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--years", nargs="+", type=int, default=[2022, 2023])
    p.add_argument("--chart-year", type=int, default=2022)
    p.add_argument("--teams", nargs="+", default=["KC", "PHI"])
    p.add_argument("--download", action="store_true")
    args = p.parse_args()
    if args.chart_year not in args.years:
        p.error("--chart-year must be included in --years")
    if args.download:
        download(args.raw, filenames(args.years, args.chart_year))
    report = study(args.raw, args.years, args.chart_year, args.teams)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    for year, s in report["seasons"].items():
        print(year, "clean plays", s["plays"], "throws", s["throws"], "completion%", round(s["completion"]["percent"], 2))
    print("FTN drop share of incompletions:", report["ftnCharting"]["dropShareOfIncompletions"])
    print(f"Saved {args.out}")


if __name__ == "__main__":
    main()
