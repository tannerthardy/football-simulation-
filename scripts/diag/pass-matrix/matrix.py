"""Pass-game stress matrix: one operator on NFL tracking and on the sim (report only).

Both sides are read in the common play format (x: yards past the line of scrimmage, offence moving +x; 0.1 s
frames). Every category below is inferred from the trajectories by the same code on both sides:
- route per eligible receiver (WR/TE/RB) from his path (classify_route); checked against the BDB routeRan labels
  on the NFL side and against the called concept on the sim side (--check);
- concept family per play from the set of routes (classify_concept);
- formation family from the alignment at the snap: empty, 12 personnel (two TEs), bunch, 3x1, 2x2;
- receiver number (#1/#2/#3 outside-in to a side, at the snap).
Coverage is PFF's pff_passCoverage on the NFL side (an inference by charters) and the played call's family on
the sim side, folded to common families.
Outcomes: completion, yards an attempt, sack, interception, YAC (yards past the catch point), 10+ / 20+ after
the catch, separation (nearest defender to the target) at the throw and at arrival.

  python3 -I matrix.py <nfl common .jsonl.gz> <bdb dir> <sim .jsonl.gz[,more]> [--check] [--floor 25] [--json out]
"""
import sys, json, gzip, math, csv, collections as C

opt = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
FLOOR = int(opt('--floor', '25'))

# ---------------------------------------------------------------- routes
def heading(v): return math.degrees(math.atan2(v[1], v[0]))

def classify_route(path, side, end):
    """path: [(x, y)] at 0.1 s from the snap; side: +1 if his sideline is +y; end: last frame to read (the throw
    + 0.4 s). Returns GO, POST, CORNER, OUT, IN, SLANT, HITCH, FLAT, CROSS, WHEEL, ANGLE, SCREEN, BLOCK or NONE.
    Direction after the break is what names the route: heading 0 = downfield, +90 = toward his own sideline,
    -90 = toward the ball, +-180 = back toward the line."""
    P = path[:max(2, end + 1)]
    if len(P) < 6: return 'NONE'
    x0, y0 = P[0]
    dx = [p[0] for p in P]; lat = [(p[1] - y0) * side for p in P]
    maxd = max(dx)
    travel = sum(math.dist(P[i], P[i + 1]) for i in range(len(P) - 1))
    if travel < 2.5: return 'BLOCK'
    back = x0 < -2.5
    def hdg(i, j):
        j = min(j, len(P) - 1)
        if j <= i: return None
        vx = (P[j][0] - P[i][0]); vy = (P[j][1] - P[i][1]) * side
        return None if math.hypot(vx, vy) < 0.6 else math.degrees(math.atan2(vy, vx))
    def spd(i, k=3):
        j = min(i + k, len(P) - 1)
        return math.dist(P[i], P[j]) / (0.1 * max(1, j - i))
    # Stayed behind the line: a screen if he gave ground or settled, else a flat release that stayed low.
    if maxd < 1.0:
        if back and lat[-1] > 2.5: return 'FLAT'
        return 'SCREEN' if dx[-1] < dx[min(len(P) - 1, 5)] + 0.3 or spd(len(P) - 4) < 2 else 'FLAT'
    # The release: where he heads in his first second.
    rel = hdg(0, 10)
    # Break: first frame from 0.4 s where the heading turns > 35 deg against the previous 0.4 s at speed, or he slows below 55%.
    brk = None
    for i in range(4, len(P) - 4):
        h1, h2 = hdg(i - 4, i), hdg(i, i + 4)
        s1, s2 = spd(i - 4, 4), spd(i, 4)
        if h1 is None or s1 < 2.5: continue
        if h2 is None or s2 < 0.55 * s1 or abs((h2 - h1 + 180) % 360 - 180) > 35: brk = i; break
    if back:
        if brk is not None and lat[brk] > 1.5:
            h = hdg(brk, brk + 6)
            if h is not None and abs(h) < 30 and maxd > 5: return 'WHEEL'
            if h is not None and h < -25: return 'ANGLE'
        if lat[-1] > 2.5 and maxd < 4: return 'FLAT'
    if brk is None:
        h = hdg(0, len(P) - 1)
        if h is None: return 'HITCH'
        if abs(h) <= 20: return 'GO' if maxd > 8 else 'HITCH'
        if h > 60: return 'FLAT' if maxd < 3 else 'OUT'
        if h > 20: return 'CORNER' if maxd > 9 else 'OUT'
        if h < -60: return 'CROSS'
        return 'SLANT' if maxd < 8 else 'POST'
    bd = dx[brk]
    h = hdg(brk, brk + 6)
    # A quick release break (inside 2 yd) at an angle is the release itself.
    if bd < 2.0 and rel is not None and rel > 50 and (h is None or h > 30): return 'FLAT'
    if bd < 2.5 and rel is not None and -75 < rel < -25: return 'SLANT'
    if h is None or abs(h) > 135: return 'HITCH'
    if h > 60: return 'OUT' if bd >= 2 else 'FLAT'
    if h > 20: return 'CORNER' if bd > 6 else 'OUT'
    if h >= -20: return 'GO' if maxd > 8 else 'HITCH'
    if h >= -60: return 'SLANT' if bd < 5 else 'POST'
    # Flat across: a shallow or a deep over the formation is a cross; a square in at depth is an in.
    across = abs(lat[-1] - lat[brk])
    return 'CROSS' if bd < 4 or across > 12 else 'IN'

