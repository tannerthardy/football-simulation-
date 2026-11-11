"""Who was near the catcher on catches that go 10+ yd untouched (Integration, 2026-11-11). Same code on NFL tracking and
sim plays in the common format (yards.py `plays`: carrier phase from the catch). Report only.
usage: python3 -I scripts/diag/defense-yards/tailwho.py <plays.jsonl.gz> [...]

Untouched-to-10: the catcher reaches 10 yd past his catch point before any defender's centre is within 1.0 yd.
For those catches (and, for comparison, for all catches), the nearest four defenders at the catch frame:
  where:  distance to the catcher; along = his offset along the catcher's direction to the goal line (+ = downfield of
          the catcher, i.e. in front of him), lateral offset;
  doing:  'away' = moving > 2 yd/s with velocity pointing away from the catcher (cos < -0.5: running downfield / with a
          receiver, back to the ball); 'toward' = cos > 0.5; 'across' otherwise; 'still' < 2 yd/s; 'blocked' = an
          offensive non-carrier within 1.2 yd;
  turn:   time from the catch until his velocity first points at the catcher (cos > 0.5 at > 2 yd/s), cap 2.0 s.
  role:   deep (his x at the catch > the catcher's x + 5), level (within 5 yd either way), under (> 5 yd behind the
          catcher, toward the line), by the same geometry on both sides.
Ranked: for untouched-to-10 catches, the share where the nearest defender was 'away', 'blocked', 'still', and the
median turn time of the nearest two, against all catches and against NFL."""
import sys, os, math, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
_a = sys.argv; sys.argv = sys.argv[:1]
from yards import plays  # noqa
sys.argv = _a
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
pct = lambda a, b: 100 * a / b if b else float('nan')


