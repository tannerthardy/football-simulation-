"""Leverage at the pass: when the runner passes a defender who is engaged with
a blocker, is the blocker's body between them, and does the runner go by on
the blocker's (covered) side or the defender's free side?  One operator for
NFL tracking and sim exports (common play format, scripts/mechanics/metrics.py).

usage: python3 -I scripts/diag/runblock/leverage-pass.py FILE [FILE ...]
         [--r 1.2] [--hold 0.3] [--perp 0.6] [--win 3.0] [--square 0.25]
         [--step 1] [--dump DIR]
Run from the repo root (imports scripts/mechanics/metrics.py).

Admission: kind 'run', carrier is an RB, a handoff event, carrier tracked at
the handoff.  Concept family from cell.concept: gap = POWER/COUNTER/TRAP/PULL
LEAD (sim power/counter/trap); zone = INSIDE ZONE/OUTSIDE ZONE (sim
insideZone/outsideZone/wideZone); duo = MAN (sim duo); everything else is
'other' and is not reported.  Formation: gun when the QB's snap depth is
< -2.5 yd (pistol counts as gun), otherwise under center (uc).  Attack
direction is +x (yards past the line), lateral is y.  Positions are the
quantized ones of metrics.Play (0.1 yd) on both sources.

Play side s (no label exists in tracking): sign of the runner's lateral move
from the handoff to handoff + 1.0 s (or the whistle), the shared convention
of oz-edge.py.  For sim ids (concept/dir/...) the agreement of this inferred
side with the designed dir is printed as a check.

Engagement (per frame, frames 0..whistle): blockers = offensive players other
than the carrier and the QB.  Every blocker-defender pair with centers
<= R (1.2 yd) is a candidate; pairs are matched greedily in ascending
distance, one blocker to one defender and one defender to one blocker per
frame (a double team credits the defender to the nearer blocker; the other
member stays free to be matched to another defender).  A defender is ENGAGED
at frame k when he has been matched (to any blocker) in every frame of the
last `hold` seconds (0.3 s = 4 samples at 10 Hz, i.e. k-3..k).  His blocker
at k is the blocker matched at k.

Pass moment kp of a defender: he must be ahead of the runner at the handoff
(runner x < defender x).  LEVEL = the first frame from the handoff on with
runner x >= defender x.  If the defender is the first tackler (nearest
defender to the carrier at events.first_contact, as in blockedfirst.py) and
first contact comes no later than LEVEL, kp = the first-contact frame
('contact' pass); else if |runner y - defender y| <= W (3 yd) at LEVEL,
kp = LEVEL ('level' pass); otherwise the runner went by wide ('wide', not a
pass) or never got level ('short').  Population ENGAGED-AT-PASS = defenders
engaged at kp; RELEASED = engaged at some frame from the snap to kp but not at
kp; FREE = never engaged before kp.

At kp and 0.3 s before (kb = kp - 3 samples), with b = his blocker at kp:
 between  project b's center on the segment defender->runner: parameter
          0 < u < 1 and perpendicular distance < perp (0.6 yd, about one body
          width: torso half-width ~0.3 yd plus arm clearance).  'between_any'
          repeats it with every blocker within R of the defender at kp.
 side     lateral offsets from the defender: db = y_b - y_d, dr = y_r - y_d.
          square: |db| < 0.25 (blocker head-up, no side); head-on: |dr| < 0.25
          (runner straight at him); covered: same sign (runner passes on the
          blocker's side); free: opposite signs (runner on the defender's
          free side, the arm the blocker does not occupy).
 design   blocker play side / backside of the defender (db*s > 0.25 / < -0.25,
          else square) at the start of the engagement and at kp; runner play
          side / backside of the defender at kp (dr*s).
 outcome  first tackler? (first contact defender as above); whistle-nearest
          (nearest defender to the carrier at the whistle and <= R: a tackle
          proxy, there is no tackler label in the common format); runner x at
          kp, at first contact (gain at contact) and the play's yards.
Tables report ENGAGED-AT-PASS defenders (RELEASED ones are counted; their
records use the last engaged blocker).  --dump writes one JSON record per
defender (also dr = runner lateral offset, + toward the blocker's side, and
bd = blocker-defender center distance at kp) for further cuts.

The sensitivity rows rerun with R 1.0 / 1.5 and with every other frame
(--step 2: 5 Hz, hold = 3 samples = 0.4 s elapsed, kb = kp - 2 samples).
"""
import argparse, gzip, json, math, os, re, sys
from collections import Counter, defaultdict
import numpy as np
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play