DEEP = {'GO', 'POST', 'CORNER', 'WHEEL'}
def classify_concept(routes):
    """routes: list of (route, side, number, group). Families named after the sim's installed concepts."""
    R = [r for r, *_ in routes]
    by_side = C.defaultdict(list)
    for r, s, n, g in routes: by_side[s].append((n, r))
    cnt = C.Counter(R)
    sides = [sorted(v) for v in by_side.values()]
    def side_has(*want):
        return any(all(any(r == w for _, r in v) for w in want) for v in sides)
    if cnt['SCREEN']: return 'screen'
    if cnt['CROSS'] >= 2: return 'mesh'
    if sum(cnt[r] for r in ('GO', 'POST')) >= 3 and cnt['GO'] >= 2: return 'four_verts'
    if side_has('HITCH', 'CORNER'): return 'smash'
    if side_has('CORNER', 'FLAT') or side_has('GO', 'OUT', 'FLAT'): return 'flood'
    if (cnt['POST'] or cnt['GO']) and cnt['IN']: return 'dagger/post-dig'
    if cnt['CROSS'] and (cnt['IN'] or cnt['HITCH']): return 'drive/levels'
    if cnt['CROSS']: return 'cross'
    if side_has('SLANT', 'FLAT') or cnt['SLANT'] >= 2: return 'slant_flat'
    if side_has('HITCH', 'FLAT') and not cnt['GO']: return 'curl_flat/stick'
    if cnt['OUT'] >= 2 and not any(cnt[r] for r in DEEP): return 'quick_outs'
    if cnt['HITCH'] >= 3: return 'hitches'
    if cnt['HITCH'] and cnt['FLAT']: return 'curl_flat/stick'
    return 'other'

# Sim concept ids folded to the same families, for the classifier check.
SIM_FAMILY = {'slant_flat': 'slant_flat', 'stick': 'curl_flat/stick', 'curl_flat': 'curl_flat/stick', 'quick_outs': 'quick_outs',
              'hitches': 'hitches', 'smash': 'smash', 'mesh': 'mesh', 'four_verts': 'four_verts', 'flood': 'flood', 'pa_flood': 'flood',
              'dagger': 'dagger/post-dig', 'pa_post_dig': 'dagger/post-dig', 'drive': 'drive/levels', 'levels': 'drive/levels',
              'y_cross': 'cross', 'comebacks': 'other', 'pa_shot': 'other'}

# ---------------------------------------------------------------- coverage and formation
NFL_COV = {'Cover-0': 'C0', 'Cover-1': 'C1', 'Cover-1 Double': 'C1', 'Cover-2': 'C2', '2-Man': '2-Man', 'Cover-3': 'C3',
           'Cover-3 Seam': 'C3', 'Cover-3 Cloud Left': 'C3', 'Cover-3 Cloud Right': 'C3', 'Cover-3 Double Cloud': 'C3',
           'Quarters': 'C4', 'Cover 6-Left': 'C6', 'Cover-6 Right': 'C6'}
