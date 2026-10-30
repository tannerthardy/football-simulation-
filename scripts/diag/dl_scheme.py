#!/usr/bin/env python3
"""DL lateral speed toward the play by scheme family (zone / gap), play side and
window (0.3-1.0 s and 1.0-2.0 s after the snap). Same code on NFL and sim
common-format files; play side = the carrier's side of the snap at 1.5 s.

    python3 -I scripts/diag/dl_scheme.py LABEL=plays.jsonl.gz[=rows.json] [...]
      NFL files carry the concept; sim restage files take the scheme from the
      restage's rows.json (aim-jump/restage.ts output).
"""
import sys, json, statistics as st, os
import gzip
def nfl(path):
    for line in gzip.open(path,'rt'):
        p=json.loads(line)
        if p['kind']!='run' or p['carrier'] is None: continue
        n=len(p['players'])
        yield {'id':p.get('id'),'concept':p['cell']['concept'],'players':p['players'],'carrier':p['carrier'],'xy':[[(r[2*i],r[2*i+1]) for i in range(n)] for r in p['xy']]}
def fam(s):
    s=str(s).lower()
    return 'zone' if 'zone' in s else 'gap' if any(k in s for k in ('power','counter','trap','duo')) else None
def go(label, path, rows=None):
    sch = {r['id']: r['scheme'] for r in json.load(open(rows))} if rows else None
    R = {}
    for p in nfl(path):
        f = fam(p['concept'] if sch is None else sch.get(p['id']))
        if f is None: continue
        xy, pl = p['xy'], p['players']
        if len(xy) < 21: continue
        ol=[i for i,q in enumerate(pl) if q['side']=='O' and q['group']=='OL']; dl=[i for i,q in enumerate(pl) if q['side']=='D' and q['group']=='DL']
        if len(ol)<5 or not dl: continue
        snap=st.median(xy[0][i][1] for i in ol); dy=xy[15][p['carrier']][1]-snap
        if abs(dy)<1: continue
        s=1 if dy>0 else -1
        for j in dl:
            a=(xy[0][j][1]-snap)*s
            if abs(a)<.5: continue
            side='play' if a>0 else 'back'
            for w,(k0,k1) in (('0.3-1.0',(3,10)),('1.0-2.0',(10,20))):
                R.setdefault((f,side,w),[]).append((xy[k1][j][1]-xy[k0][j][1])/((k1-k0)/10)*s)
    for f in ('zone','gap'):
        for side in ('play','back'):
            out=[]
            for w in ('0.3-1.0','1.0-2.0'):
                v=R.get((f,side,w),[])
                if v: out.append(f"{w}: {st.mean(v):+5.2f} yd/s (>+0.5 {sum(x>.5 for x in v)/len(v):3.0%}, <-0.5 {sum(x<-.5 for x in v)/len(v):3.0%})")
            print(f"{label:9s} {f:4s} {side}side DL n={len(R.get((f,side,'0.3-1.0'),[])):4d}  "+'   '.join(out))
for a in sys.argv[1:]:
    parts=a.split('='); go(parts[0], parts[1], parts[2] if len(parts)>2 else None)