ap = argparse.ArgumentParser()
ap.add_argument('files', nargs='+')
ap.add_argument('--r', type=float, default=1.2)
ap.add_argument('--hold', type=float, default=0.3)
ap.add_argument('--perp', type=float, default=0.6)
ap.add_argument('--win', type=float, default=3.0)
ap.add_argument('--square', type=float, default=0.25)
ap.add_argument('--step', type=int, default=1)
ap.add_argument('--min', type=int, default=30, help='min n for a concept row')
ap.add_argument('--dump', default=None, help='directory for per-defender JSONL records')
ap.add_argument('--brief', action='store_true', help='family rows only')
A = ap.parse_args()

CONCEPT = {'POWER': 'power', 'power': 'power', 'COUNTER': 'counter', 'counter': 'counter',
           'TRAP': 'trap', 'trap': 'trap', 'PULL LEAD': 'pull lead',
           'INSIDE ZONE': 'inside zone', 'insideZone': 'inside zone', 'splitZone': 'inside zone',
           'OUTSIDE ZONE': 'outside zone', 'outsideZone': 'outside zone', 'wideZone': 'wide zone',
           'MAN': 'duo/man', 'duo': 'duo/man'}
FAMILY = {'power': 'gap', 'counter': 'gap', 'trap': 'gap', 'pull lead': 'gap',
          'inside zone': 'zone', 'outside zone': 'zone', 'wide zone': 'zone', 'duo/man': 'duo'}


def sgn(v, tol):
    return 0 if abs(v) < tol else (1 if v > 0 else -1)


def between(B, D, R):
    """B on segment D->R: 0<u<1 and perpendicular distance < perp."""
    if np.isnan(B).any() or np.isnan(D).any() or np.isnan(R).any():
        return None
    v = R - D; L2 = float(v @ v)
    if L2 < 1e-6:
        return False
    w = B - D; u = float(w @ v) / L2
    perp = abs(float(v[0] * w[1] - v[1] * w[0])) / math.sqrt(L2)
    return 0 < u < 1 and perp < A.perp


def side(B, D, R):
    db = B[1] - D[1]; dr = R[1] - D[1]
    if math.isnan(db) or math.isnan(dr):
        return None
    if abs(db) < A.square: return 'square'
    if abs(dr) < A.square: return 'head-on'
    return 'covered' if db * dr > 0 else 'free'


