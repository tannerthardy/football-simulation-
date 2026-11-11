"""Where the defence gives up yards once the ball is in someone's hands (Integration for Tanner, 2026-11-10).
Same code on NFL tracking (nfl_bdb2025.py common format) and sim plays (sim-export.ts). Report only.
usage: python3 -I scripts/diag/defense-yards/yards.py <plays.jsonl.gz> [...]

Ball carrier: a designed run's carrier from the handoff (or snap), or the catcher (receiver, else target) from
the catch, until the end. The catch is the ball's arrival (events.pass_arrived where present): NFL BDB tags its
catch event 0.3 s (p50) after arrival, and the sim's catch is the arrival. x is yards past the line. Gains in this phase are measured from x_ref = max(0, his x
at the start), so a run from the backfield and a catch downfield are on one scale.
 1 Run-down: the first frame he is 10 yd past x_ref. Defenders within 5/10 yd; for those within 15 yd, speed as a
   share of his own top speed on the play, his aim (velocity against the bearing to the carrier and to the
   constant-velocity intercept at his top speed: 'intercept' if nearer the intercept by 10 deg, 'chase' if nearer
   the carrier, 'off' if both are over 45 deg away), and whether he closes over the next 0.5 s; defenders level
   with or ahead of the carrier. Then P(+20 | +10), P(+40 | +20) and, for runs, P(40+ | 20+) on the play's yards.
 2 First contact: the first frame any defender is within 1.0 yd; the tackler is the nearest. Approach speed 0.3 s
   before; broke down: speed at contact under 0.7 of his peak over the 1.0 s before; angle head-on / side /
   behind (metrics.py). Outcome: made (the play ends within 1.5 s and under 3 yd more), missed (within 1 yd for
   under 0.3 s and the carrier keeps >= 0.8 of his speed and >= 3 yd/s half a second later), broken (within 1 yd
   >= 0.3 s and still 3+ yd and >= 3 yd/s), else other. Open field: no offensive non-carrier within 2 yd of the
   tackler. Help: the second-nearest defender's distance to the carrier.
 3 Rally: from first contact, time to the 2nd and 3rd different defenders within 1.5 yd of the carrier.
 4 Deep defenders (passes): DB (by slot where the record carries one) depth/width at the snap by shell (0/1/2 DBs >= 10 yd deep at the snap); at the
   throw, the deepest defender against the deepest eligible receiver (WR/TE/RB); share with nobody deeper.
 5 Stuffs (runs, yards <= 0): free men at the line 0.3 s after the handoff (x <= 1, within 3 yd laterally of the
   carrier, no offensive player within 1.2 yd); with one, how often a free man makes first contact and the stuff.
"""
import gzip, json, math, os, sys, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa

q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
mean = lambda v: sum(v) / len(v) if v else float('nan')
pct = lambda a, b: 100 * a / b if b else float('nan')


def ang(ax, ay, bx, by):
    if math.hypot(ax, ay) < 1e-6 or math.hypot(bx, by) < 1e-6: return 180.0
    return abs(math.degrees(math.atan2(ax * by - ay * bx, ax * bx + ay * by)))


def intercept(px, py, vx, vy, dx, dy, s):
    """Earliest point a pursuer at (dx, dy) with speed s meets a carrier at (px, py) moving (vx, vy)."""
    rx, ry = px - dx, py - dy; a = vx * vx + vy * vy - s * s; b = 2 * (rx * vx + ry * vy); c = rx * rx + ry * ry
    if abs(a) < 1e-9: t = -c / b if b < 0 else None
    else:
        disc = b * b - 4 * a * c
        if disc < 0: return None
        ts = [t for t in ((-b - math.sqrt(disc)) / (2 * a), (-b + math.sqrt(disc)) / (2 * a)) if t > 0]
        t = min(ts) if ts else None
    if t is None or t > 6: return None
    return px + vx * t, py + vy * t


def plays(path):
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if not raw.get('xy') or raw.get('yards') is None: continue
        p = Play(raw); ev = raw.get('events', {})
        if raw['kind'] == 'run' and raw.get('carrier') is not None:
            c = raw['carrier']; k0 = p.k(ev.get('handoff') or 0)
        elif raw['kind'] == 'pass' and 'catch' in ev and (raw.get('receiver') if raw.get('receiver') is not None else raw.get('target')) is not None:
            c = raw['receiver'] if raw.get('receiver') is not None else raw['target']; k0 = p.k(ev.get('pass_arrived', ev['catch']))
        else:
            yield raw['kind'], p, None, None, None; continue
        last = min(p.frames - 1, p.k(p.end))
        if k0 > last or any(p.pos(c, k)[0] is None for k in range(k0, last + 1)):
            yield raw['kind'], p, None, None, None; continue
        yield raw['kind'], p, c, k0, last


