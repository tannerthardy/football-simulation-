"""Corner routes: who is (not) there? Same operator on NFL tracking and sim exports (Run Game for Integration,
2026-11-14). Routes: NFL player_play routeRan CORNER; sim route id `corner`. Non-designed dropbacks.

Coverage family: NFL pff_passCoverage, sim the called coverage id: C3 (Cover-3, Cover-3 Seam / cover3*), C1 (Cover-1,
Cover-1 Double / cover1*), C2 (Cover-2, 2-Man / cover2*, tampa*, 2man*), C4 (Quarters, Cover-6 / cover4*, quarters*,
cover6*), C0 (Cover-0 / cover0*). The label is checked against what the bodies show: deep DBs (more than 10 yd past
the line) at the break.

Break: the first frame from 0.8 s, with the receiver 6+ yd past the line, where his heading (over 0.2 s) has turned
25 deg or more from his heading 0.4 s earlier. At the break and +0.5 / +1.0 s (not past the ball's arrival or the
end): separation to the nearest defender and to the nearest deep defender. "Deep defender" at the break: a DB or LB
deeper than the receiver, nearest to the receiver's spot 1.0 s after the break (where the route is going). For him
at the break: seat (CB/NB = corner, FS/SS = safety, LB), depth and outward width relative to that spot (+ = deeper /
outside it), his speed, his velocity toward the spot (+ = closing on it) and his backpedal (+ = moving deeper).
For throws to the corner runner: the nearest defender at arrival.

  python3 -I corner-route.py --data <bdb2025 dir> [--list N] name=a.jsonl.gz,...
"""
import sys, os, json, gzip, csv, math, re, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
args = sys.argv[1:]; i = args.index('--data'); D = args[i + 1]; del args[i:i + 2]
LIST = 0
if '--list' in args:
    i = args.index('--list'); LIST = int(args[i + 1]); del args[i:i + 2]
PFF = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{D}/plays.csv'))}
RR = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    if r['routeRan'] == 'CORNER': RR[(f"{r['gameId']}-{r['playId']}", r['nflId'])] = 1
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
def family(nfl, sim):
    if nfl is not None:
        return {'Cover-3': 'C3', 'Cover-3 Seam': 'C3', 'Cover-1': 'C1', 'Cover-1 Double': 'C1', 'Cover-2': 'C2', '2-Man': 'C2',
                'Quarters': 'C4', 'Cover 6-Left': 'C4', 'Cover-6 Right': 'C4', 'Cover-0': 'C0'}.get(nfl, 'other')
    s = sim.lower()
    for pre, f in (('cover3', 'C3'), ('cover1', 'C1'), ('cover2', 'C2'), ('tampa', 'C2'), ('2man', 'C2'), ('cover4', 'C4'),
                   ('quarters', 'C4'), ('cover6', 'C4'), ('cover0', 'C0')):
        if s.startswith(pre): return f
    return 'other'
def seat(pl):
    s = str(pl.get('pos') or pl.get('slot') or '')
    if s.startswith(('CB', 'NB')): return 'CB'
    if s in ('FS', 'SS', 'S', 'DB') or s.startswith(('FS', 'SS')): return 'S'
    if 'LB' in s or s in ('ILB', 'OLB', 'MLB'): return 'LB'
    return 'oth'
def q(v):
    v = sorted(x for x in v if x is not None)
    if len(v) < 4: return f'- (n {len(v)})'
    return '/'.join(f'{v[int(p * (len(v) - 1))]:.1f}' for p in (.25, .5, .75)) + f' (n {len(v)})'
def vel(p, j, k):
    a, b = max(0, k - 1), min(p.frames - 1, k + 1)
    (x0, y0), (x1, y1) = p.pos(j, a), p.pos(j, b)
    if x0 is None or x1 is None or b == a: return (0.0, 0.0)
    return ((x1 - x0) / ((b - a) * p.dt), (y1 - y0) / ((b - a) * p.dt))
