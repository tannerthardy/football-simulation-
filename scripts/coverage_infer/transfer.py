#!/usr/bin/env python3
"""Train on the 2022 season, score the 2023 season (a different year, teams' rosters, and a partial view).

BDB 2026 gives, per 2023 pass play, only the coverage defenders (PFF's role) and the route runners,
from the snap to the release, with PFF's coverage family and man/zone call per play. So the 2022
training plays are cut the same way: coverage defenders only, route runners only, y centred on the
quarterback at the snap, features limited to what is visible before each play's own release.
The 2023 plays never touch the fit. Coverage family and man/zone are scored; per-defender jobs
exist only for 2022.

    python3 scripts/coverage_infer/transfer.py
"""
import json
import pickle
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold

sys.path.insert(0, str(Path(__file__).resolve().parent))
from features import PRE, play_features  # noqa: E402
from fit import HGB_KW, JOB, JOBS, fit_predict  # noqa: E402
from sklearn.ensemble import HistGradientBoostingClassifier as HGB  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
JOBS_B = JOBS[:-1]  # no NONE: the view already holds only coverage defenders
FAM23 = {"COVER_3_ZONE": "Cover-3", "COVER_1_MAN": "Cover-1", "COVER_4_ZONE": "Quarters", "COVER_2_ZONE": "Cover-2",
         "COVER_6_ZONE": "Cover-6", "COVER_0_MAN": "Cover-0", "COVER_2_MAN": "2-Man"}
FAM22 = {"Cover-3": "Cover-3", "Cover-3 Seam": "Cover-3", "Cover-3 Cloud Right": "Cover-3", "Cover-3 Cloud Left": "Cover-3",
         "Cover-3 Double Cloud": "Cover-3", "Cover-1": "Cover-1", "Cover-1 Double": "Cover-1", "Cover-0": "Cover-0",
         "Cover-2": "Cover-2", "2-Man": "2-Man", "Quarters": "Quarters", "Cover 6-Left": "Cover-6", "Cover-6 Right": "Cover-6"}
RAW26 = next((ROOT / "data/raw/bdb2026").glob("*"))


def view22(pl, ttt):
    """Cut a 2022 play to the BDB 2026 view. Returns (play, D, E, tmax) or None."""
    side, pos, lab = pl["side"], pl["pos"], pl["lab"]
    D = [i for i in range(len(side)) if side[i] == "D" and lab[i] and lab[i]["assign"]]
    E = [i for i in range(len(side)) if side[i] == "O" and lab[i] and lab[i]["route"]]
    q = [i for i in range(len(side)) if side[i] == "O" and pos[i] == "QB"]
    if not D or not E or not q or pl["coverage"] not in FAM22:
        return None
    xy = pl["xy"].copy()
    xy[:, :, 1] -= xy[q[0], PRE, 1]
    t = ttt if ttt == ttt else 3.0
    return dict(pl, xy=xy), D, E, float(min(max(t, 0.0), 4.0))


def load23():
    sup = pd.read_csv(RAW26 / "supplementary_data.csv", low_memory=False)
    sup = sup[sup.team_coverage_type.isin(FAM23) & sup.play_nullified_by_penalty.astype(str).str.upper().ne("Y")]
    meta = sup.set_index(["game_id", "play_id"])
    out = []
    for f in sorted((RAW26 / "train").glob("input_2023_w*.csv")):
        d = pd.read_csv(f, usecols=["game_id", "play_id", "nfl_id", "frame_id", "play_direction", "absolute_yardline_number",
                                    "player_position", "player_side", "player_role", "x", "y"])
        for (g, p), q in d.groupby(["game_id", "play_id"], sort=False):
            if (g, p) not in meta.index:
                continue
            m = meta.loc[(g, p)]
            qb = q[(q.player_role == "Passer") & (q.frame_id == 1)]
            if qb.empty:
                continue
            sign = 1.0 if q.play_direction.iloc[0] == "right" else -1.0
            los, qy = float(q.absolute_yardline_number.iloc[0]), float(qb.y.iloc[0])
            ids = sorted(q.nfl_id.unique())
            nf = int(q.frame_id.max())
            xy = np.full((len(ids), PRE + nf, 2), np.nan, np.float32)
            side, pos = [], []
            for k, i in enumerate(ids):
                qi = q[q.nfl_id == i]
                idx = qi.frame_id.values - 1 + PRE
                xy[k, idx, 0] = (qi.x.values - los) * sign
                xy[k, idx, 1] = (qi.y.values - qy) * sign
                side.append("D" if qi.player_side.iloc[0] == "Defense" else "O")
                pos.append(qi.player_position.iloc[0])
            roles = {int(i): q[q.nfl_id == i].player_role.iloc[0] for i in ids}
            D = [k for k, i in enumerate(ids) if roles[int(i)] == "Defensive Coverage"]
            E = [k for k, i in enumerate(ids) if roles[int(i)] in ("Targeted Receiver", "Other Route Runner")]
            if not D or not E:
                continue
            pa = str(m.play_action).upper() == "TRUE"
            out.append((dict(xy=xy, side=side, pos=pos, pa=pa, down=int(m.down), togo=int(m.yards_to_go), game=int(g), play=int(p),
                             coverage=FAM23[m.team_coverage_type], manzone="Man" if m.team_coverage_man_zone == "MAN_COVERAGE" else "Zone"),
                        D, E, (nf - 1) / 10.0))
        print(f.name, len(out), flush=True)
    return out


