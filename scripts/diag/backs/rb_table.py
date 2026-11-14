"""RB targets, NFL (nfl_rb_targets.py) vs sim (rb-targets.ts): the back's targets by route (share of RB targets),
throw time after the snap, nearest defender to the back at the throw and how much deeper he is, alignment width, and
(sim) the QB's read index at the throw and where the back sat in his read order.
   python3 -I scripts/diag/backs/rb_table.py out/backs/nfl.json out/backs/sim.jsonl"""
import json, sys, collections
def q(v, f='{:.1f}'):
    v = sorted(x for x in v if x is not None); return '-' if len(v) < 5 else '/'.join(f.format(v[int(p * (len(v) - 1))]) for p in (.25, .5, .75))
N = json.load(open(sys.argv[1]))['rows']
S = [json.loads(l) for l in open(sys.argv[2])]
passes = len(S); thrown = [r for r in S if not r.get('noThrow')]
rb = [r for r in thrown if r['pos'] in ('RB', 'FB')]
print(f"sim: {passes} pass plays, {len(thrown)} targeted, RB targets {len(rb)} ({100 * len(rb) / max(1, len(thrown)):.1f}% of targets)")
print(f"NFL: RB targets {len(N)} (weeks 1-3 completions and incompletions with tracking)")
print('\n## NFL RB targets by routeRan')
for route, n in collections.Counter(r['route'] for r in N).most_common():
    X = [r for r in N if r['route'] == route]
    print(f"| {route:8} | {n:4} ({100 * n / len(N):4.1f}%) | throw {q([r['tThrow'] for r in X])} s | nearest at throw {q([r['nearD'] for r in X])} yd, deeper {q([r['nearDeeper'] for r in X])} | caught {100 * sum(r['caught'] for r in X) / n:.0f}% | catch width {q([r['catchW'] for r in X])}, depth {q([r['catchD'] for r in X])} |")
print('\n## Sim RB targets by route')
for route, n in collections.Counter(r['route'] for r in rb).most_common():
    X = [r for r in rb if r['route'] == route]
    pos = [r['reads'].index(next(x for x in r['reads'] if x.startswith('RB:'))) if any(x.startswith('RB:') for x in r['reads']) else None for r in X]
    print(f"| {route:12} | {n:4} ({100 * n / len(rb):4.1f}%) | throw {q([r['t'] for r in X])} s | nearest at throw {q([r['nearD'] for r in X])} yd, deeper {q([r['nearDeeper'] for r in X])} | caught {100 * sum(r['caught'] for r in X) / n:.0f}% | RB's place in the order {collections.Counter(pos).most_common(4)} | read index at throw {collections.Counter(r['readIdx'] for r in X).most_common(5)} |")
F = [r for r in rb if r['route'] == 'back_flat']
if F:
    print('\n## back_flat: what he came through first (reads before the back, by route family)')
    before = collections.Counter()
    for r in F:
        i = next((k for k, x in enumerate(r['reads']) if x.startswith('RB:')), None)
        for x in (r['reads'][:i] if i is not None else []): before[x.split(':')[1]] += 1
    print('  ', before.most_common(10))
    print('  nearest defender to the back at the throw, by position:', collections.Counter(r['nearPos'] for r in F).most_common(5))
    print('  throw time by read index:', {k: q([r['t'] for r in F if r['readIdx'] == k]) for k in sorted({r['readIdx'] for r in F if r['readIdx'] is not None})})
