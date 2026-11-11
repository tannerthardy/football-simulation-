"""The back on dropbacks: when he leaves, where he goes, and whether he is open
at the throw. The same code runs on NFL tracking and on sim exports (common
play format: x = yards past the line in the offense's direction).

For every pass play with a throw (events.pass_forward), each offensive RB:
- released: he gets past the line (x > 0) or outside the box (|y - ball| > 6)
  before the throw; the first such frame is his release time;
- at 1.0 s, 1.5 s and the throw: depth, width from the ball and nearest
  defender; open = nearest defender 5+ yd (Rules + Coaching's operator);
- where at the throw: wide (width > 6), middle (width <= 6, past the line),
  backfield (still behind the line).

  python3 -I scripts/mechanics/back_release_reference.py PLAYS.jsonl.gz [--early 2.0]
"""
import argparse
import collections
import gzip
import json
import math
import statistics as st
import sys


def load(path):
    with (gzip.open if path.endswith('.gz') else open)(path, 'rt') as fh:
        for line in fh:
            if line.strip():
                yield json.loads(line)


def q(v):
    if len(v) < 4:
        return '-'
    a, b, c = st.quantiles(v, n=4)
    return f'{a:.2f}/{b:.2f}/{c:.2f}'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('plays')
    ap.add_argument('--early', type=float, default=2.0)
    a = ap.parse_args()
    R = collections.defaultdict(list)
    C = collections.Counter()
    for p in load(a.plays):
        ev = p.get('events', {})
        tt = ev.get('pass_forward')
        if p.get('kind') != 'pass' or tt is None:
            continue
        dt = p.get('dt', .1)
        n = len(p['xy'])
        k = lambda t: max(0, min(n - 1, int(round(t / dt))))
        pl = p['players']
        by = p.get('ball_y', 0)
        de = [j for j, q_ in enumerate(pl) if q_['side'] == 'D']
        P = lambda f, j: (p['xy'][f][2 * j], p['xy'][f][2 * j + 1])
        for j, q_ in enumerate(pl):
            if q_['side'] != 'O' or q_['group'] != 'RB':
                continue
            C['backs'] += 1
            kt = k(tt)
            rel = next((f for f in range(0, kt + 1) if P(f, j)[0] > 0 or abs(P(f, j)[1] - by) > 6), None)
            def near(f):
                x, y = P(f, j)
                return min(math.hypot(P(f, d)[0] - x, P(f, d)[1] - y) for d in de)
            if rel is None:
                C['stayed'] += 1
                continue
            C['released'] += 1
            R['release_t'].append(rel * dt)
            x, y = P(kt, j)
            w = abs(y - by)
            where = 'wide' if w > 6 else 'middle' if x > 0 else 'backfield'
            C['at_throw_' + where] += 1
            nd = near(kt)
            R['nearest_at_throw'].append(nd)
            C['open'] += nd >= 5
            C['open_' + where] += nd >= 5
            R['depth_at_throw'].append(x)
            R['width_at_throw'].append(w)
            for t in (1.0, 1.5):
                if t <= tt:
                    xx, yy = P(k(t), j)
                    R[f'depth_{t}'].append(xx)
                    R[f'width_{t}'].append(abs(yy - by))
            if p.get('target') == j:
                C['targeted'] += 1
                C['targeted_early' if tt < a.early else 'targeted_late'] += 1
                C['targeted_open'] += nd >= 5
    b, r = C['backs'], max(1, C['released'])
    print(f"backs on throws {b} | released before the throw {C['released']} ({100*C['released']/max(1,b):.1f}%) | stayed {C['stayed']}")
    print(f"released: open at throw {100*C['open']/r:.1f}% | nearest p25/50/75 {q(R['nearest_at_throw'])}")
    for w in ('wide', 'middle', 'backfield'):
        m = C['at_throw_' + w]
        print(f"  at throw {w:9s} {100*m/r:5.1f}% of released, open {100*C['open_'+w]/max(1,m):5.1f}%")
    print(f"release time p25/50/75 {q(R['release_t'])} s")
    for t in ('1.0', '1.5'):
        print(f"  at {t} s: depth {q(R['depth_'+t])} width {q(R['width_'+t])}")
    print(f"  at throw: depth {q(R['depth_at_throw'])} width {q(R['width_at_throw'])}")
    print(f"released back targeted {C['targeted']} ({100*C['targeted']/r:.1f}% of released; open when targeted {100*C['targeted_open']/max(1,C['targeted']):.1f}%), "
          f"before {a.early} s {C['targeted_early']}, after {C['targeted_late']}")


if __name__ == '__main__':
    sys.exit(main())
