"""Edge rush depth race, one operator for NFL tracking and sim common plays
(dropbacks without play action; edge = on the line outside the tackles at
the snap; engaged = within 1.0 yd of an offensive non-QB player for 2+
frames, as scripts/diag/pass-pressure.py). For each engaged edge rusher,
from the first engaged frame: his depth behind the line and his blocker's
(the nearest offensive player then), and the blocker's backward speed, at
+0 / +0.4 / +0.8 s while still before the throw; and whether the rusher was
level with or past the blocker's depth.
usage: edgedepth.py FILE [FILE...]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
LAGS = (0, .4, .8)
for path in sys.argv[1:]:
    o = {l: {'rd': [], 'bd': [], 'bv': [], 'past': []} for l in LAGS}; n = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'pass': continue
        ev = raw.get('events') or {}; tt = ev.get('pass_forward')
        if tt is None or ev.get('play_action') is not None: continue
        p = Play(raw); kt = p.k(tt)
        qbs = p.who('O', 'QB'); ol = p.who('O', 'OL')
        if len(qbs) != 1 or len(ol) != 5: continue
        ys = sorted(p.pos(i, 0)[1] for i in ol if p.pos(i, 0)[1] is not None)
        if len(ys) < 5: continue
        blockers = [i for i in p.who('O') if i != qbs[0]]
        for d in p.who('D'):
            x0, y0 = p.pos(d, 0)
            if x0 is None or x0 > 2 or ys[0] <= y0 <= ys[-1]: continue
            run, start, b = 0, None, None
            for k in range(kt):
                if p.pos(d, k)[0] is None: break
                near = min(((p.dist(d, j, k), j) for j in blockers if p.pos(j, k)[0] is not None), default=(99, None))
                run = run + 1 if near[0] <= 1.0 else 0
                if run >= 2: start, b = k - 1, near[1]; break
            if start is None: continue
            n += 1
            for l in LAGS:
                k = start + int(round(l / p.dt))
                if k >= kt or p.pos(d, k)[0] is None or p.pos(b, k)[0] is None: continue
                rd, bd = -p.pos(d, k)[0], -p.pos(b, k)[0]
                o[l]['rd'].append(rd); o[l]['bd'].append(bd); o[l]['bv'].append(-p.velocity(b, k)[0]); o[l]['past'].append(rd >= bd)
    print(f'{path.split("/")[-1][:26]}  engaged edge rushers {n}')
    for l in LAGS:
        r = o[l]
        print(f"  +{l}s n {len(r['rd']):5d}: rusher depth {q(r['rd'])} | blocker depth {q(r['bd'])}, backward speed {q(r['bv'])} | rusher level or deeper {100 * sum(r['past']) / max(1, len(r['past'])):.0f}%")
