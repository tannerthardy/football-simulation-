#!/usr/bin/env python3
"""What the A-gap man does after the snap, by where he aligned: one operator
for tracked and simulated plays in the common format (metrics.Play).
Observation only.

The A-gap man is the defender on the line (under 2 yd off the ball) nearest
the centre laterally at the snap. His alignment is his distance from the
centre as a share of the split to the guard on his side: shade (under
0.45), gap (0.45-0.8), 2i (0.8+). After the snap, at 0.5 and 1.0 s:
  upfield    how far he has come across the line toward the backfield (yd)
  across     lateral motion toward the centre (+) or the guard (-) (yd)
  playside   lateral motion toward the run's side (+, runs: the carrier's
             side at 1.0 s) (yd)
  engaged    a lineman within 1.5 yd of him at 0.5 s; doubled: two

    python3 -I scripts/diag/align/agapstep.py PLAYS.jsonl.gz [PLAYS ...]
"""
import gzip
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'mechanics'))
from metrics import ENGAGED_YD, Play  # noqa: E402

FILES = [a for a in sys.argv[1:] if a.endswith('.gz')]


def q(v, f):
    v = sorted(v)
    return v[int(f * (len(v) - 1))] if v else float('nan')


for path in FILES:
    acc = defaultdict(lambda: defaultdict(list))
    with gzip.open(path, 'rt') as f:
        for line in f:
            p = Play(json.loads(line))
            kind = p.raw.get('kind')
            ol = sorted(p.who('O', 'OL'), key=lambda i: p.pos(i, 0)[1] or 0)
            if kind not in ('run', 'pass') or len(ol) != 5 or not p.live(1.0):
                continue
            c = ol[2]
            (cx, cy) = p.pos(c, 0)
            if cx is None:
                continue
            line_d = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and -0.5 <= p.pos(d, 0)[0] <= 2.0]
            if not line_d:
                continue
            a = min(line_d, key=lambda d: abs(p.pos(d, 0)[1] - cy))
            y0 = p.pos(a, 0)[1]
            side = 1 if y0 > cy else -1
            g = ol[3] if side == 1 else ol[1]
            share = abs(y0 - cy) / max(.3, abs(p.pos(g, 0)[1] - cy))
            if share > 1.15:
                continue
            spot = 'shade' if share < .45 else 'gap' if share < .8 else '2i'
            run_side = None
            if kind == 'run' and p.raw.get('carrier') is not None:
                ry = p.pos(p.raw['carrier'], p.k(1.0))[1]
                if ry is not None and abs(ry - p.raw['ball_y']) > .5:
                    run_side = 1 if ry > p.raw['ball_y'] else -1
            key = (kind, spot)
            acc[key]['n'].append(1)
            for t in (.5, 1.0):
                x, y = p.pos(a, p.k(t))
                if x is None:
                    continue
                acc[key][f'up{t}'].append(p.pos(a, 0)[0] - x)
                acc[key][f'across{t}'].append(-(y - y0) * side)
                if run_side is not None:
                    acc[key][f'play{t}'].append((y - y0) * run_side)
            k5 = p.k(.5)
            near = [o for o in ol if p.dist(o, a, k5) <= ENGAGED_YD]
            acc[key]['eng'].append(len(near) >= 1)
            acc[key]['dbl'].append(len(near) >= 2)
    print(f'== {Path(path).name}')
    for kind in ('run', 'pass'):
        tot = sum(len(acc[(kind, s)]['n']) for s in ('shade', 'gap', '2i'))
        for spot in ('shade', 'gap', '2i'):
            v = acc[(kind, spot)]
            n = len(v['n'])
            if n < 20:
                continue
            fmt = lambda k: f"{q(v[k], .25):+.2f}/{q(v[k], .5):+.2f}/{q(v[k], .75):+.2f}"
            print(f"  {kind:4s} {spot:5s} n {n:5d} ({100 * n / tot:.0f}%) | upfield 0.5s {fmt('up0.5')} 1.0s {fmt('up1.0')}"
                  f" | across(+centre) 0.5s {fmt('across0.5')} 1.0s {fmt('across1.0')}"
                  + (f" | playside 1.0s {fmt('play1.0')}" if v['play1.0'] else '')
                  + f" | engaged 0.5s {100 * sum(v['eng']) / n:.0f}% doubled {100 * sum(v['dbl']) / n:.0f}%")
