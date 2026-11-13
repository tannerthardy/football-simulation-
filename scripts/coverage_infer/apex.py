#!/usr/bin/env python3
"""Quarters apex: what the curl-flat defender does against #2 and the back, from tracking.

For each Quarters play (PFF's call, 2022 weeks 1-9) and each side with one curl-flat (PFF job CF)
defender, the apex, this reads where he is against #2 (the second receiver in from the sideline at
the snap) and against the back, from the snap to 3 s, split by what #2 and the back did. Writes
out/coverage-infer/apex-table.csv.gz (one row per play-side) and apex-summary.json.
Cover 6 quarter-side rows are included under their own family label.

    python3 -I scripts/coverage_infer/apex.py   (needs numpy, pandas)

Coordinates: x downfield past the ball, `out` toward that side's sideline, both in yards. A defender
"inside" a receiver has a smaller `out`. Everything is from tracking; PFF's call and jobs pick the
plays and the apex and are not features of the movement.
"""
import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
PRE = 10
ELIG = {"WR", "TE", "RB", "FB"}
BACK = {"RB", "FB"}
DL = {"DE", "DT", "NT"}
TS = [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0]


def at(xy, i, t):
    return xy[i, PRE + int(round(t * 10))]


def release(xy, i, s):
    """What a receiver does by 2 s, in his side's frame."""
    p0, p2 = at(xy, i, 0), at(xy, i, 2.0)
    dep, wid = p2[0] - p0[0], s * (p2[1] - p0[1])
    if np.isnan(dep) or np.isnan(wid):
        return "unknown"
    if dep >= 7:
        return "vertical"
    if dep <= 3 and wid >= 3:
        return "flat"
    if dep <= 3 and wid <= -3:
        return "under"
    if dep < 3 and abs(wid) < 3:
        return "stay"
    return "break"


def apex_variant(r2_class, apex_depth2, apex_out_vs_r2, back_flat):
    """What the apex did by 2 s, named from where he is, not from what he was asked to do.

    carry     #2 went vertical and he is deep with him (7 yd or more): the wall
    sink      #2 went vertical and he is still shallow (under 5 yd): he let #2 go
    to-flat   he is outside #2 or the back's flat and shallow: out and down
    sit       shallow and level with #2 (a hook/curl): neither
    """
    if np.isnan(apex_depth2):
        return "unknown"
    if r2_class == "vertical":
        return "carry" if apex_depth2 >= 7 else "sink" if apex_depth2 < 5 else "carry-late"
    if apex_depth2 <= 5 and (apex_out_vs_r2 >= 2.5 or back_flat and apex_out_vs_r2 >= 0.5):
        return "to-flat"
    return "sit"


