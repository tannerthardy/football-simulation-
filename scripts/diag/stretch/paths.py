"""Path plots (snap to 3 s, a dot every 0.1 s) for the same sim cases in two
arms plus NFL plays of the same concept, one panel each.
usage: paths.py OUT.png ARM_A-common.jsonl.gz ARM_B-common.jsonl.gz NFL.jsonl.gz CONCEPT N"""
import gzip, json, random, sys
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
out, armA, armB, nfl, concept, n = sys.argv[1:7]; n = int(n)
def load(path, pred):
    rows = {}
    for line in gzip.open(path, 'rt'):
        r = json.loads(line); r = r.get('common', r)
        if r.get('kind') == 'run' and r.get('carrier') is not None and pred(r): rows[str(r['id'])] = r
    return rows
A = load(armA, lambda r: str(r['id']).startswith(concept + '/'))
B = load(armB, lambda r: str(r['id']).startswith(concept + '/'))
ytg = json.load(open('out/mechanics/nfl-ytg.json'))
fam = {'oz': 'OUTSIDE ZONE', 'iz': 'INSIDE ZONE', 'wz': 'OUTSIDE ZONE', 'power': 'POWER', 'counter': 'COUNTER', 'duo': 'MAN'}[concept]
N = load(nfl, lambda r: (r.get('cell') or {}).get('concept') == fam and ytg.get(r['id'], 0) >= 60)
random.seed(7)
ids = random.sample(sorted(set(A) & set(B)), n); nids = random.sample(sorted(N), n)
fig, axes = plt.subplots(n, 3, figsize=(18, 5.2 * n))
col = {'O': '#1f6fd1', 'D': '#d1421f'}
for row, (i, j) in enumerate(zip(ids, nids)):
    for c, (lab, r) in enumerate([(f'A  {i}', A[i]), (f'B  {i}', B[i]), (f'NFL {j}', N[j])]):
        ax = axes[row][c]; xy, dt = r['xy'], r['dt']; k1 = min(len(xy) - 1, int(3 / dt))
        x0 = [v for v in xy[0][0::2] if v is not None]; los = sorted(x0)[len(x0) // 2]
        flip = 1
        for p, pl in enumerate(r['players']):
            pts = [(xy[k][2 * p], xy[k][2 * p + 1]) for k in range(0, k1 + 1) if xy[k][2 * p] is not None]
            if not pts: continue
            X = [q[0] for q in pts]; Y = [q[1] for q in pts]
            big = pl['group'] in ('OL', 'DL', 'TE')
            ax.plot(Y, X, '-', color=col[pl['side']], lw=.8, alpha=.6)
            ax.plot(Y, X, '.', color=col[pl['side']], ms=4 if big else 3)
            if p == r['carrier']: ax.plot(Y[-1], X[-1], '*', color='k', ms=10)
        cx = sum(v for v in xy[0][0::2] if v is not None) / len(x0)
        ys = [v for v in xy[0][1::2] if v is not None]; cy = sorted(ys)[len(ys) // 2]
        ax.set_xlim(cy - 14, cy + 14); ax.set_ylim(cx - 9, cx + 9); ax.set_aspect('equal'); ax.set_title(lab, fontsize=10)
plt.tight_layout(); plt.savefig(out, dpi=70)
