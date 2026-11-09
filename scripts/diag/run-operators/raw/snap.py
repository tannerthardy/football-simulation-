"""Snap and mesh timing from raw BDB 2025 tracking (football + QB + carrier), one week.
usage: python3 -I snap.py <bdb2025 dir> <week>"""
import csv, sys, math, statistics as st, collections
D, W = sys.argv[1], sys.argv[2]
plays = {}
for r in csv.DictReader(open(f'{D}/plays.csv')):
    plays[(r['gameId'], r['playId'])] = r
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
T = collections.defaultdict(lambda: collections.defaultdict(dict))  # play -> frame -> who -> (x,y,s)
EV = collections.defaultdict(dict)
for r in csv.DictReader(open(f'{D}/tracking_week_{W}.csv')):
    k = (r['gameId'], r['playId'])
    if r['frameType'] == 'BEFORE_SNAP' and r['event'] != 'ball_snap': continue
    who = 'ball' if r['displayName'] == 'football' else pos.get(r['nflId'])
    if who not in ('ball', 'QB', 'RB', 'C'): continue
    f = int(r['frameId'])
    T[k][f].setdefault(who, []).append((float(r['x']), float(r['y']), float(r['s'] or 0), r['nflId']))
    if r['event'] and r['event'] not in EV[k]: EV[k][r['event']] = f
R = collections.defaultdict(list)
for k, fr in T.items():
    p = plays.get(k)
    if not p or 'ball_snap' not in EV[k]: continue
    s0 = EV[k]['ball_snap']
    if s0 not in fr or 'ball' not in fr[s0] or 'QB' not in fr[s0] or len(fr[s0]['QB']) != 1: continue
    qid = fr[s0]['QB'][0][3]
    def qbat(f):
        q = [x for x in fr.get(f, {}).get('QB', []) if x[3] == qid]; return q[0] if q else None
    b0 = fr[s0]['ball'][0]; q0 = qbat(s0)
    d0 = math.dist(b0[:2], q0[:2])
    form = p['offenseFormation'] or '?'
    al = 'under' if d0 < 2.0 else 'pistol' if form == 'PISTOL' else 'gun'
    kind = 'pass' if p['isDropback'] == 'TRUE' else 'run'
    pa = p['playAction'] == 'TRUE'
    # catch: first frame after the snap the ball is within 0.6 yd of the QB
    # catch: the ball's own flight ends - the first frame after the snap where the
    # ball's speed falls to the QB's speed + 1 yd/s (it has stopped flying)
    bs = lambda f: fr[f]['ball'][0][2] if f in fr and 'ball' in fr[f] else None
    peak = max((bs(f) or 0) for f in range(s0, s0 + 8))
    fpk = next(f for f in range(s0, s0 + 8) if (bs(f) or 0) == peak)
    catch = next((f for f in range(fpk, s0 + 25) if bs(f) is not None and qbat(f) and bs(f) <= qbat(f)[2] + 1.0), None)
    if catch is None: continue
    R[(al, 'all', 'peak')].append(peak)
    tc = (catch - s0) / 10
    # QB first move > 1 yd/s
    mv = next((f for f in range(s0, s0 + 25) if qbat(f) and qbat(f)[2] > 1.0), None)
    key = (al, kind + ('-PA' if pa else ''))
    R[key + ('catch',)].append(tc); R[key + ('d0',)].append(d0)
    if mv is not None: R[key + ('move',)].append((mv - s0) / 10); R[key + ('move-catch',)].append((mv - catch) / 10)
    if kind == 'run' and 'handoff' in EV[k]:
        h = EV[k]['handoff']
        R[key + ('handoff',)].append((h - s0) / 10); R[key + ('hand-catch',)].append((h - catch) / 10)
        R[(al, 'run-' + (p['pff_runConceptPrimary'] or '?')[:10], 'hand-catch')].append((h - catch) / 10)
    if pa and 'play_action' in EV[k]:
        R[key + ('fake',)].append((EV[k]['play_action'] - s0) / 10)
md = lambda v: f"{st.median(v):.2f} (p25 {st.quantiles(v, n=4)[0]:.2f}, p75 {st.quantiles(v, n=4)[2]:.2f}, n {len(v)})" if len(v) > 3 else '-'
for key in sorted({k[:2] for k in R}):
    out = '  '.join(f"{m}: {md(R[key + (m,)])}" for m in ('d0', 'catch', 'move', 'move-catch', 'handoff', 'hand-catch', 'fake') if R[key + (m,)])
    print(key, out)
