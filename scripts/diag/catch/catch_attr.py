"""Where our uncontested drops live, from the catch-roll tap (catch_tap.mts, a local patch of catching.ts), against the NFL's arrival rows (nfl_arrival.py).
  python3 -I scripts/diag/catch/catch_attr.py NFL_ARRIVAL.jsonl.gz ROWS1.jsonl [ROWS2.jsonl ...] [--out report.md]

Ours: the target's first catch roll of each pass, no defender within 1.5 yd of him (`sep`), not a deflected ball, no hand of a defender through his arms (`diffHands` 0). Failure probability of the roll = 1 - pCatch with
 pCatch = clamp(0.985 - diff x (1.3 - hands) - 0.06 x (1 - hands), 0.2, 0.99), diff = 0.5 stretch + 0.4 high + 0.35 low + 0.08 (ball over 24 yd/s) + trackPen + shoulder (catching.ts:234-236),
so a roll's failure splits exactly into: floor = 0.015 + 0.06 (1 - hands) (the rating alone), and (1.3 - hands) x each difficulty term. An 'on target' ball = his centre within 1.0 yd of the ball at the roll (the NFL's filter).
A drop is the sim's own label: a lost roll with diff < 0.35 (the rest are 'miss'). NFL: drop = the tracking's dropped_pass tag over (caught + dropped)."""
import gzip, json, sys, collections
import numpy as np
args = [a for i, a in enumerate(sys.argv) if i > 0 and not a.startswith('--') and sys.argv[i - 1] != '--out']
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
nfl = [json.loads(l) for l in gzip.open(args[0], 'rt')]
ours = []
for f in args[1:]:
    for l in open(f): ours.append(json.loads(l))
U = [r for r in ours if r['first'] and r['sep'] > 1.5 and not r['deflected'] and r['diffHands'] == 0 and not r['contested']]
lines = []; P = lambda s='': lines.append(s)
pct = lambda a, b: f'{100 * a / max(1, b):.1f}%'
def terms(r):
    k = 1.3 - r['hands']
    return {'floor': 0.015 + 0.06 * (1 - r['hands']), 'stretch (ball off his hands)': k * 0.5 * r['stretch'], 'high ball': k * 0.4 * r['high'], 'low ball': k * 0.35 * r['low'],
            'hard ball (over 24 yd/s)': k * (0.08 if r['ballSpeed'] > 24 else 0), 'tracking penalty (long flight)': k * r['trackPen'], 'running-track term (CATCH_SPEED)': k * r['shoulder']}
P('## Our uncontested catch rolls against the NFL\'s drops\n')
P(f'Ours: {len(ours)} catch rolls, {sum(r["first"] for r in ours)} first rolls of a targeted pass, {len(U)} uncontested (nearest defender over 1.5 yd, no contest, not deflected), {sum(1 for r in U if r["dBall"] <= 1.0)} of them with the ball within 1.0 yd of him. NFL: {len(nfl)} targeted passes at arrival, {sum(1 for r in nfl if r["near"] > 1.5)} with no defender within 1.5 yd.\n')
def rate_ours(S):
    c = sum(r['won'] for r in S); d = sum((not r['won']) and r['diff'] < 0.35 for r in S); m = sum((not r['won']) and r['diff'] >= 0.35 for r in S)
    return c, d, m
P('### Rates (uncontested)\n'); P('| sample | rolls | caught | drop (diff < 0.35) | miss (diff >= 0.35) | drop / (caught + drop) | not caught / all |'); P('|---|---|---|---|---|---|---|')
for lab, S in (('ours, all', U), ('ours, ball within 1.0 yd', [r for r in U if r['dBall'] <= 1.0]), ('ours, ball within 0.5 yd', [r for r in U if r['dBall'] <= 0.5])):
    c, d, m = rate_ours(S); P(f'| {lab} | {len(S)} | {c} | {d} | {m} | {pct(d, c + d)} | {pct(d + m, len(S))} |')
