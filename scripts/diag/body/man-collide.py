"""Analyse man-collide.mts output. Usage: python3 -I man-collide.py g.json
Collision = a man defender touches an offensive body that is not his man before the throw. Time lost: his separation to his man 1.0 s after contact (or at the throw if earlier),
against the same concept's no-collision man defenders (same defender slot where possible) at the same time of play."""
import json, sys, statistics as S, collections
P = json.load(open(sys.argv[1]))
man = [(p, m) for p in P for m in p['men']]
print('pass plays', len(P), 'man-defender plays', len(man), 'plays with any man defender', sum(1 for p in P if p['men']))
cols = []
for p in P:
    for q in p['pairs']:
        cols.append((p, q))
print('collisions', len(cols), 'on', len({(p['id'], q['d']) for p, q in cols}), 'defenders;', 'per man-defender play %.3f' % (len({(p['id'], q['d']) for p, q in cols}) / max(len(man), 1)))
def q(v, f=2): return round(S.median(v), f) if v else None
cl = [q_['closing'] for _, q_ in cols]
if cols:
    print('closing speed median/p75/max', q(cl), round(sorted(cl)[int(.75 * len(cl))], 2), max(cl)); print('D speed at contact median', q([x['dv'] for _, x in cols]), 'O speed', q([x['ov'] for _, x in cols]))
    dd = sum(1 for _, x in cols if x['down']['d']); oo = sum(1 for _, x in cols if x['down']['o']); both = sum(1 for _, x in cols if x['down']['d'] and x['down']['o'])
    print('defender falls/down within 1 s', dd, 'offensive player', oo, 'both', both, 'either', sum(1 for _, x in cols if x['down']['d'] or x['down']['o']))
    hi = [x for _, x in cols if x['closing'] >= 6]; print('closing >= 6 yd/s', len(hi), 'defender down', sum(1 for x in hi if x['down']['d']), 'either', sum(1 for x in hi if x['down']['d'] or x['down']['o']))
    print('contact time median', q([x['t'] for _, x in cols]))
    print('who he hits (O slot):', dict(collections.Counter(x['oslot'] for _, x in cols).most_common(8)))
    print('whose man he is (his target):', dict(collections.Counter(x['tslot'] for _, x in cols).most_common(8)))
# separation at contact+1.0 vs matched reps
key = lambda p, m: (p['concept'], m['slot'])
coll = {(p['id'], x['d']): x for p, x in cols}
base = collections.defaultdict(list)
for p, m in man:
    if (p['id'], m['d']) not in coll: base[key(p, m)].append(m['sep'])
diffs = []; rows = []
for p, x in cols:
    m = next(m for m in p['men'] if m['d'] == x['d']); k0 = int(round(x['t'] * 10)); k1 = k0 + 10
    thr = int(p['throw'] * 10) if p['throw'] else len(m['sep']) - 1
    k1 = min(k1, thr, len(m['sep']) - 1)
    if k1 < k0 or m['sep'][k1] is None: continue
    ref = [b[k1] for b in base[key(p, m)] if k1 < len(b) and b[k1] is not None]
    if len(ref) < 3: continue
    diffs.append(m['sep'][k1] - S.mean(ref)); rows.append((p['concept'], m['sep'][k1] - S.mean(ref), m['sep'][k1], S.mean(ref), k1 - k0))
if diffs:
    print('separation at contact+1.0 s (or the throw) minus matched no-collision reps (same concept and defender slot, same time of play):', 'n', len(diffs), 'mean %+.2f' % S.mean(diffs), 'median %+.2f' % S.median(diffs))
    print(' sep at +1.0 s collided %.2f vs reps %.2f (mean)' % (S.mean(r[2] for r in rows), S.mean(r[3] for r in rows)))
bc = collections.defaultdict(list)
for p, x in cols: bc[p['concept']].append(x)
nm = collections.Counter(p['concept'] for p, m in man)
print('by concept (man-defender plays, collisions, rate, defender down):')
for c, v in sorted(bc.items(), key=lambda kv: -len(kv[1])): print(f'  {c:16s} {nm[c]:4d} {len(v):3d} {len(v)/max(nm[c],1):.3f} down {sum(1 for x in v if x["down"]["d"])}')
print('by coverage label:')
byc = collections.Counter(p['cov'] for p, m in man); cc = collections.Counter(p['cov'] for p, x in cols)
for c in sorted(byc): print(f'  {str(c):18s} man plays {byc[c]:4d} collisions {cc[c]:3d}')
