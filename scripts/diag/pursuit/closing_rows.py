"""What the defender-only 'closing speed at the catch' is made of, NFL rows in the 0-2 and 2-4 yd bands (completions in the open-census play format; catch_closing.py's selection).
  python3 -I scripts/diag/pursuit/closing_rows.py NFLCATCH.jsonl.gz DATA_DIR [SIM=sim1.jsonl.gz,...] [--rows 15] [--seed 7] [--out report.md]
For each defender within 10 yd of the catcher at the catch frame c (velocities = 0.2 s centred displacement; u = unit(catcher - defender)):
  c_def = v_d . u (catch_closing.py's closing: the defender's velocity only), rc = (v_d - v_r) . u (the rate the gap shuts), along = v_d . unit(v_r), across = v_d . n, n = the unit component of u perpendicular to v_r
  (so across > 0 is toward the receiver's line), a_dr = the angle between v_d and v_r, a_du = the angle between v_d and u.
Classes, per row (first match): contact: the centres are under 1 yd at the catch (a collision or tackle under way); with: moving within 45 degrees of the receiver's heading at 3 yd/s or more and the gap not
shutting (rc under 1.5): trailing or running with him, so c_def is his own speed projected on a direction that barely turns; settle: the same heading and speed, the gap shutting because the receiver is
slower than he is by a yard a second or more (a break or settle: the receiver's deceleration, not the defender's drive); drive: rc 1.5 or more, his velocity within 45 degrees of u and 45 degrees or more
off the receiver's heading: he is going at the receiver or the catch point; other: the rest (standing, drifting, a gap that is opening). Rows: a seeded random draw from the band; PFF route and man/zone from player_play / plays."""
import gzip, json, sys, math, random, csv, collections
import numpy as np
argv = sys.argv[1:]
def opt(n, d=None):
    if n in argv:
        i = argv.index(n); v = argv[i + 1]; del argv[i:i + 2]; return v
    return d
NROW = int(opt('--rows', '15')); SEED = int(opt('--seed', '7')); OUT = opt('--out')
pos_args = [a for a in argv if '=' not in a]; nfl, DATA = pos_args[0], pos_args[1]
sims = {a.split('=', 1)[0]: a.split('=', 1)[1].split(',') for a in argv if '=' in a}
route = {}
for r in csv.DictReader(open(DATA + '/player_play.csv')):
    if r.get('routeRan') not in (None, 'NA', ''): route[(r['gameId'], r['playId'], r['nflId'])] = r['routeRan']
ang = lambda a, b: math.degrees(math.acos(max(-1, min(1, (a[0] * b[0] + a[1] * b[1]) / ((math.hypot(*a) * math.hypot(*b)) or 1e-9)))))
def rows_of(paths, src):
    rows = []; plays = 0
    for path in paths:
        for l in gzip.open(path, 'rt'):
            p = json.loads(l); c, r = p.get('catch'), p.get('recv')
            if c is None or r is None or r < 0: continue
            X = np.array(p['x']); Y = np.array(p['y']); nf = X.shape[1]
            if c + 25 >= nf or c < 2: continue
            plays += 1
            def vel(i, f):
                a, b = max(0, f - 1), min(nf - 1, f + 1); return ((X[i, b] - X[i, a]) / ((b - a) / 10.0), (Y[i, b] - Y[i, a]) / ((b - a) / 10.0))
            vr = vel(r, c); sr = math.hypot(*vr)
            gid, pid = (p['id'].split('-') + ['', ''])[:2] if src == 'NFL' else ('', '')
            for i, q in enumerate(p['players']):
                if q['side'] != 'D': continue
                dx, dy = X[r, c] - X[i, c], Y[r, c] - Y[i, c]; d0 = math.hypot(dx, dy)
                if d0 >= 10: continue
                u = (dx / (d0 or 1e-9), dy / (d0 or 1e-9)); vd = vel(i, c); sd = math.hypot(*vd)
                cdef = vd[0] * u[0] + vd[1] * u[1]; rc = (vd[0] - vr[0]) * u[0] + (vd[1] - vr[1]) * u[1]
                rh = (vr[0] / (sr or 1e-9), vr[1] / (sr or 1e-9)); along = vd[0] * rh[0] + vd[1] * rh[1]
                un = (u[0] - (u[0] * rh[0] + u[1] * rh[1]) * rh[0], u[1] - (u[0] * rh[0] + u[1] * rh[1]) * rh[1]); nn = math.hypot(*un) or 1e-9; across = (vd[0] * un[0] + vd[1] * un[1]) / nn
                a_dr = ang(vd, vr) if sd > 0.3 and sr > 0.3 else float('nan'); a_du = ang(vd, u) if sd > 0.3 else float('nan')
                if d0 < 1.0: cl = 'contact'
                elif sd >= 3 and a_dr < 45 and rc < 1.5: cl = 'with'
                elif sd >= 3 and a_dr < 45 and sr < sd - 1.0: cl = 'settle'
                elif rc >= 1.5 and a_du < 45 and a_dr >= 45: cl = 'drive'
                else: cl = 'other'
                rows.append(dict(src=src, id=p['id'], pos=q['pos'], d0=d0, sd=sd, sr=sr, along=along, across=across, cdef=cdef, rc=rc, a_dr=a_dr, a_du=a_du, cl=cl, man=(p.get('manzone') == 'Man') if src == 'NFL' else bool(p.get('man')),
                                 route=route.get((gid, pid, p['players'][r]['id'])) if src == 'NFL' else None))
    return rows, plays
