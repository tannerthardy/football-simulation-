"""Summarise edge-probe.mts output: per time, the tackle's and the rusher's requested vs achieved x velocity, depths, and
engagement. usage: python3 -I scripts/diag/effective-mass/edge-probe-sum.py <probe.jsonl> [...]"""
import sys, json
q=lambda v,f=.5: sorted(v)[int(f*(len(v)-1))] if v else float('nan')
for p in sys.argv[1:]:
    R=[json.loads(l) for l in open(p)]
    print(p.split('/')[-1], 'n', len(R))
    for T in ('1','1.5','2','2.5','3'):
        S=[r['snaps'][T] for r in R if T in r['snaps']]
        if not S: continue
        g=lambda k:[s[k] for s in S if s[k] is not None]
        print(f"  {T}s n{len(S):4d} tackle req {q(g('tReq')):+.2f} ach {q(g('tAch')):+.2f} depth {q(g('tDepth')):+.2f} | QB {q(g('qbDepth')):+.2f} | tackle-QB {q([s['tDepth']-s['qbDepth'] for s in S]):+.2f} deeper-than-QB {100*sum(s['tDepth']<s['qbDepth'] for s in S)/len(S):.0f}% | rusher req {q(g('rReq')):+.2f} ach {q(g('rAch')):+.2f} depth {q(g('rDepth')):+.2f} lat req {q(g('rReqLat')):+.2f} ach {q(g('rAchLat')):+.2f} | engaged {100*sum(s['engaged'] for s in S)/len(S):.0f}%")
