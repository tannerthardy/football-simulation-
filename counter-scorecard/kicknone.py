"""Sim counter kick pullers (plan pull, role kick) with no sustained contact (ctrcard rule): what happened.
Per play: target (snap kick man) path; was he engaged by someone else (who) before the puller's arrival; puller's min
distance to him and when; carrier's end time / whether he crossed; whether the puller turned up (pull_turn_up event)."""
import sys, json, math, collections
C = collections.Counter(); EX = []
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
        for i, a in enumerate(ag):
            if a.get('plan') != 'pull' or a.get('role') != 'kick': continue
            C['kick'] += 1
            hit = None
            for f in range(2, end - 2):
                if any(all(math.dist(xy[g][i], xy[g][j]) < 1.2 for g in (f, f+1, f+2)) for j in defs): hit = f; break
            if hit is not None: continue
            C['nobody'] += 1
            t = idx.get(a.get('tgt'))
            tag = []
            if cross is None: tag.append('run died behind LOS')
            if t is None: tag.append('no target'); C[' / '.join(tag)] += 1; continue
            ds = [math.dist(xy[k][i], xy[k][t]) for k in range(n)]; km = min(range(n), key=lambda k: ds[k])
            eng = [(k, F[k]['a'][t][5]) for k in range(n) if F[k]['a'][t][5] >= 0]
            other = next(((k, e) for k, e in eng if e != i), None)
            turned = any(e['type'] == 'pull_turn_up' and e.get('a') == i for e in p['events'])
            tackle_t = next((e['t'] for e in p['events'] if e['type'] in ('tackle', 'tackle_wrap', 'carrier_contact')), None)
            tag.append(f"engaged by other first" if other and other[0] <= km else "not engaged by other")
            tag.append('turned up' if turned else 'no turn-up')
            tag.append(f"min dist {'<1.2' if ds[km] < 1.2 else '1.2-2.5' if ds[km] < 2.5 else '>2.5'}")
            key = ' / '.join(tag); C[key] += 1
            if len(EX) < 25: EX.append(f"{p['id']} {s['formation']} {s['front']}: {slot[i]} kick {a['tgt']} min {ds[km]:.1f}@{F[km]['t']:.1f} tgt x0 {xy[0][t][0]:.1f} x@min {xy[km][t][0]:.1f} other {slot[other[1]] + '@' + str(F[other[0]]['t']) if other else '-'} carrier cross {F[cross]['t'] if cross is not None else None} contact {tackle_t} {key}")
for k, v in C.most_common(): print(v, k)
print('\n'.join(EX))
