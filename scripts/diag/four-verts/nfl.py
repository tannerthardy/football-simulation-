# Four verticals, NFL side: BDB 2025 drop-back passes (population.py) with 3+ GO routes among the non-back route
# runners, every tracking week given. Same operators as sim.ts: seam = a GO from an inside alignment (not the widest
# on his side at the snap), go = from the widest; open = 8 yd or more past the line and the nearest defender 2.5 yd
# or more away; separation and how long open at the throw (pass_forward); the first time a seam was open; the
# nearest defender (position) as each vertical passes 12 and 18 yd.
#   python3 -I scripts/diag/four-verts/nfl.py data/raw/bdb2025/big-data-bowl-data 1,2,3,4,5,6,7,8,9 > out/four-verts/nfl.jsonl
import csv, sys, os, json, math, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pass-matrix'))
from population import nfl_population
D = sys.argv[1]; weeks = sys.argv[2].split(',')
OPEN, DEEP = 2.5, 8
pop, _ = nfl_population(D); keep = {k for k, w in pop.items() if w == 'keep'}
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
plays = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(f'{D}/plays.csv'))}
route = C.defaultdict(dict); tgt = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
  k = (r['gameId'], r['playId'])
  if k not in keep: continue
  if r['wasTargettedReceiver'] in ('1', 'TRUE', 'True'): tgt[k] = r['nflId']
  if r['wasRunningRoute'] in ('1', 'TRUE', 'True'): route[k][r['nflId']] = r['routeRan']
want = {k for k in keep if sum(1 for i, rt in route[k].items() if rt == 'GO' and pos.get(i) not in ('RB', 'FB')) >= 3}
offense = {}
for w in weeks:
  T = C.defaultdict(dict); ev = {}; dirn = {}; team = {}
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    k = (r['gameId'], r['playId'])
    if k not in want: continue
    f = int(r['frameId'])
    if r['event'] not in ('', 'NA'): ev.setdefault(k, {}).setdefault(r['event'], f)
    i = 'ball' if r['displayName'] == 'football' else r['nflId']
    T[k][(i, f)] = (float(r['x']), float(r['y']))
    if i != 'ball': team[(k, i)] = r['club']; dirn[k] = 1 if r['playDirection'] == 'right' else -1
  for k, P in T.items():
    e = ev.get(k, {}); s0 = e.get('ball_snap'); th = e.get('pass_forward')
    if s0 is None or ('ball', s0) not in P: continue
    los, by = P[('ball', s0)]; sg = dirn[k]; off = plays[k]['possessionTeam']
    ids = {i for i, _ in P if i != 'ball'}
    O = [i for i in ids if team[(k, i)] == off]; Dd = [i for i in ids if team[(k, i)] != off]
    verts = [i for i in O if route[k].get(i) == 'GO' and pos.get(i) not in ('RB', 'FB') and (i, s0) in P]
    cls = {}
    for v in verts:
      side = 1 if P[(v, s0)][1] > by else -1
      wider = any(o != v and (o, s0) in P and (1 if P[(o, s0)][1] > by else -1) == side and abs(P[(o, s0)][1] - by) > abs(P[(v, s0)][1] - by) + 0.5 for o in verts)
      cls[v] = 'seam' if wider else 'go'
    st = {v: {'open': None, 'at12': None, 'at18': None} for v in verts}
    first = None; atThrow = None; end = th if th else s0 + 60
    frames = sorted({f for _, f in P if f >= s0})
    for f in frames:
      for v in verts:
        if (v, f) not in P: continue
        x, y = P[(v, f)]; depth = (x - los) * sg
        nd = min(((math.hypot(P[(d, f)][0] - x, P[(d, f)][1] - y), d) for d in Dd if (d, f) in P), default=(99, None))
        s = st[v]
        if s['at12'] is None and depth >= 12: s['at12'] = {'pos': pos.get(nd[1]), 'dist': round(nd[0], 2)}
        if s['at18'] is None and depth >= 18: s['at18'] = {'pos': pos.get(nd[1]), 'dist': round(nd[0], 2)}
        if th and f > th: continue
        op = depth >= DEEP and nd[0] >= OPEN
        if op and s['open'] is None: s['open'] = f
        if not op: s['open'] = None
        if op and first is None and cls[v] == 'seam': first = {'t': (f - s0) / 10, 'sep': round(nd[0], 2)}
      if th and f == th:
        atThrow = []
        for v in verts:
          if (v, f) not in P: continue
          x, y = P[(v, f)]
          nd = min((math.hypot(P[(d, f)][0] - x, P[(d, f)][1] - y) for d in Dd if (d, f) in P), default=99)
          atThrow.append({'cls': cls[v], 'sep': round(nd, 2), 'openFor': 0 if st[v]['open'] is None else round((f - st[v]['open']) / 10, 2), 'tgt': tgt.get(k) == v})
    t = tgt.get(k); pr = plays[k]
    tc = None if not t else cls.get(t) or ('back' if pos.get(t) in ('RB', 'FB') else 'other')
    print(json.dumps({'target': tc, 'ttt': float(pr['timeToThrow']) if pr['timeToThrow'] not in ('', 'NA') else None, 'att': t is not None,
      'air': float(pr['passLength']) if pr.get('passLength') not in (None, '', 'NA') else None, 'key': list(k),
      'cmp': pr['passResult'] == 'C', 'int': pr['passResult'] == 'IN', 'sack': pr['passResult'] == 'S', 'coverage': pr['pff_passCoverage'],
      'atThrow': atThrow, 'firstOpen': first, 'verts': [{'cls': cls[v], 'at12': st[v]['at12'], 'at18': st[v]['at18']} for v in verts]}))
