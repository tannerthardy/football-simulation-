"""Defensive calls in the NFL: coverage shells, coverage assignments, rush
counts and personnel (Big Data Bowl 2025: 2022 season, weeks 1-9; PFF charting
in plays.csv and player_play.csv, roster positions in players.csv; no tracking).

  1. coverageCalls: pff_passCoverage label (and family) shares and pff_manZone
     shares, overall and by receiver alignment, down x distance, field zone,
     offensive personnel and defensive personnel.
  2. assignments: for coverage labels with n >= 100, pff_defensiveCoverageAssignment
     by defender position and group, defenders per assignment per play, the most
     common whole-defense role sets, and how often a front player drops.
  3. pressure: initial pass rushers per play, blitz (5+), who rushes, simulated
     pressure, rush count x coverage, pressure and sack rates by rush count.
  4. personnelAndFront: DL-LB-DB counts on the field by down x distance, and
     the defensive DB count against each offensive personnel group.

Excludes plays nullified by penalty, spikes and kneels; sections 1-3 use
dropbacks only (isDropback TRUE). Roster positions are season-level labels,
not snap alignments. Only aggregates are written: no game, play, player or
team identifiers.

Usage (read raw files as data only; run with -I):
  python3 -I scripts/data/bdb2025_defense_calls.py <bdb2025 dir> <out.json>
"""
import csv
import json
import os
import statistics
import sys
from collections import Counter, defaultdict

D, OUT = sys.argv[1], sys.argv[2]

DL = {"DE", "DT", "NT"}
OFF_BALL_LB = {"ILB", "MLB"}
OLB = {"OLB", "LB"}  # the one roster "LB" plays the edge (rushes on nearly every dropback)
SAFETY = {"SS", "FS", "DB"}
GROUP = {**{p: "DL" for p in DL}, **{p: "LB" for p in OFF_BALL_LB | OLB}, "CB": "CB", **{p: "S" for p in SAFETY}}
FAMILY = {
    "Cover-0": "Cover-0", "Cover-1": "Cover-1", "Cover-1 Double": "Cover-1", "Cover-2": "Cover-2", "2-Man": "2-Man",
    "Cover-3": "Cover-3", "Cover-3 Seam": "Cover-3", "Cover-3 Cloud Left": "Cover-3", "Cover-3 Cloud Right": "Cover-3",
    "Cover-3 Double Cloud": "Cover-3", "Quarters": "Quarters", "Cover 6-Left": "Cover-6", "Cover-6 Right": "Cover-6",
    "Red Zone": "Red Zone/Goal Line", "Goal Line": "Red Zone/Goal Line", "Bracket": "Bracket", "Prevent": "Prevent",
    "Miscellaneous": "Miscellaneous",
}
ALIGNMENTS = ("2x2", "3x1", "2x1", "3x2", "4x1", "1x1")
DOWN = {1: "1st", 2: "2nd", 3: "3rd", 4: "4th"}
EDGE_OLB_RUSH_RATE = 0.5


def r4(x):
    return round(x, 4)


def dist_bucket(ytg):
    return "1-2" if ytg <= 2 else "3-6" if ytg <= 6 else "7-10" if ytg <= 10 else "11+"


def rush_bucket(n):
    return "<=3" if n <= 3 else "4" if n == 4 else "5" if n == 5 else "6+"


def field_zone(y):
    return "own<20" if y < 20 else "mid20-79" if y < 80 else "redZone80-94" if y < 95 else "goal95+"


def shares(counter, n=None):
    n = sum(counter.values()) if n is None else n
    return {str(k): r4(v / n) for k, v in counter.most_common()} if n else {}


# ---- players and plays
pos = {}
with open(f"{D}/players.csv", newline="") as f:
    for r in csv.DictReader(f):
        pos[r["nflId"]] = r["position"]

