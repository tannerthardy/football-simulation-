"""WR screen catcher around the throw and the catch, same code on NFL and sim.

For caught WR screens with at most --ol-max released OL (screen_reference.py's
definition), the receiver's upfield velocity (vx, yd/s; +x is upfield) at
catch - 0.3 s, the catch, +0.3 s and +0.5 s; upfield gain at +0.5 and +1.0 s;
lateral speed at the catch; depth at the throw; throw time and air time.

--now 1 keeps "now" screens (receiver moved under 2.5 yd laterally from the
snap to the throw); --now 0 keeps the rest (bubbles and other moving catches).
--type keeps one sim screen type.

  python3 -I scripts/mechanics/screen_catch_reference.py out/screens/nfl-screens.jsonl.gz --now 1
"""
import argparse
import os
import statistics as st
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from screen_reference import load, measure, pos  # noqa: E402


def q(v):
    return '/'.join(f'{x:.2f}' for x in (st.quantiles(v, n=4) if len(v) > 3 else [float('nan')] * 3))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('plays', nargs='+')
    ap.add_argument('--ol-max', type=int, default=1)
    ap.add_argument('--now', choices=['0', '1'])
    ap.add_argument('--type')
    a = ap.parse_args()
    keys = ['throw', 'air', 'vx-0.3', 'vx0', 'vx+0.3', 'vx+0.5', 'dx+0.5', 'dx+1.0', 'vy0', 'depth_throw']
    R = {k: [] for k in keys}
    for p in load(a.plays):
        m = measure(p)
        if not m or m['group'] != 'WR' or not m['caught'] or m.get('released_ol', 99) > a.ol_max:
            continue
        if a.type and m['type'] != a.type:
            continue
        r = p['screen']['receiver']
        dt = p.get('dt', .1)
        n = len(p['xy'])
        k = lambda t: max(0, min(n - 1, int(round(t / dt))))
        tc, tt = m['t_catch'], m['t_throw']
        lat = abs(pos(p, k(tt), r)[1] - pos(p, 0, r)[1])
        if a.now == '1' and lat > 2.5 or a.now == '0' and lat <= 2.5:
            continue

        def v(t):
            p0, p1 = pos(p, k(t - .1), r), pos(p, k(t + .1), r)
            return (p1[0] - p0[0]) / .2, (p1[1] - p0[1]) / .2
        R['throw'].append(tt)
        R['air'].append(tc - tt)
        for o, key in ((-.3, 'vx-0.3'), (0, 'vx0'), (.3, 'vx+0.3'), (.5, 'vx+0.5')):
            R[key].append(v(tc + o)[0])
        R['vy0'].append(abs(v(tc)[1]))
        x0 = pos(p, k(tc), r)[0]
        R['dx+0.5'].append(pos(p, k(tc + .5), r)[0] - x0)
        R['dx+1.0'].append(pos(p, k(tc + 1), r)[0] - x0)
        R['depth_throw'].append(pos(p, k(tt), r)[0])
    print(f"n {len(R['throw'])}  p25/50/75")
    for key in keys:
        print(f"  {key:12s} {q(R[key])}")


if __name__ == '__main__':
    sys.exit(main())