# A defensive back by the play's slot where the record has one (sim): a backer in the SS slot plays a deep half
# and counts here; NFL records carry the roster group only, and NFL safeties are listed as safeties.
DB_SLOTS = {'CB_S', 'CB_W', 'NB', 'DB', 'FS', 'SS'}
def is_db(rec): return rec['slot'] in DB_SLOTS if rec.get('slot') else rec['group'] == 'DB'

def report(path):
    S = collections.defaultdict(list); C = collections.Counter()
    for kind, p, c, k0, last in plays(path):
        K = 'R' if kind == 'run' else 'P'
        D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None]
        O = p.who('O')
        top = {d: max((p.speed(d, k) for k in range(0, last + 1 if c is not None else p.frames)), default=0) for d in D}
        # 4 deep defenders: every dropback with a throw
        if kind == 'pass':
            dbs = sorted((d for d in D if is_db(p.players[d])), key=lambda d: -p.pos(d, 0)[0])
            shell = sum(1 for d in dbs if p.pos(d, 0)[0] >= 10)
            sh = f'{min(shell, 2)}-high'; C[('shell', sh)] += 1
            for r, d in enumerate(dbs[:2]):
                x, y = p.pos(d, 0); S[('deep', sh, r, 'depth')].append(x); S[('deep', sh, r, 'width')].append(abs(y - p.raw['ball_y']))
            tf = p.raw['events'].get('pass_forward')
            if tf is not None and p.live(tf):
                kf = p.k(tf); el = [o for o in O if p.players[o]['group'] in ('WR', 'TE', 'RB') and p.pos(o, kf)[0] is not None]
                if el and D:
                    rx = max(p.pos(o, kf)[0] for o in el); dx = max(p.pos(d, kf)[0] for d in D if p.pos(d, kf)[0] is not None)
                    C[('throw', sh)] += 1; C[('nobody-over', sh)] += dx <= rx
                    S[('throw-cushion', sh)].append(dx - rx)
                    dd = [p.pos(d, kf)[0] for d in dbs if p.pos(d, kf)[0] is not None]
                    if dd: S[('throw-deepdb', sh)].append(max(dd))
        if c is None: continue
        C[(K, 'n')] += 1
        cx0 = p.pos(c, k0)[0]; xref = max(0.0, cx0)
        gain_end = p.pos(c, last)[0] - xref
        if K == 'P': S[('P', 'yac')].append(p.pos(c, last)[0] - cx0)
        # 1 run-down
        T = next((k for k in range(k0, last + 1) if p.pos(c, k)[0] >= xref + 10), None)
        if T is not None:
            C[(K, '10')] += 1; C[(K, '20')] += gain_end >= 20; C[(K, '40')] += gain_end >= 40
            cx, cy = p.pos(c, T); vx, vy = p.velocity(c, T)
            S[(K, 'rd', 'w5')].append(sum(1 for d in D if p.dist(c, d, T) <= 5)); S[(K, 'rd', 'w10')].append(sum(1 for d in D if p.dist(c, d, T) <= 10))
            S[(K, 'rd', 'ahead')].append(sum(1 for d in D if p.pos(d, T)[0] >= cx - 0.5 and p.dist(c, d, T) <= 15))
            S[(K, 'rd', 'after')].append(gain_end - 10)
            # Coverage's aim measure: the nearest two defenders' velocity off the line to the carrier (deg)
            for d in sorted(D, key=lambda d: p.dist(c, d, T))[:2]:
                ux, uy = p.velocity(d, T)
                if math.hypot(ux, uy) > 1: S[(K, 'rd', 'aim2')].append(ang(ux, uy, cx - p.pos(d, T)[0], cy - p.pos(d, T)[1]))
            for d in D:
                dist = p.dist(c, d, T)
                if dist > 15: continue
                dx, dy = p.pos(d, T); ux, uy = p.velocity(d, T); s = p.speed(d, T)
                S[(K, 'rd', 'share')].append(s / top[d] if top[d] > 1 else 0)
                a_c = ang(ux, uy, cx - dx, cy - dy); ip = intercept(cx, cy, vx, vy, dx, dy, max(top[d], 1))
                a_i = ang(ux, uy, ip[0] - dx, ip[1] - dy) if ip else 180
                aim = 'off' if min(a_c, a_i) > 45 or s < 1 else 'intercept' if a_i < a_c - 10 else 'chase'
                C[(K, 'aim', aim)] += 1; C[(K, 'aim', '*')] += 1
                T2 = min(last, T + 5); C[(K, 'close', '*')] += 1; C[(K, 'close', 'y')] += p.dist(c, d, T2) < dist - 0.5
                if not ip: C[(K, 'nointercept')] += 1
        # 2 first contact
        kc = next((k for k in range(k0, last + 1) if any(p.dist(c, d, k) <= 1.0 for d in D)), None)
        if kc is None: continue
        C[(K, 'contact')] += 1
        t = min(D, key=lambda d: p.dist(c, d, kc)); g = p.players[t]['group']
        app = p.speed(t, max(0, kc - 3)); peak = max(p.speed(t, k) for k in range(max(0, kc - 10), kc + 1))
        broke = p.speed(t, kc) < 0.7 * peak if peak > 1 else True
        cv, tv = p.velocity(c, kc), p.velocity(t, kc)
        angle = 'n/a'
        if math.hypot(*cv) > 1 and math.hypot(*tv) > 1:
            co = (cv[0] * tv[0] + cv[1] * tv[1]) / (math.hypot(*cv) * math.hypot(*tv)); angle = 'headon' if co < -0.5 else 'behind' if co > 0.5 else 'side'
        on = sum(1 for k in range(kc, min(last, kc + 10) + 1) if p.dist(c, t, k) <= 1.0)
        sc = p.speed(c, kc); k5 = min(last, kc + 5); s5 = p.speed(c, k5) if kc + 5 <= last else 0
        more = p.pos(c, last)[0] - p.pos(c, kc)[0]
        if (last - kc) * p.dt <= 1.5 and more < 3: out = 'made'
        elif on < 3 and kc + 5 <= last and s5 >= max(3, 0.8 * sc): out = 'missed'
        elif on >= 3 and more >= 3 and s5 >= 3: out = 'broken'
        else: out = 'other'
        opn = not any(p.dist(o, t, kc) <= 2 for o in O if o != c)
        help_ = sorted(p.dist(c, d, kc) for d in D)[1] if len(D) > 1 else 99
        hb = '<3' if help_ < 3 else '3-6' if help_ < 6 else '6+'
        for key in ('all', 'open' if opn else 'traffic', g, 'help' + hb):
            C[(K, 'fc', key, out)] += 1; C[(K, 'fc', key, '*')] += 1
        S[(K, 'fc', 'app', 'open' if opn else 'traffic')].append(app); S[(K, 'fc', 'broke', 'open' if opn else 'traffic')].append(broke)
        S[(K, 'fc', 'more', out)].append(more); C[(K, 'fc', 'angle', angle)] += 1
        S[(K, 'fc', 'xpos')].append(p.pos(c, kc)[0] - xref)
        # 3 rally
        seen = [t]; times = []
        for k in range(kc, last + 1):
            for d in D:
                if d not in seen and p.dist(c, d, k) <= 1.5:
                    seen.append(d); times.append((k - kc) * p.dt)
            if len(times) >= 2: break
        for i, nth in enumerate(('2nd', '3rd')):
            if len(times) > i: S[(K, 'rally', nth)].append(times[i])
            else: C[(K, 'rally-never', nth)] += 1
        # 5 stuffs (runs)
        if K == 'R':
            C[('R', 'stuff')] += p.raw['yards'] <= 0
            kh = min(last, k0 + 3); ccy = p.pos(c, kh)[1]
            free = [d for d in D if p.pos(d, kh)[0] <= 1 and abs(p.pos(d, kh)[1] - ccy) <= 3 and not any(p.dist(o, d, kh) <= 1.2 for o in O if o != c)]
            if free:
                C[('R', 'free')] += 1; C[('R', 'free-stuff')] += p.raw['yards'] <= 0; C[('R', 'free-hit')] += t in free
                C[('R', 'free-hit-stuff')] += t in free and p.raw['yards'] <= 0
                f = min(free, key=lambda d: p.dist(c, d, kh)); S[('R', 'free-dist')].append(p.dist(c, f, kh))
                S[('R', 'free-close')].append(p.dist(c, f, kh) - p.dist(c, f, min(last, kh + 5)))
            else: C[('R', 'nofree-stuff')] += p.raw['yards'] <= 0
    # print
    print(f"== {os.path.basename(path)}")
    for K, name in (('R', 'runs'), ('P', 'catches')):
        n = C[(K, 'n')]
        if not n: continue
        print(f"  [{name}] n {n}" + (f", YAC p50 {q(S[('P', 'yac')]):.1f} mean {mean(S[('P', 'yac')]):.2f}" if K == 'P' else ''))
        a = C[(K, '10')]
        if a:
            print(f"   1 run-down: +10 {pct(a, n):.1f}% of {name}; +20|+10 {pct(C[(K, '20')], a):.0f}%, +40|+20 {pct(C[(K, '40')], C[(K, '20')]):.0f}% | at +10: "
                  f"within 5 yd {mean(S[(K, 'rd', 'w5')]):.2f}, within 10 {mean(S[(K, 'rd', 'w10')]):.2f}, level/ahead within 15 {mean(S[(K, 'rd', 'ahead')]):.2f}; "
                  f"speed share p50 {q(S[(K, 'rd', 'share')]):.2f}; aim intercept {pct(C[(K, 'aim', 'intercept')], C[(K, 'aim', '*')]):.0f}% chase {pct(C[(K, 'aim', 'chase')], C[(K, 'aim', '*')]):.0f}% off {pct(C[(K, 'aim', 'off')], C[(K, 'aim', '*')]):.0f}%; "
                  f"nearest two aim off the line to him p50 {q(S[(K, 'rd', 'aim2')]):.0f} deg; closing {pct(C[(K, 'close', 'y')], C[(K, 'close', '*')]):.0f}%; yards after +10 mean {mean(S[(K, 'rd', 'after')]):.1f}")
        m = C[(K, 'contact')]
        if m:
            row = lambda key: ' '.join(f"{o} {pct(C[(K, 'fc', key, o)], C[(K, 'fc', key, '*')]):3.0f}%" for o in ('made', 'missed', 'broken', 'other')) + f" (n {C[(K, 'fc', key, '*')]})"
            print(f"   2 first contact: {pct(m, n):.0f}% of {name}, at +{q(S[(K, 'fc', 'xpos')]):.1f} yd p50 | all: {row('all')}")
            print(f"     open field: {row('open')} | approach p50 {q(S[(K, 'fc', 'app', 'open')]):.1f} yd/s, broke down {pct(sum(S[(K, 'fc', 'broke', 'open')]), len(S[(K, 'fc', 'broke', 'open')])):.0f}%")
            print(f"     in traffic: {row('traffic')} | approach p50 {q(S[(K, 'fc', 'app', 'traffic')]):.1f}, broke down {pct(sum(S[(K, 'fc', 'broke', 'traffic')]), len(S[(K, 'fc', 'broke', 'traffic')])):.0f}%")
            for g in ('DL', 'LB', 'DB'): print(f"     {g}: {row(g)}")
            for h in ('<3', '3-6', '6+'): print(f"     help {h} yd: {row('help' + h)}")
            an = sum(C[(K, 'fc', 'angle', x)] for x in ('headon', 'side', 'behind'))
            print(f"     angle head-on {pct(C[(K, 'fc', 'angle', 'headon')], an):.0f}% side {pct(C[(K, 'fc', 'angle', 'side')], an):.0f}% behind {pct(C[(K, 'fc', 'angle', 'behind')], an):.0f}% | "
                  f"yards after contact mean: made {mean(S[(K, 'fc', 'more', 'made')]):.1f}, missed {mean(S[(K, 'fc', 'more', 'missed')]):.1f}, broken {mean(S[(K, 'fc', 'more', 'broken')]):.1f}, other {mean(S[(K, 'fc', 'more', 'other')]):.1f}")
            r2, r3 = S[(K, 'rally', '2nd')], S[(K, 'rally', '3rd')]
            print(f"   3 rally: 2nd defender p50 {q(r2):.1f} s (p75 {q(r2, .75):.1f}), never {pct(C[(K, 'rally-never', '2nd')], m):.0f}%; 3rd p50 {q(r3):.1f} s, never {pct(C[(K, 'rally-never', '3rd')], m):.0f}%")
        if K == 'R':
            fr = C[('R', 'free')]
            print(f"   5 stuffs: {pct(C[('R', 'stuff')], n):.1f}% of runs | a free man at the line 0.3 s after the handoff on {pct(fr, n):.0f}%: "
                  f"he makes first contact {pct(C[('R', 'free-hit')], fr):.0f}%, stuff {pct(C[('R', 'free-stuff')], fr):.0f}% (when he hits {pct(C[('R', 'free-hit-stuff')], C[('R', 'free-hit')]):.0f}%), "
                  f"his distance p50 {q(S[('R', 'free-dist')]):.1f} yd, closes {q(S[('R', 'free-close')]):.1f} yd in 0.5 s; no free man: stuff {pct(C[('R', 'nofree-stuff')], n - fr):.0f}%")
    print('   4 deep defenders (dropbacks): ' + ' | '.join(
        f"{sh} {pct(C[('shell', sh)], sum(C[('shell', s)] for s in ('0-high', '1-high', '2-high'))):.0f}%: deepest DB {q(S[('deep', sh, 0, 'depth')]):.1f} deep / {q(S[('deep', sh, 0, 'width')]):.1f} wide, 2nd {q(S[('deep', sh, 1, 'depth')]):.1f} / {q(S[('deep', sh, 1, 'width')]):.1f}; "
        f"at the throw deepest DB {q(S[('throw-deepdb', sh)]):.1f}, cushion over the deepest receiver p50 {q(S[('throw-cushion', sh)]):+.1f}, nobody deeper {pct(C[('nobody-over', sh)], C[('throw', sh)]):.0f}%"
        for sh in ('0-high', '1-high', '2-high')))


for path in sys.argv[1:]:
    report(path)
