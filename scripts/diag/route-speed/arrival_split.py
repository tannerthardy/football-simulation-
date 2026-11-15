# Completion by air-yards band and what carries the incompletions, one operator for the NFL (BDB 2025, common play format from nfl_bdb2025.py plus the football's track from
# nfl_bdb2025_ball.py) and the sim (sim-export.ts: common format with the ball track `bxy`). Same code reads both; nothing here uses the sim's own labels except for the cross-check line.
#   python3 -I scripts/diag/route-speed/arrival_split.py nfl=PLAYS.jsonl.gz,BALL.jsonl.gz sim=PLAYS.jsonl.gz[,OUTCOMES.json] [sim2=...] [--band LO HI]
# A pass: kind 'pass', a target, events.pass_arrived, the ball track. Frame A = pass_arrived (10 Hz, frame 0 = snap), x = yards past the line.
#   air      ball x at A (the ball's actual travel past the line, as passLength is defined, not the intended aim point); band default 5 <= air < 10
#   miss     |ball - target| at A (yd); catchable = miss <= CATCHABLE (1.5 yd: arm reach with a step)
#   sepT     the target's distance to the nearest defender at A;  sepB  the ball's distance to the nearest defender at A
#   speed    the target's speed at A (central difference over +/-0.2 s of the track)
#   result   NFL: passResult C / I / IN (nfl-ball labels); sim: the sim's own ball events (catch/secure = C, interception = IN, else I)
# Excluded on both sides: throwaways (NFL: no named receiver; sim: the throw event type), plays with no target or no arrival or no ball track.
# Incompletion split: not catchable (miss > CATCHABLE) / defender on the ball (miss <= CATCHABLE and sepB < ON_BALL, 1.0 yd) / catchable and uncontested (the rest).
import sys, gzip, json, math, collections as C
CATCHABLE, ON_BALL = 1.5, 1.0
args = sys.argv[1:]; lo, hi = 5.0, 10.0
if '--band' in args:
    i = args.index('--band'); lo, hi = float(args[i + 1]), float(args[i + 2]); del args[i:i + 3]
def jl(p):
    for l in gzip.open(p, 'rt'): yield json.loads(l)
def at(P, f, j): return (P['xy'][f][2 * j], P['xy'][f][2 * j + 1])
def load(spec):
    kind, files = spec.split('=', 1); files = files.split(',')
    out = []
    if kind.startswith('nfl'):
        ball = {b['id']: b for b in jl(files[1])}
        for p in jl(files[0]):
            b = ball.get(p['id'])
            if p['kind'] != 'pass' or not b or p.get('target') is None or 'pass_arrived' not in p['events']: continue
            res = b.get('passResult')
            if res not in ('C', 'I', 'IN'): continue
            if not b.get('namedReceiver') or b.get('tipped'): continue     # no named receiver = how the league scores a throwaway; batted at the line
            out.append((p, b['b'], res))
    else:
        for p in jl(files[0]):
            if p['kind'] != 'pass' or p.get('target') is None or 'pass_arrived' not in p['events'] or not p.get('bxy'): continue
            lab = p.get('labels', {}); ev = lab.get('ballEvents', [])
            if lab.get('throwaway'): continue
            res = 'IN' if 'interception' in ev else 'C' if ('catch' in ev or 'secure' in ev) else 'I'
            out.append((p, p['bxy'], res, [e for e in ev if e not in ('secure',)]))
    return kind, out
def measure(p, bxy):
    A = int(round(p['events']['pass_arrived'] / p['dt']))
    if A < 2 or A + 2 >= len(p['xy']) or A >= len(bxy): return None
    t = p['target']; tx, ty = at(p, A, t); bx, by = bxy[A]
    if None in (tx, ty, bx, by): return None
    ds = [j for j, x in enumerate(p['players']) if x['side'] == 'D']
    dist = lambda j, x, y: math.hypot(at(p, A, j)[0] - x, at(p, A, j)[1] - y)
    sepT = min(dist(j, tx, ty) for j in ds); sepB = min(dist(j, bx, by) for j in ds)
    a, b = at(p, A - 2, t), at(p, A + 2, t)
    spd = math.hypot(b[0] - a[0], b[1] - a[1]) / (4 * p['dt'])
    return dict(air=bx, miss=math.hypot(bx - tx, by - ty), sepT=sepT, sepB=sepB, spd=spd)
