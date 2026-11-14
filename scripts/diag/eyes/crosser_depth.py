"""CUT_WALL condition 2: absolute depths against a crosser. Same population and labels as crosser-roles.py (zone,
CROSS, non-designed dropbacks, ball held). At 2.0 / 2.5 / 3.0 s: the crosser's depth past the line, and the nearest
underneath dropper's (defenders not linemen under 10 yd deep at the snap) depth past the line, now and at the snap.
usage: python3 -I crosser_depth.py --data <bdb2025 dir> name=a.jsonl.gz,..."""
import sys, json, gzip, csv, math, re, collections
args = sys.argv[1:]; i = args.index('--data'); D = args[i + 1]; del args[i:i + 2]
PFF = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{D}/plays.csv'))}
RR = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    if r['routeRan'] not in ('NA', ''): RR[(f"{r['gameId']}-{r['playId']}", r['nflId'])] = r['routeRan']
SIM = {'cross', 'shallow', 'shallow_high'}
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
def q(v):
    v = sorted(v); n = len(v); return f"{v[n//4]:.1f}/{v[n//2]:.1f}/{v[(3*n)//4]:.1f} (n {n})" if n >= 10 else f"- (n {n})"
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
            X = lambda k, j: xy[k][2*j]; Y = lambda k, j: xy[k][2*j+1]
            ol = [j for j, a in enumerate(pl) if a['side'] == 'O' and a.get('group') == 'OL']
            if not ol: continue
            los = max(X(0, j) for j in ol)
            dfs = [j for j, a in enumerate(pl) if a['side'] == 'D' and a.get('group') != 'DL']
            under = [j for j in dfs if X(0, j) - los < 10]
            if not under: continue
            for j, a in enumerate(pl):
                if a['side'] != 'O': continue
                if pf is not None: lab = RR.get((raw['id'], str(a.get('id'))))
                else:
                    rt = a.get('route'); rid = rt.split(':')[-1] if rt else None; lab = 'CROSS' if rid in SIM else None
                if lab != 'CROSS': continue
                for m in (2.0, 2.5, 3.0):
                    k = int(round(m / dt))
                    if k > kend: continue
                    dn = min(under, key=lambda d: math.hypot(X(k, d) - X(k, j), Y(k, d) - Y(k, j)))
                    S[('crosser', m)].append(X(k, j) - los); S[('dropper', m)].append(X(k, dn) - los); S[('snap', m)].append(X(0, dn) - los)
    print(f'== {name}')
    for m in (2.0, 2.5, 3.0):
        print(f"   {m} s: crosser depth {q(S[('crosser', m)])} | nearest underneath dropper depth {q(S[('dropper', m)])} (at the snap {q(S[('snap', m)])})")
