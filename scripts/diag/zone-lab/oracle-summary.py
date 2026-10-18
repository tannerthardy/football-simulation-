"""Oracle headroom: actual gain vs the best forced entry, per concept.
python -I scripts/diag/zone-lab/oracle-summary.py 'out/zone-lab/oracle-*.jsonl.gz'"""
import glob, gzip, json, sys, statistics as st
from collections import defaultdict
rows = [json.loads(l) for f in sorted(glob.glob(sys.argv[1])) for l in gzip.open(f, 'rt')]
by = defaultdict(list)
for r in rows: by[r['concept']].append(r); by['all'].append(r)
for k, g in by.items():
    act = [r['actual'] for r in g]; best = [max(b['gain'] for b in r['branches']) for r in g]
    med = [st.median(b['gain'] for b in r['branches']) for r in g]
    bestlat = [max(r['branches'], key=lambda b: b['gain'])['lat'] for r in g]
    nogood = sum(b < 2 for b in best)
    print(f"{k:4s} n={len(g)} actual med {st.median(act):.2f} mean {st.mean(act):.2f} | best-branch med {st.median(best):.2f} mean {st.mean(best):.2f} | "
          f"typical-branch med {st.median(med):.2f} | best<2yd {nogood/len(g):.0%} | actual within 1 yd of best {sum(b-a<1 for a,b in zip(act,best))/len(g):.0%}")
    hist = defaultdict(int)
    for l in bestlat: hist[l] += 1
    print('      best lateral entry (play-side +):', ' '.join(f'{l:+d}:{hist[l]}' for l in sorted(hist)))
