#!/usr/bin/env python3
"""Underneath zone defenders' depth speed at the release by time since the QB set (Coverage, 2026-11-18).

QB set (the same cue for both sides): after he has given 1 yd from his snap spot, the first frame his speed (+/-0.2 s)
is under 1.2 yd/s. Population as lane_position.py (0-12 yd deep, within 8 yd of the true line).

    python3 -I scripts/mechanics/set_depth.py plays.jsonl.gz [...]
"""
import gzip, json, math, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from metrics import coverage_family  # noqa: E402
from lane_position import seg, q, HALF  # noqa: E402


def main():
    for path in [a for a in sys.argv[1:] if a.endswith('.gz')]:
        b = {}
        with gzip.open(path, 'rt') as fh:
            for line in fh:
                p = json.loads(line); ev = p.get('events', {})
                if p.get('kind') != 'pass' or p.get('target') is None or 'pass_forward' not in ev or 'pass_arrived' not in ev:
                    continue
                if coverage_family((p.get('cell') or {}).get('coverage')) != 'zone':
                    continue
                dt, xy, pl = p['dt'], p['xy'], p['players']; n = len(xy)
                fr, fa = round(ev['pass_forward'] / dt), round(ev['pass_arrived'] / dt)
                if fr + HALF >= n or fa >= n or fr < 3:
                    continue
                pos = lambda f, i: (xy[f][2 * i], xy[f][2 * i + 1])
                vel = lambda f, i: ((pos(min(n - 1, f + HALF), i)[0] - pos(max(0, f - HALF), i)[0]) / (2 * HALF * dt), (pos(min(n - 1, f + HALF), i)[1] - pos(max(0, f - HALF), i)[1]) / (2 * HALF * dt))
                qbs = [i for i, x in enumerate(pl) if x['side'] == 'O' and x['group'] == 'QB']
                if not qbs:
                    continue
                qb = qbs[0]; x0 = pos(0, qb)[0]; setf = None
                for f in range(HALF, fr + 1):
                    if x0 - pos(f, qb)[0] >= 1 and math.hypot(*vel(f, qb)) < 1.2:
                        setf = f; break
                since = None if setf is None else (fr - setf) * dt
                key = 'no set seen before the release' if since is None else '0-0.2 s' if since < 0.2 else '0.2-0.5 s' if since < 0.5 else '0.5-1.0 s' if since < 1.0 else '1.0 s+'
                Q, A = pos(fr, qb), pos(fa, p['target'])
                for i, x in enumerate(pl):
                    if x['side'] != 'D' or x['group'] not in ('LB', 'DB'):
                        continue
                    D = pos(fr, i)
                    if not (0 <= D[0] <= 12) or seg(D, Q, A)[0] > 8:
                        continue
                    b.setdefault(key, []).append(vel(fr, i)[0])
        print(Path(path).name)
        for k in ('no set seen before the release', '0-0.2 s', '0.2-0.5 s', '0.5-1.0 s', '1.0 s+'):
            v = b.get(k, [])
            if v:
                print(f'  QB set {k:32s} n {len(v):5d} | depth speed at the release {q(v)} yd/s | >= 1 yd/s deeper {100 * sum(1 for x in v if x >= 1) / len(v):.0f}%')


if __name__ == '__main__':
    main()
