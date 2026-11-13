"""DL (|x|<=1.6 at snap, within 4 yd lateral of OL centre) on zone runs: speed into the backfield per 0.1 s ending at t,
split by whether any OL is within 1.2 yd (centre to centre) at the frame's start ('free' vs 'near OL'). NFL shifted 0.1 s.
Uses olturn.py's loader; same code NFL vs sim."""
import sys, math, statistics as st, collections
exec(open("/home/user/rgops2/olturn.py").read().split("\nfor path in sys.argv[1:]:")[0])
for path in sys.argv[1:]:
    sh = 1 if path.endswith(".gz") else 0
    R = collections.defaultdict(list)
    for con, ol, df in plays(path):
        if len(ol) < 12 + sh: continue
        cy = sum(o[1] for o in ol[0]) / 5
        for j, d in enumerate(df[0]):
            if abs(d[0]) > 1.6 or abs(d[1] - cy) > 4: continue
            for b in range(2, 11):
                f = b + sh
                v = -(df[f][j][0] - df[f-1][j][0]) * 10
                near = any(math.dist(ol[f-1][i], df[f-1][j]) <= 1.2 for i in range(5))
                R[(b, 'near' if near else 'free')].append(v); R[(b, 'all')].append(v)
    print("==", path.split("/")[-1])
    for c in ('all', 'free', 'near'):
        print(f"  {c:5s}" + "".join(f"  {b/10:.1f}:{st.mean(R[(b,c)]):+.2f}({len(R[(b,c)])})" if R[(b,c)] else f"  {b/10:.1f}:  -  " for b in range(2, 11)))
