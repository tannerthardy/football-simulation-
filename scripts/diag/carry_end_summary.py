#!/usr/bin/env python3
"""Summarize scripts/diag/carry-end-probe.ts rows: how carries end after first contact.
    python3 -I scripts/diag/carry_end_summary.py <rows.jsonl>...
Same operator for every arm (event carrier_contact to the end of the carry); its
timing differs slightly from run_film_reference.py's, so compare arms with it and
NFL with that script."""
import collections as C, json, sys


def q(v, p):
    v = sorted(v)
    return round(v[int(p * (len(v) - 1))], 2)


R = [json.loads(l) for path in sys.argv[1:] for l in open(path)]
R = [r for r in R if r['tc'] and r['end']]
k = C.Counter()
for r in R:
    e, f = r['end'], r['fall']
    fell = e['state'] in ('falling', 'down') and f and f['t'] >= r['tc']['t'] - .05
    r['k'] = 'fall:' + f['cause'] if fell else 'stall' if e['stalled'] >= .75 else 'other'
    k[r['k']] += 1
a = [r['end']['x'] - r['tc']['x'] for r in R]
d = [r['end']['t'] - r['tc']['t'] for r in R]
print(f"n={len(R)} live@0.8 {sum(x > .8 for x in d) / len(d):.2f} live@1.0 {sum(x > 1 for x in d) / len(d):.2f}"
      f" contact->end median {q(d, .5)} s | yards after contact p25/50/75/90 {q(a, .25)}/{q(a, .5)}/{q(a, .75)}/{q(a, .9)}"
      f" mean {sum(a) / len(a):.2f} share>=10 {sum(x >= 10 for x in a) / len(a):.3f} | ends {dict(k)}")
J = [j for r in R if r['k'] == 'fall:legs' for j in r['fall'].get('joints', [])]
if J:
    m = lambda v: round(sorted(v)[len(v) // 2], 2)
    print(f"legs falls: {k['fall:legs']}, holds on him {len(J)}: legs share at grasp {m([j['legs0'] for j in J])},"
          f" at the fall {m([j['legs'] for j in J])}; arm span at grasp {m([j['hold0'] for j in J])}, at the fall {m([j['hold'] for j in J])};"
          f" hold age {m([j['age'] for j in J])} s; holder up {sum(j['holderUp'] == 'up' for j in J)}")