def play_records(raw):
    p = Play(raw)
    c = raw.get('carrier'); ev = p.events
    if raw.get('kind') != 'run' or c is None or p.players[c]['group'] != 'RB' or ev.get('handoff') is None:
        return None, 'not a handed-off RB run'
    concept = CONCEPT.get((raw.get('cell') or {}).get('concept'))
    fam = FAMILY.get(concept, 'other')
    st = A.step; dt = p.dt * st
    P = np.array([[np.nan if v is None else v for v in row] for row in p.xy[::st]], dtype=float)
    F = P.shape[0]; P = P.reshape(F, p.n, 2)
    kf = lambda t: max(0, min(F - 1, int(round(t / dt))))
    kend = kf(p.end); kh = kf(ev['handoff'])
    if kh >= kend or np.isnan(P[kh, c]).any():
        return None, 'carrier untracked at handoff'
    qb = p.who('O', 'QB')
    form = 'gun' if qb and not np.isnan(P[0, qb[0], 0]) and P[0, qb[0], 0] < -2.5 else 'uc'
    k1 = min(kend, kh + int(round(1.0 / dt)))
    s = 1 if P[k1, c, 1] - P[kh, c, 1] >= 0 else -1
    O = [i for i in p.who('O') if i != c and p.players[i]['group'] != 'QB']
    D = p.who('D')
    # distances blockers x defenders x frames
    d = np.linalg.norm(P[:kend + 1, O, None, :] - P[:kend + 1, None, D, :], axis=-1)
    d = np.where(np.isnan(d), np.inf, d)
    match = -np.ones((kend + 1, len(D)), dtype=int)   # index into O
    for k in range(kend + 1):
        oi, di = np.nonzero(d[k] <= A.r)
        if len(oi) == 0: continue
        order = np.argsort(d[k, oi, di]); usedO = set(); usedD = set()
        for j in order:
            a, b = oi[j], di[j]
            if a in usedO or b in usedD: continue
            usedO.add(a); usedD.add(b); match[k, b] = a
    H = int(math.ceil(A.hold / dt - 1e-9)) + 1
    run = np.zeros_like(match)
    for k in range(kend + 1):
        run[k] = np.where(match[k] >= 0, (run[k - 1] if k else 0) + 1, 0)
    engaged = run >= H
    # first contact / first tackler (as blockedfirst.py)
    fc = ev.get('first_contact'); kfc = None; ft = None; blocked_first = None; gain_fc = None
    if fc is not None and p.live(fc):
        kfc = kf(fc)
        if kfc <= kend and not np.isnan(P[kfc, c]).any():
            dd = [(np.hypot(*(P[kfc, j] - P[kfc, c])), j) for j in D if not np.isnan(P[kfc, j]).any()]
            if dd:
                ft = min(dd)[1]
                blocked_first = any(o != c and not np.isnan(P[kfc, o]).any() and np.hypot(*(P[kfc, o] - P[kfc, ft])) < A.r
                                    for o in p.who('O'))
                gain_fc = float(P[kfc, c, 0])
        else:
            kfc = None
    wn = None
    dd = [(np.hypot(*(P[kend, j] - P[kend, c])), j) for j in D if not np.isnan(P[kend, j]).any()]
    if dd and not np.isnan(P[kend, c]).any() and min(dd)[0] <= A.r:
        wn = min(dd)[1]
    kbo = int(round(0.3 / dt))
    recs = []
    for jd, dfd in enumerate(D):
        if np.isnan(P[kh, dfd]).any() or P[kh, c, 0] >= P[kh, dfd, 0]:
            continue
        level = next((k for k in range(kh, kend + 1) if not np.isnan(P[k, c, 0]) and not np.isnan(P[k, dfd, 0])
                      and P[k, c, 0] >= P[k, dfd, 0]), None)
        if dfd == ft and kfc is not None and (level is None or kfc <= level):
            kp, how = kfc, 'contact'
        elif level is not None and abs(P[level, c, 1] - P[level, dfd, 1]) <= A.win:
            kp, how = level, 'level'
        else:
            how = 'wide' if level is not None else 'short'
            if engaged[:kend + 1, jd].any():
                recs.append(dict(fam=fam, concept=concept, form=form, status=how))
            continue
        ever = bool(engaged[:kp + 1, jd].any())
        status = 'engaged' if engaged[kp, jd] else 'released' if ever else 'free'
        r = dict(fam=fam, concept=concept, form=form, status=status, how=how, ft=dfd == ft, wn=dfd == wn,
                 grp=p.players[dfd]['group'], x_pass=float(P[kp, c, 0]), xd_pass=float(P[kp, dfd, 0]),
                 yards=raw.get('yards'), gain_fc=gain_fc if dfd == ft else None, t_pass=round(kp * dt, 2),
                 id=raw.get('id'))
        if status == 'free':
            recs.append(r); continue
        if status == 'engaged':
            b = O[match[kp, jd]]; k0 = kp - run[kp, jd] + 1
        else:
            kl = max(k for k in range(kp + 1) if engaged[k, jd])
            b = O[match[kl, jd]]; k0 = kl - run[kl, jd] + 1
        r['bgrp'] = p.players[b]['group']
        kb = max(0, kp - kbo)
        Dp, Rp, Bp = P[kp, dfd], P[kp, c], P[kp, b]
        r['between'] = between(Bp, Dp, Rp)
        r['between_b'] = between(P[kb, b], P[kb, dfd], P[kb, c])
        r['between_any'] = any(between(P[kp, O[a]], Dp, Rp) for a in range(len(O)) if d[kp, a, jd] <= A.r)
        r['side'] = side(Bp, Dp, Rp)
        r['side_b'] = side(P[kb, b], P[kb, dfd], P[kb, c])
        b0 = P[k0, b, 1] - P[k0, dfd, 1]
        r['design0'] = {1: 'ps', -1: 'bs', 0: 'sq'}[sgn(b0 * s, A.square)]
        r['design'] = {1: 'ps', -1: 'bs', 0: 'sq'}[sgn((Bp[1] - Dp[1]) * s, A.square)]
        r['runner_ps'] = {1: 'ps', -1: 'bs', 0: 'sq'}[sgn((Rp[1] - Dp[1]) * s, A.square)]
        r['eng_s'] = round((kp - k0 + 1) * dt, 2)
        db_ = Bp[1] - Dp[1]
        r['dr'] = round(float((Rp[1] - Dp[1]) * (1 if db_ >= 0 else -1)), 2)  # + = covered side
        r['bd'] = round(float(np.hypot(*(Bp - Dp))), 2)
        recs.append(r)
    m = re.match(r'^[^/]+/(strong|weak)/', str(raw.get('id', '')))
    return dict(fam=fam, concept=concept, form=form, s=s, dir=m.group(1) if m else None, recs=recs,
                ft=ft is not None, blocked_first=blocked_first, kfc=kfc, gain_fc=gain_fc, yards=raw.get('yards'),
                ft_status=next((x['status'] for x in recs if x.get('ft') and 'how' in x), None),
                ft_side=next((x.get('side') for x in recs if x.get('ft') and x.get('status') == 'engaged'), None)), None


