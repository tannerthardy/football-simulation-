"""Call-mix diagnosis (docs/reviews/2026-11-11-call-mix.md): concept x coverage yield, counterfactual defensive
adjustment, per-quarter drift, read order and routes-run shares, sim vs NFL. Report only.
  python3 -I scripts/diag/call-mix/cm.py out/call-mix/plays.jsonl out/call-mix/nfl.jsonl
Inputs from collect.ts and nfl_calls.py in this directory."""
import json, sys, math, collections
from statistics import mean
S = [json.loads(l) for l in open(sys.argv[1])]
N = [json.loads(l) for l in open(sys.argv[2])]
P = [r for r in S if r['rec'] == 'play' and r['callKind'] == 'pass']
OO = [r for r in S if r['rec'] == 'oobs']; DO = [r for r in S if r['rec'] == 'dobs']
LABEL = {'hitch': 'HITCH', 'curl': 'HITCH', 'comeback': 'HITCH', 'stick': 'HITCH', 'hook': 'HITCH',
         'quick_out': 'OUT', 'out': 'OUT', 'deep_out': 'OUT', 'arrow': 'FLAT', 'flat': 'FLAT', 'back_flat': 'FLAT', 'swing': 'FLAT',
         'checkdown': 'FLAT', 'checkdown*': 'FLAT', 'angle': 'ANGLE', 'dig': 'IN', 'short_in': 'IN', 'slant': 'SLANT',
         'go': 'GO', 'fade': 'GO', 'seam': 'GO', 'seam_read': 'GO', 'post': 'POST', 'corner': 'CORNER',
         'shallow': 'CROSS', 'shallow_high': 'CROSS', 'cross': 'CROSS', 'wheel': 'WHEEL'}
def band(a): return None if a is None else '<10' if a < 10 else '10-19' if a < 20 else '20+'
def klass(label, air):
    """Concept class of the targeted route, same rule both sides."""
    if label is None: return None
    if label in ('FLAT', 'ANGLE', 'SCREEN'): return 'flat/screen/angle'
    if label in ('HITCH', 'OUT', 'IN', 'SLANT', 'CORNER') and air is not None:
        if air < 10: return 'quick <10'
        if air < 20: return 'breaking 10-19'
    if label == 'CROSS': return 'cross'
    return 'vertical/deep'
for r in P:
    t = r['target']; r['label'] = LABEL.get(t['route']) if t else None
    r['k'] = klass(r['label'], r['air']); r['res'] = 'S' if r['sack'] else 'IN' if r['int'] else 'C' if r['cmp'] else 'I' if r['att'] else 'R'
    r['covF'] = 'cover2' if r['covFamily'] == 'tampa2' else r['covFamily']
for r in N: r['k'] = klass(r['route'], r['air']); r['covF'] = r['covFamily']
def yields(rows):
    att = [r for r in rows if r['res'] in ('C', 'I', 'IN')]
    if not att: return None
    c = [r for r in att if r['res'] == 'C']
    return dict(n=len(att), cmp=100 * len(c) / len(att), ypa=mean(r['yards'] for r in att),
                yac=mean(r['yac'] for r in c if r['yac'] is not None) if c else float('nan'), int=100 * sum(r['res'] == 'IN' for r in att) / len(att))
def fmt(y): return '-' if not y else f"n{y['n']:4} cmp{y['cmp']:4.0f}% {y['ypa']:5.1f}yd yac{y['yac']:4.1f} int{y['int']:3.1f}%"
KS = ['quick <10', 'flat/screen/angle', 'cross', 'breaking 10-19', 'vertical/deep']
COVS = ['cover0', 'cover1', 'cover2man', 'cover2', 'cover3', 'cover4', 'cover6']
games = sorted({r['seed'] for r in P})
print(f"population: sim {len(games)} games seeds {games[0]}-{games[-1]}, league-sampled identities, {len(P)} called passes; NFL BDB 2025 wk 1-9, {len(N)} dropbacks (no spikes/kneels)\n")

print('== 0. Target share by class (attempts)')
for nm, R in (('sim', P), ('NFL', N)):
    att = [r for r in R if r['res'] in ('C', 'I', 'IN') and r['k']]
    c = collections.Counter(r['k'] for r in att)
    print(f"  {nm:4}", '  '.join(f"{k} {100 * c[k] / len(att):4.1f}%" for k in KS), f'(n {len(att)})')
print('\n== 1. Yield by class (attempts): sim | NFL')
for k in KS:
    print(f"  {k:18} {fmt(yields([r for r in P if r['k'] == k]))} | {fmt(yields([r for r in N if r['k'] == k]))}")
