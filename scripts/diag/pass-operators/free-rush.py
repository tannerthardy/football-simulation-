"""A free rusher at the QB: what the QB does about it (Integration, 2026-11-12, FREE_BOUND read: sacks 4 -> under 1%).
Same code on NFL and sim.

usage: python3 -I scripts/diag/pass-operators/free-rush.py [--ball out/mechanics/nfl-ball.jsonl.gz] <plays.jsonl.gz> [...]

Population: dropbacks (kind pass) where, before the ball is out (pass_forward, else the end), a defender comes within
2.0 yd of the QB with no offensive player (other than the QB) within 1.0 yd of that defender: a free rusher. The moment
is the first such frame. Outcomes from it: thrown (time to the release), sacked (no throw, QB behind the line at the
end; time to the end), scramble (no throw, QB past the line), and for throws: thrown away (NFL: the play description
names no receiver, from the --ball side file; sim: labels.throwaway), complete, interception, yards, the target's
group. Distance of that rusher at the release. Limits: 'free' is a geometric proxy (no offensive body within 1 yd), not
a blocking assignment; tracking has 0.1 s frames.
"""
import sys, os, json, gzip, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
pct = lambda a, b: f"{100 * a / b:.0f}%" if b else '-'


def report(path, ball):
    n = 0; rows = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        side = ball.get(raw['id']) if ball is not None else None
        if ball is not None and side is None: continue
        p = Play(raw); ev = raw['events']
        qbs = p.who('O', 'QB')
        if not qbs: continue
        qb = qbs[0]; n += 1
        fw = ev.get('pass_forward'); kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
        O = [o for o in p.who('O') if o != qb]; D = p.who('D')
        hit = None
        for k in range(0, kend + 1):
            if p.pos(qb, k)[0] is None: continue
            for d in D:
                if p.pos(d, k)[0] is None or p.dist(qb, d, k) > 2.0: continue
                if any(p.dist(o, d, k) <= 1.0 for o in O): continue
                hit = (k, d); break
            if hit: break
        if hit is None: continue
        k, d = hit; t0 = k * p.dt
        labels = raw.get('labels', {})
        r = {'t0': t0}
        # Where he goes from the moment: his displacement to the release (or the end), and its direction against the
        # rusher's bearing (180 = straight away from him); whether he is outside the tackles' snap positions then.
        qx0, qy0 = p.pos(qb, k); rx, ry = p.pos(d, k)
        qx1, qy1 = p.pos(qb, kend)
        mv = math.hypot(qx1 - qx0, qy1 - qy0); r['move'] = mv
        bx, by = rx - qx0, ry - qy0
        r['away'] = math.degrees(math.acos(max(-1, min(1, ((qx1 - qx0) * bx + (qy1 - qy0) * by) / (mv * math.hypot(bx, by) or 1))))) if mv > 0.5 else None
        OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
        ys = [p.pos(o, 0)[1] for o in OL]
        r['outside'] = bool(OL) and (qy1 < min(ys) - 0.5 or qy1 > max(ys) + 0.5)
        r['rushSide'] = 'edge' if OL and (ry < min(ys) or ry > max(ys)) else 'inside'
        # Blind side (where the record has the QB's orientation, NFL 'o'): the rusher's bearing more than 100 deg off
        # the way his body faces at the moment.
        o = raw.get('o'); r['blind'] = None
        if o and k < len(o) and o[k][qb] is not None:
            b = math.degrees(math.atan2(ry - qy0, rx - qx0)); dlt = abs((b - o[k][qb] + 180) % 360 - 180)
            r['blind'] = dlt > 100
        if fw is not None:
            r['out'] = 'thrown'; r['dt'] = fw - t0
            r['thrownAway'] = (not side['namedReceiver']) if side is not None else bool(labels.get('throwaway'))
            r['complete'] = 'catch' in ev
            r['int'] = side['int'] if side is not None else bool(labels.get('interception'))
            r['yards'] = raw.get('yards') or 0
            t = raw.get('target'); r['tg'] = p.players[t]['group'] if t is not None else 'none'
            r['dist'] = p.dist(qb, d, kend)
        else:
            xe = p.pos(qb, kend)[0]
            r['out'] = 'scramble' if xe is not None and xe > 0 else 'sack'; r['dt'] = p.end - t0
        rows.append(r)
    th = [r for r in rows if r['out'] == 'thrown']; tg = [r for r in th if not r['thrownAway']]
    print(f"== {os.path.basename(path)}: dropbacks {n} | a free rusher within 2 yd before the ball is out: {len(rows)} ({pct(len(rows), n)})")
    c = collections.Counter(r['out'] for r in rows)
    print(f"   outcome: thrown {pct(c['thrown'], len(rows))} | sacked {pct(c['sack'], len(rows))} | scramble {pct(c['scramble'], len(rows))}")
    if th:
        print(f"   thrown: time from the moment to release p25/50/75 {q([r['dt'] for r in th], .25):.2f}/{q([r['dt'] for r in th]):.2f}/{q([r['dt'] for r in th], .75):.2f} s | rusher's distance at release p50 {q([r['dist'] for r in th]):.2f} yd")
        print(f"   thrown away {pct(sum(r['thrownAway'] for r in th), len(th))} | targeted: complete {pct(sum(r['complete'] for r in tg), len(tg))}, int {pct(sum(r['int'] for r in tg), len(tg))}, yd/att {sum(r['yards'] for r in tg) / max(1, len(tg)):.1f}, to a back {pct(sum(r['tg'] == 'RB' for r in tg), len(tg))}, TE {pct(sum(r['tg'] == 'TE' for r in tg), len(tg))}, WR {pct(sum(r['tg'] == 'WR' for r in tg), len(tg))}")
    sk = [r for r in rows if r['out'] == 'sack']
    if sk: print(f"   sacked: time from the moment to the end p50 {q([r['dt'] for r in sk]):.2f} s")
    # What each outcome looks like: his move from the moment, its direction against the rusher, outside the tackles.
    for name, key, vals in (('rusher from', 'rushSide', ('edge', 'inside')), ('blind side', 'blind', (True, False))):
        for v in vals:
            g = [r for r in rows if r.get(key) == v]
            if not g: continue
            c2 = collections.Counter(r['out'] for r in g); th2 = [r for r in g if r['out'] == 'thrown']
            print(f"   {name} {str(v):6s} n {len(g):4d}: thrown {pct(c2['thrown'], len(g))} (away {pct(sum(r['thrownAway'] for r in th2), len(th2))}) | sacked {pct(c2['sack'], len(g))} | scramble {pct(c2['scramble'], len(g))}")
    groups = [('thrown away', [r for r in th if r['thrownAway']]), ('thrown, targeted', tg), ('scramble', [r for r in rows if r['out'] == 'scramble']), ('sacked', sk)]
    for name, g in groups:
        if not g: continue
        aw = [r['away'] for r in g if r['away'] is not None]
        print(f"   {name:17s} n {len(g):4d}: time p50 {q([r['dt'] for r in g]):.2f} s | moved p50 {q([r['move'] for r in g]):.1f} yd | direction vs rusher p50 {q(aw):.0f} deg (>120: away {pct(sum(1 for a in aw if a > 120), len(aw))}) | outside the tackles {pct(sum(r['outside'] for r in g), len(g))} | rusher from the edge {pct(sum(r['rushSide'] == 'edge' for r in g), len(g))}")


if __name__ == '__main__':
    args = sys.argv[1:]; ball = None
    if '--ball' in args:
        i = args.index('--ball'); ball = {}
        for line in gzip.open(args[i + 1], 'rt'):
            r = json.loads(line); ball[r['id']] = r
        del args[i:i + 2]
    for path in args: report(path, ball)