checks = Counter({k: 0 for k in ("excludedNullified", "excludedSpike", "excludedKneel", "yardlineInconsistentWithAbsolute", "playsWithout11Defenders", "dropbacksMissingRusherFlags")})
plays = {}
direction = defaultdict(set)
with open(f"{D}/plays.csv", newline="") as f:
    for r in csv.DictReader(f):
        checks["playsRead"] += 1
        if r["playNullifiedByPenalty"] == "Y":
            checks["excludedNullified"] += 1
            continue
        if r["qbSpike"] == "TRUE":
            checks["excludedSpike"] += 1
            continue
        if r["qbKneel"] not in ("0", "FALSE", "NA", ""):
            checks["excludedKneel"] += 1
            continue
        # Yards from the offense's own goal line. yardlineSide is the half the
        # ball is in (NA at the 50); absoluteYardlineNumber is the tracking x
        # (end zones 0-10 and 110-120), so it must equal y + 10 when the
        # offense moves right or 110 - y when it moves left.
        n = int(r["yardlineNumber"])
        side = r["yardlineSide"]
        y = 50 if side in ("NA", "") or n == 50 else n if side == r["possessionTeam"] else 100 - n
        a = float(r["absoluteYardlineNumber"])
        right, left = a - 10 == y, 110 - a == y
        if not (right or left):
            checks["yardlineInconsistentWithAbsolute"] += 1
        elif right != left:
            direction[(r["gameId"], r["possessionTeam"], r["quarter"])].add("R" if right else "L")
        down, ytg = int(r["down"]), int(r["yardsToGo"])
        cov = r["pff_passCoverage"]
        plays[(r["gameId"], r["playId"])] = {
            "dropback": r["isDropback"] == "TRUE",
            "dd": f"{DOWN[down]} & {dist_bucket(ytg)}",
            "zone": field_zone(y),
            "align": r["receiverAlignment"] if r["receiverAlignment"] in ALIGNMENTS else "NA" if r["receiverAlignment"] == "NA" else "other",
            "cov": None if cov == "NA" else cov,
            "fam": None if cov == "NA" else FAMILY.get(cov, "Miscellaneous"),
            "mz": None if r["pff_manZone"] == "NA" else r["pff_manZone"],
            "sack": r["passResult"] == "S",
            "ttt": None if r["timeToThrow"] in ("NA", "") else float(r["timeToThrow"]),
            "off": Counter(), "def": [], "possession": r["possessionTeam"], "defense": r["defensiveTeam"],
        }
checks["quarterDirectionConflicts"] = sum(len(v) > 1 for v in direction.values())

# ---- who was on the field
rush_snaps = defaultdict(lambda: [0, 0])  # nflId -> [initial rushes, dropback snaps with a flag]
with open(f"{D}/player_play.csv", newline="") as f:
    for r in csv.DictReader(f):
        p = plays.get((r["gameId"], r["playId"]))
        if p is None:
            continue
        ps = pos.get(r["nflId"], "?")
        if r["teamAbbr"] == p["possession"]:
            p["off"][ps] += 1
        elif r["teamAbbr"] == p["defense"]:
            p["def"].append({"id": r["nflId"], "pos": ps, "rush": r["wasInitialPassRusher"],
                             "asg": r["pff_defensiveCoverageAssignment"], "pressure": r["causedPressure"] == "TRUE"})
            if p["dropback"] and r["wasInitialPassRusher"] in ("0", "1"):
                rush_snaps[r["nflId"]][0] += r["wasInitialPassRusher"] == "1"
                rush_snaps[r["nflId"]][1] += 1

# 3-4 outside linebackers are edge rushers; 4-3 OLBs play off the ball. Without
# alignment, call an OLB an edge player when he rushes on at least half of his
# dropback snaps (over the whole sample).
edge_olb = {i for i, (rush, snaps) in rush_snaps.items() if pos.get(i) in OLB and snaps and rush / snaps >= EDGE_OLB_RUSH_RATE}
olb_hist = Counter()
for i, (rush, snaps) in rush_snaps.items():
    if pos.get(i) in OLB and snaps:
        olb_hist[f"{min(int(10 * rush / snaps), 9) / 10:.1f}"] += snaps


def off_personnel(c):
    rb, te, wr, ol = c["RB"] + c["FB"], c["TE"], c["WR"], c["T"] + c["G"] + c["C"]
    if rb + te + wr == 5 and ol == 5 and c["QB"] == 1:
        return f"{rb}{te}"
    return "6+OL" if ol >= 6 else "other"


def def_counts(defs):
    g = Counter(GROUP.get(d["pos"], "other") for d in defs)
    db = g["CB"] + g["S"]
    return f"{g['DL']}-{g['LB']}-{db}" + ("+other" if g["other"] else ""), db


