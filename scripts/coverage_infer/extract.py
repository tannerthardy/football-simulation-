#!/usr/bin/env python3
"""Extract snap-aligned tracking for coverage inference (BDB 2025, 2022 weeks 1-9).

For every dropback play with a PFF coverage label, writes one record: the 22 players'
positions on a 0.1 s grid from 1.0 s before to 4.0 s after the snap, rotated so the
offense always moves toward +x with the ball at the origin (a 180-degree rotation,
not a mirror, so left stays left), plus the PFF labels used only for scoring:
play coverage and man/zone, each defender's assignment and man matchup.

    python3 -I scripts/coverage_infer/extract.py [out/coverage-infer/plays.pkl] [--runs]

--runs takes the designed runs and scrambles instead (no coverage label exists for them): out/coverage-infer/runs.pkl.
"""
import pickle
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data/raw/bdb2025/big-data-bowl-data"
RUNS = "--runs" in sys.argv
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
OUT = Path(ARGS[0]) if ARGS else ROOT / ("out/coverage-infer/runs.pkl" if RUNS else "out/coverage-infer/plays.pkl")
PRE, POST = 10, 40  # frames before / after the snap frame


def main() -> None:
    plays = pd.read_csv(RAW / "plays.csv")
    if RUNS:
        plays = plays[plays.isDropback.astype(str).str.upper().eq("FALSE") & plays.playNullifiedByPenalty.eq("N")]
    else:
        plays = plays[plays.isDropback.astype(str).str.upper().eq("TRUE") & plays.pff_passCoverage.notna()]
    pp = pd.read_csv(RAW / "player_play.csv", usecols=[
        "gameId", "playId", "nflId", "wasInitialPassRusher", "wasRunningRoute", "routeRan", "inMotionAtBallSnap",
        "motionSinceLineset", "shiftSinceLineset", "pff_defensiveCoverageAssignment",
        "pff_primaryDefensiveCoverageMatchupNflId", "pff_secondaryDefensiveCoverageMatchupNflId"])
    players = pd.read_csv(RAW / "players.csv", usecols=["nflId", "position", "height", "weight"])
    pos = dict(zip(players.nflId, players.position))
    keys = set(zip(plays.gameId, plays.playId))
    pmeta = plays.set_index(["gameId", "playId"])
    ppi = pp.set_index(["gameId", "playId", "nflId"])
    out = []
    for wk in range(1, 10):
        t = pd.read_csv(RAW / f"tracking_week_{wk}.csv", usecols=[
            "gameId", "playId", "nflId", "frameId", "club", "playDirection", "x", "y", "s", "o", "dir", "event", "frameType"])
        for (g, p), d in t.groupby(["gameId", "playId"], sort=False):
            if (g, p) not in keys:
                continue
            snap = d.loc[d.event.eq("ball_snap"), "frameId"]
            if snap.empty:
                continue
            f0 = int(snap.iloc[0])
            d = d[(d.frameId >= f0 - PRE) & (d.frameId <= f0 + POST)]
            m = pmeta.loc[(g, p)]
            ball = d[(d.nflId.isna()) & (d.frameId == f0)]
            if ball.empty:
                continue
            bx, by = float(ball.x.iloc[0]), float(ball.y.iloc[0])
            sign = 1.0 if d.playDirection.iloc[0] == "right" else -1.0
            ids = sorted(d.nflId.dropna().unique())
            n = PRE + POST + 1
            xy = np.full((len(ids), n, 2), np.nan, dtype=np.float32)
            sp = np.full((len(ids), n), np.nan, dtype=np.float32)
            side = []
            for k, i in enumerate(ids):
                di = d[d.nflId == i]
                idx = (di.frameId.values - (f0 - PRE)).astype(int)
                xy[k, idx, 0] = (di.x.values - bx) * sign
                xy[k, idx, 1] = (di.y.values - by) * sign
                sp[k, idx] = di.s.values
                side.append("O" if di.club.iloc[0] == m.possessionTeam else "D")
            ball_xy = np.full((n, 2), np.nan, dtype=np.float32)
            bd = d[d.nflId.isna()]
            ball_xy[(bd.frameId.values - (f0 - PRE)).astype(int), 0] = (bd.x.values - bx) * sign
            ball_xy[(bd.frameId.values - (f0 - PRE)).astype(int), 1] = (bd.y.values - by) * sign
            lab = []
            for i in ids:
                r = ppi.loc[(g, p, int(i))] if (g, p, int(i)) in ppi.index else None
                lab.append(None if r is None else dict(
                    assign=None if pd.isna(r.pff_defensiveCoverageAssignment) else r.pff_defensiveCoverageAssignment,
                    m1=None if pd.isna(r.pff_primaryDefensiveCoverageMatchupNflId) else int(r.pff_primaryDefensiveCoverageMatchupNflId),
                    m2=None if pd.isna(r.pff_secondaryDefensiveCoverageMatchupNflId) else int(r.pff_secondaryDefensiveCoverageMatchupNflId),
                    rusher=bool(r.wasInitialPassRusher) if not pd.isna(r.wasInitialPassRusher) else False,
                    route=None if pd.isna(r.routeRan) else r.routeRan,
                    motion=bool(r.motionSinceLineset) or bool(r.inMotionAtBallSnap)))
            out.append(dict(game=int(g), play=int(p), week=wk, ids=[int(i) for i in ids], side=side,
                            pos=[pos.get(int(i), "?") for i in ids], xy=xy, speed=sp, ball=ball_xy, lab=lab,
                            coverage=m.pff_passCoverage if not RUNS else None, manzone=m.pff_manZone if not RUNS else None,
                            runConcept=None if pd.isna(m.pff_runConceptPrimary) else m.pff_runConceptPrimary, down=int(m.down), togo=int(m.yardsToGo),
                            yardline=float(m.absoluteYardlineNumber), pa=str(m.playAction).upper() == "TRUE",
                            nullified=m.playNullifiedByPenalty == "Y", dropback=m.dropbackType,
                            formation=m.offenseFormation, passResult=m.passResult))
        print("week", wk, "plays so far", len(out), flush=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    pickle.dump(out, open(OUT, "wb"))
    print("wrote", OUT, len(out))


if __name__ == "__main__":
    main()
