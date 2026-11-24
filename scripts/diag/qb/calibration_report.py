"""Calibration of the passer's throw decision: believed completion and interception against what happened, split by the defender role that mattered.
  python3 -I scripts/diag/qb/calibration_report.py ROWS.jsonl [ROWS2.jsonl ...] [--out report.md]
Rows come from scripts/diag/qb/calibration.ts. Believed: P (completion) and intRisk (interception) from the engine's ThrowEval at the decision. Actual: completion, interception, breakup, drop.
Tables: (1) overall and by believed-P bin; (2) by the strongest role present at the decision (a driver within 14 yd facing the passer within 60 degrees > a lane man on the ball's path > the coverer alone), believed vs actual completion and interception;
(3) the role of the defender who mattered (credited with the interception or breakup; for a completion the coverer), counts and share of the believed interceptions; (4) by route family; (5) by passer rating band; (6) by coverage.
A cell is printed with its n; the standard error of a rate is sqrt(p(1-p)/n)."""
import json, sys, collections, math
import numpy as np
args = [a for i, a in enumerate(sys.argv) if i > 0 and not a.startswith('--') and sys.argv[i - 1] != '--out']
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
R = []
for f in args: R.extend(json.loads(l) for l in open(f) if l.strip())
# The tap's 'driver' (any non-rusher within 14 yd of the catch point facing the passer within 60 degrees) is nearly everyone (safeties, backers); the report's driver is the one who can drive on THIS throw:
# within 8 yd of the catch point and facing the passer within 45 degrees. Others are 'other'.
for r in R:
    for d in r['defs']:
        if d['role'] == 'driver' and not (d['dist'] <= 8 and d['faceQB'] <= 45): d['role'] = 'other'
    r['matteredRole'] = next((d['role'] for d in r['defs'] if d['slot'] == r.get('matteredBy')), r['matteredRole'] if r['matteredRole'] in ('none',) else 'unseen') if (r['int'] or (r['pbu'] and not r['int'])) else ('coverer' if r['cmp'] else 'none')
L = []; P = L.append
def row(name, S):
    if not S: return f'| {name} | 0 | | | | | | |'
    n = len(S); bp = np.mean([r['P'] for r in S]); ap = np.mean([r['cmp'] for r in S]); bi = np.mean([r['intRisk'] for r in S]); ai = np.mean([r['int'] for r in S]); se = math.sqrt(max(ap * (1 - ap), 1e-9) / n)
    return f'| {name} | {n} | {bp:.3f} | {ap:.3f} (+-{se:.3f}) | {ap - bp:+.3f} | {bi:.3f} | {ai:.3f} ({sum(r["int"] for r in S)}) | {ai - bi:+.3f} |'
HEAD = '| cell | throws | believed completion | actual completion | gap | believed interception | actual interception (n) | gap |\n|---|---|---|---|---|---|---|---|'
def strongest(r):
    roles = {d['role'] for d in r['defs']}
    return 'driver present (within 8 yd, facing him within 45 deg)' if 'driver' in roles else 'lane man (no driver)' if 'lane' in roles else 'coverer only' if 'coverer' in roles else 'nobody within 14 yd'
P(f'## Calibration of the throw decision: believed against actual ({len(R)} throws)\n')
P('### Overall and by the believed completion\n'); P(HEAD); P(row('all', R))
for lo, hi in ((0, .5), (.5, .7), (.7, .85), (.85, 1.01)): P(row(f'believed P {lo:.2f}-{min(hi, 1):.2f}', [r for r in R if lo <= r['P'] < hi]))
P('')
P('### By the strongest role present at the decision (what he had to price)\n'); P(HEAD)
for k in ('driver present (within 8 yd, facing him within 45 deg)', 'lane man (no driver)', 'coverer only', 'nobody within 14 yd'): P(row(k, [r for r in R if strongest(r) == k]))
P('')
P('### The role that mattered: who was credited with the interception or the breakup (completion: the coverer)\n'); P('| outcome | coverer | driver | lane | other | unseen (not within 14 yd or not in the list) | none credited |'); P('|---|---|---|---|---|---|---|')
for lab, sel in (('interceptions', lambda r: r['int']), ('breakups', lambda r: r['pbu'] and not r['int']), ('incomplete, nobody credited', lambda r: not r['cmp'] and not r['pbu'] and not r['int'])):
    S = [r for r in R if sel(r)]; c = collections.Counter(r['matteredRole'] for r in S)
    P(f"| {lab} ({len(S)}) | " + ' | '.join(str(c.get(k, 0)) for k in ('coverer', 'driver', 'lane', 'other', 'unseen', 'none')) + ' |')
P('')
P('Expected interceptions by the believed number (sum of intRisk) against the actual: ' + f"{sum(r['intRisk'] for r in R):.1f} expected, {sum(r['int'] for r in R)} actual; expected completions {sum(r['P'] for r in R):.0f}, actual {sum(r['cmp'] for r in R)}.\n")
P('### By route family of the target\n'); P(HEAD)
for k in sorted({r['family'] for r in R}, key=lambda k: -sum(1 for r in R if r['family'] == k)): P(row(k, [r for r in R if r['family'] == k]))
P('')
P('### By the passer\'s rating band (mean of his seven mental ratings: low under 50, mid 50-75, high over 75)\n'); P(HEAD)
for k in ('low', 'mid', 'high'): P(row(k, [r for r in R if r['ratingBand'] == k]))
P('')
P('### By coverage called\n'); P(HEAD)
for k in sorted({str(r['coverage']) for r in R}, key=lambda k: -sum(1 for r in R if str(r['coverage']) == k))[:10]: P(row(k, [r for r in R if str(r['coverage']) == k]))
txt = '\n'.join(L)
if OUT: open(OUT, 'w').write(txt)
print(txt)
