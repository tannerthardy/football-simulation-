"""Starts from rest, one operator for NFL tracking and the sim (Integration/Coverage, 2026-11-18). Defenders on a pass play, ball not yet thrown: a start is a frame k0 with speed under 1.0 yd/s
now and for the 0.2 s before; the move is real when his speed reaches PEAK within the next 1.0 s. For each start, his speed 0.2 / 0.4 / 0.8 s later (medians) by his peak-speed band, by the
direction of the move relative to his facing at the start (his travel heading 0.6 s on against `o` at the start: forward under 45 deg, lateral 45-135, backpedal over 135), and by position group.
NFL: BDB 2025 weeks 1-9 dropbacks, provider speed `s`, orientation `o` (the shoulders) and heading `dir`, from out/dircap/nfl-pass.pkl (facing_speed.py's loader). Sim: facing_speed_sim.mts output,
speed from the velocity, `o` = hips + trunk. The sim's speed is taken as the distance over the last 0.1 s like the provider's (`--instant` uses the instantaneous velocity). usage: python3 -I start_accel.py NFL.pkl SIM.jsonl.gz [--instant]"""
import gzip, json, pickle, sys
import numpy as np
wrap = lambda a: (np.asarray(a) + 180.0) % 360.0 - 180.0
bdb = lambda ux, uy: np.degrees(np.arctan2(ux, uy))
GROUP = {'CB': 'DB', 'S': 'DB', 'FS': 'DB', 'SS': 'DB', 'NB': 'DB', 'DB': 'DB', 'LB': 'LB', 'ILB': 'LB', 'OLB': 'LB', 'MLB': 'LB', 'DE': 'DL', 'DT': 'DL', 'NT': 'DL', 'EDGE': 'DL', 'DL': 'DL'}
def load_nfl(path):
    out = []
    for k, p in pickle.load(open(path, 'rb')).items():
        out.append(dict(side=p['side'], pos=p['pos'], s=np.array(p['s']), d=np.array(p['d']), o=np.array(p['o']), throw=p['throw']))
    return out
def load_sim(path):
    out = []
    for line in gzip.open(path, 'rt'):
        r = json.loads(line); R = np.array(r['rows'], dtype=float)
        if R.shape[0] < 12 or r['throw'] is None: continue
        n = R.shape[1] // 8; R = R.reshape(R.shape[0], n, 8); x, y, vx, vy, f, tr, qx, qy = (R[..., i].T for i in range(8))
        sb = np.zeros_like(x); sb[:, 1:] = np.hypot(np.diff(x, axis=1), np.diff(y, axis=1)) / 0.1  # the provider's speed is the distance over the last 0.1 s
        out.append(dict(side=r['side'], pos=r['pos'], s=sb if BACK else np.hypot(vx, vy), d=bdb(vx, vy), o=bdb(np.cos(f + tr), np.sin(f + tr)), throw=int(round(r['throw'] / 0.1))))
    return out
BACK = '--instant' not in sys.argv
BANDS = [(3.5, 4.5), (4.5, 5.5), (5.5, 99)]
CLASSES = [('forward', 0, 45), ('lateral', 45, 135), ('backpedal', 135, 181)]
def events(plays, side='D', groups=None, minpeak=3.5, minv6=2.0):
    groups = groups or GROUP
    ev = []
    for pl in plays:
        n, F = pl['s'].shape
        for i in range(n):
            if pl['side'][i] != side or pl['pos'][i] not in groups: continue
            s, d, o = pl['s'][i], pl['d'][i], pl['o'][i]; last = -99
            for k in range(3, min(pl['throw'], F) - 10):
                if k - last < 10 or np.isnan(s[k - 2:k + 11]).any(): continue
                if s[k] >= 1.0 or s[k - 1] >= 1.0 or s[k - 2] >= 1.0: continue
                peak = np.nanmax(s[k:k + 11])
                if peak < minpeak or s[k + 6] < minv6 or np.isnan(d[k + 6]) or np.isnan(o[k]): continue
                last = k
                ev.append(dict(group=groups[pl['pos'][i]], peak=peak, ang=abs(float(wrap(o[k] - d[k + 6]))), ang4=abs(float(wrap(o[k + 4] - d[k + 6]))) if not np.isnan(o[k + 4]) else np.nan, turn=abs(float(wrap(o[k + 4] - o[k]))) if not np.isnan(o[k + 4]) else np.nan, v=(s[k + 2], s[k + 4], s[k + 8])))
    return ev
