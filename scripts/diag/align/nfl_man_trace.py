# In-phase man defender through the flight, NFL side (pair of risk/man-phase-trace.ts). BDB 2025 drop-backs, man, the
# targeted WR / TE and his PFF primary matchup, in phase at pass_forward (no more than 1.0 yd behind, 1.5 yd side in
# the receiver's frame). Every 0.2 s (2 frames) from the release to the arrival (pass_arrived or the outcome event):
# distance, over (+ the defender deeper), receiver and defender speed, the receiver's heading change since the release.
# By route family (GO/POST/CORNER/WHEEL vertical, SLANT/IN/CROSS in, OUT/FLAT out, HITCH back). Dozen-play listing.
#   python3 -I nfl_man_trace.py data/raw/bdb2025/big-data-bowl-data 1,2,...
import csv, sys, os, math
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pass-matrix'))
from population import nfl_population
D = sys.argv[1]; weeks = sys.argv[2].split(',')
pop, _ = nfl_population(D); keep = {k for k, w in pop.items() if w == 'keep'}
POS = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
PL = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(f'{D}/plays.csv')) if r['pff_manZone'] == 'Man'}
FAM = {'GO': 'vertical', 'POST': 'vertical', 'CORNER': 'vertical', 'WHEEL': 'vertical', 'SLANT': 'in', 'IN': 'in', 'CROSS': 'in', 'OUT': 'out', 'FLAT': 'out', 'HITCH': 'back'}
tgt, route, mm = {}, {}, {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
  k = (r['gameId'], r['playId'])
  if k not in keep or k not in PL: continue
  if r['wasTargettedReceiver'] == '1' and POS.get(r['nflId']) in ('WR', 'TE'): tgt[k] = r['nflId']; route[k] = r['routeRan']
  m = r['pff_primaryDefensiveCoverageMatchupNflId']
  if m not in ('', 'NA'): mm.setdefault((k, m.split('.')[0]), r['nflId'])
ARR = ('pass_arrived', 'pass_outcome_caught', 'pass_outcome_incomplete', 'pass_outcome_interception')
def vel(r):
  h = math.radians(float(r['dir'])); s = float(r['s']); return s * math.sin(h), s * math.cos(h)
plays = []
for w in weeks:
  fr = {}; ev = {}; dirn = {}
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    k = (r['gameId'], r['playId'])
    if k not in tgt or r['displayName'] == 'football': continue
    f = int(r['frameId'])
    if r['event'] not in ('', 'NA'): ev.setdefault(k, {}).setdefault(r['event'], f)
    dirn[k] = 1 if r['playDirection'] == 'right' else -1
    fr.setdefault((k, f), {})[r['nflId']] = r
  for k, e in ev.items():
    rid = tgt[k]; did = mm.get((k, rid)); th = e.get('pass_forward'); arr = min([e[x] for x in ARR if x in e], default=None)
    if not did or th is None or arr is None or arr <= th: continue
    A = fr.get((k, th))
    if not A or rid not in A or did not in A or float(A[rid]['s']) < 2: continue
    vx, vy = vel(A[rid]); h0 = math.atan2(vy, vx); ux, uy = math.cos(h0), math.sin(h0)
    dx, dy = float(A[did]['x']) - float(A[rid]['x']), float(A[did]['y']) - float(A[rid]['y'])
    behind = -(dx * ux + dy * uy); side = abs(-dx * uy + dy * ux)
    if not (-1.0 <= behind <= 1.0 and side <= 1.5): continue
    tr = []
    for f in list(range(th, arr, 2)) + [arr]:
      R = fr.get((k, f))
      if not R or rid not in R or did not in R: continue
      a, b = R[rid], R[did]; ax, ay = vel(a); h = math.atan2(ay, ax)
      ddx, ddy = float(b['x']) - float(a['x']), float(b['y']) - float(a['y'])
      turn = abs((math.degrees(h - h0) + 180) % 360 - 180)
      tr.append(dict(dt=(f - th) / 10, dist=math.hypot(ddx, ddy), over=ddx * dirn[k], rsp=float(a['s']), dsp=float(b['s']), turn=turn))
    if tr: plays.append(dict(k=k, fam=FAM.get(route[k], 'other:' + route[k]), rr=route[k], cmp=PL[k]['passResult'] == 'C', flight=(arr - th) / 10, behind=behind, side=side, tr=tr))
def med(v):
  v = sorted(x for x in v if x is not None); return '-' if len(v) < 3 else f"{v[len(v)//2]:.2f}"
print(f"NFL in-phase man targets: n {len(plays)}")
for fam in ('all', 'vertical', 'in', 'out', 'back'):
  R = [p for p in plays if fam == 'all' or p['fam'] == fam]
  if len(R) < 5: continue
  cells = []
  for t in (0, .2, .4, .6, .8, 1.0):
    A = [q for p in R for q in p['tr'] if abs(q['dt'] - t) < .05]
    if len(A) >= 5: cells.append(f"{t:.1f}s {med([q['dist'] for q in A])}/{med([q['over'] for q in A])}")
  arr = [p['tr'][-1] for p in R]
  print(f"{fam:9s} n {len(R):4d} complete {round(100*sum(p['cmp'] for p in R)/len(R))}% flight {med([p['flight'] for p in R])} | dist/over by time: {' '.join(cells)} | arrival {med([q['dist'] for q in arr])}/{med([q['over'] for q in arr])} | rcv speed rel {med([p['tr'][0]['rsp'] for p in R])} -> arr {med([q['rsp'] for q in arr])}, turn {med([q['turn'] for q in arr])} deg | def speed {med([p['tr'][0]['dsp'] for p in R])} -> {med([q['dsp'] for q in arr])}")
print('--- dozen plays:')
for p in plays[:12]:
  print(f"{p['k']} {p['rr']}({p['fam']}) {'C' if p['cmp'] else 'I'} flight {p['flight']:.1f} | release behind {p['behind']:.2f} side {p['side']:.2f} | " + ' | '.join(f"{q['dt']:.1f}: d{q['dist']:.1f} o{q['over']:.1f} r{q['rsp']:.1f}/{q['turn']:.0f} m{q['dsp']:.1f}" for q in p['tr']))
