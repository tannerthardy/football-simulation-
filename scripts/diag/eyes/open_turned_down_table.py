import json, collections, statistics as st, sys
O=sys.argv[1] if len(sys.argv) > 1 else 'out/eyes/otd'
R=[json.loads(l) for s in ('11','31') for l in open(f'{O}/r_{s}.jsonl') if l.startswith('{')]
R=[r for r in R if r['samples']]
def q(xs,p): xs=sorted(xs); return xs[min(len(xs)-1,int(p*len(xs)))] if xs else float('nan')
print('dropbacks with QB pictures', len(R), 'thrown', sum(1 for r in R if r['release'] and not r['release']['away']), 'throwaway', sum(1 for r in R if r['release'] and r['release']['away']), 'sack', sum(r['sack'] for r in R))
ORDER=['cleared price, eyes on, not thrown','eyes on, footwork gate','eyes on, priced shut','eyes on, not ready','his read, eyes not there yet','read already passed','not in read order yet','not a read']
causes=collections.Counter(); per_drop=collections.Counter(); shutTerm=collections.Counter(); shutBy=collections.Counter(); priceIfLooked=collections.Counter(); press=collections.Counter()
drops_with_open=0; drops_open_never=0
for r in R:
    thrown = r['release']['slot'] if r['release'] and not r['release']['away'] else None
    byR=collections.defaultdict(list)
    for s in r['samples']:
        for x in s['r']:
            if x['open']: byR[x['slot']].append((s,x))
    if byR: drops_with_open+=1
    never=[k for k in byR if k!=thrown]
    if not never: continue
    drops_open_never+=1
    best_drop=None
    for k in never:
        stage=None
        for s,x in byR[k]:
            cur = x['order']=='current'
            ok_price = x.get('P') is not None and s['need'] is not None and s['risk'] is not None and x['P']>=s['need'] and x['iR']<=s['risk']
            if cur and x['eyes'] and x.get('ready') and ok_price and x.get('step',True): c=0
            elif cur and x['eyes'] and x.get('ready') and ok_price and not x.get('step',True): c=1
            elif cur and x['eyes'] and x.get('ready') and x.get('P') is not None: c=2
            elif cur and x['eyes']: c=3
            elif cur: c=4
            elif x['order']=='passed': c=5
            elif x['order']=='ahead': c=6
            else: c=7
            if stage is None or c<stage[0]: stage=(c,s,x)
        c,s,x=stage
        causes[ORDER[c]]+=1
        if c>=4 and x.get('P') is not None and s['need'] is not None and s['risk'] is not None: priceIfLooked['clears his bar' if (x['P']>=s['need'] and x['iR']<=s['risk']) else 'below his bar']+=1
        if c==2:
            shutTerm[x.get('low')]+=1
            if s['risk'] is not None and x['iR']>s['risk']: shutBy['pick risk over his max']+=1
            else: shutBy['P under his bar']+=1
        if s['u']>=0.8: press[ORDER[c]]+=1
        if best_drop is None or c<best_drop: best_drop=c
    per_drop[ORDER[best_drop]]+=1
print(f"\ndropbacks with a wide-open receiver at some sample: {drops_with_open} of {len(R)} ({drops_with_open/len(R):.0%}); with a wide-open receiver never thrown to: {drops_open_never} ({drops_open_never/len(R):.0%})")
print('\nper dropback, the furthest any open-never-thrown receiver got (share of the', drops_open_never, 'dropbacks):')
for k in ORDER: print(f"   {k:36s} {per_drop[k]:4d}  {per_drop[k]/max(1,drops_open_never):.0%}")
print('\nper receiver (open, never thrown):', sum(causes.values()))
for k in ORDER: print(f"   {k:36s} {causes[k]:4d}  {causes[k]/max(1,sum(causes.values())):.0%}   under pressure (u>=0.8) {press[k]}")
print('   priced shut: by', dict(shutBy), '; lowest term', dict(shutTerm))
print('   eyes elsewhere (read passed / ahead / not a read / not there yet): his price if he had looked:', dict(priceIfLooked))
# Throws to a covered man with an open one available.
tot=cov=covopen=0
for r in R:
    if not r['release'] or r['release']['away'] or not r['samples']: continue
    s=r['samples'][-1]; tgt=[x for x in s['r'] if x['slot']==r['release']['slot']]
    if not tgt: continue
    tot+=1
    t=tgt[0]
    if t['dNear']<2:
        cov+=1
        if any(x['open'] and x['slot']!=t['slot'] for x in s['r']): covopen+=1
print(f"\nthrows {tot}: to a covered man (nearest defender < 2 yd at the last sample) {cov} ({cov/tot:.0%}); of those with another receiver wide open then: {covopen} ({covopen/tot:.0%} of throws)")
# Eyes timing.
lead=[]; leadDec=[]; angDec=[]; bodyRel=collections.defaultdict(list)
for r in R:
    rel=r['release']; dec=r['decision']
    if not rel or rel['away'] or not dec or dec['slot']!=rel['slot']: continue
    H=[h for h in r['heads'] if rel['slot'] in h['a']]
    if not H: continue
    slot=rel['slot']
    pre=[h for h in H if h['t']<=rel['t']+1e-9]
    on=None
    for h in reversed(pre):
        if h['a'][slot]<=15: on=h['t']
        else: break
    lead.append(rel['t']-on if on is not None else 0.0)
    leadDec.append((dec['t']-on) if on is not None else None)
    hd=min(H, key=lambda h: abs(h['t']-dec['t'])); angDec.append(hd['a'][slot])
    for k in range(11):
        tt=rel['t']-k*0.1; hb=min(pre, key=lambda h: abs(h['t']-tt)) if pre else None
        if hb and abs(hb['t']-tt)<0.03: bodyRel[round(-k*0.1,1)].append(hb['body'][slot])
n=len(lead)
print(f"\nthrows with eyes timing: {n}")
print(f"   eyes on target (head within 15 deg) to release: p10 {q(lead,.1):.2f} p25 {q(lead,.25):.2f} p50 {q(lead,.5):.2f} p75 {q(lead,.75):.2f} s; zero (eyes never on before release) {sum(1 for x in lead if x==0)} ({sum(1 for x in lead if x==0)/n:.0%})")
ld=[x for x in leadDec if x is not None]
print(f"   eyes on target to windup start: p25 {q(ld,.25):.2f} p50 {q(ld,.5):.2f} p75 {q(ld,.75):.2f} s; eyes arrived after the windup started {sum(1 for x in ld if x<0)} ({sum(1 for x in ld if x<0)/n:.0%}); never before release {sum(1 for x in leadDec if x is None)}")
print(f"   head-to-target angle at windup start: p25 {q(angDec,.25):.0f} p50 {q(angDec,.5):.0f} p75 {q(angDec,.75):.0f} p90 {q(angDec,.9):.0f} deg; >15 deg {sum(1 for a in angDec if a>15)/len(angDec):.0%}, >30 deg (periphery) {sum(1 for a in angDec if a>30)/len(angDec):.0%}, >60 {sum(1 for a in angDec if a>60)/len(angDec):.0%}")
print('   body-to-target angle before release (deg, p50 / p75), sim:', {k: (round(st.median(v),1), round(q(v,.75),1)) for k,v in sorted(bodyRel.items())})