pct = lambda a, n: f"{100 * a / n:3.0f}%" if n else '  - '
med = lambda v: f"{sorted(v)[len(v) // 2]:+.1f}" if v else '  - '


def report(label, plays):
    E = [r for pl in plays for r in pl['recs'] if r['status'] == 'engaged']
    Rl = [r for pl in plays for r in pl['recs'] if r['status'] == 'released']
    Fr = [r for pl in plays for r in pl['recs'] if r['status'] == 'free']
    W = [r for pl in plays for r in pl['recs'] if r['status'] in ('wide', 'short')]
    n = len(E)
    out = [f"  {label:22s} plays {len(plays):4d} | engaged-at-pass {n:4d} ({n / max(1, len(plays)):.1f}/play), released {len(Rl)}, wide/short {len(W)}, free {len(Fr)}"]
    if not n:
        return out
    sc = Counter(r['side'] for r in E); sb = Counter(r['side_b'] for r in E)
    out.append(f"    between at pass {pct(sum(r['between'] is True for r in E), n)} (any blocker {pct(sum(r['between_any'] for r in E), n)}), 0.3 s before {pct(sum(r['between_b'] is True for r in E), n)}"
               f" | side at pass cov/free/sq/head-on {pct(sc['covered'], n)}/{pct(sc['free'], n)}/{pct(sc['square'], n)}/{pct(sc['head-on'], n)}"
               f" | 0.3 s before cov/free {pct(sb['covered'], n)}/{pct(sb['free'], n)}")
    cf = [r for r in E if r['side'] in ('covered', 'free')]
    nc = sum(r['side'] == 'covered' for r in cf)
    d0 = Counter(r['design0'] for r in E); dp = Counter(r['design'] for r in E); rp = Counter(r['runner_ps'] for r in E)
    out.append(f"    covered share of sided {pct(nc, len(cf))} of {len(cf)} | blocker ps/bs/sq at engagement start {pct(d0['ps'], n)}/{pct(d0['bs'], n)}/{pct(d0['sq'], n)}, at pass {pct(dp['ps'], n)}/{pct(dp['bs'], n)}/{pct(dp['sq'], n)}"
               f" | runner passes ps/bs of him {pct(rp['ps'], n)}/{pct(rp['bs'], n)} | covered when blocker ps {pct(sum(r['side'] == 'covered' for r in E if r['design'] == 'ps'), sum(r['side'] in ('covered', 'free') for r in E if r['design'] == 'ps'))}, bs {pct(sum(r['side'] == 'covered' for r in E if r['design'] == 'bs'), sum(r['side'] in ('covered', 'free') for r in E if r['design'] == 'bs'))}")
    ftc = lambda grp: (sum(r['ft'] for r in grp), len(grp))
    a1 = ftc([r for r in E if r['side'] == 'covered']); a2 = ftc([r for r in E if r['side'] == 'free']); a3 = ftc([r for r in E if r['side'] in ('square', 'head-on')])
    out.append(f"    engaged defender then makes first contact: covered {pct(*a1)} of {a1[1]}, free {pct(*a2)} of {a2[1]}, square/head-on {pct(*a3)} of {a3[1]} | whistle-nearest: covered {pct(sum(r['wn'] for r in E if r['side'] == 'covered'), a1[1])}, free {pct(sum(r['wn'] for r in E if r['side'] == 'free'), a2[1])}"
               f" | runner x at pass p50 {med([r['x_pass'] for r in E])}, defender x {med([r['xd_pass'] for r in E])}, held {med([r['eng_s'] for r in E])} s")
    # first contacts
    fcp = [pl for pl in plays if pl['ft']]
    nf = len(fcp)
    if nf:
        eng = [pl for pl in fcp if pl['ft_status'] == 'engaged']
        rel = [pl for pl in fcp if pl['ft_status'] == 'released']
        fre = [pl for pl in fcp if pl['ft_status'] in ('free', None)]
        EF = [r for r in E if r['ft']]
        sfc = Counter(r['side'] for r in EF); sfb = Counter(r['side_b'] for r in EF)
        out.append(f"    first contacts {nf}: blocked (blockedfirst.py def, any O <= R at contact) {pct(sum(pl['blocked_first'] for pl in fcp), nf)} | by engaged-at-pass {pct(len(eng), nf)}, released {pct(len(rel), nf)}, free/other {pct(len(fre), nf)}"
                   f" | gain at contact p50 all {med([pl['gain_fc'] for pl in fcp])}, engaged {med([pl['gain_fc'] for pl in eng])}, released {med([pl['gain_fc'] for pl in rel])}, free {med([pl['gain_fc'] for pl in fre])}")
        ne = len(EF)
        if ne:
            out.append(f"    engaged first contacts {ne}: contact before level {pct(sum(r['how'] == 'contact' for r in EF), ne)} | side at contact cov/free/sq/head-on {pct(sfc['covered'], ne)}/{pct(sfc['free'], ne)}/{pct(sfc['square'], ne)}/{pct(sfc['head-on'], ne)}, 0.3 s before cov/free/sq {pct(sfb['covered'], ne)}/{pct(sfb['free'], ne)}/{pct(sfb['square'], ne)}"
                       f" | between 0.3 s before {pct(sum(r['between_b'] is True for r in EF), ne)} | gain at contact p50 covered {med([r['gain_fc'] for r in EF if r['side'] == 'covered'])}, free {med([r['gain_fc'] for r in EF if r['side'] == 'free'])}, square/head-on {med([r['gain_fc'] for r in EF if r['side'] in ('square', 'head-on')])}"
                       f" | yards p50 covered {med([r['yards'] for r in EF if r['side'] == 'covered'])}, free {med([r['yards'] for r in EF if r['side'] == 'free'])}")
    return out


