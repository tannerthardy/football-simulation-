"""Flat catches conditioned on the outcome, and the open-flat catches classed by the owner's state (ours). Same format and operator as flat_yac_report.py.
  python3 -I scripts/diag/census/flat_open_report.py NFL.jsonl.gz SIM.jsonl.gz [SIM2 ...] [--out report.md] [--rows rows.json] [--games-nfl N] [--games-ours N]

Part A: among completions with 10+ and 15+ YAC: the share that are flat catches (screens apart), and for those the nearest defender at the catch (median, quartiles, share over 5 / 8 / 10 yd) and defenders within 8 yd. The reverse: flat catches with the nearest defender over
8 yd at the catch, per game, the YAC they yield per game and per catch. NFL games = the distinct games in the sample; ours 24. Ours: the calls (coverage, concept, formation, motion, play action) of the open-flat 10+ YAC plays, top ten by yards, with the owning seat and what he was doing.
Part B (ours only): each open-flat catch (nearest defender over 8 yd at the catch) classed by its owner's state at the throw. Owner by the call = the man whose assignment on the first tick is this receiver, else the zone seat whose landmark (his position on the first tick if none)
is nearest the catch point within 9 yd. Classes: (a) no seat owns that flat by the call; (b) the owner left for something else (his behavior at the throw is no longer the one he was called to: rush / blitz / run fit / pursuit, or man on another receiver, or a zone seat now matching another
receiver), named by what the engine holds for him; (d) blocked or picked (within 1.2 yd of an offensive player other than the passer and the catcher for 0.3 s or more between the throw and the catch); (c) on it but too far to arrive (his distance to the catch point at the throw
less what he can cover at 7.5 yd/s in the ball's flight is over 1 yd), split too deep (3+ yd deeper than the catch) and too far inside; (e) otherwise (on it and able to arrive)."""
import gzip, json, sys, math, collections, importlib.util, os
import numpy as np
args = [a for i, a in enumerate(sys.argv) if i > 0 and not a.startswith('--') and sys.argv[i - 1] not in ('--out', '--rows', '--games-nfl', '--games-ours')]
opt = lambda n, d=None: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
OUT, ROWS = opt('--out'), opt('--rows')
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('flat', os.path.join(here, 'flat_yac_report.py'))
src_txt = open(os.path.join(here, 'flat_yac_report.py')).read().split("lines = []; P = lambda")[0]
ns = {'__file__': os.path.join(here, 'flat_yac_report.py'), '__name__': 'flatlib'}
sys.argv_backup = sys.argv; sys.argv = [sys.argv[0]] + args[:0]
exec(compile(src_txt, 'flat_yac_report.py', 'exec'), ns); sys.argv = sys.argv_backup
rows_of, owner_of, pr, q3 = ns['rows_of'], ns['owner_of'], ns['pr'], ns['q3']
nfl = rows_of([args[0]], 'nfl'); sim = rows_of(args[1:], 'sim')
games_nfl = int(opt('--games-nfl', len({r['id'].split('-')[0] for r in nfl}))); games_sim = int(opt('--games-ours', 24))
lines = []; P = lambda s='': lines.append(s)

def d1_at_catch(R):
    X, Y, c, r, pl = R['X'], R['Y'], R['c'], R['r'], R['p']['players']
    ds = [math.hypot(X[i, c] - X[r, c], Y[i, c] - Y[r, c]) for i, q in enumerate(pl) if q['side'] == 'D']
    return min(ds), sum(1 for d in ds if d <= 8.0)
for R in nfl + sim: R['d1'], R['n8'] = d1_at_catch(R)
flat = lambda R: R['flat'] and not R['screen']

P('## Part A: the outcome, then the flat\n')
P(f'NFL {len(nfl)} completions in {games_nfl} games; ours {len(sim)} in {games_sim} games.\n')
P('### Among completions with big YAC: how many are flat catches, and how open\n')
P('| YAC | | completions | per game | flat (screens apart) share | screens share | nearest defender at the catch, flat ones: p50 (p25-p75) | share over 5 / 8 / 10 yd | defenders within 8 yd (mean) | nearest, all big-YAC: p50 (p25-p75) |'); P('|---|---|---|---|---|---|---|---|---|---|')
for thr in (10, 15):
    for lab, rows, g in (('NFL', nfl, games_nfl), ('ours', sim, games_sim)):
        big = [R for R in rows if R['yac'] >= thr]; fl = [R for R in big if flat(R)]; sc = [R for R in big if R['screen']]
        d = [R['d1'] for R in fl]
        P(f'| {thr}+ | {lab} | {len(big)} | {len(big) / g:.2f} | {len(fl) / max(len(big), 1):.3f} | {len(sc) / max(len(big), 1):.3f} | {q3(d)} | {np.mean([x > 5 for x in d]):.2f} / {np.mean([x > 8 for x in d]):.2f} / {np.mean([x > 10 for x in d]):.2f} | {np.mean([R["n8"] for R in fl]):.2f} | {q3([R["d1"] for R in big])} |')
