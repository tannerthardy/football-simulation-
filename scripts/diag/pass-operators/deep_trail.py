"""usage: python3 -I scripts/diag/pass-operators/deep_trail.py [--ball out/mechanics/nfl-ball.jsonl.gz] <plays.jsonl.gz> [...]

The nearest defender's play on deep throws in the last 0.5 s of flight (same code, NFL and sim). Population:
on-target throws (incoming flight line within 1.5 yd of the target at arrival, as trail.py), the target 12+ yd
downfield of where he started, nearest defender 0-3 yd from him at arrival. Arrival is pass_arrived (the sim's
'secure' event where CATCH_SECURE runs). Over the last 0.5 s, per defender:
 - where he is against the receiver at 0.5 s out and at arrival: along the receiver's run (- = trailing) and across;
 - what his path aims at: the angle between his 0.5 s displacement and (a) the catch point C (target at arrival),
   (b) the receiver's body where it was 0.5 s out. Aiming at C rather than the man = playing the catch point;
 - closing on C (yd/s), his speed change, his final gap to C and to the ball at arrival;
Outcome: completion / incompletion, and pbu or interception where the source labels them. Split by separation band and
man / zone."""
import sys, os, json, gzip, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play, coverage_family  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
BALL = {}
if '--ball' in sys.argv:
    i = sys.argv.index('--ball'); bp = sys.argv.pop(i + 1); sys.argv.pop(i)
    for l in gzip.open(bp, 'rt'):
        b = json.loads(l); BALL[b['id']] = b['b']
def ang(ax, ay, bx, by):
    na, nb = math.hypot(ax, ay), math.hypot(bx, by)
    if na < 1e-6 or nb < 1e-6: return float('nan')
    return math.degrees(math.acos(max(-1, min(1, (ax * bx + ay * by) / (na * nb)))))
