"""Team tendencies and selection in NFL play calling (Big Data Bowl 2025:
2022 season, weeks 1-9, every play).

Measures what the simulation's coaches would need to reproduce before full-game
outcomes can be compared with league numbers:
  - offensive personnel (from who was on the field) by team, and pass rate by personnel
  - defensive personnel (DB count) against each offensive personnel group, by team
  - run-concept shares by team and how concentrated each team is
  - whether teams run more of the concepts that work for them (usage vs.
    efficiency relative to the team's other runs)
  - coverage shell and play-action rates by team

Usage (read raw files as data only; run with -I):
  python3 -I scripts/data/bdb2025_tendencies.py <bdb2025 dir> <out.json>

Only aggregates are written. Excludes nullified plays, kneels, spikes and sneaks.
"""
import csv
import json
import math
import statistics
import sys
from collections import Counter, defaultdict

D, OUT = sys.argv[1], sys.argv[2]

pos = {}
with open(f"{D}/players.csv", newline="") as f:
    for r in csv.DictReader(f):
        pos[r["nflId"]] = r["position"]

plays = {}
with open(f"{D}/plays.csv", newline="") as f:
    for r in csv.DictReader(f):
        if r["playNullifiedByPenalty"] == "Y" or r["qbKneel"] not in ("0", "FALSE", "NA") or r["qbSpike"] == "TRUE" or r["qbSneak"] == "TRUE":
            continue
        plays[(r["gameId"], r["playId"])] = r

on_field = defaultdict(lambda: {"off": Counter(), "def": Counter()})
with open(f"{D}/player_play.csv", newline="") as f:
    for r in csv.DictReader(f):
        k = (r["gameId"], r["playId"])
        p = plays.get(k)
        if p is None:
            continue
        side = "off" if r["teamAbbr"] == p["possessionTeam"] else "def"
        on_field[k][side][pos.get(r["nflId"], "?")] += 1


def off_personnel(c):
    rb = c["RB"] + c["FB"]
    te = c["TE"]
    wr = c["WR"]
    if rb + te + wr != 5:
        return None
    return f"{rb}{te}"


def def_personnel(c):
    db = c["CB"] + c["FS"] + c["SS"] + c["DB"]
    return "base" if db <= 4 else "nickel" if db == 5 else "dime+"


def fnum(x):
    try:
        return float(x)
    except ValueError:
        return None


rows = []
for k, p in plays.items():
    of = on_field.get(k)
    if not of:
        continue
    pers = off_personnel(of["off"])
    if pers is None:
        continue
    epa = fnum(p["expectedPointsAdded"])
    yds = fnum(p["yardsGained"])
    if epa is None or yds is None:
        continue
    is_pass = p["isDropback"] == "TRUE"
    concept = p["pff_runConceptPrimary"]
    rows.append({
        "team": p["possessionTeam"],
        "defteam": p["defensiveTeam"],
        "pers": pers,
        "defpers": def_personnel(of["def"]),
        "pass": is_pass,
        "concept": None if is_pass or concept in ("NA", "UNDEFINED", "TRICK", "SNEAK") else concept,
        "epa": epa,
        "yds": yds,
        "pa": p["playAction"] == "TRUE",
        "sack": p["passResult"] == "S",
        "form": p["offenseFormation"],
        "cov": p["pff_passCoverage"],
        "down": int(p["down"]),
        "ytg": int(p["yardsToGo"]),
    })

teams = sorted({r["team"] for r in rows})
out = {"source": "Big Data Bowl 2025 (2022 weeks 1-9)", "plays": len(rows)}

# ---- offensive personnel
pc = Counter(r["pers"] for r in rows)
main = [p for p, _ in pc.most_common(6)]
out["offensePersonnel"] = {
    "league": {p: round(100 * pc[p] / len(rows), 1) for p in main},
    "passRate": {p: round(100 * sum(r["pass"] for r in rows if r["pers"] == p) / pc[p], 1) for p in main},
}
team_pers = {}
for t in teams:
    tr = [r for r in rows if r["team"] == t]
    tc = Counter(r["pers"] for r in tr)
    team_pers[t] = {p: round(100 * tc[p] / len(tr), 1) for p in main}
out["offensePersonnel"]["teamRange"] = {
    p: {"min": min((v[p], t) for t, v in team_pers.items()), "max": max((v[p], t) for t, v in team_pers.items()), "sd": round(statistics.pstdev(v[p] for v in team_pers.values()), 1)}
    for p in main
}

