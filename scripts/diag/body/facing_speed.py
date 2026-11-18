"""Speed against the angle between facing and travel, and the turn from a slow start, one operator for NFL tracking (BDB 2025 weeks 1-9 dropbacks; o = orientation, dir = direction of motion,
s = provider speed) and the sim (shoulders = hip facing + trunk twist; travel = velocity heading; speed = |velocity|), both on the 0.1 s grid from the snap.
  python3 -I scripts/diag/yac/facing_speed.py NFL.pkl SIM.jsonl.gz
Part 1: frames with speed >= 1.5 yd/s and no other player within 1.5 yd (open movement), the angle |o - dir| in 30-degree bins: speed p50 / p90 and the share of that player's own top speed
(his p98 over the sample, >= 200 frames). The sim is also binned by its hips (facing alone). The cap's own curve (DIR_CAP: 1 to 20 deg, a straight line to the body's backpedal share at 130
deg, flat beyond) is printed for the median backpedal share of the sampled defenders.
Part 2: defenders (CB S LB DB) whose travel turns 90-130 (and 110-156) degrees off their facing at k0 from a slow start (2-4 yd/s) within 0.8 s of a throw: speed, travel-vs-facing angle and
facing turned, every 0.1 s for 0.8 s (medians). Events need a sustained new heading (within 30 degrees of the 0.8 s heading over the last 0.3 s), a heading change of at least 45 degrees, and speed
of at least 3 yd/s at 0.8 s. NFL orientation is a sensor estimate (shoulders) that can lag; speed below 1.5 yd/s is left out of part 1 and the heading is read at the end of the window for part 2."""
import gzip, json, math, pickle, sys
import numpy as np

DEF = {'CB', 'S', 'FS', 'SS', 'LB', 'ILB', 'OLB', 'MLB', 'DB', 'NB'}
wrap = lambda a: (np.asarray(a) + 180.0) % 360.0 - 180.0
bdb = lambda ux, uy: np.degrees(np.arctan2(ux, uy))


def load_sim(path):
    plays = []
    for line in gzip.open(path, 'rt'):
        r = json.loads(line); R = np.array(r['rows'], dtype=float)
        if R.shape[0] < 12 or r['throw'] is None: continue
        n = R.shape[1] // 8; R = R.reshape(R.shape[0], n, 8)
        x, y, vx, vy, f, tr, qx, qy = (R[..., i].T for i in range(8))
        plays.append(dict(side=r['side'], pos=r['pos'], keys=r['key'], x=x, y=y, s=np.hypot(vx, vy), d=bdb(vx, vy), o=bdb(np.cos(f + tr), np.sin(f + tr)), h=bdb(np.cos(f), np.sin(f)), q=np.hypot(qx, qy), qd=bdb(qx, qy),
                          throw=int(round(r['throw'] / 0.1)), back=r['back']))
    return plays


def load_nfl(path):
    plays = []
    for k, p in pickle.load(open(path, 'rb')).items():
        plays.append(dict(side=p['side'], pos=p['pos'], keys=p['ids'], x=np.array(p['x']), y=np.array(p['y']), s=np.array(p['s']), d=np.array(p['d']), o=np.array(p['o']), h=None, q=None, qd=None, throw=p['throw'], back=None))
    return plays


def open_mask(pl):
    n, F = pl['x'].shape
    D = np.hypot(pl['x'][:, None, :] - pl['x'][None, :, :], pl['y'][:, None, :] - pl['y'][None, :, :]); D[np.arange(n), np.arange(n), :] = np.inf
    return D.min(axis=1) > 1.5


def part1(name, plays, hips=False):
    top = {}
    for pl in plays:
        for i, k in enumerate(pl['keys']):
            v = pl['s'][i][~np.isnan(pl['s'][i])]
            top.setdefault(k, []).extend(v[3:].tolist())
    p98 = {k: np.percentile(v, 98) for k, v in top.items() if len(v) >= 200}
    bins = [(0, 30), (30, 60), (60, 90), (90, 120), (120, 150), (150, 180.01)]
    rows = {b: ([], []) for b in bins}
    for pl in plays:
        om = open_mask(pl); ang = np.abs(wrap((pl['h'] if hips else pl['o']) - pl['d']))
        for i, k in enumerate(pl['keys']):
            if k not in p98: continue
            ok = om[i] & (pl['s'][i] >= 1.5) & ~np.isnan(ang[i]); ok[:3] = False
            for b in bins:
                m = ok & (ang[i] >= b[0]) & (ang[i] < b[1])
                if m.any(): rows[b][0].extend(pl['s'][i][m].tolist()); rows[b][1].extend((pl['s'][i][m] / p98[k]).tolist())
    print(f"-- {name}: speed (yd/s) p50 / p90 and share of own top speed p50 / p90 by |facing - travel|" + (' (hips)' if hips else ' (shoulders)'))
    for b in bins:
        v, sh = np.array(rows[b][0]), np.array(rows[b][1])
        if len(v) < 50: continue
        print(f"   {b[0]:3d}-{int(b[1]):3d} deg  n {len(v):7d}  speed {np.percentile(v, 50):.2f} / {np.percentile(v, 90):.2f}   share {np.percentile(sh, 50):.2f} / {np.percentile(sh, 90):.2f}")
    return rows


