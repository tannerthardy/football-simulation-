"""When and where pass rushers on the line first meet their blocker: the same
operator on NFL tracking and sim exports (common play format, positions
quantized to 0.1 yd on both by metrics.Play).

usage: python3 -I scripts/diag/pass-contact.py NFL.jsonl.gz SIM.jsonl.gz [...]

Pass plays only, split into play action and other dropbacks (NFL: a PFF
run concept on the dropback; sim: a playaction-family concept). Line
rushers: DL/LB on the defense's side within 2 yd of the line at the snap,
paired with an OL in the play's blocks (NFL: PFF blocked-player labels;
sim: block-contact events). Interior: between the tackles' snap y; edge:
within 4 yd outside them.

Every time is from the play's line start, the median first movement
(0.15 yd from the snap position, interpolated) of its five OL, so the
tracked NFL snap frame's lag cancels. Contact: the first frame his nearest
paired OL is within 1.0 yd. Depth: yards behind the line (+ = rusher in the
backfield). The window ends at the throw, the play's end or 3.0 s; rushers
it cuts off are counted as censored, not as never crossing.
"""
import gzip
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "mechanics"))
from metrics import Play  # noqa: E402

SLICES = (0.3, 0.5, 0.7, 1.0, 1.5)
CAP = 3.0
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float("nan")


def first_move(p, i, thr=0.15):
    x0, y0 = p.pos(i, 0)
    prev = 0.0
    for k in range(1, min(p.frames, 25)):
        x, y = p.pos(i, k)
        if x is None:
            return None
        d = ((x - x0) ** 2 + (y - y0) ** 2) ** 0.5
        if d >= thr:
            return (k - 1 + (thr - prev) / max(d - prev, 1e-9)) * p.dt
        prev = d
    return None


def play_action(raw):
    c = (raw.get("cell") or {}).get("concept")
    if raw.get("source") == "sim":
        return bool(c) and c.startswith("pa_")
    return c not in (None, "NA", "")


def measure(path):
    A = {}

    def add(key, v):
        A.setdefault(key, []).append(v)

    for line in gzip.open(path, "rt"):
        raw = json.loads(line)
        raw = raw.get("common", raw)
        if raw.get("kind") != "pass" or not raw.get("xy") or raw["xy"][0] is None:
            continue
        p = Play(raw)
        ol = [i for i in p.who("O", "OL") if p.pos(i, 0)[0] is not None]
        if len(ol) != 5:
            continue
        starts = [first_move(p, i) for i in ol]
        if any(s is None for s in starts):
            continue
        t0 = sorted(starts)[2]
        cut = min(p.end, p.events.get("pass_forward", CAP), CAP)
        last = min(p.frames - 1, int(cut / p.dt + 1e-9))
        cohort = "pa" if play_action(raw) else "dropback"
        add((cohort, "plays"), 1)
        add((cohort, "lineStart"), t0)
        ol.sort(key=lambda i: p.pos(i, 0)[1])
        ylo, yhi = p.pos(ol[0], 0)[1], p.pos(ol[-1], 0)[1]
        role = {ol[0]: "T", ol[4]: "T", ol[1]: "G", ol[3]: "G", ol[2]: "C"}
        for i in ol:
            for t in SLICES:
                k = p.k(t0 + t)
                if k <= last and p.pos(i, k)[0] is not None:
                    add((cohort, f"olRetreat:{role[i]}@{t}"), p.pos(i, 0)[0] - p.pos(i, k)[0])
        pairs = {}
        for b, d in raw.get("blocks") or ():
            if b in role and p.players[d]["side"] == "D":
                pairs.setdefault(d, set()).add(b)
        for d, bl in pairs.items():
            if p.players[d]["group"] not in ("DL", "LB"):
                continue
            x0, y0 = p.pos(d, 0)
            if x0 is None or not 0 < x0 <= 2.0:
                continue
            g = "interior" if ylo < y0 < yhi else "edge" if ylo - 4 <= y0 <= yhi + 4 else None
            if g is None:
                continue
            add((cohort, f"{g}:rushers"), 1)
            add((cohort, f"{g}:snapDepth"), -x0)
            add((cohort, f"{g}:snapSep"), min(p.dist(b, d, 0) for b in bl))
            for t in SLICES:
                k = p.k(t0 + t)
                if k > last:
                    continue
                add((cohort, f"{g}:depth@{t}"), -p.pos(d, k)[0])
                add((cohort, f"{g}:sep@{t}"), min(p.dist(b, d, k) for b in bl))
            cross = None
            for k in range(1, last + 1):
                a, b = p.pos(d, k - 1)[0], p.pos(d, k)[0]
                if a is None or b is None:
                    break
                if b <= 0 < a:
                    cross = (k - 1 + a / (a - b)) * p.dt
                    break
            if cross is None:
                add((cohort, f"{g}:crossCensored" if last < p.k(CAP) else f"{g}:neverBy3s"), 1)
            else:
                add((cohort, f"{g}:cross"), cross - t0)
            hit = next((k for k in range(last + 1) if min(p.dist(b, d, k) for b in bl) <= 1.0), None)
            if hit is None:
                add((cohort, f"{g}:noContact"), 1)
                continue
            b = min(bl, key=lambda b: p.dist(b, d, hit))
            add((cohort, f"{g}:contact"), hit * p.dt - t0)
            add((cohort, f"{g}:contactDepth"), -p.pos(d, hit)[0])
            add((cohort, f"{g}:contactRetreat"), p.pos(b, 0)[0] - p.pos(b, hit)[0])
            add((cohort, f"{g}:crossedBeforeContact"), 1.0 if p.pos(d, hit)[0] <= 0 else 0.0)
    return A


