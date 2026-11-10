# OZ/IZ covered OL pairs (as olpath): separation at 0/0.2/0.4/0.6 s, and over 0-0.4 s the closing split: OL's own motion along the
# snap line-of-centres toward his man vs the man's motion toward the OL (yd), plus each one's lateral motion toward the play.
import sys, collections, math, statistics as st
exec(open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'hloader.py')).read())
for path in sys.argv[1:]:
    R=collections.defaultdict(list)
    for hf, con, ol, ot, df, car, fc, sh in plays(path):
        if len(ol)<8: continue
        ps = 1 if sum(ol[min(10,len(ol)-1)][i][1]-ol[0][i][1] for i in range(5)) >= 0 else -1
        for k in range(5):
            o0=ol[0][k]; cand=[(math.dist(o0,d),j) for j,d in enumerate(df[0]) if abs(d[0])<=1.6 and d[0]>o0[0] and math.dist(o0,d)<=1.8]
            if not cand: continue
            j=min(cand)[1]; d0=df[0][j]; L=math.dist(o0,d0); ux,uy=(d0[0]-o0[0])/L,(d0[1]-o0[1])/L
            for t in (0,2,4,6): R[(con,f's{t}')].append(math.dist(ol[t][k],df[t][j]))
            o4=ol[4][k]; d4=df[4][j]
            R[(con,'olc')].append((o4[0]-o0[0])*ux+(o4[1]-o0[1])*uy); R[(con,'dlc')].append(-((d4[0]-d0[0])*ux+(d4[1]-d0[1])*uy))
            R[(con,'oll')].append((o4[1]-o0[1])*ps); R[(con,'dll')].append((d4[1]-d0[1])*ps); R[(con,'s0lat')].append((d0[1]-o0[1])*ps)
    print('==',path.split('/')[-1])
    for con in ('OU','IN'):
        if not R[(con,'s0')]: continue
        m=lambda k: st.median(R[(con,k)])
        print(f"  {con} n{len(R[(con,'s0')])}: sep 0/.2/.4/.6 s {m('s0'):.2f}/{m('s2'):.2f}/{m('s4'):.2f}/{m('s6'):.2f} | 0-0.4 s closing: OL {m('olc'):+.2f} DL {m('dlc'):+.2f} | lateral to play OL {m('oll'):+.2f} DL {m('dll'):+.2f} | man's snap offset {m('s0lat'):+.2f}")