def db_class(db):
    return "heavy(<=3DB)" if db <= 3 else "base(4DB)" if db == 4 else "nickel(5DB)" if db == 5 else "dime(6DB)" if db == 6 else "quarter(7+DB)"


for p in plays.values():
    p["opers"] = off_personnel(p["off"])
    p["front"], db = def_counts(p["def"])
    p["dbclass"] = db_class(db)
    if len(p["def"]) != 11:
        checks["playsWithout11Defenders"] += 1

drops = [p for p in plays.values() if p["dropback"]]
checks["dropbacks"] = len(drops)
checks["dropbacksWithoutCoverageLabel"] = sum(p["cov"] is None for p in drops)

# ---- per-dropback rush structure
for p in drops:
    defs = p["def"]
    p["rushOk"] = bool(defs) and all(d["rush"] in ("0", "1") for d in defs)
    if not p["rushOk"]:
        checks["dropbacksMissingRusherFlags"] += 1
        continue
    rushers = [d for d in defs if d["rush"] == "1"]
    cover = [d for d in defs if d["rush"] == "0"]
    p["nrush"] = len(rushers)
    p["rushers"] = rushers
    p["cover"] = cover
    p["pressure"] = any(d["pressure"] for d in defs)
    dl_drop = any(d["pos"] in DL for d in cover)
    olb_drop = any(d["pos"] in OLB for d in cover)
    edge_drop = any(d["pos"] in OLB and d["id"] in edge_olb for d in cover)
    creeper = any(d["pos"] in OFF_BALL_LB | SAFETY | {"CB"} for d in rushers)
    creeper_edge = creeper or any(d["pos"] in OLB and d["id"] not in edge_olb for d in rushers)
    p["dlDrop"], p["olbDrop"], p["edgeOlbDrop"] = dl_drop, olb_drop, edge_drop
    p["sim"] = p["nrush"] <= 4 and creeper and dl_drop
    p["simEdgeOlb"] = p["nrush"] <= 4 and creeper_edge and (dl_drop or edge_drop)
    p["simAnyOlb"] = p["nrush"] <= 4 and creeper and (dl_drop or olb_drop)
    p["cat"] = "blitz" if p["nrush"] >= 5 else "simulated" if p["sim"] else "standard"
    p["catDetail"] = ("blitz5" if p["nrush"] == 5 else "blitz6+") if p["nrush"] >= 5 else "simulated" if p["sim"] else "standard4" if p["nrush"] == 4 else "standard<=3"
rdrops = [p for p in drops if p["rushOk"]]
checks["dropbacksWithRusherFlags"] = len(rdrops)

# ---- 1. coverage calls


def coverage_entry(group):
    lab = [p for p in group if p["cov"]]
    mz = [p["mz"] for p in group if p["mz"]]
    return {"n": len(lab), "labels": shares(Counter(p["cov"] for p in lab)),
            "families": shares(Counter(p["fam"] for p in lab)), "manZone": shares(Counter(mz))}


def by(group, key, order=None, min_n=0):
    g = defaultdict(list)
    for p in group:
        g[p[key]].append(p)
    for k in [k for k in g if len(g[k]) < min_n]:
        g[f"rare(<{min_n} each)"] += g.pop(k)
    keys = order if order else sorted(g, key=lambda k: -len(g[k]))
    return {k: coverage_entry(g[k]) for k in keys if k in g}


DD_ORDER = [f"{d} & {b}" for d in DOWN.values() for b in ("1-2", "3-6", "7-10", "11+")]
coverage = {
    "overall": coverage_entry(drops),
    "allPlaysIncludingRuns": coverage_entry(list(plays.values())),
    "byReceiverAlignment": by(drops, "align", list(ALIGNMENTS) + ["other", "NA"]),
    "byDownDistance": by(drops, "dd", DD_ORDER),
    "byFieldZone": by(drops, "zone", ["own<20", "mid20-79", "redZone80-94", "goal95+"]),
    "byOffensePersonnel": by(drops, "opers", min_n=20),
    "byDefensePersonnel": by(drops, "dbclass", ["heavy(<=3DB)", "base(4DB)", "nickel(5DB)", "dime(6DB)", "quarter(7+DB)"]),
}

