"""Sim counter wrap pullers (plan pull, role lead): first sustained contact (1.2 yd, 0.3 s, before carrier cross+0.6 s)
classified by that man's snap job: his own snap target / the kick man / a man with a down|combo|cutoff owner / an
unowned box backer / other. At that moment: his snap target's state (engaged by whom / free) and depth; whether his
snap target made first contact on the carrier. Also 'lead_retarget' style churn: count of target changes (frame col 6)."""
import sys, json, math, collections
C = collections.Counter(); EX = collections.defaultdict(list)
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p['setup']
        if p['nullified'] or s.get('concept') != 'counter': continue
        ag = s['agents']; F = p['frames']; slot = [a['slot'] for a in ag]; idx = {a['slot']: i for i, a in enumerate(ag)}
        xy = [[(q[0] - s['los'], q[1]) for q in f['a']] for f in F]; n = len(xy)
        car = next((f['c'] for f in F if f['c'] >= 0 and slot[f['c']] != 'QB'), None)
        if car is None: continue
        cross = next((k for k in range(n) if xy[k][car][0] >= 0), None)
        end = min(n, (cross if cross is not None else n) + 7)
        defs = [i for i, a in enumerate(ag) if a['team'] == 'D']
        kick = next((a.get('tgt') for a in ag if a.get('plan') == 'pull' and a.get('role') == 'kick'), None)
        owner = {}
        for a in ag:
            if a['team'] == 'O' and a.get('plan') in ('down', 'combo', 'cutoff', 'drive', 'reach', 'climb'):
                if a.get('tgt'): owner[a['tgt']] = a['plan']
                if a.get('climb'): owner[a['climb']] = 'climb-to'
        fc = next((e for e in p['events'] if e['type'] in ('carrier_contact', 'tackle_wrap')), None)
        for i, a in enumerate(ag):
            if a.get('plan') != 'pull' or a.get('role') != 'lead': continue
            C['wraps'] += 1
            own = idx.get(a.get('tgt'))
            C[f"snap target: {'none' if own is None else ag[own]['pos'] + (' (box backer)' if xy[0][own][0] >= 1.8 else ' (line)')}"] += 1
            tg = [F[k]['a'][i][6] for k in range(min(n, end))]
            C[f"target changes {min(3, sum(1 for u, v in zip(tg, tg[1:]) if u != v))}"] += 1
            hit = None
            for f in range(2, end - 2):
                near = [j for j in defs if all(math.dist(xy[g][i], xy[g][j]) < 1.2 for g in (f, f + 1, f + 2))]
                if near: hit = (f, min(near, key=lambda j: math.dist(xy[f][i], xy[f][j]))); break
            if not hit: C['first: nobody'] += 1; cls = 'nobody'
            else:
                f, j = hit
                cls = ('own target' if j == own else 'kick man' if slot[j] == kick else
                       f"owned ({owner[slot[j]]})" if slot[j] in owner else
                       'unowned box backer' if xy[0][j][0] >= 1.8 and xy[0][j][0] < 8 else 'unowned other')
                C['first: ' + cls] += 1
                if own is not None and j != own:
                    e = F[f]['a'][own][5]
                    st = 'own target engaged by ' + (ag[e]['plan'] or ag[e]['slot']) if e >= 0 else 'own target FREE'
                    C[f'   when {cls}: {st}'] += 1
                    if len(EX[cls]) < 6: EX[cls].append(f"{p['id']} {s['formation']} {s['front']}: {slot[i]} snap tgt {a.get('tgt')} first on {slot[j]} at {F[f]['t']:.1f} (x {xy[f][j][0]:+.1f}); own x {xy[f][own][0]:+.1f} lat-from-puller {xy[f][own][1]-xy[f][i][1]:+.1f}; {st}")
            if fc and own is not None and (fc.get('a') == own or fc.get('b') == own): C[f'own target made first contact (first={cls})'] += 1
for k, v in sorted(C.items()): print(v, k)
for k, v in EX.items(): print('##', k); [print('  ', x) for x in v]
