"""Speed kept through a heading change, NFL vs ours vs the bench, one operator (positions only, 10 Hz).
  python3 -I scripts/diag/pursuit/turn_speed.py [--out report.md] [--tsv events.tsv] NFLCATCH.jsonl.gz NFLRUN.jsonl.gz LABEL=SIMCATCH.jsonl.gz,SIMRUN.jsonl.gz [...] [--bench turn-bench.jsonl.gz]

Plays are in the open-census play format through the end of the play (catch = the frame the carrier has the ball, recv = him). Who is read:
  carrier  = recv, frames from `catch` on (a receiver after the catch, a back after the handoff);
  pursuer  = a defender, frames from `catch` on, within 12 yd of the carrier at the event, and no closer than 1.5 yd to him anywhere from 0.3 s
             before to 0.8 s after it (a tackler in contact is not turning, he is being stopped).
A turn = a run of frames over which the heading (direction of the 0.4 s centred displacement) moves one way, seeded at 0.3 rad/s and extended while above 0.15 rad/s (gaps up to 2 frames); it starts in
`catch` onward. Start s = its first frame, end e = its last, angle = the heading change from s-1 to e+1 (20 degrees or more). Entry speed = the mean speed
(centred 0.2 s difference) over the 3 frames before s; a turn needs 4.5 yd/s of it, and no more than a fifth under his fastest speed in the second before (no restarts from a stop). Measured on the turn: min speed from s-0.3 to e+0.8 s and min / entry; speed 0.6 s after
the start over entry; turn time = (e - s + 1) / 10; path length = the track between s and e; exit speed = speed at e over entry; lateral acceleration = mean speed x angle / time^2... (path / time x angle / time).
Bins: entry 4.75-6.25 / 6.25-7.75 / 7.75-9.5 yd/s (labelled 5.5 / 7 / 8.5), angle 20-45 / 45-75 / 75-105 / 105-150 degrees (labelled 30 / 60 / 90 / 120).
The bench plays (turn_bench.mts) are tracks of one body with a known request at frame t0; they go through the same event finder, on the frames around t0."""
import gzip, json, sys, math, collections
import numpy as np
argv = sys.argv[1:]
def opt(n):
    if n in argv:
        i = argv.index(n); v = argv[i + 1]; del argv[i:i + 2]; return v
OUT = opt('--out'); TSV = opt('--tsv'); BENCH = opt('--bench')
ALONE = '--alone' in argv
if ALONE: argv.remove('--alone')
args = argv
WIN = 6
NEAR = 1.0  # yd: another body's centre this close is contact (body radii about 0.3 yd each, hands and arms out)
wrap = lambda a: (a + math.pi) % (2 * math.pi) - math.pi
def speed(X, Y, f, nf):
    a, b = max(0, f - 1), min(nf - 1, f + 1)
    return math.hypot(X[b] - X[a], Y[b] - Y[a]) / ((b - a) / 10.0)
def head(X, Y, f, nf):
    a, b = max(0, f - 1), min(nf - 1, f + 1)
    return math.atan2(Y[b] - Y[a], X[b] - X[a])
def hdg(X, Y, f, nf):
    a, b = max(0, f - 2), min(nf - 1, f + 2)
    return math.atan2(Y[b] - Y[a], X[b] - X[a])
SEED, KEEP = 0.3, 0.15  # rad/s: a turn is seeded by a frame whose heading (0.4 s displacement direction) moves faster than SEED and extended while it moves one way faster than KEEP
def extras(ev, FC, DC, LN, X, Y, AV=None, PA=None, PN=None):
    s, e = ev['s'], ev['e']; nf = len(X)
    if DC is not None: ev['dcm'] = float(np.mean(DC[s:e + 1])); ev['dcmin'] = float(np.min(DC[s:e + 1]))
    if LN is not None: ev['lean'] = float(np.mean(LN[s:e + 1]))
    if AV is not None: ev['avm'] = float(np.mean(AV[s:e + 1])); ev['avmin'] = float(np.min(AV[s:e + 1]))
    if PA is not None:
        pa = [v for v in PA[s:e + 1] if v is not None and v == v]; pn = [abs(v) for v in PN[s:e + 1] if v is not None and v == v]
        if pa and pn: ev['pa'] = float(np.mean(pa)); ev['pn'] = float(np.mean(pn)); ev['pamin'] = float(np.min(pa))
    if FC is not None:
        d = [abs(math.degrees(wrap(FC[f] - hdg(X, Y, f, nf)))) for f in range(s, e + 1)]; ev['foff'] = float(np.mean(d)); ev['fmax'] = float(np.max(d))
    return ev
