"""Rules + Coaching, 2026-11-14: the crosser against zone by direct measurement, one operator on NFL tracking and sim
exports (crosser-sep.py's loader and labels; CROSS only). Zone coverage, non-designed dropbacks. For each crosser at
2.0 / 2.5 / 3.0 s while the ball is held:
  - his nearest defender (not a lineman) by seat: NFL position (CB / S / ILB / OLB...), sim slot (NB, LB_M, SS...),
    how far he is over the crosser (+ deeper) and across;
  - the underneath droppers around him (defenders, not linemen, under 10 yd deep at the snap): the two nearest, their
    depth over the crosser and their distance across;
  - the receiving dropper: when his nearest underneath dropper changes (from 1.0 s on), how much the new one closes on
    him over the next 0.5 s (yd, + closing) and how much across he moves toward him.
Also a dozen example plays per side (--examples) to check the operator sees what it claims.
usage: python3 -I crosser-roles.py --data <bdb2025 dir> [--examples] name=a.jsonl.gz,... """
import sys, json, gzip, csv, math, re, collections
args = sys.argv[1:]; i = args.index('--data'); D = args[i + 1]; del args[i:i + 2]
EX = '--examples' in args
if EX: args.remove('--examples')
PFF = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{D}/plays.csv'))}
RR = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    if r['routeRan'] not in ('NA', ''): RR[(f"{r['gameId']}-{r['playId']}", r['nflId'])] = r['routeRan']
SIM = {'cross', 'shallow', 'shallow_high'}
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
MARKS = (2.0, 2.5, 3.0)
def q(v):
    v = sorted(v); n = len(v)
    return f"{v[n//4]:.1f}/{v[n//2]:.1f}/{v[(3*n)//4]:.1f} (n {n})" if n >= 10 else f"- (n {n})"
for arg in args:
    name, paths = arg.split('=', 1); S = collections.defaultdict(list); SEAT = collections.defaultdict(collections.Counter); ex = 0
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
            seat = lambda j: pl[j].get('pos') or pl[j].get('slot') or '?'
            for j, a in enumerate(pl):
                if a['side'] != 'O': continue
                if pf is not None: lab = RR.get((raw['id'], str(a.get('id'))))
                else:
                    rt = a.get('route'); rid = rt.split(':')[-1] if rt else None; lab = 'CROSS' if rid in SIM else None
                if lab != 'CROSS': continue
                for m in MARKS:
                    k = int(round(m / dt))
                    if k > kend: continue
                    dn = min(dfs, key=lambda d: math.hypot(X(k, d) - X(k, j), Y(k, d) - Y(k, j)))
                    SEAT[m][seat(dn)] += 1
                    S[('near over', m)].append(X(k, dn) - X(k, j)); S[('near across', m)].append(abs(Y(k, dn) - Y(k, j)))
                    S[('near dist', m)].append(math.hypot(X(k, dn) - X(k, j), Y(k, dn) - Y(k, j)))
                    two = sorted(under, key=lambda d: math.hypot(X(k, d) - X(k, j), Y(k, d) - Y(k, j)))[:2]
                    for d in two: S[('dropper over', m)].append(X(k, d) - X(k, j)); S[('dropper across', m)].append(abs(Y(k, d) - Y(k, j)))
                if not under: continue
                nr = lambda k: min(under, key=lambda d: math.hypot(X(k, d) - X(k, j), Y(k, d) - Y(k, j)))
                k0 = int(round(1.0 / dt)); prev = nr(k0)
                for k in range(k0 + 1, kend + 1):
                    cur = nr(k)
                    if cur != prev:
                        k5 = min(kend, k + int(round(0.5 / dt)))
                        if k5 > k:
                            d0 = math.hypot(X(k, cur) - X(k, j), Y(k, cur) - Y(k, j)); d5 = math.hypot(X(k5, cur) - X(k5, j), Y(k5, cur) - Y(k5, j))
                            S['receiver closes'].append(d0 - d5); S['receiver across toward'].append(abs(Y(k, cur) - Y(k, j)) - abs(Y(k5, cur) - Y(k5, j)))
                            S['receiver over at the change'].append(X(k, cur) - X(k, j))
                            if EX and ex < 12:
                                ex += 1
                                print(f"   example {raw['id']} {seat(j) if pf is None else pl[j].get('pos')} crosser: nearest changes {seat(prev)} -> {seat(cur)} at {k*dt:.1f} s; new man {d0:.1f} yd off ({X(k,cur)-X(k,j):+.1f} over, {abs(Y(k,cur)-Y(k,j)):.1f} across) -> {d5:.1f} at +0.5 s")
                        break
                    prev = cur
    print(f"== {name}")
    for m in MARKS:
        n = sum(SEAT[m].values()); top = ', '.join(f"{s} {100*c/n:.0f}%" for s, c in SEAT[m].most_common(5)) if n else '-'
        print(f"   {m:.1f} s nearest: {top} | dist {q(S[('near dist', m)])} over {q(S[('near over', m)])} across {q(S[('near across', m)])}")
        print(f"         the two nearest underneath droppers: over {q(S[('dropper over', m)])} across {q(S[('dropper across', m)])}")
    print(f"   receiving dropper, 0.5 s after the change: closes {q(S['receiver closes'])}, across toward {q(S['receiver across toward'])}, over him at the change {q(S['receiver over at the change'])}")
