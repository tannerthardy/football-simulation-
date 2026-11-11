"""NFL flat runners' picture at fixed times after the snap, and at the throw when targeted (flat-open table).

  python3 -I scripts/diag/call-mix/nfl_flat_open.py data/raw/bdb2025/big-data-bowl-data 1,2,3 > out/call-mix/nfl_flat_open.jsonl

Dropbacks (not nullified, no spike/kneel); runners with routeRan FLAT. Position group from players.csv (WR/TE vs RB).
At t = 1.0/1.5/2.0/2.5 s after ball_snap (frames at 10 Hz) and at pass_forward / pass_arrived when he is the target:
depth past the ball's snap spot, width from it, speed, nearest defender (position, distance) and that defender's
closing speed on him (positive = closing); for the target, the pass result."""
import csv, json, sys, math
D = sys.argv[1]; weeks = sys.argv[2].split(',')
T = lambda v: v in ('1', 'TRUE', 'True')
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
plays = {}
for p in csv.DictReader(open(f'{D}/plays.csv')):
    if T(p['isDropback']) and p['playNullifiedByPenalty'] != 'Y' and not T(p['qbSpike']) and not T(p['qbKneel']):
        plays[(p['gameId'], p['playId'])] = p
flat, tgt = {}, {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k in plays and T(r['wasRunningRoute']) and r['routeRan'] == 'FLAT':
        flat.setdefault(k, set()).add(r['nflId'])
        if T(r['wasTargettedReceiver']): tgt[k] = r['nflId']
for w in weeks:
    cur, rows = None, []
    def flush():
        if cur is None or cur not in flat: return
        p = plays[cur]; off = p['possessionTeam']
        snap = next((int(r['frameId']) for r in rows if r['event'] == 'ball_snap'), None)
        if snap is None: return
        ev = {r['event']: int(r['frameId']) for r in rows if r['event'] in ('pass_forward', 'pass_arrived')}
        dirn = 1 if rows[0]['playDirection'] == 'right' else -1
        by = {}
        for r in rows: by.setdefault(int(r['frameId']), []).append(r)
        ball = next((r for r in by.get(snap, []) if r['nflId'] in ('', 'NA')), None)
        if ball is None: return
        bx, byy = float(ball['x']), float(ball['y'])
        def vel(r):
            s, d = float(r['s']), math.radians(float(r['dir']))
            return s * math.sin(d), s * math.cos(d)  # BDB dir: 0 = +y, clockwise
        marks = [(f'{t:.1f}', snap + round(t * 10)) for t in (1.0, 1.5, 2.0, 2.5)]
        for name, f in ev.items(): marks.append((name, f))
        for label, f in marks:
            fr = by.get(f)
            if not fr: continue
            defs = [r for r in fr if r['nflId'] not in ('', 'NA') and r['club'] != off]
            for pid in flat[cur]:
                if label in ('pass_forward', 'pass_arrived') and tgt.get(cur) != pid: continue
                me = next((r for r in fr if r['nflId'] == pid), None)
                if me is None or not defs: continue
                mx, my = float(me['x']), float(me['y']); vx, vy = vel(me)
                near = min(defs, key=lambda d: math.hypot(float(d['x']) - mx, float(d['y']) - my))
                nx, ny = float(near['x']) - mx, float(near['y']) - my; nd = math.hypot(nx, ny) or 1
                dvx, dvy = vel(near)
                closing = -((dvx - vx) * nx + (dvy - vy) * ny) / nd
                print(json.dumps({'at': label, 'group': 'RB' if pos.get(pid) in ('RB', 'FB') else 'WR/TE', 'targeted': tgt.get(cur) == pid,
                                  'depth': round((mx - bx) * dirn, 2), 'width': round(abs(my - byy), 2), 'speed': round(float(me['s']), 2),
                                  'nearPos': pos.get(near['nflId']), 'nearDist': round(nd, 2), 'closing': round(closing, 2),
                                  'down': int(p['down']), 'cov': p['pff_passCoverage'], 'res': p['passResult'] if tgt.get(cur) == pid else None}))
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
        k = (r['gameId'], r['playId'])
        if k not in plays: continue
        if k != cur:
            flush(); cur, rows = k, []
        rows.append(r)
    flush()