def row(v):
    return f"{q(v, .1):+.2f}/{q(v, .25):+.2f}/{q(v, .5):+.2f}/{q(v, .75):+.2f}/{q(v, .9):+.2f} (n {len(v)})"


for path in sys.argv[1:]:
    A = measure(path)
    print(f"== {os.path.basename(path)}")
    for c in ("dropback", "pa"):
        n = len(A.get((c, "plays"), []))
        if not n:
            continue
        print(f" {c}: plays {n}; line start from the snap frame p10/25/50/75/90 {row(A[(c, 'lineStart')])}")
        for t in SLICES:
            print(f"   OL retreat @{t}s after line start  T {q(A.get((c, f'olRetreat:T@{t}'), []), .5):+.2f}  G {q(A.get((c, f'olRetreat:G@{t}'), []), .5):+.2f}  C {q(A.get((c, f'olRetreat:C@{t}'), []), .5):+.2f}")
        for g in ("interior", "edge"):
            r = len(A.get((c, f"{g}:rushers"), []))
            if not r:
                continue
            cr, cen, nev = A.get((c, f"{g}:cross"), []), len(A.get((c, f"{g}:crossCensored"), [])), len(A.get((c, f"{g}:neverBy3s"), []))
            ct = A.get((c, f"{g}:contact"), [])
            print(f"  {g}: rushers {r}; crossed {len(cr)}, cut off by the throw/end {cen}, never by 3 s {nev}; contact {len(ct)}, none {len(A.get((c, f'{g}:noContact'), []))}")
            print(f"    at the snap: depth {q(A[(c, f'{g}:snapDepth')], .5):+.2f}, separation to his blocker {row(A[(c, f'{g}:snapSep')])}")
            print(f"    cross the line, s after line start   {row(cr)}")
            print(f"    contact (1.0 yd), s after line start {row(ct)}")
            print(f"    rusher depth at contact, yd          {row(A.get((c, f'{g}:contactDepth'), []))}")
            print(f"    blocker retreat at contact, yd       {row(A.get((c, f'{g}:contactRetreat'), []))}")
            cb = A.get((c, f"{g}:crossedBeforeContact"), [])
            print(f"    crossed the line before contact      {100 * sum(cb) / max(1, len(cb)):.0f}%")
            print("    median depth / separation @" + "  ".join(f"{t}s {q(A.get((c, f'{g}:depth@{t}'), []), .5):+.2f}/{q(A.get((c, f'{g}:sep@{t}'), []), .5):.2f}" for t in SLICES))
