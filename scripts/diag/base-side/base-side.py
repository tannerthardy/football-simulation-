# Usage: python3 scripts/diag/base-side/base-side.py out/base-side-nfl.json out/base-side-sim.json
import json,sys,math,statistics as S
from collections import Counter
deg=math.degrees
def wrap(a): return math.atan2(math.sin(a),math.cos(a))
def table(name,R):
    set_=[r for r in R if abs(deg(r['sh']))>=10]
    side=[r for r in set_ if abs(r['lat'])>=2]
    agree=sum(1 for r in side if (r['sh']>0)==(r['lat']>0))
    err=[abs(deg(wrap(r['sh']-r['thr']))) for r in R]
    runs=[r for r in side if r.get('run') is not None and abs(r['run'])>=1]
    ra=sum(1 for r in runs if (r['sh']>0)==(r['run']>0))
    print(f"{name}: throws {len(R)} | shoulders set 10+ deg off square {100*len(set_)/len(R):.0f}% | of those with a 2+ yd lateral throw (n {len(side)}) the throw goes to the shoulders' side {100*agree/max(1,len(side)):.0f}% | shoulders-to-throw angle p25/50/75 {sorted(err)[len(err)//4]:.0f}/{S.median(err):.0f}/{sorted(err)[3*len(err)//4]:.0f} deg | catcher runs to the shoulders' side {100*ra/max(1,len(runs)):.0f}% (n {len(runs)})")
nfl=json.load(open(sys.argv[1])); sim=json.load(open(sys.argv[2]))
table('NFL o (0.3-0.6 s before release)',nfl)
table('sim trunk (0.3-0.6 s before release)',sim)
# (1) sim ticks where trunk and head disagree by 10+ deg while set/loading
c=Counter(); cr=Counter(); n=0
for r in sim:
    for f,h in r['dis']:
        if abs(deg(wrap(f-h)))<10: continue
        n+=1
        tf=abs(deg(wrap(f-r['thr']))); th=abs(deg(wrap(h-r['thr'])))
        c['throw nearer the trunk' if tf<th else 'throw nearer the head']+=1
        if min(tf,th)>30: c['  neither within 30 deg']+=1
        if (f>0)!=(h>0) and abs(r['lat'])>=2:
            c['  opposite sides: throw on trunk side' if (f>0)==(r['lat']>0) else '  opposite sides: throw on head side']+=1
            if r.get('run') is not None and abs(r['run'])>=1:
                cr['catcher runs to trunk side' if (f>0)==(r['run']>0) else 'catcher runs to head side']+=1
print(f"sim set/load ticks with trunk and head 10+ deg apart: {n}")
for k,v in c.items(): print(f"    {k}: {100*v/n:.0f}%" if not k.startswith('  opp') else f"    {k}: {v}")
for k,v in cr.items(): print(f"    {k}: {v}")
