"""What a body can do as a function of the angle between its orientation and its direction of travel, NFL (BDB 2025 weeks 1-9 dropbacks) against the sim, one operator.
  python3 -I scripts/diag/body/facing_law.py nfl OUT.npz [weeks=1,...,9]          build the NFL player-frame table from the raw tracking
  python3 -I scripts/diag/body/facing_law.py sim SIM.jsonl.gz [SIM2 ...] OUT.npz  build the sim table from facing-sim.mts exports (hips = facing; 'o' = hips + trunk twist, the shoulders)
  python3 -I scripts/diag/body/facing_law.py report NFL.npz SIM.npz [--out report.md]

Per player and frame on the 0.1 s grid from the snap to the throw (the release for the NFL): position -> speed s (centred 0.2 s difference of position; the same on both sides), direction of travel (the heading of that displacement), acceleration along travel
a_par = (s(t+0.2) - s(t-0.2)) / 0.4, orientation o (NFL: the provider's `o`; sim: shoulders = hips + trunk), angle |wrap(o - heading)| in 0-180, yaw rate of o (centred 0.2 s), and whether anybody is within 1.5 yd (open movement is used throughout).
Position groups: receivers (WR TE RB FB, offence), db (CB S FS SS DB, defence), lb (LB ILB OLB MLB), dl (DE DT NT DL), ol (T G C OT OG), qb."""
import sys, csv, json, gzip, math
import numpy as np
mode = sys.argv[1]
GRP = {}
for p in ('WR', 'TE', 'RB', 'FB', 'HB'): GRP[p] = 0
for p in ('CB', 'S', 'FS', 'SS', 'DB', 'NB'): GRP[p] = 1
for p in ('LB', 'ILB', 'OLB', 'MLB'): GRP[p] = 2
for p in ('DE', 'DT', 'NT', 'DL'): GRP[p] = 3
for p in ('T', 'G', 'C', 'OT', 'OG'): GRP[p] = 4
GRP['QB'] = 5
GNAME = ['receivers', 'db', 'lb', 'dl', 'ol', 'qb']
wrap = lambda a: (a + 180.0) % 360.0 - 180.0
def feats(x, y, o, group, throw):
    """x, y, o: (players, frames) arrays on the 0.1 s grid; returns rows (players x valid frames) of [group, s, ang, a_par, yaw, open, frame]."""
    n, F = x.shape
    D = np.hypot(x[:, None, :] - x[None, :, :], y[:, None, :] - y[None, :, :]); D[np.arange(n), np.arange(n), :] = np.inf; opn = D.min(axis=1) > 1.5
    out = []
    for k in range(3, min(throw, F) - 3):
        dx = x[:, k + 1] - x[:, k - 1]; dy = y[:, k + 1] - y[:, k - 1]; s = np.hypot(dx, dy) / 0.2
        sp = np.hypot(x[:, k + 3] - x[:, k + 1], y[:, k + 3] - y[:, k + 1]) / 0.2; sm = np.hypot(x[:, k - 1] - x[:, k - 3], y[:, k - 1] - y[:, k - 3]) / 0.2
        a = (sp - sm) / 0.4
        head = np.degrees(np.arctan2(dx, dy)); ang = np.abs(wrap(o[:, k] - head)); yaw = np.abs(wrap(o[:, k + 1] - o[:, k - 1])) / 0.2
        m = (s >= 1.5) & opn[:, k] & ~np.isnan(ang) & ~np.isnan(yaw) & (group >= 0)
        for i in np.nonzero(m)[0]: out.append((group[i], s[i], ang[i], a[i], yaw[i], k))
    return out
if mode == 'nfl':
    D = '/home/user/football-simulation-/data/raw/bdb2025/big-data-bowl-data'
    weeks = [int(w) for w in (sys.argv[3] if len(sys.argv) > 3 else '1,2,3,4,5,6,7,8,9').split(',')]
    pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
    plays = {}
    for r in csv.DictReader(open(f'{D}/plays.csv')):
        if r['isDropback'] == 'TRUE' and r['passResult'] in ('C', 'I', 'S', 'R', 'IN') and r['playNullifiedByPenalty'] != 'Y' and r['qbSpike'] != 'TRUE': plays[(r['gameId'], r['playId'])] = r
    rows = []
    for w in weeks:
        cur, buf = None, []
        def flush(key, buf):
            if key not in plays or not buf: return
            by = {}
            for r in buf:
                if r[2] != 'NA': by.setdefault(r[2], []).append(r)
            if len(by) != 22: return
            snap = rel = None
            for r in buf:
                if r[17] == 'ball_snap' and snap is None: snap = int(r[4])
                if r[17] in ('pass_forward', 'pass_shovel') and rel is None: rel = int(r[4])
            if snap is None: return
            last = rel if rel is not None else snap + 30
            F = last - snap + 1
            if F < 12: return
            ids = list(by); X = np.full((22, F), np.nan); Y = np.full((22, F), np.nan); O = np.full((22, F), np.nan); grp = np.full(22, -1)
            for i, nid in enumerate(ids):
                grp[i] = GRP.get(pos.get(nid, ''), -1)
                for r in by[nid]:
                    f = int(r[4]) - snap
                    if 0 <= f < F: X[i, f] = float(r[10]); Y[i, f] = float(r[11]); O[i, f] = float(r[15]) if r[15] != 'NA' else np.nan
            if np.isnan(X).any() or np.isnan(Y).any(): return
            rows.extend(feats(X, Y, O, grp, F))
        for r in csv.reader(open(f'{D}/tracking_week_{w}.csv')):
            if r[0] == 'gameId': continue
            k = (r[0], r[1])
            if k != cur: flush(cur, buf); cur = k; buf = []
            if k in plays: buf.append(r)
        flush(cur, buf); print('week', w, len(rows), file=sys.stderr)
    np.savez_compressed(sys.argv[2], rows=np.array(rows, dtype=np.float32))
