# NFL side of catch-split.ts (BDB 2025 drop-back passes, population.py; screens out): short completions (passLength
# under 10), at the pass_outcome_caught frame: catch depth past the line, catcher speed and upfield velocity, nearest
# defender, and yards after the catch (yardsGained minus catch depth). Same definitions as the sim operator.
#   python3 -I scripts/diag/risk/nfl_catch_split.py data/raw/bdb2025/big-data-bowl-data 1,2,3
import csv, sys, os, math
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pass-matrix'))
from population import nfl_population
D = sys.argv[1]; weeks = sys.argv[2].split(',')
pop, _ = nfl_population(D); keep = {k for k, w in pop.items() if w == 'keep'}
P = {}
for r in csv.DictReader(open(f'{D}/plays.csv')):
  k = (r['gameId'], r['playId'])
  if k in keep and r['passResult'] == 'C' and r['passLength'] not in ('', 'NA') and float(r['passLength']) < 10:
    P[k] = (r['possessionTeam'], float(r['absoluteYardlineNumber']), float(r['yardsGained']))
tgt = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
  k = (r['gameId'], r['playId'])
  if k in P and r['wasTargettedReceiver'] in ('1', 'TRUE', 'True'): tgt[k] = r['nflId']
rows = []
for w in weeks:
  fr = {}; caught = {}
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    k = (r['gameId'], r['playId'])
    if k not in tgt or r['displayName'] == 'football': continue
    f = int(r['frameId'])
    if r['event'] == 'pass_outcome_caught': caught.setdefault(k, f)
    fr.setdefault((k, f), []).append(r)
  for k, f in caught.items():
    rs = fr.get((k, f)); off, los, yg = P[k]
    if not rs: continue
    C = next((r for r in rs if r['nflId'] == tgt[k]), None)
    if C is None: continue
    d = 1 if C['playDirection'] == 'right' else -1
    x, y, s, h = float(C['x']), float(C['y']), float(C['s']), math.radians(float(C['dir']))
    near = min(math.hypot(float(r['x']) - x, float(r['y']) - y) for r in rs if r['club'] != off)
    depth = (x - los) * d
    rows.append((depth, s, s * math.sin(h) * d, near, yg - depth, yg))
def q(v): v = sorted(v); return '/'.join(f'{v[int(p * (len(v) - 1))]:.1f}' for p in (.25, .5, .75))
m = lambda v: f'{sum(v) / len(v):.2f}'
c = lambda i: [r[i] for r in rows]
print(f'NFL short completions n {len(rows)} | yards mean {m(c(5))} | catch depth {q(c(0))} (mean {m(c(0))}) | YAC {q(c(4))} (mean {m(c(4))}) | speed at the catch {q(c(1))} | upfield {q(c(2))} | nearest defender {q(c(3))}')
