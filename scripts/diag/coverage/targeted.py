"""Targeted-by-#N table from a match-declare.mts output: per concept and target number, completions/attempts, yd/att, INT.
   python3 -I scripts/diag/coverage/targeted.py off.json on.json"""
import json, sys, collections
runs = [json.load(open(p)) for p in sys.argv[1:]]
keys = sorted({(x['concept'], x.get('num')) for r in runs for x in r if x['att']}, key=lambda k: (k[0], str(k[1])))
def cell(r, k):
    xs = [x for x in r if x['att'] and (x['concept'], x.get('num')) == k]
    if not xs: return '-'
    return '%d/%d %5.1f i%d' % (sum(x['comp'] for x in xs), len(xs), sum(x['yards'] for x in xs) / len(xs), sum(x['int'] for x in xs))
for k in keys: print('%-12s %-4s' % (k[0], k[1]), ' | '.join('%-16s' % cell(r, k) for r in runs))
for r in runs:
    a = [x for x in r if x['att']]
    print('all %d/%d %.2f yd/att, INT %d' % (sum(x['comp'] for x in a), len(a), sum(x['yards'] for x in a) / len(a), sum(x['int'] for x in a)))
