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
import sys, os, json, gzip, math, csv, collections as C
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from routelib import Lib, features
from population import nfl_population
LIB = None

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
    # Read each route to the throw + 0.4 s (the same cut the NFL library was built with).
    end = len(X) - 1 if thr is None else min(len(X) - 1, int(round(thr / 0.1)) + 4)
    routes = []; rmap = {}
    for i, (s, n) in num.items():
        path = [(X[f][2 * i], X[f][2 * i + 1]) for f in range(min(len(X), 40))]
        side = s or (1 if path[min(len(path) - 1, 10)][1] > path[0][1] else -1)
        travel = sum(math.dist(path[f], path[f + 1]) for f in range(min(len(path), end + 1) - 1))
        r = 'BLOCK' if travel < 2.5 or (pl[i]['group'] != 'WR' and max(q[0] for q in path[:end + 1]) < 0.5 and travel < 4) else LIB.name(features(path, side, end))
        rmap[i] = r
        if r not in ('BLOCK', 'NONE'): routes.append((r, s, n, pl[i]['group']))
    concept = classify_concept(routes)
    names = sorted(r for r, *_ in routes)
    t = p.get('target')
    row = {'cov': cov, 'form': fam, 'concept': concept, **outcome, 'route': rmap.get(t), 'num': None, 'sep_throw': None, 'sep_arr': None, 'yac': None,
           'open': None, 'catch_d': None, 'catch_close': None, 'routes': names}
    if t is not None and t in num:
        s, n = num[t]; row['num'] = 'back' if s == 0 else f'#{n}'
    D = [i for i, a in enumerate(pl) if a['side'] == 'D']
    def sep(tm):
        if tm is None or t is None: return None
        f = min(len(X) - 1, int(round(tm / 0.1)))
        return round(min(math.dist((X[f][2 * t], X[f][2 * t + 1]), (X[f][2 * d], X[f][2 * d + 1])) for d in D), 2)
    if outcome['att']:
        row['sep_throw'] = sep(thr); row['sep_arr'] = sep(arr)
        # Openness at the release, the bins of hit-throws.py (Flex): tight < 1.5, mid 1.5-3, open >= 3 yd.
        st = row['sep_throw']
        row['open'] = None if st is None else 'tight' if st < 1.5 else 'mid' if st < 3 else 'open'
    if outcome['comp'] and t is not None:
        cf = p['events'].get('catch', arr)
        if cf is not None:
            f = min(len(X) - 1, int(round(cf / 0.1)))
            row['yac'] = round(outcome['yds'] - X[f][2 * t], 2)
            # The catch situation: nearest defender's distance at the catch and his closing speed over the last 0.2 s.
            dist = lambda g, d: math.dist((X[g][2 * t], X[g][2 * t + 1]), (X[g][2 * d], X[g][2 * d + 1]))
            d0 = min(D, key=lambda d: dist(f, d))
            row['catch_d'] = round(dist(f, d0), 2)
            row['catch_close'] = round((dist(max(0, f - 2), d0) - dist(f, d0)) / 0.2, 2)
    return row, rmap

def nfl_rows():
    plays = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{BDB}/plays.csv'))}
    labels = C.defaultdict(dict)
    if '--check' in sys.argv:
        for r in csv.DictReader(open(f'{BDB}/player_play.csv')):
            if r['routeRan'] not in ('', 'NA'): labels[f"{r['gameId']}-{r['playId']}"][r['nflId']] = r['routeRan']
    out = []
    # Drop-back passes only (population.py): no play action, RPO, designed rollout or screen. --population all keeps them.
    pop, why = nfl_population(BDB)
    print('== NFL population: ' + ', '.join(f'{k} {v}' for k, v in why.most_common()) + ('' if opt('--population', 'dropback') == 'dropback' else ' (all kept: --population all)'))
    for l in gzip.open(NFL_PATH, 'rt'):
        p = json.loads(l)
        if p.get('kind') != 'pass': continue
        pr = plays.get(p['id'])
        if not pr or pr.get('qbSpike') in ('TRUE', 'True') or pr.get('playNullifiedByPenalty') == 'Y': continue
        if opt('--population', 'dropback') == 'dropback' and pop.get(tuple(p['id'].split('-'))) != 'keep': continue
        cov = NFL_COV.get(pr['pff_passCoverage'])
        res = pr['passResult']
        att = res in ('C', 'I', 'IN'); comp = res == 'C'
        yds = float(pr['yardsGained']) if pr['yardsGained'] not in ('', 'NA') else 0.0
        o = {'att': att, 'comp': comp, 'sack': res == 'S', 'int': res == 'IN', 'yds': yds if att else 0.0, 'side': 'nfl', 'pa': pr['playAction'] in ('TRUE', 'True')}
        r = play_rows(p, o, cov)
        if r: out.append(r[0])
    return out

