# NFL side of catch-split.ts (BDB 2025 drop-back passes, population.py; screens out). Short completions (passLength
# under 10) at pass_outcome_caught: catch depth past the line, catcher speed and upfield velocity, nearest defender and
# his closing speed toward the catcher (at the catch and 0.3 s after), yards after the catch, by route kind (stopped:
# HITCH; moving: SLANT/CROSS/FLAT/IN/ANGLE; OUT). Then, all short targets at pass_arrived: catch rate by the receiver's
# speed across the ball's line (horizontal, perpendicular to the ball's travel from pass_forward), with the nearest
# defender under or over 1.5 yd.
#   python3 -I scripts/diag/risk/nfl_catch_split.py data/raw/bdb2025/big-data-bowl-data 1,2,3
import csv, sys, os, math
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pass-matrix'))
from population import nfl_population
D = sys.argv[1]; weeks = sys.argv[2].split(',')
pop, _ = nfl_population(D); keep = {k for k, w in pop.items() if w == 'keep'}
KIND = {'HITCH': 'stopped', 'SLANT': 'moving', 'CROSS': 'moving', 'FLAT': 'moving', 'IN': 'moving', 'ANGLE': 'moving', 'OUT': 'out'}
P = {}
for r in csv.DictReader(open(f'{D}/plays.csv')):
  k = (r['gameId'], r['playId'])
  if k in keep and r['passResult'] in ('C', 'I', 'IN') and r['passLength'] not in ('', 'NA') and float(r['passLength']) < 10:
    P[k] = (r['possessionTeam'], float(r['absoluteYardlineNumber']), float(r['yardsGained']), r['passResult'] == 'C')
tgt = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
  k = (r['gameId'], r['playId'])
  if k in P and r['wasTargettedReceiver'] in ('1', 'TRUE', 'True'): tgt[k] = (r['nflId'], KIND.get(r['routeRan'], 'other'))
def vel(r): s, h = float(r['s']), math.radians(float(r['dir'])); return s * math.sin(h), s * math.cos(h)
caught_rows, arrive_rows = [], []
for w in weeks:
  fr = {}; ev = {}; ball = {}
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    k = (r['gameId'], r['playId'])
    if k not in tgt: continue
    f = int(r['frameId'])
    if r['event'] not in ('', 'NA'): ev.setdefault(k, {}).setdefault(r['event'], f)
    if r['displayName'] == 'football': ball[(k, f)] = (float(r['x']), float(r['y'])); continue
    fr.setdefault((k, f), []).append(r)
  for k, e in ev.items():
    off, los, yg, comp = P[k]; who, kind = tgt[k]
    def at(f):
      rs = fr.get((k, f));
      if not rs: return None
      C = next((r for r in rs if r['nflId'] == who), None)
      if C is None: return None
      x, y = float(C['x']), float(C['y']); defs = [r for r in rs if r['club'] != off and r['club'] != 'football']
      if not defs: return None
      N = min(defs, key=lambda r: math.hypot(float(r['x']) - x, float(r['y']) - y))
      nx, ny = float(N['x']) - x, float(N['y']) - y; dn = math.hypot(nx, ny) or 1e-6
      vx, vy = vel(N); cx, cy = vel(C)
      close = -((vx - cx) * nx + (vy - cy) * ny) / dn
      return C, x, y, dn, close
    fc = e.get('pass_outcome_caught')
    if comp and fc is not None:
      A, B = at(fc), at(fc + 3)
      if A:
        C, x, y, near, close = A; d = 1 if C['playDirection'] == 'right' else -1; cx, cy = vel(C)
        depth = (x - los) * d
        caught_rows.append(dict(kind=kind, depth=depth, speed=float(C['s']), up=cx * d, near=near, close=close, close3=B[4] if B else float('nan'), yac=yg - depth, yards=yg))
    th, ar = e.get('pass_forward'), e.get('pass_arrived')
    if th is not None and ar is not None and (k, th) in ball and (k, ar) in ball:
      A = at(ar)
      if A:
        C, x, y, near, _ = A; b0, b1 = ball[(k, th)], ball[(k, ar)]
        ux, uy = b1[0] - b0[0], b1[1] - b0[1]; L = math.hypot(ux, uy)
        if L > 1:
          cx, cy = vel(C); arrive_rows.append(dict(cross=abs((cx * uy - cy * ux) / L), near=near, comp=comp))
def q(v):
  v = sorted(x for x in v if x == x)
  return '-' if len(v) < 5 else '/'.join(f'{v[int(p * (len(v) - 1))]:.1f}' for p in (.25, .5, .75))
m = lambda v: f'{sum(v) / len(v):.2f}' if v else '-'
def line(R, tag):
  c = lambda f: [r[f] for r in R]
  print(f'{tag}: n {len(R)} | yards {m(c("yards"))} | depth {q(c("depth"))} | speed {q(c("speed"))} | upfield {q(c("up"))} | nearest {q(c("near"))} | closing at catch {q(c("close"))} / +0.3 s {q(c("close3"))} | YAC {q(c("yac"))} (mean {m(c("yac"))})')
line(caught_rows, 'NFL short completions')
for kind in ('stopped', 'moving', 'out'): line([r for r in caught_rows if r['kind'] == kind], f'   {kind}')
print('catch rate by speed across the ball line (yd/s) at pass_arrived | all | nearest < 1.5 yd | nearest >= 1.5 yd')
for lo, hi in ((0, 1), (1, 2), (2, 3), (3, 4.5), (4.5, 6), (6, 12)):
  R = [r for r in arrive_rows if lo <= r['cross'] < hi]
  if not R: continue
  f = lambda S: f"{sum(r['comp'] for r in S) / len(S):.3f} (n {len(S)})" if S else '-'
  print(f"{lo}-{hi} | {f(R)} | {f([r for r in R if r['near'] < 1.5])} | {f([r for r in R if r['near'] >= 1.5])}")
