"""Who is nearest the crosser, by crosser class (shallow < 4 / mid 4-8 / deep 8+ yd at 2.0 s), zone and man, NFL vs
sim: the nearest non-lineman's seat (NFL position, sim slot) with his distance, over and across, at 2.0 / 2.5 / 3.0 s.
Same population as crosser_sep_class.py, with man calls included (NFL pff_manZone, sim the call's man flag).
usage: python3 -I crosser_seat_class.py --data <bdb2025 dir> name=a.jsonl.gz,..."""
import sys, json, gzip, csv, math, re, collections
args = sys.argv[1:]; i = args.index('--data'); D = args[i + 1]; del args[i:i + 2]
PFF = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{D}/plays.csv'))}
RR = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    if r['routeRan'] == 'CROSS': RR[(f"{r['gameId']}-{r['playId']}", r['nflId'])] = 'CROSS'
SIMX = {'cross', 'shallow', 'shallow_high', 'mesh_under', 'over'}
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
def med(v): v = sorted(v); return f'{v[len(v)//2]:.1f}' if v else '-'
for arg in args:
    name, paths = arg.split('=', 1); C = collections.defaultdict(collections.Counter); G = collections.defaultdict(list)
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id']); cov = str((raw.get('cell') or {}).get('coverage') or '')
            if pf is not None:
                if pf['dropbackType'].startswith('DESIGNED') or pf['isDropback'] != 'TRUE' or pf['pff_manZone'] not in ('Zone', 'Man'): continue
                mz = pf['pff_manZone'].lower()
            else:
                if DES.search(str((raw.get('cell') or {}).get('concept') or '')): continue
                mz = 'man' if re.search(r'cover0|cover1|man', cov, re.I) else 'zone'
            xy, dt, pl, ev = raw['xy'], raw['dt'], raw['players'], raw['events']
            fw = ev.get('pass_forward'); kend = min(len(xy) - 1, int(round(min(fw if fw is not None else 3.0, 3.0) / dt)))
            k2 = int(round(2.0 / dt))
            if kend < k2: continue
            X = lambda k, j: xy[k][2*j]; Y = lambda k, j: xy[k][2*j+1]
            ol = [j for j, a in enumerate(pl) if a['side'] == 'O' and a.get('group') == 'OL']
            if not ol: continue
            los = max(X(0, j) for j in ol)
            dfs = [j for j, a in enumerate(pl) if a['side'] == 'D' and a.get('group') != 'DL']
            seat = lambda j: pl[j].get('pos') or pl[j].get('slot') or pl[j].get('group') or '?'
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
                    key = (mz, cl, m); C[key][seat(dn)] += 1
                    G[key].append((math.hypot(X(k, dn) - X(k, j), Y(k, dn) - Y(k, j)), X(k, dn) - X(k, j), abs(Y(k, dn) - Y(k, j))))
    print(f'== {name}')
    for mz in ('zone', 'man'):
        for cl in ('mid', 'deep', 'shallow'):
            for m in (2.0, 2.5, 3.0):
                key = (mz, cl, m); n = sum(C[key].values())
                if n < 8: continue
                g = G[key]
                print(f"   {mz:4s} {cl:7s} {m} s n {n}: dist {med([x[0] for x in g])} over {med([x[1] for x in g])} across {med([x[2] for x in g])} | nearest " + ', '.join(f'{s} {100*c/n:.0f}%' for s, c in C[key].most_common(5)))
