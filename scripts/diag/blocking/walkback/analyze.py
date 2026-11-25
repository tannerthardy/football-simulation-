import pickle, random, math, sys
import numpy as np
D = pickle.load(open('/tmp/claude-0/walkback/pairs.pkl', 'rb'))
pairs, unc = D['pairs'], D['unc']
q = lambda v, f=.5: float(np.quantile(v, f)) if len(v) else float('nan')
def dist(v):
    v = np.asarray(v, float)
    return f"min {v.min():.0f} p10 {q(v,.1):.0f} p50 {q(v,.5):.0f} p90 {q(v,.9):.0f} max {v.max():.0f} (mean {v.mean():.1f}, sd {v.std():.1f})"

print("## A. reproduce operator row counts (frame samples, not pairs)")
W = [(0, .5), (.5, 1.0), (1.0, 1.5), (1.5, 2.5)]
for a, c in W:
    n = sum(1 for P in pairs for f in P['fr'] if 'vp' in f and a <= f['dtc'] < c)
    print(f"  {a}-{c}: frame samples {n}; distinct pairs contributing {sum(1 for P in pairs if any('vp' in f and a <= f['dtc'] < c for f in P['fr']))}")

print("\n## B. weights over held pairs (unique play x blocker)")
print("n pairs", len(pairs), "distinct plays", len({P['pid'] for P in pairs}))
wb = [P['wb'] for P in pairs]; wr = [P['wr'] for P in pairs]; df = [P['wr'] - P['wb'] for P in pairs]
print("blocker lb :", dist(wb)); print("rusher lb  :", dist(wr)); print("rusher-blocker lb:", dist(df))
from collections import Counter
print("rusher group:", Counter(P['rg'] for P in pairs))
print("rusher pos:", Counter(P['rpos'] for P in pairs).most_common(10))
BIN = [('< -30', -1e9, -30), ('-30..0', -30, 0), ('0..+30', 0, 30), ('> +30', 30, 1e9)]
print("pairs per bin (all rushers / DL-group rushers only):")
for lab, lo, hi in BIN:
    print(f"   {lab:8s} {sum(1 for d in df if lo<=d<hi):6d}  /  {sum(1 for P in pairs if P['rg']=='DL' and lo<=P['wr']-P['wb']<hi):6d}")
print("pairs |diff|>=60:", sum(abs(d) >= 60 for d in df), " |diff|>=90:", sum(abs(d) >= 90 for d in df), " |diff|<=15:", sum(abs(d) <= 15 for d in df))
dldf = [P['wr'] - P['wb'] for P in pairs if P['rg'] == 'DL']
print("DL-only rusher-blocker:", dist(dldf)); print("DL-only rusher lb:", dist([P['wr'] for P in pairs if P['rg']=='DL']))
print("corr(wr, wb) =", np.corrcoef(wr, wb)[0, 1])
print("held duration (s, frames*0.1) p10/50/90:", [q([len(P['fr'])*0.1 for P in pairs], f) for f in (.1, .5, .9)], "ended by", Counter(P['endreason'] for P in pairs))
print("contact start time since snap p10/50/90:", [q([P['t0'] for P in pairs], f) for f in (.1, .5, .9)])

print("\n## C. per-pair mean velocity vs weight difference (regression, cluster bootstrap by play)")
rng = np.random.default_rng(0)
def pairmean(P, lo, hi, key='vp'):
    v = [f[key] for f in P['fr'] if key in f and lo <= f['dtc'] < hi]
    return np.mean(v) if len(v) >= 3 else None
def reg(rows, label, key='vp'):
    X = np.array([r[0] for r in rows], float); Y = np.array([r[1] for r in rows], float); G = np.array([r[2] for r in rows])
    n = len(X)
    def slope(ix):
        x, y = X[ix], Y[ix]; xc = x - x.mean()
        return (xc @ (y - y.mean())) / (xc @ xc)
    b = slope(np.arange(n))
    ug, inv = np.unique(G, return_inverse=True)
    members = [np.where(inv == g)[0] for g in range(len(ug))]
    bs = []
    for _ in range(600):
        pick = rng.integers(0, len(ug), len(ug))
        ix = np.concatenate([members[g] for g in pick]); bs.append(slope(ix))
    lo, hi = np.quantile(bs, [.025, .975])
    r = np.corrcoef(X, Y)[0, 1]
    print(f"  {label:34s} n={n:6d} mean v {Y.mean():+.2f} sd {Y.std():.2f} | slope per 30 lb {30*b:+.3f} yd/s  95% CI [{30*lo:+.3f}, {30*hi:+.3f}] | r {r:+.3f} | sd(diff) {X.std():.1f}")
    return b, lo, hi
for name, (lo_, hi_) in {'0-1.0 s since contact': (0, 1.0), '1.0-2.5 s since contact': (1.0, 2.5)}.items():
    for sub, flt in (('all rushers', lambda P: True), ('DL rushers only', lambda P: P['rg'] == 'DL'), ('DL, |diff|<=60 trimmed', lambda P: P['rg'] == 'DL' and abs(P['wr']-P['wb']) <= 60)):
        rows = [(P['wr'] - P['wb'], pairmean(P, lo_, hi_), P['pid']) for P in pairs if flt(P)]
        rows = [r for r in rows if r[1] is not None]
        reg(rows, f"{name} / {sub}")
