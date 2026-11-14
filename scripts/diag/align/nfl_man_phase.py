# Man defender's phase at the release and his play on the ball, NFL side (BDB 2025 drop-backs, population.py,
# pff_manZone Man; the targeted WR / TE and his primary PFF matchup). Phase at pass_forward in the receiver's frame:
# behind = how far the defender trails along the receiver's running line (+ behind), side = lateral gap. Classes:
# in phase (behind <= 1.0 and side <= 1.5: the sim's starting choice), trailing 1-2, trailing 2+, wide (side > 1.5).
# Flight = pass_arrived (or the outcome event) minus pass_forward. Outcomes: PBU (his passDefensed), INT (his
# hadInterception), complete (passResult C), contested (him within 1 yd at the arrival). Shoulders: his `o` within 60 deg
# of the ball's bearing in the last 0.5 s before the arrival (pads, not head; Tools' 12 deg floor; direction only).
#   python3 -I nfl_man_phase.py data/raw/bdb2025/big-data-bowl-data 1,2,...
import csv, sys, os, math
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pass-matrix'))
from population import nfl_population
D = sys.argv[1]; weeks = sys.argv[2].split(',')
pop, _ = nfl_population(D); keep = {k for k, w in pop.items() if w == 'keep'}
POS = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
PL = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(f'{D}/plays.csv')) if r['pff_manZone'] == 'Man'}
tgt, mm, pd, it = {}, {}, set(), set()
for r in csv.DictReader(open(f'{D}/player_play.csv')):
  k = (r['gameId'], r['playId'])
  if k not in keep or k not in PL: continue
  if r['wasTargettedReceiver'] == '1' and POS.get(r['nflId']) in ('WR', 'TE'): tgt[k] = r['nflId']
  m = r['pff_primaryDefensiveCoverageMatchupNflId']
  if m not in ('', 'NA'): mm[(k, m.split('.')[0])] = r['nflId']
  if r['passDefensed'] == '1': pd.add((k, r['nflId']))
  if r['hadInterception'] == '1': it.add((k, r['nflId']))
inv = {}
for (k, rid), did in mm.items(): inv.setdefault((k, rid), did)
rows = []
ARR = ('pass_arrived', 'pass_outcome_caught', 'pass_outcome_incomplete', 'pass_outcome_interception')
for w in weeks:
  fr = {}; ev = {}; dirn = {}
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    k = (r['gameId'], r['playId'])
    if k not in tgt: continue
    f = int(r['frameId'])
    if r['event'] not in ('', 'NA'): ev.setdefault(k, {}).setdefault(r['event'], f)
    dirn[k] = 1 if r['playDirection'] == 'right' else -1
    fr.setdefault((k, f), {})['ball' if r['displayName'] == 'football' else r['nflId']] = r
  for k, e in ev.items():
    rid = tgt[k]; did = inv.get((k, rid))
    th = e.get('pass_forward'); arr = min([e[x] for x in ARR if x in e], default=None)
    if not did or th is None or arr is None or arr <= th: continue
    A = fr.get((k, th)); B = fr.get((k, arr))
    if not A or not B or rid not in A or did not in A or rid not in B or did not in B: continue
    r_, d_ = A[rid], A[did]; h = math.radians(float(r_['dir'])); ux, uy = math.sin(h), math.cos(h)
    dx, dy = float(d_['x']) - float(r_['x']), float(d_['y']) - float(r_['y'])
    behind = -(dx * ux + dy * uy); side = abs(-dx * uy + dy * ux)
    if float(r_['s']) < 2: continue
    cls = 'wide' if side > 1.5 else 'in phase' if behind <= 1.0 else 'trail 1-2' if behind <= 2.0 else 'trail 2+'
    dist = math.hypot(float(B[did]['x']) - float(B[rid]['x']), float(B[did]['y']) - float(B[rid]['y']))
    tw = toward = None
    if 'ball' in B:
      ux, uy = float(B[did]['x']) - float(B[rid]['x']), float(B[did]['y']) - float(B[rid]['y']); n = math.hypot(ux, uy) or 1
      toward = ((float(B['ball']['x']) - float(B[rid]['x'])) * ux + (float(B['ball']['y']) - float(B[rid]['y'])) * uy) / n
    over = (float(B[did]['x']) - float(B[rid]['x'])) * dirn[k]
    sh = None
    for f in range(max(th, arr - 5), arr + 1):
      R = fr.get((k, f))
      if not R or did not in R or 'ball' not in R or R[did]['o'] in ('', 'NA'): continue
      bb = math.degrees(math.atan2(float(R['ball']['x']) - float(R[did]['x']), float(R['ball']['y']) - float(R[did]['y'])))
      dd = abs((float(R[did]['o']) - bb + 180) % 360 - 180)
      sh = (sh or False) or dd <= 60
    rows.append(dict(cls=cls, behind=behind, side=side, flight=(arr - th) / 10, dist=dist, pbu=(k, did) in pd, int=(k, did) in it,
      cmp=PL[k]['passResult'] == 'C', sh=sh, dpos=POS.get(did), toward=toward, over=over))
pct = lambda v: '-' if not v else f"{100 * sum(1 for x in v if x) / len(v):.0f}%"
def q(v, p=.5):
  v = sorted(x for x in v if x is not None); return '-' if len(v) < 5 else f"{v[int(p * (len(v) - 1))]:.2f}"
print(f"NFL man, targeted WR/TE with PFF matchup: n {len(rows)} | behind p25/50/75 {q([r['behind'] for r in rows], .25)}/{q([r['behind'] for r in rows])}/{q([r['behind'] for r in rows], .75)} | side {q([r['side'] for r in rows], .25)}/{q([r['side'] for r in rows])}/{q([r['side'] for r in rows], .75)}")
for c in ('in phase', 'trail 1-2', 'trail 2+', 'wide'):
  for lo, hi in ((0, 0.8), (0.8, 1.2), (1.2, 1.8), (1.8, 9), (0, 9)):
    R = [r for r in rows if r['cls'] == c and lo <= r['flight'] < hi]
    if len(R) >= 8: print(f"  {c:10s} flight {lo}-{hi}: n {len(R):4d} | complete {pct([r['cmp'] for r in R])} PBU {pct([r['pbu'] for r in R])} INT {pct([r['int'] for r in R])} contested {pct([r['dist'] <= 1 for r in R])} | dist at arrival {q([r['dist'] for r in R])} | pads to ball {pct([r['sh'] for r in R if r['sh'] is not None])}")
print('matched, by phase: ball toward him at the arrival (yd, + toward the defender), defender over the receiver (yd)')
for c in ('in phase', 'trail 1-2', 'trail 2+', 'wide'):
  R = [r for r in rows if r['cls'] == c]
  C = [r for r in R if r['dist'] <= 1]
  print(f"  {c:10s} n {len(R):4d} | ball toward him {q([r['toward'] for r in R])} (complete {q([r['toward'] for r in R if r['cmp']])}, not {q([r['toward'] for r in R if not r['cmp']])}) | over {q([r['over'] for r in R])} | contested n {len(C)} complete {pct([r['cmp'] for r in C])} PBU {pct([r['pbu'] for r in C])} toward {q([r['toward'] for r in C])}")
