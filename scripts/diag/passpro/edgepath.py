#!/usr/bin/env python3
"""The edge rusher's path to the tackle: one operator for tracked and
simulated dropbacks in the common format (metrics.Play). Observation only.

Per tackle on each dropback, his edge rusher is the defender on the line
(under 2 yd off it) 0.5-5 yd outside him at the snap, nearest him, who
crosses 1 yd behind the line by 2 s. Until the throw, from the snap:
  speed      his speed; upfield and inward (toward the ball) velocity
  aim        the angle between his velocity and the line to the QB, and to
             the tackle's outside shoulder (0.5 yd outside him), in degrees
  contact    the first frame he is within 1.5 yd of the tackle: when, and
             his depth and width outside the tackle then

    python3 -I scripts/diag/passpro/edgepath.py PLAYS.jsonl.gz [PLAYS ...]
"""
import gzip
import json
import math
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'mechanics'))
from metrics import Play  # noqa: E402

FILES = [a for a in sys.argv[1:] if a.endswith('.gz')]
TIMES = (0.3, 0.5, 0.75, 1.0, 1.25, 1.5)


def q(v, f):
    v = sorted(v)
    return v[int(f * (len(v) - 1))] if v else float('nan')


def ang(a, b):
    d = math.degrees(math.atan2(a[1], a[0]) - math.atan2(b[1], b[0]))
    return abs((d + 180) % 360 - 180)


def vel(p, i, k):
    a, b = max(0, k - 1), min(p.frames - 1, k + 1)
    (x0, y0), (x1, y1) = p.pos(i, a), p.pos(i, b)
    if x0 is None or x1 is None or a == b:
        return None
    return (x1 - x0) / ((b - a) * p.dt), (y1 - y0) / ((b - a) * p.dt)


for path in FILES:
    acc = defaultdict(list)
    with gzip.open(path, 'rt') as f:
        for line in f:
            p = Play(json.loads(line))
            qbs = p.who('O', 'QB')
            ol = sorted(p.who('O', 'OL'), key=lambda i: p.pos(i, 0)[1] or 0)
            if p.raw.get('kind') != 'pass' or len(qbs) != 1 or len(ol) != 5:
                continue
            qb = qbs[0]
            throw = p.events.get('pass_forward')
            end = throw if throw is not None else min(p.end, 4.0)
            by = p.raw['ball_y']
            for side, tk in ((-1, ol[0]), (1, ol[4])):
                ty = p.pos(tk, 0)[1]
                cands = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and -0.5 <= p.pos(d, 0)[0] <= 2.0
                         and 0.5 <= side * (p.pos(d, 0)[1] - ty) <= 5]
                if not cands:
                    continue
                ru = min(cands, key=lambda d: side * (p.pos(d, 0)[1] - ty))
                kr = p.k(min(end, 2.0))
                if min((p.pos(ru, k)[0] for k in range(kr + 1) if p.pos(ru, k)[0] is not None), default=9) > -1.0:
                    continue
                acc['n'].append(1)
                acc['w0'].append(side * (p.pos(ru, 0)[1] - ty))
                kc = next((k for k in range(1, p.k(end) + 1) if p.dist(ru, tk, k) <= 1.5), None)
                if kc is not None:
                    acc['ct'].append(kc * p.dt)
                    acc['cd'].append(-p.pos(ru, kc)[0])
                    acc['cw'].append(side * (p.pos(ru, kc)[1] - p.pos(tk, kc)[1]))
                if kc is not None:
                    # In the rep: both bodies' upfield and inward speed after contact.
                    for dtc in (0.2, 0.4, 0.6, 0.8):
                        k = kc + p.k(dtc)
                        if k * p.dt > end or k >= p.frames:
                            break
                        vr, vk = vel(p, ru, k), vel(p, tk, k)
                        if vr is None or vk is None:
                            continue
                        acc[f'rr{dtc}'].append(-vr[0])
                        acc[f'kk{dtc}'].append(-vk[0])
                        acc[f'ri{dtc}'].append(-side * vr[1])
                        acc[f'gap{dtc}'].append(p.dist(ru, tk, k))
                        (rx, ry), (qx, qy) = p.pos(ru, k), p.pos(qb, k)
                        if rx is not None and qx is not None and math.hypot(*vr) > 1:
                            acc[f'rq{dtc}'].append(ang(vr, (qx - rx, qy - ry)))
                            acc[f'rs{dtc}'].append(math.hypot(*vr))
                            acc[f'qd{dtc}'].append(rx - qx)
                for t in TIMES:
                    if t > end or (kc is not None and kc * p.dt < t):
                        continue   # until contact: the path he chose
                    k = p.k(t)
                    v = vel(p, ru, k)
                    if v is None:
                        continue
                    (rx, ry), (kx, kyy), (qx, qy) = p.pos(ru, k), p.pos(tk, k), p.pos(qb, k)
                    if None in (rx, kx, qx):
                        continue
                    acc[f's{t}'].append(math.hypot(*v))
                    acc[f'up{t}'].append(-v[0])
                    acc[f'in{t}'].append(-side * v[1])
                    if math.hypot(*v) > 1:
                        acc[f'aq{t}'].append(ang(v, (qx - rx, qy - ry)))
                        acc[f'at{t}'].append(ang(v, (kx - rx, kyy + side * .5 - ry)))
    print(f"== {Path(path).name}: {len(acc['n'])} edge rushers; snap width outside the tackle p25/50/75 "
          f"{q(acc['w0'], .25):.2f}/{q(acc['w0'], .5):.2f}/{q(acc['w0'], .75):.2f}; contact with him {100 * len(acc['ct']) / max(1, len(acc['n'])):.0f}% "
          f"at {q(acc['ct'], .25):.2f}/{q(acc['ct'], .5):.2f}/{q(acc['ct'], .75):.2f} s, depth {q(acc['cd'], .5):.2f}, width outside him {q(acc['cw'], .5):.2f}")
    for t in TIMES:
        if len(acc[f's{t}']) < 20:
            continue
        print(f"   {t:4.2f}s (n {len(acc[f's{t}']):5d}) speed {q(acc[f's{t}'], .5):.2f}  upfield {q(acc[f'up{t}'], .5):+.2f}  inward {q(acc[f'in{t}'], .25):+.2f}/{q(acc[f'in{t}'], .5):+.2f}/{q(acc[f'in{t}'], .75):+.2f}"
              f"  | off the line to: QB {q(acc[f'aq{t}'], .5):.0f} deg, tackle's outside shoulder {q(acc[f'at{t}'], .5):.0f} deg")
    for dtc in (0.2, 0.4, 0.6, 0.8):
        if len(acc[f'rr{dtc}']) < 20:
            continue
        print(f"   contact +{dtc:.1f}s (n {len(acc[f'rr{dtc}']):5d}) upfield speed: rusher {q(acc[f'rr{dtc}'], .5):+.2f}, tackle {q(acc[f'kk{dtc}'], .5):+.2f}"
              f" | rusher inward {q(acc[f'ri{dtc}'], .5):+.2f}, speed {q(acc[f'rs{dtc}'], .5):.2f}, off the line to the QB {q(acc[f'rq{dtc}'], .25):.0f}/{q(acc[f'rq{dtc}'], .5):.0f}/{q(acc[f'rq{dtc}'], .75):.0f} deg,"
              f" short of the QB's depth {q(acc[f'qd{dtc}'], .5):.2f} yd | apart {q(acc[f'gap{dtc}'], .5):.2f} yd")
