"""usage: python3 -I scripts/diag/pass-operators/qb-leave.py [--plays BDB plays.csv] <plays.jsonl.gz> [...]
What a QB sees when he starts to leave the pocket (Integration, 2026-11-11). Same code on NFL tracking and sim plays.
Pocket dropbacks (designed movement dropped with --plays). Set frame = his deepest frame before the ball is out. LEAVE
plays: he ends outside the tackle box or climbs 3+ yd; the leave frame = the first frame after set his speed exceeds
2 yd/s. STAY plays: he stands (< 0.5 yd from set to the end); their frame = set + the leave plays' median time after set
(or one frame before the ball is out, if sooner). At that frame:
  nearest rusher (any defender): distance, closing speed (rate the distance falls), bearing vs upfield (front < 45 deg,
  edge 45-135, behind); nearest WINNING rusher = a defender nearer the QB than the blocker nearest to that defender (past
  his man) or with no blocker within 1.2 yd (free): the same measures;
  pocket: lateral width between the two widest defenders within 5 yd; interior push = the nearest defender ahead of
  him inside the tackle box (x distance); the largest lateral gap between adjacent bodies (defenders and blockers)
  within 3 yd in front of him, between the tackles' y +- 2 yd (the lane he could step into);
  time since set and since the snap; receivers: separation of each eligible (WR/TE/RB) from his nearest defender, the
  best separation and whether anyone is more than 3 yd open.
Then each measure's power to separate leave from stay in the NFL (AUC; 0.5 = none), and where our QB's frames fall."""
import sys, os, json, csv, statistics as st, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'defense-yards'))
_a = sys.argv; sys.argv = sys.argv[:1]
from yards import plays
sys.argv = _a
DESIGNED = set(); args = sys.argv[1:]
if args[:1] == ['--plays']:
    for row in csv.DictReader(open(args[1])):
        if row['dropbackType'].startswith('DESIGNED_ROLLOUT') or row['playAction'] == 'TRUE': DESIGNED.add(f"{row['gameId']}-{row['playId']}")
    args = args[2:]
import math
def feats(p, q, k, ks, D, OL, ELIG, lo, hi):
    qp = p.pos(q, k); f = {}
    def meas(d, tag):
        dp = p.pos(d, k); dist = p.dist(q, d, k); prev = p.dist(q, d, max(0, k - 2)) if k >= 2 else dist
        ang = abs(math.degrees(math.atan2(dp[1] - qp[1], dp[0] - qp[0])))
        f[tag + 'dist'] = dist; f[tag + 'close'] = (prev - dist) / (2 * p.dt) if k >= 2 else 0
        f[tag + 'bear'] = 0 if ang < 45 else 1 if ang <= 135 else 2
    Dk = [d for d in D if p.pos(d, k)[0] is not None]
    if not Dk: return None
    meas(min(Dk, key=lambda d: p.dist(q, d, k)), 'near_')
    win = []
    for d in Dk:
        ols = [o for o in OL if p.pos(o, k)[0] is not None]
        if not ols: win.append(d); continue
        o = min(ols, key=lambda o: p.dist(o, d, k))
        if p.dist(o, d, k) > 1.2 or p.dist(q, d, k) < p.dist(q, o, k): win.append(d)
    if win: meas(min(win, key=lambda d: p.dist(q, d, k)), 'win_')
    else: f['win_dist'] = 15; f['win_close'] = 0; f['win_bear'] = 0
    near5 = [d for d in Dk if p.dist(q, d, k) <= 5]
    f['width'] = (max(p.pos(d, k)[1] for d in near5) - min(p.pos(d, k)[1] for d in near5)) if len(near5) >= 2 else 10
    ahead = [p.pos(d, k)[0] - qp[0] for d in Dk if lo - 0.5 <= p.pos(d, k)[1] <= hi + 0.5 and p.pos(d, k)[0] >= qp[0]]
    f['push'] = min(ahead) if ahead else 8
    bodies = sorted([p.pos(b, k)[1] for b in Dk + [o for o in OL if p.pos(o, k)[0] is not None]
                     if 0 <= p.pos(b, k)[0] - qp[0] <= 3 and lo - 2 <= p.pos(b, k)[1] <= hi + 2] + [lo - 2, hi + 2])
    f['gap'] = max(b - a for a, b in zip(bodies, bodies[1:]))
    f['tset'] = (k - ks) * p.dt; f['tsnap'] = k * p.dt
    seps = [min((p.dist(r, d, k) for d in Dk), default=10) for r in ELIG if p.pos(r, k)[0] is not None]
    f['bestsep'] = max(seps) if seps else 0; f['open3'] = 1 if seps and max(seps) > 3 else 0
    return f