print('\n== 2. Class x coverage family (attempts): sim | NFL')
for k in KS:
    print(f"  -- {k}")
    for cv in COVS:
        print(f"    {cv:10} {fmt(yields([r for r in P if r['k'] == k and r['covF'] == cv]))} | {fmt(yields([r for r in N if r['k'] == k and r['covF'] == cv]))}")
print('\n== 3. Class x rushers (attempts) and sack/int per dropback: sim | NFL')
def rb(n): return '3-' if n <= 3 else '4' if n == 4 else '5' if n == 5 else '6+'
for k in KS + ['all']:
    for b in ('3-', '4', '5', '6+'):
        f = lambda R: [r for r in R if rb(r['rushers']) == b and (k == 'all' or r['k'] == k)]
        line = f"  {k:18} {b:3} {fmt(yields(f(P)))} | {fmt(yields(f(N)))}"
        if k == 'all':
            sp = [r for r in P if rb(r['rushers']) == b]; sn = [r for r in N if rb(r['rushers']) == b]
            line += f"  || dropbacks sim {len(sp)} ({100 * len(sp) / len(P):.1f}%) sack {100 * sum(r['res'] == 'S' for r in sp) / max(1, len(sp)):.1f}% ypp {mean(r['yards'] for r in sp) if sp else 0:.2f}"
            line += f" | NFL {len(sn)} ({100 * len(sn) / len(N):.1f}%) sack {100 * sum(r['res'] == 'S' for r in sn) / max(1, len(sn)):.1f}% ypp {mean(r['yards'] for r in sn if r['yards'] is not None):.2f}"
        print(line)

# ---------------- counterfactuals on called concepts (calls are independent draws, so concept x coverage cells are randomised)
print('\n== 4. Concept x coverage family: yards a dropback (incl. sacks/scrambles), sim')
by = collections.defaultdict(list)
for r in P: by[(r['concept'], r['covF'])].append(r['yards'])
cons = sorted({r['concept'] for r in P})
allm = mean(r['yards'] for r in P)
cm = {c: mean(r['yards'] for r in P if r['concept'] == c) for c in cons}
covm = {v: mean(r['yards'] for r in P if r['covF'] == v) for v in COVS if any(r['covF'] == v for r in P)}
K = 8  # shrink each cell toward the additive (concept + coverage) prediction with K pseudo-plays
def cell(c, v):
    ys = by.get((c, v), []); pred = cm[c] + covm[v] - allm
    return (sum(ys) + K * pred) / (len(ys) + K), len(ys)
print('  ' + ' ' * 14 + ''.join(f'{v:>14}' for v in covm) + '   all')
for c in cons:
    print(f"  {c:14}" + ''.join(f"{cell(c, v)[0]:8.1f} ({cell(c, v)[1]:3})" for v in covm) + f"  {cm[c]:5.2f} n{sum(1 for r in P if r['concept'] == c)}")
print(f"  {'all':14}" + ''.join(f"{covm[v]:8.1f} ({sum(1 for r in P if r['covF'] == v):3})" for v in covm) + f"  {allm:5.2f}")
for excl in ((), ('cover0',)):
    BIG = [v for v in covm if sum(1 for r in P if r['covF'] == v) >= 50 and v not in excl]
    best = {c: min(BIG, key=lambda v: cell(c, v)[0]) for c in cons}
    ub = mean(cell(r['concept'], best[r['concept']])[0] for r in P)
    print(f"  upper bound, always the best of {', '.join(BIG)} per concept (shrunk cells; oracle of the call, minima biased low): {ub:.2f}")
    print('    best family:', best)
print(f"  today {allm:.2f} yd a pass play")
# What the class mix says: which coverage holds breaking 10-19 to NFL yield?
# Realistic: per game and defence, after it has seen N completed/targeted throws in class 'breaking 10-19',
# it moves share p of its coverage mix to the family that best answers that class (pooled over the sim table),
# on every later pass of that game. Expected yards of a later play = (1-p)*actual + p*cell(concept, answer).
ans = min(covm, key=lambda v: (yields([r for r in P if r['k'] == 'breaking 10-19' and r['covF'] == v]) or {'ypa': 99})['ypa'] if sum(1 for r in P if r['k'] == 'breaking 10-19' and r['covF'] == v) >= 20 else 99)
print(f"  answer to 'breaking 10-19' (lowest yd/att, n>=20): {ans}")
for Nn in (2, 3):
    for p in (0.3, 0.5):
        tot = 0; n = 0
        for g in games:
            for off in {r['off'] for r in P if r['seed'] == g}:
                seen = 0
                for r in sorted((r for r in P if r['seed'] == g and r['off'] == off), key=lambda r: r['play']):
                    y = r['yards']
                    if seen >= Nn: y = (1 - p) * y + p * cell(r['concept'], ans)[0]
                    tot += y; n += 1
                    if r['k'] == 'breaking 10-19': seen += 1
        print(f"  realistic N={Nn} p={p}: {tot / n:.2f}")
    # also with the per-concept best answer known only after N throws of that concept (perfect learning per concept)
