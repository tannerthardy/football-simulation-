#!/usr/bin/env python3
"""Outside/wide zone: the play-side edge DL (aligned outside the play-side tackle) and how far outside the
outermost offensive surface body (OL or TE within 1.5 yd of the line at the snap, as they are now) he is,
at 0.5 / 1.0 / 1.5 / 2.0 s; and the carrier's lateral distance outside the surface at the same clocks.
Medians, yd, + = outside toward the play. Play side = carrier's side of the snap at 1.5 s.
    python3 -I edge_contain.py LABEL=plays.jsonl.gz[=rows.json] [...]"""
import sys, json, statistics as st, gzip
def plays(path):
    for line in gzip.open(path,'rt'):
        p=json.loads(line)
        if p['kind']!='run' or p['carrier'] is None: continue
        n=len(p['players'])
        yield {'id':p.get('id'),'concept':p['cell']['concept'],'players':p['players'],'carrier':p['carrier'],'xy':[[(r[2*i],r[2*i+1]) for i in range(n)] for r in p['xy']]}
def oz(s):
    s=str(s).lower(); return ('zone' in s and 'inside' not in s) and ('outside' in s or 'wide' in s or 'stretch' in s or s=='outside zone')
T=(5,10,15,20)
def go(label,path,rows=None):
    sch={r['id']:r['scheme'] for r in json.load(open(rows))} if rows else None
    R={}
    for p in plays(path):
        if not oz(p['concept'] if sch is None else sch.get(p['id'])): continue
        xy,pl=p['xy'],p['players']
        if len(xy)<21: continue
        ol=[i for i,q in enumerate(pl) if q['side']=='O' and q['group']=='OL']
        if len(ol)!=5: continue
        snap=st.median(xy[0][i][1] for i in ol); dy=xy[15][p['carrier']][1]-snap
        if abs(dy)<1: continue
        s=1 if dy>0 else -1
        surf=ol+[i for i,q in enumerate(pl) if q['side']=='O' and q['group']=='TE' and abs(xy[0][i][0])<1.5]
        tackle=max((xy[0][i][1]-snap)*s for i in ol)
        edges=[j for j,q in enumerate(pl) if q['side']=='D' and q['group']=='DL' and xy[0][j][0]<1.5 and (xy[0][j][1]-snap)*s>tackle+.3]
        for j in edges:
            for k in T:
                out=max((xy[k][i][1]-snap)*s for i in surf)
                R.setdefault(('edge',k),[]).append((xy[k][j][1]-snap)*s-out)
                R.setdefault(('car',k),[]).append((xy[k][p['carrier']][1]-snap)*s-out)
    if ('edge',5) not in R: return
    e=' '.join(f"{st.median(R[('edge',k)]):+5.2f}" for k in T); c=' '.join(f"{st.median(R[('car',k)]):+5.2f}" for k in T)
    print(f"{label:6s} n={len(R[('edge',5)]):4d} edge outside surface .5/1/1.5/2 s {e} | carrier vs surface {c}")
for a in sys.argv[1:]:
    parts=a.split('='); go(parts[0],parts[1],parts[2] if len(parts)>2 else None)
