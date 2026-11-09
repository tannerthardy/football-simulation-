"""Box-backer depth and lateral travel by time on zone runs, from scripts/diag/_lbdepth.mts output (p50 over reps)."""
import sys, json, statistics as st
for path in sys.argv[1:]:
    R = [json.loads(l) for l in open(path) if l.startswith('{')]
    print('==', path.split('/')[-1])
    for con in ('OZ', 'IZ'):
        out = []
        for t in ('0', '0.5', '1', '1.5', '2'):
            v = [x for r in R if r['con'] == con for x in r['samples'].get(t, [])]
            out.append(f"{t}s depth {st.median(x[0] for x in v):.2f} lat {st.median(x[1] for x in v):.2f} (n{len(v)})" if v else f"{t}s -")
        print(f"  {con}: " + ' | '.join(out))