# ---- 2. assignments


def role(d):
    return "RUSH" if d["rush"] == "1" else "NONE" if d["asg"] == "NA" else d["asg"]


def assignment_entry(group):
    by_pos, by_grp = defaultdict(Counter), defaultdict(Counter)
    per_play = defaultdict(Counter)
    sigs = Counter()
    dl_drop_roles = Counter()
    play_roles = []
    for p in group:
        c = Counter()
        for d in p["def"]:
            ro = role(d)
            c[ro] += 1
            by_pos[d["pos"]][ro] += 1
            by_grp[GROUP.get(d["pos"], "other")][ro] += 1
            if d["pos"] in DL and ro != "RUSH":
                dl_drop_roles[ro] += 1
        play_roles.append(c)
        sigs[" ".join(f"{k}x{v}" if v > 1 else k for k, v in sorted(c.items()))] += 1
    n = len(group)
    roles_seen = set().union(*play_roles)
    for c in play_roles:
        for ro in roles_seen:
            per_play[ro][c[ro]] += 1
    return {
        "n": n,
        "perPlay": {ro: {"mean": r4(sum(k * v for k, v in per_play[ro].items()) / n),
                         "countShare": {str(k): r4(v / n) for k, v in sorted(per_play[ro].items())}}
                    for ro in sorted(roles_seen, key=lambda ro: (ro != "RUSH", -sum(k * v for k, v in per_play[ro].items())))},
        "topRoleSets": [{"roles": s, "share": r4(v / n)} for s, v in sigs.most_common(6)],
        "byGroup": {g: {"n": sum(c.values()), "roles": shares(c)} for g, c in sorted(by_grp.items())},
        "byPosition": {ps: {"n": sum(c.values()), "roles": shares(c)} for ps, c in sorted(by_pos.items(), key=lambda kv: -sum(kv[1].values()))},
        "frontDrops": {
            "dlDropShare": r4(sum(p["dlDrop"] for p in group) / n),
            "edgeOlbDropShare": r4(sum(p["edgeOlbDrop"] for p in group) / n),
            "dlOrEdgeOlbDropShare": r4(sum(p["dlDrop"] or p["edgeOlbDrop"] for p in group) / n),
            "anyOlbDropShare": r4(sum(p["olbDrop"] for p in group) / n),
            "droppedDlRoles": shares(dl_drop_roles),
        },
    }


lab_n = Counter(p["cov"] for p in rdrops if p["cov"])
assignments = {
    "labels": {c: assignment_entry([p for p in rdrops if p["cov"] == c]) for c, k in lab_n.most_common() if k >= 100},
    "frontDropsByFamily": {},
}
fam_n = Counter(p["fam"] for p in rdrops if p["fam"])
for fam, k in fam_n.most_common():
    g = [p for p in rdrops if p["fam"] == fam]
    assignments["frontDropsByFamily"][fam] = {
        "n": k, "dlDropShare": r4(sum(p["dlDrop"] for p in g) / k), "edgeOlbDropShare": r4(sum(p["edgeOlbDrop"] for p in g) / k),
        "dlOrEdgeOlbDropShare": r4(sum(p["dlDrop"] or p["edgeOlbDrop"] for p in g) / k), "anyOlbDropShare": r4(sum(p["olbDrop"] for p in g) / k)}
asg_on_rushers = Counter(d["asg"] for p in rdrops for d in p["rushers"] if d["asg"] != "NA")
none_on_cover = Counter(d["pos"] for p in rdrops for d in p["cover"] if d["asg"] == "NA")
checks["rushersWithCoverageAssignment"] = sum(asg_on_rushers.values())
checks["rushersWithCoverageAssignmentLabels"] = dict(asg_on_rushers.most_common())
checks["nonRushersWithoutAssignment"] = sum(none_on_cover.values())
checks["nonRushersWithoutAssignmentByPosition"] = dict(none_on_cover.most_common())

# ---- 3. pressure


