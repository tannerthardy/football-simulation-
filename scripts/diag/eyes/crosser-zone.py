"""Rules + Coaching, 2026-11-14: how zone droppers handle a crosser, one operator on NFL tracking and sim exports
(loader and labels as crosser-sep.py: NFL routeRan CROSS / IN joined by player id; sim the export's route id).
Zone coverage (NFL pff_manZone Zone; sim the called coverage not man), non-designed dropbacks. For each CROSS or IN
runner, frames from 1.0 s to the throw (or 3.0 s), underneath droppers only (defenders, not linemen, under 10 yd deep
at the snap):
  - the carry: while one dropper is the runner's nearest, how far that dropper moves across the field (yd), and how far
    the runner moves across in the same frames; the first such segment;
  - the hand-off: the runner's distance across the field from that dropper's spot at the snap when the nearest dropper
    changes to another one (the first hand-off), or none by the throw;
  - the window: when the runner crosses the ball's line, the gap across the field between the nearest dropper on each
    side of him (yd), and the runner's nearest defender then.
usage: python3 -I crosser-zone.py --data <bdb2025 dir> name=a.jsonl.gz,... """
import sys, os, json, gzip, csv, math, re, collections
args = sys.argv[1:]; i = args.index('--data'); D = args[i + 1]; del args[i:i + 2]
PFF = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{D}/plays.csv'))}
RR = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    if r['routeRan'] not in ('NA', ''): RR[(f"{r['gameId']}-{r['playId']}", r['nflId'])] = r['routeRan']
SIM = {'CROSS': {'cross', 'shallow', 'shallow_high', 'under'}, 'IN': {'dig', 'short_in'}}
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
def q(v):
    v = sorted(v); n = len(v)
    return f"{v[n//4]:.1f}/{v[n//2]:.1f}/{v[(3*n)//4]:.1f} (n {n})" if n >= 10 else f"- (n {n})"
for arg in args:
    name, paths = arg.split('=', 1); S = collections.defaultdict(list); C = collections.Counter()
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id']); cov = str((raw.get('cell') or {}).get('coverage') or '')
            if pf is not None:
                if pf['dropbackType'].startswith('DESIGNED') or pf['isDropback'] != 'TRUE' or pf['pff_manZone'] != 'Zone': continue
            else:
                if DES.search(str((raw.get('cell') or {}).get('concept') or '')) or re.search(r'cover0|cover1|man', cov, re.I): continue
            xy, dt, pl, ev = raw['xy'], raw['dt'], raw['players'], raw['events']
            fw = ev.get('pass_forward'); kend = min(len(xy) - 1, int(round(min(fw if fw is not None else 3.0, 3.0) / dt)))
            k0 = int(round(1.0 / dt))
            if kend <= k0 + 2: continue
            X = lambda k, j: xy[k][2*j]; Y = lambda k, j: xy[k][2*j+1]; by = raw['ball_y']
            los = X(0, 0) + 0.0
            ol = [j for j, a in enumerate(pl) if a['side'] == 'O' and a.get('group') == 'OL']
            los = max(X(0, j) for j in ol) if ol else los
            drop = [j for j, a in enumerate(pl) if a['side'] == 'D' and a.get('group') not in ('DL',) and X(0, j) - los < 10]
            if len(drop) < 2: continue
            for j, a in enumerate(pl):
                if a['side'] != 'O': continue
                if pf is not None: lab = RR.get((raw['id'], str(a.get('id'))))
                else:
                    rt = a.get('route'); rid = rt.split(':')[-1] if rt else None; lab = next((k for k, v in SIM.items() if rid in v), None)
                if lab not in ('CROSS', 'IN'): continue
                C[lab] += 1
                near = lambda k: min(drop, key=lambda d: math.hypot(X(k, d) - X(k, j), Y(k, d) - Y(k, j)))
                d0 = near(k0); seg_end = k0
                while seg_end + 1 <= kend and near(seg_end + 1) == d0: seg_end += 1
                S[(lab, 'carry: dropper across')].append(abs(Y(seg_end, d0) - Y(k0, d0)))
                S[(lab, 'carry: runner across')].append(abs(Y(seg_end, j) - Y(k0, j)))
                if seg_end < kend: S[(lab, 'hand-off: runner from dropper\'s snap spot')].append(abs(Y(seg_end, j) - Y(0, d0)))
                else: C[(lab, 'no hand-off by the throw')] += 1
                # The window as he crosses the ball's line.
                side0 = math.copysign(1, Y(0, j) - by)
                kc = next((k for k in range(k0, kend + 1) if math.copysign(1, Y(k, j) - by) != side0), None)
                if kc is not None:
                    yj = Y(kc, j); L = [d for d in drop if Y(kc, d) < yj]; R = [d for d in drop if Y(kc, d) >= yj]
                    if L and R:
                        l = max(L, key=lambda d: Y(kc, d)); r = min(R, key=lambda d: Y(kc, d))
                        S[(lab, 'window: gap between droppers either side')].append(Y(kc, r) - Y(kc, l))
                    S[(lab, 'window: nearest defender')].append(min(math.hypot(X(kc, d) - X(kc, j), Y(kc, d) - Y(kc, j)) for d in drop))
    print(f"== {name}: CROSS {C['CROSS']} IN {C['IN']} runners against zone")
    for lab in ('CROSS', 'IN'):
        print(f"   {lab}: no hand-off by the throw {100*C[(lab, 'no hand-off by the throw')]/max(1, C[lab]):.0f}%")
        for k in ('carry: dropper across', 'carry: runner across', "hand-off: runner from dropper's snap spot", 'window: gap between droppers either side', 'window: nearest defender'):
            print(f"      {k:45} {q(S[(lab, k)])}")