def rows(path):
    out = []
    for line in gzip.open(path, 'rt'):
        r = json.loads(line); r = r.get('common', r); ev = r['events']
        if r['kind'] != 'pass' or 'pass_forward' not in ev or r.get('target') is None: continue
        if (r.get('labels') or {}).get('throwaway'): continue
        t = r['target']; p = Play(r)
        ka = p.k(ev.get('pass_arrived', ev['end'])); k5 = ka - p.k(0.5)
        if k5 < 1 or ka >= p.frames or p.pos(t, ka)[0] is None or p.pos(t, 0)[0] is None: continue
        if p.pos(t, ka)[0] - p.pos(t, 0)[0] < 12: continue
        bxy = r.get('bxy') or BALL.get(r.get('id'))
        if not bxy or ka >= len(bxy): continue
        kf0 = p.k(ev['pass_forward']); k1, k0 = max(kf0, ka - 3), max(kf0, ka - 1)
        if k0 <= k1: continue
        (ax_, ay_), (ex, ey) = bxy[k1], bxy[k0]; lx, ly = ex - ax_, ey - ay_; LL = lx * lx + ly * ly
        if LL < 0.01: continue
        tx0, ty0 = p.pos(t, ka); u = ((tx0 - ax_) * lx + (ty0 - ay_) * ly) / LL
        miss = math.hypot(ax_ + u * lx - tx0, ay_ + u * ly - ty0)
        if miss > 1.5: continue
        # Touched: the ball's own track breaks (turns > 25 deg or loses > 35% of its speed) within 0.3 s of arrival on
        # a throw that was not caught. A touched ball's later path says nothing about where the throw was going, and
        # tracking has no height to extrapolate it, so its placement is reported at the touch, separately.
        def bv(k): return (bxy[k][0] - bxy[k - 1][0], bxy[k][1] - bxy[k - 1][1])
        touched = False
        if 'catch' not in ev:
            for k in range(max(kf0 + 2, ka), min(len(bxy) - 1, ka + 4)):
                a_, b_ = bv(k), bv(k + 1); na, nb = math.hypot(*a_), math.hypot(*b_)
                if na > 0.05 and (nb < 0.65 * na or (nb > 1e-6 and ang(a_[0], a_[1], b_[0], b_[1]) > 25)): touched = True; break
        D = [d for d in p.who('D') if p.pos(d, ka)[0] is not None and p.pos(d, k5)[0] is not None]
        if not D: continue
        d = min(D, key=lambda x: p.dist(t, x, ka)); sep = p.dist(t, d, ka)
        if sep >= 3: continue
        vx, vy = p.velocity(t, ka); s = math.hypot(vx, vy) or 1; ux, uy = vx / s, vy / s
        (cx, cy) = p.pos(t, ka); (rx5, ry5) = p.pos(t, k5); (d0x, d0y), (d1x, d1y) = p.pos(d, k5), p.pos(d, ka)
        mx, my = d1x - d0x, d1y - d0y
        along5 = (d0x - rx5) * ux + (d0y - ry5) * uy; along = (d1x - cx) * ux + (d1y - cy) * uy
        across = abs(-(d1x - cx) * uy + (d1y - cy) * ux)
        # Placement against the full-speed spot: where he would be at arrival had he held his -1.0 s velocity, and how
        # far along that path the ball comes down from it (- = short of him / underthrown, + = past him).
        k10 = max(1, ka - p.k(1.0)); (px, py) = p.pos(t, k10); pvx, pvy = p.velocity(t, k10); ps = math.hypot(pvx, pvy) or 1
        fx, fy = px + pvx * (ka - k10) * p.dt, py + pvy * (ka - k10) * p.dt
        place = ((bxy[ka][0] - fx) * pvx + (bxy[ka][1] - fy) * pvy) / ps
        short = ((cx_ := p.pos(t, ka)[0]) - fx) * pvx / ps + (p.pos(t, ka)[1] - fy) * pvy / ps
        # Strict on-target: the ball at arrival within 1 yd along his running direction of where he actually is, and
        # within 0.5 yd across it.
        balong = (bxy[ka][0] - cx) * ux + (bxy[ka][1] - cy) * uy; bacross = abs(-(bxy[ka][0] - cx) * uy + (bxy[ka][1] - cy) * ux)
        # The same against his velocity at the release (the QB's moment): held from the throw to arrival.
        (qx, qy) = p.pos(t, kf0); qvx, qvy = p.velocity(t, kf0); qs = math.hypot(qvx, qvy) or 1
        gx, gy = qx + qvx * (ka - kf0) * p.dt, qy + qvy * (ka - kf0) * p.dt
        place_rel = ((bxy[ka][0] - gx) * qvx + (bxy[ka][1] - gy) * qvy) / qs
        o = dict(place_rel=place_rel, flight=(ka - kf0) * p.dt, touched=touched, id=r.get('id'), ka=ka, t=t, d=d, balong=balong, bacross=bacross, strict=abs(balong) <= 1 and bacross <= 0.5, place=place, rshort=short, miss=miss, sep=sep, fam=coverage_family((r.get('cell') or {}).get('coverage')) or 'other', comp='catch' in ev,
                 pbu='pbu' in ev or 'pass_deflected' in ev, intc='interception' in ev or 'pass_intercepted' in ev,
                 along5=along5, along=along, across=across, aimC=ang(mx, my, cx - d0x, cy - d0y), aimR=ang(mx, my, rx5 - d0x, ry5 - d0y),
                 close=(math.hypot(d0x - cx, d0y - cy) - math.hypot(d1x - cx, d1y - cy)) / 0.5, dv=p.speed(d, ka) - p.speed(d, k5),
                 post=[p.dist(t, d, ka + p.k(x)) if ka + p.k(x) < p.frames and p.pos(t, ka + p.k(x))[0] is not None and p.pos(d, ka + p.k(x))[0] is not None else float('nan') for x in (0.1, 0.2, 0.3)],
                 rsp=[p.speed(t, ka + p.k(x)) if ka + p.k(x) < p.frames and p.pos(t, ka + p.k(x))[0] is not None else float('nan') for x in (0.1, 0.2, 0.3)],
                 gapC=math.hypot(d1x - cx, d1y - cy), gapB=math.hypot(d1x - bxy[ka][0], d1y - bxy[ka][1]), rs=s, rs5=p.speed(t, k5), rs10=p.speed(t, max(1, ka - p.k(1.0))), ds=p.speed(d, ka))
        # how an incompletion ended, from the ball's path: turned sharply near a defender (deflected), carried on past
        # him (ball not caught, kept its line and most of its speed), or slowed/fell beside the receiver (dropped or
        # knocked out after it reached him).
        if not o['comp'] and ka + 3 < len(bxy) and ka - 2 >= 0:
            bvx, bvy = bxy[ka][0] - bxy[ka - 2][0], bxy[ka][1] - bxy[ka - 2][1]
            avx, avy = bxy[ka + 3][0] - bxy[ka][0], bxy[ka + 3][1] - bxy[ka][1]
            vb, va = math.hypot(bvx, bvy) / 2, math.hypot(avx, avy) / 3
            turn = ang(bvx, bvy, avx, avy)
            o['end'] = 'carried past' if (turn == turn and turn < 20 and va > 0.6 * vb) else 'deflected' if (turn == turn and turn >= 35 and o['gapB'] < 2.0) else 'fell at him'
        out.append(o)
    return out
