"""Summarise hold-trace.mts output: break rate by approach at the wrap, break cause, and the joint's state.
Usage: python3 hold-trace.py OUT.json [OUT2.json ...]"""
import json, sys, statistics as S

def cls(b):
    return 'behind' if b > 120 else 'head-on' if b < 60 else 'angle'

def med(xs):
    return round(S.median(xs), 2) if xs else None

for path in sys.argv[1:]:
    d = json.load(open(path))
    H = [h for h in d['holds'] if not h['oneArm']]
    print(f"== {path}: {d['games']} games, env {d['env']}, holds {len(d['holds'])} ({len(d['holds']) - len(H)} one-arm engaged left out)")
    print(f"{'approach':9} {'n':>4} {'broken':>7} {'rate':>5} | med at wrap: {'dist':>5} {'hold0':>5} {'reach':>5} {'cap0':>6} {'lock0':>5} {'legs0':>5} {'cs':>4} {'ds':>4} {'sep':>5} {'along':>5} | broken: {'dur':>4} {'slip%':>5} {'holderDown%':>11}")
    for k in ['behind', 'angle', 'head-on', 'all']:
        hs = [h for h in H if k == 'all' or cls(h['at']['bearing']) == k]
        b = [h for h in hs if h['end'] == 'broken']
        if not hs: continue
        g = lambda f, xs=hs: med([f(h) for h in xs])
        print(f"{k:9} {len(hs):4} {len(b):7} {len(b)/len(hs):5.2f} | {'':13}{g(lambda h: h['at']['dist']):5} {g(lambda h: h['hold0']):5} {g(lambda h: h['jointReach']):5} {g(lambda h: h['cap0']):6} {g(lambda h: h['lock0']):5} {g(lambda h: h['legs0']):5} {g(lambda h: h['at']['cs']):4} {g(lambda h: h['at']['ds']):4} {g(lambda h: h['at']['sep']):5} {g(lambda h: h['at']['alongPath']):5} | "
              f"{'':8}{med([h['dur'] for h in b]) or 0:4} {med([h['slipTicks'] / max(1, h['ticks']) for h in b]) or 0:5} {sum(h['last']['holder'] != 'up' for h in b) / max(1, len(b)):11.2f}")
    print('origin x approach (broken/n):')
    origins = sorted({h['origin'].split('+')[0] for h in H})
    for o in origins:
        row = []
        for k in ['behind', 'angle', 'head-on']:
            hs = [h for h in H if h['origin'].split('+')[0] == o and cls(h['at']['bearing']) == k]
            row.append(f"{k} {sum(h['end'] == 'broken' for h in hs)}/{len(hs)}")
        print(f"  {o:7} " + '  '.join(row))
    print('ends:', {e: sum(h['end'] == e for h in H) for e in ['broken', 'released', 'whistle']},
          'causes:', {c: sum(h.get('cause') == c for h in H) for c in ['slid', 'other']})
