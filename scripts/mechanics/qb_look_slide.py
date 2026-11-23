#!/usr/bin/env python3
"""Underneath zone defenders' lateral slide toward the throw against the time since the QB came to the throw side
(Coverage, 2026-11-18). Common-format plays with 'o' (NFL adapter; sim with EXPORT_FACING=1).

The QB's orientation (his body: NFL 'o', sim body.facing; the sim's look/head is not in the replay) "on the throw
side" = within 25 deg of his bearing to the catch point (the target at the arrival: a measuring frame, not a cue).
"Came to it" = the start of the last unbroken run of such frames ending at the release. Per underneath LB/DB (0-12 yd
deep, within 8 yd of the true line): his lateral velocity toward the catch side (+/-0.2 s central difference) at the
release, bucketed by how long the QB had been on that side; and his lateral velocity 0 / 0.2 / 0.4 s after the QB came
to it (frames before the release only).

    python3 -I scripts/mechanics/qb_look_slide.py plays.jsonl.gz [...]
"""
import gzip, json, math, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from metrics import coverage_family  # noqa: E402
from lane_position import seg, q, HALF  # noqa: E402

ON = 25.0


def main():
    for path in [a for a in sys.argv[1:] if a.endswith('.gz')]:
        buckets, after = {}, {0.0: [], 0.2: [], 0.4: []}
        nplays = noo = 0; came = []
        with gzip.open(path, 'rt') as fh:
            for line in fh:
                p = json.loads(line); ev = p.get('events', {})
                if p.get('kind') != 'pass' or p.get('target') is None or 'pass_forward' not in ev or 'pass_arrived' not in ev:
                    continue
                if coverage_family((p.get('cell') or {}).get('coverage')) != 'zone':
                    continue
                if not p.get('o'):
                    noo += 1; continue
                dt, xy, pl, o = p['dt'], p['xy'], p['players'], p['o']; n = len(xy)
                fr, fa = round(ev['pass_forward'] / dt), round(ev['pass_arrived'] / dt)
                if fr - 25 < 0 or fr + HALF >= n or fa >= n or fr >= len(o):
                    continue
                pos = lambda f, i: (xy[f][2 * i], xy[f][2 * i + 1])
                vy = lambda f, i: (pos(f + HALF, i)[1] - pos(f - HALF, i)[1]) / (2 * HALF * dt)
                qbs = [i for i, x in enumerate(pl) if x['side'] == 'O' and x['group'] == 'QB']
                if not qbs:
                    continue
                qb = qbs[0]; t = p['target']; A = pos(fa, t); Q = pos(fr, qb)
                def on(f):
                    P = pos(f, qb); b = math.degrees(math.atan2(A[1] - P[1], A[0] - P[0]))
                    return abs((o[f][qb] - b + 180) % 360 - 180) <= ON
                if not on(fr):
                    k0 = None
                else:
                    k0 = fr
                    while k0 - 1 >= 0 and on(k0 - 1):
                        k0 -= 1
                nplays += 1
                since = None if k0 is None else (fr - k0) * dt
                came.append(since)
                for i, x in enumerate(pl):
                    if x['side'] != 'D' or x['group'] not in ('LB', 'DB'):
                        continue
                    D = pos(fr, i)
                    if not (0 <= D[0] <= 12) or seg(D, Q, A)[0] > 8:
                        continue
                    sgn = 1 if A[1] >= D[1] else -1
                    lat = vy(fr, i) * sgn
                    b = 'not on the side at the release' if since is None else '0-0.2 s' if since < 0.2 else '0.2-0.4 s' if since < 0.4 else '0.4-0.8 s' if since < 0.8 else '0.8 s+'
                    buckets.setdefault(b, []).append(lat)
                    if k0 is not None:
                        for kk in after:
                            f = k0 + round(kk / dt)
                            if f <= fr and f - HALF >= 0:
                                after[kk].append(vy(f, i) * (1 if A[1] >= pos(f, i)[1] else -1))
        c = [x for x in came if x is not None]
        print(f'{Path(path).name}: zone throws {nplays} (no orientation {noo}); QB on the throw side at the release {len(c)} ({100 * len(c) / max(1, nplays):.0f}%), for {q(c)} s before it')
        for b in ('0-0.2 s', '0.2-0.4 s', '0.4-0.8 s', '0.8 s+', 'not on the side at the release'):
            v = buckets.get(b, [])
            if v:
                print(f'  QB on the throw side for {b:32s} n {len(v):5d} | defender lateral toward the throw at the release {q(v)} yd/s')
        print('  after the QB came to the throw side (pre-release frames): ' + ' | '.join(f'+{k:.1f} s n {len(v)} {q(v)}' for k, v in after.items()))


if __name__ == '__main__':
    main()
