# NFL side of post-seam.mts (BDB 2025 drop-backs, population.py): Cover-1 (pff_passCoverage), the targeted receiver a
# slot (not the widest receiver on his side at the snap) running GO / POST / SEAM-like (routeRan GO), passLength 15+.
# The post safety = the deepest defender at the snap. At the release, the release + 0.3 s and the arrival: his depth,
# lateral offset from the target, distance to him, speed, velocity away from the line (+ = backpedal / gaining depth),
# closing rate on the target; completion.
#   python3 -I nfl_post_seam.py data/raw/bdb2025/big-data-bowl-data 1,2,3
import csv, sys, os, math
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pass-matrix'))
from population import nfl_population
D = sys.argv[1]; weeks = sys.argv[2].split(',')
pop, _ = nfl_population(D); keep = {k for k, w in pop.items() if w == 'keep'}
P = {}
for r in csv.DictReader(open(f'{D}/plays.csv')):
  k = (r['gameId'], r['playId'])
  if k in keep and r['pff_passCoverage'].startswith('Cover-1') and r['passResult'] in ('C', 'I', 'IN') and r['passLength'] not in ('', 'NA') and float(r['passLength']) >= 15:
    P[k] = (r['possessionTeam'], float(r['absoluteYardlineNumber']), r['passResult'] == 'C')
tgt, routes = {}, {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
  k = (r['gameId'], r['playId'])
  if k not in P: continue
  if r['wasRunningRoute'] in ('1', 'TRUE', 'True'): routes.setdefault(k, []).append(r['nflId'])
  if r['wasTargettedReceiver'] in ('1', 'TRUE', 'True') and r['routeRan'] == 'GO': tgt[k] = r['nflId']
rows = []
def vel(r): s, h = float(r['s']), math.radians(float(r['dir'])); return s * math.sin(h), s * math.cos(h)
for w in weeks:
  fr = {}; ev = {}; dirn = {}
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    k = (r['gameId'], r['playId'])
    if k not in tgt or r['displayName'] == 'football': continue
    f = int(r['frameId'])
    if r['event'] not in ('', 'NA'): ev.setdefault(k, {}).setdefault(r['event'], f)
    fr.setdefault((k, f), []).append(r)
    if r['nflId'] == tgt[k]: dirn[k] = 1 if r['playDirection'] == 'right' else -1
  for k, e in ev.items():
    sn, th, ar = e.get('ball_snap'), e.get('pass_forward'), e.get('pass_arrived')
    if None in (sn, th, ar) or k not in dirn: continue
    off, los, comp = P[k]; d = dirn[k]
    S = fr.get((k, sn));
    if not S: continue
    T = next((r for r in S if r['nflId'] == tgt[k]), None)
    if T is None: continue
    # A slot: some route runner on his side of the ball is wider than him at the snap.
    ball_y = 160 / 6
    side = [r for r in S if r['nflId'] in routes.get(k, []) and (float(r['y']) - ball_y) * (float(T['y']) - ball_y) > 0]
    if not any(abs(float(r['y']) - ball_y) > abs(float(T['y']) - ball_y) + 1 for r in side): continue
    defs = [r for r in S if r['club'] != off]
    if not defs: continue
    fsid = max(defs, key=lambda r: (float(r['x']) - los) * d)['nflId']
    def at(f):
      R = fr.get((k, f))
      if not R: return None
      F = next((r for r in R if r['nflId'] == fsid), None); C = next((r for r in R if r['nflId'] == tgt[k]), None)
      if not F or not C: return None
      fx, fy, cx, cy = float(F['x']), float(F['y']), float(C['x']), float(C['y'])
      vx, vy = vel(F); dx, dy = cx - fx, cy - fy; L = math.hypot(dx, dy) or 1e-6
      return dict(depth=(fx - los) * d, lat=abs(fy - cy), dist=L, sp=float(F['s']), back=vx * d, close=(vx * dx + vy * dy) / L)
    rows.append(dict(comp=comp, rel=at(th), t3=at(th + 3), arr=at(ar), flight=(ar - th) / 10))
def q(v):
  v = sorted(x for x in v if x is not None); return '-' if len(v) < 3 else '/'.join(f'{v[int(p * (len(v) - 1))]:.1f}' for p in (.25, .5, .75))
print(f'NFL Cover-1, targeted slot GO 15+ yd: n {len(rows)}, complete {sum(r["comp"] for r in rows)} | flight {q([r["flight"] for r in rows])} s')
for tag in ('rel', 't3', 'arr'):
  V = [r[tag] for r in rows if r[tag]]
  print(f'  {tag:4s} post safety depth {q([v["depth"] for v in V])} | lateral off the target {q([v["lat"] for v in V])} | to him {q([v["dist"] for v in V])} | speed {q([v["sp"] for v in V])} | gaining depth {q([v["back"] for v in V])} | closing on him {q([v["close"] for v in V])}')
