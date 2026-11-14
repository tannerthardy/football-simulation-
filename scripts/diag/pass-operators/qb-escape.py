"""usage: python3 -I scripts/diag/pass-operators/qb-escape.py <plays.jsonl.gz> [...]
What the QB's body does before a rusher reaches him (Integration, 2026-11-11: NFL QBs escape 23% of the time once a
rusher is within 1 yd, ours 3-6%). Same code on NFL tracking and sim plays. Dropbacks where a defender's centre comes
within 1.0 yd of the QB before the ball is out: over the 0.5 s before that frame, the QB's mean speed, his velocity
away from that rusher (+ away), his velocity toward the line (+ upfield); and after it: throw / sack (no throw, ends
behind the line) / scramble (no throw, past the line). By what he was doing before: moving (>= 1.5 yd/s) or set."""
import sys, os, statistics as st, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'defense-yards'))
_a = sys.argv; sys.argv = sys.argv[:1]
from yards import plays
sys.argv = _a
for path in sys.argv[1:]:
    R = []
    for kind, p, c, k0, last in plays(path):
        if kind != 'pass': continue
        qbs = [i for i, pl in enumerate(p.players) if pl.get('group') == 'QB']
        if not qbs: continue
        q = qbs[0]; ev = p.raw.get('events', {}); fw = ev.get('pass_forward')
        kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
        D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None]
        hit = None
        for k in range(0, kend + 1):
            if p.pos(q, k)[0] is None: continue
            for d in D:
                if p.pos(d, k)[0] is not None and p.dist(q, d, k) <= 1.0: hit = (k, d); break
            if hit: break
        if not hit: continue
        k, d = hit; k5 = max(0, k - int(round(0.5 / p.dt)))
        sp, away, up = [], [], []
        for j in range(k5 + 1, k + 1):
            a, b = p.pos(q, j), p.pos(q, j - 1); da, db = p.pos(d, j), p.pos(d, j - 1)
            if None in (a[0], b[0], da[0]): continue
            vx, vy = (a[0] - b[0]) / p.dt, (a[1] - b[1]) / p.dt
            rx, ry = a[0] - da[0], a[1] - da[1]; L = (rx * rx + ry * ry) ** .5 or 1
            sp.append((vx * vx + vy * vy) ** .5); away.append((vx * rx + vy * ry) / L); up.append(vx)
        if not sp: continue
        out = 'throw' if fw is not None else ('scramble' if (p.pos(q, kend)[0] or 0) > 0 else 'sack')
        R.append({'sp': st.mean(sp), 'away': st.mean(away), 'up': st.mean(up), 'out': out})
    n = len(R)
    print(f"== {os.path.basename(path)}: rusher within 1 yd before the ball is out on {n} dropbacks")
    print(f"   0.5 s before: speed p50 {st.median([r['sp'] for r in R]):.2f} | away from that rusher p50 {st.median([r['away'] for r in R]):+.2f} | toward the line p50 {st.median([r['up'] for r in R]):+.2f}")
    for lab, s in (('moving (>= 1.5 yd/s)', [r for r in R if r['sp'] >= 1.5]), ('set (< 1.5)', [r for r in R if r['sp'] < 1.5]),
                   ('moving away (>= +1)', [r for r in R if r['away'] >= 1]), ('not moving away', [r for r in R if r['away'] < 1])):
        if not s: continue
        c = C.Counter(r['out'] for r in s)
        print(f"   {lab:22s} {100*len(s)/n:3.0f}% | throw {100*c['throw']/len(s):3.0f}% sack {100*c['sack']/len(s):3.0f}% scramble {100*c['scramble']/len(s):3.0f}%")
