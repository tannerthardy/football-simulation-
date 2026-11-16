# usage: python3 scripts/diag/pass-operators/box-count.py out/mechanics/nfl-plays.jsonl.gz <sim export.jsonl.gz> ... (#35, PRO_CALL's 3.5-yd count)
# Box count at the snap: defenders inside the OL width +- 3.5 yd, by depth off the line (common format, offense +x,
# line at x = 0). Off-ball defenders (DL excluded) depth distribution; and on dropbacks, the share where the box at
# 5.0 / 6.0 yd holds more than at 3.5 yd, and whether the back runs a route (sim exports carry 'route').
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
q = lambda v, f=.5: sorted(v)[int(f*(len(v)-1))] if v else float('nan')
for path in sys.argv[1:]:
    deps=[]; n=0; more5=0; more6=0; rbroute=0; rbroute_more5=0; extra_rush_free=0; extra_n=0
    for line in gzip.open(path,'rt'):
        r=json.loads(line); r=r.get('common',r)
        if r.get('kind')!='pass' or not r.get('xy'): continue
        p=Play(r); OL=[i for i in p.who('O','OL') if p.pos(i,0)[0] is not None]
        if len(OL)<5: continue
        ys=[p.pos(i,0)[1] for i in OL]; lo,hi=min(ys)-3.5,max(ys)+3.5
        D=[i for i in p.who('D') if p.pos(i,0)[0] is not None and lo<=p.pos(i,0)[1]<=hi]
        for i in D:
            if r['players'][i].get('group')!='DL': deps.append(p.pos(i,0)[0])
        c35=sum(1 for i in D if p.pos(i,0)[0] < 3.5); c5=sum(1 for i in D if p.pos(i,0)[0] < 5.0); c6=sum(1 for i in D if p.pos(i,0)[0] < 6.0)
        n+=1; more5+= c5>c35; more6+= c6>c35
        rbs=[i for i in p.who('O','RB')]
        routed=any(r['players'][i].get('route') for i in rbs)
        rbroute+=routed
        if c5>c35 and routed:
            rbroute_more5+=1
            # did a 3.5-5 yd backer come (within 2 yd of the QB before the throw, no offensive body within 1 yd then)?
            qb=p.who('O','QB')[0]; fw=r.get('events',{}).get('pass_forward'); end=fw if fw is not None else p.end
            extra=[i for i in D if 3.5<=p.pos(i,0)[0]<5.0]
            for i in extra:
                extra_n+=1
                for k in range(0,min(p.k(end),p.frames-1)):
                    if p.pos(i,k)[0] is None or p.pos(qb,k)[0] is None: continue
                    if p.dist(i,qb,k)<=2.0:
                        O=[o for o in p.who('O') if o!=qb and p.pos(o,k)[0] is not None]
                        if not any(p.dist(o,i,k)<=1.0 for o in O): extra_rush_free+=1
                        break
    print(f"== {os.path.basename(path)}: dropbacks {n} | off-ball box defenders' depth at the snap p25/50/75 {q(deps,.25):.1f}/{q(deps):.1f}/{q(deps,.75):.1f} yd"
          f" | box at 5.0 yd holds more than at 3.5: {100*more5/max(1,n):.0f}% (at 6.0: {100*more6/max(1,n):.0f}%)"
          f" | back on a route {100*rbroute/max(1,n):.0f}%, and with the box at 5.0 > 3.5: {100*rbroute_more5/max(1,n):.0f}% of dropbacks"
          f" | of those 3.5-5 yd men, reaching the QB free: {extra_rush_free} of {extra_n}")
