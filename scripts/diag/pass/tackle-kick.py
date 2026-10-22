"""Tackle kick and the edge rusher's depth over a dropback, NFL vs sim.

Same code for both sources (scripts/mechanics export format). For each pass
play: the two tackles (outermost OL at the snap) and, for each, the edge
rusher (the defender aligned outside him on his side within 3 yd of the line,
nearest to him). Depth = yards behind the line (offense backfield +). Reports
medians at 0.5 s steps until the throw/sack/end, and the depth by which the
rusher is past the tackle.

Usage: python3 -I scripts/diag/pass/tackle-kick.py NFL.jsonl.gz SIM.jsonl.gz
"""
import gzip, json, statistics as st, sys

def plays(fn):
    with gzip.open(fn, 'rt') as f:
        for line in f:
            r = json.loads(line)
            if r.get('kind') == 'pass':
                yield r

def measure(fn):
    T = [0.5, 1.0, 1.5, 2.0, 2.5]
    out = {t: {'kD': [], 'rD': [], 'past': [], 'kW': [], 'rW': []} for t in T}
    n = 0
    for r in plays(fn):
        ev = r.get('events', {})
        if ev.get('play_action') is not None or r.get('cell', {}).get('playAction'):
            continue
        end = min(v for k, v in ev.items() if k in ('pass_forward', 'sack', 'qb_sack', 'end', 'run', 'scramble') and v is not None) if ev else None
        xy, P, by = r['xy'], r['players'], r['ball_y']
        if len(xy) < 6: continue
        f0 = xy[0]
        X = lambda f, i: f[2 * i]
        Y = lambda f, i: f[2 * i + 1]
        ol = [i for i, p in enumerate(P) if p['side'] == 'O' and p['group'] == 'OL']
        dfn = [i for i, p in enumerate(P) if p['side'] == 'D']
        if len(ol) < 5: continue
        n += 1
        for side in (-1, 1):
            tk = max(ol, key=lambda i: side * (Y(f0, i) - by))
            cands = [i for i in dfn if side * (Y(f0, i) - Y(f0, tk)) > -0.5 and abs(X(f0, i)) < 3 and side * (Y(f0, i) - Y(f0, tk)) < 5]
            if not cands: continue
            ru = min(cands, key=lambda i: abs(Y(f0, i) - Y(f0, tk)) + abs(X(f0, i)))
            for t in T:
                k = round(t / r['dt'])
                if k >= len(xy) or (end is not None and t > end): continue
                f = xy[k]
                kD, rD = -X(f, tk), -X(f, ru)
                out[t]['kD'].append(kD); out[t]['rD'].append(rD); out[t]['past'].append(rD - kD)
                out[t]['kW'].append(side * (Y(f, tk) - by)); out[t]['rW'].append(side * (Y(f, ru) - by))
    return n, out

res = [measure(fn) for fn in sys.argv[1:3]]
print('dropbacks', [r[0] for r in res])
print(f"{'t':>4} {'tackle depth':>14} {'rusher depth':>14} {'rusher past':>14} {'tackle width':>14} {'rusher width':>14}   (NFL / sim medians, n)")
for t in res[0][1]:
    cells = []
    for k in ('kD', 'rD', 'past', 'kW', 'rW'):
        a, b = res[0][1][t][k], res[1][1][t][k]
        cells.append(f"{st.median(a) if a else float('nan'):5.2f}/{st.median(b) if b else float('nan'):5.2f}")
    print(f"{t:4.1f} " + ' '.join(f'{c:>14}' for c in cells) + f"   n {len(res[0][1][t]['kD'])}/{len(res[1][1][t]['kD'])}")
