# Closing geometry when a rusher meets an attached end (#35 item 2; Integration: who yields?). Same operator for NFL
# tracking and sim exports (common format; offense +x, line at x = 0). Attached ends on a route as attached-release.py
# (TE <= 1.5 yd off the line, 0.5-2.5 yd outside the last lineman, past 5 yd by 3 s). The meeting: the first DL/LB whose
# centre comes within 1.0 yd of his before 1.2 s (the touch). Over the 0.3 s before the touch: each man's lateral
# displacement (y) signed away from the other (+ = he gave ground across, out of the other's way), each man's downfield
# displacement (the end + upfield, the rusher + toward the backfield), and their closing speed at the start of it (the
# rate the gap shrank). At the touch: the gap's bearing from the end (0 deg = straight upfield of him, 90 = beside him)
# and, over the touch and the 0.2 s after, the closest centres (miss distance; NFL tracking has no bodies, only centres).
# Then the end's downfield speed over the 0.3 s after the touch, by who gave more ground across.
# usage: python3 scripts/diag/pass-operators/attached-closing.py <plays.jsonl.gz> ...
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for path in sys.argv[1:]:
    rows = []
    for line in gzip.open(path, 'rt'):
        r = json.loads(line); r = r.get('common', r)
        if r.get('kind') != 'pass' or not r.get('xy'): continue
        p = Play(r); dt = r['dt']; n = len(r['xy'])
        at = lambda i, t: p.pos(i, max(0, min(n - 1, int(round(t / dt)))))
        OL = [i for i in p.who('O', 'OL') if at(i, 0)[0] is not None]
        if len(OL) < 5: continue
        ys = [at(i, 0)[1] for i in OL]
        end_t = min((r['events'].get(k) for k in ('pass', 'pass_forward', 'sack', 'end') if r['events'].get(k) is not None), default=(n - 1) * dt)
        DEF = [i for i in p.who('D') if r['players'][i]['group'] in ('DL', 'LB') and at(i, 0)[0] is not None]
        for i in p.who('O', 'TE'):
            x0, y0 = at(i, 0)
            if x0 is None or x0 < -1.5: continue
            out = 1 if y0 > (min(ys) + max(ys)) / 2 else -1
            w = (y0 - (max(ys) if out > 0 else min(ys))) * out
            if not (0.5 <= w <= 2.5): continue
            if max((at(i, k * dt)[0] or -9) for k in range(int(min(3.0, end_t) / dt) + 1)) < 5: continue
            touch = None
            for k in range(int(min(1.2, end_t) / dt) + 1):
                for d in DEF:
                    a, b = at(i, k * dt), at(d, k * dt)
                    if a[0] is not None and b[0] is not None and math.hypot(a[0] - b[0], a[1] - b[1]) <= 1.0: touch = (k * dt, d); break
                if touch: break
            if not touch or touch[0] < 0.3 + dt / 2: continue
            t1, d = touch; t0 = t1 - 0.3
            e0, e1, r0, r1 = at(i, t0), at(i, t1), at(d, t0), at(d, t1)
            if None in (e0[0], e1[0], r0[0], r1[0]): continue
            s = 1 if e0[1] >= r0[1] else -1  # the end's side of the rusher
            eLat, rLat = (e1[1] - e0[1]) * s, -(r1[1] - r0[1]) * s
            eUp, rBack = e1[0] - e0[0], -(r1[0] - r0[0])
            g0 = math.hypot(e0[0] - r0[0], e0[1] - r0[1]); g0b = at(i, t0 + dt); g0r = at(d, t0 + dt)
            closing = (g0 - math.hypot(g0b[0] - g0r[0], g0b[1] - g0r[1])) / dt if g0b[0] is not None and g0r[0] is not None else float('nan')
            bearing = math.degrees(math.atan2(abs(r1[1] - e1[1]), r1[0] - e1[0]))
            miss = min(math.hypot(at(i, t)[0] - at(d, t)[0], at(i, t)[1] - at(d, t)[1]) for t in [t1 + k * dt for k in range(int(0.2 / dt) + 1)] if at(i, t)[0] is not None and at(d, t)[0] is not None)
            t2 = min(t1 + 0.3, end_t); after = (at(i, t2)[0] - e1[0]) / (t2 - t1) if t2 > t1 + dt / 2 else float('nan')
            rows.append(dict(eLat=eLat, rLat=rLat, eUp=eUp, rBack=rBack, closing=closing, bearing=bearing, miss=miss, after=after, t=t1))
    def line(lab, S):
        if not S: return f'  {lab}: none'
        f3 = lambda k: f"{q([x[k] for x in S], .25):.2f}/{q([x[k] for x in S]):.2f}/{q([x[k] for x in S], .75):.2f}"
        return (f"  {lab} n {len(S)}: touch at {q([x['t'] for x in S]):.2f} s | across, away from the other, over 0.3 s (p25/50/75): end {f3('eLat')} yd, rusher {f3('rLat')} yd | "
                f"end upfield {f3('eUp')}, rusher toward the backfield {f3('rBack')} | closing {f3('closing')} yd/s | bearing at the touch {f3('bearing')} deg | "
                f"closest centres {f3('miss')} yd | end downfield speed after {f3('after')} yd/s")
    print(f'{os.path.basename(path)}: attached ends on a route met by a DL/LB (touch after 0.3 s): {len(rows)}')
    print(line('all', rows))
    print(line('end gave more ground across', [x for x in rows if x['eLat'] > x['rLat']]))
    print(line('rusher gave more ground across', [x for x in rows if x['rLat'] >= x['eLat']]))
    print(f"  shares: end yielded (> 0.2 yd across) {100*sum(x['eLat'] > .2 for x in rows)/max(1,len(rows)):.0f}%, rusher yielded {100*sum(x['rLat'] > .2 for x in rows)/max(1,len(rows)):.0f}%, both {100*sum(x['eLat'] > .2 and x['rLat'] > .2 for x in rows)/max(1,len(rows)):.0f}%, neither {100*sum(x['eLat'] <= .2 and x['rLat'] <= .2 for x in rows)/max(1,len(rows)):.0f}%")
