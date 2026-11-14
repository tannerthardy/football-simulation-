"""QB lane, 2026-11-14: what a receiver catches, for the quarterback's accuracy belief. Reads catch-radius.ts rows
(every targeted pass: the miss between where the ball comes down and where it was aimed, the flight time, the nearest
defender's distance to where it comes down at the arrival, caught or not).
The belief's form to be fitted (one learned number each, nothing else):
    catchable radius = R0 + K x flight time - C x max(0, D0 - defender's distance to the ball)
  K: how much error a receiver takes up per second of flight (he adjusts his line to the ball);
  C, D0: the defender's claim on the same ball (a defender nearer than D0 takes that much of the radius away).
This script prints the curve that form has to match: catch rate by miss and flight time, and by the defender's
distance, and for each flight bin the miss at which the catch rate falls to half its rate on an accurate ball.
   python3 -I catch_fit_table.py name=rows1.jsonl,rows2.jsonl ..."""
import json, sys
pc = lambda a, b: f"{100 * a / b:3.0f}%" if b else '  - '
MISS = ((0, 1), (1, 2), (2, 3), (3, 5), (5, 99)); FLY = ((0, 0.8), (0.8, 1.3), (1.3, 2.0), (2.0, 9)); DEF = ((0, 1.5), (1.5, 3), (3, 99))
for arg in sys.argv[1:]:
    name, paths = arg.split('=', 1); R = [json.loads(l) for p in paths.split(',') for l in open(p) if l.startswith('{')]
    R = [r for r in R if r.get('atArr')]
    print(f"== {name}: targeted passes {len(R)}; caught {pc(sum(r['caught'] for r in R), len(R))}; miss p50 {sorted(r['miss'] for r in R)[len(R) // 2]:.1f} yd")
    print('   caught, by miss (rows) and flight time (columns ' + ', '.join(f"{a}-{b} s" for a, b in FLY) + '); n in brackets')
    half = {}
    for lo, hi in MISS:
        cells = []
        for a, b in FLY:
            S = [r for r in R if lo <= r['miss'] < hi and a <= r['T'] < b]; cells.append(f"{pc(sum(r['caught'] for r in S), len(S))} ({len(S):3d})")
        print(f"     miss {lo}-{hi if hi < 99 else '+'} yd: " + '  '.join(cells))
    for a, b in FLY:
        S = [r for r in R if a <= r['T'] < b]; base = [r for r in S if r['miss'] < 1]
        if len(base) < 15: continue
        b0 = sum(r['caught'] for r in base) / len(base); h = None
        for m in [x / 2 for x in range(2, 20)]:
            W = [r for r in S if m - 0.75 <= r['miss'] < m + 0.75]
            if len(W) >= 8 and sum(r['caught'] for r in W) / len(W) <= 0.5 * b0: h = m; break
        half[(a, b)] = (b0, h)
    print('   miss at which the catch rate is half its rate on an accurate ball: ' + '; '.join(f"{a}-{b} s: {('%.1f yd' % h) if h else 'not reached'} (accurate {100 * b0:.0f}%)" for (a, b), (b0, h) in half.items()))
    print('   caught, by miss (rows) and the nearest defender to where the ball comes down (columns ' + ', '.join(f"{a}-{b if b < 99 else '+'} yd" for a, b in DEF) + ')')
    for lo, hi in MISS[:4]:
        cells = []
        for a, b in DEF:
            S = [r for r in R if lo <= r['miss'] < hi and a <= r['atArr']['defToBall'] < b]; cells.append(f"{pc(sum(r['caught'] for r in S), len(S))} ({len(S):3d})")
        print(f"     miss {lo}-{hi} yd: " + '  '.join(cells))
