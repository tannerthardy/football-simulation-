"""Summarize zone-lab runs: outcome by concept/direction, first-contact
defender, contact depth, handoff and RB timing.
python -I scripts/diag/zone-lab/summary.py 'out/zone-lab/base-*.jsonl.gz' [--by look|roster|formation]"""
import glob, gzip, json, sys, statistics as st
from collections import Counter, defaultdict
pat = sys.argv[1]; by = sys.argv[sys.argv.index('--by') + 1] if '--by' in sys.argv else None
rows = [json.loads(l) for f in sorted(glob.glob(pat)) for l in gzip.open(f, 'rt')]
err = [r for r in rows if 'error' in r]
rows = [r for r in rows if 'error' not in r]
def rbcross(r):
    if not r.get('frames'): return None
    for f in r['frames']:
        p = f['p'][r['rbIdx']]
        if (p[0] - r['los']) * r['adir'] > 0: return f['t']
    return None
def q(v, p): v = sorted(v); return v[int(p * (len(v) - 1))] if v else float('nan')
def line(name, g):
    gains = [r['gain'] for r in g]; cg = [r['contactGain'] for r in g if r['contactGain'] is not None]
    hand = [r['handoff'] for r in g if r['handoff'] is not None]; cr = [x for x in (rbcross(r) for r in g) if x is not None]
    fc = Counter(((r.get('firstContact') or {}).get('by') or '-').split('_')[0] for r in g)
    print(f"{name:22s} n={len(g):4d} mean {st.mean(gains):5.2f} med {st.median(gains):5.2f} p25 {q(gains,.25):5.2f} p75 {q(gains,.75):5.2f} "
          f"4+ {sum(x>=4 for x in gains)/len(g):4.0%} neg {sum(x<0 for x in gains)/len(g):4.0%} 10+ {sum(x>=10 for x in gains)/len(g):4.0%} | "
          f"contact {st.median(cg) if cg else float('nan'):5.2f} | hand {st.median(hand) if hand else float('nan'):.2f} LOS {st.median(cr) if cr else float('nan'):.2f} | "
          + ' '.join(f"{k}:{v}" for k, v in fc.most_common(5)))
groups = defaultdict(list)
for r in rows: groups[(r['concept'], r['dir']) + ((r[by],) if by else ())].append(r)
for k in sorted(groups): line('/'.join(map(str, k)), groups[k])
for c in ('iz', 'oz', 'wz'):
    g = [r for r in rows if r['concept'] == c]
    if g: line(c + ' all', g)
line('ALL', rows)
if err: print('errors', len(err), err[0]['error'][:200])