NU = [r for r in nfl if r['near'] > 1.5 and (r['c'] or r['drop'])]
P(f'| NFL (dropped_pass tag), caught or dropped | {len(NU)} | {sum(r["c"] for r in NU)} | {sum(r["drop"] for r in NU)} | | {pct(sum(r["drop"] for r in NU), len(NU))} | |')
NU1 = [r for r in nfl if r['near'] > 1.5 and r['d'] <= 1.0]
P(f'| NFL, ball within 1.0 yd, not caught | {len(NU1)} | {sum(r["c"] for r in NU1)} | | | | {pct(sum(not r["c"] for r in NU1), len(NU1))} |')
P('')
P('### Where the ball is: distance from his centre at the roll (ours) / at pass_arrived (NFL), yd\n'); P('| sample | n | p25 | p50 | p75 | p90 | share over 1 yd | share over 2 yd |'); P('|---|---|---|---|---|---|---|---|')
def dist_row(lab, v):
    v = np.array(v)
    if len(v) < 5: P(f'| {lab} | {len(v)} | | | | | | |'); return
    P(f'| {lab} | {len(v)} | ' + ' | '.join(f'{np.percentile(v, q):.2f}' for q in (25, 50, 75, 90)) + f' | {100 * np.mean(v > 1):.0f}% | {100 * np.mean(v > 2):.0f}% |')
dist_row('NFL, all targeted, no defender within 1.5 yd', [r['d'] for r in nfl if r['near'] > 1.5])
dist_row('NFL, caught', [r['d'] for r in nfl if r['near'] > 1.5 and r['c']])
dist_row('NFL, dropped (tag)', [r['d'] for r in nfl if r['near'] > 1.5 and r['drop']])
dist_row('NFL, incomplete and not tagged', [r['d'] for r in nfl if r['near'] > 1.5 and not r['c'] and not r['drop']])
dist_row('ours, all uncontested first rolls', [r['dBall'] for r in U])
dist_row('ours, caught', [r['dBall'] for r in U if r['won']])
dist_row('ours, dropped (diff < 0.35)', [r['dBall'] for r in U if (not r['won']) and r['diff'] < 0.35])
dist_row('ours, missed (diff >= 0.35)', [r['dBall'] for r in U if (not r['won']) and r['diff'] >= 0.35])
P('')
P('NFL drop rate by the ball\'s distance at arrival (uncontested, caught or dropped):\n'); P('| distance | NFL n | NFL dropped | ours n | ours dropped (of caught + dropped) | ours not caught (all) |'); P('|---|---|---|---|---|---|')
for lo, hi in ((0, 0.5), (0.5, 1.0), (1.0, 1.5), (1.5, 2.5), (2.5, 99)):
    A = [r for r in nfl if r['near'] > 1.5 and (r['c'] or r['drop']) and lo <= r['d'] < hi]; B = [r for r in U if lo <= r['dBall'] < hi]
    c, d, m = rate_ours(B)
    P(f'| {lo}-{hi} | {len(A)} | {pct(sum(r["drop"] for r in A), len(A))} | {len(B)} | {pct(d, c + d)} | {pct(d + m, len(B))} |')
P('')
P('### Attribution: the expected failure probability by term (ours, uncontested, ball within 1.0 yd), and the same on the rolls that were dropped\n')
S1 = [r for r in U if r['dBall'] <= 1.0]
keys = list(terms(S1[0]).keys())
P('| term | mean over all rolls (pts) | mean over the dropped rolls (pts) | share of the dropped rolls\' expected failure |'); P('|---|---|---|---|')
allm = {k: np.mean([terms(r)[k] for r in S1]) for k in keys}
drp = [r for r in S1 if (not r['won']) and r['diff'] < 0.35]
dm = {k: np.mean([terms(r)[k] for r in drp]) if drp else float('nan') for k in keys}
tot = sum(dm.values()) if drp else 1
for k in keys: P(f'| {k} | {100 * allm[k]:.2f} | {100 * dm[k]:.2f} | {100 * dm[k] / tot:.0f}% |')
P(f'| expected failure (sum) | {100 * sum(allm.values()):.2f} | {100 * sum(dm.values()):.2f} | |')
P(f'| realised not-caught | {pct(sum(not r["won"] for r in S1), len(S1))} | | |')
P(f'| hands rating (mean, p25-p75) | {np.mean([r["hands"] for r in S1]):.2f} ({np.percentile([r["hands"] for r in S1], 25):.2f}-{np.percentile([r["hands"] for r in S1], 75):.2f}) | {np.mean([r["hands"] for r in drp]):.2f} | |')
P('')
P('Counterfactual on the same rolls: the expected drop rate (drop / (caught + drop), the sim\'s label) with one term removed (the rest as rolled):\n')
def exp_rate(S, drop_terms=()):
    tot = 0.0; n = 0
    for r in S:
        t = terms(r); p = sum(v for k, v in t.items() if k not in drop_terms)
        if r['diff'] < 0.35: tot += p; n += 1
    return tot / max(1, n)
