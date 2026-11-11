"""usage: python3 -I scripts/diag/pass-operators/qb-contact.py <plays.jsonl.gz> [...]
Same code on NFL and sim: dropbacks (kind pass); a defender's centre within 1.0 yd of the QB before the ball is out
(pass_forward, else the end); whether the ball goes forward; time from that contact to the throw or the end."""
import sys,os,statistics as st
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'defense-yards'))
_a=sys.argv; sys.argv=sys.argv[:1]
from yards import plays
sys.argv=_a
for path in sys.argv[1:]:
  n=0; cont=0; cf=0; cnf=0; nf=0; sack=0; scr=0; dtf=[]; dtn=[]; comp=[0,0]; yds=[[],[]]; rel=[]
  for kind,p,c,k0,last in plays(path):
    if kind!='pass': continue
    qbs=[i for i,pl in enumerate(p.players) if pl.get('group')=='QB']
    if not qbs: continue
    q=qbs[0]; n+=1; ev=p.raw.get('events',{})
    fw=ev.get('pass_forward'); kend=min(p.frames-1,p.k(fw if fw is not None else p.end))
    if fw is None: nf+=1
    D=[d for d in p.who('D') if p.pos(d,0)[0] is not None]
    kc=next((k for k in range(0,kend+1) if p.pos(q,k)[0] is not None and any(p.pos(d,k)[0] is not None and p.dist(q,d,k)<=1.0 for d in D)),None)
    if fw is not None:
      # clean: no defender within 1 yd before the throw (computed below); completion and yards for both groups
      pass
    if kc is None:
      if fw is not None: comp[1]+=('catch' in ev); yds[1].append(p.raw['yards'])
      continue
    cont+=1
    if fw is not None: cf+=1; dtf.append((kend-kc)*p.dt); comp[0]+=('catch' in ev); yds[0].append(p.raw['yards'])
    else:
      cnf+=1; dtn.append((kend-kc)*p.dt)
      # No throw: a sack if the QB ends behind the line, a scramble if he gets past it.
      xe=p.pos(q,kend)[0]
      if xe is not None and xe > 0: scr+=1
      else: sack+=1
  print(f"{os.path.basename(path)}: dropbacks {n} | no throw {100*nf/n:.1f}% | defender within 1 yd of the QB before the ball is out {100*cont/n:.1f}% | of those: thrown {100*cf/max(1,cont):.0f}% (contact->throw p50 {st.median(dtf) if dtf else float('nan'):.2f} s), not thrown {100*cnf/max(1,cont):.0f}% (contact->end p50 {st.median(dtn) if dtn else float('nan'):.2f} s)")
  print(f"   rusher within the radius before the ball is out: throw {100*cf/max(1,cont):.0f}% | sack (no throw, QB ends behind the line) {100*sack/max(1,cont):.0f}% | scramble (past the line) {100*scr/max(1,cont):.0f}%")
  q=lambda a:[round(x,2) for x in st.quantiles(a,n=4)] if len(a)>3 else a
  print(f"   thrown after contact: n {cf}, complete {100*comp[0]/max(1,cf):.0f}%, yd/att {st.mean(yds[0]) if yds[0] else float('nan'):.1f}, contact->throw quartiles {q(dtf)} | clean throws: n {len(yds[1])}, complete {100*comp[1]/max(1,len(yds[1])):.0f}%, yd/att {st.mean(yds[1]):.1f}")
