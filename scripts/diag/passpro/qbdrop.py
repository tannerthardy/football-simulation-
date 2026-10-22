#!/usr/bin/env python3
"""The QB's drop and the pocket around him: one operator for tracked and
simulated dropbacks in the common format (metrics.Play). Observation only.

Per dropback, split by the QB's depth at the snap (shotgun/pistol: 2.5+ yd
behind the ball; under centre otherwise), while the ball is in his hands:
  depth       the QB's depth behind the line at 0.5 ... 3.0 s
  set         where the drop ends: his depth (and when) at the first frame
              his speed falls under 1 yd/s after reaching 2 yd/s
  deepest     his deepest point before the throw, and when
  tackle gap  the QB's depth minus the deeper tackle's (how far in front of
              the launch point the edge is being blocked), at 2.0 / 2.5 s
  pressure    a defender within 2 yd before the throw (metrics.py), by the
              set depth's tercile

    python3 -I scripts/diag/passpro/qbdrop.py PLAYS.jsonl.gz [PLAYS ...]
"""
import gzip
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'mechanics'))
from metrics import PRESSURE_OPERATOR, Play  # noqa: E402

FILES = [a for a in sys.argv[1:] if a.endswith('.gz')]
TIMES = (0.5, 1.0, 1.5, 2.0, 2.5, 3.0)


def q(v, f):
    v = sorted(v)
    return v[int(f * (len(v) - 1))] if v else float('nan')


for path in FILES:
    acc = defaultdict(lambda: defaultdict(list))
    with gzip.open(path, 'rt') as f:
        for line in f:
            p = Play(json.loads(line))
            qbs = p.who('O', 'QB')
            if p.raw.get('kind') != 'pass' or len(qbs) != 1:
                continue
            qb = qbs[0]
            ol = sorted(p.who('O', 'OL'), key=lambda i: p.pos(i, 0)[1] or 0)
            if len(ol) != 5 or p.pos(qb, 0)[0] is None:
                continue
            throw = p.events.get('pass_forward')
            end = throw if throw is not None else min(p.end, 4.0)
            if end < 1.0:
                continue
            look = 'gun' if p.pos(qb, 0)[0] < -2.5 else 'under'
            a = acc[look]
            a['n'].append(1)
            a['snap'].append(-p.pos(qb, 0)[0])
            for t in TIMES:
                if t <= end:
                    x = p.pos(qb, p.k(t))[0]
                    if x is not None:
                        a[f'd{t}'].append(-x)
            # The drop ends where he first slows under 1 yd/s after moving at 2+.
            kg = next((k for k in range(0, p.k(end) + 1) if p.speed(qb, k) >= 2.0), None)
            ks = None if kg is None else next((k for k in range(kg, p.k(end) + 1) if p.speed(qb, k) < 1.0), None)
            deep = max(range(0, p.k(end) + 1), key=lambda k: -(p.pos(qb, k)[0] if p.pos(qb, k)[0] is not None else 0))
            a['deep'].append(-p.pos(qb, deep)[0])
            a['deep_t'].append(deep * p.dt)
            if ks is not None:
                a['set'].append(-p.pos(qb, ks)[0])
                a['set_t'].append(ks * p.dt)
            for t in (2.0, 2.5):
                if t <= end:
                    k = p.k(t)
                    tx = [p.pos(o, k)[0] for o in (ol[0], ol[4])]
                    if None not in tx and p.pos(qb, k)[0] is not None:
                        a[f'gap{t}'].append(-p.pos(qb, k)[0] - max(-x for x in tx))
            pressure = p.pressure(qb)
            if pressure.value is None:
                a['pressure_unknown'].append(1)
            if ks is not None and pressure.value is not None:
                a['press_by_set'].append((-p.pos(qb, ks)[0], pressure.value == 1.0))
            if throw is not None:
                a['throw'].append(throw)
                a['at_throw'].append(-p.pos(qb, p.k(throw))[0])
    print(f'== {Path(path).name}')
    for look in ('gun', 'under'):
        a = acc[look]
        n = len(a['n'])
        if not n:
            continue
        print(f"  pressure: {PRESSURE_OPERATOR}; {look} unknown windows {len(a['pressure_unknown'])}")
        m = lambda k: f"{q(a[k], .5):.2f}"
        iq = lambda k: f"{q(a[k], .25):.2f}/{q(a[k], .5):.2f}/{q(a[k], .75):.2f}"
        print(f"  {look:5s} n {n:5d} | snap {m('snap')} | depth at " + ' '.join(f"{t:.1f}s {m(f'd{t}')}" for t in TIMES)
              + f" | set at {iq('set_t')} s, depth {iq('set')} | deepest {iq('deep')} at {iq('deep_t')} s | at the throw {iq('at_throw')} (throw p50 {m('throw')})"
              + f" | tackle in front of QB at 2.0 / 2.5 s {m('gap2.0')} / {m('gap2.5')}")
        ps = sorted(a['press_by_set'])
        if len(ps) >= 30:
            third = len(ps) // 3
            parts = [ps[:third], ps[third:2 * third], ps[2 * third:]]
            print('        pressure by set depth tercile: ' + '  '.join(
                f"{part[0][0]:.1f}-{part[-1][0]:.1f} yd {100 * sum(x[1] for x in part) / len(part):.0f}%" for part in parts))
