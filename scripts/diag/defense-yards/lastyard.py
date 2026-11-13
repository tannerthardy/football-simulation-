"""The first defender's last yards to the ball carrier (Integration, 2026-11-10, after Flex's grabs.py: our first man on
catches lets the catcher run on from hands range 28% vs NFL 10%). Same code on NFL tracking and sim plays (common
format); report only. usage: python3 -I scripts/diag/defense-yards/lastyard.py <plays.jsonl.gz> [...]

Carrier phase as grabs.py (handoff/snap on runs, the catch on passes, to the end). The first man: the first defender to
reach hands range (centre within 1.6 yd and closing). His outcome over the next 0.5 s (grabs.py): contact (1.0 yd),
slowed (carrier speed falls >= 30%), runs on. Then, by outcome:
  at 3 yd (his last frame beyond 3 yd before hands range): his speed share of his play max, his heading off the line to
  the carrier (aim), the carrier's speed;
  at hands range: his speed share, closing speed, heading off the line to the carrier;
  broke down: speed at hands range under 0.8 of his speed at 3 yd;
  overran: within the 0.5 s the carrier ends up behind him along his own travel (he went past);
  carrier cut: the carrier's heading turns > 30 deg between 0.2 s before and 0.3 s after hands range."""
import sys, os, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
import gzip, json
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
HANDS, CONTACT = 1.6, 1.0


def ang(ax, ay, bx, by):
    if math.hypot(ax, ay) < 1e-6 or math.hypot(bx, by) < 1e-6: return float('nan')
    return abs(math.degrees(math.atan2(ax * by - ay * bx, ax * bx + ay * by)))


for path in sys.argv[1:]:
    S = collections.defaultdict(list); C = collections.Counter()
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        ev = raw.get('events', {})
        if raw.get('kind') == 'pass':
            c = raw.get('catcher', raw.get('receiver', raw.get('target'))) if 'catch' in ev else None; start = ev.get('catch')
        elif raw.get('kind') == 'run':
            c = raw.get('carrier'); start = ev.get('handoff', 0.0) or 0.0
        else: continue
        if c is None or start is None or 'end' not in ev: continue
        p = Play(raw); fs, fe = p.k(start), min(p.frames - 1, p.k(ev['end']))
        if fe - fs < 3 or p.pos(c, fs)[0] is None: continue
        D = [d for d in p.who('D') if p.pos(d, fs)[0] is not None]
        best = None
        for d in D:
            for f in range(fs + 1, fe - 4):
                if p.dist(c, d, f) <= HANDS and p.dist(c, d, f) < p.dist(c, d, f - 1):
                    if best is None or f < best[0]: best = (f, d)
                    break
        if best is None: continue
        f, d = best; v0 = p.speed(c, f)
        if v0 < 1.0: continue
        w = range(f, min(fe, f + 5) + 1)
        out = 'contact' if any(p.dist(c, d, g) <= CONTACT for g in w) else 'slowed' if min(p.speed(c, g) for g in w) <= 0.7 * v0 else 'runs on'
        K = 'R' if raw['kind'] == 'run' else 'P'
        top = max(p.speed(d, k) for k in range(0, fe + 1)) or 1
        f3 = next((g for g in range(f, fs - 1, -1) if p.dist(c, d, g) > 3), fs)
        def aim(g):
            ux, uy = p.velocity(d, g); (dx, dy), (cx, cy) = p.pos(d, g), p.pos(c, g)
            return ang(ux, uy, cx - dx, cy - dy)
        s3, sf = p.speed(d, f3) / top, p.speed(d, f) / top
        ux, uy = p.velocity(d, f); (dx, dy), (cx, cy) = p.pos(d, f), p.pos(c, f); dd = math.hypot(cx - dx, cy - dy) or 1
        cvx, cvy = p.velocity(c, f)
        closing = ((ux - cvx) * (cx - dx) + (uy - cvy) * (cy - dy)) / dd
        sp = math.hypot(ux, uy) or 1
        over = any(((p.pos(c, g)[0] - p.pos(d, g)[0]) * ux + (p.pos(c, g)[1] - p.pos(d, g)[1]) * uy) / sp < -0.3 for g in w)
        a0, a1 = p.velocity(c, max(fs, f - 2)), p.velocity(c, min(fe, f + 3))
        cut = ang(*a0, *a1) > 30 if math.hypot(*a0) > 1 and math.hypot(*a1) > 1 else False
        key = (K, out)
        C[key] += 1; C[(K, '*')] += 1
        S[key + ('s3',)].append(s3); S[key + ('sf',)].append(sf); S[key + ('aim3',)].append(aim(f3)); S[key + ('aimf',)].append(aim(f))
        S[key + ('close',)].append(closing); S[key + ('cspd',)].append(v0)
        S[key + ('v3',)].append(p.speed(d, f3)); S[key + ('vf',)].append(p.speed(d, f))
        C[key + ('broke',)] += sf < 0.8 * s3 if s3 > 0 else 0; C[key + ('over',)] += over; C[key + ('cut',)] += cut
        C[key + (p.players[d]['group'],)] += 1
    print(f"== {os.path.basename(path)}")
    for K, name in (('R', 'runs'), ('P', 'catches')):
        n = C[(K, '*')]
        if not n: continue
        print(f"  [{name}] first man at hands range n {n}")
        for out in ('contact', 'slowed', 'runs on'):
            m = C[(K, out)]
            if not m: continue
            k = (K, out); nan = lambda v: [x for x in v if x == x]
            print(f"   {out:8} {100 * m / n:4.0f}% | at 3 yd: speed share {q(S[k + ('s3',)]):.2f}, aim off the line {q(nan(S[k + ('aim3',)])):3.0f} deg | at hands: speed share {q(S[k + ('sf',)]):.2f}, "
                  f"closing {q(S[k + ('close',)]):.1f} yd/s, aim {q(nan(S[k + ('aimf',)])):3.0f} deg | carrier {q(S[k + ('cspd',)]):.1f} yd/s | broke down {100 * C[k + ('broke',)] / m:3.0f}% "
                  f"overran {100 * C[k + ('over',)] / m:3.0f}% carrier cut {100 * C[k + ('cut',)] / m:3.0f}% | DB {100 * C[k + ('DB',)] / m:.0f}% LB {100 * C[k + ('LB',)] / m:.0f}% | his speed at 3 yd {q(S[k + ('v3',)]):.1f} -> hands {q(S[k + ('vf',)]):.1f} yd/s")