def stage1_rows(views, labelled):
    rows, ys, pid, did = [], [], [], []
    for n, (pl, D, E, tmax) in enumerate(views):
        _, fs = play_features(pl, tmax, D, E)
        for f, i in zip(fs, D):
            rows.append(f); pid.append(n); did.append(i)
            if labelled:
                ys.append(JOBS_B.index(JOB[pl["lab"][i]["assign"]]))
    return rows, np.array(ys), np.array(pid), np.array(did)


def table(views, P, pid, did):
    out = []
    for n, (pl, D, E, tmax) in enumerate(views):
        m = pid == n
        p, d = P[m], did[m]
        k = PRE + int(round(tmax * 10))
        k = min(k, pl["xy"].shape[1] - 1)
        end, snap = pl["xy"][d, k, :], pl["xy"][d, PRE, :]
        dep, dep0 = np.sort(end[:, 0])[::-1], np.sort(snap[:, 0])[::-1]
        top = [dep[i] if i < len(dep) else np.nan for i in range(5)]
        top0 = [dep0[i] if i < len(dep0) else np.nan for i in range(5)]
        out.append(np.concatenate([p.sum(0), [p[:, 0].mean()], top, top0, [len(d), (end[:, 0] > 10).sum(), (end[:, 0] > 7).sum(),
                                  (snap[:, 0] > 10).sum(), pl["pa"], pl["down"], pl["togo"], tmax]]))
    return np.array(out, dtype=np.float32)


def aligned(rows, keys):
    return np.array([[r.get(k, np.nan) for k in keys] for r in rows], dtype=np.float32)


def report(fam, famhat, mz, mzp, FAMS):
    r = {"n": int(len(fam)), "family_accuracy": float((famhat == fam).mean()),
         "family_majority": float(max((fam == c).mean() for c in FAMS)),
         "manzone_accuracy": float(((mzp > .5) == (mz == "Man")).mean()), "manzone_majority": float(max((mz == "Man").mean(), (mz == "Zone").mean()))}
    cm = np.zeros((len(FAMS), len(FAMS)), int)
    for t, p in zip(fam, famhat): cm[FAMS.index(t), FAMS.index(p)] += 1
    r["confusion"] = {"classes": FAMS, "matrix": cm.tolist()}
    return r


