#!/usr/bin/env python3
"""How much of a defender's job can be read when only part of the field is visible?

2022 coverage defenders only, games held out, window 3 s. Three views of the same defender:
  own path          his positions and velocities, nothing else
  + his receivers   plus the receivers on his side (who he stays with, where they go)
  + the secondary   plus teammates' depth/count context (the full stage-1 feature set)
Scores the job (12 classes) and man-versus-zone for that one defender.

    python3 scripts/coverage_infer/solo.py
"""
import json
import pickle
import re
import sys
from pathlib import Path

import numpy as np
from sklearn.model_selection import GroupKFold

sys.path.insert(0, str(Path(__file__).resolve().parent))
from features import play_features  # noqa: E402
from fit import JOB, JOBS, fit_predict  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
JB = JOBS[:-1]
OWN = re.compile(r"^(x0|y0|absy0|d[xy][\d.]+|[xy][\d.]+|v[xy][\d.]+)$")
RECV = re.compile(r"^(near0.*|shadow_.*|n_elig_outside|r\d_.*|n_side_elig|n_vert_side|n_elig_behind)$")


def main():
    plays = pickle.load(open(ROOT / "out/coverage-infer/plays.pkl", "rb"))
    rows, ys, games = [], [], []
    for pl in plays:
        D, fs = play_features(pl, 3.0)
        for f, i in zip(fs, D):
            lab = pl["lab"][i]
            if lab and lab["assign"]:
                rows.append(f); ys.append(JB.index(JOB[lab["assign"]])); games.append(pl["game"])
    keys = sorted({k for r in rows for k in r})
    X = np.array([[r.get(k, np.nan) for k in keys] for r in rows], dtype=np.float32)
    y, g = np.array(ys), np.array(games)
    own = np.array([bool(OWN.match(k)) for k in keys]); rec = own | np.array([bool(RECV.match(k)) for k in keys])
    out = {"n_defenders": int(len(y)), "classes": JB, "majority": float(np.bincount(y).max() / len(y)),
           "man_share": float((y == 0).mean())}
    for name, mask in [("own path", own), ("+ his receivers", rec), ("+ the secondary", np.ones(len(keys), bool))]:
        P = np.zeros((len(y), len(JB)))
        for tr, te in GroupKFold(4).split(X, y, g):
            P[te] = fit_predict(X[tr][:, mask], y[tr], X[te][:, mask], len(JB))
        hat = P.argmax(1)
        rec_ = {JB[c]: round(float((hat[y == c] == c).mean()), 2) for c in range(len(JB))}
        man = (y == 0)
        out[name] = {"features": int(mask.sum()), "job_accuracy": float((hat == y).mean()),
                     "man_vs_other_accuracy": float(((P[:, 0] > .5) == man).mean()), "recall_by_job": rec_}
        print(name, round(out[name]["job_accuracy"], 3), round(out[name]["man_vs_other_accuracy"], 3), flush=True)
    json.dump(out, open(ROOT / "out/coverage-infer/solo.json", "w"), indent=1)
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