SIM_COV = {'cover0': 'C0', 'cover1': 'C1', 'cover2man': '2-Man', 'cover2': 'C2', 'tampa2': 'C2 (Tampa)', 'cover3': 'C3', 'cover4': 'C4', 'cover6': 'C6'}

def formation(p):
    pl, X = p['players'], p['xy'][0]
    P = lambda i: (X[2 * i], X[2 * i + 1])
    qb = [i for i, a in enumerate(pl) if a['group'] == 'QB']
    ol = [i for i, a in enumerate(pl) if a['group'] == 'OL']
    if len(qb) != 1 or len(ol) < 5: return None, {}
    ball = sum(P(i)[1] for i in ol) / len(ol)
    elig = [i for i, a in enumerate(pl) if a['side'] == 'O' and a['group'] in ('WR', 'TE', 'RB')]
    backs = [i for i in elig if P(i)[0] < -2.5 and abs(P(i)[1] - ball) < 4.5]
    wide = [i for i in elig if i not in backs]
    left = sorted([i for i in wide if P(i)[1] > ball], key=lambda i: -P(i)[1])
    right = sorted([i for i in wide if P(i)[1] <= ball], key=lambda i: P(i)[1])
    num = {}
    for s, side in ((+1, left), (-1, right)):
        for k, i in enumerate(side): num[i] = (s, k + 1)
    for i in backs: num[i] = (0, 0)
    tes = sum(1 for a in pl if a['side'] == 'O' and a['group'] == 'TE')
    big = max(len(left), len(right)); small = min(len(left), len(right))
    def bunched(side):
        if len(side) < 3: return False
        for a in range(len(side) - 2):
            trio = side[a:a + 3]
            if max(P(i)[1] for i in trio) - min(P(i)[1] for i in trio) <= 4.0: return True
        return False
    if not backs: fam = 'empty'
    elif tes == 2: fam = '12p'
    elif bunched(left) or bunched(right): fam = 'bunch'
    elif big >= 3: fam = '3x1'
    elif big == 2 and small == 2: fam = '2x2'
    else: fam = 'other'
    return fam, num

# ---------------------------------------------------------------- per play
def play_rows(p, outcome, cov):
    fam, num = formation(p)
    if fam is None: return None
    pl, X = p['players'], p['xy']
    thr = p['events'].get('pass_forward'); arr = p['events'].get('pass_arrived')
    end = len(X) - 1 if thr is None else min(len(X) - 1, int(round((arr or thr + 0.6) / 0.1)))
    routes = []; rmap = {}
    for i, (s, n) in num.items():
        path = [(X[f][2 * i], X[f][2 * i + 1]) for f in range(len(X))]
        side = s or (1 if path[min(len(path) - 1, 10)][1] > path[0][1] else -1)
        r = classify_route(path, side, end)
        rmap[i] = r
        if r not in ('BLOCK', 'NONE'): routes.append((r, s, n, pl[i]['group']))
    concept = classify_concept(routes)
    t = p.get('target')
    row = {'cov': cov, 'form': fam, 'concept': concept, **outcome, 'route': rmap.get(t), 'num': None, 'sep_throw': None, 'sep_arr': None, 'yac': None}
    if t is not None and t in num:
        s, n = num[t]; row['num'] = 'back' if s == 0 else f'#{n}'
    D = [i for i, a in enumerate(pl) if a['side'] == 'D']
    def sep(tm):
        if tm is None or t is None: return None
        f = min(len(X) - 1, int(round(tm / 0.1)))
        return round(min(math.dist((X[f][2 * t], X[f][2 * t + 1]), (X[f][2 * d], X[f][2 * d + 1])) for d in D), 2)
    if outcome['att']: row['sep_throw'] = sep(thr); row['sep_arr'] = sep(arr)
    if outcome['comp'] and t is not None:
        cf = p['events'].get('catch', arr)
        if cf is not None:
            f = min(len(X) - 1, int(round(cf / 0.1)))
            row['yac'] = round(outcome['yds'] - X[f][2 * t], 2)
    return row, rmap

