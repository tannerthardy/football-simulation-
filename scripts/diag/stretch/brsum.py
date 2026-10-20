"""Compact the branch census: keep the last two path elements per branch,
merge, and print the top categories per group for achieved and request events.
usage: brsum.py BRANCHES_OUTPUT.txt ["achieved pulse,achieved wobble"]"""
import re, sys
from collections import defaultdict
group, kind, sec = None, None, {}
data = defaultdict(lambda: defaultdict(float)); tot = {}
short = lambda p: ' > '.join(p.split(' > ')[-2:])
for line in open(sys.argv[1]):
    m = re.match(r'== (.+): (\d+) s observed', line)
    if m: group = m.group(1); sec[group] = float(m.group(2)); continue
    m = re.match(r'  (request|achieved) (pulse|wobble): ([\d.]+)/s, (\d+)% at a branch switch', line)
    if m: kind = f"{m.group(1)} {m.group(2)}"; tot[(group, kind)] = (float(m.group(3)), int(m.group(4))); continue
    m = re.match(r'\s+([\d.]+)/s  (within|switch) (.+)', line)
    if m:
        rate, how, path = float(m.group(1)), m.group(2), m.group(3).strip()
        cat = f"within {short(path)}" if how == 'within' else 'switch ' + ' => '.join(short(p) for p in path.split(' => '))
        data[(group, kind)][cat] += rate
want = sys.argv[2].split(',') if len(sys.argv) > 2 else ['achieved pulse', 'achieved wobble', 'request pulse', 'request wobble']
for g in sec:
    print(f"== {g}")
    for k in want:
        if (g, k) not in tot: continue
        r, sw = tot[(g, k)]
        print(f"  {k} {r:.2f}/s ({sw}% switch)")
        for c, x in sorted(data[(g, k)].items(), key=lambda e: -e[1])[:6]: print(f"    {x:.3f} {c[:170]}")
