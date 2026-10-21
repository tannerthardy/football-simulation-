"""Is the outside open before the back chooses it? NFL tracking vs sim, same
operator, under-center power/counter/trap. At the frame the runner is first
within 2 yd of the line after the handoff (x >= -2): the bounce point B = one
yard past the line, 2 yd outside the wider of the play-side edge (as in
kickout-timing.py) and the kicker; the inside point I = one yard past the
line, 1 yd inside the kicker. For each point: the nearest defender not within
1.2 yd of a blocker (OL/TE/non-carrier back) and his distance; the count of
such free defenders within 5 yd; and who (group, snap depth). Then whether
the runner went outside the edge (crossing lateral > max(edge, kicker) + 0.3).
usage: edgespace.py NFL_GAP.jsonl.gz SIM_COMMON.jsonl.gz"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
FAM = {'POWER': 'power', 'COUNTER': 'counter', 'TRAP': 'trap', 'power': 'power', 'counter': 'counter', 'trap': 'trap'}
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None


def one(raw):
    fam = FAM.get((raw.get('cell') or {}).get('concept'))
    if raw.get('kind') != 'run' or not fam:
        return None
    p = Play(raw); c = raw.get('carrier'); h = p.events.get('handoff')
    if c is None or h is None or p.players[c]['group'] != 'RB' or not p.live(h + 1.0):
        return None
    qbs = p.who('O', 'QB')
    if not qbs or p.pos(qbs[0], 0)[0] is None or p.pos(qbs[0], 0)[0] <= -2.5:
        return None
    x0, y0 = p.pos(c, p.k(h)); x1, y1 = p.pos(c, p.k(h + 1.0))
    if x0 is None or x1 is None:
        return None
    s = 1 if y1 - y0 >= 0 else -1; by = raw['ball_y']
    L = lambda y: (y - by) * s
    line = [i for i in p.who('D') if p.pos(i, 0)[0] is not None and -.5 <= p.pos(i, 0)[0] <= 2 and abs(p.pos(i, 0)[1] - by) <= 7 and L(p.pos(i, 0)[1]) > 0]
    k12 = p.k(1.2)
    cand = [i for i in p.who('O') if i != c and p.players[i]['group'] in ('OL', 'TE', 'RB') and p.pos(i, 0)[0] is not None and p.pos(i, k12)[0] is not None]
    if not line or not cand:
        return None
    edge = max(line, key=lambda i: L(p.pos(i, 0)[1]))
    kicker = max(cand, key=lambda i: (p.pos(i, k12)[1] - p.pos(i, 0)[1]) * s)
    if (p.pos(kicker, k12)[1] - p.pos(kicker, 0)[1]) * s < 1.5:
        return None
    end = p.k(p.end)
    kd = next((k for k in range(p.k(h), end + 1) if p.pos(c, k)[0] is not None and p.pos(c, k)[0] >= -2), None)
    kx = next((k for k in range(p.k(h), end + 1) if p.pos(c, k)[0] is not None and p.pos(c, k)[0] > 0), None)
    if kd is None or kx is None or p.pos(edge, kd)[0] is None or p.pos(kicker, kd)[0] is None:
        return None
    blockers = [i for i in p.who('O') if i != c and p.players[i]['group'] in ('OL', 'TE', 'RB')]
    def free(d, k):
        dx, dy = p.pos(d, k)
        return dx is not None and not any(p.pos(b, k)[0] is not None and math.hypot(p.pos(b, k)[0] - dx, p.pos(b, k)[1] - dy) <= 1.2 for b in blockers)
    ey, ky = L(p.pos(edge, kd)[1]), L(p.pos(kicker, kd)[1])
    out = {'fam': fam, 'yards': raw['yards']}
    for name, lat in (('B', max(ey, ky) + 2.0), ('I', ky - 1.0)):
        pt = (1.0, by + lat * s)
        fr = [(math.hypot(p.pos(d, kd)[0] - pt[0], p.pos(d, kd)[1] - pt[1]), d) for d in p.who('D') if free(d, kd)]
        fr.sort()
        out[name + '_near'] = fr[0][0] if fr else 99
        out[name + '_who'] = (p.players[fr[0][1]]['group'], 'front' if p.pos(fr[0][1], 0)[0] <= 2 else 'second' if p.pos(fr[0][1], 0)[0] <= 7 else 'deep') if fr else None
        out[name + '_n5'] = sum(1 for v, _ in fr if v <= 5)
    cy = L(p.pos(c, kx)[1])
    out['bounce'] = cy > max(L(p.pos(edge, kx)[1]), L(p.pos(kicker, kx)[1])) + .3
    out['runner_lat_d'] = L(p.pos(c, kd)[1]) - ky   # where he is at -2 yd vs the kicker
    return out


for path in sys.argv[1:]:
    tag = 'NFL' if 'nfl' in path else path.split('/')[-1].split('-')[0][:7]
    rows = [r for r in (one(json.loads(l)) for l in gzip.open(path, 'rt')) if r]
    for fam in ('power', 'counter', 'trap'):
        sel = [r for r in rows if r['fam'] == fam]
        if not sel:
            continue
        print(f"{tag:7s} {fam:8s} n={len(sel)} at -2 yd: runner vs kicker lateral p25/50/75 {q([r['runner_lat_d'] for r in sel],.25)}/{q([r['runner_lat_d'] for r in sel])}/{q([r['runner_lat_d'] for r in sel],.75)}")
        for name in ('I', 'B'):
            v = [r[name + '_near'] for r in sel]
            whos = [r[name + '_who'] for r in sel if r[name + '_who']]
            from collections import Counter
            top = Counter(f'{g}/{d}' for g, d in whos).most_common(3)
            print(f"{'':16s} {'inside point' if name == 'I' else 'bounce point'}: nearest free defender p25/50/75 {q(v,.25)}/{q(v)}/{q(v,.75)} yd, none within 3 yd {100*sum(1 for x in v if x > 3)/len(v):.0f}%, within 5 yd p50 {q([r[name + '_n5'] for r in sel])} | who {top}")
        for open_ in (True, False):
            sub = [r for r in sel if (r['B_near'] > 3) == open_]
            if sub:
                print(f"{'':16s} bounce point {'open (>3 yd)' if open_ else 'closed (<=3)'} {100*len(sub)/len(sel):.0f}%: runner bounced {100*sum(r['bounce'] for r in sub)/len(sub):.0f}% | yards p50 bounced {q([r['yards'] for r in sub if r['bounce']])} not {q([r['yards'] for r in sub if not r['bounce']])}")
