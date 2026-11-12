# READ_PLAN panel report: python3 -I scripts/diag/read-plan/report.py out/read-plan/panel-{off,plan,fb,both}.jsonl
# Per arm: attempts, completion, time to throw, sacks, INT, yards a play, and where the ball went; per plan style;
# and the share of throws to the answer the HonestNFL sheets teach against that coverage (sheet ids in INTENDED).
import json, sys, collections as C
INTENDED = {  # (concept, coverage): (routes the sheets' read throws, sheet ids)
  ('smash', 'cover2'): ({'corner'}, 'cloud corner squats -> corner: 294/328, 135, 311'),
  ('corner_flat', 'cover2'): ({'corner'}, 'cloud corner squats -> corner: 161, 111'),
  ('dagger', 'cover2'): ({'dig'}, 'seam clears the half safety, dig in the void: 294/328'),
  ('flood', 'cover3'): ({'out'}, 'curl-flat defender, sail (the out here) vs Cover 3: 307, 327, 111'),
  ('four_verts', 'cover3'): ({'seam'}, 'seam away from the post safety vs one-high: 001, 111'),
  ('quick_outs', 'cover4'): ({'quick_out'}, 'quarters gives up the flat; throw on time to leverage: 142/191/361'),
  ('curl_flat', 'cover3'): ({'curl', 'flat'}, 'curl-flat defender either/or: 111, 123'),
  ('sail_corner', 'cover3'): ({'corner', 'quick_out', 'out'}, 'top-down corner to out off the curl-flat apex: 329'),
}
def q(v, p):
  v = sorted(x for x in v if x is not None)
  return v[int(p * (len(v) - 1))] if v else float('nan')
def summ(R):
  n = len(R); att = [r for r in R if r['att']]
  return (f"plays {n} | att {len(att)} | cmp {sum(r['cmp'] for r in att)/max(1,len(att)):.3f} | ttt p50 {q([r['ttt'] for r in att],.5):.2f} p75 {q([r['ttt'] for r in att],.75):.2f}"
          f" | sacks {sum(r['sack'] for r in R)} | INT {sum(r['int'] for r in R)} | yds/play {sum(r['yards'] for r in R)/n:.2f}")
arms = {p.split('panel-')[1].split('.')[0]: [json.loads(l) for l in open(p)] for p in sys.argv[1:]}
print('## Arms'); [print(f"{a}: {summ(R)}") for a, R in arms.items()]
print('\n## Where the ball went (share of attempts by route family)')
fam = lambda rt: 'back' if rt in ('checkdown', 'angle', 'swing', 'back_out', 'wheel', 'back_flat') else 'flat/arrow' if rt in ('flat', 'arrow') else rt or '?'
allr = sorted({fam(r['route']) for R in arms.values() for r in R if r['att']})
print('arm | ' + ' | '.join(allr))
for a, R in arms.items():
  att = [r for r in R if r['att']]; c = C.Counter(fam(r['route']) for r in att)
  print(a + ' | ' + ' | '.join(f"{c[x]/len(att):.3f}" for x in allr))
print('\n## By plan style (arms with a plan)')
for a, R in arms.items():
  if not any(r['plan'] for r in R): continue
  for st in sorted({r['plan'] for r in R if r['plan']}):
    print(f"{a} {st}: {summ([r for r in R if r['plan'] == st])}")
  K = [r for r in R if r['plan'] == 'defender_key']
  print(f"{a} key reads: {C.Counter(r['key'] for r in K)}; with a defender in the stretch {sum(1 for r in K if r['keyDef'])}/{len(K)}")
print('\n## The sheets\' answer by concept and coverage (share of attempts thrown there; n attempts)')
print('concept / coverage | ' + ' | '.join(arms) + ' | sheets')
for (cpt, cov), (routes, why) in INTENDED.items():
  cells = []
  for a, R in arms.items():
    att = [r for r in R if r['concept'] == cpt and r['coverage'] == cov and r['att']]
    cells.append(f"{sum(r['route'] in routes for r in att)/max(1,len(att)):.2f} ({len(att)})")
  print(f"{cpt} / {cov} -> {'/'.join(sorted(routes))} | " + ' | '.join(cells) + f" | {why}")
print('\n## Per concept: yards a play and sacks+INT (all coverages)')
print('concept | ' + ' | '.join(arms))
for cpt in sorted({r['concept'] for R in arms.values() for r in R}):
  print(cpt + ' | ' + ' | '.join(f"{sum(r['yards'] for r in R if r['concept']==cpt)/max(1,sum(r['concept']==cpt for r in R)):.1f} / {sum(r['sack'] or r['int'] for r in R if r['concept']==cpt)}" for R in arms.values()))