for Nn in (2, 3):
    tot = 0; n = 0
    for g in games:
        for off in {r['off'] for r in P if r['seed'] == g}:
            seen = collections.Counter()
            for r in sorted((r for r in P if r['seed'] == g and r['off'] == off), key=lambda r: r['play']):
                y = r['yards']
                if seen[r['k']] >= Nn and r['k'] == 'breaking 10-19': y = 0.5 * y + 0.5 * cell(r['concept'], ans)[0]
                tot += y; n += 1; seen[r['k']] += 1
    print(f"  oracle-ish (only breaking-class plays, p=.5, after N={Nn}): {tot / n:.2f}")
nfl_ypp = mean(r['yards'] for r in N if r['yards'] is not None)
print(f"  NFL yards a dropback {nfl_ypp:.2f}")

# ---------------- per-quarter drift
print('\n== 5. Per quarter: offence class shares (targets) and called-concept shares; defence family/pressure shares')
for q in (1, 2, 3, 4):
    R = [r for r in P if r['q'] == q]; att = [r for r in R if r['k']]
    if not R: continue
    c = collections.Counter(r['k'] for r in att); f = collections.Counter(r['covF'] for r in R)
    print(f"  Q{q} n{len(R):4} tgt: " + ' '.join(f"{k.split()[0]} {100 * c[k] / max(1, len(att)):4.1f}" for k in KS)
          + ' | cov: ' + ' '.join(f"{v[5:]} {100 * f[v] / len(R):4.1f}" for v in COVS) + f" | pressure {100 * sum(1 for r in R if r['pressure']) / len(R):4.1f}% rush>=5 {100 * sum(r['rushers'] >= 5 for r in R) / len(R):4.1f}%")
for q in (1, 2, 3, 4):
    R = [r for r in N if r['q'] == q]; att = [r for r in R if r['k'] and r['res'] in ('C', 'I', 'IN')]
    c = collections.Counter(r['k'] for r in att); f = collections.Counter(r['covF'] for r in R)
    print(f"  NFL Q{q} n{len(R):4} tgt: " + ' '.join(f"{k.split()[0]} {100 * c[k] / max(1, len(att)):4.1f}" for k in KS)
          + ' | cov: ' + ' '.join(f"{v[5:]} {100 * f[v] / len(R):4.1f}" for v in COVS) + f" | rush>=5 {100 * sum(r['rushers'] >= 5 for r in R) / len(R):4.1f}%")

# learned multipliers, start vs end of game (offence keys by family, defence keys)
def mult(obs, sign):
    l = collections.defaultdict(lambda: [0, 0.0])
    for o in obs: l[o['key']][0] += 1; l[o['key']][1] += o['success']
    out = {}
    for k, (n, s) in l.items():
        rate = (s + 0.45 * 3) / (n + 3); out[k] = 1 if n < 2 else math.exp(sign * (rate - 0.45) * (2.2 if sign > 0 else 2.0))
    return out, l
print('\n== 6. Learned multipliers at game end (mean over team-games; 1.0 = prior), and how many calls they rest on')
acc = collections.defaultdict(list); accn = collections.defaultdict(list)
for g in range(len(games)):
    for team in {o['team'] for o in OO if o['game'] == g}:
        m, l = mult([o for o in OO if o['game'] == g and o['team'] == team], 1)
        for k in m: acc[k].append(m[k]); accn[k].append(l[k][0])
for k in sorted(acc, key=lambda k: -mean(acc[k])):
    if k.startswith('pass'): print(f"  O {k:28} x{mean(acc[k]):.2f} (min {min(acc[k]):.2f} max {max(acc[k]):.2f}) calls/game {mean(accn[k]):.1f}")
acc = collections.defaultdict(list); accn = collections.defaultdict(list)
for g in range(len(games)):
    for team in {o['team'] for o in DO if o['game'] == g}:
        m, l = mult([o for o in DO if o['game'] == g and o['team'] == team], -1)
        for k in m: acc[k].append(m[k]); accn[k].append(l[k][0])
