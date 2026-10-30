"""Run-play assignment & approach review on traced run-only film (run-trace-watch frames:
[x, y, vx, vy, facing, engagedWith, target, down, planKind]).
Snap checks (setup.agents plan/tgt/climb) and over-time checks until the carrier is 0.5 s past the LOS (cap 3.0 s).
usage: asgreview.py rfr.py trace... [--examples N]"""
import sys, json, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
paths = [a for a in sys.argv[2:] if not a.startswith('--')]
EX = 6
C = collections.defaultdict(collections.Counter); N = collections.Counter(); EXS = collections.defaultdict(list)
def ex(cat, s): 
    if len(EXS[cat]) < EX: EXS[cat].append(s)
for path in paths:
    for p in json.load(open(path)):
        s = p.get('setup', {})
        if p['nullified'] or not s.get('concept'): continue
        sch = s.get('scheme') or s['concept']
        ag = s['agents']; slot = [a['slot'] for a in ag]; grp = [rfr.GROUP.get(a['pos'], a['pos']) for a in ag]
        team = [a['team'] for a in ag]; F = p['frames']
        if len(F) < 8: continue
        xy = [[(q[0] - s['los'], q[1]) for q in f['a']] for f in F]
        car = next((f['c'] for f in F if f['c'] >= 0 and slot[f['c']] != 'QB'), None)
        if car is None: continue
        dirx = 1  # trace x already oriented? check by offense at snap behind LOS
        ol = [i for i, g in enumerate(grp) if g == 'OL' and team[i] == 'O']
        if len(ol) < 5: continue
        cy = sum(xy[0][i][1] for i in ol) / 5
        cross = next((k for k in range(len(xy)) if xy[k][car][0] >= 0), len(xy) - 1)
        end = min(len(xy) - 1, cross + 5, 30)
        # play side: carrier's crossing side relative to OL centre
        ps = 1 if xy[cross][car][1] - cy >= 0 else -1
        blk = [i for i, a in enumerate(ag) if team[i] == 'O' and a.get('plan') and i != car and slot[i] != 'QB']
        defs = [i for i in range(len(ag)) if team[i] == 'D']
        box = [i for i in defs if xy[0][i][0] < 7.5 and abs(xy[0][i][1] - cy) < 6.5 and grp[i] in ('DL', 'LB', 'DB')]
        N[sch] += 1; N['ALL'] += 1
        def side(i): 
            l = (xy[0][i][1] - cy) * ps
            return 'play' if l > 1 else 'back' if l < -1 else 'mid'
        pid = p['id']
        def bump(cat, s_=None):
            C[sch][cat] += 1; C['ALL'][cat] += 1
            if s_: ex(cat, f"{pid} {s['concept']} {s.get('formation','')} {s.get('front','')}: {s_}")
        # ---- snap assignments
        tg = {i: ag[i].get('tgt') for i in blk}; plan = {i: ag[i].get('plan') for i in blk}
        idx = {sl: k for k, sl in enumerate(slot)}
        for i in blk:
            if not tg[i] and not ag[i].get('climb') and plan[i] not in ('pull',):
                bump('snap: blocker with no man', f"{slot[i]} plan {plan[i]}")
        by = collections.defaultdict(list)
        for i in blk:
            if tg[i]: by[tg[i]].append(i)
        for t, bs in by.items():
            if len(bs) > 1 and not any(plan[b] == 'combo' for b in bs):
                bump('snap: two blockers on one man, no combo', f"{t} <- " + ",".join(f"{slot[b]}:{plan[b]}" for b in bs))
        for i in blk:
            t = tg[i]
            if not t or t not in idx or plan[i] == 'pull': continue
            j = idx[t]; dy = abs(xy[0][j][1] - xy[0][i][1])
            lim = 3.5 if grp[j] == 'DL' else 5.5
            if dy > lim: bump('snap: target far across', f"{slot[i]}:{plan[i]} -> {t} ({grp[j]}) {dy:.1f} yd lateral")
        olsorted = sorted(ol, key=lambda i: xy[0][i][1])
        for a, b in zip(olsorted, olsorted[1:]):
            ta, tb = tg.get(a), tg.get(b)
            if not ta or not tb or ta == tb or plan.get(a) == 'pull' or plan.get(b) == 'pull': continue
            ja, jb = idx.get(ta), idx.get(tb)
            if ja is None or jb is None or grp[ja] != 'DL' or grp[jb] != 'DL': continue
            if xy[0][ja][1] > xy[0][jb][1] + 0.3:
                bump('snap: crossed adjacent DL assignments', f"{slot[a]}->{ta} / {slot[b]}->{tb}")
        assigned = set(t for t in tg.values() if t) | set(ag[i].get('climb') for i in blk if ag[i].get('climb'))
        for j in box:
            if slot[j] in assigned: continue
            bump(f"snap: unassigned box {grp[j]} {side(j)}", f"{slot[j]} at {xy[0][j][0]:.1f} deep, lat {(xy[0][j][1]-cy)*ps:+.1f}")
        # ---- over time
        frames = range(1, end + 1)
        for i in blk:
            kinds = [F[k]['a'][i][8] for k in frames]; tgts = [F[k]['a'][i][6] for k in frames]
            near = any(math.dist(xy[k][i], xy[k][d]) < 1.2 for k in frames for d in defs)
            if not near:
                bump(f"time: touched nobody ({plan[i]})", f"{slot[i]} plan {plan[i]} snap tgt {tg[i]}")
            changes = sum(1 for a_, b_ in zip(tgts, tgts[1:]) if a_ != b_)
            if changes >= 3: bump('time: target churn (3+ changes)', f"{slot[i]} {changes} changes: " + ">".join(slot[t] if t >= 0 else '-' for k_, t in enumerate(tgts) if k_ == 0 or t != tgts[k_-1]))
            # engaged with someone else while own target free
            run = 0; flagged = False
            for k in frames:
                q = F[k]['a'][i]; e, t = q[5], q[6]
                if e >= 0 and t >= 0 and e != t and F[k]['a'][t][5] < 0 and team[e] == 'D': run += 1
                else: run = 0
                if run >= 4 and not flagged:
                    flagged = True; bump('time: engaged a non-target while own target is free', f"{slot[i]} on {slot[e]} while {slot[t]} free at {F[k]['t']:.1f}s")
            # retreat
            if plan[i] not in ('pull',) and any(xy[k][i][0] < xy[0][i][0] - 1.5 for k in frames if F[k]['t'] > 0.6):
                bump(f"time: retreated 1.5+ yd ({plan[i]})", f"{slot[i]}")
            # climber overrun
            if plan[i] == 'climb' or ag[i].get('climb'):
                bt = idx.get(ag[i].get('climb') or tg[i])
                if bt is not None:
                    ds = [math.dist(xy[k][i], xy[k][bt]) for k in frames]
                    mn = min(ds); km = ds.index(mn)
                    touched = any(F[k]['a'][i][5] == bt for k in frames)
                    if mn < 2.0 and not touched and max(ds[km:]) > mn + 1.5:
                        bump('time: climber came near his backer and ran past without contact', f"{slot[i]} -> {slot[bt]} min {mn:.1f} yd at {F[list(frames)[km]]['t']:.1f}s")
        # teammate collisions & accidental doubles
        for k in frames:
            for a_ in range(len(blk)):
                for b_ in range(a_ + 1, len(blk)):
                    i, j = blk[a_], blk[b_]
                    qi, qj = F[k]['a'][i], F[k]['a'][j]
                    if qi[5] >= 0 and qi[5] == qj[5] and team[qi[5]] == 'D' and not (plan[i] == 'combo' or plan[j] == 'combo'):
                        key = (pid, 'dbl', i, j)
                        if key not in N: N[key] = 1; bump('time: accidental double (no combo)', f"{slot[i]}+{slot[j]} on {slot[qi[5]]} at {F[k]['t']:.1f}s")
        # box defenders never touched by any blocker before arrival
        for j in box:
            if not any(math.dist(xy[k][b], xy[k][j]) < 1.2 for k in frames for b in blk):
                bump(f"time: box {grp[j]} {side(j)} touched by nobody", f"{slot[j]}")
print("plays per scheme:", {k: v for k, v in N.items() if isinstance(k, str)})
schemes = [k for k in N if isinstance(k, str) and k != 'ALL']
cats = sorted(C['ALL'], key=lambda c: -C['ALL'][c])
print(f"{'category':58} {'ALL/play':>8} " + " ".join(f"{s[:9]:>9}" for s in sorted(schemes)))
for c in cats:
    print(f"{c:58} {C['ALL'][c]/N['ALL']:8.2f} " + " ".join(f"{C[s][c]/max(1,N[s]):9.2f}" for s in sorted(schemes)))
print("\nEXAMPLES")
for c in cats:
    print("##", c); [print("   ", e) for e in EXS[c]]
