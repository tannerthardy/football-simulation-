#!/usr/bin/env python3
"""Route lateral flow, concept mix vs route shape (Integration, 2026-11-18; Coverage's flow table, flow_drift.py on #793).

Same population and key as flow_drift.py: zone pass plays; for each underneath LB / DB (0-12 yd deep and within 8 yd of
the release->catch line at the release), the eligible receivers in his band (within 5 yd of him laterally, 0-20 yd
deep) and one band outside (5-12 yd), each receiver's lateral speed 0.5 s before the release. Each such receiver is
classed by his own track, the same operator on both sides (no route labels), from the snap to the arrival:
  sit     - moving under 1.5 yd/s at the arrival, having been 3+ yd past the line (hitch, curl, stick, hook, sit);
  across  - lateral displacement from the snap 7+ yd toward the ball's side of him (crossers, drags, overs, slants);
  out     - lateral displacement 5+ yd toward his own sideline (outs, flats, corners, wheels);
  vertical- 12+ yd past the line at the arrival and none of the above (go, seam, post);
  other   - the rest (short and mixed).
Reports, per side and band: the share of receivers in each class, their median |lateral speed| at the key, and a
decomposition of the median-of-class mix: with share s and class speed v, flow = sum s v; the gap ours - NFL splits
into mix = sum (s_ours - s_NFL) v_NFL and shape = sum s_ours (v_ours - v_NFL).
    python3 -I scripts/diag/routes/flow_mix.py <nfl-plays.jsonl.gz> <sim-plays.jsonl.gz>
"""
import gzip, json, statistics as st, sys
from pathlib import Path
import os
sys.path.insert(0, os.environ.get('MECH_DIR') or str(Path(__file__).resolve().parents[2] / 'mechanics'))  # #793's helpers (lane_position)
from metrics import coverage_family  # noqa: E402
from lane_position import seg  # noqa: E402

HALF = 2
CLASSES = ('sit', 'across', 'out', 'vertical', 'other')


def classify(xy, i, f_snap, fa, dt, los_x, dirn, ball_y):
    x0, y0 = xy[f_snap][2 * i], xy[f_snap][2 * i + 1]
    xa, ya = xy[fa][2 * i], xy[fa][2 * i + 1]
    xb, yb = xy[fa - HALF][2 * i], xy[fa - HALF][2 * i + 1]
    speed = ((xa - xb) ** 2 + (ya - yb) ** 2) ** 0.5 / (HALF * dt)
    depth = (xa - los_x) * dirn
    deepest = max((xy[f][2 * i] - los_x) * dirn for f in range(f_snap, fa + 1))
    inward = 1 if ball_y > y0 else -1
    lat = (ya - y0) * inward
    if speed < 1.5 and deepest >= 3:
        return 'sit'
    if lat >= 7:
        return 'across'
    if lat <= -5:
        return 'out'
    if depth >= 12:
        return 'vertical'
    return 'other'


def collect(path):
    R = {'band': [], 'outside band': []}
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
            if f0 - HALF < 0 or fr + HALF >= n or fa >= n or fa - HALF < 0:
                continue
            pos = lambda f, i: (xy[f][2 * i], xy[f][2 * i + 1])
            vel = lambda f, i: tuple((pos(f + HALF, i)[k] - pos(f - HALF, i)[k]) / (2 * HALF * dt) for k in (0, 1))
            qbs = [i for i, x in enumerate(pl) if x['side'] == 'O' and x['group'] == 'QB']
            if not qbs:
                continue
            Q, A = pos(fr, qbs[0]), pos(fa, p['target'])
            # The line and the attack direction from the QB at the snap (he is behind the line, facing it).
            elig = [i for i, x in enumerate(pl) if x['side'] == 'O' and x['group'] in ('WR', 'TE', 'RB', 'FB')]
            q0 = pos(0, qbs[0]); ballx = sum(pos(0, i)[0] for i in elig) / len(elig) if elig else q0[0]
            dirn = 1 if A[0] > q0[0] else -1
            los_x = q0[0] + dirn * 1.0 if abs(ballx - q0[0]) > 8 else min((pos(0, i)[0] for i in elig), key=lambda x: abs(x - q0[0]))
            ball_y = p.get('ball_y', q0[1])
            cls = {j: classify(xy, j, 0, fa, dt, los_x, dirn, ball_y) for j in elig}
            for i, x in enumerate(pl):
                if x['side'] != 'D' or x['group'] not in ('LB', 'DB'):
                    continue
                D = pos(fr, i)
                if not (0 <= (D[0] - los_x) * dirn <= 12) or seg(D, Q, A)[0] > 8:
                    continue
                D0 = pos(f0, i)
                for key, lo, hi in (('band', 0, 5), ('outside band', 5, 12)):
                    for j in elig:
                        if lo <= abs(pos(f0, j)[1] - D0[1]) < hi and 0 <= (pos(f0, j)[0] - los_x) * dirn <= 20:
                            R[key].append((cls[j], abs(vel(f0, j)[1])))
    return R


def main():
    nfl, sim = collect(sys.argv[1]), collect(sys.argv[2])
    for key in ('band', 'outside band'):
        print(f'\n## {key}: receivers by route class (own track), |lateral speed| 0.5 s before the release')
        print('| class | NFL share | NFL median yd/s | ours share | ours median yd/s |')
        print('|---|---|---|---|---|')
        a, b = nfl[key], sim[key]
        sv = {}
        for c in CLASSES:
            va = [v for k, v in a if k == c]; vb = [v for k, v in b if k == c]
            sa, sb = len(va) / max(1, len(a)), len(vb) / max(1, len(b))
            ma, mb = (st.median(va) if va else 0.0), (st.median(vb) if vb else 0.0)
            sv[c] = (sa, ma, sb, mb)
            print(f'| {c} | {sa:.2f} | {ma:.2f} | {sb:.2f} | {mb:.2f} |')
        fa = sum(s * v for s, v, _, _ in sv.values()); fb = sum(s * v for _, _, s, v in sv.values())
        mix = sum((sb - sa) * ma for sa, ma, sb, _ in sv.values()); shape = sum(sb * (mb - ma) for _, ma, sb, mb in sv.values())
        print(f'overall median: NFL {st.median(v for _, v in a):.2f} (n {len(a)}), ours {st.median(v for _, v in b):.2f} (n {len(b)});'
              f' class-mix flow NFL {fa:.2f}, ours {fb:.2f}: gap {fb - fa:+.2f} = mix {mix:+.2f} + shape {shape:+.2f}')


if __name__ == '__main__':
    main()