data = {'NFL': rows_of([nfl], 'NFL')}
for lab, ps in sims.items(): data[lab] = rows_of(ps, lab)
m = lambda v: float(np.nanmean(v)) if len(v) else float('nan')
q = lambda v, k: float(np.nanpercentile(v, k)) if len(v) else float('nan')
lines = []; P = lambda s='': lines.append(s)
BANDS = [(0, 2, '0-2'), (2, 4, '2-4'), (4, 7, '4-7'), (7, 10, '7-10')]
P('## What the defender-only closing speed at the catch is made of (completions with 2.5 s after the catch; every defender within 10 yd)\n')
P('| sample | band (yd) | n | c_def p50 | rc (the gap shutting) p50 | contact | with (running with) | settle (receiver slows) | drive | other | c_def p50 within each class: contact / with / settle / drive / other | rc p50 within drive |'); P('|---|---|---|---|---|---|---|---|---|---|---|---|')
for lab, (R, _) in data.items():
    for lo, hi, bn in BANDS:
        S = [r for r in R if lo <= r['d0'] < hi]
        if len(S) < 15: continue
        sh = lambda c: sum(1 for r in S if r['cl'] == c) / len(S)
        cc = lambda c: q([r['cdef'] for r in S if r['cl'] == c], 50)
        P(f'| {lab} | {bn} | {len(S)} | {q([r["cdef"] for r in S], 50):.1f} | {q([r["rc"] for r in S], 50):.1f} | {sh("contact"):.2f} | {sh("with"):.2f} | {sh("settle"):.2f} | {sh("drive"):.2f} | {sh("other"):.2f} | {cc("contact"):.1f} / {cc("with"):.1f} / {cc("settle"):.1f} / {cc("drive"):.1f} / {cc("other"):.1f} | {q([r["rc"] for r in S if r["cl"] == "drive"], 50):.1f} |')
P('')
rng = random.Random(SEED)
for lo, hi, bn in BANDS[:2]:
    S = [r for r in data['NFL'][0] if lo <= r['d0'] < hi and r['cdef'] >= 1.5]
    P(f'### {NROW} NFL rows in the {bn} yd band that count as closing (c_def 1.5 yd/s or more), seeded random draw from {len(S)}\n')
    P('| gameId-playId | def | man/zone | route | sep (yd) | defender speed | receiver speed | along his run | across, toward the receiver\'s line | c_def | rc (gap) | angle v_d to v_r | angle v_d to u | class |'); P('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
    for r in rng.sample(S, min(NROW, len(S))):
        P(f'| {r["id"]} | {r["pos"]} | {"man" if r["man"] else "zone"} | {r["route"] or "-"} | {r["d0"]:.1f} | {r["sd"]:.1f} | {r["sr"]:.1f} | {r["along"]:.1f} | {r["across"]:.1f} | {r["cdef"]:.1f} | {r["rc"]:.1f} | {r["a_dr"]:.0f} | {r["a_du"]:.0f} | {r["cl"]} |')
    P('')
txt = '\n'.join(lines)
if OUT: open(OUT, 'w').write(txt)
print(txt)
