#!/usr/bin/env python3
"""One row per defender per play on BDB 2025: the role table lanes join to their operators.

Columns: game, play, nflId, pos, side (+1 / -1 from the ball's y), job_pff (the provider's, scoring only),
job_inferred, job_conf, family_pff, family_inferred, family_conf, no_template (the play's best coverage
family reaches under 0.5, so no template fits it), variant (the quarters apex's observed behaviour, only
where apex.py names one), cues (what the call rests on). Inferred columns come from the held-out-game
predictions of fit.py, never from a model that saw the play's game.

    python3 scripts/coverage_infer/fit.py --window 3.0 && python3 -I scripts/coverage_infer/apex.py
    python3 scripts/coverage_infer/roles_table.py        (needs numpy, pandas)
"""
import json
import pickle
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
ROOT = Path(__file__).resolve().parents[2]
JOBS = ["MAN", "HOL", "CF", "HC", "3M", "3S", "DF", "2", "4I", "4O", "FL", "PRE", "NONE"]
OUT = ROOT / "out/coverage-infer"
PRE = 10


def main():
    plays = pickle.load(open(OUT / "plays.pkl", "rb"))
    o = pickle.load(open(OUT / "oof-w3.pkl", "rb"))
    P1, pid, did, FAMS, famP = o["P1"], o["pid"], o["did"], o["fams"], o["famP"]
    apex = pd.read_csv(OUT / "apex-table.csv.gz")
    var = {(r.game, r.play, r.apex): r.variant for r in apex.itertuples()}
    rows = []
    for n, pl in enumerate(plays):
        fi = famP[n]
        fam_hat, fam_conf = FAMS[int(fi.argmax())], float(fi.max())
        for k in np.where(pid == n)[0]:
            i = int(did[k])
            p = P1[k]
            xy = pl["xy"]
            lab = pl["lab"][i]
            nid = pl["ids"][i]
            cues = dict(depth0=round(float(xy[i, PRE, 0]), 1), out0=round(float(abs(xy[i, PRE, 1])), 1),
                        depth2=round(float(xy[i, PRE + 20, 0]), 1), depth3=round(float(xy[i, PRE + 30, 0]), 1))
            rows.append(dict(game=pl["game"], play=pl["play"], nflId=nid, pos=pl["pos"][i], side=int(np.sign(xy[i, PRE, 1]) or 1),
                             job_pff=(lab or {}).get("assign"), job_inferred=JOBS[int(p.argmax())], job_conf=round(float(p.max()), 3),
                             family_pff=pl["coverage"], family_inferred=fam_hat, family_conf=round(fam_conf, 3),
                             no_template=fam_conf < 0.5, variant=var.get((pl["game"], pl["play"], nid)),
                             cues=json.dumps(cues, separators=(",", ":"))))
    df = pd.DataFrame(rows)
    df.to_csv(OUT / "roles-bdb2025.csv.gz", index=False)
    plays_df = df.drop_duplicates(["game", "play"])
    summ = {"rows": int(len(df)), "plays": int(len(plays_df)),
            "no_template_share_plays": round(float(plays_df.no_template.mean()), 3),
            "no_template_by_pff_family": {f: [round(float(d.no_template.mean()), 3), int(len(d))] for f, d in plays_df.groupby("family_pff")},
            "low_confidence_defenders_share": round(float((df.job_conf < 0.5).mean()), 3)}
    json.dump(summ, open(OUT / "roles-summary.json", "w"), indent=1)
    print(json.dumps(summ, indent=1))


if __name__ == "__main__":
    main()