# ---- defensive personnel vs offensive personnel
dp = {}
for op in ("11", "12", "21"):
    sub = [r for r in rows if r["pers"] == op]
    lc = Counter(r["defpers"] for r in sub)
    by_team = {}
    for t in teams:
        ts = [r for r in sub if r["defteam"] == t]
        if len(ts) < 25:
            continue
        tc = Counter(r["defpers"] for r in ts)
        by_team[t] = {k: round(100 * tc[k] / len(ts), 1) for k in ("base", "nickel", "dime+")}
    dp[op] = {
        "league": {k: round(100 * lc[k] / len(sub), 1) for k in ("base", "nickel", "dime+")},
        "mostBase": sorted(((v["base"], t) for t, v in by_team.items()), reverse=True)[:5],
        "leastBase": sorted((v["base"], t) for t, v in by_team.items())[:5],
        "baseSd": round(statistics.pstdev(v["base"] for v in by_team.values()), 1),
    }
out["defensePersonnelVs"] = dp

# ---- run concepts by team
runs = [r for r in rows if r["concept"]]
cc = Counter(r["concept"] for r in runs)
concepts = [c for c, n in cc.most_common() if n >= 100]
team_share = {}
for t in teams:
    tr = [r for r in runs if r["team"] == t]
    tc = Counter(r["concept"] for r in tr)
    team_share[t] = {c: tc[c] / len(tr) for c in concepts}
    team_share[t]["_n"] = len(tr)
    team_share[t]["_hhi"] = sum((tc[c] / len(tr)) ** 2 for c in tc)
out["runConcepts"] = {
    "league": {c: round(100 * cc[c] / len(runs), 1) for c in concepts},
    "teamRange": {
        c: {
            "min": [round(100 * min(v[c] for v in team_share.values()), 1), min(team_share, key=lambda t: team_share[t][c])],
            "max": [round(100 * max(v[c] for v in team_share.values()), 1), max(team_share, key=lambda t: team_share[t][c])],
            "teamsAbove30pct": sum(v[c] > 0.30 for v in team_share.values()),
        }
        for c in concepts
    },
    "topConceptShare": {
        "median": round(100 * statistics.median(max(v[c] for c in concepts) for v in team_share.values()), 1),
        "max": round(100 * max(max(v[c] for c in concepts) for v in team_share.values()), 1),
    },
}


# ---- selection: do teams run more of what works for them?
# For each team x concept with enough carries, compare the concept's EPA and
# stuff rate with the same team's other runs (removes overall team quality),
# then correlate that difference with how often the team calls the concept.
def corr(xs, ys, ws):
    sw = sum(ws)
    mx = sum(w * x for x, w in zip(xs, ws)) / sw
    my = sum(w * y for y, w in zip(ys, ws)) / sw
    cov = sum(w * (x - mx) * (y - my) for x, y, w in zip(xs, ys, ws))
    vx = sum(w * (x - mx) ** 2 for x, w in zip(xs, ws))
    vy = sum(w * (y - my) ** 2 for y, w in zip(ys, ws))
    return cov / math.sqrt(vx * vy) if vx > 0 and vy > 0 else float("nan")


sel = {}
pooled = {"share": [], "dEpa": [], "dStuff": [], "w": []}
for c in concepts:
    xs, ye, ys, ws = [], [], [], []
    hi, lo = [], []
    for t in teams:
        tr = [r for r in runs if r["team"] == t]
        on = [r for r in tr if r["concept"] == c]
        off = [r for r in tr if r["concept"] != c]
        if len(on) < 12 or len(off) < 30:
            continue
        d_epa = statistics.mean(r["epa"] for r in on) - statistics.mean(r["epa"] for r in off)
        d_stuff = statistics.mean(r["yds"] <= 0 for r in on) - statistics.mean(r["yds"] <= 0 for r in off)
        share = len(on) / len(tr)
        xs.append(share)
        ye.append(d_epa)
        ys.append(d_stuff)
        ws.append(len(on))
        (hi if share >= cc[c] / len(runs) else lo).append(on)
        pooled["share"].append(share / (cc[c] / len(runs)))
        pooled["dEpa"].append(d_epa)
        pooled["dStuff"].append(d_stuff)
        pooled["w"].append(len(on))
    if len(xs) < 8:
        continue
    flat = lambda groups: [r for g in groups for r in g]
    h, l = flat(hi), flat(lo)
    if not h or not l:
        continue
    sel[c] = {
        "teams": len(xs),
        "corrShareVsRelEpa": round(corr(xs, ye, ws), 2),
        "corrShareVsRelStuff": round(corr(xs, ys, ws), 2),
        "heavyUsers": {"carries": len(h), "ypc": round(statistics.mean(r["yds"] for r in h), 2), "stuff": round(100 * statistics.mean(r["yds"] <= 0 for r in h), 1), "epa": round(statistics.mean(r["epa"] for r in h), 3)},
        "lightUsers": {"carries": len(l), "ypc": round(statistics.mean(r["yds"] for r in l), 2), "stuff": round(100 * statistics.mean(r["yds"] <= 0 for r in l), 1), "epa": round(statistics.mean(r["epa"] for r in l), 3)},
    }
