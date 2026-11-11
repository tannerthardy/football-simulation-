"""usage: python3 -I scripts/diag/pass-operators/qb-moves.py <plays.jsonl.gz> [...]
Do QBs escape, or climb and slide? (Tanner via Integration, 2026-11-11.) Same code on NFL tracking and sim plays.
Every dropback: his set point = his deepest frame (minimum x) after the snap and before the ball is out (or the end);
the tackle box = between the two widest OL at the set frame. From the set point to the release (throw), to the end
(sack), or to the frame he crosses the line (scramble): forward = change in x, lateral = |change in y|. Classes, first
match: rolled outside (ends outside the tackle box) / retreated (forward <= -1) / stood (displacement < 0.5) /
climbed 3+ (forward >= 3) / climbed 1-3 (forward >= 1, >= lateral) / slid (lateral >= 1) / stepped (< 1 yd).
Reported for all dropbacks and for those where a defender came within 1.0 yd of him before the ball was out."""
import sys, os, statistics as st, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'defense-yards'))
_a = sys.argv; sys.argv = sys.argv[:1]
from yards import plays
sys.argv = _a
CLS = ['stood', 'stepped', 'climbed 1-3', 'climbed 3+', 'slid', 'rolled outside', 'retreated']
def klass(fwd, lat, outside):
    if outside: return 'rolled outside'
    if fwd <= -1: return 'retreated'
    if (fwd * fwd + lat * lat) ** .5 < 0.5: return 'stood'
    if fwd >= 3: return 'climbed 3+'
    if fwd >= 1 and fwd >= lat: return 'climbed 1-3'
    if lat >= 1: return 'slid'
    return 'stepped'
for path in sys.argv[1:]:
    R = []
    for kind, p, c, k0, last in plays(path):
        if kind != 'pass': continue
        qbs = [i for i, pl in enumerate(p.players) if pl.get('group') == 'QB']
        if not qbs: continue
        q = qbs[0]; ev = p.raw.get('events', {}); fw = ev.get('pass_forward')
        kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
        xs = [(k, p.pos(q, k)[0]) for k in range(0, kend + 1) if p.pos(q, k)[0] is not None]
        if len(xs) < 5: continue
        ks, xset = min(xs, key=lambda t: t[1])
        ol = [i for i, pl in enumerate(p.players) if pl.get('group') == 'OL' and p.pos(i, ks)[0] is not None]
        if len(ol) < 2: continue
        ys = sorted(p.pos(i, ks)[1] for i in ol); lo, hi = ys[0], ys[-1]
        D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None]
        hit = any(p.pos(q, k)[0] is not None and p.pos(d, k)[0] is not None and p.dist(q, d, k) <= 1.0 for k in range(0, kend + 1) for d in D)
        if fw is not None: out = 'throw'; ke = kend
        else:
            kx = next((k for k in range(ks, kend + 1) if (p.pos(q, k)[0] or -9) > 0), None)
            out, ke = ('scramble', kx) if kx is not None else ('sack', kend)
        a, b = p.pos(q, ks), p.pos(q, ke)
        if None in (a[0], b[0]): continue
        fwd, lat = b[0] - a[0], abs(b[1] - a[1]); outside = not (lo - 0.5 <= b[1] <= hi + 0.5)
        R.append({'cls': klass(fwd, lat, outside), 'out': out, 'hit': hit, 'fwd': fwd, 'lat': lat, 'outside': outside,
                  'yards': p.raw['yards'], 'comp': 'catch' in ev})
    print(f"== {os.path.basename(path)}: dropbacks {len(R)}")
    for lab, S in (('all dropbacks', R), ('a rusher within 1 yd before the ball is out', [r for r in R if r['hit']])):
        n = len(S); print(f"  {lab} (n {n})")
        cc = C.Counter(r['cls'] for r in S)
        print("    movement:   " + ' | '.join(f"{k} {100*cc[k]/n:.0f}%" for k in CLS))
        for out in ('throw', 'sack', 'scramble'):
            s = [r for r in S if r['out'] == out]
            if not s: continue
            c2 = C.Counter(r['cls'] for r in s)
            line = f"    {out:8s} {100*len(s)/n:3.0f}% | " + ' | '.join(f"{k} {100*c2[k]/len(s):.0f}%" for k in CLS if c2[k])
            print(line)
            if out == 'throw':
                for k in CLS:
                    t = [r for r in s if r['cls'] == k]
                    if len(t) >= 5: print(f"        {k:15s} n {len(t):5d} complete {100*sum(r['comp'] for r in t)/len(t):3.0f}% yd/att {st.mean(r['yards'] for r in t):5.1f}")
            if out == 'scramble':
                print(f"        crossed inside the tackle box {100*sum(not r['outside'] for r in s)/len(s):.0f}% | forward p50 {st.median(r['fwd'] for r in s):.1f} lateral p50 {st.median(r['lat'] for r in s):.1f} | yards p50 {st.median(r['yards'] for r in s):.1f}")
            if out == 'sack':
                print(f"        sack spot vs set point: forward p50 {st.median(r['fwd'] for r in s):+.1f} lateral p50 {st.median(r['lat'] for r in s):.1f}")
