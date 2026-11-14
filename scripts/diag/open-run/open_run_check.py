# Verify nfl_open_run (coverage/C14-int-diag): reproduces its rows, drops player-plays whose pre-snap shoulders point the wrong way (flipped `o`), splits steady frames, plots samples (matplotlib optional: pip install --target out/pylib matplotlib), and compares the sim cap in yd/s.
# Order: python3 -I scripts/diag/open-run/flip_check.py 1,2,3 ; node --import tsx scripts/diag/open-run/profiles.ts > out/open-run/profiles.json ; python3 -I scripts/diag/open-run/open_run_check.py 1,2,3 clean
# Verify nfl_open_run.py (coverage/C14-int-diag): reproduce its rows, split steady vs transitional frames, plot samples.
import csv, sys, math, random, collections as C
S = 'out/open-run'
sys.path.insert(0, 'out/pylib')
D = 'data/raw/bdb2025/big-data-bowl-data'
W = sys.argv[1].split(',')
POS = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
DROP = {(r['gameId'], r['playId']) for r in csv.DictReader(open(f'{D}/plays.csv')) if r['isDropback'] in ('TRUE', 'True')}
import json as _j
FLAG = set(_j.load(open(S + '/flagged.json'))) if len(sys.argv) > 2 and sys.argv[2] == 'clean' else set()
tr = C.defaultdict(list)  # (game, play, nflId) -> frames [(x, y, s, o, dir)]
for w in W:
    on = {}
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
        k = (r['gameId'], r['playId'])
        if k not in DROP or r['displayName'] == 'football': continue
        ev = r['event']
        if ev == 'ball_snap': on[k] = True
        if ev in ('pass_arrived', 'pass_outcome_caught', 'pass_outcome_incomplete', 'qb_sack', 'run'): on[k] = False
        if not on.get(k) or r['o'] in ('', 'NA') or r['dir'] in ('', 'NA'): continue
        pos = POS.get(r['nflId'], '?')
        if pos not in ('WR', 'TE', 'CB', 'SS', 'FS', 'RB'): continue
        if f"{k[0]}|{k[1]}|{r['nflId']}" in FLAG: continue
        tr[(k[0], k[1], r['nflId'], 'S' if pos in ('SS', 'FS') else pos)].append((float(r['x']), float(r['y']), float(r['s']), float(r['o']), float(r['dir']), int(r['frameId'])))
own = C.defaultdict(list)
for (g, p, i, grp), F in tr.items():
    for f in F: own[i].append(f[2])
