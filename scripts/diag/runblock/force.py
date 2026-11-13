"""Force on power/counter, NFL tracking vs sim (same operator, no labels).
Play side, edge and kicker as kickout-timing.py: play side = sign of the
runner's lateral move by handoff + 1 s; the edge = the widest line defender
on the play side at the snap; the kicker = the blocker with the largest
play-side lateral move by 1.2 s. At the moment the kicker first comes within
1.3 yd of the edge: the force = the nearest other defender outside the edge
(>= 0.5 yd wider), his depth past the line, his width outside the edge, his
speed downhill and outward over the next 0.3 s, and who the edge and force are
(position group). Then whether the runner passes inside or outside
the kicker (his lateral position relative to the kicker when he reaches the
kicker's depth + 1 yd, else 1 s after the meeting), and with no force within
5 yd. usage: force.py FILE [...]"""
import gzip, json, sys, math
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
def run(rows, label, concepts):
    D, W, DH, OUT, inside, n, nf, far, G, EG, SD, SW = [], [], [], [], [], 0, 0, 0, {}, {}, [], []
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
        km = None
        for k in range(p.frames):
            if not p.live(k * p.dt): break
            a, b = p.pos(kicker, k), p.pos(edge, k)
            if a[0] is not None and b[0] is not None and math.hypot(a[0] - b[0], a[1] - b[1]) <= 1.3: km = k; break
        if km is None: continue
        n += 1
        EG[p.players[edge]['group']] = EG.get(p.players[edge]['group'], 0) + 1
        ex, ey = p.pos(edge, km); k1 = min(p.frames - 1, km + max(1, int(round(.3 / p.dt))))
        outs = [i for i in p.who('D') if i != edge and p.pos(i, km)[0] is not None and (p.pos(i, km)[1] - ey) * s >= .5 and -1 <= p.pos(i, km)[0] <= 12]
        if outs:
            f = min(outs, key=lambda i: math.hypot(p.pos(i, km)[0] - ex, p.pos(i, km)[1] - ey))
            fx, fy = p.pos(f, km); gx, gy = p.pos(f, k1)
            if gx is not None:
                G[p.players[f]['group']] = G.get(p.players[f]['group'], 0) + 1
                SD.append(p.pos(f, 0)[0]); SW.append((p.pos(f, 0)[1] - p.pos(edge, 0)[1]) * s)
                nf += 1; D.append(fx); W.append((fy - ey) * s)
                dt = (k1 - km) * p.dt or p.dt
                DH.append(-(gx - fx) / dt); OUT.append((gy - fy) * s / dt)
                if math.hypot(fx - ex, fy - ey) > 5: far += 1
        kx, ky = p.pos(kicker, km)
        side = None
        for k in range(km, min(p.frames, km + int(round(1 / p.dt)) + 1)):
            cx, cy = p.pos(c, k); kp = p.pos(kicker, k)
            if cx is None or kp[0] is None: continue
            side = (cy - kp[1]) * s
            if cx >= kp[0] + 1: break
        if side is not None: inside.append(side < 0)
    print(f"{label:22s} n={n} | force found {nf/max(1,n):.0%}, >5 yd from the edge {far/max(1,nf):.0%} | force depth {q(D,.25)}/{q(D)}/{q(D,.75)}, width outside the edge {q(W,.25)}/{q(W)}/{q(W,.75)}, downhill {q(DH)} yd/s, outward {q(OUT)} yd/s | runner inside the kicker {100*sum(inside)/max(1,len(inside)):.0f}%")
    print(f"{'':22s} force at the snap: depth {q(SD,.25)}/{q(SD)}/{q(SD,.75)}, width outside the edge {q(SW,.25)}/{q(SW)}/{q(SW,.75)}")
    print(f"{'':22s} edge {sorted(EG.items(), key=lambda x: -x[1])} | force {sorted(G.items(), key=lambda x: -x[1])}")
nfl = [json.loads(l) for l in gzip.open('out/mechanics/nfl-plays.jsonl.gz', 'rt')]
run(nfl, 'NFL power', ('POWER',)); run(nfl, 'NFL counter', ('COUNTER',))
for path in sys.argv[1:]:
    rows = [json.loads(l) for l in gzip.open(path, 'rt')]
    tag = path.split('/')[-1][:10]
    run(rows, f'{tag} power', ('power',)); run(rows, f'{tag} counter', ('counter',))
