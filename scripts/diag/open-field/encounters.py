"""First encounters past the line (defender within 2 yd of the runner):
what the defender did, by the play's eventual gain. usage: encounters.py 'glob'"""
import glob, gzip, json, sys, statistics as st
from collections import Counter, defaultdict
rows = [json.loads(l) for f in sorted(glob.glob(sys.argv[1])) for l in gzip.open(f, 'rt') if l.strip()]
rows = [r for r in rows if 'error' not in r]
role = lambda s: 'DB' if s in ('CB_S', 'CB_W', 'FS', 'SS', 'NB') else 'LB' if s.startswith('LB') else 'DL'
E = [(r, e) for r in rows for e in r['enc'] if not e['bond']]
print('free first encounters', len(E))
tab = defaultdict(Counter)
for r, e in E:
    band = 'long(15+)' if r['gain'] >= 15 else 'mid(5-15)' if r['gain'] >= 5 else 'short'
    tab[(role(e['d']), band)][e['out']] += 1
for k in sorted(tab): 
    c = tab[k]; n = sum(c.values()); print(k, n, {o: f"{100*v/n:.0f}%" for o, v in c.most_common()})
def med(xs): xs = sorted(xs); return xs[len(xs)//2] if xs else None
print('\nGeometry of free DB/LB encounters by what the defender did (medians):')
for o in ('wrap', 'none', 'miss', 'dive-miss'):
    sel = [e for r, e in E if e['out'] == o and role(e['d']) != 'DL']
    if sel: print(f"  {o:9s} n={len(sel):4d} along {med([e['along'] for e in sel])} across {med([e['across'] for e in sel])} ds {med([e['ds'] for e in sel])} cs {med([e['cs'] for e in sel])} dAlong {med([e['dAlong'] for e in sel])} closing {med([e['closing'] for e in sel])} dmin {med([e.get('dmin', 9) for e in sel])}")
none = [e for r, e in E if e['out'] == 'none' and role(e['d']) != 'DL']
print('  none: along<0 (already behind runner)', sum(e['along'] < 0 for e in none), '/', len(none), '; dmin<1.3', sum(e.get('dmin', 9) < 1.3 for e in none))
# Long runs: the sequence of free encounters
print('\n15+ runs: free encounters in order')
for r in [r for r in rows if r['gain'] >= 15][:25]:
    print(f"{r['id']:38s} {r['gain']:5.1f}", ' | '.join(f"{e['d']}@{e['depth']:.0f} {e['out']} al{e['along']:+.1f} ac{e['across']:.1f} ds{e['ds']:.1f} dmin{e.get('dmin',9):.1f}" for e in sorted(r['enc'], key=lambda e: e['t']) if not e['bond']))
