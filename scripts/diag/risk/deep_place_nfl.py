"""NFL deep-ball placement by air distance (Integration's direct measurement), from Coverage's deep_trail rows (the
strict-cut fields): the ball at arrival against where the receiver actually is, along his running direction (balong,
+ = past him) and across it, and against his full-speed spot (place); man coverage, nearest defender 0-2 yd.
   python3 -I scripts/diag/risk/deep_place_nfl.py --ball <nfl-ball.jsonl.gz> <nfl-plays.jsonl.gz>
"""
import sys, os, math, importlib.util
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('dt', os.path.join(here, '..', 'pass-operators', 'deep_trail_cov.py'))
argv = sys.argv; sys.argv = [argv[0]] + argv[1:3]  # --ball path, consumed at import
dt = importlib.util.module_from_spec(spec); spec.loader.exec_module(dt)
paths = argv[3:]
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for path in paths:
    W = [o for o in dt.rows(path) if o['fam'] == 'man' and o['sep'] < 2]
    print(f"{os.path.basename(path)}: man 0-2 yd n {len(W)}; strict {100*sum(o['strict'] for o in W)/max(1,len(W)):.0f}%")
    print("| air distance | n | ball vs receiver along p25/p50/p75 | short >1 / within 1 / past >1 | across p50/p75 | strict | completion |")
    print("|---|---|---|---|---|---|---|")
    for lo, hi in ((12, 20), (20, 30), (30, 60)):
        g = [o for o in W if lo <= o.get('air', 0) < hi] if any('air' in o for o in W) else []
        if not g: continue
        a = [o['balong'] for o in g]
        print(f"| {lo}-{hi} | {len(g)} | {q(a,.25):+.2f}/{q(a):+.2f}/{q(a,.75):+.2f} | {100*sum(x<-1 for x in a)/len(a):.0f}/{100*sum(abs(x)<=1 for x in a)/len(a):.0f}/{100*sum(x>1 for x in a)/len(a):.0f}% | {q([o['bacross'] for o in g]):.2f}/{q([o['bacross'] for o in g],.75):.2f} | {100*sum(o['strict'] for o in g)/len(g):.0f}% | {100*sum(o['comp'] for o in g)/len(g):.0f}% |")
