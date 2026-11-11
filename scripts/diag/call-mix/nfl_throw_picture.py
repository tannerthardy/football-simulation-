"""NFL picture at the throw (report only): every route runner at pass_forward (or at the sack), for the QB-reads
diagnosis (docs/reviews/2026-11-11-qb-reads.md).

  python3 -I scripts/diag/call-mix/nfl_throw_picture.py data/raw/bdb2025/big-data-bowl-data 1,2,3 > out/call-mix/nfl_throw_picture.jsonl

Dropbacks (not nullified, no spike/kneel), BDB 2025 tracking. One row per play: time to throw (PFF), result,
down/distance, and per route runner (player_play wasRunningRoute): label, class (HITCH/OUT/IN split at 8 yd of
break depth = deepest point before the throw, as nfl_route_depth.py; SLANT quick; FLAT/ANGLE/SCREEN flat; CROSS;
others vertical), group (RB/FB = back, else WR/TE), depth past the snap spot and width from it, nearest defender
distance and his closing speed (positive = closing), targeted, and his deepest point before the throw (brk) and when (tBrk, s)."""
import csv, json, sys, math
D = sys.argv[1]; weeks = sys.argv[2].split(',')
T = lambda v: v in ('1', 'TRUE', 'True')
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
plays = {}
for p in csv.DictReader(open(f'{D}/plays.csv')):
    if T(p['isDropback']) and p['playNullifiedByPenalty'] != 'Y' and not T(p['qbSpike']) and not T(p['qbKneel']):
        plays[(p['gameId'], p['playId'])] = p
runners, tgt = {}, {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k in plays and T(r['wasRunningRoute']) and r['routeRan'] not in ('', 'NA'):
        runners.setdefault(k, {})[r['nflId']] = r['routeRan']
        if T(r['wasTargettedReceiver']): tgt[k] = r['nflId']
def klass(label, brk):
    if label in ('HITCH', 'OUT', 'IN'): return 'quick' if brk < 8 else 'breaking'
    if label == 'SLANT': return 'quick'
    if label in ('FLAT', 'ANGLE', 'SCREEN'): return 'flat'
    if label == 'CROSS': return 'cross'
    return 'vertical'
def vel(r):
    s, d = float(r['s']), math.radians(float(r['dir']))
    return s * math.sin(d), s * math.cos(d)
for w in weeks:
    cur, rows = None, []
    def flush():
        if cur is None or cur not in runners: return
        p = plays[cur]; off = p['possessionTeam']
        ev = {}
        for r in rows:
            if r['event'] in ('ball_snap', 'pass_forward', 'qb_sack', 'qb_strip_sack') and r['event'] not in ev: ev[r['event']] = int(r['frameId'])
        snap = ev.get('ball_snap'); at = ev.get('pass_forward') or ev.get('qb_sack') or ev.get('qb_strip_sack')
        if snap is None or at is None: return
        by = {}
        for r in rows: by.setdefault(int(r['frameId']), []).append(r)
        ball = next((r for r in by.get(snap, []) if r['nflId'] in ('', 'NA')), None)
        if ball is None or at not in by: return
        bx, byy = float(ball['x']), float(ball['y']); dirn = 1 if rows[0]['playDirection'] == 'right' else -1
        deep, tdeep = {}, {}
        for f in range(snap, at + 1):
            for r in by.get(f, []):
                if r['nflId'] in runners[cur]:
                    d = (float(r['x']) - bx) * dirn
                    if d > deep.get(r['nflId'], -99): deep[r['nflId']] = d; tdeep[r['nflId']] = round((f - snap) / 10, 1)
        fr = by[at]; defs = [r for r in fr if r['nflId'] not in ('', 'NA') and r['club'] != off]
        out = []
        for r in fr:
            pid = r['nflId']
            if pid not in runners[cur] or not defs: continue
            mx, my = float(r['x']), float(r['y']); vx, vy = vel(r)
            near = min(defs, key=lambda d: math.hypot(float(d['x']) - mx, float(d['y']) - my))
            nx, ny = float(near['x']) - mx, float(near['y']) - my; nd = math.hypot(nx, ny) or 1
            dvx, dvy = vel(near)
            lab = runners[cur][pid]
            out.append({'label': lab, 'cls': klass(lab, deep.get(pid, 0)), 'back': pos.get(pid) in ('RB', 'FB'), 'target': tgt.get(cur) == pid,
                        'depth': round((mx - bx) * dirn, 2), 'width': round(abs(my - byy), 2), 'near': round(nd, 2),
                        'brk': round(deep.get(pid, 0), 1), 'tBrk': tdeep.get(pid),
                        'closing': round(-((dvx - vx) * nx + (dvy - vy) * ny) / nd, 2)})
        def num(v):
            try: return float(v)
            except Exception: return None
        print(json.dumps({'down': int(p['down']), 'dist': int(p['yardsToGo']), 'pa': T(p['playAction']), 'res': p['passResult'],
                          'ttt': num(p['timeToThrow']), 'tAt': round((at - snap) / 10, 1), 'sack': 'pass_forward' not in ev, 'yards': num(p['yardsGained']),
                          'air': num(p['passLength']), 'runners': out}))
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
        k = (r['gameId'], r['playId'])
        if k not in plays: continue
        if k != cur:
            flush(); cur, rows = k, []
        rows.append(r)
    flush()