def table(name, ev):
    q = lambda v: round(float(np.median(v)), 2)
    print(f'-- {name}: {len(ev)} starts (under 1 yd/s for 0.2 s, ball not thrown, peak >= 3.5 yd/s within 1 s)')
    print('   speed at 0.2 / 0.4 / 0.8 s (median) [n]')
    def row(label, S):
        if len(S) < 8: return
        V = np.array([e['v'] for e in S]); print(f'   {label:34s} {q(V[:,0]):5.2f} {q(V[:,1]):5.2f} {q(V[:,2]):5.2f}  [{len(S)}]')
    row('all', ev)
    for g in ('LB', 'DB', 'DL'): row(f'group {g}', [e for e in ev if e['group'] == g])
    for c, lo, hi in CLASSES: row(f'{c} ({lo}-{hi} deg off facing)', [e for e in ev if lo <= e['ang'] < hi])
    for lo, hi in BANDS: row(f'peak {lo}-{hi if hi < 99 else "+"}', [e for e in ev if lo <= e['peak'] < hi])
    for c, lo, hi in CLASSES:
        for blo, bhi in BANDS: row(f'{c}, peak {blo}-{bhi if bhi < 99 else "+"}', [e for e in ev if lo <= e['ang'] < hi and blo <= e['peak'] < bhi])
    for g in ('LB', 'DB'):
        for c, lo, hi in CLASSES: row(f'{g} {c}', [e for e in ev if e['group'] == g and lo <= e['ang'] < hi])
    print('   by his facing 0.4 s into the move (stays off his travel = shuffle / backpedal; turned onto it = turn and run), movers 45+ deg off his facing at the start:')
    L = [e for e in ev if e['ang'] >= 45 and not np.isnan(e['ang4'])]
    row('  still 45+ deg off at +0.4 s', [e for e in L if e['ang4'] >= 45]); row('  turned to within 45 deg by +0.4 s', [e for e in L if e['ang4'] < 45])
    row('  still off, peak 3.5-4.5', [e for e in L if e['ang4'] >= 45 and e['peak'] < 4.5]); row('  turned, peak 3.5-4.5', [e for e in L if e['ang4'] < 45 and e['peak'] < 4.5])
    row('  forward at start (0-45)', [e for e in ev if e['ang'] < 45]); row('  forward at start, peak 3.5-4.5', [e for e in ev if e['ang'] < 45 and e['peak'] < 4.5])
OLG = {'T': 'OL', 'G': 'OL', 'C': 'OL', 'OT': 'OL', 'OG': 'OL'}
def ol_table(name, plays):
    ev = events(plays, 'O', OLG, 2.0, 1.2)
    print(f'-- {name} OL pass-set starts: {len(ev)} (under 1 yd/s for 0.2 s, ball not thrown, peak >= 2.0 yd/s within 1 s); speed at 0.2 / 0.4 / 0.8 s')
    q = lambda v: round(float(np.median(v)), 2)
    for lab, S in (('all', ev), ('forward (0-45)', [e for e in ev if e['ang'] < 45]), ('lateral (45-135)', [e for e in ev if 45 <= e['ang'] < 135]), ('backpedal (135+)', [e for e in ev if e['ang'] >= 135])):
        if len(S) >= 8: V = np.array([e['v'] for e in S]); print(f'   {lab:22s} {q(V[:,0]):5.2f} {q(V[:,1]):5.2f} {q(V[:,2]):5.2f}  [{len(S)}]')
nfl = load_nfl(sys.argv[1]); table('NFL', events(nfl)); ol_table('NFL', nfl)
for f in [a for a in sys.argv[2:] if not a.startswith('--')]:
    sim = load_sim(f); table('sim ' + f.split('/')[-1], events(sim)); ol_table('sim ' + f.split('/')[-1], sim)
