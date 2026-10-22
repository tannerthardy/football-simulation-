#!/usr/bin/env python3
"""Alignment at the snap by scheme, 2022 season (reads nfl_snapframe.py's
extract). Observation only; p25/p50/p75 and counts.

  defense   corners and safeties by PFF coverage assignment (and coverage),
            backers by down and distance
  line      offensive splits and depth by run concept, dropback and situation;
            spread of team medians
  receivers the outermost receiver's split by route, by ball position, on runs;
            spread of team medians

    python3 -I scripts/diag/align/nfl_scheme.py [out/align/nfl-snap.csv.gz]
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[3]
W = 160 / 3
path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "out/align/nfl-snap.csv.gz"
df = pd.read_csv(path, low_memory=False)
df["play"] = df.gameId.astype(str) + "-" + df.playId.astype(str)
df["dropback"] = df.isDropback.astype(str).str.upper() == "TRUE"


def q(s):
    s = pd.Series(s).dropna()
    if len(s) == 0:
        return "-"
    return f"{s.quantile(.25):.2f}/{s.quantile(.5):.2f}/{s.quantile(.75):.2f} (n {len(s)})"


def situation(r):
    d, togo = r.down, r.yardsToGo
    if d == 1:
        return "1st"
    if d in (3, 4) and togo <= 2:
        return "3rd/4th short"
    if d in (3, 4) and togo >= 7:
        return "3rd/4th long"
    if d == 2 and togo >= 7:
        return "2nd long"
    return "other"


plays = df.groupby("play").first()[["down", "yardsToGo", "ball_y", "pff_passCoverage", "pff_runConceptPrimary", "dropback",
                                     "offenseFormation", "possessionTeam", "defensiveTeam"]]
plays["situation"] = plays.apply(situation, axis=1)
df = df.join(plays[["situation"]], on="play")

# Receivers: wide players on offense (WR, TE, RB outside the core), numbered by side.
off = df[df.side == "O"]
ol = off[off.position.isin(["T", "G", "C"])]
core = ol.groupby("play").y.agg(["min", "max"])
rec = off[off.position.isin(["WR", "TE", "RB", "FB"])].join(core, on="play")
rec = rec[(rec.y < rec["min"] - 3) | (rec.y > rec["max"] + 3)].copy()
rec["sgn"] = np.sign(rec.y - rec.ball_y)
rec["split"] = (rec.y - rec.ball_y).abs()
rec["room"] = np.where(rec.sgn > 0, W - rec.y, rec.y)
rec["rank"] = rec.groupby(["play", "sgn"]).split.rank(ascending=False, method="first")

print("== DEFENSE: corners and safeties by coverage assignment (depth; leverage on the nearest wide receiver, + outside)")
db = df[(df.side == "D") & df.position.isin(["CB", "SS", "FS", "DB"])].copy()
near = rec[["play", "y", "sgn", "room", "rank"]].rename(columns={"y": "ry"})
m = db.merge(near, on="play")
m["dy"] = (m.y - m.ry).abs()
m = m.loc[m.groupby(["play", "nflId"]).dy.idxmin()]
m["lev"] = (m.y - m.ry) * m.sgn
m["press"] = m.x <= 2
for pos in (["CB"], ["SS", "FS"]):
    sub = m[m.position.isin(pos)]
    for a, g in sub.groupby("pff_defensiveCoverageAssignment"):
        if len(g) < 150:
            continue
        print(f"  {'/'.join(pos):5s} {a:4s} depth {q(g.x)}  lev {q(g.lev[g.dy < 4])}  press {g.press.mean():.0%}  lateral gap {q(g.dy)}")
cb = m[m.position == "CB"]
print("  CB MAN by coverage:")
for c, g in cb[cb.pff_defensiveCoverageAssignment == "MAN"].groupby("pff_passCoverage"):
    if len(g) >= 150:
        print(f"    {c:16s} depth {q(g.x)}  lev {q(g.lev[g.dy < 4])}  press {g.press.mean():.0%}")
print("  CB on a #1 with < 9 yd to his sideline vs more (all assignments):")
one = cb[cb["rank"] == 1]
for lab, g in (("tight", one[one.room < 9]), ("room", one[one.room >= 9])):
    print(f"    {lab:5s} depth {q(g.x)}  lev {q(g.lev[g.dy < 4])}")
saf = m[m.position.isin(["SS", "FS"])].copy()
saf["from_mid"] = (saf.y - W / 2).abs()
saf["from_ball"] = (saf.y - saf.ball_y).abs()
print("  Safeties, lateral position (distance from the middle of the field / from the ball):")
for a, g in saf.groupby("pff_defensiveCoverageAssignment"):
    if len(g) >= 150:
        print(f"    {a:4s} depth {q(g.x)}  from middle {q(g.from_mid)}  from ball {q(g.from_ball)}")

print("\n== DEFENSE: off-ball backers by situation (depth; offset from the ball)")
lb = df[(df.side == "D") & df.position.isin(["ILB", "MLB", "OLB", "LB"]) & (df.x > 2)]
for s, g in lb.groupby("situation"):
    print(f"  {s:14s} depth {q(g.x)}  offset {q((g.y - g.ball_y).abs())}")
for s, g in lb.groupby("dropback"):
    print(f"  {'dropback' if s else 'run':14s} depth {q(g.x)}")
dl = df[(df.side == "D") & df.position.isin(["DE", "DT", "NT"])]
for s, g in dl.groupby("situation"):
    print(f"  DL {s:11s} depth {q(g.x)}")

print("\n== LINE: splits (body centres) and depth")
ol = ol.sort_values(["play", "y"])
ol["i"] = ol.groupby("play").cumcount()
ok = ol.groupby("play").i.transform("max") == 4
ol = ol[ok]
wide = ol.pivot(index="play", columns="i", values="y")
depth = ol.pivot(index="play", columns="i", values="x")
lp = pd.DataFrame({"s_cg": ((wide[2] - wide[1]) + (wide[3] - wide[2])) / 2, "s_gt": ((wide[1] - wide[0]) + (wide[4] - wide[3])) / 2,
                   "s_tt": wide[4] - wide[0], "d_c": -depth[2], "d_g": -(depth[1] + depth[3]) / 2, "d_t": -(depth[0] + depth[4]) / 2}).join(plays)
lp["scheme"] = np.where(lp.dropback, "DROPBACK", lp.pff_runConceptPrimary.fillna("NA"))
for s, g in lp.groupby("scheme"):
    if len(g) >= 100:
        print(f"  {s:13s} C-G {q(g.s_cg)}  G-T {q(g.s_gt)}  T-T {q(g.s_tt)}  depth C/G/T {g.d_c.median():.2f}/{g.d_g.median():.2f}/{g.d_t.median():.2f}")
for s, g in lp[lp.dropback].groupby("situation"):
    print(f"  pass {s:14s} G-T {q(g.s_gt)}  T depth {q(g.d_t)}")
for s, g in lp.groupby("offenseFormation"):
    if len(g) >= 100:
        print(f"  {s:13s} T-T {q(g.s_tt)}  T depth {q(g.d_t)}")
team = lp.groupby("possessionTeam").agg(tt=("s_tt", "median"), t=("d_t", "median"), n=("s_tt", "size"))
print(f"  team medians: T-T {team.tt.min():.2f}..{team.tt.max():.2f} (sd {team.tt.std():.2f}); T depth {team.t.min():.2f}..{team.t.max():.2f} (sd {team.t.std():.2f})")

print("\n== RECEIVERS: the outermost receiver per side (room to his sideline; split from the ball)")
one = rec[(rec["rank"] == 1) & (rec.position == "WR")].join(plays[["dropback"]], on="play", rsuffix="_p")
one["ballpos"] = np.where((one.ball_y - W / 2).abs() < 2, "middle", np.where((one.ball_y - W / 2) * one.sgn > 0, "boundary", "field"))
for b, g in one.groupby("ballpos"):
    print(f"  ball {b:8s} room {q(g.room)}  split {q(g.split)}")
for r, g in one[one.dropback_p].groupby("routeRan"):
    if len(g) >= 150:
        print(f"  route {r:7s} room {q(g.room)}  split {q(g.split)}")
print(f"  on runs       room {q(one[~one.dropback_p].room)}  split {q(one[~one.dropback_p].split)}")
team = one.groupby("possessionTeam").room.median()
print(f"  team medians: room {team.min():.2f}..{team.max():.2f} (sd {team.std():.2f})")
two = rec[(rec["rank"] == 2) & (rec.position.isin(["WR", "TE"]))].merge(
    rec[rec["rank"] == 1][["play", "sgn", "split"]].rename(columns={"split": "split1"}), on=["play", "sgn"])
two["share"] = two.split / two.split1
print(f"  #2 split / #1 split: {q(two.share)}")
