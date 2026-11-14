"""Rules + Coaching, 2026-11-14 (the QB lane's beat question): are our routes ready late? One operator on NFL tracking and
sim exports (crosser-sep.py's loader): non-designed dropbacks, route runners by label (NFL routeRan; sim the export's
route id), each runner's depth past the line and his distance across the field from his snap spot at 0.5 / 1.0 / 1.5 /
2.0 / 2.5 / 3.0 s while the ball is in the quarterback's hand, and his break: the first moment after 0.4 s at over
3 yd/s that his heading has turned 45+ deg off his stem (the stem: his heading at 0.6 s). Sim labels: go / fade / seam ->
GO; corner -> CORNER; post -> POST; dig, short_in -> IN (split by drawn depth); out, quick_out, deep_out -> OUT (split).
usage: python3 -I route-time.py --data <bdb2025 dir> name=a.jsonl.gz,... """
import sys, json, gzip, csv, math, re, collections
args = sys.argv[1:]; i = args.index('--data'); D = args[i + 1]; del args[i:i + 2]
PFF = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{D}/plays.csv'))}
RR = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    if r['routeRan'] not in ('NA', ''): RR[(f"{r['gameId']}-{r['playId']}", r['nflId'])] = r['routeRan']
SIM = {'go': 'GO', 'fade': 'GO', 'seam': 'GO', 'seam_read': 'GO', 'corner': 'CORNER', 'post': 'POST', 'dig': 'IN', 'short_in': 'IN',
       'out': 'OUT', 'quick_out': 'OUT', 'deep_out': 'OUT'}
LABS = ('GO', 'POST', 'CORNER', 'IN', 'OUT'); MARKS = (0.5, 1.0, 1.5, 2.0, 2.5, 3.0)
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
def q(v):
    v = sorted(v); n = len(v)
    return f"{v[n//2]:.1f}" if n >= 8 else '-'
def qq(v):
    v = sorted(v); n = len(v)
    return f"{v[n//4]:.2f}/{v[n//2]:.2f}/{v[(3*n)//4]:.2f} (n {n})" if n >= 8 else f"- (n {n})"
for arg in args:
    name, paths = arg.split('=', 1); S = collections.defaultdict(list)
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id'])
            if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['isDropback'] != 'TRUE'): continue
            if pf is None and DES.search(str((raw.get('cell') or {}).get('concept') or '')): continue
            xy, dt, pl, ev = raw['xy'], raw['dt'], raw['players'], raw['events']
            fw = ev.get('pass_forward'); kend = min(len(xy) - 1, int(round((fw if fw is not None else 3.0) / dt)))
            ol = [j for j, a in enumerate(pl) if a['side'] == 'O' and a.get('group') == 'OL']
            if not ol: continue
            los = max(xy[0][2*j] for j in ol)
            for j, a in enumerate(pl):
                if a['side'] != 'O': continue
                if pf is not None: lab = RR.get((raw['id'], str(a.get('id'))))
                else:
                    rt = a.get('route'); rid = rt.split(':')[-1] if rt else None; lab = SIM.get(rid)
                if lab not in LABS: continue
                X = lambda k: xy[k][2*j] - los; Y = lambda k: xy[k][2*j+1]
                if X(0) < -3: continue   # backs out of the backfield have their own clocks
                y0 = Y(0)
                for m in MARKS:
                    k = int(round(m / dt))
                    if k > kend: continue
                    S[(lab, 'depth', m)].append(X(k)); S[(lab, 'across', m)].append(abs(Y(k) - y0))
                k6 = int(round(0.6 / dt))
                if k6 + 2 > kend: continue
                h0 = math.atan2(Y(k6 + 1) - Y(k6 - 1), X(k6 + 1) - X(k6 - 1))
                for k in range(int(round(0.4 / dt)) + 1, kend):
                    vx, vy = (X(k + 1) - X(k - 1)) / (2 * dt), (Y(k + 1) - Y(k - 1)) / (2 * dt)
                    if math.hypot(vx, vy) < 3: continue
                    if abs(math.atan2(math.sin(math.atan2(vy, vx) - h0), math.cos(math.atan2(vy, vx) - h0))) > math.pi / 4:
                        S[(lab, 'break t')].append(k * dt); S[(lab, 'break depth')].append(X(k)); break
    print(f"== {name}")
    for lab in LABS:
        print(f"   {lab:7} depth past the line p50 at " + ' '.join(f"{m:.1f}s {q(S[(lab, 'depth', m)])}" for m in MARKS)
              + f" | across " + ' '.join(f"{m:.1f}s {q(S[(lab, 'across', m)])}" for m in (1.0, 2.0, 3.0))
              + f" | break at {qq(S[(lab, 'break t')])} s, depth {qq(S[(lab, 'break depth')])}")
