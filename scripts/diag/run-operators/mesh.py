"""Handoff mesh by QB alignment and concept, NFL vs sim, same code.

QB alignment from the QB's depth at the snap: under (< 2.5 yd), pistol (2.5-5 yd with the back directly
behind him, within 0.8 yd laterally), gun (otherwise). Play side = the carrier's lateral direction from the
snap to 0.6 s after the handoff. Lateral is + toward the play side, depth + upfield, from the snap ball.
At the handoff: time (NFL shifted 0.1 s), QB spot, back spot relative to the QB, the back's velocity,
QB-back centre distance (a proxy for how far the ball is extended), and the back's track heading
(deg off vertical toward play). Also QB depth at 0.3 / 0.6 s and the back's start.
Sim dump: run-operators/dump-zone.mts or dump-gap.mts (needs `off` and `handoff`)."""
import sys, json, gzip, math, statistics as st, collections
def plays(path):
    nfl = path.endswith('.gz')
    for l in (gzip.open(path, 'rt') if nfl else open(path)):
        if not l.startswith('{'): continue
        p = json.loads(l)
        if nfl:
            if p['kind'] != 'run' or 'handoff' not in p['events'] or p['carrier'] is None: continue
            pl = p['players']; qb = [i for i, q in enumerate(pl) if q['group'] == 'QB']
            if len(qb) != 1 or qb[0] == p['carrier']: continue
            xy = p['xy'][1:]; c, q = p['carrier'], qb[0]
            car = [(r[2*c], r[2*c+1]) for r in xy]; qbt = [(r[2*q], r[2*q+1]) for r in xy]
            yield p['cell']['concept'], round(p['events']['handoff'] / .1) - 1, car, qbt, p['ball_y']
        else:
            if p.get('handoff') is None: continue
            h = round(p['handoff'] / .1); car = p['car']; offs = p['off']
            if h >= len(car): continue
            # the QB: the non-carrier offensive player nearest the carrier at the handoff, among those within 2 yd of the ball's y and deeper than 1.3 yd at the snap (behind the line's stance)
            by = sum(p['ol'][0]) / 5
            cand = [m for m in range(len(offs[0])) if abs(offs[0][m][1] - by) < 2 and offs[0][m][0] < -1.3]
            if not cand: continue
            m = min(cand, key=lambda m: math.dist(offs[h][m], car[h]))
            yield p['concept'], h, car, [f[m] for f in offs], by
def align(car, qbt):
    d = -qbt[0][0]
    if d < 2.5: return 'under'
    if d < 5 and abs(car[0][1] - qbt[0][1]) < .8: return 'pistol'
    return 'gun'
for path in sys.argv[1:]:
    R = collections.defaultdict(lambda: collections.defaultdict(list))
    for con, h, car, qbt, by in plays(path):
        if h < 2 or h + 7 >= len(car): continue
        ps = 1 if car[h + 6][1] - car[0][1] >= 0 else -1
        k = (align(car, qbt), con[:13]); r = R[k]
        L = lambda pt: (pt[1] - by) * ps
        r['n'].append(1); r['t'].append(h / 10)
        r['qbdep'].append(-qbt[h][0]); r['qblat'].append(L(qbt[h]))
        r['qb3'].append(-qbt[3][0]); r['qb6'].append(-qbt[6][0])
        r['rbstart_lat'].append(L(car[0])); r['rbstart_dep'].append(-car[0][0])
        r['rb_rel_lat'].append((car[h][1] - qbt[h][1]) * ps); r['rb_rel_dep'].append(qbt[h][0] - car[h][0])
        vx = (car[h+1][0] - car[h-1][0]) / .2; vy = (car[h+1][1] - car[h-1][1]) / .2 * ps
        r['vlat'].append(vy); r['vfwd'].append(vx); r['spd'].append(math.hypot(vx, vy))
        r['head'].append(math.degrees(math.atan2(vy, vx)))
        r['sep'].append(math.dist(car[h], qbt[h]))
        qv = ((qbt[h+1][0] - qbt[h-1][0]) / .2, (qbt[h+1][1] - qbt[h-1][1]) / .2 * ps); r['qbv'].append(math.hypot(*qv))
    print('==', path.split('/')[-1])
    print('  align  concept       n    t   | QB depth@.3/.6/hand lat@hand speed | RB start lat/dep | RB rel QB lat/dep  sep | RB v lat/fwd speed heading')
    for k in sorted(R, key=lambda k: (k[0], -len(R[k]['n']))):
        r = R[k]
        if len(r['n']) < 8: continue
        md = lambda x: st.median(r[x])
        print(f"  {k[0]:6s} {k[1]:13s} {len(r['n']):4d} {md('t'):.2f} | {md('qb3'):4.1f} {md('qb6'):4.1f} {md('qbdep'):4.1f} {md('qblat'):+5.2f} {md('qbv'):4.1f} | {md('rbstart_lat'):+5.2f} {md('rbstart_dep'):4.1f} | {md('rb_rel_lat'):+5.2f} {md('rb_rel_dep'):+5.2f} {md('sep'):4.2f} | {md('vlat'):+5.2f} {md('vfwd'):+5.2f} {md('spd'):4.2f} {md('head'):4.0f}")
