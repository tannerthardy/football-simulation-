"""Pursuit by role once the ball carrier is loose (Integration for Tanner, 2026-11-10). Same code on NFL tracking and
sim plays in the common format (metrics.Play). Report only.
usage: python3 -I scripts/diag/defense-yards/pursuit_roles.py <plays.jsonl.gz> [...]

Loose: the first frame the carrier is 5 yd past x_ref (yards.py: max(0, his x at the handoff / catch)), moving > 2 yd/s.
Pursuers then: unblocked defenders (no offensive non-carrier within 1.2 yd) within 15 yd of the carrier, moving > 1 yd/s.
Help (the class): teammates deeper than him (larger x) who can reach the carrier's straight-line path before the carrier
does: their lateral distance to that path at their own depth <= their top speed x the carrier's time to that depth.
Class 0 = last line, 1, 2+.
 1 lead beyond the pure intercept (his heading's lead off the line to the carrier minus the constant-velocity intercept
   lead at his top speed; + = deeper than the intercept); his aim relative to the carrier: where his heading crosses the
   carrier's path, along it from the carrier: behind / near hip (< 1 yd ahead) / in front (1-4) / well in front (> 4).
 2 speed as a share of his top speed (play max); for those who reach 1.0 yd: speed 0.5 s before / at that frame.
 3 side: at his closest approach, is he nearer the field's middle than the carrier (inside-out, carrier to the sideline).
 4 the carrier's first contact (1.0 yd) by class of the tackler at loose: made / missed / broken / other (yards.py
   rule), yards after it; 5 after a class-0 miss or break: yards to the next different defender's contact or the end.
 Far side: defenders whose snap y is 10+ yd from the carrier's y at loose, on the other half of the field: where their
 heading crosses the carrier's path (yd in front of him), and how often they get level with him (x >= carrier x - 0.5,
 within 5 yd laterally) before he reaches +20.
"""
import sys, os, math, collections, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
_argv = sys.argv; sys.argv = sys.argv[:1]
from yards import plays, intercept, ang  # noqa (yards prints nothing without paths)
sys.argv = _argv
MID = 53.3 / 2
DUMP = open(os.environ['CLASS0_OUT'], 'a') if os.environ.get('CLASS0_OUT') else None   # per-play class-0 first contacts (jsonl)
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
pct = lambda a, b: 100 * a / b if b else float('nan')


def signed_lead(h, bear, side):
    return math.degrees(math.atan2(math.sin(h - bear), math.cos(h - bear))) * side


def outcome(p, c, t, kc, last):
    on = sum(1 for k in range(kc, min(last, kc + 10) + 1) if p.dist(c, t, k) <= 1.0)
    sc = p.speed(c, kc); s5 = p.speed(c, kc + 5) if kc + 5 <= last else 0
    more = p.pos(c, last)[0] - p.pos(c, kc)[0]
    if (last - kc) * p.dt <= 1.5 and more < 3: return 'made', more
    if on < 3 and kc + 5 <= last and s5 >= max(3, 0.8 * sc): return 'missed', more
    if on >= 3 and more >= 3 and s5 >= 3: return 'broken', more
    return 'other', more


