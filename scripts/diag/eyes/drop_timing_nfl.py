"""Integration (2026-11-17): Defense's positions operator on NFL tracking (BDB 2025, data/raw/bdb2025), the same
definitions as scripts/diag/eyes/drop-timing.ts. Per traditional dropback with a pass (pass_forward): snap to the QB's
set (the first frame he is 1 yd or more from his snap spot and slower than 1.2 yd/s), his depth at the set, set to the
release, the release to pass_arrived (or the catch), the air yards (passLength) and the ball's speed (its travel over
the flight). Alignment from offenseFormation (SHOTGUN / EMPTY / PISTOL: gun), play action from playAction.
usage: python3 drop_timing_nfl.py [weeks] > rows.jsonl"""
import csv, json, math, sys
D = 'data/raw/bdb2025/big-data-bowl-data/'
weeks = [int(w) for w in (sys.argv[1] if len(sys.argv) > 1 else '1,2').split(',')]
qbs = {r['nflId'] for r in csv.DictReader(open(D + 'players.csv')) if r['position'] == 'QB'}
plays = {}
for r in csv.DictReader(open(D + 'plays.csv')):
    if r['dropbackType'] != 'TRADITIONAL' or not r['passResult'] or r['passResult'] in ('S', 'R'): continue
    plays[(r['gameId'], r['playId'])] = r
cur, rows = None, []
def finish(key, rows):
    p = plays.get(key)
    if not p: return
    qb = [r for r in rows if r['nflId'] in qbs]; ball = [r for r in rows if r['displayName'] == 'football']
    if not qb or not ball: return
    # One QB on the field (the passer): the one at the snap nearest the ball.
    ev = {}
    for r in ball:
        if r['event'] and r['event'] not in ev: ev[r['event']] = int(r['frameId'])
    if 'ball_snap' not in ev or 'pass_forward' not in ev: return
    snapF, relF = ev['ball_snap'], ev['pass_forward']
    arrF = ev.get('pass_arrived') or ev.get('pass_outcome_caught') or ev.get('pass_outcome_incomplete')
    byq = {}
    for r in qb: byq.setdefault(r['nflId'], []).append(r)
    bsnap = next(r for r in ball if int(r['frameId']) == snapF)
    def d0(rs):
        s = next((r for r in rs if int(r['frameId']) == snapF), None)
        return math.hypot(float(s['x']) - float(bsnap['x']), float(s['y']) - float(bsnap['y'])) if s else 99
    qrs = min(byq.values(), key=d0)
    qrs.sort(key=lambda r: int(r['frameId']))
    s0 = next((r for r in qrs if int(r['frameId']) == snapF), None)
    if not s0: return
    sx, sy, dirn = float(s0['x']), float(s0['y']), (1 if s0['playDirection'] == 'right' else -1)
    setF = setD = None
    for r in qrs:
        f = int(r['frameId'])
        if f <= snapF or f >= relF: continue
        d = math.hypot(float(r['x']) - sx, float(r['y']) - sy)
        if d >= 1 and float(r['s']) < 1.2: setF, setD = f, (sx - float(r['x'])) * dirn; break
    rb = next((r for r in ball if int(r['frameId']) == relF), None); ab = next((r for r in ball if arrF and int(r['frameId']) == arrF), None)
    flight = (arrF - relF) / 10 if arrF else None
    dist = math.hypot(float(ab['x']) - float(rb['x']), float(ab['y']) - float(rb['y'])) if (rb and ab) else None
    gun = p['offenseFormation'] in ('SHOTGUN', 'EMPTY', 'PISTOL')
    print(json.dumps({'gun': gun, 'pa': p['playAction'] == 'TRUE', 'setT': (setF - snapF) / 10 if setF else None, 'setDepth': round(setD, 2) if setD is not None else None,
        'rel': (relF - snapF) / 10, 'flight': flight, 'air': float(p['passLength']) if p['passLength'] not in ('', 'NA') else None,
        'dist': round(dist, 1) if dist else None, 'speed': round(dist / flight, 1) if (dist and flight) else None, 'cmp': p['passResult'] == 'C'}))
for w in weeks:
    f = open(D + f'tracking_week_{w}.csv'); rd = csv.DictReader(f)
    for r in rd:
        key = (r['gameId'], r['playId'])
        if key != cur:
            if cur and rows: finish(cur, rows)
            cur, rows = key, []
        if key in plays and (r['displayName'] == 'football' or r['nflId'] in qbs): rows.append(r)
    if cur and rows: finish(cur, rows)
    cur, rows = None, []
