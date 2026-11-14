# FORECAST_BREAK off vs on on the forced-concept panel (READ_PLAN off), for the concepts that carry a flat or swing:
#   python3 -I scripts/diag/forecast-break/flat_report.py out/forecast-break/panel-off.jsonl out/forecast-break/panel-fb.jsonl
import json, sys, collections as C
CONCEPTS = 'slant_flat,stick,curl_flat,mesh,flood,y_cross,pa_flood,double_slants,fade_flat,hitch_post,hitch_cross,corner_flat,trips_stick'.split(',')
FLAT = {'flat', 'arrow', 'swing', 'back_flat'}
def q(v, p):
  v = sorted(x for x in v if x is not None); return v[int(p * (len(v) - 1))] if v else float('nan')
def summ(R):
  n = len(R); a = [r for r in R if r['att']]
  return (f"plays {n} | att {len(a)} | cmp {sum(r['cmp'] for r in a)/max(1,len(a)):.3f} | ttt p50 {q([r['ttt'] for r in a],.5):.2f} p75 {q([r['ttt'] for r in a],.75):.2f}"
          f" | sacks {sum(r['sack'] for r in R)} | INT {sum(r['int'] for r in R)} | yds/play {sum(r['yards'] for r in R)/max(1,n):.2f}")
arms = {p.split('panel-')[1].split('.')[0]: [json.loads(l) for l in open(p) if json.loads(l)['concept'] in CONCEPTS] for p in sys.argv[1:]}
print('## Concepts carrying a flat or swing:', ', '.join(CONCEPTS))
for a, R in arms.items(): print(f"{a}: {summ(R)}")
print('\n## Where the ball went (share of attempts)')
for a, R in arms.items():
  att = [r for r in R if r['att']]; c = C.Counter('flat/swing' if r['route'] in FLAT else 'back' if r['route'] in ('checkdown', 'angle', 'back_out', 'wheel') else 'other' for r in att)
  print(a, {k: round(v / len(att), 3) for k, v in c.most_common()})
print('\n## When the flat (or swing) is thrown')
for a, R in arms.items():
  F = [r for r in R if r['att'] and r['route'] in FLAT]
  if not F: print(a, 'none'); continue
  print(f"{a}: n {len(F)} | cmp {sum(r['cmp'] for r in F)/len(F):.3f} | INT {sum(r['int'] for r in F)} | yds/att {sum(r['yards'] for r in F)/len(F):.2f} | ttt p50 {q([r['ttt'] for r in F],.5):.2f} | air p50 {q([r['air'] for r in F],.5)}")
print('\n## By concept: yards a play, flat/swing share of attempts, INT')
print('concept | ' + ' | '.join(arms))
for c in CONCEPTS:
  cells = []
  for R in arms.values():
    P = [r for r in R if r['concept'] == c]; a = [r for r in P if r['att']]
    cells.append(f"{sum(r['yards'] for r in P)/len(P):.1f} / {sum(r['route'] in FLAT for r in a)/max(1,len(a)):.2f} / {sum(r['int'] for r in P)}")
  print(c + ' | ' + ' | '.join(cells))
