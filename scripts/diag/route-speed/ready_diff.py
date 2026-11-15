import json, sys, collections as C
A = {(r['concept'], r['form'], r['ref']): r for r in json.load(open(sys.argv[1]))}
B = {(r['concept'], r['form'], r['ref']): r for r in json.load(open(sys.argv[2]))}
moved = C.defaultdict(list)
for k, a in A.items():
    b = B.get(k)
    if not b: continue
    for f in ('ready', 'best', 'last'):
        if a[f] is not None and b[f] is not None and abs(b[f] - a[f]) > 0.1: moved[(k[0], f)].append((k[1], k[2], round(a[f], 2), round(b[f], 2)))
print('route windows compared', len(set(A) & set(B)), '; moved by more than 0.1 s:')
for (c, f), v in sorted(moved.items()):
    d = [x[3] - x[2] for x in v]
    print(f'  {c:18s} {f:5s} n {len(v):2d} mean {sum(d)/len(d):+.2f} max {max(d, key=abs):+.2f}  e.g. {v[0]}')
