# python3 -I scripts/diag/coverage/nfl_cross_nearest.py <bdb2025 dir> 1 2 3
# NFL shallow crossers (routeRan CROSS, passLength <= 7, zone), same quantities as the sim's cross-pairs: at pass_forward,
# the LB/DB 0-14 yd deep nearest the catch point (target at pass_arrived): depth vs the target, lateral velocity relative
# to the target's travel, distance at the arrival; whether that defender's nearest receiver at the release is the target.
import csv, sys, math, statistics as st
from collections import defaultdict
D = sys.argv[1]; weeks = sys.argv[2:]
plays = {}
for r in csv.DictReader(open(f'{D}/plays.csv')):
    if r['pff_manZone'] != 'Zone' or r['passResult'] not in ('C', 'I', 'IN') or not r['passLength'] or r['passLength'] == 'NA': continue
    plays[(r['gameId'], r['playId'])] = r
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
tgt = {}; offense = defaultdict(set)
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k not in plays: continue
    if r['routeRan'] and r['routeRan'] != 'NA': offense[k].add(r['nflId'])
    if r['wasTargettedReceiver'] == '1': tgt[k] = (r['nflId'], r['routeRan'])
keep = {k for k, (n, rt) in tgt.items() if rt == 'CROSS'}
fr = defaultdict(lambda: defaultdict(dict)); ev = defaultdict(dict); dirn = {}
for w in weeks:
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
        k = (r['gameId'], r['playId'])
        if k not in keep: continue
        f = int(r['frameId'])
        if r['event'] in ('pass_forward', 'pass_arrived') and r['event'] not in ev[k]: ev[k][r['event']] = f
        if r['nflId'] == 'NA': continue
        dirn[k] = r['playDirection']
        fr[k][f][r['nflId']] = (float(r['x']), float(r['y']), float(r['s']), float(r['dir']))
rows = []
for k in keep:
    if k not in ev or 'pass_forward' not in ev[k] or 'pass_arrived' not in ev[k]: continue
    p = plays[k]; tid = tgt[k][0]; fF, fA = ev[k]['pass_forward'], ev[k]['pass_arrived']
    A, F = fr[k].get(fA, {}), fr[k].get(fF, {})
    if tid not in A or tid not in F: continue
    up = 1 if dirn[k] == 'right' else -1
    los = (float(p['absoluteYardlineNumber']))
    def vel(t): x, y, s, d = t; a = math.radians(d); return s * math.sin(a), s * math.cos(a)  # (vx, vy) in field x/y
    tx, ty = F[tid][0], F[tid][1]; tvx, tvy = vel(F[tid]); sd = math.copysign(1, tvy) if tvy else 1
    cx, cy = A[tid][0], A[tid][1]
    best, bd = None, 1e9
    for n, t in F.items():
        if n in offense[k] or pos.get(n) not in ('ILB', 'MLB', 'OLB', 'LB', 'CB', 'SS', 'FS', 'DB', 'S'): continue
        dd = (t[0] - los) * up
        if dd < 0 or dd > 14: continue
        k2 = math.hypot(t[0] - cx, t[1] - cy)
        if k2 < bd: bd, best = k2, n
    if not best: continue
    b = F[best]; bvx, bvy = vel(b)
    near = min((n for n in offense[k] if n in F), key=lambda n: math.hypot(F[n][0] - b[0], F[n][1] - b[1]))
    rows.append({'air': float(p['passLength']), 'comp': p['passResult'] == 'C', 'yds': float(p['yardsGained'] or 0),
                 'deeper': (b[0] - tx) * up, 'dvy': (bvy - tvy) * sd, 'ahead': (b[1] - ty) * sd,
                 'dArr': math.hypot(A[best][0] - cx, A[best][1] - cy) if best in A else None, 'onT': near == tid})
for name, sel in [('shallow (air <= 7)', lambda r: r['air'] <= 7), ('deeper (air > 7)', lambda r: r['air'] > 7)]:
    rs = [r for r in rows if sel(r)]
    if not rs: continue
    m = lambda key: st.median([r[key] for r in rs if r[key] is not None])
    print(f"NFL zone CROSS {name}: n {len(rs)} comp {sum(r['comp'] for r in rs)/len(rs):.0%} yd {sum(r['yds'] for r in rs)/len(rs):.1f} | nearest at release: deeper {m('deeper'):.1f} ahead {m('ahead'):.1f} dvy {m('dvy'):.1f} dArr {m('dArr'):.1f} | his nearest receiver is the target {sum(r['onT'] for r in rs)/len(rs):.0%}")
