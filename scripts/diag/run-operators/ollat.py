"""Zone OL lateral displacement toward the play side at 0.5/1.0/1.5 s by position from the play side, and neighbor gap (lateral spacing
between adjacent OL) at the snap and 1.0 s. NFL vs sim."""
import sys, math, statistics as st, collections
exec(open(__file__.replace("ollat.py","olturn.py")).read().split("\nfor path in sys.argv[1:]:")[0])
for path in sys.argv[1:]:
    R = collections.defaultdict(list)
    for con, ol, df in plays(path):
        if len(ol) < 16: continue
        ps = 1 if sum(ol[10][i][1]-ol[0][i][1] for i in range(5)) >= 0 else -1
        order = sorted(range(5), key=lambda i: -ol[0][i][1]*ps)
        for k, i in enumerate(order):
            for t in (5, 10, 15): R[(con, t, k)].append((ol[t][i][1]-ol[0][i][1])*ps)
        for k in range(4):
            a, b = order[k], order[k+1]
            for t in (0, 10): R[(con, "gap", t, k)].append(abs(ol[t][a][1]-ol[t][b][1]))
    print("==", path.split("/")[-1])
    for con in ("IN", "OU"):
        for t in (5, 10, 15):
            print(f"  {con}Z t{t/10:.1f} lateral " + " ".join(f"{['PST','PSG','C','BSG','BST'][k]} {st.median(R[(con,t,k)]):+.2f}" for k in range(5)))
        print(f"  {con}Z splits snap " + " ".join(f"{st.median(R[(con,'gap',0,k)]):.2f}" for k in range(4)) + " | 1.0 s " + " ".join(f"{st.median(R[(con,'gap',10,k)]):.2f}" for k in range(4)))
