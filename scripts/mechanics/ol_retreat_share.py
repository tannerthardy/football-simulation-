#!/usr/bin/env python3
"""Share of run plays on which any offensive lineman retreats toward his own goal, NFL and sim through the same code
(docs/reviews/2026-10-27-backpedal-detector-review.md).

    python3 -I scripts/mechanics/ol_retreat_share.py out/run/trace-seed11.json [more traces...]

NFL input: out/mechanics/nfl-plays-w12.jsonl.gz (nfl_bdb2025.py --plays-out). Sim input: run_film_reference.py's trace
files. "Sustained": every 0.1 s step above the speed for 10 steps. "Net": x displacement over a 1 s window.
"""
import sys, importlib.util
import os
spec=importlib.util.spec_from_file_location('rfr',os.path.join(os.path.dirname(os.path.abspath(__file__)),'run_film_reference.py')); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
def frac(plays, thr, win=10):
    n=hit=0
    for p in plays:
        n+=1
        ol=[i for i,q in enumerate(p['players']) if q['side']=='O' and q['group']=='OL']
        xy=p['xy']; end=len(xy)
        ok=False
        for i in ol:
            for f in range(0,end-win):
                if xy[f][i][0]-xy[f+win][i][0]>thr: ok=True;break
            if ok:break
        hit+=ok
    return n,hit
nfl=list(m.nfl('out/mechanics/nfl-plays-w12.jsonl.gz')); sim=list(m.sim(sys.argv[1:]))
def sustained(plays,thr,win=10):
    n=hit=0
    for p in plays:
        n+=1
        ol=[i for i,q in enumerate(p['players']) if q['side']=='O' and q['group']=='OL']
        xy=p['xy']; ok=False
        for i in ol:
            run=0
            for f in range(1,len(xy)):
                v=(xy[f-1][i][0]-xy[f][i][0])/0.1
                run=run+1 if v>thr else 0
                if run>=win: ok=True;break
            if ok:break
        hit+=ok
    return n,hit
for thr in (1,2):
    for name,pl in (('nfl',nfl),('sim',sim)):
        n,h=sustained(pl,thr); print(f'sustained > {thr} yd/s toward own goal for 1 s, any OL: {name} {h}/{n} = {100*h/n:.1f}%')
for thr in (2,3):
    for name,pl in (('nfl',nfl),('sim',sim)):
        n,h=frac(pl,thr); print(f'net x retreat > {thr} yd over 1 s, any OL, snap to end: {name} {h}/{n} = {100*h/n:.1f}%')