for k in sorted(acc, key=lambda k: -mean(acc[k])):
    print(f"  D {k:28} x{mean(acc[k]):.2f} (min {min(acc[k]):.2f} max {max(acc[k]):.2f}) calls/game {mean(accn[k]):.1f}")
# call share of each concept, first half vs second half
print('\n== 7. Called concept share, 1st half vs 2nd half (sim)')
h1 = collections.Counter(r['concept'] for r in P if r['q'] <= 2); h2 = collections.Counter(r['concept'] for r in P if r['q'] >= 3)
n1, n2 = sum(h1.values()), sum(h2.values())
for c in sorted(cons, key=lambda c: -(h1[c] + h2[c])):
    print(f"  {c:14} {100 * h1[c] / n1:5.1f}% -> {100 * h2[c] / n2:5.1f}%   success-yield {cm[c]:5.2f} yd a dropback")

# ---------------- decomposition: how much of the yards-a-throw excess is the class mix vs yield within a class
print('\n== 8. Mix vs yield (attempts with a class)')
def share_y(R):
    att = [r for r in R if r['res'] in ('C', 'I', 'IN') and r['k']]
    c = collections.Counter(r['k'] for r in att)
    return {k: c[k] / len(att) for k in KS}, {k: mean(r['yards'] for r in att if r['k'] == k) for k in KS}, mean(r['yards'] for r in att)
ss, sy, sm = share_y(P); ns, ny, nm = share_y(N)
print(f"  sim yd/att {sm:.2f}; NFL {nm:.2f}; gap {sm - nm:+.2f}")
print(f"  sim yields x NFL mix {sum(ns[k] * sy[k] for k in KS):.2f}  (mix share of gap {(sm - sum(ns[k] * sy[k] for k in KS)) / (sm - nm):.0%})")
print(f"  NFL yields x sim mix {sum(ss[k] * ny[k] for k in KS):.2f}  (yield share of gap {(sm - sum(ss[k] * ny[k] for k in KS)) / (sm - nm):.0%})")
sk = lambda R: 100 * sum(r['res'] == 'S' for r in R) / len(R)
print(f"  sack rate per dropback sim {sk(P):.1f}% NFL {sk(N):.1f}%; scramble (R) sim {100 * sum(r['res'] == 'R' for r in P) / len(P):.1f}% NFL {100 * sum(r['res'] == 'R' for r in N) / len(N):.1f}%")

# ---------------- read order (playbook) vs where targets go
PROG = next(r['prog'] for r in S if r['rec'] == 'prog')
print('\n== 9. Per concept: target share by read number (#1, #2, #3+, off-progression) and by route (sim)')
for c in sorted(PROG, key=lambda c: -sum(1 for r in P if r['concept'] == c)):
    R = [r for r in P if r['concept'] == c and r['target'] and r['att']]
    if not R: continue
    idx = collections.Counter(min(PROG[c].index(r['target']['ref']), 2) if r['target']['ref'] in PROG[c] else 'off' for r in R)
    rt = collections.Counter(r['target']['route'] for r in R)
    print(f"  {c:13} n{len(R):3} #1 {100 * idx[0] / len(R):3.0f}% #2 {100 * idx[1] / len(R):3.0f}% #3+ {100 * idx[2] / len(R):3.0f}% off {100 * idx['off'] / len(R):3.0f}% | "
          + ' '.join(f"{k} {100 * v / len(R):.0f}" for k, v in rt.most_common(4)) + f" | ypa {mean(r['yards'] for r in R):.1f}")
print('\n== 10. Routes run share by NFL label (every route on a called pass), sim vs NFL; and target share')
rs = collections.Counter(LABEL.get(x['route'], x['route']) for r in P for x in r['routes'] if x['route'] not in ('block',))
rn = collections.Counter(x for r in N for x in r['routes'])
ts = collections.Counter(r['label'] for r in P if r['att'] and r['label']); tn = collections.Counter(r['route'] for r in N if r['res'] in ('C', 'I', 'IN') and r['route'])
S1, S2, T1, T2 = sum(rs.values()), sum(rn.values()), sum(ts.values()), sum(tn.values())
for k in sorted(set(rn) | set(rs), key=lambda k: -rn.get(k, 0)):
    print(f"  {k:8} run {100 * rs[k] / S1:5.1f}% vs {100 * rn[k] / S2:5.1f}%   targeted {100 * ts[k] / T1:5.1f}% vs {100 * tn[k] / T2:5.1f}%")
