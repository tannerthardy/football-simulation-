"""Zone runs: unblocked-look backside edge (on the line 0-1.6 yd, outside the tackle, no TE within 1 yd). Position at 0.5/1.0/1.5 s:
depth (+ = still defensive side), inward squeeze toward the OL centre, distance to carrier proxy (OL centre) — NFL vs sim."""
import sys, statistics as st, collections
exec(open(__file__.replace("bsend.py","lbwho.py")).read().split("\nfor path in sys.argv[1:]:")[0])
for path in sys.argv[1:]:
    R = collections.defaultdict(list)
    for con, ol, ot, df, fc, sh in plays(path):
        if len(ol) < 16: continue
        ys = sorted(o[1] for o in ol[0]); cy = sum(ys)/5
        fl = sum(o[1] for o in ol[10])/5 - cy
        for j,(x0,y0) in enumerate(df[0]):
            if not (0 < x0 <= 1.6 and abs(y0-cy) <= 6 and (y0 < ys[0]-.5 or y0 > ys[-1]+.5)): continue
            if any(abs(t[1]-y0) <= 1.0 and t[0] > -2.0 for t in ot[0]): continue
            if (y0-cy)*fl > 0: continue
            sg = 1 if y0 > cy else -1
            for f in (5,10,15):
                R[(con,f,'depth')].append(df[f][j][0]); R[(con,f,'in')].append((y0-df[f][j][1])*sg)
    print("==", path.split('/')[-1])
    for con in ('IN','OU'):
        print(" ", con, "n", len(R[(con,15,'depth')]), "  ".join(f"t{f/10:.1f} depth {st.mean(R[(con,f,'depth')]):+.2f} in {st.mean(R[(con,f,'in')]):+.2f}" for f in (5,10,15)))