P('| removed | expected drop rate among rolls with diff < 0.35 |'); P('|---|---|')
P(f'| nothing | {100 * exp_rate(S1):.1f}% |')
for k in keys: P(f'| {k} | {100 * exp_rate(S1, (k,)):.1f}% |')
P('')
P('### By his speed and the ball\'s direction (uncontested, ball within 1.0 yd), realised and the expected failure\'s two halves\n'); P('| group | n | not caught | drop / (caught + drop) | floor (pts) | stretch (pts) | running-track (pts) | other (pts) | NFL drop (tag) |'); P('|---|---|---|---|---|---|---|---|---|')
def grp(lab, f, nf):
    S = [r for r in S1 if f(r)]
    if len(S) < 8: return
    c, d, m = rate_ours(S); ts = [terms(r) for r in S]
    NF = [r for r in nfl if r['near'] > 1.5 and (r['c'] or r['drop']) and nf(r)]
    other = np.mean([sum(v for k, v in t.items() if k not in ('floor', 'stretch (ball off his hands)', 'running-track term (CATCH_SPEED)')) for t in ts])
    P(f'| {lab} | {len(S)} | {pct(sum(not r["won"] for r in S), len(S))} | {pct(d, c + d)} | {100 * np.mean([t["floor"] for t in ts]):.1f} | {100 * np.mean([t["stretch (ball off his hands)"] for t in ts]):.1f} | {100 * np.mean([t["running-track term (CATCH_SPEED)"] for t in ts]):.1f} | {100 * other:.1f} | {pct(sum(r["drop"] for r in NF), len(NF))} (n {len(NF)}) |')
for lo, hi in ((0, 2), (2, 4), (4, 6), (6, 8), (8, 99)): grp(f'speed {lo}-{hi}', lambda r, lo=lo, hi=hi: lo <= r['rs'] < hi, lambda r, lo=lo, hi=hi: lo <= r['sp'] < hi)
grp('ball from behind (cos > 0.5)', lambda r: r['cosRun'] > 0.5 and r['rs'] > 1, lambda r: r['cos'] is not None and r['cos'] > 0.5)
grp('across', lambda r: -0.5 <= r['cosRun'] <= 0.5 and r['rs'] > 1, lambda r: r['cos'] is not None and -0.5 <= r['cos'] <= 0.5)
grp('runs at it (cos < -0.5)', lambda r: r['cosRun'] < -0.5 and r['rs'] > 1, lambda r: r['cos'] is not None and r['cos'] < -0.5)
grp('standing (speed < 1)', lambda r: r['rs'] <= 1, lambda r: r['cos'] is None)
P('')
P('### By his hands rating (ours, uncontested, ball within 1.0 yd): the rating rolled against the outcome\n'); P('| hands rating | n | not caught | drop / (caught + drop) | expected floor (pts) | expected failure (pts) |'); P('|---|---|---|---|---|---|')
for lo, hi in ((0, 0.6), (0.6, 0.7), (0.7, 0.8), (0.8, 1.01)):
    S = [r for r in S1 if lo <= r['hands'] < hi]
    if len(S) < 8: continue
    c, d, m = rate_ours(S); ts = [terms(r) for r in S]
    P(f'| {lo:.1f}-{min(hi, 1):.1f} | {len(S)} | {pct(sum(not r["won"] for r in S), len(S))} | {pct(d, c + d)} | {100 * np.mean([t["floor"] for t in ts]):.1f} | {100 * np.mean([sum(t.values()) for t in ts]):.1f} |')
P('')
P('### His hands against the ball: dh (the ball path\'s closest horizontal approach to his centre) and the reach it is scaled by (ours, uncontested first rolls)\n'); P('| | p25 | p50 | p75 | p90 |'); P('|---|---|---|---|---|')
for lab, v in (('dh (yd)', [r['dh'] for r in U]), ('reach + 0.3 (yd)', [r['reach'] for r in U]), ('stretch = (dh/reach)^2', [r['stretch'] for r in U]), ('height of the ball z (yd)', [r['z'] for r in U])):
    P(f'| {lab} | ' + ' | '.join(f'{np.percentile(v, q):.2f}' for q in (25, 50, 75, 90)) + ' |')
txt = '\n'.join(lines)
if OUT: open(OUT, 'w').write(txt)
print(txt)