def pct(n, d): return f'{100 * n / d:5.1f}%' if d else '    - '
def med(v): v = sorted(v); return v[len(v) // 2] if v else float('nan')
for spec in args:
    kind, plays = load(spec); rows = []
    for rec in plays:
        m = measure(rec[0], rec[1])
        if m: m['res'] = rec[2]; m['tag'] = rec[3] if len(rec) > 3 else []; rows.append(m)
    allr = [r for r in rows]; B = [r for r in rows if lo <= r['air'] < hi]
    print(f'\n== {kind}: {len(allr)} passes with an arrival and a ball track; band air {lo:g}-{hi:g} yd: {len(B)}')
    print(f'  completion, all {pct(sum(r["res"] == "C" for r in allr), len(allr))} | band {pct(sum(r["res"] == "C" for r in B), len(B))} (INT {pct(sum(r["res"] == "IN" for r in B), len(B))})')
    for a, b in ((-99, 0), (0, 5), (5, 10), (10, 20), (20, 99)):
        S = [r for r in allr if a <= r['air'] < b]
        if len(S) >= 20: print(f'  air {a:>4} to {b:>3}: n {len(S):4d} completion {pct(sum(r["res"] == "C" for r in S), len(S))}')
    inc = [r for r in B if r['res'] != 'C']
    nc = [r for r in inc if r['miss'] > CATCHABLE]; ob = [r for r in inc if r['miss'] <= CATCHABLE and r['sepB'] < ON_BALL]; cu = [r for r in inc if r['miss'] <= CATCHABLE and r['sepB'] >= ON_BALL]
    print(f'  incompletions in the band {len(inc)} = {pct(len(inc), len(B))} of passes: not catchable (miss > {CATCHABLE}) {pct(len(nc), len(inc))} = {pct(len(nc), len(B))} of passes | defender on the ball (sepB < {ON_BALL}) {pct(len(ob), len(inc))} = {pct(len(ob), len(B))} | catchable and uncontested {pct(len(cu), len(inc))} = {pct(len(cu), len(B))}')
    print(f'  miss at arrival median completions {med([r["miss"] for r in B if r["res"] == "C"]):.2f} incompletions {med([r["miss"] for r in inc]):.2f} yd; share of ALL band passes with miss <= {CATCHABLE}: {pct(sum(r["miss"] <= CATCHABLE for r in B), len(B))}')
    print('  separation at arrival (target to nearest defender): ' + ' | '.join(f'{a}-{b} yd: n {len(S):4d} comp {pct(sum(r["res"] == "C" for r in S), len(S))}' for a, b in ((0, 1), (1, 2), (2, 4), (4, 99)) for S in [[r for r in B if a <= r['sepT'] < b]]) + f' | median {med([r["sepT"] for r in B]):.1f} yd (comp {med([r["sepT"] for r in B if r["res"] == "C"]):.1f}, inc {med([r["sepT"] for r in inc]):.1f})')
    print('  completion given a catchable ball (miss <= %.1f): ' % CATCHABLE + ' | '.join(f'sepB {a}-{b}: n {len(S):4d} {pct(sum(r["res"] == "C" for r in S), len(S))}' for a, b in ((0, 1), (1, 2), (2, 99)) for S in [[r for r in B if r['miss'] <= CATCHABLE and a <= r['sepB'] < b]]))
    print('  by the target\'s speed at arrival: ' + ' | '.join(f'{a}-{b}: n {len(S):4d} {pct(sum(r["res"] == "C" for r in S), len(S))}' for a, b in ((0, 2), (2, 4), (4, 6), (6, 8), (8, 20)) for S in [[r for r in B if a <= r['spd'] < b]]))
    if kind.startswith('sim'):
        tags = C.Counter(t for r in inc for t in r['tag'] if t not in ('catch',))
        print(f'  sim\'s own labels on those incompletions (cross-check, not the operator): {dict(tags)}')
