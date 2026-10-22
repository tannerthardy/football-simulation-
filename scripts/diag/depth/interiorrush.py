"""Interior pass rush, one operator for NFL tracking and sim common plays
(dropbacks without play action; interior = on the line within the tackles'
span at the snap; engaged = within 1.0 yd of an offensive non-QB player for
2+ frames, as edgedepth.py). From the first engaged frame, while before the
throw: the rusher's displacement relative to that blocker since contact,
toward the quarterback (along blocker -> QB) and across, at +0.5 / +1.0 /
+1.5 s; and the rep's state at the throw: still engaged (an offensive
non-QB within 1.0 yd), past (closer to the QB than that blocker, nobody
within 1.0 yd), or apart; and whether he came within 2 yd of the QB.
usage: interiorrush.py FILE [FILE...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
LAGS = (.5, 1.0, 1.5)
for path in sys.argv[1:]:
    o = {l: {'to': [], 'ac': []} for l in LAGS}; state = {'engaged': 0, 'past': 0, 'apart': 0}; near_qb = 0; n = 0; dur = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'pass': continue
        ev = raw.get('events') or {}; tt = ev.get('pass_forward')
        if tt is None or ev.get('play_action') is not None: continue
        p = Play(raw); kt = p.k(tt)
        qbs = p.who('O', 'QB'); ol = p.who('O', 'OL')
        if len(qbs) != 1 or len(ol) != 5: continue
        qb = qbs[0]
        ys = sorted(p.pos(i, 0)[1] for i in ol if p.pos(i, 0)[1] is not None)
        if len(ys) < 5: continue
        blockers = [i for i in p.who('O') if i != qb]
        for d in p.who('D'):
            x0, y0 = p.pos(d, 0)
            if x0 is None or x0 > 2 or not ys[0] <= y0 <= ys[-1]: continue
            run, start, b = 0, None, None
            for k in range(kt):
                if p.pos(d, k)[0] is None: break
                near = min(((p.dist(d, j, k), j) for j in blockers if p.pos(j, k)[0] is not None), default=(99, None))
                run = run + 1 if near[0] <= 1.0 else 0
                if run >= 2: start, b = k - 1, near[1]; break
            if start is None or p.pos(qb, start)[0] is None: continue
            n += 1
            (bx, by), (dx, dy), (qx, qy) = p.pos(b, start), p.pos(d, start), p.pos(qb, start)
            ax, ay = qx - bx, qy - by; L = math.hypot(ax, ay) or 1; ax, ay = ax / L, ay / L
            r0 = (dx - bx, dy - by)
            for l in LAGS:
                k = start + int(round(l / p.dt))
                if k >= kt or p.pos(d, k)[0] is None or p.pos(b, k)[0] is None: continue
                rx = p.pos(d, k)[0] - p.pos(b, k)[0] - r0[0]; ry = p.pos(d, k)[1] - p.pos(b, k)[1] - r0[1]
                o[l]['to'].append(rx * ax + ry * ay); o[l]['ac'].append(abs(-rx * ay + ry * ax))
            k = kt - 1
            if p.pos(d, k)[0] is None or p.pos(b, k)[0] is None or p.pos(qb, k)[0] is None: continue
            dur.append((kt - start) * p.dt)
            close = min((p.dist(d, j, k) for j in blockers if p.pos(j, k)[0] is not None), default=99)
            if close <= 1.0: state['engaged'] += 1
            elif p.dist(d, qb, k) < p.dist(b, qb, k): state['past'] += 1
            else: state['apart'] += 1
            near_qb += any(p.pos(d, kk)[0] is not None and p.pos(qb, kk)[0] is not None and p.dist(d, qb, kk) <= 2 for kk in range(start, kt))
    tot = max(1, sum(state.values()))
    print(f'{path.split("/")[-1][:26]}  engaged interior rushers {n}, contact to throw p50 {q(dur)} s')
    print('  at the throw: ' + ' | '.join(f'{s} {100 * v / tot:.1f}%' for s, v in state.items()) + f' | within 2 yd of QB {100 * near_qb / tot:.1f}%')
    for l in LAGS:
        r = o[l]
        print(f"  +{l}s n {len(r['to']):5d}: relative to blocker since contact, toward QB p25/p50/p75 {q(r['to'], .25)}/{q(r['to'])}/{q(r['to'], .75)} | across p50 {q(r['ac'])} p75 {q(r['ac'], .75)}")
