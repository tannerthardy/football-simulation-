"""Facing against travel for receivers and defenders, NFL (BDB 2025 weeks 1-9 dropbacks, o = orientation, dir = direction of motion, s = provider speed) against the sim (shoulders = hips + trunk twist; hips alone),
on the 0.1 s grid from the snap to the throw, one operator.
  python3 -I scripts/diag/body/facing_dist.py NFL.pkl SIM.jsonl.gz
Groups: receivers (WR TE RB, route runners offence) and defenders (CB S LB). Speed bins 1.5-3, 3-5, 5-7, 7+ yd/s, only frames with no other player within 1.5 yd (open movement).
Per cell: n frames, the angle |o - dir| percentiles p10 / p25 / p50 / p75 / p90 and the share over 20 / 45 deg; and, for frames where the path turns by 20+ deg in the next 0.3 s, the share where the facing is AHEAD of the travel in the turn (leads) against behind it (lags) and the median lead."""
import gzip, json, pickle, sys
import numpy as np
wrap = lambda a: (np.asarray(a) + 180.0) % 360.0 - 180.0
bdb = lambda ux, uy: np.degrees(np.arctan2(ux, uy))
REC = {'WR', 'TE', 'RB', 'FB'}; DEFN = {'CB', 'S', 'FS', 'SS', 'LB', 'ILB', 'OLB', 'MLB', 'DB', 'NB'}
def load_sim(path):
    out = []
    for line in gzip.open(path, 'rt'):
        r = json.loads(line); R = np.array(r['rows'], dtype=float)
        if R.shape[0] < 12 or r['throw'] is None: continue
        n = R.shape[1] // 8; R = R.reshape(R.shape[0], n, 8)
        x, y, vx, vy, f, tr, qx, qy = (R[..., i].T for i in range(8))
        sb = np.zeros_like(x); sb[:, 1:] = np.hypot(np.diff(x, axis=1), np.diff(y, axis=1)) / 0.1
        out.append(dict(side=r['side'], pos=r['pos'], x=x, y=y, s=sb, d=bdb(vx, vy), o=bdb(np.cos(f + tr), np.sin(f + tr)), h=bdb(np.cos(f), np.sin(f)), throw=int(round(r['throw'] / 0.1))))
    return out
def load_nfl(path):
    return [dict(side=p['side'], pos=p['pos'], x=np.array(p['x']), y=np.array(p['y']), s=np.array(p['s']), d=np.array(p['d']), o=np.array(p['o']), h=None, throw=int(p['throw'])) for p in pickle.load(open(path, 'rb')).values()]
def open_mask(pl):
    n = pl['x'].shape[0]; D = np.hypot(pl['x'][:, None, :] - pl['x'][None, :, :], pl['y'][:, None, :] - pl['y'][None, :, :]); D[np.arange(n), np.arange(n), :] = np.inf
    return D.min(axis=1) > 1.5
BINS = [(1.5, 3), (3, 5), (5, 7), (7, 99)]
def table(name, plays, which):
    print(f'-- {name} ({which})')
    for grp, gn in ((REC, 'receivers'), (DEFN, 'defenders')):
        for b in BINS:
            A = []; LEAD = []; N = 0
            for pl in plays:
                om = open_mask(pl); ang = wrap(pl[which] - pl['d']); F = pl['s'].shape[1]
                for i, p in enumerate(pl['pos']):
                    if p not in grp: continue
                    if (pl['side'][i] == 'O') != (grp is REC): continue
                    for k in range(3, min(pl['throw'], F) - 4):
                        if not om[i, k] or np.isnan(ang[i, k]) or not (b[0] <= pl['s'][i, k] < b[1]): continue
                        A.append(abs(ang[i, k])); N += 1
                        dd = wrap(pl['d'][i, k + 3] - pl['d'][i, k])
                        if abs(dd) >= 20 and not np.isnan(dd): LEAD.append(((ang[i, k] * np.sign(dd)), ))
            if N < 50: print(f'   {gn:10s} {b[0]}-{b[1]:<3} n {N}'); continue
            A = np.array(A); q = np.percentile(A, [10, 25, 50, 75, 90])
            L = np.array([x[0] for x in LEAD]) if LEAD else np.array([])
            lead = f'  turning n {len(L)}: leads {np.mean(L > 0):.2f} lags {np.mean(L < 0):.2f} median signed {np.median(L):+.0f}' if len(L) >= 30 else ''
            print(f'   {gn:10s} {b[0]}-{b[1]:<3} n {N:6d}  |o-dir| p10/25/50/75/90 {q[0]:4.0f} {q[1]:4.0f} {q[2]:4.0f} {q[3]:4.0f} {q[4]:4.0f}  >20: {np.mean(A > 20):.2f}  >45: {np.mean(A > 45):.2f}{lead}')
nfl = load_nfl(sys.argv[1]); table('NFL', nfl, 'o')
for f in sys.argv[2:]:
    sim = load_sim(f); table('sim ' + f.split('/')[-1], sim, 'o'); table('sim ' + f.split('/')[-1], sim, 'h')
