"""Deep-ball completion by separation at the throw and by flight time, from deep-window.ts output (sim), in the bins of
nfl_deep_completion.py / nfl_deep_arrival.py (NFL GO family = GO + POST). Sim deep = target route go, seam, post, fade.
Run: python3 -I deep_table.py a.jsonl [b.jsonl ...]"""
import json, sys
R = [json.loads(l) for f in sys.argv[1:] for l in open(f) if l.strip()]
T = [r for r in R if r.get('thr')]
DEEP = ('go', 'seam', 'post', 'fade')
deep = [r for r in T if any(k in (r['thr']['target'] or '').split(':')[-1] for k in DEEP)]
pct = lambda a, b: f'{100*a/b:.0f}%' if b else '-'
print(f'targeted throws {len(T)}; deep family {len(deep)} = {pct(len(deep), len(T))}')
print('\n| sep at throw | n | comp | INT |  | flight s | n | comp | INT |\n|---|---|---|---|---|---|---|---|---|')
SB = [('<1', 0, 1), ('1-2', 1, 2), ('2-3', 2, 3), ('3-5', 3, 5), ('5+', 5, 99)]
FB = [('<0.8', 0, .8), ('0.8-1.2', .8, 1.2), ('1.2-1.8', 1.2, 1.8), ('1.8-2.5', 1.8, 2.5), ('2.5+', 2.5, 99)]
for (sl, a, b), (fl, c, d) in zip(SB + [('all', -1, 999)], FB + [('all', -1, 999)]):
    s = [r for r in deep if a <= r['thr']['sep'] < b]; f = [r for r in deep if r['thr']['flight'] is not None and c <= r['thr']['flight'] < d]
    print(f"| {sl} | {len(s)} | {pct(sum(r['caught'] for r in s), len(s))} | {pct(sum(r['int'] for r in s), len(s))} |  | {fl} | {len(f)} | {pct(sum(r['caught'] for r in f), len(f))} | {pct(sum(r['int'] for r in f), len(f))} |")
s = sorted(r['thr']['sep'] for r in deep)
if s: print(f"\nsep p25/p50/p75 {s[len(s)//4]:.2f}/{s[len(s)//2]:.2f}/{s[3*len(s)//4]:.2f} (NFL GO family 1.17/1.80/3.01)")

import os
if os.environ.get('DEEP_TRACE'):
    # Covered (< 2 yd at the throw) deep completions, with their line number in the input (game order, play order).
    rows = [(f, i, json.loads(l)) for f in sys.argv[1:] for i, l in enumerate(open(f)) if l.strip()]
    for f, i, r in rows:
        t = r.get('thr')
        if t and any(k in (t['target'] or '').split(':')[-1] for k in DEEP) and t['sep'] < 2 and r['caught']:
            print(f"   trace {os.path.basename(f)}:{i + 1} {r['concept']} {t['target']} thrown {t['t']} s sep {t['sep']} depth {t['depth']} flight {t['flight']}")