P('')
P('### The reverse: flat catches with the nearest defender over 8 yd at the catch (open flats), per game\n')
P('| | flat catches per game | open flats per game | open share of flat catches | YAC per open flat: p50 / mean | open-flat YAC per game | share 10+ YAC | all-flat YAC per game | open-flat share of all YAC |'); P('|---|---|---|---|---|---|---|---|---|')
for lab, rows, g in (('NFL', nfl, games_nfl), ('ours', sim, games_sim)):
    fl = [R for R in rows if flat(R)]; op = [R for R in fl if R['d1'] > 8.0]; ya = [R['yac'] for R in op]
    P(f'| {lab} | {len(fl) / g:.2f} | {len(op) / g:.2f} | {len(op) / max(len(fl), 1):.3f} | {pr(ya, 50):.1f} / {np.mean(ya):.1f} | {sum(ya) / g:.1f} | {np.mean([y >= 10 for y in ya]):.3f} | {sum(R["yac"] for R in fl) / g:.1f} | {sum(ya) / max(sum(R["yac"] for R in rows), 1e-9):.4f} |')
P('')

opn = [R for R in sim if flat(R) and R['d1'] > 8.0]
def call_key(R):
    p = R['p']; return (p.get('cov'), p.get('concept'), p.get('form'), 'motion' if p.get('motion') else '-', 'PA' if p.get('pa') else '-')
def owner_info(R):
    o = owner_of(R)
    return o if o else ('(none)', '', '')
P('### Ours: the open-flat big-YAC plays (flat, nearest over 8 yd, 10+ YAC), top ten by yards\n')
big = sorted([R for R in opn if R['yac'] >= 10], key=lambda R: -R['yac'])
P(f'{len(big)} plays; their YAC {sum(R["yac"] for R in big):.0f} yd of {sum(R["yac"] for R in sim):.0f} (all ours, {games_sim} games).\n')
P('| yards | play | coverage | concept | formation | motion / PA | receiver | nearest at the catch | owner by the call, at the throw |'); P('|---|---|---|---|---|---|---|---|---|')
for R in big[:10]:
    c = call_key(R); o = owner_info(R)
    P(f'| {R["yac"]:.0f} | {R["id"]} | {c[0]} | {c[1]} | {c[2]} | {c[3]} / {c[4]} | {R["p"]["players"][R["r"]]["slot"]} ({R["typ"]}) | {R["d1"]:.1f} yd | {o[0]}: {o[2] or o[1]} |')
P('')
gk = collections.defaultdict(lambda: [0, 0.0])
for R in big: gk[call_key(R)][0] += 1; gk[call_key(R)][1] += R['yac']
P('By call (coverage, concept, formation, motion, PA), yards: ' + '; '.join(f'{" / ".join(k)} x{v[0]} = {v[1]:.0f}' for k, v in sorted(gk.items(), key=lambda kv: -kv[1][1])[:10]) + '\n')

# Part B
def snap_entry(p, slot): return next((e for e in (p.get('def') or {}).get('snap', []) if e.get('slot') == slot), None)
def rel_entry(p, slot): return next((e for e in (p.get('def') or {}).get('rel', []) if e.get('slot') == slot), None)
def called_owner(R):
    p = R['p']; sn = (p.get('def') or {}).get('snap') or []; pl = p['players']; slot = pl[R['r']].get('slot'); cx, cy = R['cx'], R['cy']
    man = [e for e in sn if e.get('kind') == 'man' and e.get('target') == slot]
    if man: return man[0]['slot']
    best = None
    for e in sn:
        if e.get('kind') != 'zone': continue
        j = next((i for i, q in enumerate(pl) if q['side'] == 'D' and q.get('slot') == e['slot']), None)
        if j is None: continue
        if e.get('lm'): d = math.hypot(e['lm'][0] - cx, e['lm'][1] - cy)
        else: d = math.hypot(float(R['X'][j, min(1, R['nf'] - 1)]) - cx, float(R['Y'][j, min(1, R['nf'] - 1)]) - cy) + 2.0
        if d <= 9.0 and (best is None or d < best[0]): best = (d, e['slot'])
    return best[1] if best else None
