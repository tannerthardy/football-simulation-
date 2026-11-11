import json, sys, collections
def load(p): return [json.loads(l) for l in open(p) if l.strip()]
N=load(sys.argv[1]); S=load(sys.argv[2])
def q(v,p): v=sorted(x for x in v if x is not None); return v[int(p*(len(v)-1))] if v else float('nan')
def sel(R,k): return [r for r in R if r['k']==k]
MAP=[('HITCH',['hitch','curl','comeback']),('OUT',['out','quick_out']),('IN',['dig','short_in']),('SLANT',['slant']),('CORNER',['corner']),('POST',['post'])]
print('A. CUT (all routes run; speeds yd/s; turn deg in 0.4 s after the break; gear-down = time s / speed lost from the stem peak to the break)')
def cutrow(name,L): print(f"  {name:10s} n {len(L):5d} | depth {q([r['depth'] for r in L],.5):5.1f} | in {q([r['in'] for r in L],.5):.2f} min {q([r['min'] for r in L],.5):.2f} +0.4 {q([r['p4'] for r in L],.5):.2f} +0.8 {q([r['p8'] for r in L],.5):.2f} | turn {q([r['turn'] for r in L],.5):5.1f} | gear {q([r['gear_t'] for r in L],.5):.2f} s / {q([r['gear_drop'] for r in L],.5):.2f}")
for nl,sl in MAP:
  cutrow('NFL '+nl,[r for r in sel(N,'cut') if r['route']==nl])
  for s_ in sl: cutrow('sim '+s_,[r for r in sel(S,'cut') if r['route']==s_])
print('\nB. THROW by target depth at arrival x pressure (a man within 2 yd of the QB at release)')
for side,R in (('NFL',N),('sim',S)):
  T=sel(R,'throw')
  for lo,hi in ((-99,0),(0,10),(10,20),(20,99)):
    for pr in (False,True):
      L=[r for r in T if lo<=r['depth']<hi and r['press']==pr]
      if len(L)<5: continue
      print(f"  {side} {('<0' if lo<0 else f'{lo}-{hi}'):6s} {'pressured' if pr else 'clean':9s} n {len(L):4d} | comp {sum(r['res']=='C' for r in L)/len(L):.2f} INT {sum(r['res']=='IN' for r in L)/len(L):.3f} | air {q([r['air'] for r in L],.5):5.1f} flight {q([r['flight'] for r in L],.5):.2f} s speed {q([r['speed'] for r in L],.5):5.1f} yd/s | placement err p50 {q([r['place'] for r in L],.5):.2f} p75 {q([r['place'] for r in L],.75):.2f}")
print('\nC. TIME AS A COST (play has a 10-15 yd break vs all breaks <= 6 yd)')
for side,R in (('NFL',N),('sim',S)):
  for kd in ('deep-break','quick','other'):
    L=[r for r in sel(R,'play') if r['kind']==kd]
    if not L: continue
    print(f"  {side} {kd:10s} n {len(L):5d} | ttt p50 {q([r['ttt'] for r in L],.5):.2f} | sack {sum(r['sack'] for r in L)/len(L):.3f} | pressured at release {sum(1 for r in L if r['press'])/max(1,sum(1 for r in L if r['press'] is not None)):.3f}")
print('\nD. INTERCEPTIONS')
for side,R in (('NFL',N),('sim',S)):
  I=sel(R,'int'); n=len(I)
  if not n: continue
  c=collections.Counter()
  for r in I:
    if r['defl']: c['deflected first: '+str(r['touch'])]+=1
    elif r['ic_nearest']: c['clean, interceptor was nearest to target at release']+=1
    else: c['clean, interceptor not the covering man']+=1
  print(f"  {side} n {n} | pressured {sum(1 for r in I if r['press'])/n:.2f} | "+'; '.join(f"{k} {v} ({v/n:.0%})" for k,v in c.most_common()))
  cl=[r for r in I if not r['defl']]
  print(f"     clean ones: interceptor distance to the catch point at release p50 {q([r['ic_dist_rel'] for r in cl],.5):.2f} yd, closing {q([r['ic_close'] for r in cl],.5):.2f} yd/s; depth p50 {q([r['depth'] for r in I],.5):.1f}")
  if side=='NFL': print('     deflection hang time p50', q([r['defl_air'] for r in I if r['defl']],.5))
