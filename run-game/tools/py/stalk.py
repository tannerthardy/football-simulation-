import sys, json, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
C = collections.Counter(); D = collections.defaultdict(list); EX = collections.defaultdict(list)
for path in sys.argv[2:]:
    for p in json.load(open(path)):
        s = p.get('setup', {})
        if p['nullified'] or not s.get('concept'): continue
        ag = s['agents']; slot = [a['slot'] for a in ag]; grp = [rfr.GROUP.get(a['pos'], a['pos']) for a in ag]; F = p['frames']
        xy = [[(q[0] - s['los'], q[1]) for q in f['a']] for f in F]
        idx = {sl: k for k, sl in enumerate(slot)}
        car = next((f['c'] for f in F if f['c'] >= 0 and slot[f['c']] != 'QB'), None)
        if car is None: continue
        cross = next((k for k in range(len(xy)) if xy[k][car][0] >= 0), len(xy) - 1)
        end = min(len(xy) - 1, cross + 5, 30)
        defs = [i for i, a in enumerate(ag) if a['team'] == 'D']
        for i, a in enumerate(ag):
            if a['team'] != 'O' or a.get('plan') != 'stalk': continue
            t = a.get('tgt'); C['stalk'] += 1; C[f'stalk by {grp[i]}'] += 1
            if not t or t not in idx: C['stalk no tgt'] += 1; continue
            j = idx[t]; dy = abs(xy[0][j][1] - xy[0][i][1]); dx = xy[0][j][0] - xy[0][i][0]
            # nearest DB laterally to this receiver
            near = min((d for d in defs if grp[d] == 'DB'), key=lambda d: abs(xy[0][d][1] - xy[0][i][1]))
            C[f'stalk tgt {grp[j]}'] += 1
            cls = 'nearest DB' if j == near else ('other DB' if grp[j] == 'DB' else grp[j])
            C[f'stalk tgt is {cls}'] += 1
            D[f'lat {cls}'].append(dy)
            touched = any(math.dist(xy[k][i], xy[k][d]) < 1.2 for k in range(1, end + 1) for d in defs)
            touched_t = any(math.dist(xy[k][i], xy[k][j]) < 1.2 for k in range(1, end + 1))
            C[f'{cls}: touched anyone {touched}'] += 1; C[f'{cls}: touched target {touched_t}'] += 1
            if dy > 6 and len(EX[cls]) < 8:
                EX[cls].append(f"{p['id']} {s['concept']} {s['formation']} {s['coverage']}: {slot[i]} @lat {xy[0][i][1]:.1f} -> {t} @({xy[0][j][0]:.1f},{xy[0][j][1]:.1f}) dy {dy:.1f}; nearest DB {slot[near]} dy {abs(xy[0][near][1]-xy[0][i][1]):.1f}")
import statistics as st
for k in sorted(C): print(f"{C[k]:5}  {k}")
for k in sorted(D): print(k, 'median', round(st.median(D[k]), 1), 'p75', round(sorted(D[k])[int(.75 * (len(D[k]) - 1))], 1), 'n', len(D[k]))
for k, v in EX.items():
    print('##', k); [print('  ', e) for e in v]