def classify(R):
    p = R['p']; pl = p['players']; X, Y, rel, c = R['X'], R['Y'], p['rel'], R['c']; own = called_owner(R)
    if own is None:
        sn_ = (p.get('def') or {}).get('snap') or []; best = None
        for e in sn_:
            if e.get('kind') != 'zone' or not e.get('lm'): continue
            d = math.hypot(e['lm'][0] - R['cx'], e['lm'][1] - R['cy'])
            if best is None or d < best[0]: best = (d, e['slot'])
        R['nearest_lm'] = best
        return 'a', 'no seat owns it by the call', None
    j = next(i for i, q in enumerate(pl) if q['side'] == 'D' and q.get('slot') == own)
    sn, rl = snap_entry(p, own), rel_entry(p, own); rslot = pl[R['r']].get('slot')
    ks, kr = (sn or {}).get('kind'), (rl or {}).get('kind')
    desc = lambda e: (e.get('kind') or '?') + ('→' + e['target'] if e.get('target') else '') if e else '?'
    left = None
    if kr in ('rush', 'blitz'): left = f'blitz / rush ({kr})'
    elif kr == 'run-fit': left = 'run fit' + (' (play-action)' if p.get('pa') else '')
    elif kr in ('pursuit', 'scramble-ball'): left = kr
    elif ks == 'man' and not (kr == 'man' and rl.get('target') == rslot): left = f'man reassigned to {rl.get("target") if kr == "man" else kr} (' + ('motion' if p.get('motion') else 'no motion') + ')'
    elif ks == 'zone' and kr == 'man' and rl.get('target') != rslot: left = f'zone seat now man on {rl.get("target")}'
    elif ks == 'zone' and kr == 'zone' and rl.get('target') and rl.get('target') != rslot: left = f'zone seat matching {rl["target"]}'
    if left: return 'b', left + f' [{desc(sn)} → {desc(rl)}]', own
    # blocked / picked
    offs = [i for i, q in enumerate(pl) if q['side'] == 'O' and i != R['r'] and i != p['qb']]; n = 0
    for f in range(rel, c + 1):
        if f < R['nf'] and any(math.hypot(X[i, f] - X[j, f], Y[i, f] - Y[j, f]) <= 1.2 for i in offs): n += 1
    if n >= 3: return 'd', 'blocked or picked', own
    dist = math.hypot(X[j, rel] - R['cx'], Y[j, rel] - R['cy']); fly = (c - rel) / 10.0
    if dist - 7.5 * fly > 1.0:
        if X[j, rel] - R['cx'] >= 3.0: return 'c', 'on it but too deep', own
        mid = 26.67; inside = (abs(R['cy'] - mid) - abs(Y[j, rel] - mid))
        return 'c', ('on it but too far inside' if inside >= 3.0 else 'on it but too far'), own
    return 'e', 'on it and able to arrive', own
P('## Part B (ours): each open-flat catch by the owner\'s state at the throw\n')
P(f'{len(opn)} open-flat catches in {games_sim} games ({len(opn) / games_sim:.2f} per game).\n')
cl = collections.defaultdict(list); rows_out = []
for R in opn:
    k, why, own = classify(R); cl[k].append((R, why, own))
    p = R['p']; c = call_key(R)
    rows_out.append(dict(nearest_lm=R.get('nearest_lm'), id=R['id'], cls=k, why=why, owner=own, snap=snap_entry(p, own) if own else None, throw=rel_entry(p, own) if own else None, receiver=p['players'][R['r']].get('slot'), recv_type=R['typ'], catch=[round(R['cx'], 1), round(R['cy'], 1)],
                         d1=round(R['d1'], 1), yac=round(R['yac'], 1), cov=c[0], concept=c[1], form=c[2], motion=bool(p.get('motion')), pa=bool(p.get('pa')), rel=p['rel'], catch_frame=R['c']))
names = {'a': '(a) no seat owns that flat by the call', 'b': '(b) the owner left for something else', 'c': '(c) the owner is on it but too far to arrive', 'd': '(d) the owner was blocked or picked', 'e': '(e) on it and able to arrive'}
P('| class | catches | per game | YAC total | YAC mean | share 10+ |'); P('|---|---|---|---|---|---|')
for k in 'abcde':
    v = cl.get(k, [])
    if v: P(f'| {names[k]} | {len(v)} | {len(v) / games_sim:.2f} | {sum(R["yac"] for R, _, _ in v):.0f} | {np.mean([R["yac"] for R, _, _ in v]):.1f} | {np.mean([R["yac"] >= 10 for R, _, _ in v]):.2f} |')
P('')
va = cl.get('a', [])
if va:
    byc = collections.Counter(R['p'].get('cov') for R, _, _ in va); yc = collections.defaultdict(float)
    for R, _, _ in va: yc[R['p'].get('cov')] += R['yac']
    nl = [R['nearest_lm'][0] for R, _, _ in va if R.get('nearest_lm')]
    P(f'Class (a) by called coverage: ' + '; '.join(f'{c} x{n} ({yc[c]:.0f} yd)' for c, n in byc.most_common(10)) + f'. Distance from the catch point to the nearest zone landmark of the call: p50 {pr(nl, 50):.1f}, p25-p75 {pr(nl, 25):.1f}-{pr(nl, 75):.1f} yd (n {len(nl)}); man calls with no man on him: {sum(1 for R, _, _ in va if R.get("nearest_lm") is None)}.\n')
for k in 'bc':
    v = cl.get(k, [])
    if not v: continue
    cnt = collections.Counter(w.split(' [')[0] for _, w, _ in v); ya = collections.defaultdict(float)
    for R, w, _ in v: ya[w.split(' [')[0]] += R['yac']
    P(f'Class {k} detail: ' + '; '.join(f'{w} x{n} ({ya[w]:.0f} yd)' for w, n in cnt.most_common(8)) + '\n')
txt = '\n'.join(lines)
if OUT: open(OUT, 'w').write(txt)
if ROWS: json.dump(rows_out, open(ROWS, 'w'))
print(txt)
