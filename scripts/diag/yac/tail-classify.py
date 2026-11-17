import json, glob, sys
from collections import Counter, defaultdict
R = [r for p in sorted(glob.glob(sys.argv[1] + '/cover*.json')) for r in json.load(open(p))]
mean = lambda v: sum(v) / len(v) if v else float('nan')
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
cats = defaultdict(list); detail = []
for r in R:
    tr = r['tr']; n = len(tr[0]['d'])
    if n == 0: cats['no defender deeper'].append(r); continue
    best = None
    for j in range(n):
        seq = [f['d'][j] for f in tr]
        k = min(range(len(seq)), key=lambda k: seq[k]['dist'])
        if best is None or seq[k]['dist'] < best[2]: best = (j, k, seq[k]['dist'], seq)
    j, k, dmin, seq = best; d0 = seq[0]; dk = seq[k]
    chase_t = next((tr[i]['t'] for i, x in enumerate(seq) if x['chase']), None)
    blocked = any(x['eng'] == 'blocked' for x in seq[:k + 1])
    modes = Counter(x['mode'] for x in seq[:k + 1] if x['chase'])
    if dk['down']: cat = 'down at closest'
    elif blocked: cat = 'blocked by a receiver'
    elif chase_t is None or chase_t > 1.0: cat = 'stayed in coverage >1 s'
    elif dmin <= 2.5 and dk['ahead'] <= 0.5: cat = f"came, passed by at {'≤1.5' if dmin <= 1.5 else '1.5-2.5'} yd ({dk['mode']})"
    elif dmin <= 2.5: cat = f"came, still in front at closest ({dk['mode']})"
    else: cat = 'came, never within 2.5 yd'
    r['_who'] = (dk['slot'], round(dmin, 1), round(tr[k]['t'], 1), chase_t, dict(modes), round(d0['dist'], 1), round(d0['ahead'], 1), round(dk['sp'], 1), round(tr[k]['cs'], 1))
    cats[cat].append(r)
tot = sum(r['yac'] for r in R)
print(f"never-reached zone completions {len(R)}, YAC mean {mean([r['yac'] for r in R]):.1f}, ends {dict(Counter(r['end'] for r in R))}")
for cat, g in sorted(cats.items(), key=lambda kv: -sum(r['yac'] for r in kv[1])):
    w = [r['_who'] for r in g if '_who' in r]
    print(f"{cat:42s} n {len(g):3d} YAC {mean([r['yac'] for r in g]):5.1f} (share of tail yards {sum(r['yac'] for r in g) / tot:.0%}) | slots {Counter(x[0] for x in w).most_common(3)} | at catch dist p50 {q([x[5] for x in w]):.1f} deeper by {q([x[6] for x in w]):.1f} | chase starts p50 {q([x[3] for x in w if x[3] is not None]):.1f} s | his/carrier speed at closest {mean([x[7] for x in w]):.1f}/{mean([x[8] for x in w]):.1f}")
    for r in sorted(g, key=lambda r: -r['yac'])[:3]: print(f"      {r['id']:48s} {r['carrier']:3s} YAC {r['yac']:5.1f} end {r['end']:13s} who {r['_who'][:5] if '_who' in r else '-'}")
