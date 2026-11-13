"""The inside-run hole, tracked: the same operator on NFL tracking and sim
exports (common play format, positions quantized to 0.1 yd by metrics.Play).

usage: python3 -I scripts/diag/run-hole.py NFL.jsonl.gz SIM.jsonl.gz [...] [--uc]

Designed runs with a carrier, by concept: inside zone, duo, power, counter,
trap (NFL: PFF primary concept; sim: the called scheme). --uc keeps under
center snaps only (QB within 2.5 yd of the line).

The line is reach-contact.py's: the OL's most advanced snap x + 0.3 yd. The
crossing frame is the first with the carrier at or past it; his y there is
the hole's y.

- Opening at the crossing: among bodies within 1.5 yd of the carrier's x,
  the nearest defender on each side of him laterally; width = the lateral
  distance between those two (one side empty within 8 yd = open side,
  counted). The same with offensive OL/TE (the blockers framing him).
- Nearest defender (any) and nearest DL to the carrier at the crossing; DL
  matches reach-contact.py.
- Formation: at 1.0, 0.6 and 0.3 s before the crossing and at the crossing,
  the defender opening around the hole's y among bodies from 1.0 yd behind
  to 2.0 yd past the line.
"""
import gzip
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "mechanics"))
from metrics import Play  # noqa: E402

ALIAS = {"INSIDE ZONE": "iz", "insideZone": "iz", "MAN": "duo", "duo": "duo", "POWER": "power", "power": "power",
         "COUNTER": "counter", "counter": "counter", "TRAP": "trap", "trap": "trap"}
BEFORE = (1.0, 0.6, 0.3, 0.0)
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float("nan")


def opening(p, k, ids, y, xlo, xhi):
    left = [y - p.pos(i, k)[1] for i in ids if p.pos(i, k)[0] is not None and xlo <= p.pos(i, k)[0] <= xhi and p.pos(i, k)[1] <= y]
    right = [p.pos(i, k)[1] - y for i in ids if p.pos(i, k)[0] is not None and xlo <= p.pos(i, k)[0] <= xhi and p.pos(i, k)[1] > y]
    left = [v for v in left if v <= 8]
    right = [v for v in right if v <= 8]
    if not left or not right:
        return None, (min(left) if left else min(right) if right else None)
    return min(left) + min(right), min(min(left), min(right))


def measure(path, uc):
    A = {}
    L = lambda k: A.setdefault(k, [])
    for line in gzip.open(path, "rt"):
        raw = json.loads(line)
        raw = raw.get("common", raw)
        if raw.get("kind") != "run" or raw.get("carrier") is None or not raw.get("xy") or raw["xy"][0] is None:
            continue
        con = ALIAS.get((raw.get("cell") or {}).get("concept") or raw.get("concept"))
        if con is None:
            continue
        p = Play(raw)
        ol = [i for i in p.who("O", "OL") if p.pos(i, 0)[0] is not None]
        if len(ol) != 5:
            continue
        los = max(p.pos(i, 0)[0] for i in ol) + 0.3
        qb = p.who("O", "QB")
        if uc and (not qb or p.pos(qb[0], 0)[0] is None or los - p.pos(qb[0], 0)[0] > 2.5):
            continue
        c = raw["carrier"]
        kc = next((k for k in range(p.frames) if p.pos(c, k)[0] is not None and p.pos(c, k)[0] >= los), None)
        L(f"{con}:runs").append(1)
        if kc is None:
            L(f"{con}:neverCrossed").append(1)
            continue
        cx, cy = p.pos(c, kc)
        dfn = p.who("D")
        frame = [i for i in p.who("O") if p.players[i]["group"] in ("OL", "TE") and i != c]
        w, near = opening(p, kc, dfn, cy, cx - 1.5, cx + 1.5)
        if w is None:
            L(f"{con}:defOpenSide").append(1)
        else:
            L(f"{con}:defWidth").append(w)
            L(f"{con}:defNearerSide").append(near)
        w, _ = opening(p, kc, frame, cy, cx - 1.5, cx + 1.5)
        if w is None:
            L(f"{con}:blkOpenSide").append(1)
        else:
            L(f"{con}:blkWidth").append(w)
        L(f"{con}:nearestDef").append(min(p.dist(d, c, kc) for d in dfn))
        dl = [p.dist(d, c, kc) for d in p.who("D", "DL")]
        if dl:
            L(f"{con}:nearestDL").append(min(dl))
        L(f"{con}:crossTime").append(kc * p.dt)
        for tb in BEFORE:
            k = kc - int(round(tb / p.dt))
            if k < 0:
                continue
            w, _ = opening(p, k, dfn, cy, los - 1.0, los + 2.0)
            if w is None:
                L(f"{con}:formOpen@{tb}").append(1)
            else:
                L(f"{con}:form@{tb}").append(w)
    return A


args = [a for a in sys.argv[1:] if a.endswith(".gz")]
uc = "--uc" in sys.argv
for path in args:
    A = measure(path, uc)
    print(f"== {os.path.basename(path)}{' (under center)' if uc else ''}")
    for con in ("iz", "duo", "power", "counter", "trap"):
        n = len(A.get(f"{con}:runs", []))
        if not n:
            continue
        g = lambda k: A.get(f"{con}:{k}", [])
        f = lambda v: f"{q(v, .25):.2f}/{q(v, .5):.2f}/{q(v, .75):.2f}"
        print(f"  {con:8s} runs {n:5d} | crossed at {q(g('crossTime'), .5):.2f} s | defender opening p25/50/75 {f(g('defWidth'))} (one side open {100 * len(g('defOpenSide')) / n:.0f}%), "
              f"nearer side {q(g('defNearerSide'), .5):.2f} | blocker frame {f(g('blkWidth'))} (open {100 * len(g('blkOpenSide')) / n:.0f}%) | nearest defender {q(g('nearestDef'), .5):.2f}, DL {q(g('nearestDL'), .5):.2f}")
        print("           opening at the hole's y before crossing: " + "  ".join(
            f"-{tb}s {q(g(f'form@{tb}'), .5):.2f} (open {100 * len(g(f'formOpen@{tb}')) / max(1, len(g(f'form@{tb}')) + len(g(f'formOpen@{tb}'))):.0f}%)" for tb in BEFORE))