def main():
    plays = pickle.load(open(ROOT / "out/coverage-infer/plays.pkl", "rb"))
    rows, rally = [], []
    for pl in plays:
        fam = pl["coverage"]
        if fam not in ("Quarters", "Cover 6-Left", "Cover-6 Right"):
            continue
        xy, side, pos, lab = pl["xy"], pl["side"], pl["pos"], pl["lab"]
        D = [i for i in range(len(side)) if side[i] == "D"]
        E = [i for i in range(len(side)) if side[i] == "O" and pos[i] in ELIG]
        cf = [i for i in D if lab[i] and lab[i]["assign"] in ("CFL", "CFR")]
        for s in (1, -1):
            mine = [i for i in cf if np.sign(at(xy, i, 0)[1]) == s]
            if len(mine) != 1:
                continue
            a = mine[0]
            on = sorted([e for e in E if np.sign(at(xy, e, 0)[1]) == s and pos[e] not in BACK], key=lambda e: -abs(at(xy, e, 0)[1]))
            if len(on) < 2:
                continue
            r2 = on[1]
            backs = [e for e in E if pos[e] in BACK]
            flat_back = None
            for b in backs:
                p0, p15, p2 = at(xy, b, 0), at(xy, b, 1.5), at(xy, b, 2.0)
                if (p2[0] - p0[0]) <= 4 and s * (p2[1] - p0[1]) >= 3:
                    flat_back = b
            row = dict(game=pl["game"], play=pl["play"], family=fam, side=s, apex=pl["ids"][a], apex_pos=pos[a],
                       r2=pl["ids"][r2], r2_pos=pos[r2], r2_class=release(xy, r2, s),
                       r1_class=release(xy, on[0], s), back_flat=flat_back is not None,
                       apex_depth0=round(float(at(xy, a, 0)[0]), 2), apex_out0=round(float(s * at(xy, a, 0)[1]), 2),
                       r2_depth0=round(float(at(xy, r2, 0)[0]), 2), r2_out0=round(float(s * at(xy, r2, 0)[1]), 2),
                       pa=pl["pa"])
            for t in TS[1:]:
                pa_, pr = at(xy, a, t), at(xy, r2, t)
                row[f"a_dep{t}"] = round(float(pa_[0]), 2)
                row[f"a_out{t}"] = round(float(s * pa_[1]), 2)
                row[f"a_vs2_dx{t}"] = round(float(pa_[0] - pr[0]), 2)
                row[f"a_vs2_out{t}"] = round(float(s * (pa_[1] - pr[1])), 2)
                if flat_back is not None:
                    pb = at(xy, flat_back, t)
                    row[f"a_vsB_dx{t}"] = round(float(pa_[0] - pb[0]), 2)
                    row[f"a_vsB_out{t}"] = round(float(s * (pa_[1] - pb[1])), 2)
            row["variant"] = apex_variant(row["r2_class"], row["a_dep2.0"], row["a_vs2_out2.0"], row["back_flat"])
            rows.append(row)
            # who rallies to the back's flat: the nearest coverage defender (PFF gives him a job) when he reaches the flat
            if flat_back is not None:
                for k in range(PRE + 5, PRE + 31):
                    pb, p0 = xy[flat_back, k], xy[flat_back, PRE]
                    if (pb[0] - p0[0]) <= 4 and s * (pb[1] - p0[1]) >= 4:
                        near = [(np.hypot(*(xy[d, k] - pb)), d) for d in D if pos[d] not in DL and lab[d] and lab[d]["assign"]]
                        dd, d = min(near)
                        rally.append(dict(game=pl["game"], play=pl["play"], family=fam, t=round((k - PRE) / 10, 1),
                                          nearest_pos=pos[d], nearest_job=(lab[d] or {}).get("assign"), is_apex=d == a,
                                          dist=round(float(dd), 2), dx=round(float(xy[d, k, 0] - pb[0]), 2),
                                          out=round(float(s * (xy[d, k, 1] - pb[1])), 2), r2_class=release(xy, r2, s)))
                        break
    df = pd.DataFrame(rows)
    rl = pd.DataFrame(rally)
    out = ROOT / "out/coverage-infer"
    df.to_csv(out / "apex-table.csv.gz", index=False)
    rl.to_csv(out / "apex-rally.csv.gz", index=False)

    def q(s):
        return [round(float(s.quantile(p)), 1) for p in (.25, .5, .75)]

    summ = {"rows": int(len(df)), "plays": int(df[["game", "play"]].drop_duplicates().shape[0])}
    summ["apex_pos"] = df.apex_pos.value_counts().to_dict()
    summ["variant_share"] = {f: d.variant.value_counts(normalize=True).round(3).to_dict() for f, d in
                             [("Quarters", df[df.family == "Quarters"]), ("Cover 6 quarter side", df[df.family != "Quarters"])]}
    summ["variant_n"] = df.variant.value_counts().to_dict()
    cells = {}
    for fam, d0 in [("Quarters", df[df.family == "Quarters"]), ("Cover 6 (quarter side)", df[df.family != "Quarters"])]:
        for r2c, d1 in d0.groupby("r2_class"):
            for bf, d in d1.groupby("back_flat"):
                if len(d) < 30:
                    continue
                cells[f"{fam} | #2 {r2c} | back {'flat' if bf else 'not flat'}"] = {
                    "n": int(len(d)),
                    "apex_depth_t1.0": q(d["a_dep1.0"]), "apex_depth_t2.0": q(d["a_dep2.0"]), "apex_depth_t3.0": q(d["a_dep3.0"]),
                    "apex_out_vs_#2_t2.0 (neg=inside)": q(d["a_vs2_out2.0"]), "apex_depth_vs_#2_t2.0": q(d["a_vs2_dx2.0"]),
                    "share_apex_deeper_than_7_at_2.0s": round(float((d["a_dep2.0"] > 7).mean()), 2)}
    summ["cells"] = cells
    if len(rl):
        summ["rally_to_back_flat"] = {"n": int(len(rl)), "nearest_is_PFF_apex": round(float(rl.is_apex.mean()), 2),
                                      "nearest_position": rl.nearest_pos.value_counts(normalize=True).round(2).head(6).to_dict(),
                                      "nearest_job": rl.nearest_job.fillna("none").value_counts(normalize=True).round(2).head(8).to_dict(),
                                      "depth_vs_back_yd (+ = past him)": q(rl.dx), "out_vs_back_yd (neg = inside)": q(rl.out),
                                      "distance_yd": q(rl.dist), "arrival_time_s": q(rl.t)}
    json.dump(summ, open(out / "apex-summary.json", "w"), indent=1)
    print(json.dumps(summ, indent=1))


if __name__ == "__main__":
    main()