def rush_entry(group):
    n = len(group)
    c = Counter(p["nrush"] for p in group)
    return {"n": n, "meanRushers": r4(statistics.mean(p["nrush"] for p in group)) if n else None,
            "blitzRate": r4(sum(p["nrush"] >= 5 for p in group) / n) if n else None,
            "sixPlusRate": r4(sum(p["nrush"] >= 6 for p in group) / n) if n else None,
            "rushBuckets": shares(Counter(rush_bucket(p["nrush"]) for p in group)),
            "rushCount": {str(k): r4(v / n) for k, v in sorted(c.items())},
            "simulatedRate": r4(sum(p["sim"] for p in group) / n) if n else None}


def outcome_entry(group):
    n = len(group)
    t = [p["ttt"] for p in group if p["ttt"] is not None]
    return {"n": n, "pressureRate": r4(sum(p["pressure"] for p in group) / n), "sackRate": r4(sum(p["sack"] for p in group) / n),
            "medianTimeToThrow": round(statistics.median(t), 2) if t else None}


rusher_grp = Counter()
for p in rdrops:
    for d in p["rushers"]:
        rusher_grp["DL" if d["pos"] in DL else "OLB" if d["pos"] in OLB else "offBallLB" if d["pos"] in OFF_BALL_LB
                   else "CB" if d["pos"] == "CB" else "S" if d["pos"] in SAFETY else "other"] += 1


def any_rusher(group, test):
    return r4(sum(any(test(d) for d in p["rushers"]) for p in group) / len(group))


blitzes = [p for p in rdrops if p["nrush"] >= 5]
le4 = [p for p in rdrops if p["nrush"] <= 4]
cov_by_rush = defaultdict(list)
for p in rdrops:
    if p["cov"]:
        cov_by_rush[rush_bucket(p["nrush"])].append(p)
by_count = defaultdict(list)
for p in rdrops:
    by_count["0-2" if p["nrush"] <= 2 else str(p["nrush"]) if p["nrush"] <= 7 else "8+"].append(p)
pressure = {
    "overall": rush_entry(rdrops),
    "byDownDistance": {k: rush_entry([p for p in rdrops if p["dd"] == k]) for k in DD_ORDER},
    "rusherComposition": {
        "shareOfAllRushers": shares(rusher_grp),
        "nonDlShareOfRushers": {"LBincludingOLB": r4((rusher_grp["OLB"] + rusher_grp["offBallLB"]) / sum(rusher_grp.values())),
                                "offBallLB": r4(rusher_grp["offBallLB"] / sum(rusher_grp.values())),
                                "CB": r4(rusher_grp["CB"] / sum(rusher_grp.values())), "S": r4(rusher_grp["S"] / sum(rusher_grp.values()))},
        "playsWithAnyRusher": {
            label: {"all": any_rusher(rdrops, t), "blitz": any_rusher(blitzes, t), "fourOrFewer": any_rusher(le4, t)}
            for label, t in (("offBallLB", lambda d: d["pos"] in OFF_BALL_LB), ("CB", lambda d: d["pos"] == "CB"),
                             ("S", lambda d: d["pos"] in SAFETY), ("anyDB", lambda d: d["pos"] in SAFETY | {"CB"}),
                             ("offBallLBorDB", lambda d: d["pos"] in OFF_BALL_LB | SAFETY | {"CB"}))},
    },
    "simulatedPressure": {
        variant: {"shareOfDropbacks": r4(sum(p[key] for p in rdrops) / len(rdrops)),
                  "shareOfFourOrFewerRush": r4(sum(p[key] for p in le4) / len(le4)), "n": sum(p[key] for p in rdrops)}
        for variant, key in (("dlOnly", "sim"), ("withEdgeOlb", "simEdgeOlb"), ("anyOlbAsDropper", "simAnyOlb"))},
    "rushByCoverageLabel": {c: {**{k: v for k, v in rush_entry([p for p in rdrops if p["cov"] == c]).items() if k != "rushCount"}}
                            for c, k in lab_n.most_common() if k >= 30},
    "rushByCoverageFamily": {f: {k: v for k, v in rush_entry([p for p in rdrops if p["fam"] == f]).items() if k != "rushCount"}
                             for f, _ in fam_n.most_common()},
    "coverageGivenRush": {b: {"n": len(cov_by_rush[b]), "labels": shares(Counter(p["cov"] for p in cov_by_rush[b])),
                              "families": shares(Counter(p["fam"] for p in cov_by_rush[b]))} for b in ("<=3", "4", "5", "6+")},
    "outcomesByRushCount": {k: outcome_entry(by_count[k]) for k in ("0-2", "3", "4", "5", "6", "7", "8+") if by_count[k]},
    "outcomesByCall": {k: outcome_entry([p for p in rdrops if p["cat"] == k]) for k in ("standard", "simulated", "blitz")},
    "outcomesByCallDetail": {k: outcome_entry([p for p in rdrops if p["catDetail"] == k]) for k in ("standard<=3", "standard4", "simulated", "blitz5", "blitz6+")},
    "outcomesOverall": outcome_entry(rdrops),
}

