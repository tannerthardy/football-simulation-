"""usage: edgeset.py FILE [FILE ...] (common plays: NFL tracking or sim export).
Tackle vs edge rusher on dropbacks: the outermost two OL; their rusher is the
nearest defender outside them at the snap (within 4 yd laterally, on the line).
First meeting (centres within 1.1 yd): time, tackle depth, rusher depth and
speed; and the share where that rusher gets within 2 yd of the QB pre-throw."""
import gzip, json, sys, statistics as st
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v: f"{st.median(v):.2f}" if v else '-'
for path in sys.argv[1:]:
    tm, td, rd, rs, sd, won, n = [], [], [], [], [], 0, 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'pass': continue
        p = Play(raw); by = raw['ball_y']
        ol = sorted(p.who('O', 'OL'), key=lambda i: p.pos(i, 0)[1])
        if len(ol) != 5: continue
        qb = (p.who('O', 'QB') or [None])[0]
        end = raw['events'].get('pass_forward') or raw['events'].get('end', 5)
        K = int(end / p.dt)
        for t in (ol[0], ol[4]):
            ty = p.pos(t, 0)[1]; out = 1 if ty > by else -1
            cands = [d for d in p.who('D') if p.pos(d, 0)[0] < 2.5 and 0 < (p.pos(d, 0)[1] - ty) * out < 4]
            if not cands: continue
            r = min(cands, key=lambda d: abs(p.pos(d, 0)[1] - ty)); n += 1
            sd.append(p.pos(t, 0)[0])
            for k in range(K):
                a, b = p.pos(t, k), p.pos(r, k)
                if a[0] is None or b[0] is None: break
                if ((a[0]-b[0])**2 + (a[1]-b[1])**2) ** .5 < 1.1:
                    tm.append(k * p.dt); td.append(-a[0]); rd.append(-b[0]); rs.append(p.speed(r, k)); break
            for k in range(K):
                x, y = p.pos(r, k), p.pos(qb, k)
                if x[0] is None or y[0] is None: break
                if ((x[0]-y[0])**2 + (x[1]-y[1])**2) ** .5 < 2: won += 1; break
    print(path.split('/')[-1], f"reps {n}: tackle snap depth {q([-v for v in sd])}, meet t {q(tm)} at tackle depth {q(td)} / rusher depth {q(rd)}, rusher speed {q(rs)}, met {100*len(tm)/n:.0f}%, rusher to QB {100*won/n:.1f}%")