# two-variable regression (all, 0-1 s): wr and wb separately
rows = [(P['wr'], P['wb'], pairmean(P, 0, 1.0), P['pid']) for P in pairs if P['rg'] == 'DL']
rows = [r for r in rows if r[2] is not None]
A = np.array([[1, r[0], r[1]] for r in rows], float); Y = np.array([r[2] for r in rows])
coef, *_ = np.linalg.lstsq(A, Y, rcond=None)
print(f"  DL, 0-1 s: v = {coef[0]:.2f} + {coef[1]*30:+.3f}*(rusher wt per 30 lb) + {coef[2]*30:+.3f}*(blocker wt per 30 lb)  (n {len(rows)})")
# binned means with SE at pair level (0-1 s)
print("  pair-level mean v (0-1 s since contact), DL rushers, by diff bin: mean (sem) n")
for lab, lo, hi in BIN:
    v = [pairmean(P, 0, 1.0) for P in pairs if P['rg'] == 'DL' and lo <= P['wr']-P['wb'] < hi]; v = [x for x in v if x is not None]
    print(f"     {lab:8s} {np.mean(v):+.2f} ({np.std(v)/math.sqrt(len(v)):.2f}) n {len(v)}")
print("  same, 1.0-2.5 s:")
for lab, lo, hi in BIN:
    v = [pairmean(P, 1.0, 2.5) for P in pairs if P['rg'] == 'DL' and lo <= P['wr']-P['wb'] < hi]; v = [x for x in v if x is not None]
    print(f"     {lab:8s} {np.mean(v):+.2f} ({np.std(v)/math.sqrt(len(v)):.2f}) n {len(v)}")
print("  rusher group mix of held pairs per bin (share DL):", [round(np.mean([P['rg']=='DL' for P in pairs if lo<=P['wr']-P['wb']<hi]),2) for _,lo,hi in BIN])
print("  mean pair v 0-1 s by rusher group:", {g: round(float(np.mean([m for P in pairs if P['rg']==g for m in [pairmean(P,0,1.0)] if m is not None])),2) for g in ('DL','LB','DB')})

print("\n## D. mass-proportional prediction (assumption-labelled)")
mw = np.mean(wr) + np.mean(wb)
for u in (3.0, 5.0):
    print(f"  model1 v = v0 + u*(wr-wb)/(wr+wb), u={u} yd/s (rusher's free closing speed): 30 lb diff -> {u*30/mw:+.3f} yd/s")
for a0 in (3.0, 5.0):
    for t in (0.5, 1.0):
        print(f"  model2 net force = a0*(wr-wb), pair accel = a0*diff/(wr+wb), a0={a0} yd/s2 per own-weight, over {t}s: 30 lb -> {a0*30/mw*t:+.3f} yd/s")
print("  (mean wr+wb =", round(mw), "lb)")

print("\n## E. sample 8 random held pairs (seed 12345)")
rnd = random.Random(12345)
longp = [P for P in pairs if len(P['fr']) >= 8 and P['rg'] == 'DL']
print("  (drawn uniformly from all held pairs)")
for P in rnd.sample(pairs, 8):
    fr = P['fr']; vp = [f['vp'] for f in fr if 'vp' in f]
    print(f"  play {P['pid']} blocker {P['bpos']} {P['wb']:.0f}lb vs rusher {P['rpos']}({P['rg']}) {P['wr']:.0f}lb | contact {P['t0']:.1f}s, held {len(fr)*0.1:.1f}s (ended: {P['endreason']}, throw {P['throw']:.1f}s) | "
          f"sep min/mean/max {min(f['sep'] for f in fr):.2f}/{np.mean([f['sep'] for f in fr]):.2f}/{max(f['sep'] for f in fr):.2f} yd | speed blocker {np.mean([f['spd_b'] for f in fr]):.1f} rusher {np.mean([f['spd_r'] for f in fr]):.1f} yd/s | "
          f"pair v toward QB {np.mean(vp) if vp else float('nan'):+.2f} (blocker alone {np.mean([f['vb'] for f in fr if 'vb' in f]) if vp else float('nan'):+.2f}, rusher alone {np.mean([f['vr'] for f in fr if 'vr' in f]) if vp else float('nan'):+.2f}) | "
          f"other D within 2yd of blocker in {np.mean([f['od']>0 for f in fr])*100:.0f}% of frames; other OL within 2yd of rusher {np.mean([f['oo']>0 for f in fr])*100:.0f}%")

