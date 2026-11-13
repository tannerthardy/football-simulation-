# Deep-ball placement in the NFL (BDB 2025 drop-back passes, population.py), the first check for the risk work:
# where the ball arrives (pass_arrived) relative to the targeted receiver, by the throw's distance (the ball's
# position at pass_forward to its position at pass_arrived), and completion, by distance band. The receiver's own
# adjustment is in the number: it is the ball-to-catcher distance at arrival, not the throw's miss from its aim.
#   python3 -I scripts/diag/risk/nfl_placement.py data/raw/bdb2025/big-data-bowl-data 1,2,3 > out/risk/nfl-placement.txt
import csv, sys, os, math, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pass-matrix'))
from population import nfl_population
D = sys.argv[1]; weeks = sys.argv[2].split(',')
pop, _ = nfl_population(D); keep = {k for k, w in pop.items() if w == 'keep'}
res = {(r['gameId'], r['playId']): r['passResult'] for r in csv.DictReader(open(f'{D}/plays.csv'))}
tgt = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
  k = (r['gameId'], r['playId'])
  if k in keep and r['wasTargettedReceiver'] in ('1', 'TRUE', 'True'): tgt[k] = r['nflId']
rows = []
for w in weeks:
  ev = {}; pos = {}
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    k = (r['gameId'], r['playId'])
    if k not in tgt: continue
    f = int(r['frameId'])
    if r['event'] not in ('', 'NA'): ev.setdefault(k, {}).setdefault(r['event'], f)
    who = 'ball' if r['displayName'] == 'football' else r['nflId']
    if who == 'ball' or who == tgt[k]: pos[(k, who, f)] = (float(r['x']), float(r['y']))
  for k in tgt:
    e = ev.get(k, {}); th = e.get('pass_forward'); ar = e.get('pass_arrived')
    if th is None or ar is None: continue
    b0, b1, rc = pos.get((k, 'ball', th)), pos.get((k, 'ball', ar)), pos.get((k, tgt[k], ar))
    if not (b0 and b1 and rc): continue
    rows.append((math.hypot(b1[0] - b0[0], b1[1] - b0[1]), math.hypot(b1[0] - rc[0], b1[1] - rc[1]), res[k]))
def q(v, p): v = sorted(v); return v[int(p * (len(v) - 1))] if v else float('nan')
print('throw distance (yd) | n | ball to catcher at arrival p50 / p75 / p90 (yd) | within 1.5 yd | completion')
for lo, hi in ((0, 10), (10, 20), (20, 30), (30, 40), (40, 70)):
  R = [r for r in rows if lo <= r[0] < hi]
  if not R: continue
  d = [r[1] for r in R]
  print(f"{lo}-{hi} | {len(R)} | {q(d,.5):.2f} / {q(d,.75):.2f} / {q(d,.9):.2f} | {sum(x <= 1.5 for x in d)/len(d):.3f} | {sum(r[2] == 'C' for r in R)/len(R):.3f}")