# ---- 4. personnel and front


def personnel_entry(group):
    n = len(group)
    fronts = Counter(p["front"] for p in group)
    top = {k: r4(v / n) for k, v in fronts.most_common() if v / n >= 0.01}
    top["other(<1% each)"] = r4(1 - sum(top.values()))
    return {"n": n, "dbCount": shares(Counter(p["dbclass"] for p in group)), "dlLbDb": top,
            "meanDL": r4(statistics.mean(int(p["front"].split("-")[0]) for p in group))}


allp = list(plays.values())
personnel = {
    "dropbacks": {"overall": personnel_entry(drops), "byDownDistance": {k: personnel_entry([p for p in drops if p["dd"] == k]) for k in DD_ORDER}},
    "allPlays": {"overall": personnel_entry(allp), "byDownDistance": {k: personnel_entry([p for p in allp if p["dd"] == k]) for k in DD_ORDER}},
    "dbCountVsOffensePersonnel": {o: {"n": k, "dbCount": shares(Counter(p["dbclass"] for p in allp if p["opers"] == o))}
                                  for o, k in Counter(p["opers"] for p in allp).most_common() if k >= 30},
    "offensePersonnelShare": {"allPlays": shares(Counter(p["opers"] for p in allp)), "dropbacks": shares(Counter(p["opers"] for p in drops))},
}

checks["olbSnapWeightedRushRateHistogram"] = {k: r4(v / sum(olb_hist.values())) for k, v in sorted(olb_hist.items())}
checks["edgeOlbShareOfOlbSnaps"] = r4(sum(s for i, (_, s) in rush_snaps.items() if i in edge_olb) /
                                      sum(s for i, (_, s) in rush_snaps.items() if pos.get(i) in OLB))
checks["sacksWithoutPressureFlag"] = sum(p["sack"] and not p["pressure"] for p in rdrops)

