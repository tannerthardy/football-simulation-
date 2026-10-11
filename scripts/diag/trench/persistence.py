"""Persistence of being driven back: once an engaged box defender is moving
back > 0.5 yd/s, is he still going back 0.5 s and 1 s later? Does he win
ground back? Is his displacement backward or lateral?"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
def stats(path, label, limit=None):
    cont = {0.5: [0, 0], 1.0: [0, 0]}; regain = [0, 0]; lat = []; back = []; streaks = []; n = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line)
        if raw['kind'] != 'run' or raw.get('carrier') is None: continue
        p = Play(raw)
        if p.players[raw['carrier']]['group'] != 'RB': continue
        n += 1
        if limit and n > limit: break
        ol = p.who('O', 'OL'); kend = min(p.k(p.end), p.k(3.5))
        def vx(d, k):
            a, b = max(0, k - 2), min(p.frames - 1, k + 2)
            return (p.pos(d, b)[0] - p.pos(d, a)[0]) / ((b - a) * p.dt) if b > a else 0
        for d in p.box_defenders():
            eng = [any(p.dist(d, o, k) <= 1.5 for o in ol) for k in range(kend + 1)]
            v = [vx(d, k) for k in range(kend + 1)]
            for k in range(p.k(0.3), kend + 1):
                if eng[k] and v[k] > 0.5:
                    for lag in (0.5, 1.0):
                        kk = k + int(round(lag / p.dt))
                        if kk <= kend:
                            cont[lag][1] += 1; cont[lag][0] += v[kk] > 0.5
            # after a 1 yd loss of ground while engaged, does he regain >= 0.5 yd?
            x0 = p.pos(d, 0)[0]; worst = None
            for k in range(kend + 1):
                x = p.pos(d, k)[0] - x0
                if worst is None and eng[k] and x >= 1.0: worst = x
                elif worst is not None: worst = max(worst, x)
            if worst is not None:
                regain[1] += 1; regain[0] += (worst - (p.pos(d, kend)[0] - x0)) >= 0.5
            if p.live(2.0) and eng[p.k(2.0)]:
                k2 = p.k(2.0)
                back.append(p.pos(d, k2)[0] - x0); lat.append(abs(p.pos(d, k2)[1] - p.pos(d, 0)[1]))
            # longest continuous backward streak (yd) while engaged
            best = cur = 0.0
            for k in range(1, kend + 1):
                dx = p.pos(d, k)[0] - p.pos(d, k - 1)[0]
                if eng[k] and dx > 0.02: cur += dx; best = max(best, cur)
                elif dx < -0.02 or not eng[k]: cur = 0.0
            streaks.append(best)
    q = lambda v, f: sorted(v)[int(f * (len(v) - 1))]
    print(f'== {label}: {n} RB runs')
    for lag, (a, b) in cont.items(): print(f'  still driven back {lag}s later: {a/b:.2f}  (n={b})')
    print(f'  after losing >= 1 yd: regains >= 0.5 yd before 3.5 s: {regain[0]/regain[1]:.2f} (n={regain[1]})')
    print(f'  engaged at 2 s: backward p50 {q(back,.5):.2f} p90 {q(back,.9):.2f} | lateral p50 {q(lat,.5):.2f} p90 {q(lat,.9):.2f}')
    print(f'  longest continuous backward streak: p50 {q(streaks,.5):.2f} p90 {q(streaks,.9):.2f} p97 {q(streaks,.97):.2f}')
stats('out/mechanics/nfl-plays.jsonl.gz', 'NFL 2022', 2500)
stats('out/mechanics/nfl2017-plays.jsonl.gz', 'NFL 2017', 2000)
stats('out/mechanics/sim-plays.jsonl.gz', 'sim 101')
stats('out/mechanics/sim-202.jsonl.gz', 'sim 202')