elif mode == 'sim':
    rows = []
    paths = sys.argv[2:-1]; outp = sys.argv[-1]
    for path in paths:
        for line in gzip.open(path, 'rt'):
            r = json.loads(line); R = np.array(r['rows'], dtype=float)
            if R.shape[0] < 12 or r['throw'] is None: continue
            n = R.shape[1] // 8; R = R.reshape(R.shape[0], n, 8)
            x, y, vx, vy, f, tr, qx, qy = (R[..., i].T for i in range(8))
            o = np.degrees(np.arctan2(np.cos(f + tr), np.sin(f + tr)))  # bdb: degrees from +y toward +x
            grp = np.array([GRP.get(p, -1) for p in r['pos']])
            rows.extend(feats(x, y, o, grp, int(round(r['throw'] / 0.1))))
    np.savez_compressed(outp, rows=np.array(rows, dtype=np.float32))
else:
    N = np.load(sys.argv[2])['rows']; S = np.load(sys.argv[3])['rows']
    OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
    lines = []; P = lambda s='': lines.append(s)
    P(f'## Speed and acceleration against the angle between orientation and travel (open movement, speed 1.5 yd/s and over; NFL {len(N)} player-frames, sim {len(S)})\n')
    ANG = [(0, 20), (20, 45), (45, 75), (75, 105), (105, 135), (135, 165), (165, 181)]
    SB = [(1.5, 3), (3, 5), (5, 7), (7, 99)]
    q = lambda v, p: float(np.percentile(v, p)) if len(v) else float('nan')
    for gi in (0, 1, 2, 3):
        P(f'### {GNAME[gi]}\n'); P('| angle off travel | speed band | NFL n | NFL share | NFL speed p50 / p99 | NFL accel p50 / p90 | NFL yaw rate p50 / p90 | sim n | sim share | sim speed p50 / p99 | sim accel p50 / p90 | sim yaw p50 / p90 |'); P('|---|---|---|---|---|---|---|---|---|---|---|---|')
        for lo, hi in ANG:
            for sl, sh in SB:
                cells = []
                for A in (N, S):
                    M = A[(A[:, 0] == gi)]
                    tot = (M[:, 1] >= sl) & (M[:, 1] < sh); T = M[tot]
                    sel = T[(T[:, 2] >= lo) & (T[:, 2] < hi)]
                    cells.append((len(sel), len(sel) / max(1, len(T)), sel))
                if cells[0][0] < 40 and cells[1][0] < 40: continue
                f = lambda c: (f'{c[0]} | {c[1]:.2f} | {q(c[2][:, 1], 50):.1f} / {q(c[2][:, 1], 99):.1f} | {q(c[2][:, 3], 50):+.1f} / {q(c[2][:, 3], 90):+.1f} | {q(c[2][:, 4], 50):.0f} / {q(c[2][:, 4], 90):.0f}' if c[0] >= 40 else f'{c[0]} | | | | ')
                P(f'| {lo}-{min(hi, 180)} | {sl}-{sh if sh < 99 else "+"} | {f(cells[0])} | {f(cells[1])} |')
        P('')
    P('### Top speed by angle (p99 of speed, yd/s) and acceleration capacity (p90 of the forward acceleration along travel, from 1.5-4 yd/s), all speeds\n')
    P('| group | angle off travel | NFL n | NFL top speed p99 | NFL accel p90 (1.5-4 yd/s) | sim n | sim top speed p99 | sim accel p90 |'); P('|---|---|---|---|---|---|---|---|')
    for gi in (0, 1, 2, 3):
        for lo, hi in ANG:
            c = []
            for A in (N, S):
                M = A[(A[:, 0] == gi) & (A[:, 2] >= lo) & (A[:, 2] < hi)]; slow = M[(M[:, 1] < 4)]
                c.append((len(M), q(M[:, 1], 99), q(slow[:, 3], 90) if len(slow) > 30 else float('nan')))
            if c[0][0] < 40 and c[1][0] < 40: continue
            P(f'| {GNAME[gi]} | {lo}-{min(hi, 180)} | {c[0][0]} | {c[0][1]:.1f} | {c[0][2]:+.1f} | {c[1][0]} | {c[1][1]:.1f} | {c[1][2]:+.1f} |')
    txt = '\n'.join(lines)
    if OUT: open(OUT, 'w').write(txt)
    print(txt)