def report(path):
    S = collections.defaultdict(list); C = collections.Counter()
    for kind, p, c, k0, last in plays(path):
        if kind != 'pass' or c is None: continue
        x0, y0 = p.pos(c, k0)
        D = [d for d in p.who('D') if p.pos(d, k0)[0] is not None]
        O = [o for o in p.who('O') if o != c]
        if len(D) < 4: continue
        k10 = next((k for k in range(k0, last + 1) if p.pos(c, k)[0] >= x0 + 10), None)
        kc = next((k for k in range(k0, last + 1) if any(p.dist(c, d, k) <= 1.0 for d in D)), None)
        grp = 'untouched10' if k10 is not None and (kc is None or kc > k10) else 'other'
        # the race by the nearest defender's distance at the catch: untouched-to-10 rate, the catcher's speed and the
        # nearest defender's closing over the first 0.5 / 1.0 s, his speed share of his play max
        n1 = min(D, key=lambda d: p.dist(c, d, k0)); d0 = p.dist(c, n1, k0)
        band = '0-3' if d0 < 3 else '3-6' if d0 < 6 else '6-10' if d0 < 10 else '10+'
        C[('band', band, 'n')] += 1; C[('band', band, 'u10')] += grp == 'untouched10'
        k5, k10s = min(last, k0 + 5), min(last, k0 + 10)
        S[('band', band, 'cs5')].append(p.speed(c, k5)); S[('band', band, 'cs10')].append(p.speed(c, k10s))
        S[('band', band, 'close5')].append((d0 - p.dist(c, n1, k5)) / max(0.1, (k5 - k0) * p.dt))
        top = max(p.speed(n1, k) for k in range(0, last + 1)) or 1
        S[('band', band, 'nshare5')].append(p.speed(n1, k5) / top); S[('band', band, 'nspd5')].append(p.speed(n1, k5))
        # at the catch: the catcher's speed directly away from that defender (+ = fleeing him) and the defender's own
        # speed along the line to the catcher (+ = coming at him)
        (nx, ny), (cx0, cy0) = p.pos(n1, k0), (x0, y0); ln = math.hypot(cx0 - nx, cy0 - ny) or 1; ex, ey = (cx0 - nx) / ln, (cy0 - ny) / ln
        cvx, cvy = p.velocity(c, k0); dvx, dvy = p.velocity(n1, k0)
        S[('band', band, 'flee')].append(cvx * ex + cvy * ey); S[('band', band, 'come')].append(dvx * ex + dvy * ey)
        for g in (grp, 'all'):
            C[(g, 'n')] += 1
            near = sorted(D, key=lambda d: p.dist(c, d, k0))[:4]
            for r, d in enumerate(near):
                dx, dy = p.pos(d, k0); dist = p.dist(c, d, k0)
                ux, uy = p.velocity(d, k0); s = math.hypot(ux, uy)
                bx, by = x0 - dx, y0 - dy; bn = math.hypot(bx, by) or 1
                cos = (ux * bx + uy * by) / (s * bn) if s > 1e-6 else 0
                blocked = any(p.dist(o, d, k0) <= 1.2 for o in O)
                doing = 'blocked' if blocked else 'still' if s < 2 else 'away' if cos < -0.5 else 'toward' if cos > 0.5 else 'across'
                role = 'deep' if dx > x0 + 5 else 'under' if dx < x0 - 5 else 'level'
                kt = next((k for k in range(k0, min(last, k0 + 20) + 1)
                           if p.speed(d, k) > 2 and (lambda vx, vy, bx2, by2: (vx * bx2 + vy * by2) / ((math.hypot(vx, vy) * math.hypot(bx2, by2)) or 1))(
                               *p.velocity(d, k), p.pos(c, k)[0] - p.pos(d, k)[0], p.pos(c, k)[1] - p.pos(d, k)[1]) > 0.5), None)
                turn = (kt - k0) * p.dt if kt is not None else 2.0
                key = (g, r)
                C[key + (doing,)] += 1; C[key + (role,)] += 1; C[key + ('*',)] += 1
                S[key + ('dist',)].append(dist); S[key + ('along',)].append(dx - x0); S[key + ('turn',)].append(turn)
                if r < 2: S[(g, 'turn2')].append(turn)
    print(f"== {os.path.basename(path)}")
    for g in ('untouched10', 'all'):
        n = C[(g, 'n')]
        if not n: continue
        print(f"  [{g}] catches {n}" + (f" ({pct(n, C[('all', 'n')]):.1f}% of catches)" if g != 'all' else ''))
        for r in range(4):
            k = (g, r); m = C[k + ('*',)]
            if not m: continue
            doing = ' '.join(f"{x} {pct(C[k + (x,)], m):3.0f}%" for x in ('away', 'across', 'toward', 'still', 'blocked'))
            roles = ' '.join(f"{x} {pct(C[k + (x,)], m):3.0f}%" for x in ('deep', 'level', 'under'))
            print(f"   nearest #{r + 1}: dist p50 {q(S[k + ('dist',)]):4.1f} yd, downfield of him p50 {q(S[k + ('along',)]):+5.1f} | {doing} | {roles} | turn to him p50 {q(S[k + ('turn',)]):.1f} s (p75 {q(S[k + ('turn',)], .75):.1f})")
        pass
    print('  [race by the nearest defender\'s distance at the catch]')
    for band in ('0-3', '3-6', '6-10', '10+'):
        m = C[('band', band, 'n')]
        if m: print(f"   {band:5} yd: {pct(m, C[('all', 'n')]):4.0f}% of catches | untouched to +10 {pct(C[('band', band, 'u10')], m):4.1f}% | catcher speed +0.5 / +1.0 s {q(S[('band', band, 'cs5')]):.1f} / {q(S[('band', band, 'cs10')]):.1f} yd/s | nearest closes {q(S[('band', band, 'close5')]):+.1f} yd/s over 0.5 s, his speed {q(S[('band', band, 'nspd5')]):.1f} yd/s ({q(S[('band', band, 'nshare5')]):.2f} of his max) | at the catch: catcher moving away from him {q(S[('band', band, 'flee')]):+.1f}, he comes at {q(S[('band', band, 'come')]):+.1f} yd/s")
    for g in ():
        print(f"   nearest two: turn to the catcher p50 {q(S[(g, 'turn2')]):.1f} s, never within 2 s {pct(sum(1 for t in S[(g, 'turn2')] if t >= 2.0), len(S[(g, 'turn2')])):.0f}%")


for path in sys.argv[1:]:
    report(path)
