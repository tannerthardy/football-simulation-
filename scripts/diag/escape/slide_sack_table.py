"""Table for scripts/diag/escape/slide-sack.ts rows.  python3 -I slide_sack_table.py on=rows.jsonl [off=rows.jsonl]"""
import json, sys
def q(v, p=.5):
    v = sorted(x for x in v if x is not None); return v[int(p * (len(v) - 1))] if v else float('nan')
pc = lambda a, b: f"{100 * a / max(1, b):.1f}%"
for arg in sys.argv[1:]:
    name, paths = arg.split('=', 1); R = [json.loads(l) for p in paths.split(',') for l in open(p) if l.startswith('{')]; n = len(R)
    S = [r for r in R if r['slides']]; N = [r for r in R if not r['slides']]
    hold = lambda r: (r['thrownAt'] if r['thrownAt'] is not None else r['end'])
    print(f"== {name}: dropbacks {n}; sacked {pc(sum(r['sacked'] for r in R), n)}; held p50 {q([hold(r) for r in R]):.2f} s; scramble {pc(sum(r['scramble'] for r in R), n)}")
    print(f"   slide decided on {pc(len(S), n)}: sacked {pc(sum(r['sacked'] for r in S), len(S))}, held p50 {q([hold(r) for r in S]):.2f} s | none: sacked {pc(sum(r['sacked'] for r in N), len(N))}, held p50 {q([hold(r) for r in N]):.2f} s")
    if not S: continue
    K = [r for r in S if r['sacked']]
    same = sum(1 for r in K if r['slides'][0]['by'] in r['by'] or any(s['by'] in r['by'] for s in r['slides']))
    print(f"   sacked after a slide (n {len(K)}): by a man he slid from {pc(same, len(K))}; first slide to sack p50 {q([r['end'] - r['slides'][0]['t'] for r in K]):.2f} s; slides on the play p50 {q([len(r['slides']) for r in K])}; that man in a blocker's hands at the slide {pc(sum(r['slides'][0]['inHands'] for r in K), len(K))}")
    print(f"   all first slides: man {q([r['slides'][0]['dist'] for r in S]):.1f} yd away, in hands {pc(sum(r['slides'][0]['inHands'] for r in S), len(S))}; nearest defender at the slide {q([r['nearAtSlide'] for r in S]):.1f} yd, 0.5 s later {q([r['nearAfter'] for r in S]):.1f} yd; ball out within 0.6 s {pc(sum(1 for r in S if r['thrownAt'] is not None and r['thrownAt'] - r['slides'][0]['t'] <= 0.6), len(S))}; first slide to throw p50 {q([r['thrownAt'] - r['slides'][0]['t'] for r in S if r['thrownAt'] is not None]):.2f} s")
    ends = {}
    for r in S:
        for s in r['slides']: k = s['end']['why'] if s['end'] else 'cut by the throw/sack'; ends[k] = ends.get(k, 0) + 1
    print('   slides ended: ' + ', '.join(f"{k} {v}" for k, v in sorted(ends.items(), key=lambda kv: -kv[1])))