def events(X, Y, lo, hi):
    """turns of one track that start in [lo, hi). A turn = a run of frames over which the heading moves one way at more than RATE rad/s (gaps of 2 frames
    allowed); start s = its first frame, end e = its last; angle = the heading change from s-1 to e+1. Metrics are relative to the start."""
    nf = len(X); out = []
    rate = [0.0] * nf
    for f in range(3, nf - 3):
        a, b = (X[f] - X[f - 2], Y[f] - Y[f - 2]), (X[f + 2] - X[f], Y[f + 2] - Y[f])
        rate[f] = wrap(math.atan2(b[1], b[0]) - math.atan2(a[1], a[0])) / 0.4 if math.hypot(*a) > 0.4 and math.hypot(*b) > 0.4 else 0.0
    f = 3
    while f < nf - 3:
        if abs(rate[f]) < SEED: f += 1; continue
        sgn = 1 if rate[f] > 0 else -1; s = f; e = f
        while s - 1 >= 3 and rate[s - 1] * sgn >= KEEP: s -= 1
        g = e + 1
        while g < nf - 3 and g - e <= 2:
            if rate[g] * sgn >= KEEP: e = g
            g += 1
        f = e + 1
        if not (lo <= s < hi) or s < 12 or e + 12 >= nf: continue
        ang = abs(math.degrees(wrap(hdg(X, Y, e + 1, nf) - hdg(X, Y, s - 1, nf))))
        if ang < 20: continue
        ent = sum(speed(X, Y, q, nf) for q in range(s - 3, s)) / 3.0  # the speed just before the turn
        if ent < 4.5 or ent < 0.8 * max(speed(X, Y, q, nf) for q in range(s - 10, s)): continue  # not a restart from a slower stretch
        sp = [speed(X, Y, q, nf) for q in range(s - 3, e + 9)]; mn = min(sp)
        dur = max(0.1, (e - s + 1) / 10.0); path = sum(math.hypot(X[q + 1] - X[q], Y[q + 1] - Y[q]) for q in range(s, e + 1))
        out.append(dict(k=s, ang=ang, ent=ent, mn=mn, minr=mn / ent, f6=speed(X, Y, s + 6, nf) / ent, f10=speed(X, Y, s + 10, nf) / ent, dur=dur, path=path,
                        ex=speed(X, Y, e, nf) / ent, alat=(path / dur) * math.radians(ang) / dur, s=s, e=e,
                        peak=max(speed(X, Y, q, nf) * abs(rate[q]) for q in range(max(3, s), min(nf - 3, e + 1)))))
    return out