def main():
    ttt = pd.read_csv(ROOT / "data/raw/bdb2025/big-data-bowl-data/plays.csv", usecols=["gameId", "playId", "timeToThrow"])
    ttt = {(g, p): t for g, p, t in zip(ttt.gameId, ttt.playId, ttt.timeToThrow)}
    p22 = [v for v in (view22(pl, ttt.get((pl["game"], pl["play"]), np.nan)) for pl in pickle.load(open(ROOT / "out/coverage-infer/plays.pkl", "rb"))) if v]
    print("2022 views", len(p22), flush=True)
    p23 = load23()
    print("2023 views", len(p23), flush=True)
    r22, y22, pid22, did22 = stage1_rows(p22, True)
    r23, _, pid23, did23 = stage1_rows(p23, False)
    keys = sorted({k for r in r22 + r23 for k in r})
    X22, X23 = aligned(r22, keys), aligned(r23, keys)
    g22 = np.array([p22[i][0]["game"] for i in pid22])
    fam22 = np.array([FAM22[v[0]["coverage"]] for v in p22])
    mz22 = np.array([v[0]["manzone"] for v in p22])
    FAMS = sorted(set(fam22))
    keep = np.array([mz in ("Man", "Zone") for mz in mz22])
    pg22 = np.array([v[0]["game"] for v in p22])

    def stage2_fit(T, fam, mz, game_ok):
        m = HGB(**HGB_KW).fit(T, fam)
        m2 = HGB(**HGB_KW).fit(T[game_ok], (mz[game_ok] == "Man").astype(int))
        return m, m2

    def stage2_pred(m, m2, T):
        pr = m.predict_proba(T)
        fp = np.zeros((len(T), len(FAMS)))
        for c, name in enumerate(m.classes_): fp[:, FAMS.index(name)] = pr[:, c]
        return fp, m2.predict_proba(T)[:, 1]

    # (a) 2022 held-out games under the same cut view
    P1 = np.zeros((len(y22), len(JOBS_B)))
    famP = np.zeros((len(p22), len(FAMS))); mzP = np.zeros(len(p22))
    for tr, te in GroupKFold(4).split(X22, y22, g22):
        inner = np.zeros((len(tr), len(JOBS_B)))
        for itr, ite in GroupKFold(3).split(X22[tr], y22[tr], g22[tr]):
            inner[ite] = fit_predict(X22[tr][itr], y22[tr][itr], X22[tr][ite], len(JOBS_B))
        P1[te] = fit_predict(X22[tr], y22[tr], X22[te], len(JOBS_B))
        Pa = np.zeros_like(P1); Pa[tr] = inner
        Pb = np.zeros_like(P1); Pb[te] = P1[te]
        trp, tep = np.unique(pid22[tr]), np.unique(pid22[te])
        Tall_a, Tall_b = table(p22, Pa, pid22, did22), table(p22, Pb, pid22, did22)
        m, m2 = stage2_fit(Tall_a[trp], fam22[trp], mz22[trp], keep[trp])
        famP[tep], mzP[tep] = stage2_pred(m, m2, Tall_b[tep])
        print("2022 fold", flush=True)
    r = {"train_view_2022_heldout_games": report(fam22, np.array(FAMS)[famP.argmax(1)], mz22, mzP, FAMS)}
    r["job_accuracy_2022_view"] = float((P1.argmax(1) == y22).mean())
    # (b) fit on all 2022, score 2023
    inner = np.zeros((len(y22), len(JOBS_B)))
    for itr, ite in GroupKFold(4).split(X22, y22, g22):
        inner[ite] = fit_predict(X22[itr], y22[itr], X22[ite], len(JOBS_B))
    P23 = fit_predict(X22, y22, X23, len(JOBS_B))
    m, m2 = stage2_fit(table(p22, inner, pid22, did22), fam22, mz22, keep)
    fp, mp = stage2_pred(m, m2, table(p23, P23, pid23, did23))
    fam23 = np.array([v[0]["coverage"] for v in p23]); mz23 = np.array([v[0]["manzone"] for v in p23])
    r["test_2023"] = report(fam23, np.array(FAMS)[fp.argmax(1)], mz23, mp, FAMS)
    tm = np.array([v[3] for v in p23])
    hat = np.array(FAMS)[fp.argmax(1)]
    r["test_2023"]["family_accuracy_by_release_time"] = {f"{lo}-{hi}s": [float((hat[(tm >= lo) & (tm < hi)] == fam23[(tm >= lo) & (tm < hi)]).mean()), int(((tm >= lo) & (tm < hi)).sum())]
                                                         for lo, hi in [(0, 2), (2, 2.5), (2.5, 3), (3, 3.5), (3.5, 9)]}
    out = ROOT / "out/coverage-infer/transfer.json"
    json.dump(r, open(out, "w"), indent=1)
    pickle.dump(dict(fam23=fam23, hat=hat, fp=fp, mp=mp, mz23=mz23, plays=[(v[0]["game"], v[0]["play"]) for v in p23]), open(ROOT / "out/coverage-infer/transfer-oof.pkl", "wb"))
    print(json.dumps({k: ({a: b for a, b in v.items() if a != "confusion"} if isinstance(v, dict) else v) for k, v in r.items()}, indent=1))


if __name__ == "__main__":
    main()