def auc(a, b):
    n = 0; s = 0
    for x in a:
        for y in b:
            n += 1; s += 1 if x > y else 0.5 if x == y else 0
    return s / n if n else float('nan')
ALL = {}
for path in args:
    L, S = [], []
    leave_dt = []
    rows = []
    for kind, p, c, k0, last in plays(path):
        if kind != 'pass' or p.raw['id'] in DESIGNED: continue
        qbs = [i for i, pl in enumerate(p.players) if pl.get('group') == 'QB']
        if not qbs: continue
        q = qbs[0]; ev = p.raw.get('events', {}); fw = ev.get('pass_forward')
        kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
        xs = [(k, p.pos(q, k)[0]) for k in range(0, kend + 1) if p.pos(q, k)[0] is not None]
        if len(xs) < 5: continue
        ks, xset = min(xs, key=lambda t: t[1])
        OL = [i for i, pl in enumerate(p.players) if pl.get('group') == 'OL']
        ols = [i for i in OL if p.pos(i, ks)[0] is not None]
        if len(ols) < 2: continue
        ys = sorted(p.pos(i, ks)[1] for i in ols); lo, hi = ys[0], ys[-1]
        D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None]
        ELIG = [i for i, pl in enumerate(p.players) if pl.get('group') in ('WR', 'TE', 'RB')]
        a, b = p.pos(q, ks), p.pos(q, kend)
        if None in (a[0], b[0]): continue
        fwd = b[0] - a[0]; outside = not (lo - 0.5 <= b[1] <= hi + 0.5); disp = math.hypot(b[0] - a[0], b[1] - a[1])
        if outside or fwd >= 3:
            kl = next((k for k in range(ks + 1, kend + 1) if p.speed(q, k) > 2.0), None)
            if kl is None: continue
            rows.append(('leave', p, q, kl, ks, D, OL, ELIG, lo, hi)); leave_dt.append((kl - ks) * p.dt)
        elif disp < 0.5:
            rows.append(('stay', p, q, None, ks, D, OL, ELIG, lo, hi, kend))
    md = st.median(leave_dt) if leave_dt else 1.0
    for r in rows:
        if r[0] == 'leave':
            _, p, q, k, ks, D, OL, ELIG, lo, hi = r; f = feats(p, q, k, ks, D, OL, ELIG, lo, hi)
            if f: L.append(f)
        else:
            _, p, q, _, ks, D, OL, ELIG, lo, hi, kend = r; k = min(kend - 1, ks + int(round(md / p.dt)))
            if k <= ks: continue
            f = feats(p, q, k, ks, D, OL, ELIG, lo, hi)
            if f: S.append(f)
    ALL[os.path.basename(path)] = (L, S)
    print(f"== {os.path.basename(path)}: leave {len(L)} (time after set p50 {md:.2f} s), stay {len(S)}")
    keys = ['near_dist', 'near_close', 'win_dist', 'win_close', 'width', 'push', 'gap', 'tset', 'tsnap', 'bestsep', 'open3']
    q2 = lambda v: f"{st.median(v):.2f}" if v else 'nan'
    print("   measure     leave p50 | stay p50 | AUC (leave > stay)")
    for kk in sorted(keys, key=lambda kk: -abs(auc([x[kk] for x in L], [x[kk] for x in S]) - 0.5)):
        A = auc([x[kk] for x in L], [x[kk] for x in S])
        print(f"   {kk:10s}  {q2([x[kk] for x in L]):>8s} | {q2([x[kk] for x in S]):>8s} | {A:.2f}")
    for lab, X in (('leave', L), ('stay', S)):
        bc = C.Counter(x['win_bear'] for x in X); n = len(X) or 1
        print(f"   {lab}: nearest winning rusher front/edge/behind {100*bc[0]/n:.0f}/{100*bc[1]/n:.0f}/{100*bc[2]/n:.0f}% | anyone > 3 yd open {100*sum(x['open3'] for x in X)/n:.0f}%")
