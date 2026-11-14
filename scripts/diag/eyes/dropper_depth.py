"""Underneath zone droppers' depth through the down, NFL vs sim (one operator, the common play format). Zone calls on
non-designed dropbacks, ball held. A dropper: a defender (not a lineman) under 10 yd deep at the snap who has gained
1+ yd of depth by 1.5 s and is under 15 yd then (not a deep player, not a rusher). By family (Cover 3 / Cover 2 /
Quarters / Cover 6): his depth past the line at the snap, 1.0, 1.5, 2.0, 2.5, 3.0 s; when he stops sinking (first
time after 0.5 s his speed away from the line falls under 0.5 yd/s, smoothed over 0.2 s) and his depth then; and
whether he is still sinking at 2.5 s.
usage: python3 -I dropper_depth.py --data <bdb2025 dir> name=a.jsonl.gz,..."""
import sys, json, gzip, csv, re, collections
args = sys.argv[1:]; i = args.index('--data'); D = args[i + 1]; del args[i:i + 2]
PFF = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{D}/plays.csv'))}
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
def fam(label):
    t = (label or '').lower().replace('-', '').replace(' ', '')
    if t.startswith('cover3') or t.startswith('cover9'): return 'C3'
    if t.startswith('cover2') or t.startswith('tampa') or t.startswith('2man') is False and t.startswith('cover2'): return 'C2'
    if t.startswith('quarters') or t.startswith('cover4'): return 'C4'
    if t.startswith('cover6'): return 'C6'
    return None
def q(v):
    v = sorted(v); n = len(v); return f"{v[n//4]:.1f}/{v[n//2]:.1f}/{v[(3*n)//4]:.1f} (n {n})" if n >= 10 else f"- (n {n})"
MARKS = (0.0, 1.0, 1.5, 2.0, 2.5, 3.0)
for arg in args:
    name, paths = arg.split('=', 1); S = collections.defaultdict(list)
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id']); cov = str((raw.get('cell') or {}).get('coverage') or '')
            if pf is not None:
                if pf['dropbackType'].startswith('DESIGNED') or pf['isDropback'] != 'TRUE' or pf['pff_manZone'] != 'Zone': continue
                f = fam(pf['pff_passCoverage'])
            else:
                if DES.search(str((raw.get('cell') or {}).get('concept') or '')) or re.search(r'cover0|cover1|man', cov, re.I): continue
                f = fam(cov)
            if not f: continue
            xy, dt, pl, ev = raw['xy'], raw['dt'], raw['players'], raw['events']
            fw = ev.get('pass_forward'); kend = min(len(xy) - 1, int(round(min(fw if fw is not None else 3.0, 3.0) / dt)))
            if kend < int(round(1.5 / dt)): continue
            X = lambda k, j: xy[k][2*j]
            ol = [j for j, a in enumerate(pl) if a['side'] == 'O' and a.get('group') == 'OL']
            if not ol: continue
            los = max(X(0, j) for j in ol)
            k15 = int(round(1.5 / dt))
            for j, a in enumerate(pl):
                if a['side'] != 'D' or a.get('group') == 'DL': continue
                d0 = X(0, j) - los
                if d0 >= 10: continue
                d15 = X(k15, j) - los
                if d15 - d0 < 1 or d15 >= 15: continue
                for m in MARKS:
                    k = int(round(m / dt))
                    if k <= kend: S[(f, m)].append(X(k, j) - los)
                stop = None
                for k in range(int(round(0.5 / dt)), kend - 1):
                    v = (X(k + 2, j) - X(k, j)) / (2 * dt)
                    if v < 0.5: stop = k; break
                if stop is not None: S[(f, 'stop t')].append(stop * dt); S[(f, 'stop d')].append(X(stop, j) - los)
                k25 = int(round(2.5 / dt))
                if k25 + 2 <= kend: S[(f, 'sinking25')].append(1 if (X(k25 + 2, j) - X(k25 - 2, j)) / (4 * dt) >= 0.5 else 0)
    print(f'== {name}')
    for f in ('C3', 'C2', 'C4', 'C6'):
        if not S[(f, 0.0)]: continue
        s25 = S[(f, 'sinking25')]
        print(f"   {f}: depth at " + ' | '.join(f"{m} s {q(S[(f, m)])}" for m in MARKS) + f" || stops sinking at {q(S[(f, 'stop t')])} s, depth then {q(S[(f, 'stop d')])} | still sinking at 2.5 s {100*sum(s25)/max(1,len(s25)):.0f}% (n {len(s25)})")