ANG = [(20, 45, '30'), (45, 75, '60'), (75, 105, '90'), (105, 150, '120')]; ENT = [(4.75, 6.25, '5.5'), (6.25, 7.75, '7'), (7.75, 9.5, '8.5')]
angb = lambda a: next((l for lo, hi, l in ANG if lo <= a < hi), None); entb = lambda e: next((l for lo, hi, l in ENT if lo <= e < hi), None)
def rows_of(paths, src):
    rows = []
    for path in paths:
        for l in gzip.open(path, 'rt'):
            p = json.loads(l); X = np.array(p['x']); Y = np.array(p['y']); pl = p['players']; c = p.get('catch'); r = p.get('recv')
            if c is None or r is None or r < 0: continue
            nf = X.shape[1]
            for i, q in enumerate(pl):
                if i == r: role = 'carrier'
                elif q['side'] == 'D': role = 'pursuer'
                else: continue
                for ev in events(X[i].tolist(), Y[i].tolist(), c, nf):
                    k = ev['k']
                    if role == 'pursuer':
                        d = [math.hypot(X[i, f] - X[r, f], Y[i, f] - Y[r, f]) for f in range(max(0, k - 3), min(nf, ev['e'] + 9))]
                        if math.hypot(X[i, k] - X[r, k], Y[i, k] - Y[r, k]) > 12: continue
                    if p.get('dc'): extras(ev, p['fc'][i], p['dc'][i], p['ln'][i], X[i].tolist(), Y[i].tolist(), p['av'][i] if p.get('av') else None, p['pa'][i] if p.get('pa') else None, p['pn'][i] if p.get('pn') else None)
                    if p.get('qx'):
                        qs = [math.hypot(p['qx'][i][f], p['qy'][i][f]) for f in range(ev['k'], min(nf, ev['e'] + 1))]
                        ev['req'] = float(np.mean(qs)) if qs else None; ev['reqmax'] = max(qs) if qs else None
                        # the angle asked: the request's direction against the entry heading, averaged over the first 0.5 s of the turn (frames with a request over 1 yd/s)
                        h0 = hdg(X[i].tolist(), Y[i].tolist(), ev['k'] - 1, nf); aa = [abs(math.degrees(wrap(math.atan2(p['qy'][i][f], p['qx'][i][f]) - h0))) for f in range(ev['k'], min(nf, ev['k'] + 5)) if math.hypot(p['qx'][i][f], p['qy'][i][f]) > 1.0]
                        ev['ask'] = float(np.mean(aa)) if aa else None
                        # heading lag: the angle between the request and the velocity at the end of the turn
                        f = min(nf - 2, ev['e']); vx, vy = X[i, f + 1] - X[i, f - 1], Y[i, f + 1] - Y[i, f - 1]
                        ev['lag'] = abs(math.degrees(wrap(math.atan2(p['qy'][i][f], p['qx'][i][f]) - math.atan2(vy, vx)))) if qs and math.hypot(vx, vy) > 0.2 else None
                    lo_f, hi_f = max(0, ev['k'] - 3), min(nf, ev['e'] + 9)
                    ev['free'] = not any(np.hypot(X[j, lo_f:hi_f] - X[i, lo_f:hi_f], Y[j, lo_f:hi_f] - Y[i, lo_f:hi_f]).min() < NEAR for j in range(len(pl)) if j != i)
                    ev['down'] = bool(ev.get('avmin') is not None and ev['avmin'] <= 0.001)
                    ev.update(role=role, src=src, pos=q.get('pos'), id=p.get('id')); rows.append(ev)
    return rows
data = {}
nfl = [a for a in args if '=' not in a]
data['NFL'] = rows_of(nfl, 'nfl')
for a in args:
    if '=' in a:
        lab, ps = a.split('=', 1); data[lab] = rows_of(ps.split(','), lab)
allev = {lab: R for lab, R in data.items()}
fell = {lab: [r for r in R if r.get('down') and (r['free'] or not ALONE)] for lab, R in data.items()}
data = {lab: [r for r in R if (r['free'] or not ALONE) and not r.get('down')] for lab, R in data.items()}  # contact-free turns only; a body that went down alone is counted below
bench = []
if BENCH:
    for l in gzip.open(BENCH, 'rt'):
        p = json.loads(l); X = p['x'][0]; Y = p['y'][0]; t0 = p['t0']
        evs = [ev for ev in events(X, Y, t0 - 2, t0 + 6) if ev['ang'] >= 0.5 * abs(p['ang'])]
        if evs: ev = max(evs, key=lambda e: e['ang']); extras(ev, p['fc'][0], p['dc'][0], p['ln'][0], X, Y, p['av'][0], p['pa'][0], p['pn'][0]) if p.get('dc') else None; ev.update(role=p['slot'], src='bench', req=abs(p['ang']), v0=p['v0']); bench.append(ev)
        else: bench.append(dict(role=p['slot'], src='bench', req=abs(p['ang']), v0=p['v0'], none=True))
