"""QB lane 2026-11-24: bootstrap (plays resampled, 300 draws, 95% interval) of leak_control_table.py's matched change
from baseline (thrown minus not thrown, matched on family and 0.2 s phase bins). usage: python3 -I leak_control_boot.py name=a.jsonl,..."""
import sys, json, math, random
from collections import defaultdict
def load(paths):
    P=[]
    for p in paths.split(','):
        for l in open(p):
            if l.startswith('{'):
                rows=[dict(r, dW=r['closeWind']-r['closeBase'], dP=(r['closePost']-r['closeBase']) if r.get('closePost') is not None else None) for r in json.loads(l)['rows'] if r.get('c') and r.get('closeWind') is not None and r.get('closeBase') is not None and r.get('phase') is not None and r['fam']!='vertical']
                if rows: P.append(rows)
    return P
def stat(P,F,key):
    cell=defaultdict(lambda:([],[]))
    for rows in P:
        for r in rows:
            if F(r) and r[key] is not None: cell[(r['fam'],math.floor(r['phase']/.2))][0 if r['thrown'] else 1].append(r[key])
    num=w=0
    for T,N in cell.values():
        if T and N: num+=(sum(T)/len(T)-sum(N)/len(N))*len(T); w+=len(T)
    return num/w if w else float('nan')
random.seed(1)
for arg in sys.argv[1:]:
    name,paths=arg.split('='); P=load(paths)
    for lab,F in (('all',lambda r:True),('sees',lambda r:r['sees']),('cannot see',lambda r:not r['sees']),('cannot see, man',lambda r:not r['sees'] and r.get('man'))):
        out=[]
        for key in ('dW','dP'):
            pt=stat(P,F,key); B=sorted(stat([random.choice(P) for _ in P],F,key) for _ in range(300))
            out.append(f"{key} {pt:+.2f} [{B[7]:+.2f},{B[292]:+.2f}]")
        print(f"{name:7s} {lab:16s} "+' | '.join(out))
