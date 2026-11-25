"""How much forward acceleration a player keeps while he is turning (Tools, 2026-11-16, for Integration's straight-sprint question).

locomotionAccel takes forward drive and lateral (cutting) acceleration as an ellipse, (a_t / At)^2 + (a_n / An)^2 <= 1, so a request that turns hard spends the forward drive.
This measures the upper envelope of the same two quantities on tracking: for players moving 3.5 to 5 yd/s, forward acceleration a_t (along velocity) and normal acceleration a_n
(across it), from the 10 Hz positions (velocity = centred difference over +-0.1 s, acceleration = centred difference of that over +-0.1 s). For each |a_n| bin the p50, p90 and p99 of a_t.
An ellipse with At near the straight-line drive predicts the p99 of a_t falling to zero at |a_n| = An; a weaker coupling keeps a_t high as |a_n| rises.

usage: python3 -I accel_turn_envelope.py name=plays.jsonl.gz [name=plays.jsonl.gz ...]   (the common play format; offence attacks +x; defenders and offence alike, one row per player per frame)
"""
import sys, gzip, json, math
def jl(p):
    for l in gzip.open(p, 'rt'): yield json.loads(l)
BINS = [(0, 1.5), (1.5, 3), (3, 4.5), (4.5, 6), (6, 8), (8, 99)]
LO, HI = 3.5, 5.0
def run(path, pos=None):
    rows = [[] for _ in BINS]; plays = 0
    for P in jl(path):
        xy = P['xy']; dt = P['dt']; n = len(xy); plays += 1
        np_ = len(P['players'])
        for j in range(np_):
            if pos and P['players'][j].get('side') not in pos: continue
            def at(f):
                x, y = xy[f][2 * j], xy[f][2 * j + 1]
                return None if x is None or y is None else (x, y)
            def vel(f):
                a, b = at(f - 1), at(f + 1)
                return None if a is None or b is None else ((b[0] - a[0]) / (2 * dt), (b[1] - a[1]) / (2 * dt))
            for f in range(3, n - 3):
                v = vel(f); v1, v0 = vel(f + 1), vel(f - 1)
                if v is None or v1 is None or v0 is None: continue
                s = math.hypot(*v)
                if not (LO <= s <= HI): continue
                ax, ay = (v1[0] - v0[0]) / (2 * dt), (v1[1] - v0[1]) / (2 * dt)
                at_ = (ax * v[0] + ay * v[1]) / s; an = (-ax * v[1] + ay * v[0]) / s
                for k, (lo, hi) in enumerate(BINS):
                    if lo <= abs(an) < hi: rows[k].append(at_); break
    return rows, plays
def q(v, p):
    v = sorted(v); return v[min(len(v) - 1, int(p * (len(v) - 1) + .5))] if v else float('nan')
for spec in sys.argv[1:]:
    name, path = spec.split('=', 1)
    rows, plays = run(path)
    print(f'== {name}: {plays} plays; players moving {LO}-{HI} yd/s; forward acceleration a_t (yd/s^2) by |normal acceleration| a_n (yd/s^2)')
    print('   |a_n|      n       p50     p90     p99')
    for (lo, hi), r in zip(BINS, rows):
        print(f'   {lo:>3}-{hi if hi < 99 else "+":<4} {len(r):>8}  {q(r, .5):6.2f}  {q(r, .9):6.2f}  {q(r, .99):6.2f}')
