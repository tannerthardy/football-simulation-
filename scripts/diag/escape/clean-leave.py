"""QB lane, 2026-11-14: the quarterback who leaves a clean pocket. A place to look, not a number to build to.
NFL tracking or sim exports, non-designed dropbacks. LEAVERS: left the pocket (escape.py's definition) with the nearest
DL/LB more than 3 yd away at the onset of that movement, and the onset at or after 1.5 s (so not inside the drop).
CONTROLS: the same moment in the down for quarterbacks who did not leave: still holding the ball in the pocket at 2.5 s
with the nearest DL/LB more than 3 yd away, and not out of the pocket within the next 1.5 s.
At that moment, from positions only:
  OPEN: for each offensive player more than 1 yd past the line (a route runner), his distance to the nearest
        defender; the best of them, and how many have 3 yd or more. Separation from tracking is a weak read of "open".
  LANE: the nearest defender inside a 60-degree cone straight upfield from him (how much grass is in front).
  WHERE HE GOES (leavers): over the first 1.0 s after the onset, upfield against sideways.
usage: python3 -I clean-leave.py name=a.jsonl.gz,... [--plays-csv plays.csv]"""
import sys, os, json, gzip, math, re, csv
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
args = sys.argv[1:]; PFF = {}
if '--plays-csv' in args:
    i = args.index('--plays-csv')
    for r in csv.DictReader(open(args[i + 1])): PFF[f"{r['gameId']}-{r['playId']}"] = r
    del args[i:i + 2]
def q(v, p=.5):
    v = sorted(x for x in v if x is not None); return v[int(p * (len(v) - 1))] if v else float('nan')
pc = lambda a, b: f"{100 * a / max(1, b):.0f}%"
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
def picture(p, qb, k):
    x, y = p.pos(qb, k); D = [d for d in p.who('D') if p.pos(d, k)[0] is not None]
    seps = []
    for o in p.who('O'):
        if o == qb: continue
        ox, oy = p.pos(o, k)
        if ox is None or ox < 1: continue
        seps.append(min(math.hypot(p.pos(d, k)[0] - ox, p.pos(d, k)[1] - oy) for d in D) if D else 99)
    lane = 99
    for d in D:
        dx, dy = p.pos(d, k)[0] - x, p.pos(d, k)[1] - y
        if dx > 0 and abs(math.atan2(dy, dx)) <= math.radians(30): lane = min(lane, math.hypot(dx, dy))
    return (max(seps) if seps else None, sum(s >= 3 for s in seps), len(seps), lane)
for arg in args:
    name, paths = arg.split('=', 1); L = []; C = []
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id'])
            if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['qbSpike'] == 'TRUE' or pf['isDropback'] != 'TRUE'): continue
            if raw.get('source') == 'sim' and DES.search(str((raw.get('cell') or {}).get('concept') or '')): continue
            p = Play(raw); qbs = p.who('O', 'QB')
            if not qbs or p.pos(qbs[0], 0)[0] is None: continue
            qb = qbs[0]; ev = raw['events']; by = raw['ball_y']
            OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
            if len(OL) < 5: continue
            width = max(abs(p.pos(o, 0)[1] - by) for o in OL) + 0.5; y0 = p.pos(qb, 0)[1]
            fw = ev.get('pass_forward'); kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
            out_k = None
            for k in range(p.k(0.3), kend + 1):
                x, y = p.pos(qb, k)
                if x is None or x > 0: break
                if abs(y - by) > width or abs(y - y0) > 2.5: out_k = k; break
            RU = [d for d in p.who('D') if p.players[d]['group'] in ('DL', 'LB')]
            def near(k):
                x, y = p.pos(qb, k); v = [math.hypot(p.pos(d, k)[0] - x, p.pos(d, k)[1] - y) for d in RU if p.pos(d, k)[0] is not None]
                return min(v) if v else 99
            crossed = any(p.pos(qb, k)[0] is not None and p.pos(qb, k)[0] > 0 for k in range(kend + 1))
            res = 'throw' if fw is not None else ('run' if crossed else 'sack')
            if out_k is not None:
                ko = 0
                for k in range(out_k, 0, -1):
                    a, b = p.pos(qb, k), p.pos(qb, k - 1)
                    if a[0] is None or b[0] is None: break
                    if math.hypot(a[0] - b[0], a[1] - b[1]) / p.dt < 1.5: ko = k; break
                if ko * p.dt < 1.5 or near(ko) <= 3: continue
                k1 = min(kend, ko + int(round(1.0 / p.dt))); a, b = p.pos(qb, ko), p.pos(qb, k1)
                if b[0] is None: continue
                L.append((ko * p.dt, picture(p, qb, ko), b[0] - a[0], abs(b[1] - a[1]), res, (kend - ko) * p.dt))
            else:
                k = int(round(2.5 / p.dt))
                if k > kend or near(k) <= 3: continue
                C.append((2.5, picture(p, qb, k), None, None, res, (kend - k) * p.dt))
    print(f"== {name}: clean-pocket leavers {len(L)}, controls {len(C)}")
    for lab, S in (('leavers', L), ('controls', C)):
        if not S: continue
        best = [s[1][0] for s in S if s[1][0] is not None]; cnt = [s[1][1] for s in S]; lane = [min(s[1][3], 40) for s in S]
        c = lambda r: sum(s[4] == r for s in S)
        print(f"   {lab:9s} at {q([s[0] for s in S]):.1f} s | best separation p25/50/75 {q(best, .25):.1f}/{q(best):.1f}/{q(best, .75):.1f} yd | routes with 3+ yd: none {pc(sum(x == 0 for x in cnt), len(S))}, one {pc(sum(x == 1 for x in cnt), len(S))}, two or more {pc(sum(x >= 2 for x in cnt), len(S))} | nearest defender straight upfield p25/50/75 {q(lane, .25):.0f}/{q(lane):.0f}/{q(lane, .75):.0f} yd | ball held {q([s[5] for s in S]):.1f} s more | ends throw {pc(c('throw'), len(S))} run {pc(c('run'), len(S))} sack {pc(c('sack'), len(S))}")
    if L:
        up = sum(1 for s in L if s[2] > s[3]); side = sum(1 for s in L if s[3] >= s[2] and s[2] > -1); back = len(L) - up - side
        print(f"   leavers' first 1.0 s: mostly upfield {pc(up, len(L))}, mostly sideways {pc(side, len(L))}, back {pc(back, len(L))}; upfield p50 {q([s[2] for s in L]):+.1f} yd, sideways p50 {q([s[3] for s in L]):.1f} yd")
