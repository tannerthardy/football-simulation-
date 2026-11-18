#!/usr/bin/env python3
"""Where the underneath defenders stand at the release relative to the throwing lane (Coverage, 2026-11-18).

One operator for NFL and sim plays in the common format (metrics.py). Zone-coverage dropbacks with a target, a
pass_forward and a pass_arrived. At the release frame: the passer, the target and his velocity (central difference,
+/-0.2 s, as metrics.py), and the led line: passer -> target carried along his velocity for a judged flight
(distance / 20 yd/s, iterated). The true line: passer -> the target at the arrival. Population: LB and DB with
depth 0-12 yd past the line at the release and within 8 yd of the true line. Per defender: distance to the led line,
distance to the true line, in front of the receiver on the led line (projection between passer and receiver) or
behind it, and how his distance to the led line changed over the 0.6 s before the release (negative = drifting
toward it; the line is the one at the release). Grouped by the target's motion at the release (settling under 2.5
yd/s; vertical if downfield speed >= lateral; else across).

    python3 -I scripts/mechanics/lane_position.py plays.jsonl.gz [more.jsonl.gz ...]
"""
import gzip, json, math, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from metrics import coverage_family  # noqa: E402

VB, HALF = 20.0, 2


def seg(p, a, b):
    ux, uy = b[0] - a[0], b[1] - a[1]
    L = ux * ux + uy * uy or 1.0
    k = ((p[0] - a[0]) * ux + (p[1] - a[1]) * uy) / L
    kc = min(1.0, max(0.0, k))
    return math.hypot(p[0] - a[0] - ux * kc, p[1] - a[1] - uy * kc), k


def q(v):
    v = sorted(v)
    return '/'.join(f'{v[int(f * (len(v) - 1))]:.2f}' for f in (0.25, 0.5, 0.75)) if v else '-'


def main():
    rows = {}
    for path in sys.argv[1:]:
        with gzip.open(path, 'rt') as fh:
            for line in fh:
                p = json.loads(line)
                ev = p.get('events', {})
                if p.get('kind') != 'pass' or p.get('target') is None or 'pass_forward' not in ev or 'pass_arrived' not in ev:
                    continue
                if coverage_family((p.get('cell') or {}).get('coverage')) != 'zone':
                    continue
                dt, xy, pl = p['dt'], p['xy'], p['players']
                n = len(xy)
                fr, fa = round(ev['pass_forward'] / dt), round(ev['pass_arrived'] / dt)
                if fr - HALF < 0 or fr + HALF >= n or fa >= n or fr - round(0.6 / dt) < 0:
                    continue
                pos = lambda f, i: (xy[f][2 * i], xy[f][2 * i + 1])
                qbs = [i for i, x in enumerate(pl) if x['side'] == 'O' and x['group'] == 'QB']
                if not qbs:
                    continue
                t = p['target']
                Q, R = pos(fr, qbs[0]), pos(fr, t)
                a0, a1 = pos(fr - HALF, t), pos(fr + HALF, t)
                v = ((a1[0] - a0[0]) / (2 * HALF * dt), (a1[1] - a0[1]) / (2 * HALF * dt))
                sp = math.hypot(*v)
                cls = 'settling' if sp < 2.5 else 'vertical' if abs(v[0]) >= abs(v[1]) else 'across'
                tf = math.hypot(R[0] - Q[0], R[1] - Q[1]) / VB
                for _ in range(4):
                    Lp = (R[0] + v[0] * tf, R[1] + v[1] * tf)
                    tf = math.hypot(Lp[0] - Q[0], Lp[1] - Q[1]) / VB
                A = pos(fa, t)
                for i, x in enumerate(pl):
                    if x['side'] != 'D' or x['group'] not in ('LB', 'DB'):
                        continue
                    D = pos(fr, i)
                    if not (0 <= D[0] <= 12):
                        continue
                    dtrue, _ = seg(D, Q, A)
                    if dtrue > 8:
                        continue
                    dled, k = seg(D, Q, Lp)
                    # Projection onto the passer->receiver-now line: in front (between them) or behind.
                    _, kr = seg(D, Q, R)
                    Dm = pos(fr - round(0.6 / dt), i)
                    dled0, _ = seg(Dm, Q, Lp)
                    for key in (cls, 'all'):
                        rows.setdefault(key, []).append((dled, dtrue, kr < 1.0, dled - dled0))
    src = ', '.join(Path(s).name for s in sys.argv[1:])
    print(f'lane position at the release (zone, underneath LB/DB within 8 yd of the true line) - {src}')
    for key in ('across', 'settling', 'vertical', 'all'):
        r = rows.get(key, [])
        if not r:
            continue
        front = sum(1 for x in r if x[2])
        print(f'  {key:8s} n {len(r):5d} | to led line p25/50/75 {q([x[0] for x in r])} | to true line {q([x[1] for x in r])}'
              f' | within 1.5 yd of led line {100 * sum(1 for x in r if x[0] <= 1.5) / len(r):.0f}% | in front of receiver {100 * front / len(r):.0f}%'
              f' | change over the last 0.6 s {q([x[3] for x in r])} yd')


if __name__ == '__main__':
    main()
