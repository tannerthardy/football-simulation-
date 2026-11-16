"""The safety's first seconds on dropbacks and runs (Tools, 2026-11-16, for Defense / Integration's safety first-second sourcing). Common play format (xy at 10 Hz, offence attacks +x, x past the line = 0 at the snap) plus plays.csv for the
coverage family. Population: safeties (S, FS, SS) aligned 8+ yd past the line at the snap.
Passes (dropbacks, play action excluded), by coverage family (Cover-3 family, Quarters, Cover-2, Cover-6, other zone, man): depth past the line and speed (centred +-0.1 s difference) at 0.25 / 0.5 / 1.0 / 2.0 s after the snap, and depth
at the throw (p25 / p50 / p75) with his speed there.
Runs, split by run side (the carrier is on the safety's side of the ball when he is past the line, or away; the side is the sign of y - ball y at the snap, compared at handoff + 1.0 s): time from the handoff to within 3 yd and within 1 yd of the
carrier (share reaching it before the play ends, p50 of those that do), and his depth at handoff + 1.0 s.
usage: python3 -I safety_first_second.py PLAYS.jsonl.gz plays.csv"""
import sys, gzip, json, math, csv
def jl(p):
    for l in gzip.open(p, 'rt'): yield json.loads(l)
FAM = {'Cover-2': 'Cover-2', 'Cover-3': 'Cover-3 family', 'Cover-3 Seam': 'Cover-3 family', 'Cover-3 Cloud Left': 'Cover-3 family', 'Cover-3 Cloud Right': 'Cover-3 family', 'Cover-3 Double Cloud': 'Cover-3 family',
       'Quarters': 'Quarters', 'Cover 6-Left': 'Cover-6', 'Cover-6 Right': 'Cover-6', 'Cover-1': 'man', 'Cover-0': 'man', 'Man': 'man', '2-Man': 'man'}
cov = {}; dropback = {}
with open(sys.argv[2], newline='') as h:
    for r in csv.DictReader(h):
        k = f"{r['gameId']}-{r['playId']}"
        cov[k] = FAM.get(r['pff_passCoverage'], 'other'); dropback[k] = r['isDropback'] == 'TRUE' and r['playAction'] != 'TRUE'
def at(P, f, j):
    if f < 0 or f >= len(P['xy']): return None
    x, y = P['xy'][f][2 * j], P['xy'][f][2 * j + 1]
    return None if x is None or y is None else (x, y)
def vel(P, f, j):
    a, b = at(P, f - 1, j), at(P, f + 1, j)
    return None if a is None or b is None else math.hypot((b[0] - a[0]) / (2 * P['dt']), (b[1] - a[1]) / (2 * P['dt']))
q = lambda v, p: sorted(v)[min(len(v) - 1, int(p * (len(v) - 1) + .5))] if v else float('nan')
PASS = {}; RUN = {'on his side': [], 'away': []}
for P in jl(sys.argv[1]):
    dt = P['dt']; sf = [j for j, pl in enumerate(P['players']) if pl['side'] == 'D' and pl.get('pos') in ('S', 'FS', 'SS')]
    sf = [j for j in sf if at(P, 0, j) and at(P, 0, j)[0] >= 8]
    if not sf: continue
    ev = P['events']
    if P['kind'] == 'pass' and dropback.get(P['id']) and 'pass_forward' in ev:
        fam = cov.get(P['id'], 'other'); T = int(round(ev['pass_forward'] / dt)); R = PASS.setdefault(fam, {k: [] for k in ('d25', 'd50', 'd100', 'd200', 's25', 's50', 's100', 's200', 'dT', 'sT', 'd0')})
        for j in sf:
            if at(P, T, j) is None or T < 20: continue
            R['d0'].append(at(P, 0, j)[0])
            for key, f in (('25', 2.5), ('50', 5), ('100', 10), ('200', 20)):
                fi = int(round(f))
                if f % 1 and at(P, 2, j) and at(P, 3, j): R['d' + key].append((at(P, 2, j)[0] + at(P, 3, j)[0]) / 2)
                elif not f % 1 and at(P, fi, j): R['d' + key].append(at(P, fi, j)[0])
                s = vel(P, fi, j) if not f % 1 else ((vel(P, 2, j) or 0) + (vel(P, 3, j) or 0)) / 2 if vel(P, 2, j) is not None and vel(P, 3, j) is not None else None
                if s is not None: R['s' + key].append(s)
            R['dT'].append(at(P, T, j)[0]); sT = vel(P, T, j)
            if sT is not None: R['sT'].append(sT)
    elif P['kind'] == 'run' and 'handoff' in ev and P.get('carrier') is not None:
        H = int(round(ev['handoff'] / dt)); end = int(round(ev.get('end', len(P['xy']) * dt) / dt)); c = P['carrier']
        by = P.get('ball_y')
        if by is None or H + 11 >= len(P['xy']): continue
        cp = at(P, H + 10, c)
        if not cp or cp[0] < 0: continue
        for j in sf:
            s0 = at(P, 0, j)
            if not s0: continue
            side = 'on his side' if (cp[1] - by) * (s0[1] - by) > 0 else 'away'
            r = {'t3': None, 't1': None, 'd': (at(P, H + 10, j) or (None,))[0]}
            for f in range(H, min(end, len(P['xy']) - 1) + 1):
                a, b = at(P, f, j), at(P, f, c)
                if not a or not b: continue
                dd = math.hypot(a[0] - b[0], a[1] - b[1])
                if r['t3'] is None and dd <= 3: r['t3'] = (f - H) * dt
                if r['t1'] is None and dd <= 1: r['t1'] = (f - H) * dt; break
            RUN[side].append(r)
print('safeties aligned 8+ yd deep at the snap; passes = dropbacks without play action')
print(f"{'family':16} {'n':>5} | depth at snap | at 0.25 / 0.5 / 1.0 / 2.0 s: depth (speed yd/s) | at the throw: depth p25/p50/p75, speed")
for fam in sorted(PASS, key=lambda k: -len(PASS[k]['dT'])):
    R = PASS[fam]
    if len(R['dT']) < 30: continue
    cells = ' / '.join(f"{q(R['d' + k], .5):.1f} ({q(R['s' + k], .5):.1f})" for k in ('25', '50', '100', '200'))
    print(f"{fam:16} {len(R['dT']):5} | {q(R['d0'], .5):5.1f}         | {cells} | {q(R['dT'], .25):.1f}/{q(R['dT'], .5):.1f}/{q(R['dT'], .75):.1f}, {q(R['sT'], .5):.1f}")
print('runs (handoff to the carrier):')
for side, rs in RUN.items():
    if not rs: continue
    for k, lab in (('t3', 'within 3 yd'), ('t1', 'within 1 yd')):
        ok = [r[k] for r in rs if r[k] is not None]
        print(f"  {side:11} n {len(rs):5} | {lab}: {100 * len(ok) / len(rs):4.0f}% reach it, p50 {q(ok, .5):.1f} s (p25/p75 {q(ok, .25):.1f}/{q(ok, .75):.1f}) | depth at handoff + 1.0 s p50 {q([r['d'] for r in rs if r['d'] is not None], .5):.1f}")
