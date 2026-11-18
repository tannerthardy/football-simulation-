#!/usr/bin/env python3
"""What underneath zone men drift on (Coverage, 2026-11-18): each underneath LB/DB's lateral velocity at the release
(0-12 yd deep, within 8 yd of the release->catch line, zone throws), regressed on three keys taken 0.5 s before the
release: (1) the mean lateral velocity of the eligible receivers in his band (within 5 yd of him laterally, 0-20 yd
deep); (2) the same for receivers one band outside him (5-12 yd laterally, either side); (3) the QB's lateral velocity
(launch drift). Reports slope (OLS through the origin and with intercept), correlation and the median key size.
    python3 -I scripts/mechanics/flow_drift.py plays.jsonl.gz [...]
"""
import gzip, json, math, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from metrics import coverage_family  # noqa: E402
from lane_position import seg  # noqa: E402

HALF = 2  # central difference +/- frames


def fit(xs, ys):
    n = len(xs)
    if n < 10:
        return None
    mx, my = sum(xs) / n, sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs); sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys)); syy = sum((y - my) ** 2 for y in ys)
    b = sxy / sxx if sxx else float('nan'); r = sxy / math.sqrt(sxx * syy) if sxx and syy else float('nan')
    b0 = sum(x * y for x, y in zip(xs, ys)) / sum(x * x for x in xs) if any(xs) else float('nan')
    med = sorted(abs(x) for x in xs)[n // 2]
    return n, b, b0, r, med


def main():
    for path in [a for a in sys.argv[1:] if a.endswith('.gz')]:
        K = {'band': ([], []), 'outside band': ([], []), 'QB launch drift': ([], [])}
        with gzip.open(path, 'rt') as fh:
            for line in fh:
                p = json.loads(line); ev = p.get('events', {})
                if p.get('kind') != 'pass' or p.get('target') is None or 'pass_forward' not in ev or 'pass_arrived' not in ev:
                    continue
                if coverage_family((p.get('cell') or {}).get('coverage')) != 'zone':
                    continue
                dt, xy, pl = p['dt'], p['xy'], p['players']; n = len(xy)
                fr, fa = round(ev['pass_forward'] / dt), round(ev['pass_arrived'] / dt)
                f0 = fr - round(0.5 / dt)
                if f0 - HALF < 0 or fr + HALF >= n or fa >= n:
                    continue
                pos = lambda f, i: (xy[f][2 * i], xy[f][2 * i + 1])
                vel = lambda f, i: tuple((pos(f + HALF, i)[k] - pos(f - HALF, i)[k]) / (2 * HALF * dt) for k in (0, 1))
                qbs = [i for i, x in enumerate(pl) if x['side'] == 'O' and x['group'] == 'QB']
                if not qbs:
                    continue
                Q, A = pos(fr, qbs[0]), pos(fa, p['target'])
                elig = [i for i, x in enumerate(pl) if x['side'] == 'O' and x['group'] in ('WR', 'TE', 'RB', 'FB')]
                qv = vel(f0, qbs[0])[1]
                for i, x in enumerate(pl):
                    if x['side'] != 'D' or x['group'] not in ('LB', 'DB'):
                        continue
                    D = pos(fr, i)
                    if not (0 <= D[0] <= 12) or seg(D, Q, A)[0] > 8:
                        continue
                    my = vel(fr, i)[1]
                    D0 = pos(f0, i)
                    def mean_lat(lo, hi):
                        v = [vel(f0, j)[1] for j in elig if lo <= abs(pos(f0, j)[1] - D0[1]) < hi and 0 <= pos(f0, j)[0] <= 20]
                        return sum(v) / len(v) if v else None
                    for key, k in (('band', mean_lat(0, 5)), ('outside band', mean_lat(5, 12)), ('QB launch drift', qv)):
                        if k is not None:
                            K[key][0].append(k); K[key][1].append(my)
        print(f'{Path(path).name}: underneath zone man lateral velocity at the release vs keys 0.5 s before')
        for key, (xs, ys) in K.items():
            f = fit(xs, ys)
            if f:
                print(f'  {key:16s} n {f[0]:5d} | slope {f[1]:5.2f} (through 0: {f[2]:5.2f}) | r {f[3]:5.2f} | median |key| {f[4]:4.2f} yd/s')


if __name__ == '__main__':
    main()
