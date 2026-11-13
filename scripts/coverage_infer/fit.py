#!/usr/bin/env python3
"""Infer coverage family and each defender's job from tracking alone, score against PFF.

Two stages, with games held out as groups (no game is in both fit and score):
  1. each defender -> job (man, deep half, quarter, deep third, hook/curl, flat, ...) from
     his own path, who he stays with, and where his teammates are;
  2. the play -> coverage family from the soft count of jobs, how many are deep, and the
     man/zone mix.
`--window` is how many seconds after the snap the model may look (0 = the pre-snap look).
The inferred label is evidence, not truth: PFF's own call is a human chart of the film.

    python3 scripts/coverage_infer/fit.py [--window 3.0] [--folds 4] [--plays out/coverage-infer/plays.pkl]

Needs scikit-learn (not in the repo's stdlib-only set): `pip install scikit-learn`.
"""
import argparse
import json
import pickle
import sys
from pathlib import Path

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier as HGB
from sklearn.model_selection import GroupKFold

sys.path.insert(0, str(Path(__file__).resolve().parent))
from features import play_features  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
JOB = {"MAN": "MAN", "HOL": "HOL", "CFL": "CF", "CFR": "CF", "HCL": "HC", "HCR": "HC", "3M": "3M", "3L": "3S", "3R": "3S",
       "DF": "DF", "2L": "2", "2R": "2", "4IL": "4I", "4IR": "4I", "4OL": "4O", "4OR": "4O", "FL": "FL", "FR": "FL", "PRE": "PRE"}
JOBS = ["MAN", "HOL", "CF", "HC", "3M", "3S", "DF", "2", "4I", "4O", "FL", "PRE", "NONE"]
FAMILY = {"Cover-3": "Cover-3", "Cover-3 Seam": "Cover-3", "Cover-3 Cloud Right": "Cover-3", "Cover-3 Cloud Left": "Cover-3",
          "Cover-3 Double Cloud": "Cover-3", "Cover-1": "Cover-1", "Cover-1 Double": "Cover-1", "Cover-0": "Cover-0",
          "Cover-2": "Cover-2", "2-Man": "2-Man", "Quarters": "Quarters", "Cover 6-Left": "Cover-6", "Cover-6 Right": "Cover-6",
          "Red Zone": "Other", "Goal Line": "Other", "Bracket": "Other", "Prevent": "Other", "Miscellaneous": "Other"}
HGB_KW = dict(max_iter=120, learning_rate=0.1, max_leaf_nodes=15, min_samples_leaf=20, l2_regularization=1.0, random_state=0)


def build(plays, tmax):
    rows, ys, pid, did = [], [], [], []
    for n, pl in enumerate(plays):
        D, fs = play_features(pl, tmax)
        for f, i in zip(fs, D):
            lab = pl["lab"][i]
            job = JOB.get(lab["assign"], "NONE") if lab and lab["assign"] else "NONE"
            rows.append(f); ys.append(JOBS.index(job)); pid.append(n); did.append(i)
    keys = sorted({k for r in rows for k in r})
    X = np.array([[r.get(k, np.nan) for k in keys] for r in rows], dtype=np.float32)
    return X, np.array(ys), np.array(pid), np.array(did), keys


def play_table(plays, tmax, P, pid, did):
    """Per-play stage-2 features from stage-1 job probabilities P (rows aligned with pid/did)."""
    rows = []
    for n, pl in enumerate(plays):
        m = pid == n
        p = P[m]
        d = did[m]
        xy = pl["xy"]
        k = 10 + int(round(tmax * 10))
        end = xy[d, k, :]
        snap = xy[d, 10, :]
        soft = p.sum(0)
        dep = np.sort(end[:, 0])[::-1]
        dep0 = np.sort(snap[:, 0])[::-1]
        top = [dep[i] if i < len(dep) else np.nan for i in range(5)]
        top0 = [dep0[i] if i < len(dep0) else np.nan for i in range(5)]
        rows.append(np.concatenate([soft, [p[:, 0].sum() / max(1e-6, (1 - p[:, -1]).sum())], top, top0,
                                    [(end[:, 0] > 10).sum(), (end[:, 0] > 7).sum(), (snap[:, 0] > 10).sum(), pl["pa"], pl["down"], pl["togo"]]]))
    return np.array(rows, dtype=np.float32)


