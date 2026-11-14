# Zone cushion over a crosser passing through a defender's lane, NFL side (BDB 2025 drop-backs, population.py,
# pff_manZone Zone, routeRan CROSS by a WR or TE, ball held). The pass: the crosser's lateral position crosses an
# underneath defender's (not DL; 1.5-12 yd off the line at that frame) while the crosser runs more across than up
# (|vy| > |vx|). At the pass frame: distance, over (defender depth minus crosser depth), the defender's speed along the
# crosser's lateral direction (v_with) and toward the line of scrimmage; distance 0.5 s before and after, closest within
# +-0.5 s; whether he is the crosser's nearest defender then. By defender position and the crosser's depth class.
#   python3 -I nfl_zone_cushion.py data/raw/bdb2025/big-data-bowl-data 1,2,...
import csv, sys, os, math
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pass-matrix'))
from population import nfl_population
D = sys.argv[1]; weeks = sys.argv[2].split(',')
pop, _ = nfl_population(D); keep = {k for k, w in pop.items() if w == 'keep'}
POS = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
PL = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(f'{D}/plays.csv')) if r['pff_manZone'] == 'Zone'}
DL = {'DE', 'DT', 'NT'}
cross = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
  k = (r['gameId'], r['playId'])
  if k in keep and k in PL and r['routeRan'] == 'CROSS' and POS.get(r['nflId']) in ('WR', 'TE'): cross.setdefault(k, []).append(r['nflId'])
rows = []
for w in weeks:
  fr = {}; ev = {}; dirn = {}
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    k = (r['gameId'], r['playId'])
    if k not in cross or r['displayName'] == 'football': continue
    f = int(r['frameId'])
    if r['event'] not in ('', 'NA'): ev.setdefault(k, {}).setdefault(r['event'], f)
    dirn[k] = 1 if r['playDirection'] == 'right' else -1
    fr.setdefault((k, f), {})[r['nflId']] = r
  for k, e in ev.items():
    sn, th = e.get('ball_snap'), e.get('pass_forward')
    if sn is None: continue
    end = th if th is not None else sn + 40
    pl = PL[k]; los = float(pl['absoluteYardlineNumber']); sg = dirn[k]
    R0 = fr.get((k, sn))
    if not R0: continue
    defs = [i for i, r in R0.items() if r['club'] != pl['possessionTeam'] and POS.get(i) not in DL]
    depth = lambda r: (float(r['x']) - los) * sg
    vel = lambda r: (float(r['s']) * math.sin(math.radians(float(r['dir']))) * sg, float(r['s']) * math.cos(math.radians(float(r['dir']))))
    for tid in cross[k]:
      seen = set()
      for f in range(sn + 5, end + 1):
        A, B = fr.get((k, f - 1)), fr.get((k, f))
        if not A or not B or tid not in A or tid not in B: continue
        rv = vel(B[tid])
        if abs(rv[1]) <= abs(rv[0]) or abs(rv[1]) < 2: continue
        for d in defs:
          if d in seen or d not in A or d not in B: continue
          dd = depth(B[d])
          if not 1.5 <= dd <= 12: continue
          s0 = float(A[tid]['y']) - float(A[d]['y']); s1 = float(B[tid]['y']) - float(B[d]['y'])
          if s0 == 0 or (s0 > 0) == (s1 > 0): continue
          seen.add(d)
          def dist(g):
            R = fr.get((k, g))
            return math.hypot(float(R[tid]['x']) - float(R[d]['x']), float(R[tid]['y']) - float(R[d]['y'])) if R and tid in R and d in R else None
          near = min((math.hypot(float(B[tid]['x']) - float(B[o]['x']), float(B[tid]['y']) - float(B[o]['y'])), o) for o in defs if o in B)[1] == d
          dv = vel(B[d]); side = 1 if rv[1] > 0 else -1
          win = [x for x in (dist(g) for g in range(f - 5, f + 6)) if x is not None]
          rows.append(dict(dpos=POS.get(d), rdepth=depth(B[tid]), dist=dist(f), over=dd - depth(B[tid]), vwith=dv[1] * side, vdown=dv[0],
            pre=dist(f - 5), post=dist(f + 5), close=min(win), near=near, t=(f - sn) / 10))
def q(v):
  v = sorted(x for x in v if x is not None); return '-' if len(v) < 5 else f"{v[len(v)//2]:.2f}"
def line(R, tag):
  print(f"{tag}: n {len(R)} | dist -0.5/0/+0.5 {q([r['pre'] for r in R])}/{q([r['dist'] for r in R])}/{q([r['post'] for r in R])} closest {q([r['close'] for r in R])}"
        f" | over {q([r['over'] for r in R])} v_with {q([r['vwith'] for r in R])} v_down {q([r['vdown'] for r in R])} | nearest {round(100*sum(r['near'] for r in R)/max(1,len(R)))}% t {q([r['t'] for r in R])}")
for cls, lo, hi in (('all', -9, 99), ('shallow <4', -9, 4), ('mid 4-8', 4, 8), ('deep 8+', 8, 99)):
  C = [r for r in rows if lo <= r['rdepth'] < hi]
  line(C, f'NFL zone, crosser {cls}')
  for dp in ('ILB', 'OLB', 'MLB', 'LB', 'CB', 'SS', 'FS'):
    R = [r for r in C if r['dpos'] == dp]
    if len(R) >= 15: line(R, f'  {dp}')
