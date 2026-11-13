"""Flight table: NFL (nfl_flight.py JSON) vs sim (sim-flight.ts JSONL), same operator: time from the throw to the ball
at the hands, binned by thrower-to-catch distance (5-yd bins to 40+) and split by air yards. p25/p50/p75 and n;
release speed p50; and the current naturalFlight(d) at the bin's median distance for an average arm.
   python3 -I scripts/diag/flight/flight_table.py out/flight/nfl.json out/flight/sim-*.jsonl
"""
import json, sys
nfl = json.load(open(sys.argv[1])); sim = [json.loads(l) for f in sys.argv[2:] for l in open(f) if l.strip()]
def q(v):
    v = sorted(v); n = len(v)
    return f"{v[n//4]:.2f}/{v[n//2]:.2f}/{v[3*n//4]:.2f} n{n}" if n >= 4 else (f"n{n}" if n else '-')
def med(v): v = sorted(x for x in v if x is not None); return f"{v[len(v)//2]:.1f}" if v else '-'
nat = lambda d: 0.38 + 0.022 * d + 0.00065 * d * d
def b(d): return min(8, int(d // 5))
lab = lambda i: f"{i*5}-{i*5+5}" if i < 8 else '40+'
splits = [('all', lambda a: True), ('air<0', lambda a: a < 0), ('air 0-10', lambda a: 0 <= a < 10), ('air 10-20', lambda a: 10 <= a < 20), ('air 20+', lambda a: a >= 20)]
for name, f in splits:
    print(f"\n### {name}\n| dist (yd) | NFL T p25/p50/p75 | sim T p25/p50/p75 | NFL v0 p50 | sim v0 p50 | naturalFlight(mid) |\n|---|---|---|---|---|---|")
    for i in range(9):
        N = [r for r in nfl if b(r['dist']) == i and f(r['air'])]; S = [r for r in sim if b(r['dist']) == i and f(r['air'])]
        if not N and not S: continue
        md = sorted(r['dist'] for r in N + S); m = md[len(md)//2]
        print(f"| {lab(i)} | {q([r['T'] for r in N])} | {q([r['T'] for r in S])} | {med([r['v0'] for r in N])} | {med([r['v0'] for r in S])} | {nat(m):.2f} |")