def run_file(path):
    plays = []; skip = Counter()
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line)
        raw = raw.get('common', raw)
        if raw.get('kind') != 'run':
            continue
        pl, why = play_records(raw)
        if pl is None:
            skip[why] += 1; continue
        if pl['fam'] == 'other':
            skip['concept other'] += 1; continue
        plays.append(pl)
    name = path.split('/')[-1]
    print(f"{name}  (R {A.r} yd, hold {A.hold} s, perp {A.perp} yd, window {A.win} yd, square {A.square} yd, step {A.step}) runs used {len(plays)}; skipped {dict(skip)}")
    sim_dir = [pl for pl in plays if pl['dir']]
    if sim_dir:
        agree = Counter((pl['dir'], pl['s']) for pl in sim_dir)
        # designed side: majority inferred sign for 'strong' within a concept
        tab = defaultdict(Counter)
        for pl in sim_dir: tab[pl['concept']][(pl['dir'], pl['s'])] += 1
        print('   inferred play side vs designed dir (sim): ' + '; '.join(
            f"{cn}: strong +{t[('strong', 1)]}/-{t[('strong', -1)]}, weak +{t[('weak', 1)]}/-{t[('weak', -1)]}" for cn, t in sorted(tab.items())))
    groups = defaultdict(list)
    for pl in plays:
        groups[(pl['fam'], pl['form'])].append(pl)
    for key in sorted(groups):
        for l in report(f"{key[0]} {key[1]}", groups[key]): print(l)
    if not A.brief:
        cg = defaultdict(list)
        for pl in plays: cg[(pl['concept'], pl['form'])].append(pl)
        for key in sorted(cg):
            nE = sum(r['status'] == 'engaged' for pl in cg[key] for r in pl['recs'])
            if nE >= A.min and len(cg[key]) < len(groups[(FAMILY[key[0]], key[1])]):
                for l in report(f"  {key[0]} {key[1]}", cg[key]): print(l)
    if A.dump:
        os.makedirs(A.dump, exist_ok=True)
        tag = f"r{A.r}-s{A.step}"
        with gzip.open(os.path.join(A.dump, f"{name.replace('.jsonl.gz', '')}-{tag}.jsonl.gz"), 'wt') as f:
            for pl in plays:
                for r in pl['recs']: f.write(json.dumps(r) + '\n')
    sys.stdout.flush()


for path in A.files:
    run_file(path)
