# NFL side of slot-break.mts (BDB 2025 drop-backs, population.py): man coverage (pff_manZone Man), the targeted
# receiver a slot (a route runner wider than him on his side at the snap) running SLANT / CROSS / IN, passLength under
# 15. His man = PFF's primary coverage matchup on him (pff_primaryDefensiveCoverageMatchupNflId). The
# break: his heading turns 45+ deg off his stem (stem: heading once over 3 yd/s, 0.4 s after the snap). At the break and
# +0.3 / +0.6 s: separation from that defender, the defender's depth over him; completion.
#   python3 -I nfl_slot_break.py data/raw/bdb2025/big-data-bowl-data 1,2,...
import csv, sys, os, math
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pass-matrix'))
from population import nfl_population
D = sys.argv[1]; weeks = sys.argv[2].split(',')
pop, _ = nfl_population(D); keep = {k for k, w in pop.items() if w == 'keep'}
P = {}
for r in csv.DictReader(open(f'{D}/plays.csv')):
  k = (r['gameId'], r['playId'])
  if k in keep and r['pff_manZone'] == 'Man' and r['passResult'] in ('C', 'I', 'IN') and r['passLength'] not in ('', 'NA') and float(r['passLength']) < 15:
    P[k] = (r['possessionTeam'], float(r['absoluteYardlineNumber']), r['passResult'] == 'C')
tgt, routes, mm = {}, {}, {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
  k = (r['gameId'], r['playId'])
  if k not in P: continue
  if r['wasRunningRoute'] in ('1', 'TRUE', 'True'): routes.setdefault(k, []).append(r['nflId'])
  if r['pff_primaryDefensiveCoverageMatchupNflId'] not in ('', 'NA'): mm[(k, r['pff_primaryDefensiveCoverageMatchupNflId'].split('.')[0])] = r['nflId']
  if r['wasTargettedReceiver'] in ('1', 'TRUE', 'True') and r['routeRan'] in ('SLANT', 'CROSS', 'IN'): tgt[k] = (r['nflId'], r['routeRan'])
def ang(a, b): d = abs(a - b) % 360; return min(d, 360 - d)
rows = []
for w in weeks:
  fr = {}; ev = {}; dirn = {}
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    k = (r['gameId'], r['playId'])
    if k not in tgt or r['displayName'] == 'football': continue
    f = int(r['frameId'])
    if r['event'] not in ('', 'NA'): ev.setdefault(k, {}).setdefault(r['event'], f)
    fr.setdefault((k, f), {})[r['nflId']] = r
    if r['nflId'] == tgt[k][0]: dirn[k] = 1 if r['playDirection'] == 'right' else -1
  for k, e in ev.items():
    sn, th = e.get('ball_snap'), e.get('pass_forward')
    if None in (sn, th) or k not in dirn: continue
    off, los, comp = P[k]; d = dirn[k]; tid, rt = tgt[k]
    S = fr.get((k, sn))
    if not S or tid not in S: continue
    T = S[tid]; by = 160 / 6
    side = [r for i, r in S.items() if i in routes.get(k, []) and (float(r['y']) - by) * (float(T['y']) - by) > 0]
    if not any(abs(float(r['y']) - by) > abs(float(T['y']) - by) + 1 for r in side): continue
    defs = [r for r in S.values() if r['club'] != off]
    if not defs: continue
    mid = mm.get((k, tid))
    if mid is None or mid not in S: continue
    M = S[mid]; depth0 = (float(M['x']) - los) * d
    stem, brk = None, None
    for f in range(sn + 4, th + 10):
      R = fr.get((k, f))
      if not R or tid not in R: continue
      s, h = float(R[tid]['s']), float(R[tid]['dir'])
      if stem is None and s > 3: stem = h
      elif stem is not None and s > 2 and ang(h, stem) > 45: brk = f; break
    if brk is None: continue
    def sep(f):
      R = fr.get((k, f))
      if not R or tid not in R or mid not in R: return None
      a, b = R[tid], R[mid]; return math.hypot(float(a['x']) - float(b['x']), float(a['y']) - float(b['y'])), (float(b['x']) - float(a['x'])) * d
    s0, s3, s6 = sep(brk), sep(brk + 3), sep(brk + 6)
    if not s0: continue
    rows.append(dict(rt=rt, comp=comp, depth0=depth0, brk=(brk - sn) / 10, s0=s0[0], over=s0[1], s3=s3[0] if s3 else None, s6=s6[0] if s6 else None))
def q(v):
  v = sorted(x for x in v if x is not None); return '-' if len(v) < 3 else '/'.join(f'{v[int(p * (len(v) - 1))]:.2f}' for p in (.25, .5, .75))
for rt in ('SLANT', 'CROSS', 'IN', 'ALL'):
  R = [r for r in rows if rt == 'ALL' or r['rt'] == rt]
  if R: print(f'NFL man, slot {rt}: n {len(R)}, complete {sum(r["comp"] for r in R) / len(R):.2f} | his man at the snap {q([r["depth0"] for r in R])} deep | break {q([r["brk"] for r in R])} s | over him at the break {q([r["over"] for r in R])} | separation at the break {q([r["s0"] for r in R])}, +0.3 s {q([r["s3"] for r in R])}, +0.6 s {q([r["s6"] for r in R])}')