vmax = {i: sorted(v)[int(0.99 * (len(v) - 1))] for i, v in own.items() if len(v) >= 50}
ang = lambda a, b: min(abs(a - b) % 360, 360 - abs(a - b) % 360)
def dang(a, b): return (b - a + 180) % 360 - 180
rows = C.defaultdict(list); steady = C.defaultdict(list); cand = C.defaultdict(list)
for (g, p, i, grp), F in tr.items():
    if i not in vmax: continue
    for n, f in enumerate(F):
        b = int(ang(f[3], f[4]) // 15); sh = f[2] / vmax[i]
        rows[(grp, b)].append(sh)
        if 3 <= n < len(F) - 3 and f[2] >= 3:
            a, c = F[n - 3], F[n + 3]
            st = abs(dang(a[4], c[4])) < 15 and abs(dang(a[3], c[3])) < 20 and abs(dang(a[3], a[4]) - dang(c[3], c[4])) < 25
            steady[(grp, b, st)].append(sh)
            if st and ((grp == 'WR' and 7 <= b <= 8 and f[2] >= 6) or (grp == 'CB' and 5 <= b <= 6 and f[2] >= 5)): cand[(grp, b)].append((g, p, i, n))
q = lambda v, p: sorted(v)[int(p * (len(v) - 1))]
print('reproduction (all frames from the snap to the pass): group bin n p95/p99 share')
for grp in ('WR', 'TE', 'RB', 'CB', 'S'):
    print(grp + ': ' + ' | '.join(f'{b*15}-{b*15+15}: n {len(rows[(grp,b)])} {q(rows[(grp,b)],.95):.2f}/{q(rows[(grp,b)],.99):.2f}' for b in range(12) if len(rows[(grp, b)]) >= 30))
print('\nsteady frames only (s>=3, travel heading within 15 deg and shoulder within 20 deg over +-0.3 s): n p95/p99; share of frames steady')
for grp in ('WR', 'TE', 'RB', 'CB', 'S'):
    out = []
    for b in range(12):
        s, t = steady.get((grp, b, True), []), steady.get((grp, b, False), [])
        if len(s) >= 30: out.append(f'{b*15}-{b*15+15}: steady n {len(s)} {q(s,.95):.2f}/{q(s,.99):.2f} (steady {len(s)/(len(s)+len(t)):.2f})')
    print(grp + ': ' + ' | '.join(out))
# plot samples
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
random.seed(1)
for grp, bs, name in (('WR', (7, 8), 'wr105-135'), ('CB', (5, 6), 'cb75-105')):
    pool = [c for b in bs for c in cand.get((grp, b), [])]
    seen = set(); pick = []
    random.shuffle(pool)
    for c in pool:
        if (c[0], c[1]) in seen: continue
        seen.add((c[0], c[1])); pick.append(c)
        if len(pick) == 12: break
    fig, axs = plt.subplots(3, 4, figsize=(16, 11))
    for ax, (g, p, i, n) in zip(axs.flat, pick):
        F = tr[(g, p, i, grp)]
        lo, hi = max(0, n - 12), min(len(F), n + 13)
        xs = [f[0] for f in F[lo:hi]]; ys = [f[1] for f in F[lo:hi]]
        ax.plot(xs, ys, '-', color='0.7'); ax.plot(xs[0], ys[0], 'o', color='0.5')
        for m in range(lo, hi, 3):
            f = F[m]; col = 'C3' if m == n else 'C0'
            ax.arrow(f[0], f[1], 1.6 * math.sin(math.radians(f[3])), 1.6 * math.cos(math.radians(f[3])), color=col, head_width=0.25, length_includes_head=True)  # shoulders o
            ax.arrow(f[0], f[1], 0.45 * f[2] * math.sin(math.radians(f[4])) * 0.5, 0.45 * f[2] * math.cos(math.radians(f[4])) * 0.5, color='C2', head_width=0.2, length_includes_head=True)  # velocity
        f = F[n]
        ax.set_title(f'{grp} play {p} s {f[2]:.1f} (share {f[2]/vmax[i]:.2f}) |o-dir| {ang(f[3], f[4]):.0f}', fontsize=9)
        ax.set_aspect('equal'); ax.tick_params(labelsize=6)
    fig.suptitle(f'{name}: blue = shoulder orientation o, green = velocity (length ~ speed), red = the frame in the bin; 0.1 s frames, +-1.2 s, arrows every 0.3 s')
    fig.tight_layout(); fig.savefig(f'{S}/{name}.png', dpi=70); plt.close(fig)
    print(name, 'candidates', len(pool), 'plots', len(pick))

print('\nABSOLUTE speeds (yd/s), all frames and steady frames: group bin p50/p95/p99 ; group median of own p99:')
for grp in ('WR', 'TE', 'RB', 'CB', 'S'):
    v = sorted(vmax[i] for (g, p, i, gg) in tr if gg == grp and i in vmax); 
    print(f'{grp}: median own p99 {v[len(v)//2]:.2f}')
    out = []
    for b in (0, 2, 4, 6, 7, 8, 9, 11):
        A = [f[2] for (g, p, i, gg), F in tr.items() if gg == grp and i in vmax for f in F if int(ang(f[3], f[4]) // 15) == b]
        if len(A) < 30: continue
        out.append(f'{b*15}-{b*15+15}: {q(A,.5):.1f}/{q(A,.95):.1f}/{q(A,.99):.1f}')
    print('   all: ' + ' | '.join(out))

import json, math as M
PR = json.load(open(S + '/profiles.json'))
def dsf(sh, bp, deg):
    a = abs(deg) * M.pi / 180; half = M.pi / 2
    if a <= half: return 1 - (1 - sh) * (a / half) ** 2
    return sh + (bp - sh) * (a - half) / half
def implied_hips(sh, bp, share_ratio):
    # smallest hips angle at which the current cap shape gives `share_ratio` (cap factor)
    for d in range(0, 181):
        if dsf(sh, bp, d) <= share_ratio: return d
    return 180
BAND = {}
print('\nCAP vs NFL p95 in yd/s by shoulder angle (bin centre): current cap | NFL p95 | NFL p99 | implied trunk twist T = shoulder angle - hips angle that would put the current cap at NFL p95 (forward-bin p95 = 1.0)')
for grp in ('WR', 'TE', 'RB', 'CB', 'S'):
    p = PR[grp]
    fwd = [f[2] for (g, pl, i, gg), F in tr.items() if gg == grp and i in vmax for f in F if int(ang(f[3], f[4]) // 15) <= 1]
    f95 = q(fwd, .95); out = []
    for b in (4, 5, 6, 7, 8, 9, 10, 11):
        A = [f[2] for (g, pl, i, gg), F in tr.items() if gg == grp and i in vmax for f in F if int(ang(f[3], f[4]) // 15) == b]
        if len(A) < 30: continue
        th = b * 15 + 7.5; cur = p['vmax'] * dsf(p['shuffle'], p['backpedal'], th)
        ratio = q(A, .95) / f95; h = implied_hips(p['shuffle'], p['backpedal'], ratio)
        BAND.setdefault(grp, []).append({'theta': th, 'p95': q(A, .95), 'p99': q(A, .99), 'fwd95': f95, 'n': len(A)})
        out.append(f'{th:.0f}: cur {cur:.1f} | p95 {q(A,.95):.1f} (x{ratio:.2f} of fwd {f95:.1f}) p99 {q(A,.99):.1f} | hips {h} T {th-h:.0f}')
    print(f'{grp} (sim vmax {p["vmax"]:.1f}, shuffle {p["shuffle"]:.2f}, backpedal {p["backpedal"]:.2f}): ' + ' || '.join(out))

json.dump(BAND, open(S + '/nfl-band.json', 'w'))
