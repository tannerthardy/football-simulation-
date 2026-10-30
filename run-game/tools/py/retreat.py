import sys, json, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
C = collections.Counter(); EX = collections.defaultdict(list)
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
        for i, a in enumerate(ag):
            if a['team'] != 'O': continue
            if a.get('plan') == 'cutoff':
                k = next((k for k in range(6, end + 1) if xy[k][i][0] < xy[0][i][0] - 1.5), None)
                if k is None: continue
                q = F[k]['a'][i]; eng = q[5]
                # engaged at any of last 5 frames?
                engaged = any(F[kk]['a'][i][5] >= 0 for kk in range(max(0, k - 5), k + 1))
                vx = q[2]
                C[f"cutoff retreat {'engaged (driven back)' if engaged else 'FREE'}"] += 1
                if not engaged and len(EX['free']) < 8:
                    tg = a.get('tgt'); j = idx.get(tg)
                    EX['free'].append(f"{p['id']} {s['concept']} {slot[i]} tgt {tg} at {F[k]['t']}s x {xy[k][i][0]:.1f} (snap {xy[0][i][0]:.1f}) vx {vx:.1f}; tgt at ({xy[k][j][0]:.1f},{xy[k][j][1]-xy[k][i][1]:+.1f})" if j is not None else '')
            if a.get('plan') == 'climb' and s.get('scheme') in ('power', 'counter', 'trap'):
                tg = a.get('tgt'); j = idx.get(tg)
                C[f"{s['scheme']} climb tgt {grp[j] if j is not None else 'none'}"] += 1
                if j is not None and grp[j] == 'DB' and len(EX['climbdb']) < 8:
                    EX['climbdb'].append(f"{p['id']} {s['concept']} {s['formation']} {s['front']}/{s['coverage']}: {slot[i]} climb -> {tg} at ({xy[0][j][0]:.1f}, lat {xy[0][j][1]-xy[0][i][1]:+.1f})")
for k in sorted(C): print(f"{C[k]:5}  {k}")
for k, v in EX.items():
    print('##', k); [print('  ', e) for e in v]
