"""Usage: BDB2025=<dir with tracking_week_N.csv> OUT=out/base-side-nfl.json python3 -I scripts/diag/base-side/base-side-nfl.py 1 2
NFL: is the throw to the side the QB's shoulders (o) were set to 0.3-0.6 s before the release?
Dropbacks with a target, BDB 2025 weeks given. Normalised so the offense attacks +x; +y = QB's left.
Shoulder side: sign of the lateral component of o averaged over the 0.3-0.6 s window, counted when >= 10 deg off square.
Throw side: sign of (target y at pass_arrived - QB y at release), counted when >= 2 yd. Also catcher's run side over the 1.5 s after the catch."""
import csv, sys, math, json
from collections import defaultdict
import os
D = os.environ.get('BDB2025', 'data/raw/bdb2025/big-data-bowl-data')
weeks = [int(w) for w in sys.argv[1:]] or [1]
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
plays = {}
for r in csv.DictReader(open(f'{D}/plays.csv')):
    if r.get('isDropback') in ('TRUE', 'True', '1') and r.get('passResult') in ('C', 'I', 'IN'):
        plays[(r['gameId'], r['playId'])] = r
tgt = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k in plays and r.get('wasTargettedReceiver') == '1': tgt[k] = r['nflId']
games = {r['gameId']: r['week'] for r in csv.DictReader(open(f'{D}/games.csv'))}
out = []
for w in weeks:
    cur = None; fr = defaultdict(dict)
    def flush():
        if cur is None: return
        k = cur; T = tgt.get(k)
        if not T: return
        qbs = [n for n in fr if pos.get(n) == 'QB']
        if len(qbs) != 1 or T not in fr: return
        Q, R = fr[qbs[0]], fr[T]
        ev = {}
        for f, row in sorted(Q.items()):
            e = row['event']
            if e and e not in ev: ev[e] = f
        if 'pass_forward' not in ev: return
        kr = ev['pass_forward']; ka = ev.get('pass_arrived') or ev.get('pass_outcome_caught') or ev.get('pass_outcome_incomplete')
        if ka is None or ka not in R: return
        left = Q[kr]['dir'] == 'left'
        def P(row):
            x, y = float(row['x']), float(row['y'])
            o = float(row['o']) if row['o'] not in ('', 'NA') else None
            if left: x, y = 120 - x, 53.3 - y; o = None if o is None else (o + 180) % 360
            return x, y, o
        win = [P(Q[f]) for f in range(kr - 6, kr - 2) if f in Q]
        os_ = [p[2] for p in win if p[2] is not None]
        if len(os_) < 2: return
        sx = sum(math.sin(math.radians(o)) for o in os_); sy = sum(math.cos(math.radians(o)) for o in os_)
        sh = math.atan2(sy, sx)   # angle from +x (downfield), + = left
        qx, qy, _ = P(Q[kr]); tx, ty, _ = P(R[ka])
        thr = math.atan2(ty - qy, tx - qx)
        run = None
        kc = ev.get('pass_outcome_caught')
        if kc and kc in R and (kc + 15) in R:
            a, b = P(R[kc]), P(R[kc + 15]); run = b[1] - a[1]
        out.append(dict(sh=sh, thr=thr, lat=ty - qy, run=run, comp=plays[k]['passResult'] == 'C'))
    with open(f'{D}/tracking_week_{w}.csv') as fh:
        for r in csv.DictReader(fh):
            k = (r['gameId'], r['playId'])
            if k != cur:
                flush(); cur = k; fr = defaultdict(dict)
            if k not in plays: continue
            n = r['nflId']
            if n == 'NA' or (pos.get(n) != 'QB' and tgt.get(k) != n): continue
            fr[n][int(r['frameId'])] = dict(x=r['x'], y=r['y'], o=r['o'], event=r['event'] if r['event'] != 'NA' else '', dir=r['playDirection'])
        flush()
json.dump(out, open(os.environ.get('OUT', 'out/base-side-nfl.json'), 'w'))
print('throws', len(out))
