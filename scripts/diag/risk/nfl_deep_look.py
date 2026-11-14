# NFL deep targets (BDB 2025 drop-back passes, population.py; routeRan GO/POST/CORNER/WHEEL, passLength 15+): when the
# targeted receiver's body orientation (`o`, not his head) turns back toward the passer, against the release
# (pass_forward) and the arrival (pass_arrived). "Back" = o within 90 deg of the bearing to the QB. Also the angle at the
# release, at the arrival minus 0.5 s and at the arrival; completion by whether he was turned back 0.5 s before it.
#   python3 -I scripts/diag/risk/nfl_deep_look.py data/raw/bdb2025/big-data-bowl-data 1,2,3
import csv, sys, os, math
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pass-matrix'))
from population import nfl_population
D = sys.argv[1]; weeks = sys.argv[2].split(',')
pop, _ = nfl_population(D); keep = {k for k, w in pop.items() if w == 'keep'}
QB = {r['nflId'] for r in csv.DictReader(open(f'{D}/players.csv')) if r['position'] == 'QB'}
P = {}
for r in csv.DictReader(open(f'{D}/plays.csv')):
  k = (r['gameId'], r['playId'])
  if k in keep and r['passResult'] in ('C', 'I', 'IN') and r['passLength'] not in ('', 'NA') and float(r['passLength']) >= 15: P[k] = r['passResult'] == 'C'
tgt = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
  k = (r['gameId'], r['playId'])
  if k in P and r['wasTargettedReceiver'] in ('1', 'TRUE', 'True') and r['routeRan'] in ('GO', 'POST', 'CORNER', 'WHEEL'): tgt[k] = (r['nflId'], r['routeRan'])
rows = []
for w in weeks:
  ev = {}; R = {}; Q = {}
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    k = (r['gameId'], r['playId'])
    if k not in tgt: continue
    f = int(r['frameId'])
    if r['event'] not in ('', 'NA'): ev.setdefault(k, {}).setdefault(r['event'], f)
    if r['nflId'] == tgt[k][0] and r['o'] not in ('', 'NA'): R[(k, f)] = (float(r['x']), float(r['y']), float(r['o']))
    elif r['nflId'] in QB: Q[(k, f)] = (float(r['x']), float(r['y']))
  for k, e in ev.items():
    sn, th, ar = e.get('ball_snap'), e.get('pass_forward'), e.get('pass_arrived')
    if None in (sn, th, ar) or ar <= th: continue
    def ang(f):
      a, q = R.get((k, f)), Q.get((k, min(f, th)))  # the passer where he threw from, after the release
      if not a or not q: return None
      b = math.degrees(math.atan2(q[0] - a[0], q[1] - a[1])) % 360
      d = abs(a[2] - b) % 360; return min(d, 360 - d)
    first = next((f for f in range(sn, ar + 1) if (ang(f) or 999) < 90), None)
    rows.append(dict(cmp=P[k], route=tgt[k][1], flight=(ar - th) / 10, first=None if first is None else (first - ar) / 10, rel_vs=None if first is None else (first - th) / 10,
                     at_rel=ang(th), at_m5=ang(ar - 5), at_ar=ang(ar)))
def q(v):
  v = sorted(x for x in v if x is not None); return '-' if len(v) < 5 else '/'.join(f'{v[int(p * (len(v) - 1))]:.1f}' for p in (.25, .5, .75))
print(f'NFL deep targets n {len(rows)} (complete {sum(r["cmp"] for r in rows) / max(1, len(rows)):.2f}) | flight {q([r["flight"] for r in rows])} s')
print(f'  first turned back (o within 90 deg of the passer) after the snap: {q([r["rel_vs"] for r in rows])} s from the release, {q([r["first"] for r in rows])} s from the arrival (never {sum(r["first"] is None for r in rows)})')
print(f'  o off the passer: at the release {q([r["at_rel"] for r in rows])} | 0.5 s before the arrival {q([r["at_m5"] for r in rows])} | at the arrival {q([r["at_ar"] for r in rows])} deg')
for lab, f in (('turned back 0.5 s out', lambda r: r['at_m5'] is not None and r['at_m5'] < 90), ('not turned 0.5 s out', lambda r: r['at_m5'] is not None and r['at_m5'] >= 90)):
  S = [r for r in rows if f(r)]
  if S: print(f'  {lab}: n {len(S)} | complete {sum(r["cmp"] for r in S) / len(S):.2f} | flight {q([r["flight"] for r in S])}')
