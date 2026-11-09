"""Zone runs: per play, the first time (0.1-1.5 s) at which >=4 of 5 OL move laterally (same sign) faster than 0.7 yd/s
(0.2 s central difference). Share of plays reaching it by 0.6 / 1.0 / 1.5 s, and the median OL lateral speed at 0.5 s. NFL vs sim."""
import sys, statistics as st, collections
exec(open(__file__.replace("linestep.py","lbwho.py")).read().split("\nfor path in sys.argv[1:]:")[0])
for path in sys.argv[1:]:
    R = collections.defaultdict(list)
    for con, ol, ot, df, fc, sh in plays(path):
        if len(ol) < 17: continue
        hit = None
        for f in range(1 + sh, 16 + sh):
            v = [(ol[f+1][k][1] - ol[f-1][k][1]) * 5 for k in range(5)]
            if max(sum(x > .7 for x in v), sum(x < -.7 for x in v)) >= 4: hit = (f - sh) / 10; break
        R[con].append(hit)
        v = sorted(abs(ol[6+sh][k][1] - ol[4+sh][k][1]) * 5 for k in range(5)); R[con+'v'].append(v[2])
    print("==", path.split('/')[-1])
    for con in ('IN', 'OU'):
        h = R[con]; n = len(h)
        print(f"  {con} n{n} by0.6 {100*sum(x is not None and x<=.6 for x in h)/n:.0f}% by1.0 {100*sum(x is not None and x<=1.0 for x in h)/n:.0f}% by1.5 {100*sum(x is not None for x in h)/n:.0f}%  median OL lateral speed at 0.5 s {st.median(R[con+'v']):.2f}")