def nfl_rows():
    plays = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{BDB}/plays.csv'))}
    labels = C.defaultdict(dict)
    if '--check' in sys.argv:
        for r in csv.DictReader(open(f'{BDB}/player_play.csv')):
            if r['routeRan'] not in ('', 'NA'): labels[f"{r['gameId']}-{r['playId']}"][r['nflId']] = r['routeRan']
    out = []
    for l in gzip.open(NFL_PATH, 'rt'):
        p = json.loads(l)
        if p.get('kind') != 'pass': continue
        pr = plays.get(p['id'])
        if not pr or pr.get('qbSpike') in ('TRUE', 'True') or pr.get('playNullifiedByPenalty') == 'Y': continue
        cov = NFL_COV.get(pr['pff_passCoverage'])
        res = pr['passResult']
        att = res in ('C', 'I', 'IN'); comp = res == 'C'
        yds = float(pr['yardsGained']) if pr['yardsGained'] not in ('', 'NA') else 0.0
        o = {'att': att, 'comp': comp, 'sack': res == 'S', 'int': res == 'IN', 'yds': yds if att else 0.0, 'side': 'nfl', 'pa': pr['playAction'] in ('TRUE', 'True')}
        r = play_rows(p, o, cov)
        if r: out.append(r[0])
    return out

def sim_rows():
    out = []; check = C.Counter()
    for path in SIM_PATHS:
        for l in gzip.open(path, 'rt'):
            p = json.loads(l); m = p['matrix']; st = m['stats']
            att = st['attempted'] and not st['throwaway']
            o = {'att': att, 'comp': st['completed'], 'sack': st['sacked'], 'int': st['intercepted'], 'yds': p['yards'] if att else 0.0,
                 'side': 'sim', 'pa': m['concept'].startswith('pa_'), 'nearest': m['nearest'], 'called': m['called'], 'conceptId': m['concept']}
            r = play_rows(p, o, SIM_COV.get(m['playedFamily'], m['playedFamily']))
            if not r: continue
            out.append(r[0])
            check[(SIM_FAMILY.get(m['concept'], 'other'), r[0]['concept'])] += 1
            check[('form', m['formation'], r[0]['form'])] += 1
    return out, check

