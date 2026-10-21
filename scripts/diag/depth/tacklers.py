#!/usr/bin/env python3
"""Who makes the tackle on runs, and do blocked linemen still make it.

NFL (BDB2025 charting, 2022 weeks 1-9): designed runs (a player had a rush
attempt and the play has a charted run concept) with 60+ yd to the goal. Per
play, the credited tacklers (soloTackle, or assistedTackle/tackleAssist,
each assist counting half) by defender position group, and for linemen
charted as blocked on the play (any blockedPlayerNFLId), the share of those
linemen credited with a tackle or assist.

Sim lab traces (out/open-field/all/LABEL.jsonl.gz): the tackling event's
tackler (`tackle` a) and assists (`tackle_wrap` notes "assist" before the
whistle), the same half-credit rule, by slot family; blocked linemen are those
that were ever in a run rep (trace `snap` engagement at +5 is not enough, so
this reports credit shares only).

usage: tacklers.py [LABEL ...]   (NFL first, then each label)"""
import csv
import gzip
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
RAW = ROOT / "data/raw/bdb2025/big-data-bowl-data"
GROUP = {"DE": "DL", "DT": "DL", "NT": "DL", "OLB": "LB", "ILB": "LB", "MLB": "LB", "LB": "LB",
         "CB": "DB", "SS": "DB", "FS": "DB", "DB": "DB"}


def nfl():
    ytg = json.load(open(ROOT / "out/mechanics/nfl-ytg.json"))
    pos = {r["nflId"]: r["position"] for r in csv.DictReader(open(RAW / "players.csv", newline=""))}
    runs = {f"{r['gameId']}-{r['playId']}" for r in csv.DictReader(open(RAW / "plays.csv", newline=""))
            if r["pff_runConceptPrimary"] not in ("", "NA") and r["passResult"] in ("", "NA")}
    credit, blocked, rushed = Counter(), defaultdict(set), set()
    tacklers = defaultdict(dict)
    for r in csv.DictReader(open(RAW / "player_play.csv", newline="")):
        pid = f"{r['gameId']}-{r['playId']}"
        if pid not in runs or ytg.get(pid, 0) < 60: continue
        if r["hadRushAttempt"] == "1": rushed.add(pid)
        for k in ("blockedPlayerNFLId1", "blockedPlayerNFLId2", "blockedPlayerNFLId3"):
            if r[k] not in ("", "NA"): blocked[pid].add(r[k])
        solo = r["soloTackle"] == "1"
        assist = r["assistedTackle"] == "1" or r["tackleAssist"] == "1"
        if solo or assist: tacklers[pid][r["nflId"]] = 1.0 if solo else 0.5
    plays = [p for p in rushed if tacklers.get(p)]
    for p in plays:
        total = sum(tacklers[p].values())
        for n, w in tacklers[p].items():
            credit[GROUP.get(pos.get(n), "other")] += w / total
    n = len(plays)
    print(f"NFL60 designed runs with a credited tackle: {n}")
    print("  tackle credit share: " + "  ".join(f"{g} {100 * credit[g] / n:.0f}%" for g in ("DL", "LB", "DB", "other")))
    bl = [(p, d) for p in plays for d in blocked[p] if GROUP.get(pos.get(d)) == "DL"]
    hit = sum(1 for p, d in bl if d in tacklers[p])
    print(f"  blocked DL (charted): {len(bl) / max(1, n):.2f}/run, credited with a tackle or assist {100 * hit / max(1, len(bl)):.1f}%")
    dl = [(p, n_) for p in plays for n_ in tacklers[p] if GROUP.get(pos.get(n_)) == "DL"]
    from_block = sum(1 for p, d in dl if d in blocked[p])
    print(f"  DL tackle credits from a charted-blocked DL: {100 * from_block / max(1, len(dl)):.0f}%")


def sim(label):
    fam = lambda s: "DL" if s[:2] in ("DE", "DT", "NT") else "LB" if s.startswith("LB") else "DB"
    credit, n = Counter(), 0
    for line in gzip.open(ROOT / f"out/open-field/all/{label}.jsonl.gz", "rt"):
        r = json.loads(line)
        if "error" in r: continue
        ev = r.get("events") or []
        tk = [e for e in ev if e["type"] == "tackle"]
        if not tk: continue
        t_end = tk[-1]["t"]
        w = {tk[-1]["a"]: 1.0}
        for e in ev:
            if e["type"] == "tackle_wrap" and e.get("note") == "assist" and e["t"] <= t_end and e["a"] not in w:
                w[e["a"]] = 0.5
        if len(w) > 1: w[tk[-1]["a"]] = 0.5
        total = sum(w.values()); n += 1
        for s, x in w.items(): credit[fam(s)] += x / total
    print(f"{label}: runs with a tackle event (lab trace, past +5 only) {n}")
    print("  tackle credit share: " + "  ".join(f"{g} {100 * credit[g] / max(1, n):.0f}%" for g in ("DL", "LB", "DB")))


nfl()
for label in sys.argv[1:]: sim(label)