def events(plays, lo, hi, t0=-1, t1=5):
    out = []
    for pl in plays:
        for i, p in enumerate(pl['pos']):
            if pl['side'][i] != 'D' or p not in DEF: continue
            s, d, o = pl['s'][i], pl['d'][i], pl['o'][i]; F = len(s)
            for k0 in range(max(3, pl['throw'] + t0), min(F - 9, pl['throw'] + t1) + 1):
                if not (2.0 <= s[k0] <= 4.0) or np.isnan(o[k0]) or np.isnan(d[k0 + 8]): continue
                a1 = abs(wrap(d[k0 + 8] - o[k0]))
                if not (lo <= a1 <= hi) or s[k0 + 8] < 3.0: continue
                if abs(wrap(d[k0 + 8] - d[k0])) < 45: continue
                if np.any(np.abs(wrap(d[k0 + 5:k0 + 9] - d[k0 + 8])) > 30): continue
                rq = pl['q'][i][k0:k0 + 9] if pl['q'] is not None else np.full(9, np.nan)
                rd = np.abs(wrap(pl['qd'][i][k0:k0 + 9] - o[k0:k0 + 9])) if pl['qd'] is not None else np.full(9, np.nan)
                out.append((s[k0:k0 + 9], np.abs(wrap(o[k0:k0 + 9] - d[k0:k0 + 9])), np.abs(wrap(o[k0:k0 + 9] - o[k0])), rq, rd))
                break
    return out


def part2(name, plays, lo, hi):
    E = events(plays, lo, hi)
    if len(E) < 5: print(f"-- {name}: {lo}-{hi} deg turn: n {len(E)} (too few)"); return
    S = np.array([e[0] for e in E]); A = np.array([e[1] for e in E]); T = np.array([e[2] for e in E]); Q = np.array([e[3] for e in E]); QD = np.array([e[4] for e in E])
    print(f"-- {name}: travel turns {lo}-{hi} deg off facing from 2-4 yd/s, n {len(E)}; facing turned in 0.4 s median {np.median(T[:, 4]) / 0.4:.0f} deg/s")
    print('   t (s)        ' + ' '.join(f"{k / 10:5.1f}" for k in range(9)))
    print('   speed        ' + ' '.join(f"{np.nanmedian(S[:, k]):5.2f}" for k in range(9)))
    print('   travel-facing' + ' '.join(f"{np.nanmedian(A[:, k]):5.0f}" for k in range(9)))
    print('   facing turned' + ' '.join(f"{np.nanmedian(T[:, k]):5.0f}" for k in range(9)))
    if not np.all(np.isnan(Q)):
        print('   request speed' + ' '.join(f"{np.nanmedian(Q[:, k]):5.2f}" for k in range(9)))
        print('   req-facing   ' + ' '.join(f"{np.nanmedian(QD[:, k]):5.0f}" for k in range(9)))


if __name__ == '__main__':
    nfl, sim = load_nfl(sys.argv[1]), load_sim(sys.argv[2])
    print(f"plays: NFL {len(nfl)}, ours {len(sim)}")
    part1('NFL', nfl); part1('ours', sim); part1('ours', sim, hips=True)
    back = np.median([b for pl in sim for b, p in zip(pl['back'], pl['pos']) if p in DEF])
    f = lambda a: 1.0 if a <= 20 else back if a >= 130 else 1 - (1 - back) * (a - 20) / 110
    print(f"-- DIR_CAP curve (share of forward top speed) for the median defender backpedal share {back:.2f}: " + ', '.join(f"{a}: {f(a):.2f}" for a in (15, 45, 75, 105, 135, 165)))
    for lo, hi in ((90, 130), (110, 156)):
        part2('NFL', nfl, lo, hi); part2('ours', sim, lo, hi)
