"""Separability of #1 slant vs go by time after the snap, same operator for NFL and sim (Coverage, 2026-11-18).
For each feature and t: best single-threshold balanced accuracy (slant = larger inside value), and medians.
usage: python3 -I scripts/mechanics/slant_go_sep.py SERIES.json [...]       (from slant_go.py or slant-go.mts)
       python3 -I scripts/mechanics/slant_go_sep.py --ref scripts/mechanics/slant_go_nfl_ref.json SIM.json
--ref prints the NFL aggregate (medians and accuracy by t; the per-frame extract stays out of git) beside the sim."""
import sys, json, statistics as st
def sep(a, b):
    vals = sorted(set(a + b)); best = 0.5
    for th in vals:
        acc = 0.5 * (sum(v > th for v in a) / len(a) + sum(v <= th for v in b) / len(b))
        best = max(best, acc)
    return best
args = sys.argv[1:]
if args[:1] == ['--ref']:
    ref = json.load(open(args[1])); args = args[2:]
    print(f"== NFL reference ({ref['source']}): slant {ref['n']['slant']}, go {ref['n']['go']}")
    for r in ref['rows']:
        print(f"  {r['t']:.1f} | " + ' | '.join(f"{k} {r[k]['slant_p50']:6.1f}/{r[k]['go_p50']:6.1f} {r[k]['acc']:.2f}" for k in ('path_in', 'hips_in', 'lat_in')) + f" | depth {r['depth']['slant_p50']:.1f}/{r['depth']['go_p50']:.1f}")
for f in args:
    R = json.load(open(f)); S = [r for r in R if r['route'] in ('SLANT', 'slant')]; G = [r for r in R if r['route'] in ('GO', 'go')]
    print(f"== {f.split('/')[-1]}: slant {len(S)}, go {len(G)}")
    print("  t   | path_in med S/G  acc | hips_in med S/G  acc | lat_in med S/G  acc | depth med S/G | first t acc>=0.8/0.9 path, hips, lat")
    first = {k: [None, None] for k in ('path_in', 'hips_in', 'lat_in')}
    for k in range(16):
        line = f"  {k/10:.1f} |"
        for feat in ('path_in', 'hips_in', 'lat_in'):
            a = [r['series'][k][feat] for r in S if len(r['series']) > k]; b = [r['series'][k][feat] for r in G if len(r['series']) > k]
            if not a or not b: line += " - |"; continue
            acc = sep(a, b)
            for i, lim in enumerate((0.8, 0.9)):
                if acc >= lim and first[feat][i] is None: first[feat][i] = k / 10
            line += f" {st.median(a):6.1f}/{st.median(b):6.1f} {acc:.2f} |"
        a = [r['series'][k]['depth'] for r in S if len(r['series']) > k]; b = [r['series'][k]['depth'] for r in G if len(r['series']) > k]
        line += f" {st.median(a):5.1f}/{st.median(b):5.1f}"
        print(line)
    print('  first t with balanced accuracy >= 0.8 / 0.9:', {k: v for k, v in first.items()})
    if 'readAt' in (S[0] if S else {}):
        ra = [r['readAt'] for r in S if r['readAt'] is not None]; fa = [r for r in G if r['readAt'] is not None]
        print(f"  sim corner reader: slant read under/in in {len(ra)}/{len(S)}, median {st.median(ra) if ra else '-'} s, p25/p75 {sorted(ra)[len(ra)//4] if ra else '-'}/{sorted(ra)[3*len(ra)//4] if ra else '-'}; go misread {len(fa)}/{len(G)}")