def sim_rows():
    """Matrix plays (sim.ts, with a 'matrix' record) or league games ('export.jsonl.gz:review.json' from sim-export)."""
    out = []; check = C.Counter()
    fam = json.load(open(opt('--covfam', 'out/pass-matrix/covfam.json')))
    for spec in SIM_PATHS:
        path, _, rev = spec.partition(':')
        stats = {q['id']: q for q in json.load(open(rev))['plays']} if rev else {}
        for l in gzip.open(path, 'rt'):
            p = json.loads(l)
            if p.get('kind') != 'pass': continue
            m = p.get('matrix')
            if m:
                st = m['stats']; cov = m['playedFamily']; concept = m['concept']; conceptFam = SIM_FAMILY.get(concept, 'other')
                att = st['attempted'] and not st['throwaway']
                o = {'att': att, 'comp': st['completed'], 'sack': st['sacked'], 'int': st['intercepted']}
            else:
                q = stats.get(p['id'])
                if not q: continue
                st = q['stats']; concept = (p.get('cell') or {}).get('concept') or ''; cov = fam.get((p.get('cell') or {}).get('coverage') or '', None)
                conceptFam = SIM_FAMILY.get(concept, 'other' if concept else None)
                att = bool(st.get('attempted')) and not st.get('throwaway')
                o = {'att': att, 'comp': bool(st.get('completed')), 'sack': bool(st.get('sacked')), 'int': bool(st.get('interceptedBy'))}
            o.update({'yds': p['yards'] if att else 0.0, 'side': 'sim', 'pa': concept.startswith('pa_'), 'conceptId': concept, 'family': conceptFam, 'seed': (m or {}).get('seed') or int(p['id'].split('-')[0].lstrip('SM') or 0),
                      'nearest': m['nearest'] if m else None})
            r = play_rows(p, o, SIM_COV.get(cov, cov))
            if not r: continue
            out.append(r[0])
            if conceptFam: check[(conceptFam, r[0]['concept'])] += 1
            if m: check[('form', m['formation'], r[0]['form'])] += 1
    return out, check

# ---------------------------------------------------------------- concept model
ROUTES = ['GO', 'POST', 'CORNER', 'OUT', 'IN', 'SLANT', 'HITCH', 'FLAT', 'CROSS', 'WHEEL', 'ANGLE', 'SCREEN']
def counts(names):
    c = C.Counter(names); return [min(3, c[r]) for r in ROUTES]

class ConceptModel:
    """Naive Bayes over how many of each route a play shows (capped at 3), fitted on sim plays whose called concept
    is known; a play that fits no concept much better than the league's route mix is 'other'."""
    def __init__(self, rows, background):
        self.lp = {}
        by = C.defaultdict(list)
        for r in rows: by[r['family']].append(counts(r['routes']))
        for fam, V in by.items():
            self.lp[fam] = [[math.log((sum(v[j] == k for v in V) + 1) / (len(V) + 4)) for k in range(4)] for j in range(len(ROUTES))]
        self.bg = [[math.log((sum(v[j] == k for v in background) + 1) / (len(background) + 4)) for k in range(4)] for j in range(len(ROUTES))]
    def name(self, names, margin=2.0):
        v = counts(names)
        ll = {f: sum(t[j][v[j]] for j in range(len(ROUTES))) for f, t in self.lp.items()}
        best = max(ll, key=ll.get); bg = sum(self.bg[j][v[j]] for j in range(len(ROUTES)))
        return best if ll[best] - bg > margin else 'other'

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
            'sep': m(sp), 'sep_se': se(sp),
            'sep_arr': m([r['sep_arr'] for r in att if r['sep_arr'] is not None]),
            'open_mix': {b: sum(r['open'] == b for r in att) / a if a else float('nan') for b in ('tight', 'mid', 'open')},
            'comp_by_open': {b: (lambda R: (sum(r['comp'] for r in R) / len(R), len(R)) if R else (float('nan'), 0))([r for r in att if r['open'] == b]) for b in ('tight', 'mid', 'open')},
            'catch_d': m([r['catch_d'] for r in att if r['catch_d'] is not None]),
            'catch_close': m([r['catch_close'] for r in att if r['catch_close'] is not None])}

