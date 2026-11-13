"""Compare tackle-panel runs at different hold resolutions, rep by rep.
python3 -I scripts/diag/physics/hold-refinement-compare.py REF.json OTHER.json [...]
Agreement of the ending category with the reference, and yards-after-contact
differences, overall and by angle."""
import json, sys
from collections import defaultdict


def load(path):
    d = json.load(open(path))
    return {(r['angle'], r['speed'], r['cut'], r['side'], r['seed']): r for r in d['rows']}


ref = load(sys.argv[1])
print(f'reference {sys.argv[1]}: {len(ref)} reps; endings',
      {k: sum(1 for r in ref.values() if r['ending'] == k) for k in ('tackled', 'escaped', 'censored')})
for path in sys.argv[2:]:
    other = load(path)
    keys = [k for k in ref if k in other]
    same = sum(1 for k in keys if ref[k]['ending'] == other[k]['ending'])
    gaps = sorted(abs((ref[k]['afterContact'] or 0) - (other[k]['afterContact'] or 0)) for k in keys)
    print(f'\n{path}: endings', {e: sum(1 for k in keys if other[k]['ending'] == e) for e in ('tackled', 'escaped', 'censored')},
          f'| same ending as reference {same}/{len(keys)} | after-contact gap median {gaps[len(gaps) // 2]:.2f}, p90 {gaps[int(.9 * (len(gaps) - 1))]:.2f} yd')
    by = defaultdict(lambda: [0, 0])
    for k in keys:
        by[k[0]][0] += ref[k]['ending'] == other[k]['ending']; by[k[0]][1] += 1
    print('  agreement by angle:', ', '.join(f'{a}: {s}/{n}' for a, (s, n) in sorted(by.items())))
    flips = defaultdict(int)
    for k in keys:
        if ref[k]['ending'] != other[k]['ending']:
            flips[f"{other[k]['ending']}->{ref[k]['ending']}"] += 1
    print('  disagreements (this -> reference):', dict(flips))
