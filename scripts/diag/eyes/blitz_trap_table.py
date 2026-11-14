"""Tables for blitz-trap.ts output. Run: python3 -I blitz_trap_table.py out/eyes/trap-101.jsonl out/eyes/trap-201.jsonl"""
import json, sys, collections
R = [json.loads(l) for f in sys.argv[1:] for l in open(f) if l.strip()]
pct = lambda a, b: f'{100*a/b:.0f}%' if b else '-'
def q(v, p):
    v = sorted(v)
    if not v: return float('nan')
    i = (len(v) - 1) * p; lo = int(i); return v[lo] + (v[min(lo + 1, len(v) - 1)] - v[lo]) * (i - lo)
print(f'pass plays {len(R)}')
# 1. prior vs realized
C = collections.defaultdict(lambda: [0, 0])
for r in R:
    for a in r['align'] or []:
        for k in ((a['cls'], 'all'), (a['cls'], a['pos'])): C[k][0] += a['rush']; C[k][1] += 1
print('\n**Realized rush at 1.0 s by snap class (sim)**\n| class | prior | all | by position |\n|---|---|---|---|')
PR = {'line': 0.45, 'box': 0.25, 'edge': 0.3, 'else': 0.03}
for c in PR:
    pos = ', '.join(f'{p} {pct(*C[(c, p)])} ({C[(c, p)][1]})' for (cc, p) in sorted(C) if cc == c and p != 'all' and C[(c, p)][1] >= 20)
    print(f'| {c} | {PR[c]} | {pct(*C[(c, "all")])} ({C[(c, "all")][1]}) | {pos} |')
# 2. look-prior throws
H = [r for r in R if r['hot']]
LP = [r for r in H if r['hot']['toTarget'] and r['thr'] and not r['thr']['away']]
def row(name, rs):
    n = len(rs); c = sum(r['caught'] for r in rs); i = sum(r['int'] for r in rs)
    ay = [r['thr']['air'] for r in rs if r['thr'] and r['thr']['air'] is not None]
    yd = [r['yards'] for r in rs if r['yards'] is not None]
    return f'| {name} | {n} | {pct(c, n)} | {pct(i, n)} | {q(ay, .5):.1f} | {sum(yd)/max(1,len(yd)):.1f} |'
print(f'\nhot calls {len(H)}; look-prior target throws {len(LP)}')
print('\n**Look-prior throws split**\n| split | n | comp | INT | air p50 | yds/att |\n|---|---|---|---|---|---|')
print(row('all', LP))
print(row('believed man rushed (0.5 s), seat refilled', [r for r in LP if r['hot']['topRushed05'] and r['hot']['topRefilled']]))
print(row('believed man rushed, seat open', [r for r in LP if r['hot']['topRushed05'] and r['hot']['topRefilled'] is False]))
print(row('believed man did not rush', [r for r in LP if not r['hot']['topRushed05']]))
print(row('called pressure', [r for r in LP if r['pressure']]))
print(row('no called pressure', [r for r in LP if not r['pressure']]))
for lo, hi in ((0, 0.7), (0.7, 0.85), (0.85, 1.01)):
    print(row(f'QB awareness {lo}-{hi}', [r for r in LP if lo <= r['qb']['aw'] < hi]))
for lo, hi in ((0, 0.7), (0.7, 0.85), (0.85, 1.01)):
    print(row(f'QB decisionMaking {lo}-{hi}', [r for r in LP if lo <= r['qb']['dm'] < hi]))
print('\nBelieved man (hot calls): ' + ', '.join(f'{k} {v}' for k, v in collections.Counter(f"{r['hot']['topPos']}/{r['hot']['topCls']}/{'rushed' if r['hot']['topRushed05'] else 'no'}" for r in H).most_common(12)))
# 3. interceptions
def ints(name, rs):
    I = [r for r in rs if r['int'] and r['picker']]
    print(f'\n**Interceptors, {name}** (n {len(I)})')
    for k, v in collections.Counter(
        ('the believed man' if r['picker']['isTop'] else 'dropping lineman' if r['picker']['dline'] else
         'refiller of his seat' if r['picker']['refilledTopSeat'] else f"other {r['picker']['pos']}:{r['picker']['kindThr']}")
        for r in I).most_common(): print(f'- {k}: {v}')
    for r in I: print('  ', r['pressure'], r['coverage'], r['hot'] and (r['hot']['topPos'], r['hot']['topRushed05'], r['hot']['topRefilled']), r['picker'])
ints('look-prior throws', LP)
ints('all hot-call plays', H)
# 4. urgency cost on plain plays
P = [r for r in R if not r['pressure'] and r['thr']]
def urow(name, rs):
    t = [r['thr']['t'] for r in rs]; ay = [r['thr']['air'] for r in rs if r['thr']['air'] is not None and not r['thr']['away']]
    n = len(rs); c = sum(r['caught'] for r in rs); i = sum(r['int'] for r in rs); s = sum(r['sack'] for r in rs)
    rb = sum(r['thr']['slot'] == 'RB' for r in rs)
    yd = [r['yards'] for r in rs if r['yards'] is not None]
    return f'| {name} | {n} | {q(t,.5):.2f} | {q(t,.25):.2f} | {q(ay,.5):.1f} | {sum(ay)/max(1,len(ay)):.1f} | {pct(rb,n)} | {pct(c,n)} | {pct(i,n)} | {sum(yd)/max(1,len(yd)):.1f} |'
print('\n**Plain plays (no called pressure) with a throw: urgency raised (max excess > 0.5 in 2.5 s) vs not**')
print('| | n | TTT p50 | TTT p25 | air p50 | air mean | to RB | comp | INT | yds |\n|---|---|---|---|---|---|---|---|---|---|')
Up = [r for r in P if r['maxEx'] > 0.5]; Dn = [r for r in P if r['maxEx'] <= 0.5]
print(urow('raised', Up)); print(urow('not', Dn))
# same-concept control: concept-weighted difference
cc = collections.defaultdict(lambda: [[], []])
for r in P: cc[r['concept']][r['maxEx'] > 0.5].append(r)
dT, dA, w = 0, 0, 0
for k, (no, yes) in cc.items():
    if len(no) >= 3 and len(yes) >= 3:
        n = min(len(no), len(yes)); w += n
        dT += n * (q([r['thr']['t'] for r in yes], .5) - q([r['thr']['t'] for r in no], .5))
        a1 = [r['thr']['air'] for r in yes if r['thr']['air'] is not None]; a0 = [r['thr']['air'] for r in no if r['thr']['air'] is not None]
        dA += n * (q(a1, .5) - q(a0, .5))
print(f'within-concept (concepts with >=3 each, weight {w}): TTT p50 raised-not {dT/max(1,w):+.2f} s, air p50 {dA/max(1,w):+.1f} yd')
print('raised plain plays, believed man: ' + ', '.join(f'{k} {v}' for k, v in collections.Counter(f"{r['hot']['topPos']}/{r['hot']['topCls']}" if r['hot'] else 'no-hot' for r in Up).most_common(6)))
print('raised share of plain plays with PA concepts: ' + pct(sum('pa' in (r['concept'] or '') for r in Up), len(Up)) + ' vs not ' + pct(sum('pa' in (r['concept'] or '') for r in Dn), len(Dn)))