def fit_predict(X, y, Xt, classes):
    # a column with fewer than two distinct values in this fit cannot be binned
    keep = np.array([len(np.unique(X[:, c][~np.isnan(X[:, c])])) > 1 for c in range(X.shape[1])])
    X, Xt = X[:, keep], Xt[:, keep]
    m = HGB(**HGB_KW).fit(X, y)
    out = np.zeros((len(Xt), classes))
    out[:, m.classes_] = m.predict_proba(Xt)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--window", type=float, default=3.0)
    ap.add_argument("--folds", type=int, default=4)
    ap.add_argument("--plays", default=str(ROOT / "out/coverage-infer/plays.pkl"))
    ap.add_argument("--out", default=str(ROOT / "out/coverage-infer"))
    a = ap.parse_args()
    plays = [p for p in pickle.load(open(a.plays, "rb")) if not p["nullified"]]
    X, y, pid, did, keys = build(plays, a.window)
    games = np.array([plays[i]["game"] for i in pid])
    fam = np.array([FAMILY.get(pl["coverage"], "Other") for pl in plays])
    mz = np.array([pl["manzone"] if pl["manzone"] in ("Man", "Zone") else "Other" for pl in plays])
    play_game = np.array([pl["game"] for pl in plays])
    P1 = np.zeros((len(y), len(JOBS)))  # outer-fold job probabilities (held-out games)
    FAMS = sorted(set(fam))
    famP = np.zeros((len(plays), len(FAMS)))
    mzP = np.zeros(len(plays))
    outer = GroupKFold(a.folds)
    for f, (tr, te) in enumerate(outer.split(X, y, games)):
        # stage 1 on training games, with inner out-of-fold probabilities for the stage-2 training rows
        inner = np.zeros((len(tr), len(JOBS)))
        for itr, ite in GroupKFold(3).split(X[tr], y[tr], games[tr]):
            inner[ite] = fit_predict(X[tr][itr], y[tr][itr], X[tr][ite], len(JOBS))
        P1[te] = fit_predict(X[tr], y[tr], X[te], len(JOBS))
        trp = np.unique(pid[tr]); tep = np.unique(pid[te])
        Ptr = np.zeros((len(y), len(JOBS))); Ptr[tr] = inner
        Pte = np.zeros((len(y), len(JOBS))); Pte[te] = P1[te]
        T_tr = play_table(plays, a.window, Ptr, pid, did)[trp]
        T_te = play_table(plays, a.window, Pte, pid, did)[tep]
        m = HGB(**HGB_KW).fit(T_tr, fam[trp])
        pr = m.predict_proba(T_te)
        for c, name in enumerate(m.classes_):
            famP[tep, FAMS.index(name)] = pr[:, c]
        trm = mz[trp] != "Other"
        m2 = HGB(**HGB_KW).fit(T_tr[trm], (mz[trp][trm] == "Man").astype(int))
        mzP[tep] = m2.predict_proba(T_te)[:, 1]
        print("fold", f, "done", flush=True)
    fam_hat = np.array(FAMS)[famP.argmax(1)]
    rep = {"window": a.window, "plays": len(plays), "defenders": int(len(y)), "games": int(len(set(play_game)))}
    rep["job_accuracy"] = float((P1.argmax(1) == y).mean())
    rep["job_majority"] = float(np.bincount(y).max() / len(y))
    cmj = np.zeros((len(JOBS), len(JOBS)), int)
    for t, p in zip(y, P1.argmax(1)): cmj[t, p] += 1
    rep["job_confusion"] = {"classes": JOBS, "matrix": cmj.tolist()}
    rep["family_accuracy"] = float((fam_hat == fam).mean())
    rep["family_majority"] = float(max((fam == c).mean() for c in FAMS))
    cmf = np.zeros((len(FAMS), len(FAMS)), int)
    for t, p in zip(fam, fam_hat): cmf[FAMS.index(t), FAMS.index(p)] += 1
    rep["family_confusion"] = {"classes": FAMS, "matrix": cmf.tolist()}
    sel = mz != "Other"
    rep["manzone_accuracy"] = float(((mzP[sel] > 0.5) == (mz[sel] == "Man")).mean())
    rep["manzone_majority"] = float(max((mz[sel] == "Man").mean(), (mz[sel] == "Zone").mean()))
    Path(a.out).mkdir(parents=True, exist_ok=True)
    tag = f"w{a.window:g}"
    json.dump(rep, open(Path(a.out) / f"report-{tag}.json", "w"), indent=1)
    pickle.dump(dict(plays=[(p["game"], p["play"]) for p in plays], fams=FAMS, famP=famP, mzP=mzP, fam=fam, mz=mz,
                     did=did, pid=pid, P1=P1, y=y), open(Path(a.out) / f"oof-{tag}.pkl", "wb"))
    print(json.dumps({k: v for k, v in rep.items() if "confusion" not in k}, indent=1))


if __name__ == "__main__":
    main()