print("\n## F. held-pair population checks")
allf = [f for P in pairs for f in P['fr']]
print("  frames with other D within 2yd of blocker:", round(np.mean([f['od'] > 0 for f in allf]), 3), " other OL within 2yd of rusher:", round(np.mean([f['oo'] > 0 for f in allf]), 3))
print("  pairs with such a double (other D<=2yd of blocker) in >=50% of held frames:", round(np.mean([np.mean([f['od'] > 0 for f in P['fr']]) >= .5 for P in pairs]), 3))
print("  mean sep (yd):", round(np.mean([f['sep'] for f in allf]), 2), " mean speed blocker/rusher:", round(np.mean([f['spd_b'] for f in allf]), 2), round(np.mean([f['spd_r'] for f in allf]), 2))
print("  share of held pairs with held >=1.0 s:", round(np.mean([len(P['fr']) >= 10 for P in pairs]), 2), " >=2.0 s:", round(np.mean([len(P['fr']) >= 20 for P in pairs]), 2))

print("\n## G. walk-back: held pairs vs uncovered OL (velocity toward QB, yd/s; p50 of frame samples [mean of per-unit means]) ")
print(f"  uncovered OL units {len(unc)}; held pairs {len(pairs)}")
def unit_stats(vals):
    return f"p50 {q(vals,.5):+.2f}" if vals else "n/a"
WS = [(0.0, .5), (.5, 1.0), (1.0, 1.5), (1.5, 2.5)]
print("  by TIME SINCE SNAP (held: frames while held; blocker alone = the blocker's own retreat toward the QB):")
for a, c in WS:
    hb = [f['vb'] for P in pairs for f in P['fr'] if 'vb' in f and a <= f['t'] < c]
    hp = [f['vp'] for P in pairs for f in P['fr'] if 'vp' in f and a <= f['t'] < c]
    hr = [f['vr'] for P in pairs for f in P['fr'] if 'vr' in f and a <= f['t'] < c]
    uv = [v for U in unc for (t, v) in U['fr'] if a <= t < c]
    # per-unit means for CI
    hu = [np.mean([f['vb'] for f in P['fr'] if 'vb' in f and a <= f['t'] < c]) for P in pairs if any('vb' in f and a <= f['t'] < c for f in P['fr'])]
    uu = [np.mean([v for (t, v) in U['fr'] if a <= t < c]) for U in unc if any(a <= t < c for (t, v) in U['fr'])]
    print(f"   {a:.1f}-{c:.1f}s: held blocker {q(hb):+.2f} (mean {np.mean(hb):+.2f}, n frames {len(hb)}) | held pair {q(hp):+.2f} | held rusher {q(hr):+.2f} | uncovered OL {q(uv):+.2f} (mean {np.mean(uv):+.2f}, n frames {len(uv)}) | unit means: held-blocker {np.mean(hu):+.2f}+-{np.std(hu)/math.sqrt(len(hu)):.2f} (n {len(hu)}), uncovered {np.mean(uu):+.2f}+-{np.std(uu)/math.sqrt(len(uu)):.2f} (n {len(uu)})")
print("  by TIME SINCE CONTACT (uncovered OL given pseudo-contact times resampled from held pairs' contact times, seed 0):")
rnd = random.Random(0); t0s = [P['t0'] for P in pairs]
for a, c in WS:
    hp = [f['vp'] for P in pairs for f in P['fr'] if 'vp' in f and a <= f['dtc'] < c]
    hb = [f['vb'] for P in pairs for f in P['fr'] if 'vb' in f and a <= f['dtc'] < c]
    uv = []
    rnd2 = random.Random(0)
    for U in unc:
        t0 = rnd2.choice(t0s)
        uv += [v for (t, v) in U['fr'] if a <= t - t0 < c]
    print(f"   {a:.1f}-{c:.1f}s: held pair {q(hp):+.2f} (n {len(hp)}) | held blocker alone {q(hb):+.2f} | uncovered OL {q(uv):+.2f} (n {len(uv)})")
print("  weights: uncovered OL blocker lb", dist([U['wb'] for U in unc]))
print("  uncovered share of interior-OL slots with weights: ", round(len(unc) / (len(unc) + len(pairs)), 3))
# uncovered blocker weight vs. retreat 0-1 s
x = [U['wb'] for U in unc]; y = [np.mean([v for (t, v) in U['fr'] if t < 1.0]) for U in unc if any(t < 1.0 for t, v in U['fr'])]
x2 = [U['wb'] for U in unc if any(t < 1.0 for t, v in U['fr'])]
print("  uncovered: corr(blocker weight, 0-1s retreat) =", round(np.corrcoef(x2, y)[0, 1], 3))
# held blocker alone vs weight diff (blocker velocity only), 0-1 s
rows = [(P['wr'] - P['wb'], pairmean(P, 0, 1.0, 'vb'), P['pid']) for P in pairs if P['rg'] == 'DL']
rows = [r for r in rows if r[1] is not None]
reg(rows, "BLOCKER ALONE 0-1 s, DL rushers", 'vb')
rows = [(P['wr'] - P['wb'], pairmean(P, 1.0, 2.5, 'vb'), P['pid']) for P in pairs if P['rg'] == 'DL']
rows = [r for r in rows if r[1] is not None]
reg(rows, "BLOCKER ALONE 1-2.5 s, DL rushers", 'vb')
