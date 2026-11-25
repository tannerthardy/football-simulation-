#!/usr/bin/env python3
"""Render the table fragments of docs/reviews/2026-11-25-flag-inventory.md from data/reviews/flags/flag-inventory.json."""
import json, collections, sys
o = json.load(open('data/reviews/flags/flag-inventory.json'))
refs = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else {}
def tab(h, rows): return '\n'.join(['| ' + ' | '.join(h) + ' |', '|' + '---|' * len(h)] + ['| ' + ' | '.join(str(c) for c in r) + ' |' for r in rows])
L = lambda c: [b for b in o if b['class'] == c]
A, B, C, D, E = (L(x) for x in 'ABCDE')
def tot(l, k): return sum(int(b[k]) for b in l)
def code(l): return sum(refs.get(b['flag'], {}).get('code', 0) for l2 in [l] for b in l2)
def decl(l): return sum(refs.get(b['flag'], {}).get('decldoc', 0) for b in l)
rows = []
for nm, l in (('A', A), ('B', B), ('C', C), ('D', D), ('E', E)):
    rows.append((nm, len(l), tot(l, 'sites'), code(l), tot(l, 'offlines'), decl(l)))
print('SUMMARY'); print(tab(['class', 'flags', 'read sites', 'code lines naming the flag', 'lines only an off arm (rough)', 'declaration comment lines'], rows))
print('\nBYDAY'); c = collections.Counter(b['date'] for b in B)
print(tab(['date landed on develop', 'flags'], sorted(c.items())))
print('\nA_SPLIT')
print(tab(['group', 'flags', 'code lines', 'off-arm lines'], [
    ('on in the stack at the 2026-11-09 promotion (run-ref-4)', len([b for b in A if b['engine'] != 'pre-stack']), code([b for b in A if b['engine'] != 'pre-stack']), tot([b for b in A if b['engine'] != 'pre-stack'], 'offlines')),
    ('on before the stack existed, never listed in it', len([b for b in A if b['engine'] == 'pre-stack']), code([b for b in A if b['engine'] == 'pre-stack']), tot([b for b in A if b['engine'] == 'pre-stack'], 'offlines'))]))
print('\nC')
print(tab(['flag', 'last commit touching its read', 'status (FLAGS.md)', 'stale open PR'], [(b['flag'], b['last_src'], b['status'][:70].replace('|', '/'), b.get('stale_pr', '')) for b in sorted(C, key=lambda b: b['last_src'].split()[-1])]))
print('\nD')
print(tab(['flag', 'live because', 'last commit touching its read'], [(b['flag'], b['why'], b['last_src']) for b in D]))
print('\nE')
print(tab(['flag', 'read form', 'in the stack numeric section', 'file'], [(b['flag'], b['form'], 'yes' if b['stack'] == 'numeric' else 'no', b['file']) for b in E]))
