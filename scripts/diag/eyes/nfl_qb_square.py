"""Does the QB's body lead the throw? NFL (BDB 2025, weeks given): on targeted dropback passes, at 0.1 s steps from
1.0 s before pass_forward to it, the angle between the QB's orientation (tracking 'o': 0 = +y, clockwise) and the
direction from him to the targeted receiver then, and to the eventual catch point (the ball at pass_arrived), and his
speed toward the receiver (a step or hitch to the throw, from positions 0.1 s either side).
Writes per-pass rows; summarise with qb_square_table.py.
   python3 -I scripts/diag/eyes/nfl_qb_square.py <bdb2025 dir> [weeks] > out/eyes/nfl.jsonl"""
import csv, sys, json, math
from collections import defaultdict
root = sys.argv[1]; weeks = [int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1,2').split(',')]
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{root}/players.csv'))}
plays = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(f'{root}/plays.csv')) if r.get('isDropback') in ('TRUE', 'True', '1') and r['passResult'] in ('C', 'I', 'IN')}
tgt = {}
for r in csv.DictReader(open(f'{root}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k in plays and r['wasTargettedReceiver'] in ('1', 'TRUE', 'True'): tgt[k] = r['nflId']
QB = defaultdict(dict); RC = defaultdict(dict); BALL = defaultdict(dict); ev = defaultdict(dict)
for w in weeks:
    for r in csv.DictReader(open(f'{root}/tracking_week_{w}.csv')):
        k = (r['gameId'], r['playId'])
        if k not in tgt: continue
        f = int(r['frameId'])
        if r['displayName'] == 'football':
            BALL[k][f] = (float(r['x']), float(r['y']))
            if r['event'] in ('ball_snap', 'pass_forward', 'pass_arrived') and r['event'] not in ev[k]: ev[k][r['event']] = f
        elif r['nflId'] == tgt[k]: RC[k][f] = (float(r['x']), float(r['y']))
        elif pos.get(r['nflId']) == 'QB' and r['club'] == plays[k]['possessionTeam'] and r['o'] not in ('', 'NA'):
            QB[k][f] = (float(r['x']), float(r['y']), float(r['o']))
def ang(o_deg, dx, dy):
    fx, fy = math.sin(math.radians(o_deg)), math.cos(math.radians(o_deg))
    a = math.degrees(math.atan2(fx * dy - fy * dx, fx * dx + fy * dy)); return abs(a)
for k, e in ev.items():
    if 'pass_forward' not in e or 'ball_snap' not in e: continue
    fr = e['pass_forward']; fa = e.get('pass_arrived'); cp = BALL[k].get(fa) if fa else None
    rows = {}
    for s in range(-10, 1):
        f = fr + s
        if f not in QB[k] or f not in RC[k]: continue
        x, y, o = QB[k][f]; rx, ry = RC[k][f]
        L = math.hypot(rx - x, ry - y) or 1
        vt = None
        if f - 1 in QB[k] and f + 1 in QB[k]:
            vx, vy = (QB[k][f + 1][0] - QB[k][f - 1][0]) / 0.2, (QB[k][f + 1][1] - QB[k][f - 1][1]) / 0.2
            vt = round((vx * (rx - x) + vy * (ry - y)) / L, 2)
        rows[f'{s / 10:.1f}'] = {'toRcv': round(ang(o, rx - x, ry - y), 1), 'toCatch': round(ang(o, cp[0] - x, cp[1] - y), 1) if cp else None, 'vToward': vt}
    if rows: print(json.dumps({'ttt': (fr - e['ball_snap']) / 10, 'rows': rows}))