for path in sys.argv[1:]:
    v = rows(path)
    print(f"== {os.path.basename(path)}: deep on-target throws, nearest defender < 3 yd at arrival, n {len(v)}")
    w = [o for o in v if o['fam'] == 'man' and o['sep'] < 2]
    if w:
        n = len(w); inc = [o for o in w if not o['comp'] and 'end' in o]
        print(f"   POOLED man 0-2 yd n {n} | comp {100*sum(o['comp'] for o in w)/n:.0f}% | carried past {100*sum(o.get('end') == 'carried past' for o in w)/n:.0f}%, deflected {100*sum(o.get('end') == 'deflected' for o in w)/n:.0f}%, fell at him {100*sum(o.get('end') == 'fell at him' for o in w)/n:.0f}% of throws"
              f" | receiver speed -1.0 s / arrival {q([o['rs10'] for o in w]):.1f} / {q([o['rs'] for o in w]):.1f}")
        print(f"      ball lands vs his full-speed spot (along his path): p25/p50/p75 {q([o['place'] for o in w], .25):+.2f} / {q([o['place'] for o in w]):+.2f} / {q([o['place'] for o in w], .75):+.2f} yd"
              f" | short of it by > 1 yd {100*sum(o['place'] < -1 for o in w)/n:.0f}%, within 1 yd {100*sum(abs(o['place']) <= 1 for o in w)/n:.0f}%, past by > 1 yd {100*sum(o['place'] > 1 for o in w)/n:.0f}%"
              f" | he arrived vs that spot p50 {q([o['rshort'] for o in w]):+.2f} yd")
        tw = [o for o in w if o['touched']]; uw = [o for o in w if not o['touched']]
        print(f"      TOUCHED (ball track breaks within 0.3 s of arrival, not caught): {100*len(tw)/n:.0f}% of throws (n {len(tw)})")
        for lab, m in (('untouched', uw), ('touched (at the touch)', tw)):
            if m: print(f"        {lab:22} vs held-from-RELEASE spot: p50 {q([o['place_rel'] for o in m]):+.2f}: short >1 {100*sum(o['place_rel'] < -1 for o in m)/len(m):3.0f}%, within {100*sum(abs(o['place_rel']) <= 1 for o in m)/len(m):3.0f}%, past >1 {100*sum(o['place_rel'] > 1 for o in m)/len(m):3.0f}% | flight p50 {q([o['flight'] for o in m]):.2f} s")
            if m: print(f"        {lab:22} n {len(m):4} | comp {100*sum(o['comp'] for o in m)/len(m):3.0f}% | ball vs full-speed spot p50 {q([o['place'] for o in m]):+.2f}: short >1 {100*sum(o['place'] < -1 for o in m)/len(m):3.0f}%, within {100*sum(abs(o['place']) <= 1 for o in m)/len(m):3.0f}%, past >1 {100*sum(o['place'] > 1 for o in m)/len(m):3.0f}% | strict {100*sum(o['strict'] for o in m)/len(m):3.0f}% (comp there {100*sum(o['comp'] for o in m if o['strict'])/max(1,sum(o['strict'] for o in m)):.0f}%)")
        st = [o for o in w if o['strict']]
        if st: print(f"      STRICT (ball within 1 yd along / 0.5 across of where he is): {100*len(st)/n:.0f}% of throws, n {len(st)} | comp {100*sum(o['comp'] for o in st)/len(st):.0f}% | carried past {100*sum(o.get('end') == 'carried past' for o in st)/len(st):.0f}%, deflected {100*sum(o.get('end') == 'deflected' for o in st)/len(st):.0f}%, fell at him {100*sum(o.get('end') == 'fell at him' for o in st)/len(st):.0f}%"
                     f" | carried past among ALL pooled throws that are strict: {100*sum(o.get('end') == 'carried past' for o in st)/n:.0f}% of throws")
        if os.environ.get('SHOW'):
            for o in [o for o in w if o.get('end') == 'carried past'][:int(os.environ['SHOW'])]:
                print(f"        id {o['id']} strict {o['strict']} ball along {o['balong']:+.2f} across {o['bacross']:.2f} | defender gap to ball {o['gapB']:.2f}, along {o['along']:+.2f} | rec speed {o['rs']:.1f}")
        for lab, m in (('ball short > 1 yd', [o for o in w if o['place'] < -1]), ('ball within 1 yd or past', [o for o in w if o['place'] >= -1])):
            if m: print(f"        {lab:24} n {len(m):4} | he arrived vs the spot {q([o['rshort'] for o in m]):+.2f} | speed at arrival {q([o['rs'] for o in m]):.1f} | comp {100*sum(o['comp'] for o in m)/len(m):.0f}% | carried past {100*sum(o.get('end') == 'carried past' for o in m)/len(m):.0f}%")
    for fam in ('man', 'zone'):
        for lo, hi in ((0, 1), (1, 2), (2, 3)):
            w = [o for o in v if o['fam'] == fam and lo <= o['sep'] < hi]
            if len(w) < 5: continue
            n = len(w)
            print(f"   {fam:4} {lo}-{hi} yd n {n:4} | comp {100*sum(o['comp'] for o in w)/n:3.0f}% | at -0.5 s along {q([o['along5'] for o in w]):+.2f} -> at arrival along {q([o['along'] for o in w]):+.2f}, across {q([o['across'] for o in w]):.2f}"
                  f" | path aims: at C {q([o['aimC'] for o in w]):3.0f} deg, at the man {q([o['aimR'] for o in w]):3.0f} deg (C closer {100*sum(o['aimC'] < o['aimR'] for o in w)/n:.0f}%)"
                  f" | closing on C {q([o['close'] for o in w]):.1f} yd/s, speed {q([o['ds'] for o in w]):.1f} ({q([o['dv'] for o in w]):+.1f}) vs his {q([o['rs'] for o in w]):.1f} | gap to C {q([o['gapC'] for o in w]):.2f}, to ball {q([o['gapB'] for o in w]):.2f}")
            print(f"        receiver speed at -1.0 / -0.5 s / arrival {q([o['rs10'] for o in w]):.1f} / {q([o['rs5'] for o in w]):.1f} / {q([o['rs'] for o in w]):.1f} yd/s; slowed > 1 yd/s over the last 0.5 s {100*sum(o['rs5'] - o['rs'] > 1 for o in w)/n:.0f}%")
            inc = [o for o in w if not o['comp'] and 'end' in o]
            ends = collections.Counter(o['end'] for o in inc)
            print(f"        incompletions n {len(inc)}: " + ', '.join(f"{k} {100*c/max(1,len(inc)):.0f}%" for k, c in ends.most_common()) + f" | as share of all throws: " + ', '.join(f"{k} {100*c/n:.0f}%" for k, c in ends.most_common()))
            for lo2, hi2 in ((0, .5), (.5, 1), (1, 1.5)):
                m = [o for o in w if lo2 <= o['miss'] < hi2]
                if m: print(f"          flight line {lo2}-{hi2} yd from him: {100*len(m)/n:3.0f}% of throws | comp {100*sum(o['comp'] for o in m)/len(m):3.0f}% | carried past {100*sum(o.get('end') == 'carried past' for o in m)/len(m):3.0f}%")
            nn = lambda i, key: q([o[key][i] for o in w if o[key][i] == o[key][i]])
            print(f"        after arrival +0.1/+0.2/+0.3 s: defender to receiver {nn(0,'post'):.2f} / {nn(1,'post'):.2f} / {nn(2,'post'):.2f} | receiver speed {nn(0,'rsp'):.1f} / {nn(1,'rsp'):.1f} / {nn(2,'rsp'):.1f}"
                  f" | completion by defender at +0.2 s within 0.8 yd: {100*sum(o['comp'] for o in w if o['post'][1] < 0.8)/max(1,sum(o['post'][1] < 0.8 for o in w)):.0f}% (n {sum(o['post'][1] < 0.8 for o in w)}), farther {100*sum(o['comp'] for o in w if o['post'][1] >= 0.8)/max(1,sum(o['post'][1] >= 0.8 for o in w)):.0f}%")
