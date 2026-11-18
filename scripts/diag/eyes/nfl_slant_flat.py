# QB lane 2026-11-18 (Integration: the quick game on time). BDB 2025 drop-backs (population.py) with at least one SLANT
# and one FLAT among the route runners, against zone (pff_manZone). Per play: time to throw, the target's route, the
# result (C / I / IN / S / R), air yards. By coverage family too. Labels are PFF's.
#   python3 -I scripts/diag/eyes/nfl_slant_flat.py data/raw/bdb2025/big-data-bowl-data
import csv, sys, os, collections as C, statistics as st
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pass-matrix'))
from population import nfl_population
D = sys.argv[1]
pop, _ = nfl_population(D); keep = {k for k, w in pop.items() if w == 'keep'}
plays = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(f'{D}/plays.csv'))}
route = C.defaultdict(list); tgt = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
  k = (r['gameId'], r['playId'])
  if k not in keep: continue
  if r['wasRunningRoute'] in ('1', 'TRUE', 'True'): route[k].append(r['routeRan'])
  if r['wasTargettedReceiver'] in ('1', 'TRUE', 'True'): tgt[k] = r['routeRan']
def q(xs, p): xs = sorted(xs); return xs[min(len(xs) - 1, int(p * len(xs)))] if xs else float('nan')
def summary(name, ks):
  tt = [float(plays[k]['timeToThrow']) for k in ks if plays[k]['timeToThrow'] not in ('', 'NA')]
  res = C.Counter(plays[k]['passResult'] for k in ks)
  tr = C.Counter(tgt.get(k, 'none') for k in ks)
  n = len(ks); thrown = sum(res[x] for x in ('C', 'I', 'IN'))
  print(f"{name}: n {n} | time to throw p25/50/75/90 {q(tt,.25):.2f} / {q(tt,.5):.2f} / {q(tt,.75):.2f} / {q(tt,.9):.2f}"
        f" | result {dict(res)} | completion of thrown {res['C'] / max(1, thrown):.3f} | target route {dict(tr.most_common(8))}")
  if tt:
    by = C.Counter(tgt.get(k, 'none') for k in ks if plays[k]['timeToThrow'] not in ('', 'NA') and float(plays[k]['timeToThrow']) <= 2.5)
    print(f"   thrown by 2.5 s: {sum(1 for x in tt if x <= 2.5)} of {len(tt)}; targets then {dict(by.most_common(6))}")
sf = [k for k in keep if 'SLANT' in route[k] and 'FLAT' in route[k] and plays[k]['pff_manZone'] == 'Zone']
summary('slant+flat vs zone', sf)
for cov in ['Cover-2', 'Cover-3', 'Quarters', 'Cover-6']:
  summary(f'  {cov}', [k for k in sf if plays[k]['pff_passCoverage'].startswith(cov)])
summary('all drop-backs vs zone', [k for k in keep if plays[k]['pff_manZone'] == 'Zone'])
