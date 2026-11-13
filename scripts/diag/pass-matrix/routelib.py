"""Route shapes for the pass matrix: one feature vector per receiver path, the same code on NFL and sim.

A route is his position relative to where he lined up (x downfield, lateral toward his own sideline) at 0.3,
0.6, ..., 3.0 s after the snap, read up to the throw + 0.4 s and held at the last position read after that; plus
whether he aligned in the backfield. Named by the k nearest labelled NFL routes (BDB 2025 routeRan).

  python3 -I routelib.py build <bdb dir> <weeks e.g. 1,2,3> <out.npz>     # library from labelled NFL routes
  python3 -I routelib.py test <bdb dir> <week> <lib.npz>                  # held-out agreement with the labels
"""
import sys, csv, math, collections as C
import numpy as np

TIMES = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30]  # frames (0.1 s)

def features(path, side, end):
    """path: [(x, y)] from the snap at 0.1 s (x: yards past the line); side: +1 if his sideline is +y."""
    x0, y0 = path[0]
    last = min(len(path) - 1, end)
    v = []
    for t in TIMES:
        f = min(t, last)
        v += [path[f][0] - x0, (path[f][1] - y0) * side]
    v.append(4.0 if x0 < -2.5 else 0.0)  # backfield, weighted like 4 yd of separation
    return v

def nfl_routes(D, weeks):
    plays = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(f'{D}/plays.csv')) if r['isDropback'] in ('TRUE', 'True')}
    lab = {}
    for r in csv.DictReader(open(f'{D}/player_play.csv')):
        k = (r['gameId'], r['playId'])
        if k in plays and r['routeRan'] not in ('', 'NA'): lab[(k, r['nflId'])] = r['routeRan']
    for wk in weeks:
        T = C.defaultdict(lambda: C.defaultdict(dict)); ev = C.defaultdict(dict); dirn = {}; ball = {}
        for r in csv.DictReader(open(f'{D}/tracking_week_{wk}.csv')):
            k = (r['gameId'], r['playId'])
            if k not in plays: continue
            f = int(r['frameId'])
            if r['event'] not in ('', 'NA'): ev[k].setdefault(r['event'], f)
            if r['nflId'] in ('', 'NA'):
                if r['event'] == 'ball_snap': ball[k] = float(r['y'])
                continue
            dirn[k] = r['playDirection']
            if (k, r['nflId']) in lab: T[k][r['nflId']][f] = (float(r['x']), float(r['y']))
        for k, P in T.items():
            e = ev[k]; snap = e.get('ball_snap')
            if snap is None or k not in ball: continue
            left = dirn[k] == 'left'; pr = plays[k]
            los = float(pr['absoluteYardlineNumber']); los = 120 - los if left else los
            by = 53.3 - ball[k] if left else ball[k]
            end = e.get('pass_forward', e.get('qb_sack', e.get('qb_strip_sack', snap + 35))) + 4 - snap
            for nid, fr in P.items():
                path = []
                for f in range(snap, snap + 40):
                    if f not in fr: break
                    x, y = fr[f]; x = 120 - x if left else x; y = 53.3 - y if left else y
                    path.append((x - los, y))
                if len(path) < 8: continue
                side = 1 if path[0][1] > by else -1
                yield lab[(k, nid)], features(path, side, end)

class Lib:
    def __init__(self, path):
        z = np.load(path, allow_pickle=True); self.X = z['X']; self.y = z['y']
    def name(self, v, k=15):
        d = np.linalg.norm(self.X - np.asarray(v), axis=1)
        idx = np.argpartition(d, k)[:k]
        w = C.Counter()
        for i in idx: w[self.y[i]] += 1.0 / (0.5 + d[i])
        return w.most_common(1)[0][0]

if __name__ == '__main__':
    mode, D = sys.argv[1], sys.argv[2]
    if mode == 'build':
        rows = list(nfl_routes(D, sys.argv[3].split(',')))
        np.savez_compressed(sys.argv[4], X=np.array([v for _, v in rows], dtype=np.float32), y=np.array([l for l, _ in rows]))
        print(len(rows), C.Counter(l for l, _ in rows).most_common())
    else:
        lib = Lib(sys.argv[4]); M = C.defaultdict(C.Counter)
        for l, v in nfl_routes(D, [sys.argv[3]]): M[l][lib.name(v)] += 1
        tot = sum(sum(c.values()) for c in M.values()); ok = sum(c[l] for l, c in M.items())
        for l, c in sorted(M.items(), key=lambda t: -sum(t[1].values())):
            n = sum(c.values()); print(f'{l:7} n {n:5}  agree {100 * c[l] / n:5.1f}%  ' + ', '.join(f'{k} {100 * v / n:.0f}%' for k, v in c.most_common(4)))
        print(f'overall {100 * ok / tot:.1f}% of {tot}')
