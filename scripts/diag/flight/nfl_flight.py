"""NFL ball flight on completed passes (BDB 2025, weeks given): pass_forward -> pass_arrived, by the distance from the
passer at the throw to the ball at the arrival (5-yd bins to 40+), split by air yards (the ball's depth past the line at
the arrival: under 0, 0-10, 10-20, 20+). Also the ball's tracked speed just after the release (mean of the first 3
frames) and, as a check, the ball's distance to the targeted receiver at pass_arrived (is it the ball at his hands).
   python3 -I scripts/diag/flight/nfl_flight.py <bdb2025 dir> [weeks] > out/flight/nfl.json
"""
import csv, sys, json
from collections import defaultdict
root = sys.argv[1]; weeks = [int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1,2,3').split(',')]
plays = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(f'{root}/plays.csv')) if r['passResult'] == 'C'}
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{root}/players.csv'))}
tgt = {}
for r in csv.DictReader(open(f'{root}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k in plays and r['wasTargettedReceiver'] in ('1', 'TRUE', 'True'): tgt[k] = r['nflId']
ball = defaultdict(dict); ev = defaultdict(dict); qb = defaultdict(dict); rc = defaultdict(dict); snapx = {}
for w in weeks:
    for r in csv.DictReader(open(f'{root}/tracking_week_{w}.csv')):
        k = (r['gameId'], r['playId'])
        if k not in plays: continue
        f = int(r['frameId'])
        if r['displayName'] == 'football':
            ball[k][f] = (float(r['x']), float(r['y']), float(r['s']))
            if r['event'] in ('ball_snap', 'pass_forward', 'pass_arrived') and r['event'] not in ev[k]: ev[k][r['event']] = f
            if r['event'] == 'ball_snap': snapx[k] = (float(r['x']), 1 if r['playDirection'] == 'right' else -1)
        elif pos.get(r['nflId']) == 'QB' and r['club'] == plays[k]['possessionTeam']: qb[k][f] = (float(r['x']), float(r['y']))
        elif r['nflId'] == tgt.get(k): rc[k][f] = (float(r['x']), float(r['y']))
out = []
for k, e in ev.items():
    if 'pass_forward' not in e or 'pass_arrived' not in e or k not in snapx: continue
    f0, f1 = e['pass_forward'], e['pass_arrived']
    if f1 <= f0 or f0 not in qb[k] or f1 not in ball[k]: continue
    bx, by, _ = ball[k][f1]; qx, qy = qb[k][f0]; sx, d = snapx[k]
    sp = [ball[k][f][2] for f in (f0 + 1, f0 + 2, f0 + 3) if f in ball[k]]
    to_rcv = ((bx - rc[k][f1][0]) ** 2 + (by - rc[k][f1][1]) ** 2) ** .5 if f1 in rc[k] else None
    out.append({'T': (f1 - f0) / 10, 'dist': ((bx - qx) ** 2 + (by - qy) ** 2) ** .5, 'air': (bx - sx) * d, 'v0': sum(sp) / len(sp) if sp else None, 'toRcv': to_rcv})
json.dump(out, sys.stdout)
