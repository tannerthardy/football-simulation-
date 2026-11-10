"""The catcher's first half-second (Integration, 2026-11-10: does he get a free cut or burst right after the catch?).
Same code on NFL records (out/mechanics/nfl-plays.jsonl.gz) and sim mechanics records (sim-export.ts). The catcher is
the record's receiver, else target. From the catch frame: his speed then and 0.2 / 0.5 s later, his heading change over
0.5 s (deg), his upfield (+x) speed at +0.5 s, and the nearest defender's distance at the catch (< 3 yd = contested).
p25 / p50 / p75, all catches and contested ones.
usage: python3 -I after-catch.py <records.jsonl.gz> [...]"""
import sys, os, json, gzip, math
def pc(a, q):
    return sorted(a)[int(q * (len(a) - 1))] if a else float('nan')
for path in sys.argv[1:]:
    rows = []
    for l in gzip.open(path, 'rt'):
        p = json.loads(l)
        ev = p.get('events', {})
        if p.get('kind') != 'pass' or 'catch' not in ev:
            continue
        c = p.get('receiver', p.get('target')); X = p['xy']
        f = int(round(ev['catch'] / 0.1)); end = int(round(ev.get('end', 99) / 0.1))
        if c is None or f < 1 or f + 6 >= len(X) or f + 5 > end:
            continue
        v = lambda g: ((X[g + 1][2 * c] - X[g - 1][2 * c]) / 0.2, (X[g + 1][2 * c + 1] - X[g - 1][2 * c + 1]) / 0.2)
        v0, v2, v5 = v(f), v(f + 2), v(f + 5)
        s0, s2, s5 = math.hypot(*v0), math.hypot(*v2), math.hypot(*v5)
        turn = abs(math.degrees(math.atan2(v0[0] * v5[1] - v0[1] * v5[0], v0[0] * v5[0] + v0[1] * v5[1]))) if s0 > 0.5 and s5 > 0.5 else float('nan')
        D = [i for i, q in enumerate(p['players']) if q['side'] == 'D']
        near = min(math.dist((X[f][2 * i], X[f][2 * i + 1]), (X[f][2 * c], X[f][2 * c + 1])) for i in D)
        rows.append((s0, s2, s5, turn, v5[0], near))
    print(f"== {os.path.basename(path)}: {len(rows)} catches")
    for name, R in [('all', rows), ('contested (defender < 3 yd at the catch)', [r for r in rows if r[5] < 3])]:
        if not R:
            continue
        col = lambda k: [r[k] for r in R if not math.isnan(r[k])]
        print(f"   {name:42s} n {len(R):5d} | speed at catch {pc(col(0), .25):.2f} {pc(col(0), .5):.2f} {pc(col(0), .75):.2f} | +0.2 s {pc(col(1), .5):.2f} | +0.5 s {pc(col(2), .25):.2f} {pc(col(2), .5):.2f} {pc(col(2), .75):.2f} | heading change 0.5 s p50 {pc(col(3), .5):.0f} p75 {pc(col(3), .75):.0f} deg | upfield speed +0.5 s p50 {pc(col(4), .5):.2f}")
