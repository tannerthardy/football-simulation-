"""Crosser separation by class (shallow < 4 yd deep at 2.0 s, mid 4-8, deep 8+), the nearest defender (not a lineman):
distance, over and across at 2.0 / 2.5 / 3.0 s. Same population and labels as crosser-class.py (zone, CROSS by a WR
or TE, non-designed dropbacks, ball held; sim ids cross / shallow / shallow_high / mesh_under).
usage: python3 -I crosser_sep_class.py --data <bdb2025 dir> name=a.jsonl.gz,..."""
import sys, json, gzip, csv, math, re, collections
args = sys.argv[1:]; i = args.index('--data'); D = args[i + 1]; del args[i:i + 2]
PFF = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{D}/plays.csv'))}
RR = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    if r['routeRan'] == 'CROSS': RR[(f"{r['gameId']}-{r['playId']}", r['nflId'])] = 'CROSS'
SIMX = {'cross', 'shallow', 'shallow_high', 'mesh_under'}
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
def q(v):
    v = sorted(v); n = len(v); return f"{v[n//4]:.1f}/{v[n//2]:.1f}/{v[(3*n)//4]:.1f} (n {n})" if n >= 8 else f"- (n {n})"
for arg in args:
    name, paths = arg.split('=', 1); S = collections.defaultdict(list)
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id']); cov = str((raw.get('cell') or {}).get('coverage') or '')
            if pf is not None:
                if pf['dropbackType'].startswith('DESIGNED') or pf['isDropback'] != 'TRUE' or pf['pff_manZone'] != 'Zone': continue
            elif DES.search(str((raw.get('cell') or {}).get('concept') or '')) or re.search(r'cover0|cover1|man', cov, re.I): continue
            xy, dt, pl, ev = raw['xy'], raw['dt'], raw['players'], raw['events']
            fw = ev.get('pass_forward'); kend = min(len(xy) - 1, int(round(min(fw if fw is not None else 3.0, 3.0) / dt)))
            k2 = int(round(2.0 / dt))
            if kend < k2: continue
            X = lambda k, j: xy[k][2*j]; Y = lambda k, j: xy[k][2*j+1]
            ol = [j for j, a in enumerate(pl) if a['side'] == 'O' and a.get('group') == 'OL']
            if not ol: continue
            los = max(X(0, j) for j in ol)
            dfs = [j for j, a in enumerate(pl) if a['side'] == 'D' and a.get('group') != 'DL']
            for j, a in enumerate(pl):
                if a['side'] != 'O' or a.get('group') not in ('WR', 'TE'): continue
                if pf is not None: ok = RR.get((raw['id'], str(a.get('id')))) == 'CROSS'
                else: rt = a.get('route'); ok = bool(rt) and rt.split(':')[-1] in SIMX
                if not ok: continue
                d2 = X(k2, j) - los; cl = 'shallow' if d2 < 4 else 'mid' if d2 < 8 else 'deep'
                for m in (2.0, 2.5, 3.0):
                    k = int(round(m / dt))
                    if k > kend: continue
                    dn = min(dfs, key=lambda d: math.hypot(X(k, d) - X(k, j), Y(k, d) - Y(k, j)))
                    S[(cl, m, 'dist')].append(math.hypot(X(k, dn) - X(k, j), Y(k, dn) - Y(k, j)))
                    S[(cl, m, 'across')].append(abs(Y(k, dn) - Y(k, j))); S[(cl, m, 'over')].append(X(k, dn) - X(k, j))
    print(f'== {name}')
    for cl in ('shallow', 'mid', 'deep'):
        if not S[(cl, 2.0, 'dist')]: continue
        print(f'   {cl:8s} nearest dist ' + ' | '.join(f"{m} s {q(S[(cl, m, 'dist')])}" for m in (2.0, 2.5, 3.0)) + ' || across ' + ' / '.join(q(S[(cl, m, 'across')]).split(' ')[0] for m in (2.0, 2.5, 3.0)) + ' || over ' + ' / '.join(q(S[(cl, m, 'over')]).split(' ')[0] for m in (2.0, 2.5, 3.0)))
