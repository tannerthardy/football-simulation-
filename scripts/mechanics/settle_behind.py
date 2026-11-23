#!/usr/bin/env python3
"""Why the underneath zone defender is behind a settling receiver at the release (Coverage, 2026-11-18).

Population as lane_position.py, settling targets only (under 2.5 yd/s at the release). "Behind" = his projection
onto the passer->receiver line is past the receiver. For each defender: deeper than the route (his depth more than
1 yd past the receiver's), still dropping (moving deeper at 1 yd/s or more at the release), carrying someone else
(another eligible receiver within 3 yd whose run his matches: both faster than 2 yd/s, headings within 45 deg), and
how long before the release the receiver sat (fell under 2.5 yd/s) with the defender's speed then.

    python3 -I scripts/mechanics/settle_behind.py plays.jsonl.gz [--examples N]
"""
import gzip, json, math, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from metrics import coverage_family  # noqa: E402
from lane_position import seg, q, HALF  # noqa: E402


def main():
    args = [a for a in sys.argv[1:] if a.endswith('.gz')]
    nex = int(sys.argv[sys.argv.index('--examples') + 1]) if '--examples' in sys.argv else 0
    out = {'behind': [], 'front': []}
    ex = []
    for path in args:
        with gzip.open(path, 'rt') as fh:
            for line in fh:
                p = json.loads(line)
                ev = p.get('events', {})
                if p.get('kind') != 'pass' or p.get('target') is None or 'pass_forward' not in ev or 'pass_arrived' not in ev:
                    continue
                if coverage_family((p.get('cell') or {}).get('coverage')) != 'zone':
                    continue
                dt, xy, pl = p['dt'], p['xy'], p['players']
                n = len(xy)
                fr, fa = round(ev['pass_forward'] / dt), round(ev['pass_arrived'] / dt)
                if fr - HALF < 0 or fr + HALF >= n or fa >= n or fr - round(1.0 / dt) < 0:
                    continue
                pos = lambda f, i: (xy[f][2 * i], xy[f][2 * i + 1])
                vel = lambda f, i: ((pos(f + HALF, i)[0] - pos(f - HALF, i)[0]) / (2 * HALF * dt), (pos(f + HALF, i)[1] - pos(f - HALF, i)[1]) / (2 * HALF * dt))
                qbs = [i for i, x in enumerate(pl) if x['side'] == 'O' and x['group'] == 'QB']
                if not qbs:
                    continue
                t = p['target']
                Q, R, v = pos(fr, qbs[0]), pos(fr, t), vel(fr, t)
                if math.hypot(*v) >= 2.5:
                    continue
                # When he sat: the last frame before the release he was at 2.5 yd/s or more.
                sat = None
                for f in range(fr, max(HALF, fr - round(2.0 / dt)), -1):
                    if math.hypot(*vel(f, t)) >= 2.5:
                        sat = f
                        break
                A = pos(fa, t)
                elig = [i for i, x in enumerate(pl) if x['side'] == 'O' and x['group'] in ('WR', 'TE', 'RB') and i != t]
                for i, x in enumerate(pl):
                    if x['side'] != 'D' or x['group'] not in ('LB', 'DB'):
                        continue
                    D = pos(fr, i)
                    if not (0 <= D[0] <= 12) or seg(D, Q, A)[0] > 8:
                        continue
                    _, kr = seg(D, Q, R)
                    dv = vel(fr, i)
                    deeper = D[0] > R[0] + 1
                    dropping = dv[0] >= 1.0
                    carry = False
                    for o in elig:
                        P, ov = pos(fr, o), vel(fr, o)
                        if math.hypot(P[0] - D[0], P[1] - D[1]) <= 3 and math.hypot(*ov) > 2 and math.hypot(*dv) > 2:
                            c = (ov[0] * dv[0] + ov[1] * dv[1]) / (math.hypot(*ov) * math.hypot(*dv))
                            if c >= math.cos(math.radians(45)):
                                carry = True
                    satAgo = (fr - sat) * dt if sat is not None else None
                    dsp = math.hypot(*vel(sat, i)) if sat is not None and sat - HALF >= 0 else None
                    rec = dict(deeper=deeper, dropping=dropping, carry=carry, satAgo=satAgo, dsp=dsp, depth=D[0] - R[0], vdown=dv[0])
                    out['behind' if kr >= 1 else 'front'].append(rec)
                    if kr >= 1 and len(ex) < nex:
                        ex.append(f"    {p['id']} {(p.get('cell') or {}).get('coverage')} {x['group']} depth vs receiver {D[0] - R[0]:+.1f} yd, downfield speed {dv[0]:+.1f} yd/s, carry {carry}, receiver sat {satAgo if satAgo is None else round(satAgo, 1)} s before")
    print(f"settling targets: behind {len(out['behind'])}, in front {len(out['front'])} ({100 * len(out['front']) / max(1, len(out['front']) + len(out['behind'])):.0f}% in front) - {', '.join(Path(a).name for a in args)}")
    for k in ('behind', 'front'):
        r = out[k]
        if not r:
            continue
        pc = lambda f: f"{100 * sum(1 for x in r if f(x)) / len(r):.0f}%"
        print(f"  {k:6s} n {len(r):4d} | deeper than the route {pc(lambda x: x['deeper'])} | still dropping {pc(lambda x: x['dropping'])} | carrying another {pc(lambda x: x['carry'])}"
              f" | none of these {pc(lambda x: not (x['deeper'] or x['dropping'] or x['carry']))} | depth vs receiver {q([x['depth'] for x in r])} yd | downfield speed {q([x['vdown'] for x in r])} yd/s"
              f" | receiver sat {q([x['satAgo'] for x in r if x['satAgo'] is not None])} s before (never moving {pc(lambda x: x['satAgo'] is None)}) | his speed then {q([x['dsp'] for x in r if x['dsp'] is not None])} yd/s")
    for e in ex:
        print(e)


if __name__ == '__main__':
    main()
