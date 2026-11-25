#!/usr/bin/env python3
"""Infer the coverage shell on designed runs and scrambles, where PFF gives no coverage label.

Fit on all 2022 labelled drop-backs with the pre-snap look only (window 0), then read each run
play's alignment. This says which shell the defense lined up in, not what it did after the snap:
a run changes what every defender does, so no post-snap window is used. Writes
out/coverage-infer/runs-inferred.csv.gz and a summary by run concept.

    python3 scripts/coverage_infer/apply_runs.py
"""
import json
import pickle
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fit import FAMILY, JOBS, build, fit_predict, play_table  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
from sklearn.ensemble import HistGradientBoostingClassifier as HGB  # noqa: E402
from fit import HGB_KW  # noqa: E402


def main():
    plays = pickle.load(open(ROOT / "out/coverage-infer/plays.pkl", "rb"))
    runs = pickle.load(open(ROOT / "out/coverage-infer/runs.pkl", "rb"))
    X, y, pid, did, keys = build(plays, 0.0)
    g = np.array([plays[i]["game"] for i in pid])
    fam = np.array([FAMILY.get(p["coverage"], "Other") for p in plays])
    mz = np.array([p["manzone"] if p["manzone"] in ("Man", "Zone") else "Other" for p in plays])
    inner = np.zeros((len(y), len(JOBS)))
    for tr, te in GroupKFold(4).split(X, y, g):
        inner[te] = fit_predict(X[tr], y[tr], X[te], len(JOBS))
    T = play_table(plays, 0.0, inner, pid, did)
    m = HGB(**HGB_KW).fit(T, fam)
    sel = mz != "Other"
    m2 = HGB(**HGB_KW).fit(T[sel], (mz[sel] == "Man").astype(int))
    Xr, _, pidr, didr, keysr = build(runs, 0.0)
    assert keysr == keys, "feature schema differs"
    Pr = fit_predict(X, y, Xr, len(JOBS))
    Tr = play_table(runs, 0.0, Pr, pidr, didr)
    pr = m.predict_proba(Tr)
    cls = list(m.classes_)
    df = pd.DataFrame({"game": [r["game"] for r in runs], "play": [r["play"] for r in runs], "concept": [r["runConcept"] for r in runs],
                       "down": [r["down"] for r in runs], "togo": [r["togo"] for r in runs]})
    for c, name in enumerate(cls):
        df[f"p_{name}"] = pr[:, c]
    df["p_man"] = m2.predict_proba(Tr)[:, 1]
    df["family"] = np.array(cls)[pr.argmax(1)]
    df["confidence"] = pr.max(1)
    out = ROOT / "out/coverage-infer/runs-inferred.csv.gz"
    df.to_csv(out, index=False)
    summ = {"n_runs": int(len(df)), "family_share_runs": df.family.value_counts(normalize=True).round(3).to_dict(),
            "family_share_dropbacks_pff": pd.Series(fam).value_counts(normalize=True).round(3).to_dict(),
            "mean_p_man_runs": float(df.p_man.mean()), "pff_man_share_dropbacks": float((mz[sel] == "Man").mean()),
            "mean_confidence": float(df.confidence.mean()),
            "by_concept": {k: {"n": int(len(v)), "p_man": round(float(v.p_man.mean()), 3),
                               **{f: round(float((v.family == f).mean()), 3) for f in ["Cover-3", "Cover-1", "Cover-2", "Quarters", "Cover-6", "Cover-0"]}}
                           for k, v in df.groupby("concept") if len(v) >= 100}}
    json.dump(summ, open(ROOT / "out/coverage-infer/runs-summary.json", "w"), indent=1)
    print(json.dumps(summ, indent=1))


if __name__ == "__main__":
    main()
