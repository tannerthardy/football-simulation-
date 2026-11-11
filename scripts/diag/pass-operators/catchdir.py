"""Upfield speed and heading change after the catch, by the catcher's direction of travel at the catch. Same code on NFL
records (out/mechanics/nfl-plays.jsonl.gz) and sim mechanics records (sim-export.ts). Travel class from his velocity at the
catch (0.2 s window): 'upfield' (within 45 deg of +x), 'across' (45-135 deg: crossers, outs, drags), 'back / standing'
(more than 135 deg, i.e. coming back to the ball, or under 1.5 yd/s: hitches, curls, comebacks). Per class: share,
upfield speed at the catch and at +0.5 s p50, heading change over 0.5 s p50 / p75.
usage: python3 -I catchdir.py <records.jsonl.gz> [...]"""
import sys, os, json, gzip, math, statistics as st, collections as C
for path in sys.argv[1:]:
    R = C.defaultdict(list); n = 0
    for l in gzip.open(path, 'rt'):
        p = json.loads(l); ev = p.get('events', {})
        if p.get('kind') != 'pass' or 'catch' not in ev: continue
        c = p.get('receiver', p.get('target')); X = p['xy']
        f = int(round(ev['catch'] / 0.1)); end = int(round(ev.get('end', 99) / 0.1))
        if c is None or f < 1 or f + 6 >= len(X) or f + 5 > end: continue
        v = lambda g: ((X[g + 1][2 * c] - X[g - 1][2 * c]) / 0.2, (X[g + 1][2 * c + 1] - X[g - 1][2 * c + 1]) / 0.2)
        v0, v5 = v(f), v(f + 5); s0, s5 = math.hypot(*v0), math.hypot(*v5)
        a = abs(math.degrees(math.atan2(v0[1], v0[0]))) if s0 > 0 else 180
        k = 'back / standing' if s0 < 1.5 or a > 135 else 'upfield' if a < 45 else 'across'
        turn = abs(math.degrees(math.atan2(v0[0] * v5[1] - v0[1] * v5[0], v0[0] * v5[0] + v0[1] * v5[1]))) if s0 > 0.5 and s5 > 0.5 else None
        n += 1; R[(k, 'n')].append(1); R[(k, 'u0')].append(v0[0]); R[(k, 'u5')].append(v5[0])
        if turn is not None: R[(k, 't')].append(turn)
    print(f"== {os.path.basename(path)}: {n} catches")
    for k in ('upfield', 'across', 'back / standing'):
        m = len(R[(k, 'n')])
        if not m: continue
        t = sorted(R[(k, 't')])
        print(f"   {k:16s} {m / n:5.1%} (n {m:4d}) | upfield speed at catch p50 {st.median(R[(k, 'u0')]):+.2f} -> +0.5 s {st.median(R[(k, 'u5')]):+.2f} | heading change p50 / p75 {t[len(t) // 2]:.0f} / {t[int(.75 * (len(t) - 1))]:.0f} deg")