for arg in args:
    name, paths = arg.split('=', 1)
    S = collections.defaultdict(list); C = collections.Counter(); ex = collections.defaultdict(list)
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id'])
            if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['isDropback'] != 'TRUE'): continue
            cell = raw.get('cell') or {}
            if raw.get('source') == 'sim' and DES.search(str(cell.get('concept') or '')): continue
            fam = family(pf['pff_passCoverage'] if pf is not None else None, str(cell.get('coverage') or ''))
            p = Play(raw); ev = raw['events']; arr = ev.get('pass_arrived'); fw = ev.get('pass_forward')
            kmax = min(p.frames - 1, p.k(arr if arr is not None else p.end))
            Dd = p.who('D'); by = raw.get('ball_y', 0)
            for j, pl in enumerate(p.players):
                if pl['side'] != 'O': continue
                if pf is not None: ok = (raw['id'], str(pl.get('id'))) in RR
                else:
                    rt = pl.get('route'); ok = bool(rt) and rt.split(':')[-1] == 'corner'
                if not ok: continue
                C[(fam, 'routes')] += 1
                def head(k):
                    vx, vy = vel(p, j, k); return math.atan2(vy, vx) if math.hypot(vx, vy) > 1 else None
                kb = None
                for k in range(p.k(0.8), kmax + 1):
                    if p.pos(j, k)[0] is None or p.pos(j, k)[0] < 6: continue
                    h1, h0 = head(k), head(k - 4)
                    if h1 is None or h0 is None: continue
                    if abs(math.atan2(math.sin(h1 - h0), math.cos(h1 - h0))) >= math.radians(25): kb = k; break
                if kb is None: continue
                C[(fam, 'broke')] += 1; S[(fam, 'tbreak')].append(kb * p.dt)
                rx, ry = p.pos(j, kb); kf = min(kmax, kb + p.k(1.0)); fx, fy = p.pos(j, kf)
                out = 1 if (fy - by) >= 0 else -1
                deepDB = [d for d in Dd if p.players[d]['group'] == 'DB' and p.pos(d, kb)[0] is not None and p.pos(d, kb)[0] > 10]
                S[(fam, 'ndeep')].append(len(deepDB))
                cands = [d for d in Dd if p.players[d]['group'] in ('DB', 'LB') and p.pos(d, kb)[0] is not None and p.pos(d, kb)[0] > rx]
                dd = min(cands, key=lambda d: math.hypot(p.pos(d, kb)[0] - fx, p.pos(d, kb)[1] - fy)) if cands else None
                for m, k in (('0', kb), ('+0.5', kb + p.k(0.5)), ('+1.0', kb + p.k(1.0))):
                    if k > kmax: continue
                    S[(fam, 'sep' + m)].append(min(p.dist(j, d, k) for d in Dd))
                    if dd is not None: S[(fam, 'deepsep' + m)].append(p.dist(j, dd, k))
                if dd is not None:
                    st = seat(p.players[dd]); C[(fam, 'seat_' + st)] += 1
                    dx, dy = p.pos(dd, kb)
                    S[(fam, 'd_depth')].append(dx - fx); S[(fam, 'd_width')].append((dy - fy) * out)
                    vx, vy = vel(p, dd, kb); L = math.hypot(fx - dx, fy - dy) or 1
                    S[(fam, 'd_speed')].append(math.hypot(vx, vy)); S[(fam, 'd_close')].append((vx * (fx - dx) + vy * (fy - dy)) / L)
                    S[(fam, 'd_back')].append(vx)
                    if len(ex[fam]) < LIST:
                        ex[fam].append(f"{raw['id']} rec {j} break {kb * p.dt:.1f}s deep {dd}({p.players[dd].get('pos') or p.players[dd].get('slot')}) "
                                       f"depth {dx - fx:+.1f} width {(dy - fy) * out:+.1f} close {S[(fam, 'd_close')][-1]:+.1f} | deep DBs {len(deepDB)}")
                if raw.get('target') == j and arr is not None:
                    ka = p.k(arr); C[(fam, 'targets')] += 1
                    S[(fam, 'arrive')].append(min(p.dist(j, d, ka) for d in Dd))
    print(f"== {name}")
    for fam in ('C3', 'C1', 'C2', 'C4', 'C0', 'other'):
        r = C[(fam, 'routes')]
        if not r: continue
        b = max(1, C[(fam, 'broke')]); seats = {s: C[(fam, 'seat_' + s)] for s in ('CB', 'S', 'LB', 'oth')}
        print(f"  {fam}: corner routes {r}, break found {C[(fam, 'broke')]} at {q(S[(fam, 'tbreak')])} s; deep DBs (>10 yd) at the break {q(S[(fam, 'ndeep')])}")
        print(f"      sep nearest  break/+0.5/+1.0 {q(S[(fam, 'sep0')])} | {q(S[(fam, 'sep+0.5')])} | {q(S[(fam, 'sep+1.0')])}")
        print(f"      sep deep def break/+0.5/+1.0 {q(S[(fam, 'deepsep0')])} | {q(S[(fam, 'deepsep+0.5')])} | {q(S[(fam, 'deepsep+1.0')])}")
        print(f"      deep defender seat {seats}; vs the spot 1 s on: depth {q(S[(fam, 'd_depth')])} width out {q(S[(fam, 'd_width')])}; speed {q(S[(fam, 'd_speed')])} closing {q(S[(fam, 'd_close')])} backpedal {q(S[(fam, 'd_back')])}")
        print(f"      targets {C[(fam, 'targets')]}: nearest defender at arrival {q(S[(fam, 'arrive')])}")
        for row in ex[fam]: print('        ' + row)
