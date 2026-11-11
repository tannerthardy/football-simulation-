"""QB-reads diagnosis tables (report only; docs/reviews/2026-11-11-qb-reads.md).

  python3 -I scripts/diag/call-mix/qb_reads.py out/call-mix/nfl_throw_picture.jsonl <qb-reads.jsonl>[,...]

Sim rows from qb-reads.ts (league-sampled games); NFL rows from nfl_throw_picture.py (BDB 2025 weeks 1-3).
Same operator both sides: target class, time to throw, and every route runner's nearest defender at the throw.
"Open" = nearest defender 5+ yd (the NFL's median at the throw on flat targets is 5.3)."""
import json, sys, collections
from statistics import median
N = [json.loads(l) for l in open(sys.argv[1])]
S = [json.loads(l) for p in sys.argv[2].split(',') for l in open(p)]
KS = ['quick', 'flat', 'cross', 'breaking', 'vertical']
OPEN = 5.0
def q(v, p): v = sorted(v); return v[int(p * (len(v) - 1))] if v else None
TB = [(0, 2.0), (2.0, 2.5), (2.5, 3.0), (3.0, 3.5), (3.5, 99)]
tbn = lambda t: next((f'{a:.1f}-{b:.1f}' if b < 99 else f'{a:.1f}+') for a, b in TB if a <= t < b)
# normalise rows: one record per throw with target class, time, runners
def sim_rows():
    out = []
    for r in S:
        th = r['throw']; pic = r['atThrow'] or r['atSack']
        if not pic: continue
        tgt = next((x for x in (r['atThrow'] or []) if x['target']), None)
        out.append({'thrown': th is not None and r['att'], 'sack': r['sack'], 't': (th or {}).get('t') or r['ttt'],
                    'cls': tgt['cls'] if tgt else None, 'back_target': bool(tgt and tgt['back']),
                    'runners': [x for x in pic if x['route'] not in (None, 'block')], 'raw': r})
    return out
def nfl_rows():
    out = []
    for r in N:
        tgt = next((x for x in r['runners'] if x['target']), None)
        out.append({'thrown': not r['sack'] and r['res'] in ('C', 'I', 'IN'), 'sack': r['sack'], 't': r['ttt'] if r['ttt'] is not None else r['tAt'],
                    'cls': tgt['cls'] if tgt else None, 'back_target': bool(tgt and tgt['back']), 'runners': r['runners']})
    return out
SIM, NFL = sim_rows(), nfl_rows()
print(f"sim {len(SIM)} dropbacks with a throw or sack picture; NFL {len(NFL)} (weeks 1-3)\n")
print('== 1. Target class by time to throw (throws)')
for name, R in (('sim', SIM), ('NFL', NFL)):
    T = [r for r in R if r['thrown'] and r['cls'] and r['t'] is not None]
    print(f"  {name}: n{len(T)}  time to throw p25/50/75 {q([r['t'] for r in T], .25):.2f}/{q([r['t'] for r in T], .5):.2f}/{q([r['t'] for r in T], .75):.2f}")
    for a, b in TB:
        A = [r for r in T if a <= r['t'] < b]; c = collections.Counter(r['cls'] for r in A)
        print(f"    {tbn(a):8} {100 * len(A) / len(T):4.1f}% of throws | " + ' '.join(f"{k} {100 * c[k] / max(1, len(A)):4.1f}" for k in KS))
    print('    p50 time to throw by class: ' + ' '.join(f"{k} {q([r['t'] for r in T if r['cls'] == k], .5):.2f}" for k in KS if any(r['cls'] == k for r in T)))
