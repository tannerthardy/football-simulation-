#!/usr/bin/env python3
"""Do underneath zone defenders move toward the throw from the target's break, or only from the QB? (Coverage, 2026-11-18)

Common-format plays (NFL and sim, one operator). Zone dropbacks; LB/DB 0-12 yd deep at the release within 8 yd of the
true line (passer at the release -> target at the arrival). The target's break: the last frame before the release at
which his heading (centred 0.2 s velocity, both moving faster than 1.5 yd/s) has turned more than 35 deg from his
heading 0.3 s earlier, or his speed has fallen under 2.5 yd/s from over 4 (a settle). Per defender, his closing
velocity toward the true line (as closing_velocity.py) at the break and 0.2 / 0.4 s after it (frames before the release
only, so no ball is in the air), split by whether the target is the eligible receiver nearest him at the break (his
area) or someone else's, and by how long before the release the break came.

    python3 -I scripts/mechanics/break_response.py plays.jsonl.gz [...]
"""
import gzip, json, math, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from metrics import coverage_family  # noqa: E402
from lane_position import seg, q, HALF  # noqa: E402


def main():
    for path in [a for a in sys.argv[1:] if a.endswith('.gz')]:
        rows = {}
        nobreak = 0; total = 0
        with gzip.open(path, 'rt') as fh:
            for line in fh:
                p = json.loads(line); ev = p.get('events', {})
                if p.get('kind') != 'pass' or p.get('target') is None or 'pass_forward' not in ev or 'pass_arrived' not in ev:
                    continue
                if coverage_family((p.get('cell') or {}).get('coverage')) != 'zone':
                    continue
                dt, xy, pl = p['dt'], p['xy'], p['players']; n = len(xy)
                fr, fa = round(ev['pass_forward'] / dt), round(ev['pass_arrived'] / dt)
                if fr - 25 < 0 or fa >= n or fr + HALF >= n:
                    continue
                pos = lambda f, i: (xy[f][2 * i], xy[f][2 * i + 1])
                vel = lambda f, i: ((pos(f + HALF, i)[0] - pos(f - HALF, i)[0]) / (2 * HALF * dt), (pos(f + HALF, i)[1] - pos(f - HALF, i)[1]) / (2 * HALF * dt))
                qbs = [i for i, x in enumerate(pl) if x['side'] == 'O' and x['group'] == 'QB']
                if not qbs:
                    continue
                t = p['target']; Q, A = pos(fr, qbs[0]), pos(fa, t)
                lag = round(0.3 / dt); brk = None
                for f in range(fr - 1, max(HALF + lag, fr - round(2.5 / dt)), -1):
                    v, v0 = vel(f, t), vel(f - lag, t)
                    s, s0 = math.hypot(*v), math.hypot(*v0)
                    turned = s > 1.5 and s0 > 1.5 and abs((math.degrees(math.atan2(v[1], v[0]) - math.atan2(v0[1], v0[0])) + 180) % 360 - 180) > 35
                    settled = s < 2.5 and s0 > 4
                    if turned or settled:
                        brk = f - lag // 2
                        break
                elig = [i for i, x in enumerate(pl) if x['side'] == 'O' and x['group'] in ('WR', 'TE', 'RB')]
                for i, x in enumerate(pl):
                    if x['side'] != 'D' or x['group'] not in ('LB', 'DB'):
                        continue
                    D = pos(fr, i)
                    if not (0 <= D[0] <= 12) or seg(D, Q, A)[0] > 8:
                        continue
                    total += 1
                    if brk is None or brk - HALF < 0:
                        nobreak += 1
                        continue
                    nearest = min(elig, key=lambda o: math.hypot(pos(brk, o)[0] - pos(brk, i)[0], pos(brk, o)[1] - pos(brk, i)[1]))
                    area = 'his area' if nearest == t else 'elsewhere'
                    before = (fr - brk) * dt
                    when = 'break 0.6 s+ before' if before >= 0.6 - 1e-9 else 'break 0.3-0.6 s before' if before >= 0.3 - 1e-9 else 'break <0.3 s before'
                    cl = lambda f: (seg(pos(f - HALF, i), Q, A)[0] - seg(pos(f + HALF, i), Q, A)[0]) / (2 * HALF * dt)
                    rec = {k: (cl(brk + round(k / dt)) if brk + round(k / dt) <= fr else None) for k in (0.0, 0.2, 0.4)}
                    for key in ('all', area, when, f'{area} / {when}'):
                        rows.setdefault(key, []).append(rec)
        print(f'{Path(path).name}: underneath defender-throws {total}, no target break detected before the release {nobreak}')
        for key in ('all', 'his area', 'elsewhere', 'break 0.6 s+ before', 'break 0.3-0.6 s before', 'break <0.3 s before', 'his area / break 0.6 s+ before', 'elsewhere / break 0.6 s+ before'):
            r = rows.get(key, [])
            if not r:
                continue
            f = lambda k: q([x[k] for x in r if x[k] is not None])
            print(f'  {key:32s} n {len(r):5d} | closing toward the line at the break {f(0.0)} | +0.2 s {f(0.2)} | +0.4 s {f(0.4)} yd/s')


if __name__ == '__main__':
    main()
