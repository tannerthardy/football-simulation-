"""A defender beside and ahead of the receiver after the catch: does he meet
him or get passed? One operator for NFL tracking and sim common plays.
Situation: before anyone's first contact, a defender 1.5-4 yd ahead of the
carrier along the carrier's heading and 1.5-4.5 yd to the side, the carrier
moving 3-6 yd/s (first such frame per defender per play). Over the next
1.0 s: "met" = within 1.0 yd while still level or ahead (ahead >= -0.3);
"passed" = never met and 0.5+ yd behind him at the end. Reports shares and
the defender's speed, his speed along/toward the carrier, by source.
usage: sidepass.py FILE [FILE...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402

q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None


def rel(p, d, r, k):
    (cx, cy), (dx, dy) = p.pos(r, k), p.pos(d, k)
    if cx is None or dx is None: return None
    vx, vy = p.velocity(r, k); s = math.hypot(vx, vy)
    if s < .5: return None
    hx, hy = vx / s, vy / s; rx, ry = dx - cx, dy - cy
    return rx * hx + ry * hy, abs(-rx * hy + ry * hx), s, math.hypot(rx, ry)


for path in sys.argv[1:]:
    out = {'met': [], 'passed': [], 'other': []}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'pass': continue
        ev = raw.get('events') or {}
        tc = ev.get('catch'); r = raw.get('receiver', raw.get('target'))
        if r is None or tc is None: continue
        p = Play(raw)
        stop = ev.get('first_contact'); stop = p.end if stop is None or stop < tc else stop
        k0, k1 = p.k(tc), min(p.frames - 1, p.k(stop))
        seen = set()
        for k in range(k0, k1):
            for d in p.who('D'):
                if d in seen: continue
                a = rel(p, d, r, k)
                if a is None: continue
                ahead, side, cs, _ = a
                if not (1.5 <= ahead <= 4 and 1.5 <= side <= 4.5 and 3 <= cs <= 6): continue
                seen.add(d)
                kend = k + int(round(1.0 / p.dt))
                if kend >= p.frames: continue
                fate = None
                for j in range(k + 1, kend + 1):
                    b = rel(p, d, r, j)
                    if b and b[3] <= 1.0 and b[0] >= -.3: fate = 'met'; break
                if fate is None:
                    b = rel(p, d, r, kend)
                    fate = 'passed' if b and b[0] <= -.5 else 'other'
                vx, vy = p.velocity(d, k)
                (cx, cy), (dx, dy) = p.pos(r, k), p.pos(d, k)
                gx, gy = cx - dx, cy - dy; g = math.hypot(gx, gy) or 1
                kh = min(p.frames - 1, k + 5)
                cvx, cvy = p.velocity(r, k); hx, hy = cvx / cs, cvy / cs
                out[fate].append(dict(along=vx * hx + vy * hy, ts=math.hypot(vx, vy), toward=(vx * gx + vy * gy) / g, cs=cs,
                                      ts5=p.speed(d, kh), cs5=p.speed(r, kh), ahead=ahead, side=side))
    n = sum(len(v) for v in out.values())
    print(f'{path.split("/")[-1][:28]}  situations {n}')
    for fate, R in out.items():
        print(f'  {fate:6s} {100 * len(R) / max(1, n):4.0f}%  defender speed {q([x["ts"] for x in R])} -> {q([x["ts5"] for x in R])} (+0.5 s), '
              f'toward carrier {q([x["toward"] for x in R])} along his path {q([x["along"] for x in R])} | carrier {q([x["cs"] for x in R])} -> {q([x["cs5"] for x in R])} | '
              f'ahead {q([x["ahead"] for x in R])} side {q([x["side"] for x in R])}')
    allr = [x for R in out.values() for x in R]
    print(f'  all: carrier {q([x["cs"] for x in allr])} -> {q([x["cs5"] for x in allr])} (p25/p75 of change {q([x["cs5"] - x["cs"] for x in allr], .25)}/{q([x["cs5"] - x["cs"] for x in allr], .75)}); defender {q([x["ts"] for x in allr])} -> {q([x["ts5"] for x in allr])}, along {q([x["along"] for x in allr])}')