def report(path):
    S = collections.defaultdict(list); C = collections.Counter()
    for kind, p, c, k0, last in plays(path):
        if c is None: continue
        K = 'R' if kind == 'run' else 'P'
        xref = max(0.0, p.pos(c, k0)[0])
        L = next((k for k in range(k0, last + 1) if p.pos(c, k)[0] >= xref + 5 and p.speed(c, k) > 2), None)
        if L is None: continue
        D = [d for d in p.who('D') if p.pos(d, L)[0] is not None]
        O = [o for o in p.who('O') if o != c]
        top = {d: max(p.speed(d, k) for k in range(0, last + 1)) for d in D}
        cx, cy = p.pos(c, L); vx, vy = p.velocity(c, L); cs = math.hypot(vx, vy); hx, hy = vx / cs, vy / cs
        kc = next((k for k in range(L, last + 1) if any(p.dist(c, d, k) <= 1.0 for d in D)), None)
        cls_of = {}
        for d in D:
            dx, dy = p.pos(d, L); dist = p.dist(c, d, L)
            if dist > 15 or any(p.dist(o, d, L) <= 1.2 for o in O): continue
            help_ = 0
            for e in D:
                if e == d: continue
                ex, ey = p.pos(e, L)
                if ex <= dx: continue
                # carrier's path at the teammate's depth
                if hx <= 0.05: continue
                tc = (ex - cx) / max(vx, 0.5)
                if tc < 0: continue
                py = cy + vy * tc
                if abs(ey - py) <= max(top[e], 1) * tc: help_ += 1
            cl = '0' if help_ == 0 else '1' if help_ == 1 else '2+'
            cls_of[d] = cl
            ux, uy = p.velocity(d, L); s = math.hypot(ux, uy)
            if s < 1: continue
            C[(K, cl)] += 1
            bear = math.atan2(cy - dy, cx - dx); side = 1 if math.sin(math.atan2(vy, vx) - bear) >= 0 else -1
            ip = intercept(cx, cy, vx, vy, dx, dy, max(top[d], 1))
            lead = signed_lead(math.atan2(uy, ux), bear, side)
            if ip: S[(K, cl, 'beyond')].append(lead - signed_lead(math.atan2(ip[1] - dy, ip[0] - dx), bear, side))
            S[(K, cl, 'share')].append(s / max(top[d], 1))
            # where his heading crosses the carrier's path (2D line intersection), along the path from the carrier
            den = (ux / s) * hy - (uy / s) * hx
            if abs(den) > 1e-3:
                tt = ((cx - dx) * hy - (cy - dy) * hx) / den   # along his heading
                if tt > 0:
                    ax, ay = dx + ux / s * tt, dy + uy / s * tt; along = (ax - cx) * hx + (ay - cy) * hy
                    aim = 'behind' if along < 0 else 'near hip' if along < 1 else 'in front' if along < 4 else 'well in front'
                else: aim = 'behind'
            else: aim = 'parallel'
            C[(K, cl, 'aim', aim)] += 1
            # closest approach and side
            kk = min(range(L, last + 1), key=lambda k: p.dist(c, d, k))
            inside = abs(p.pos(d, kk)[1] - MID) < abs(p.pos(c, kk)[1] - MID)
            C[(K, cl, 'inside')] += inside; C[(K, cl, 'side*')] += 1
            kr = next((k for k in range(L, last + 1) if p.dist(c, d, k) <= 1.0), None)
            if kr is not None and kr >= L + 5:
                S[(K, cl, 'pre')].append(p.speed(d, kr - 5) / max(top[d], 1)); S[(K, cl, 'at')].append(p.speed(d, kr) / max(top[d], 1))
            # far side
            y0 = p.pos(d, 0)[1]
            if y0 is not None and abs(y0 - cy) >= 10 and (y0 - MID) * (cy - MID) < 0:
                C[(K, 'far')] += 1
                if aim != 'parallel' and abs(den) > 1e-3 and tt > 0: S[(K, 'far', 'aimahead')].append(along)
                k20 = next((k for k in range(L, last + 1) if p.pos(c, k)[0] >= xref + 20), last)
                C[(K, 'far', 'level')] += any(p.pos(d, k)[0] >= p.pos(c, k)[0] - 0.5 and abs(p.pos(d, k)[1] - p.pos(c, k)[1]) <= 5 for k in range(L, k20 + 1))
        # first contact after loose: who and outcome
        if kc is None: continue
        t = min(D, key=lambda d: p.dist(c, d, kc))
        cl = cls_of.get(t, 'blk/far')
        o, more = outcome(p, c, t, kc, last)
        C[(K, 'fc', cl, o)] += 1; C[(K, 'fc', cl, '*')] += 1; S[(K, 'fc', cl, 'more')].append(more)
        cvx, cvy = p.velocity(c, kc); ch = math.hypot(cvx, cvy)
        tx, ty = p.pos(t, kc); ccx, ccy = p.pos(c, kc); tvx, tvy = p.velocity(t, kc)
        if cl == '0' and DUMP:
            DUMP.write(json.dumps({'src': os.path.basename(path), 'id': p.raw.get('id'), 'kind': kind, 'tackler': t, 'group': p.players[t]['group'],
                                   'loose_s': round(L * p.dt, 2), 'contact_s': round(kc * p.dt, 2), 'end_s': round(last * p.dt, 2), 'outcome': o,
                                   'yards_after': round(more, 1)}) + '\n')
        if cl == '0':
            if ch > 1 and math.hypot(tvx, tvy) > 1:
                co = (cvx * tvx + cvy * tvy) / (ch * math.hypot(tvx, tvy)); app = 'headon' if co < -0.5 else 'behind' if co > 0.5 else 'side'
            else: app = 'n/a'
            C[(K, 'c0', app, o)] += 1; C[(K, 'c0', app, '*')] += 1
            S[(K, 'c0', 'spd', o)].append(p.speed(t, kc) / max(top[t], 1)); S[(K, 'c0', 'cspd', o)].append(p.speed(c, kc))
        # a second defender within 3 yd at the first contact
        others = [e for e in D if e != t and p.dist(c, e, kc) <= 3]
        if ch > 1:
            hx2, hy2 = cvx / ch, cvy / ch
            sd = lambda e: (hx2 * (p.pos(e, kc)[1] - ccy) - hy2 * (p.pos(e, kc)[0] - ccx))   # + = left of his heading
            st = sd(t)
            if others:
                e = min(others, key=lambda e: p.dist(c, e, kc))
                pair = 'split' if sd(e) * st < 0 else 'same'
                C[(K, 'pair', pair, o)] += 1; C[(K, 'pair', pair, '*')] += 1; S[(K, 'pair', pair, 'more')].append(more)
                # second contact: the next different defender within 1.0 yd; yards from the first contact to it (or the end)
                k2 = next((k for k in range(kc + 1, last + 1) if any(x != t and p.dist(c, x, k) <= 1.0 for x in D)), None)
                S[(K, 'pair', pair, 'y2')].append(p.pos(c, k2 if k2 is not None else last)[0] - p.pos(c, kc)[0])
                C[(K, 'pair', pair, 'ten')] += more >= 10
                S[(K, 'pair', pair, 'v1')].append(p.speed(t, kc) / max(top[t], 1)); S[(K, 'pair', pair, 'v2')].append(p.speed(e, kc) / max(top[e], 1))
                # angle between the two around the carrier
                a1 = math.atan2(ty - ccy, tx - ccx); a2 = math.atan2(p.pos(e, kc)[1] - ccy, p.pos(e, kc)[0] - ccx)
                S[(K, 'pair', '*', 'sep')].append(abs(math.degrees(math.atan2(math.sin(a1 - a2), math.cos(a1 - a2)))))
            else:
                C[(K, 'pair', 'alone', o)] += 1; C[(K, 'pair', 'alone', '*')] += 1; S[(K, 'pair', 'alone', 'more')].append(more)
                C[(K, 'pair', 'alone', 'ten')] += more >= 10
            # cutback lane: a defender within 5 yd on the side away from the first tackler, not behind the carrier
            C[(K, 'cut*')] += 1
            C[(K, 'cut')] += any(e != t and p.dist(c, e, kc) <= 5 and sd(e) * st < 0 and ((p.pos(e, kc)[0] - ccx) * hx2 + (p.pos(e, kc)[1] - ccy) * hy2) > -1 for e in D)
        if cl == '0' and o in ('missed', 'broken'):
            kn = next((k for k in range(kc + 3, last + 1) if any(e != t and p.dist(c, e, k) <= 1.0 for e in D)), None)
            S[(K, 'c0miss', 'next')].append(p.pos(c, kn if kn is not None else last)[0] - p.pos(c, kc)[0])
            C[(K, 'c0miss', 'noone')] += kn is None
    print(f"== {os.path.basename(path)}")
    for K, name in (('R', 'runs'), ('P', 'catches')):
        print(f"  [{name}] pursuers at loose (+5) by help behind them:")
        for cl in ('0', '1', '2+'):
            n = C[(K, cl)]
            if not n: continue
            aims = ' '.join(f"{a} {pct(C[(K, cl, 'aim', a)], n):.0f}%" for a in ('behind', 'near hip', 'in front', 'well in front', 'parallel'))
            pre, at = S[(K, cl, 'pre')], S[(K, cl, 'at')]
            print(f"   class {cl:2} n {n:5} | beyond intercept p50 {q(S[(K, cl, 'beyond')]):+5.1f} deg | aim: {aims} | speed share p50 {q(S[(K, cl, 'share')]):.2f}"
                  f" | 0.5 s before his 1-yd frame {q(pre):.2f} -> at it {q(at):.2f} (n {len(at)}) | inside-out {pct(C[(K, cl, 'inside')], C[(K, cl, 'side*')]):.0f}%")
        for cl in ('0', '1', '2+', 'blk/far'):
            m = C[(K, 'fc', cl, '*')]
            if m: print(f"   first contact by class {cl:7}: n {m:4} made {pct(C[(K, 'fc', cl, 'made')], m):3.0f}% missed {pct(C[(K, 'fc', cl, 'missed')], m):3.0f}% broken {pct(C[(K, 'fc', cl, 'broken')], m):3.0f}% other {pct(C[(K, 'fc', cl, 'other')], m):3.0f}% | yards after mean {sum(S[(K, 'fc', cl, 'more')]) / m:.1f}")
        nx = S[(K, 'c0miss', 'next')]
        if nx: print(f"   after a class-0 miss/break (n {len(nx)}): yards to the next contact or the end p50 {q(nx):.1f}, mean {sum(nx) / len(nx):.1f}; nobody else touches him {pct(C[(K, 'c0miss', 'noone')], len(nx)):.0f}%")
        row = lambda key: f"made {pct(C[key + ('made',)], C[key + ('*',)]):3.0f}% missed {pct(C[key + ('missed',)], C[key + ('*',)]):3.0f}% broken {pct(C[key + ('broken',)], C[key + ('*',)]):3.0f}% (n {C[key + ('*',)]})"
        for app in ('headon', 'side', 'behind'):
            if C[(K, 'c0', app, '*')]: print(f"   class-0 tackler, approach {app:6}: {row((K, 'c0', app))}")
        for o in ('made', 'missed', 'broken'):
            if S[(K, 'c0', 'spd', o)]: print(f"   class-0 {o:6}: his speed share at contact p50 {q(S[(K, 'c0', 'spd', o)]):.2f}, carrier speed {q(S[(K, 'c0', 'cspd', o)]):.1f} yd/s")
        for pr in ('split', 'same', 'alone'):
            m = C[(K, 'pair', pr, '*')]
            if m: print(f"   first contact, 2nd defender within 3 yd: {pr:5} {row((K, 'pair', pr))} yards after mean {sum(S[(K, 'pair', pr, 'more')]) / m:.1f}, 10+ after {100 * C[(K, 'pair', pr, 'ten')] / m:.1f}%"
                        + (f" | speed share 1st {q(S[(K, 'pair', pr, 'v1')]):.2f} 2nd {q(S[(K, 'pair', pr, 'v2')]):.2f} | yards to the 2nd contact mean {sum(S[(K, 'pair', pr, 'y2')]) / max(1, len(S[(K, 'pair', pr, 'y2')])):.1f}" if pr != 'alone' else ''))
        npair = C[(K, 'pair', 'split', '*')] + C[(K, 'pair', 'same', '*')]
        allp = S[(K, 'pair', 'split', 'more')] + S[(K, 'pair', 'same', 'more')]
        if npair: print(f"   pairs: split {100 * C[(K, 'pair', 'split', '*')] / npair:.0f}% of {npair}; yards after first contact (pairs) mean {sum(allp) / npair:.1f}")
        print(f"   pair separation around the carrier p50 {q(S[(K, 'pair', '*', 'sep')]):.0f} deg; cutback lane (away from the first tackler) has a defender within 5 yd {pct(C[(K, 'cut')], C[(K, 'cut*')]):.0f}%")
        f = C[(K, 'far')]
        if f: print(f"   far-side pursuers n {f}: aim crosses his path p50 {q(S[(K, 'far', 'aimahead')]):.1f} yd in front of him; level with him before +20 {pct(C[(K, 'far', 'level')], f):.0f}%")


for path in sys.argv[1:]:
    report(path)
