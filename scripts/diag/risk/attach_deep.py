"""Deep-seat downfield speed and depth rows for attach.py's records (Integration's extra column): per coverage family and seat, the defender's downfield
velocity over the last 0.5 s before the release (p25 / p50 / p75; positive = still gaining depth), the share still gaining depth (> 0.5 yd/s) and the share planted
(speed < 0.5 yd/s), and how much deeper he is than the deepest eligible receiver within 12 yd of him laterally (deep seats; for underneath the nearest eligible),
p25 / p50 / p75 (positive = he is past the route). Same record format and seat/route rules as attach.py (imported, not copied).
usage: python3 -I scripts/diag/risk/attach_deep.py name=FILE.jsonl.gz [...]"""
import sys, os, statistics as st
args = sys.argv[1:]; sys.argv = [sys.argv[0]]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import attach
def q(v, p):
  v = sorted(v); return v[min(len(v) - 1, int(p * (len(v) - 1) + 0.5))] if v else float('nan')
def row(nm, R):
  b = [r['bail'] for r in R if r['bail'] is not None]; g = [-r['rdepth'] for r in R if r['rdepth'] is not None]
  gain = sum(1 for x in b if x > 0.5) / max(1, len(b)); planted = sum(1 for r in R if r['sp'] < 0.5) / max(1, len(R))
  print(f'  {nm:<22} n {len(R):5d} | downfield speed at release p25 {q(b, .25):5.1f} p50 {q(b, .5):5.1f} p75 {q(b, .75):5.1f} | still gaining depth {gain:.2f} planted {planted:.2f}'
        f' | deeper than the route (n {len(g)}) p25 {q(g, .25):5.1f} p50 {q(g, .5):5.1f} p75 {q(g, .75):5.1f}')
for a in args:
  name, path = a.split('=', 1); R = attach.rows_of(path); print(f'{name}: coverage defenders {len(R)}')
  for seat in ('deep', 'under'):
    T = [r for r in R if r['seat'] == seat]; row(f'all families {seat}', T)
    for F in ('Cover-2', 'Cover-3', 'Quarters', 'Cover-6'):
      T = [r for r in R if r['F'] == F and r['seat'] == seat]
      if T: row(f'{F} {seat}', T)
