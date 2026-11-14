"""QB lane, 2026-11-14: corner routes thrown or not, by whether a deep defender over the route could get to it.
One operator on NFL tracking and sim exports. At the throw (pass_forward), for every corner route being run: the spot
is where the receiver truly is T = 1.5 s on (his last frame if the play ends sooner); the danger is the defender,
among those at least as deep as the receiver less 2 yd at the throw (over the top of him), who is nearest that spot
after 0.3 s more on his own present course; `need` is the speed he would need to cover the rest, less 1 yd of reach,
in the remaining 1.2 s. Rows by `need`: routes run, targeted, rate; and completion on the targeted ones.
NFL routes from BDB 2025 player_play routeRan (joined by nflId); sim from the export's route id.
usage: python3 -I corner_danger.py [--nfl <bdb2025 dir>] name=a.jsonl.gz,... """
import sys, os, json, gzip, csv, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
args = sys.argv[1:]; RR = {}; REC = {}
if '--nfl' in args:
    i = args.index('--nfl'); D = args[i + 1]; del args[i:i + 2]
    for r in csv.DictReader(open(f'{D}/player_play.csv')):
        if r['routeRan'] == 'CORNER': RR[(f"{r['gameId']}-{r['playId']}", r['nflId'])] = 1
        if r['hadPassReception'] == '1': REC[f"{r['gameId']}-{r['playId']}"] = r['nflId']
T, REACT, REACH = 1.5, 0.3, 1.0
BINS = ((-99, 4), (4, 6), (6, 8), (8, 10), (10, 99))
for arg in args:
    name, paths = arg.split('=', 1); rows = []
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            fw = raw['events'].get('pass_forward')
            if fw is None: continue
            nfl = raw.get('source') != 'sim'; P = raw['players']
            runners = [i for i, pl in enumerate(P) if pl['side'] == 'O' and ((RR.get((raw['id'], pl.get('id'))) if nfl else 'corner' in str(pl.get('route') or '').split(':')))]
            if not runners: continue
            p = Play(raw); k = min(p.frames - 1, p.k(fw)); k0 = max(0, k - 3)
            if k == k0: continue
            def pv(i):
                a, b = p.pos(i, k), p.pos(i, k0)
                if a[0] is None or b[0] is None: return None
                dt = (k - k0) * p.dt; return a, ((a[0] - b[0]) / dt, (a[1] - b[1]) / dt)
            for i in runners:
                r = pv(i)
                if not r: continue
                (rx, ry), (vx, vy) = r; best = None
                # Where he truly is 1.5 s on (he runs his route whether or not he is thrown to); if the play ends
                # first, his last frame carried on at his velocity then.
                ka = min(p.frames - 1, k + int(round(T / p.dt))); fa = p.pos(i, ka)
                if fa[0] is None: continue
                left = T - (ka - k) * p.dt; spot = (fa[0] + vx * left * 0, fa[1])
                short = left > 0.45
                for j, pl in enumerate(P):
                    if pl['side'] != 'D': continue
                    d = pv(j)
                    if not d: continue
                    (dx, dy), (ux, uy) = d
                    if dx < rx - 2: continue
                    at = (dx + ux * REACT, dy + uy * REACT); dist = math.hypot(at[0] - spot[0], at[1] - spot[1])
                    need = max(0.0, dist - REACH) / (T - REACT)
                    if best is None or need < best: best = need
                if best is None: best = 99.0
                tg = raw.get('target') == i
                cm = tg and ((REC.get(raw['id']) == P[i].get('id')) if nfl else raw.get('receiver') == i)
                rows.append((best, tg, cm, rx, short))
    print(f"   (routes whose play ended more than 0.45 s short of the 1.5 s: {sum(r[4] for r in rows)} of {len(rows)}, {sum(r[4] and r[1] for r in rows)} targeted)")
    n = len(rows); t = sum(r[1] for r in rows)
    print(f"== {name}: corner routes in the air at a throw {n}, targeted {t} ({100 * t / max(1, n):.1f}%)")
    for lo, hi in BINS:
        B = [r for r in rows if lo <= r[0] < hi]; tb = sum(r[1] for r in B)
        print(f"   need {lo if lo > -99 else 0}-{hi if hi < 99 else '+'} yd/s: routes {len(B):5d} ({100 * len(B) / max(1, n):4.1f}%) | targeted {tb:4d} = {100 * tb / max(1, len(B)):4.1f}% | complete {100 * sum(r[2] for r in B) / max(1, tb):3.0f}%")