def main():
    global NFL_PATH, BDB, SIM_PATHS
    args = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith('--') and not sys.argv[i - 1] in ('--floor', '--json', '--lib', '--covfam', '--population')]
    NFL_PATH, BDB, SIM_PATHS = args[0], args[1], args[2].split(',')
    global LIB
    LIB = Lib(opt('--lib', 'out/pass-matrix/routelib.npz'))
    nfl = nfl_rows()
    sim, check = sim_rows()
    # Concept families: fit on half the sim seeds (odd play index), check on the other half, then name every play.
    known = [r for r in sim if r.get('family')]
    train = [r for i, r in enumerate(known) if i % 2 == 0]; test = [r for i, r in enumerate(known) if i % 2 == 1]
    model = ConceptModel(train, [counts(r['routes']) for r in nfl])
    conf = C.defaultdict(C.Counter)
    for r in test: conf[r['family']][model.name(r['routes'])] += 1
    print('== concept model, held-out half of the sim plays (called family -> named)')
    for f_, c_ in sorted(conf.items()):
        tot = sum(c_.values()); print(f"  {f_:18} n {tot:5}  agree {100 * c_[f_] / tot:5.1f}%  top: " + ', '.join(f'{k} {100 * v / tot:.0f}%' for k, v in c_.most_common(4)))
    for r in sim + nfl: r['concept'] = model.name(r['routes'])
    print('  NFL plays named by family: ' + ', '.join(f'{k} {v}' for k, v in C.Counter(r['concept'] for r in nfl if not r['pa']).most_common()))
    if '--check' in sys.argv:
        print('== formation check on the sim (formation family -> classified)')
        for k, v in sorted((k, v) for k, v in check.items() if k[0] == 'form'): print(f'  {k[1]:6} -> {k[2]:6} {v}')
    key = lambda r: (r['cov'], r['concept'])
    S = C.defaultdict(list); N = C.defaultdict(list)
    for r in sim:
        if r['cov'] is None: continue
        S[key(r)].append(r); S[(r['cov'], '*')].append(r); S[('*', r['concept'])].append(r)
    for r in nfl:
        if r['cov'] is None or r['pa']: continue
        N[key(r)].append(r); N[(r['cov'], '*')].append(r); N[('*', r['concept'])].append(r)
    cells = [(k, agg(S.get(k, [])), agg(N.get(k, []))) for k in set(S) | set(N)]
    # Most wrong in the coverage part: separation of the target at the throw, sim vs NFL, in SE.
    def gap(c):
        s_, n_ = c[1], c[2]
        if s_['att'] < FLOOR or n_['att'] < FLOOR: return -1
        return abs(s_['sep'] - n_['sep']) / math.hypot(s_['sep_se'], n_['sep_se'])
    cells.sort(key=gap, reverse=True)
    f = lambda v, p=1: '—' if v != v else f'{v:.{p}f}'
    pc = lambda v: '—' if v != v else f'{100 * v:.0f}%'
    mix = lambda a_: '/'.join(pc(a_['open_mix'][b]) for b in ('tight', 'mid', 'open'))
    cbo = lambda a_: '/'.join(pc(a_['comp_by_open'][b][0]) for b in ('tight', 'mid', 'open'))
    print(f'\n== coverage x concept, sorted by the coverage part: |separation at the throw sim - NFL| in SE')
    print(f'   (cells under {FLOOR} attempts on either side last, marked grey). Openness bins at the throw: tight <1.5 / mid 1.5-3 / open >=3 yd (hit-throws.py).')
    print('coverage | concept | att sim/NFL | sep@throw sim/NFL | open mix t/m/o sim | NFL | comp sim/NFL | comp by openness t/m/o sim | NFL | Y/A sim/NFL | catch: nearest d, closing sim | NFL | YAC med sim/NFL | 10+ YAC sim/NFL | sack sim/NFL')
    for k, s_, n_ in cells:
        grey = s_['att'] < FLOOR or n_['att'] < FLOOR
        print(('  (grey) ' if grey else '') + f"{k[0]} | {k[1]} | {s_['att']}/{n_['att']} | {f(s_['sep'],2)}±{f(s_['sep_se'],2)} / {f(n_['sep'],2)}±{f(n_['sep_se'],2)} | {mix(s_)} | {mix(n_)} | {pc(s_['comp'])}/{pc(n_['comp'])} | {cbo(s_)} | {cbo(n_)} | {f(s_['ypa'])}/{f(n_['ypa'])} | {f(s_['catch_d'])} yd, {f(s_['catch_close'])} yd/s | {f(n_['catch_d'])} yd, {f(n_['catch_close'])} yd/s | {f(s_['yac_med'])}/{f(n_['yac_med'])} | {pc(s_['yac10'])}/{pc(n_['yac10'])} | {pc(s_['sack'])}/{pc(n_['sack'])}")
    print('\n== by formation (all coverages, non-PA)')
    FS = C.defaultdict(list); FN = C.defaultdict(list)
    for r in sim: FS[r['form']].append(r)
    for r in nfl:
        if not r['pa']: FN[r['form']].append(r)
    for k in sorted(set(FS) | set(FN)):
        s_, n_ = agg(FS[k]), agg(FN[k])
        print(f"{k:6} | att {s_['att']}/{n_['att']} | sep@throw {f(s_['sep'],2)} vs {f(n_['sep'],2)} | open mix {mix(s_)} vs {mix(n_)} | comp {pc(s_['comp'])} vs {pc(n_['comp'])} | comp by openness {cbo(s_)} vs {cbo(n_)} | Y/A {f(s_['ypa'])} vs {f(n_['ypa'])} | catch d {f(s_['catch_d'])} vs {f(n_['catch_d'])} | YAC med {f(s_['yac_med'])} vs {f(n_['yac_med'])} | 10+ {pc(s_['yac10'])} vs {pc(n_['yac10'])}")
    # Who was nearest the target at the throw, and the job he was running (sim only; forced-grid plays).
    J = C.defaultdict(list)
    for r in sim:
        if r.get('nearest') and r['att'] and r['cov']:
            job = r['nearest'].split('|')[0]
            J[(r['cov'], job)].append(r)
    if J:
        print('\n== nearest defender to the target at the throw: his rule (sim forced grid). "no rule" = a plain zone seat; "man" = a man assignment')
        print('coverage | job | att | share of the coverage | sep@throw | comp | Y/A | YAC med | 10+ YAC | catch d, closing')
        tot = C.Counter(k[0] for k, v in J.items() for _ in v)
        for k in sorted(J, key=lambda k: (k[0], -len(J[k]))):
            a_ = agg(J[k])
            if a_['att'] < 15: continue
            print(f"{k[0]} | {k[1]} | {a_['att']} | {pc(a_['att'] / tot[k[0]])} | {f(a_['sep'],2)} | {pc(a_['comp'])} | {f(a_['ypa'])} | {f(a_['yac_med'])} | {pc(a_['yac10'])} | {f(a_['catch_d'])} yd, {f(a_['catch_close'])} yd/s")
    if opt('--json'):
        json.dump({'cells': [{'cov': k[0], 'concept': k[1], 'sim': s, 'nfl': n} for k, s, n in cells]}, open(opt('--json'), 'w'), indent=1)

if __name__ == '__main__':
    main()
