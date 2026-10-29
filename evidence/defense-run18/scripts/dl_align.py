#!/usr/bin/env python3
"""Zone runs, play-side DL by alignment relative to the play-side tackle (outermost OL):
inside him, head-up to 1 yd outside (5/6i/7), or more than 1 yd outside (wide).
Lateral move with the play (yd) and depth past the line (yd) at 0.5 / 1.0 / 1.5 s; medians.
Play side = carrier's side of the snap at 1.5 s. Same code on NFL and sim.
    python3 -I dl_align.py LABEL=plays.jsonl.gz[=rows.json] [...]"""
import sys, json, statistics as st, gzip
def plays(path):
    for line in gzip.open(path,'rt'):
        p=json.loads(line)
        if p['kind']!='run' or p['carrier'] is None: continue
        n=len(p['players'])
        yield {'id':p.get('id'),'concept':p['cell']['concept'],'players':p['players'],'carrier':p['carrier'],'xy':[[(r[2*i],r[2*i+1]) for i in range(n)] for r in p['xy']]}
def go(label,path,rows=None):
    sch={r['id']:r['scheme'] for r in json.load(open(rows))} if rows else None
    R={}
    for p in plays(path):
        c=str(p['concept'] if sch is None else sch.get(p['id'])).lower()
        if 'zone' not in c: continue
        xy,pl=p['xy'],p['players']
        if len(xy)<16: continue
        ol=[i for i,q in enumerate(pl) if q['side']=='O' and q['group']=='OL']
        if len(ol)!=5: continue
        snap=st.median(xy[0][i][1] for i in ol); dy=xy[15][p['carrier']][1]-snap
        if abs(dy)<1: continue
        s=1 if dy>0 else -1
        tackle=max((xy[0][i][1]-snap)*s for i in ol)
        for j,q in enumerate(pl):
            if q['side']!='D' or q['group']!='DL' or xy[0][j][0]>1.5: continue
            a=(xy[0][j][1]-snap)*s
            if a<.5: continue
            cls='inside T' if a<tackle-.3 else 'on T..+1' if a<=tackle+1 else 'wide >1'
            for k in (5,10,15):
                R.setdefault((cls,'y',k),[]).append((xy[k][j][1]-xy[0][j][1])*s)
                R.setdefault((cls,'x',k),[]).append(xy[k][j][0])
    for cls in ('inside T','on T..+1','wide >1'):
        if (cls,'y',5) not in R: continue
        y=' '.join(f"{st.median(R[(cls,'y',k)]):+5.2f}" for k in (5,10,15)); x=' '.join(f"{st.median(R[(cls,'x',k)]):5.2f}" for k in (5,10,15))
        print(f"{label:6s} {cls:9s} n={len(R[(cls,'y',5)]):4d} lateral with play {y} | depth {x}")
for a in sys.argv[1:]:
    parts=a.split('='); go(parts[0],parts[1],parts[2] if len(parts)>2 else None)
