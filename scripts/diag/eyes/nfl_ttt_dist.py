"""NFL time-to-throw distribution (BDB 2025 plays.csv, all weeks): dropbacks with a throw (C, I, IN), by QB alignment
(shotgun/empty/pistol against under center) and play action: p50/p75/p90 and the share thrown after 3.0 and 3.5 s.
   python3 -I scripts/diag/eyes/nfl_ttt_dist.py <bdb2025 dir>"""
import csv, sys
rows = [r for r in csv.DictReader(open(f'{sys.argv[1]}/plays.csv')) if r['isDropback'] in ('TRUE', 'True', '1') and r['passResult'] in ('C', 'I', 'IN') and r['timeToThrow'] not in ('', 'NA')]
def summ(X):
    v = sorted(float(r['timeToThrow']) for r in X); n = len(v)
    return f"n {n:5}  p50 {v[n//2]:.2f}  p75 {v[3*n//4]:.2f}  p90 {v[int(.9*n)]:.2f}  >3.0 {100*sum(x > 3 for x in v)/n:4.1f}%  >3.5 {100*sum(x > 3.5 for x in v)/n:4.1f}%"
gun = lambda r: r['offenseFormation'] in ('SHOTGUN', 'EMPTY', 'PISTOL')
pa = lambda r: r['playAction'] in ('TRUE', 'True', '1')
print('all            ', summ(rows))
for name, f in (('gun, no PA     ', lambda r: gun(r) and not pa(r)), ('under, no PA   ', lambda r: not gun(r) and not pa(r)), ('play action    ', pa)):
    print(name, summ([r for r in rows if f(r)]))
