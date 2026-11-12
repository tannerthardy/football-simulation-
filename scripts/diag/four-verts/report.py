# Four verticals report: python3 -I scripts/diag/four-verts/report.py out/four-verts/nfl.jsonl out/four-verts/sim-<arm>.jsonl ...
import json, sys, collections as C
def q(v, p):
  v = sorted(x for x in v if x is not None); return v[int(p * (len(v) - 1))] if v else float('nan')
NFLCOV = {'Cover-1': 'cover1', 'Cover-1 Double': 'cover1', 'Cover-0': 'cover0', 'Cover-2': 'cover2', '2-Man': 'cover2',
          'Cover-3': 'cover3', 'Cover-3 Seam': 'cover3', 'Cover-3 Cloud Left': 'cover3', 'Cover-3 Cloud Right': 'cover3', 'Cover-3 Double Cloud': 'cover3',
          'Quarters': 'cover4', 'Cover 6-Left': 'cover4', 'Cover-6 Right': 'cover4', 'Cover 6-Right': 'cover4', 'Cover-6 Left': 'cover4', 'Red Zone': 'other', 'Goal Line': 'other'}
arms = {}
for p in sys.argv[1:]:
  R = [json.loads(l) for l in open(p)]
  name = 'NFL' if 'nfl' in p.split('/')[-1] else p.split('sim-')[-1].split('.')[0]
  for r in R:
    if name == 'NFL': r['cov'] = NFLCOV.get(r.get('coverage') or '', 'other')
    else: r['cov'] = r['coverage']
  arms[name] = R
def block(R):
  a = [r for r in R if r['att']]; n = len(a)
  if not n: return None
  share = {k: sum(r['target'] == k for r in a) / n for k in ('seam', 'go', 'back', 'other')}
  seam = [r for r in a if r['target'] == 'seam']
  ts = [x for r in seam for x in (r['atThrow'] or []) if x.get('tgt') or (x['cls'] == 'seam' and r.get('targetRef') == x.get('ref'))]
  early = [r for r in R if r['firstOpen'] and r['firstOpen']['t'] <= 2.6]
  e_seam = [r for r in early if r['att'] and r['target'] == 'seam']
  delay = [r['ttt'] - r['firstOpen']['t'] for r in e_seam if r['ttt'] is not None]
  return {'plays': len(R), 'att': n, **{f'to {k}': round(v, 3) for k, v in share.items()}, 'ttt p50': q([r['ttt'] for r in a], .5),
          'seam cmp': round(sum(r['cmp'] for r in seam) / max(1, len(seam)), 3), 'seam INT': sum(r['int'] for r in seam), 'sacks': sum(r.get('sack', False) for r in R),
          'seam sep at throw p50': q([x['sep'] for x in ts], .5), 'seam open-for at throw p50': q([x['openFor'] for x in ts], .5),
          'a seam open by 2.6 s': round(len(early) / len(R), 3), '...then thrown to a seam': round(len(e_seam) / max(1, len(early)), 3),
          '...delay from open to throw p50': q(delay, .5)}
def dfn(R, at):
  V = [v for r in R for v in r['verts'] if v['cls'] == 'seam' and v[at]]
  who = C.Counter(v[at].get('slot') or v[at].get('pos') for v in V)
  return f"n {len(V)}, dist p50 {q([v[at]['dist'] for v in V], .5):.2f}, >=3 yd {sum(v[at]['dist'] >= 3 for v in V) / max(1, len(V)):.2f}, nearest {', '.join(f'{k} {c / len(V):.2f}' for k, c in who.most_common(3))}"
print('## Four verticals: all coverages')
keys = None
for name, R in arms.items():
  b = block(R)
  if keys is None: keys = list(b); print('arm | ' + ' | '.join(keys))
  print(name + ' | ' + ' | '.join(str(b[k]) for k in keys))
print('\n## By coverage (to seam / go / back; ttt p50; a seam open by 2.6 s -> thrown to a seam, delay p50; n attempts)')
for cov in ('cover1', 'cover2', 'cover3', 'cover4'):
  for name, R in arms.items():
    b = block([r for r in R if r['cov'] == cov])
    if b: print(f"{cov} {name:7s} | seam {b['to seam']:.2f} go {b['to go']:.2f} back {b['to back']:.2f} | ttt {b['ttt p50']:.2f} | seam open by 2.6 s {b['a seam open by 2.6 s']:.2f} -> thrown {b['...then thrown to a seam']:.2f}, delay {b['...delay from open to throw p50']} | n {b['att']}")
print('\n## The defense: nearest defender to each seam as he passes 12 and 18 yd (all coverages)')
for name, R in arms.items(): print(f"{name:7s} at 12 yd: {dfn(R, 'at12')} | at 18 yd: {dfn(R, 'at18')}")