out["runConceptSelection"] = {
    "byConcept": sel,
    "pooled": {
        "teamConceptCells": len(pooled["w"]),
        "corrRelUsageVsRelEpa": round(corr(pooled["share"], pooled["dEpa"], pooled["w"]), 2),
        "corrRelUsageVsRelStuff": round(corr(pooled["share"], pooled["dStuff"], pooled["w"]), 2),
    },
}

# ---- coverage shell and play action by team
single = {"Cover-1", "Cover-3", "Cover-0", "Cover-3 Seam", "Cover-3 Cloud Left", "Cover-3 Cloud Right", "Cover-3 Double Cloud", "Cover-1 Double"}
two = {"Cover-2", "Quarters", "Cover-6 Right", "Cover 6-Left", "2-Man"}
cov_team = {}
for t in teams:
    tr = [r for r in rows if r["defteam"] == t and r["pass"] and r["cov"] not in ("NA", "")]
    s = sum(r["cov"] in single for r in tr)
    w = sum(r["cov"] in two for r in tr)
    cov_team[t] = round(100 * s / max(1, s + w), 1)
out["coverage"] = {
    "singleHighShare": {"median": statistics.median(cov_team.values()), "min": min((v, t) for t, v in cov_team.items()), "max": max((v, t) for t, v in cov_team.items()), "sd": round(statistics.pstdev(cov_team.values()), 1)},
}
pa_team = {}
uc_team = {}
oz_team = {}
for t in teams:
    tp = [r for r in rows if r["team"] == t and r["pass"]]
    pa_team[t] = 100 * sum(r["pa"] for r in tp) / len(tp)
    ta = [r for r in rows if r["team"] == t]
    uc_team[t] = 100 * sum(r["form"] in ("I_FORM", "SINGLEBACK", "JUMBO") for r in ta) / len(ta)
    oz_team[t] = 100 * team_share[t].get("OUTSIDE ZONE", 0)
ts = list(teams)
out["playAction"] = {
    "teamRange": {"min": min((round(v, 1), t) for t, v in pa_team.items()), "max": max((round(v, 1), t) for t, v in pa_team.items()), "median": round(statistics.median(pa_team.values()), 1)},
    "corrWithUnderCenterRate": round(corr([pa_team[t] for t in ts], [uc_team[t] for t in ts], [1] * len(ts)), 2),
    "corrWithOutsideZoneShare": round(corr([pa_team[t] for t in ts], [oz_team[t] for t in ts], [1] * len(ts)), 2),
}

# ---- team-to-team spread of outcomes (offense), sampling noise included
def team_spread(select, value):
    """Team SD of a per-play mean, observed and with sampling noise removed."""
    means, noise = [], []
    for t in teams:
        v = [value(r) for r in rows if r["team"] == t and select(r)]
        means.append(statistics.mean(v))
        noise.append(statistics.pvariance(v) / len(v))
    obs = statistics.pvariance(means)
    true = max(0.0, obs - statistics.mean(noise))
    return {"sd": round(math.sqrt(obs), 3), "sdTrue": round(math.sqrt(true), 3), "min": round(min(means), 3), "max": round(max(means), 3)}


out["teamSpread"] = {
    "ypc": team_spread(lambda r: r["concept"], lambda r: r["yds"]),
    "stuffPct": team_spread(lambda r: r["concept"], lambda r: 100 * (r["yds"] <= 0)),
    "sackPct": team_spread(lambda r: r["pass"], lambda r: 100 * r["sack"]),
    "passRatePct": team_spread(lambda r: True, lambda r: 100 * r["pass"]),
    "carriesPerTeam": round(statistics.mean(sum(1 for r in rows if r["team"] == t and r["concept"]) for t in teams)),
}

# ---- outcomes by run concept (league)
out["runConceptOutcomes"] = {
    c: {"carries": cc[c], "ypc": round(statistics.mean(r["yds"] for r in runs if r["concept"] == c), 2), "stuff": round(100 * statistics.mean(r["yds"] <= 0 for r in runs if r["concept"] == c), 1)}
    for c in concepts
}

# ---- situational selection: the same run concepts by down & distance
sit = {}
for name, f in (("1st & 10", lambda r: r["down"] == 1 and r["ytg"] == 10), ("2nd/3rd & 1-2", lambda r: r["down"] in (2, 3) and r["ytg"] <= 2), ("3rd & 7+", lambda r: r["down"] == 3 and r["ytg"] >= 7)):
    sub = [r for r in runs if f(r)]
    sit[name] = {"carries": len(sub), "ypc": round(statistics.mean(r["yds"] for r in sub), 2), "stuff": round(100 * statistics.mean(r["yds"] <= 0 for r in sub), 1)}
out["runsBySituation"] = sit

with open(OUT, "w") as f:
    json.dump(out, f, indent=1)
print(json.dumps(out, indent=1)[:6000])
