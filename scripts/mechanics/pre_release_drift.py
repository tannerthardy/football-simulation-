#!/usr/bin/env python3
"""What underneath zone defenders are doing 0.6 s before the release, relative to the throw (Coverage, 2026-11-18).

Common-format plays (NFL and sim, one operator). Zone dropbacks with target, pass_forward, pass_arrived; LB/DB 0-12 yd
deep at the release within 8 yd of the true line (passer at the release -> target at the arrival). At -0.6 s and at the
release, his velocity (+/-0.2 s central difference) split three ways: closing toward the true line; depth (downfield,
+ deeper); lateral toward the catch point's side (+ toward it). Split by: throw side (the catch point on his side of
the passer, or across); whether the target is the eligible receiver nearest him at the release (his area) or someone
else's. Positions only: the common format has no facing, so "facing the QB" and the QB's eyes/shoulders timing are
not measurable here.

    python3 -I scripts/mechanics/pre_release_drift.py plays.jsonl.gz [more ...]
"""
import gzip, json, math, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from metrics import coverage_family  # noqa: E402
from lane_position import seg, q, HALF  # noqa: E402


def main():
    for path in [a for a in sys.argv[1:] if a.endswith('.gz')]:
        rows = {}
        with gzip.open(path, 'rt') as fh:
            for line in fh:
                p = json.loads(line); ev = p.get('events', {})
                if p.get('kind') != 'pass' or p.get('target') is None or 'pass_forward' not in ev or 'pass_arrived' not in ev:
                    continue
                if coverage_family((p.get('cell') or {}).get('coverage')) != 'zone':
                    continue
                dt, xy, pl = p['dt'], p['xy'], p['players']; n = len(xy)
                fr, fa = round(ev['pass_forward'] / dt), round(ev['pass_arrived'] / dt)
                f6 = fr - round(0.6 / dt)
                if f6 - HALF < 0 or fr + HALF >= n or fa >= n:
                    continue
                pos = lambda f, i: (xy[f][2 * i], xy[f][2 * i + 1])
                vel = lambda f, i: ((pos(f + HALF, i)[0] - pos(f - HALF, i)[0]) / (2 * HALF * dt), (pos(f + HALF, i)[1] - pos(f - HALF, i)[1]) / (2 * HALF * dt))
                qbs = [i for i, x in enumerate(pl) if x['side'] == 'O' and x['group'] == 'QB']
                if not qbs:
                    continue
                t = p['target']; Q, A = pos(fr, qbs[0]), pos(fa, t)
                elig = [i for i, x in enumerate(pl) if x['side'] == 'O' and x['group'] in ('WR', 'TE', 'RB')]
                for i, x in enumerate(pl):
                    if x['side'] != 'D' or x['group'] not in ('LB', 'DB'):
                        continue
                    D = pos(fr, i)
                    if not (0 <= D[0] <= 12) or seg(D, Q, A)[0] > 8:
                        continue
                    side = 'his side' if (D[1] - Q[1]) * (A[1] - Q[1]) > 0 else 'across'
                    nearest = min(elig, key=lambda o: math.hypot(pos(fr, o)[0] - D[0], pos(fr, o)[1] - D[1])) if elig else None
                    area = 'his area' if nearest == t else 'elsewhere'
                    rec = {}
                    for lab, f in (('-0.6', f6), ('rel', fr)):
                        P, v = pos(f, i), vel(f, i)
                        np = seg(P, Q, A)
                        # closing: rate his distance to the line falls (two-sample, as closing_velocity.py)
                        cl = (seg(pos(f - HALF, i), Q, A)[0] - seg(pos(f + HALF, i), Q, A)[0]) / (2 * HALF * dt)
                        lat = v[1] * (1 if A[1] >= P[1] else -1)
                        rec[lab] = (cl, v[0], lat)
                    for key in ('all', side, area, f'{side}/{area}'):
                        rows.setdefault(key, []).append(rec)
        print(Path(path).name)
        for key in ('all', 'his side', 'across', 'his area', 'elsewhere', 'his side/his area', 'his side/elsewhere', 'across/his area', 'across/elsewhere'):
            r = rows.get(key, [])
            if not r:
                continue
            s = lambda lab, k: q([x[lab][k] for x in r])
            print(f'  {key:20s} n {len(r):5d} | -0.6 s closing {s("-0.6", 0)} depth {s("-0.6", 1)} lateral-to-ball {s("-0.6", 2)} | release closing {s("rel", 0)} depth {s("rel", 1)} lateral {s("rel", 2)}')


if __name__ == '__main__':
    main()
