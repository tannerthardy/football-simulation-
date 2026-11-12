"""usage: python3 -I scripts/diag/pass-operators/qb-pocket.py <plays.jsonl.gz> [...]
The QB's pocket (Integration, 2026-11-11). Same code on NFL tracking and sim plays. Dropbacks with a throw: his set
point = his deepest frame (minimum x) after the snap and before release; drop depth = -x there; snap -> set time (first frame to the set frame, less any snap event time); depth relative to
the tackles = his x minus the mean x of the two widest OL at that frame (negative = behind them); then set -> release:
time, net forward (toward the line) and lateral displacement, path length and mean speed. Split by whether a defender
came within 2 yd of him before release (pressured)."""
import sys, os, statistics as st
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'defense-yards'))
_a = sys.argv; sys.argv = sys.argv[:1]
from yards import plays
sys.argv = _a
q4 = lambda a: [round(x, 2) for x in st.quantiles(a, n=4)] if len(a) > 3 else a
for path in sys.argv[1:]:
    R = []
    for kind, p, c, k0, last in plays(path):
        if kind != 'pass': continue
        ev = p.raw.get('events', {}); fw = ev.get('pass_forward')
        if fw is None: continue
        qbs = [i for i, pl in enumerate(p.players) if pl.get('group') == 'QB']
        if not qbs: continue
        q = qbs[0]; kr = min(p.frames - 1, p.k(fw))
        xs = [(k, p.pos(q, k)[0]) for k in range(0, kr + 1) if p.pos(q, k)[0] is not None]
        if len(xs) < 5: continue
        ks, xset = min(xs, key=lambda t: t[1])
        ol = [i for i, pl in enumerate(p.players) if pl.get('group') == 'OL' and p.pos(i, ks)[0] is not None]
        if len(ol) >= 2:
            ys = sorted(ol, key=lambda i: p.pos(i, ks)[1]); tk = [ys[0], ys[-1]]
            rel = xset - st.mean(p.pos(i, ks)[0] for i in tk)
        else: rel = None
        a, b = p.pos(q, ks), p.pos(q, kr)
        L = sum(((p.pos(q, k)[0] - p.pos(q, k - 1)[0]) ** 2 + (p.pos(q, k)[1] - p.pos(q, k - 1)[1]) ** 2) ** .5 for k in range(ks + 1, kr + 1))
        D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None]
        pres = any(p.pos(d, k)[0] is not None and p.dist(q, d, k) <= 2.0 for k in range(ks, kr + 1) for d in D)
        dt = (kr - ks) * p.dt
        R.append({'tset': ks * p.dt - (p.raw.get('events', {}).get('snap') or 0), 'depth': -xset, 'rel': rel, 'dt': dt, 'fwd': b[0] - a[0], 'lat': abs(b[1] - a[1]), 'L': L, 'v': L / dt if dt > 0 else 0, 'pres': pres})
    print(f"== {os.path.basename(path)}: dropbacks with a throw {len(R)}")
    for lab, s in (('all', R), ('pressured (a man within 2 yd)', [r for r in R if r['pres']]), ('clean', [r for r in R if not r['pres']])):
        if not s: continue
        print(f"   {lab:30s} n {len(s):5d} | snap -> set {q4([r['tset'] for r in s])} s | set depth {q4([r['depth'] for r in s])} | vs tackles {q4([r['rel'] for r in s if r['rel'] is not None])} | set->release {q4([r['dt'] for r in s])} s"
              f" | forward {q4([r['fwd'] for r in s])} lateral {q4([r['lat'] for r in s])} | path {q4([r['L'] for r in s])} speed {q4([r['v'] for r in s])}")
