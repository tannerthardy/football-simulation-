"""usage: python3 -I scripts/diag/pass-operators/yac-tail.py <plays.jsonl.gz> [...] (needs defense-yards/yards.py).
YAC tail: share of catches gaining 10+ / 20+ after the catch; for those, first contact (1.0 yd) and where the gain
came from: before first contact (untouched) or after it (through a contact), and the first-contact outcome (yards.py)."""
import sys, os, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "defense-yards"))
_a = sys.argv; sys.argv = sys.argv[:1]
from yards import plays
sys.argv = _a
for path in sys.argv[1:]:
    n = 0; T = C.Counter(); G = C.defaultdict(list)
    for kind, p, c, k0, last in plays(path):
        if kind != 'pass' or c is None: continue
        n += 1
        D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None]
        x0 = p.pos(c, k0)[0]; yac = p.pos(c, last)[0] - x0
        kc = next((k for k in range(k0, last + 1) if any(p.dist(c, d, k) <= 1.0 for d in D)), None)
        before = (p.pos(c, kc)[0] - x0) if kc is not None else yac
        after = yac - before
        # contact duration with the first tackler and carrier speed 0.5 s later
        out = 'untouched'
        if kc is not None:
            t = min(D, key=lambda d: p.dist(c, d, kc))
            dur = 0; k = kc
            while k <= last and p.dist(c, t, k) <= 1.0: dur += 1; k += 1
            kh = min(last, kc + int(round(0.5 / p.dt)))
            v = p.speed(c, kh); v0 = p.speed(c, kc)
            if last - kc <= int(1.5 / p.dt) and after < 3: out = 'made'
            elif dur * p.dt < 0.3 and v >= 0.8 * v0 and v >= 3: out = 'missed'
            elif dur * p.dt >= 0.3 and after >= 3 and v >= 3: out = 'broken'
            else: out = 'other'
        for b, lab in ((10, '10+'), (20, '20+')):
            if yac >= b:
                T[lab] += 1; T[(lab, out)] += 1
                G[(lab, 'before')].append(before); G[(lab, 'after')].append(after)
    print(f"== {os.path.basename(path)}: catches {n}")
    for lab in ('10+', '20+'):
        m = T[lab]
        if not m: continue
        mb = sorted(G[(lab, 'before')]); ma = sorted(G[(lab, 'after')])
        print(f"   YAC {lab}: {100*m/n:.1f}% (n {m}) | first contact: " + ' '.join(f"{o} {100*T[(lab,o)]/m:.0f}%" for o in ('untouched', 'made', 'missed', 'broken', 'other'))
              + f" | gain before contact p50 {mb[len(mb)//2]:.1f}, after p50 {ma[len(ma)//2]:.1f}")