definitions = {
    "cohort": "plays.csv rows not nullified by penalty (playNullifiedByPenalty != 'Y'), not spikes (qbSpike TRUE) and not kneels (qbKneel != 0). Sections 1-3 keep dropbacks (isDropback TRUE: passes, sacks and scrambles); section 4 and coverageCalls.allPlaysIncludingRuns also report every play.",
    "shares": "Fractions of plays (or of defender-snaps where stated) in the group; n is the group size. Coverage shares exclude plays without a pff_passCoverage label (dataChecks.dropbacksWithoutCoverageLabel).",
    "coverageLabel": "PFF pff_passCoverage as charted. families pool Cover-3/Seam/Cloud Left/Cloud Right/Double Cloud as Cover-3, Cover-1 and Cover-1 Double as Cover-1, Cover 6-Left and Cover-6 Right as Cover-6, Red Zone and Goal Line together; Bracket, Prevent and Miscellaneous stay separate.",
    "manZone": "PFF pff_manZone (Man / Zone / Other).",
    "receiverAlignment": "plays.csv receiverAlignment; 2x0, 3x0, 1x0, 4x2 and 3x3 are pooled as other.",
    "downDistance": "down x yardsToGo bucket: 1-2, 3-6, 7-10, 11+.",
    "fieldZone": "Yards from the offense's own goal line y: yardlineNumber when yardlineSide is the possession team, 100 - yardlineNumber when it is the opponent, 50 when yardlineSide is NA (the 50). Cross-checked against absoluteYardlineNumber (= y + 10 moving right or 110 - y moving left; dataChecks). own<20: y < 20; mid20-79; redZone80-94; goal95+: y >= 95 (inside the opponent 5).",
    "offensePersonnel": "Offensive players on the field from player_play.csv with players.csv roster positions: RB+FB count then TE count ('11' = 1 RB, 1 TE, 3 WR). '6+OL' = six or more T/G/C; 'other' = anything else (two QBs, defender on offense). In coverageCalls, groups with fewer than 20 dropbacks are pooled as rare.",
    "defenderGroups": "Roster positions: DL = DE, DT, NT; LB = ILB, MLB, OLB, LB; CB; S = SS, FS, DB (one roster DB, used as a slot/box defender). offBallLB = ILB, MLB. OLB is reported separately where it matters because 3-4 OLBs are edge rushers; the one roster 'LB' is an edge rusher and is handled as an OLB.",
    "defensePersonnel": "Count of CB + S on the field: <=3 heavy, 4 base, 5 nickel, 6 dime, 7+ quarter. dlLbDb is the DL-LB-DB count string (LB includes OLB, so a 3-4 base front with two edge OLBs reads 3-4-4).",
    "edgeOlb": f"An OLB (or roster LB) whose initial-rush rate over all his dropback snaps in the sample is >= {EDGE_OLB_RUSH_RATE} (a 3-4 outside linebacker or wide edge); other OLBs are treated as off-ball. Snap-weighted OLB rush-rate histogram in dataChecks.",
    "role": "Per defender per play: RUSH if wasInitialPassRusher == 1, else pff_defensiveCoverageAssignment, or NONE when that is NA. Assignment codes (PFF): MAN man; 2L/2R Cover-2 deep half; 3L/3M/3R Cover-3 deep third; 4IL/4IR/4OL/4OR Cover-4 inside/outside quarter; CFL/CFR curl-flat; HCL/HCR hook-curl; HOL hole/robber; FL/FR flat; DF deep free; PRE prevent.",
    "perPlay": "For each role, mean defenders per play and the share of plays with 0, 1, 2, ... defenders in that role.",
    "topRoleSets": "The whole defense's role multiset per play (e.g. 'RUSHx4 3L 3M 3R CFL CFR HCL HCR'), most common first.",
    "frontDrops": "Share of plays with at least one DE/DT/NT not rushing (dlDropShare), with an edge OLB not rushing, with either, and with any OLB not rushing (upper bound: includes 4-3 off-ball OLBs). droppedDlRoles: roles of the DE/DT/NT who did not rush.",
    "rushers": "Count of defenders with wasInitialPassRusher == 1 on the play. Plays where any defender's flag is NA are left out of rush statistics (dataChecks.dropbacksMissingRusherFlags).",
    "blitz": "5 or more initial rushers.",
    "simulatedPressure": "4 or fewer rushers, at least one off-ball LB/CB/S rusher, and a front player dropping. dlOnly (primary): the dropper is a DE/DT/NT and OLB rushers do not count as the extra rusher. withEdgeOlb: edge OLBs count as front players (dropper) and off-ball OLBs count as the extra rusher. anyOlbAsDropper: any non-rushing OLB counts as the dropper (upper bound).",
    "call": "blitz (5+ rushers); simulated (dlOnly definition); standard = 4 or fewer rushers and not simulated. Detail splits standard into 4 rushers and 3 or fewer, and blitz into 5 and 6+.",
    "pressureRate": "Share of plays with causedPressure TRUE for any defender (PFF hurry, hit or sack).",
    "sackRate": "Share of plays with passResult S.",
    "medianTimeToThrow": "Median plays.csv timeToThrow (seconds) over plays where it is recorded (throws).",
    "notAvailable": "Defenders in the box and alignment depth are not in these files (they need tracking); not reported.",
}

out = {
    "source": "Big Data Bowl 2025 (NFL 2022 weeks 1-9): plays.csv, player_play.csv, players.csv; PFF charting labels",
    "definitions": definitions,
    "dataChecks": dict(checks),
    "coverageCalls": coverage,
    "assignments": assignments,
    "pressure": pressure,
    "personnelAndFront": personnel,
}
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
with open(OUT, "w") as fh:
    json.dump(out, fh, indent=1)
    fh.write("\n")
print(json.dumps({"dataChecks": out["dataChecks"], "coverage": coverage["overall"], "rush": pressure["overall"],
                  "simulated": pressure["simulatedPressure"], "outcomesByCall": pressure["outcomesByCall"]}, indent=1))