print('\n== 2. Sim: which read threw it, and how (throws)')
TH = [r['raw'] for r in SIM if r['thrown'] and r['raw']['throw']]
pc = collections.Counter(r['throw']['path'] for r in TH); print('  path: ' + ' '.join(f"{k} {100 * v / len(TH):.1f}%" for k, v in pc.most_common()))
ti = collections.Counter(min(r['throw']['targetIdx'], 5) if r['throw']['targetIdx'] > 0 else 0 for r in TH)
print('  target read #: ' + ' '.join(f"{('off-list' if k == 0 else '#' + str(k) + ('+' if k == 5 else ''))} {100 * v / len(TH):.1f}%" for k, v in sorted(ti.items())))
print('  throw time p50 by target read #: ' + ' '.join(f"#{k} {q([r['throw']['t'] for r in TH if r['throw']['targetIdx'] == k], .5):.2f} (n{sum(1 for r in TH if r['throw']['targetIdx'] == k)})" for k in (1, 2, 3, 4)))
first = [r['readsAt'][0] for r in TH if r['readsAt'] and r['readsAt'][0] is not None]
print(f"  first read current (set) p50 {q(first, .5):.2f} s; reads changed before the throw p50 {q([r['throw']['readIdx'] - 1 for r in TH], .5)}")
print('  by concept: read #1 class | share thrown to #1 | path read/outlet/drop/hot/out | target class mix')
for c in sorted({r['concept'] for r in TH}, key=lambda c: -sum(1 for r in TH if r['concept'] == c)):
    A = [r for r in TH if r['concept'] == c]
    r1 = collections.Counter(r['reads'][0]['cls'] if r['reads'] else None for r in A).most_common(1)[0][0]
    p = collections.Counter(r['throw']['path'] for r in A)
    tc = collections.Counter(next((x['cls'] for x in r['atThrow'] if x['target']), None) for r in A)
    print(f"  {c:13} n{len(A):4} #1 {str(r1):9} to #1 {100 * sum(r['throw']['targetIdx'] == 1 for r in A) / len(A):3.0f}% | "
          + '/'.join(f"{100 * p[k] / len(A):.0f}" for k in ('read', 'outlet', 'drop', 'hot', 'out')) + ' | ' + ' '.join(f"{k[:4]} {100 * tc[k] / len(A):.0f}" for k in KS if tc[k]))
print('\n== 3. Checkdowns and open short options')
for name, R in (('sim', SIM), ('NFL', NFL)):
    T = [r for r in R if r['thrown'] and r['t'] is not None]
    print(f"  {name}: back targeted {100 * sum(r['back_target'] for r in T) / len(T):.1f}% of throws; by time to throw " +
          ' '.join(f"{tbn(a)} {100 * sum(r['back_target'] for r in T if a <= r['t'] < b) / max(1, sum(1 for r in T if a <= r['t'] < b)):.1f}%" for a, b in TB))
    for label, sel in (('throws to a breaking route', lambda r: r['thrown'] and r['cls'] == 'breaking'),
                       ('throws to a vertical route', lambda r: r['thrown'] and r['cls'] == 'vertical'),
                       ('sacks', lambda r: r['sack'])):
        A = [r for r in R if sel(r)]
        if not A: continue
        backopen = sum(1 for r in A if any(x['back'] and not x['target'] and x['near'] >= OPEN for x in r['runners']))
        shortopen = sum(1 for r in A if any(not x['target'] and x['cls'] in ('quick', 'flat') and x['near'] >= OPEN for x in r['runners']))
        backout = sum(1 for r in A if any(x['back'] for x in r['runners']))
        print(f"    {label:28} n{len(A):5}: a back in a route {100 * backout / len(A):4.1f}%, open (5+ yd) {100 * backopen / len(A):4.1f}%; "
              f"any other quick/flat open {100 * shortopen / len(A):4.1f}%")
    T = [r for r in R if r['thrown']]
    for cls in ('quick', 'flat', 'cross', 'breaking', 'vertical'):
        A = [x for r in T for x in r['runners'] if x['cls'] == cls]
        if A: print(f"    every {cls:8} runner at the throw: open {100 * sum(x['near'] >= OPEN for x in A) / len(A):4.1f}%, targeted when open {100 * sum(x['target'] for x in A if x['near'] >= OPEN) / max(1, sum(x['near'] >= OPEN for x in A)):4.1f}% (n{len(A)})")