m = lambda v: float(np.mean(v)) if len(v) else float('nan')
q = lambda v, p: float(np.percentile(v, p)) if len(v) else float('nan')
lines = []; P = lambda s='': lines.append(s)
P('## Speed kept through a heading change (NFL BDB 2025 weeks 1-9 vs the sim, one operator)\n')
P(('Events with another body within 1 yd (0.3 s before to 0.9 s after) are left out, so every row is a body turning alone: kept / found: ' if ALONE else 'All events (a pursuer within 1 yd of the carrier is left out; other bodies may be near): kept / found: ') + ', '.join(f'{k} {len(data[k]) + len(fell[k])} / {len(allev[k])}' for k in data) + '. Of the kept, ended with the body off his feet (sim only, support availability 0): ' + ', '.join(f'{k} {len(v)}' for k, v in fell.items() if k != 'NFL') + '.\n')
P('Events: ' + '; '.join(f'{k}: ' + ', '.join(f'{ro} {sum(1 for r in R if r["role"] == ro)}' for ro in ('carrier', 'pursuer')) for k, R in data.items()) + '\n')
H = '| role | entry | angle | sample | n | entry speed | min speed | min / entry (mean, p25, p75) | +0.6 s / entry | exit / entry | turn time (s) | path (yd) | lateral accel (yd/s2) |'
def table(title, sel, key, labs):
    P(f'### {title}\n'); P(H); P('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
    for role in ('pursuer', 'carrier'):
        for ent in ('5.5', '7', '8.5'):
            for ang in labs:
                for lab, R in data.items():
                    S = [r for r in R if r['role'] == role and entb(r['ent']) == ent and angb(r['ang']) == ang]
                    if len(S) < 10: P(f'| {role} | {ent} | {ang} | {lab} | {len(S)} | | | | | | | | |'); continue
                    P(f'| {role} | {ent} | {ang} | {lab} | {len(S)} | {m([r["ent"] for r in S]):.1f} | {m([r["mn"] for r in S]):.1f} | {m([r["minr"] for r in S]):.2f} ({q([r["minr"] for r in S], 25):.2f}, {q([r["minr"] for r in S], 75):.2f}) | {m([r["f6"] for r in S]):.2f} | {m([r["ex"] for r in S]):.2f} | {m([r["dur"] for r in S]):.2f} | {m([r["path"] for r in S]):.1f} | {m([r["alat"] for r in S]):.1f} |')
    P('')
table('By entry speed and angle', None, None, ['30', '60', '90', '120'])
def env_table():
    P('### The upper end of each cell: what the best turns do (NFL and sim: the best tenth of events; bench: the mean, which is a full-effort request)\n')
    P('| role | entry | angle | sample | n | min / entry, best tenth | turn time, fastest tenth (s) | peak lateral accel, best tenth (yd/s2) | exit / entry, best tenth |'); P('|---|---|---|---|---|---|---|---|---|')
    for role in ('pursuer', 'carrier'):
        for ent in ('5.5', '7', '8.5'):
            for ang in ('60', '90', '120'):
                for lab, R in data.items():
                    S = [r for r in R if r['role'] == role and entb(r['ent']) == ent and angb(r['ang']) == ang]
                    if len(S) < 20: continue
                    P(f'| {role} | {ent} | {ang} | {lab} | {len(S)} | {q([r["minr"] for r in S], 90):.2f} | {q([r["dur"] for r in S], 10):.2f} | {q([r["peak"] for r in S], 90):.1f} | {q([r["ex"] for r in S], 90):.2f} |')
    P('')
env_table()
def req_table():
    P('### The sim by what the controller asked (mean request speed over the turn; the bench asks the body\'s top speed)\n')
    P('| role | angle | ask | n | entry speed | request (yd/s) | min / entry | exit / entry | turn time (s) | request-to-velocity heading lag at the turn\'s end (deg) |'); P('|---|---|---|---|---|---|---|---|---|---|')
    for lab, R in data.items():
        if lab == 'NFL' or not any(r.get('req') is not None for r in R): continue
        for role in ('pursuer', 'carrier'):
            for ang in ('30', '60', '90', '120'):
                for name, lo, hi in (('under 6', 0, 6), ('6-8.5', 6, 8.5), ('8.5 and over', 8.5, 99)):
                    S = [r for r in R if r['role'] == role and angb(r['ang']) == ang and r.get('req') is not None and lo <= r['req'] < hi]
                    if len(S) < 8: continue
                    lag = [r['lag'] for r in S if r.get('lag') is not None]
                    P(f'| {role} | {ang} | {name} | {len(S)} | {m([r["ent"] for r in S]):.1f} | {m([r["req"] for r in S]):.1f} | {m([r["minr"] for r in S]):.2f} | {m([r["ex"] for r in S]):.2f} | {m([r["dur"] for r in S]):.2f} | {m(lag):.0f} |')
    P('')
req_table()
def ask_table():
    P('### Sim and bench by the angle ASKED (the request\'s direction against the entry heading, first 0.5 s of the turn), full asks only (8.5 yd/s and over)\n')
    P('| sample | role | asked (deg) | n | entry speed | achieved turn (deg) | min / entry | exit / entry | turn time (s) |'); P('|---|---|---|---|---|---|---|---|---|')
    bins = [(20, 45, '30'), (45, 75, '60'), (75, 105, '90'), (105, 135, '120'), (135, 181, '150+')]
    for lab, R in data.items():
        if lab == 'NFL': continue
        for role in ('pursuer', 'carrier'):
            for lo, hi, nm in bins:
                S = [r for r in R if r['role'] == role and r.get('ask') is not None and lo <= r['ask'] < hi and (r.get('req') or 0) >= 8.5]
                if len(S) < 8: continue
                P(f'| {lab} | {role} | {nm} (asked {m([r["ask"] for r in S]):.0f}) | {len(S)} | {m([r["ent"] for r in S]):.1f} | {m([r["ang"] for r in S]):.0f} | {m([r["minr"] for r in S]):.2f} | {m([r["ex"] for r in S]):.2f} | {m([r["dur"] for r in S]):.2f} |')
    for ang in (30, 60, 90, 120):
        S = [r for r in bench if not r.get('none') and r['req'] == ang and r['v0'] in (5.5, 7)]
        if S: P(f'| bench | one body | {ang} (asked {ang}) | {len(S)} | {m([r["ent"] for r in S]):.1f} | {m([r["ang"] for r in S]):.0f} | {m([r["minr"] for r in S]):.2f} | {m([r["ex"] for r in S]):.2f} | {m([r["dur"] for r in S]):.2f} |')
    P('')
def term_table():
    P('### What the body does in a full-ask turn: sim events asked 8.5 yd/s or more, and the bench (hips off the line of travel, the speed cap they allow, lean)\n')
    P('| sample | role | angle | n | entry speed | min / entry | exit / entry | hips off travel, mean / max (deg) | directional cap factor, mean / min | support availability, mean / min | planned accel along / across (yd/s2) |'); P('|---|---|---|---|---|---|---|---|---|---|---|')
    for lab, R in list(data.items()) + [('bench', bench)]:
        if lab == 'NFL': continue
        for role in (('pursuer', 'carrier') if lab != 'bench' else ('all',)):
            for ang in ('30', '60', '90', '120'):
                if lab == 'bench': S = [r for r in R if not r.get('none') and r.get('dcm') is not None and str(int(r['req'])) == ang and r['v0'] in (5.5, 7)]
                else: S = [r for r in R if r['role'] == role and angb(r['ang']) == ang and (r.get('req') or 0) >= 8.5 and r.get('dcm') is not None]
                if len(S) < 8: continue
                P(f'| {lab} | {role} | {ang} | {len(S)} | {m([r["ent"] for r in S]):.1f} | {m([r["minr"] for r in S]):.2f} | {m([r["ex"] for r in S]):.2f} | {m([r["foff"] for r in S]):.0f} / {m([r["fmax"] for r in S]):.0f} | {m([r["dcm"] for r in S]):.2f} / {m([r["dcmin"] for r in S]):.2f} | {m([r.get("avm", float("nan")) for r in S]):.2f} / {m([r.get("avmin", float("nan")) for r in S]):.2f} | {m([r.get("pa", float("nan")) for r in S]):.1f} / {m([r.get("pn", float("nan")) for r in S]):.1f} |')
    P('')
term_table()
ask_table()
if bench:
    P('### Bench: one body asked for the turn at full effort (the same operator, mean over bodies and both turn directions)\n')
    P('| entry | asked | bodies | min speed | min / entry | +0.6 s / entry | exit / entry | turn time (s) | path (yd) | lateral accel (yd/s2) | peak lateral accel (yd/s2) |'); P('|---|---|---|---|---|---|---|---|---|---|---|')
    for v0 in (5.5, 7, 8.5):
        for ang in (30, 60, 90, 120):
            S = [r for r in bench if r['v0'] == v0 and r['req'] == ang and not r.get('none')]
            if not S: continue
            P(f'| {v0} | {ang} | {len(S)} | {m([r["mn"] for r in S]):.1f} | {m([r["minr"] for r in S]):.2f} | {m([r["f6"] for r in S]):.2f} | {m([r["ex"] for r in S]):.2f} | {m([r["dur"] for r in S]):.2f} | {m([r["path"] for r in S]):.1f} | {m([r["alat"] for r in S]):.1f} | {m([r["peak"] for r in S]):.1f} |')
    P('')
if BENCH:
    P('### Bench, read from the request itself (so a 30 degree ask is in): mean over bodies and both directions\n')
    P('| entry | asked | bodies | min / entry in the next 2 s | time to 90% of the asked heading (s) | speed then / entry | path to then (yd) |'); P('|---|---|---|---|---|---|---|')
    rowsb = collections.defaultdict(list)
    for l in gzip.open(BENCH, 'rt'):
        p = json.loads(l); X = p['x'][0]; Y = p['y'][0]; t0 = p['t0']; nf = len(X); sg = 1 if p['ang'] > 0 else -1; a = abs(p['ang'])
        ent = sum(speed(X, Y, f, nf) for f in range(t0 - 3, t0)) / 3.0; h0 = hdg(X, Y, t0 - 3, nf)
        mn = min(speed(X, Y, f, nf) for f in range(t0, min(nf - 1, t0 + 21))) / ent
        te = next((f for f in range(t0, nf - 2) if sg * wrap(hdg(X, Y, f, nf) - h0) >= 0.9 * math.radians(a)), None)
        if te is None: rowsb[(p['v0'], a)].append((mn, None, None, None)); continue
        rowsb[(p['v0'], a)].append((mn, (te - t0) / 10.0, speed(X, Y, te, nf) / ent, sum(math.hypot(X[f + 1] - X[f], Y[f + 1] - Y[f]) for f in range(t0, te))))
    for (v0, a), L in sorted(rowsb.items()):
        ok = [x for x in L if x[1] is not None]
        P(f'| {v0} | {a} | {len(L)} | {m([x[0] for x in L]):.2f} | {m([x[1] for x in ok]):.2f} ({len(ok)} of {len(L)} reach it) | {m([x[2] for x in ok]):.2f} | {m([x[3] for x in ok]):.1f} |')
    P('')
txt = '\n'.join(lines)
if OUT: open(OUT, 'w').write(txt)
if TSV:
    with open(TSV, 'w') as f:
        f.write('src\trole\tpos\tid\tk\tang\tent\tmin\tminr\tf6\texit\tdur\tpath\talat\n')
        for lab, R in list(data.items()) + [('bench', bench)]:
            for r in R:
                if r.get('none'): continue
                f.write(f'{lab}\t{r["role"]}\t{r.get("pos","")}\t{r.get("id","")}\t{r.get("k","")}\t{r["ang"]:.0f}\t{r["ent"]:.2f}\t{r["mn"]:.2f}\t{r["minr"]:.3f}\t{r["f6"]:.3f}\t{r["ex"]:.3f}\t{r["dur"]:.2f}\t{r["path"]:.2f}\t{r["alat"]:.2f}\n')
print(txt)