# ---------------------------------------------------------------- aggregation
def agg(rows):
    att = [r for r in rows if r['att']]; n = len(rows)
    a = len(att); comp = sum(r['comp'] for r in att)
    ypa = [r['yds'] for r in att]
    yac = sorted(r['yac'] for r in att if r['comp'] and r['yac'] is not None)
    m = lambda v: sum(v) / len(v) if v else float('nan')
    se = lambda v: (math.sqrt(sum((x - m(v)) ** 2 for x in v) / (len(v) - 1) / len(v)) if len(v) > 1 else float('nan'))
    tr = lambda v: m(v[int(.1 * len(v)):max(int(.1 * len(v)) + 1, int(.9 * len(v)))]) if v else float('nan')
    sp = [r['sep_throw'] for r in att if r['sep_throw'] is not None]
    return {'n': n, 'att': a, 'comp': comp / a if a else float('nan'), 'ypa': m(ypa), 'ypa_se': se(ypa),
            'sack': sum(r['sack'] for r in rows) / n if n else float('nan'), 'int': sum(r['int'] for r in att) / a if a else float('nan'),
            'yac_med': yac[len(yac) // 2] if yac else float('nan'), 'yac_tr': tr(yac),
            'yac10': sum(v >= 10 for v in yac) / len(yac) if yac else float('nan'), 'yac20': sum(v >= 20 for v in yac) / len(yac) if yac else float('nan'),
            'sep': m(sp)}

def main():
    global NFL_PATH, BDB, SIM_PATHS
    args = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith('--') and not sys.argv[i - 1] in ('--floor', '--json')]
    NFL_PATH, BDB, SIM_PATHS = args[0], args[1], args[2].split(',')
    nfl = nfl_rows()
    sim, check = sim_rows()
    if '--check' in sys.argv:
        print('== classifier check on the sim (called concept family -> classified family)')
        fams = C.defaultdict(C.Counter)
        for k, v in check.items():
            if k[0] == 'form': continue
            fams[k[0]][k[1]] += v
        for f, c in sorted(fams.items()):
            tot = sum(c.values()); print(f"  {f:18} n {tot:6}  agree {100 * c[f] / tot:5.1f}%  top: " + ', '.join(f'{k} {100 * v / tot:.0f}%' for k, v in c.most_common(4)))
        print('== formation check on the sim (formation family -> classified)')
        for k, v in sorted((k, v) for k, v in check.items() if k[0] == 'form'): print(f'  {k[1]:6} -> {k[2]:6} {v}')
    out = {'nfl': nfl and None, 'cells': []}
    key = lambda r: (r['cov'], r['concept'])
    S = C.defaultdict(list); N = C.defaultdict(list)
    for r in sim:
        S[key(r)].append(r); S[(r['cov'], '*')].append(r); S[('*', r['concept'])].append(r)
    for r in nfl:
        if r['cov'] is None or r['pa']: continue
        N[key(r)].append(r); N[(r['cov'], '*')].append(r); N[('*', r['concept'])].append(r)
    cells = []
    for k in set(S) | set(N):
        s, n = agg(S.get(k, [])), agg(N.get(k, []))
        cells.append((k, s, n))
    def gap(c):
        s, n = c[1], c[2]
        if s['att'] < FLOOR or n['att'] < FLOOR: return -1
        return abs(s['ypa'] - n['ypa']) / math.hypot(s['ypa_se'], n['ypa_se'])
    cells.sort(key=gap, reverse=True)
    f = lambda v, p=1: '—' if v != v else f'{v:.{p}f}'
    pc = lambda v: '—' if v != v else f'{100 * v:.0f}%'
    print(f'\n== coverage x concept, sorted by |yards an attempt sim - NFL| in SE (cells under {FLOOR} attempts on either side listed last, greyed)')
    print('coverage | concept | sim att | NFL att | Y/A sim | Y/A NFL | comp sim | comp NFL | YAC med sim/NFL | 10+ YAC sim/NFL | sep@throw sim/NFL | sack sim/NFL')
    for k, s, n in cells:
        grey = s['att'] < FLOOR or n['att'] < FLOOR
        print(('  (grey) ' if grey else '') + f"{k[0]} | {k[1]} | {s['att']} | {n['att']} | {f(s['ypa'])}±{f(s['ypa_se'])} | {f(n['ypa'])}±{f(n['ypa_se'])} | {pc(s['comp'])} | {pc(n['comp'])} | {f(s['yac_med'])}/{f(n['yac_med'])} | {pc(s['yac10'])}/{pc(n['yac10'])} | {f(s['sep'])}/{f(n['sep'])} | {pc(s['sack'])}/{pc(n['sack'])}")
    print('\n== by formation (all coverages)')
    FS = C.defaultdict(list); FN = C.defaultdict(list)
    for r in sim: FS[r['form']].append(r)
    for r in nfl:
        if not r['pa']: FN[r['form']].append(r)
    for k in sorted(set(FS) | set(FN)):
        s, n = agg(FS[k]), agg(FN[k])
        print(f"{k:6} | sim att {s['att']:5} | NFL att {n['att']:5} | Y/A {f(s['ypa'])}±{f(s['ypa_se'])} vs {f(n['ypa'])}±{f(n['ypa_se'])} | comp {pc(s['comp'])} vs {pc(n['comp'])} | YAC med {f(s['yac_med'])} vs {f(n['yac_med'])} | 10+ {pc(s['yac10'])} vs {pc(n['yac10'])}")
    if opt('--json'):
        json.dump({'cells': [{'cov': k[0], 'concept': k[1], 'sim': s, 'nfl': n} for k, s, n in cells]}, open(opt('--json'), 'w'), indent=1)

if __name__ == '__main__':
    main()
