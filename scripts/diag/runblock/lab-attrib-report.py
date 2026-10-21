"""Stuffs and their stoppers on lab-attrib output: by scheme, the stopper's
first owner (blocker slot/kind) and how his last block ended.
usage: lab-attrib-report.py LABEL=out/run-attrib/x.json [...]"""
import json, sys
from collections import Counter, defaultdict
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1)
    rows = json.load(open(path)); n = len(rows)
    by = defaultdict(list)
    for r in rows: by[r['scheme']].append(r)
    print(f"== {label} n={n} stuff(<=1) {sum(r['yards']<=1 for r in rows)/n:.3f}")
    for s, rs in sorted(by.items()):
        st = [r for r in rs if r['yards'] <= 1 and 'contact' in r]
        print(f"  {s:12} n={len(rs)} stuff {len(st)/len(rs):.2f}")
        print("    end of stopper's block: " + ', '.join(f"{k} {v}" for k, v in Counter(r['contact']['endWhy'] for r in st).most_common()))
        print('    stopper/owner: ' + ', '.join(f"{k} {v}" for k, v in Counter(f"{r['contact']['stopper']}<-{(r['contact']['owner'] or {}).get('slot','-')}:{(r['contact']['owner'] or {}).get('kind','-')}" for r in st).most_common(8)))
        gaps = sorted(r['contact']['gap'] for r in st if r['contact'].get('gap') is not None)
        if gaps: print(f"    released->contact gap p25/50/75 {gaps[len(gaps)//4]} {gaps[len(gaps)//2]} {gaps[3*len(gaps)//4]}")
