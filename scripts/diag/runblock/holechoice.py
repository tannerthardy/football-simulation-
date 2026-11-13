"""Which gap the back takes on an inside run: the one he crosses in against
the widest one available then. One operator for NFL tracking and sim common
plays.

At the crossing (the first frame with the carrier at or past the line), the
defenders within 1.5 yd of his depth and 6 yd of him laterally split the line
into gaps (the lateral spaces between neighbours; an empty edge counts as an
8-yd gap at the 6-yd window). The chosen gap is the one holding his y. Reports
the chosen gap's width, the widest gap's, the share of runs taking the widest,
and the same 1.0 s earlier at the then-positions of those defenders (did the
gap he took exist yet). Rows by run family and by outcome.

usage: python3 -I holechoice.py LABEL=plays.jsonl.gz [...]"""
import gzip
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "mechanics"))
from metrics import CONCEPT_FAMILY, Play  # noqa: E402

INSIDE = ("inside_zone", "man_duo", "gap_pull")
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float("nan")


def gaps(ys, cy):
    edges = [cy - 6] + sorted(ys) + [cy + 6]
    out = []
    for a, b in zip(edges, edges[1:]):
        w = b - a
        if a == cy - 6 or b == cy + 6:
            w = 8.0 if (a == cy - 6 and b == cy + 6) else max(w, 0) + 2
        out.append((a, b, w))
    return out


for arg in sys.argv[1:]:
    label, path = arg.split("=", 1)
    rows = {}
    for line in gzip.open(path, "rt"):
        raw = json.loads(line)
        if raw.get("kind") != "run" or raw.get("carrier") is None:
            continue
        fam = CONCEPT_FAMILY.get((raw.get("cell") or {}).get("concept"))
        if fam not in INSIDE:
            continue
        p = Play(raw)
        c = raw["carrier"]
        k = next((k for k in range(p.frames) if p.pos(c, k)[0] is not None and p.pos(c, k)[0] >= 0), None)
        if not k:
            continue
        cx, cy = p.pos(c, k)
        ds = [d for d in p.who("D") if p.pos(d, k)[0] is not None and abs(p.pos(d, k)[0] - cx) <= 1.5 and abs(p.pos(d, k)[1] - cy) <= 6]
        g = gaps([p.pos(d, k)[1] for d in ds], cy)
        chosen = next(x for x in g if x[0] <= cy <= x[1])
        widest = max(x[2] for x in g)
        kb = max(0, k - round(1.0 / p.dt))
        yb = [p.pos(d, kb)[1] for d in ds if p.pos(d, kb)[1] is not None]
        gb = gaps(yb, cy)
        chosen_b = next((x for x in gb if x[0] <= cy <= x[1]), None)
        yards = raw.get("yards") or 0
        for key in (fam, "all", "all " + ("10+" if yards >= 10 else "<10")):
            r = rows.setdefault(key, {"n": 0, "w": [], "max": [], "took": 0, "wb": [], "nd": []})
            r["n"] += 1
            r["w"].append(chosen[2]); r["max"].append(widest); r["took"] += chosen[2] >= widest - 1e-9
            if chosen_b:
                r["wb"].append(chosen_b[2])
            r["nd"].append(len(ds))
    print(f"== {label}")
    for key in ("all", "all <10", "all 10+") + INSIDE:
        r = rows.get(key)
        if not r:
            continue
        print(f"  {key:12s} runs {r['n']:5d} | defenders in the window {q(r['nd'])} | chosen gap {q(r['w']):.2f} [{q(r['w'], .25):.2f},{q(r['w'], .75):.2f}]"
              f" widest {q(r['max']):.2f} | took the widest {100 * r['took'] / r['n']:.0f}% | the same gap 1 s before {q(r['wb']):.2f}")
