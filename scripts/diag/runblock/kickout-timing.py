"""Kick-out timing on power/counter, NFL tracking vs sim (same operator, no
labels): play side = sign of the runner's lateral move by handoff + 1 s;
the edge = the widest line defender on the play side at the snap (x
-0.5..2, |y| <= 7); the kicker = the offensive lineman (or back) with the
largest play-side lateral move by 1.2 s. When the kicker first comes within
1.3 yd of the edge: time, the edge's depth and lateral move then, and the
kicker's depth. Also the runner's depth when he passes the edge's lateral
position, the kicker's side of the edge at the meeting (+ = outside him, a
log) and how far the edge moves outward over the next 0.6 s. usage: kickout-timing.py SIM_COMMON.jsonl.gz [...]"""
import gzip, json, sys, math
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
def kick(rows, label, concepts):
    T, ED, EL, KD, RD, KL, EO, met, n = [], [], [], [], [], [], [], 0, 0
    for raw in rows:
        if raw.get('kind') != 'run' or (raw.get('cell') or {}).get('concept') not in concepts: continue
        p = Play(raw); c = raw.get('carrier'); h = p.events.get('handoff')
        if c is None or h is None or not p.live(h + 1.0): continue
        x0, y0 = p.pos(c, p.k(h)); x1, y1 = p.pos(c, p.k(h + 1.0))
        if x0 is None or x1 is None: continue
        s = 1 if y1 - y0 >= 0 else -1; by = raw['ball_y']
        line = [i for i in p.who('D') if p.pos(i, 0)[0] is not None and -.5 <= p.pos(i, 0)[0] <= 2 and abs(p.pos(i, 0)[1] - by) <= 7 and (p.pos(i, 0)[1] - by) * s > 0]
        if not line: continue
        edge = max(line, key=lambda i: (p.pos(i, 0)[1] - by) * s)
        k12 = p.k(1.2)
        cand = [i for i in p.who('O') if i != c and p.players[i]['group'] in ('OL', 'TE', 'RB', 'FB') and p.pos(i, 0)[0] is not None and p.pos(i, k12)[0] is not None]
        if not cand: continue
        kicker = max(cand, key=lambda i: (p.pos(i, k12)[1] - p.pos(i, 0)[1]) * s)
        if (p.pos(kicker, k12)[1] - p.pos(kicker, 0)[1]) * s < 1.5: continue
        n += 1
        for k in range(p.frames):
            if not p.live(k * p.dt): break
            a, b = p.pos(kicker, k), p.pos(edge, k)
            if a[0] is None or b[0] is None: continue
            if math.hypot(a[0] - b[0], a[1] - b[1]) <= 1.3:
                met += 1; T.append(k * p.dt); ED.append(b[0]); EL.append((b[1] - p.pos(edge, 0)[1]) * s); KD.append(a[0])
                KL.append((a[1] - b[1]) * s)
                k6 = min(p.frames - 1, k + int(round(.6 / p.dt)))
                if p.live(k6 * p.dt) and p.pos(edge, k6)[0] is not None: EO.append((p.pos(edge, k6)[1] - b[1]) * s)
                break
        ey = (p.pos(edge, 0)[1] - by) * s
        for k in range(p.k(h), p.frames):
            cx, cy = p.pos(c, k)
            if cx is None: continue
            if (cy - by) * s >= ey - .5: RD.append(cx); break
    print(f"{label:24s} n={n} met {met/max(1,n):.2f} | at meeting: t {q(T,.25)}/{q(T)}/{q(T,.75)} s, edge depth {q(ED,.25)}/{q(ED)}/{q(ED,.75)}, edge lateral move {q(EL)}, kicker depth {q(KD)} | runner depth reaching edge's lane {q(RD)}")
    if KL: print(f"{'':24s} kicker vs edge at meeting (+ outside him) p25/50/75 {q(KL,.25)}/{q(KL)}/{q(KL,.75)}: inside {100*sum(1 for v in KL if v < -.3)/len(KL):.0f}% level {100*sum(1 for v in KL if -.3 <= v <= .3)/len(KL):.0f}% outside {100*sum(1 for v in KL if v > .3)/len(KL):.0f}% | edge moved out over the next 0.6 s p25/50/75 {q(EO,.25)}/{q(EO)}/{q(EO,.75)}")
nfl = [json.loads(l) for l in gzip.open('out/mechanics/nfl-plays.jsonl.gz', 'rt')]
kick(nfl, 'NFL power', ('POWER',)); kick(nfl, 'NFL counter', ('COUNTER',))
for path in sys.argv[1:]:
    rows = [json.loads(l) for l in gzip.open(path, 'rt')]
    tag = path.split('/')[-1][:10]
    kick(rows, f'{tag} power', ('power',)); kick(rows, f'{tag} counter', ('counter',))
