"""QB lane, 2026-11-14: how dropbacks end, by time after the snap, with no count assumed. Same code on NFL tracking
and sim exports; non-designed dropbacks, no play action, no screens; gun only, by how deep the drop went (the deepest
he got behind his snap spot before the play's end: 0-2, 2-3.5, 3.5-5, 5+ yd).
An end is one of: a throw to a back or a short outlet (the target is a running back, or within 3 yd of the line at
the throw), a throw downfield, a throw away, a scramble (he crosses the line with it), a sack (timed at the start of
the last unbroken stretch with a defender within 1.5 yd: the wrap, Flex's cut). Rows are 0.25 s bins of the end time:
the share of that depth's dropbacks ending in the bin, by kind. Then, for the dropbacks still alive at 3.0 / 3.5 / 4.0
s, how they end. The witness for QB_COUNT (docs/reviews/2026-11-14-qb-key-read-and-drops.md).
usage: python3 -I ends-by-time.py name=a.jsonl.gz,... [--plays-csv plays.csv]"""
import sys, os, json, gzip, math, re, csv
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
def wrap_start(p, qb, kend):
    k = kend
    while k > 0:
        x, y = p.pos(qb, k)
        if x is None or not any(p.pos(d, k)[0] is not None and math.hypot(p.pos(d, k)[0] - x, p.pos(d, k)[1] - y) <= 1.5 for d in p.who('D')): break
        k -= 1
    return min(kend, k + 1)
args = sys.argv[1:]; PFF = {}
if '--plays-csv' in args:
    i = args.index('--plays-csv')
    for r in csv.DictReader(open(args[i + 1])): PFF[f"{r['gameId']}-{r['playId']}"] = r
    del args[i:i + 2]
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen|bubble|tunnel|slip|now_', re.I)
KINDS = ('outlet', 'downfield', 'away', 'scramble', 'sack'); DEPTHS = ('0-2', '2-3.5', '3.5-5', '5+')
for arg in args:
    name, paths = arg.split('=', 1); R = {d: [] for d in DEPTHS}
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id']); con = str((raw.get('cell') or {}).get('concept') or '')
            if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['qbSpike'] == 'TRUE' or pf['isDropback'] != 'TRUE' or pf['playAction'] == 'TRUE'): continue
            if raw.get('source') == 'sim' and (DES.search(con) or 'pa' in con.split('+') or con.startswith('pa_')): continue
            p = Play(raw); qbs = p.who('O', 'QB')
            if not qbs or p.pos(qbs[0], 0)[0] is None or p.pos(qbs[0], 0)[0] >= -3: continue
            qb = qbs[0]; ev = raw['events']; fw = ev.get('pass_forward'); lab = raw.get('labels') or {}
            kend = min(p.frames - 1, p.k(fw if fw is not None else p.end)); b = raw.get('bxy')
            if b and fw is None:
                for k in range(min(kend, len(b) - 1) + 1):
                    x, y = p.pos(qb, k); bb = b[k]
                    if x is not None and bb and bb[0] is not None and math.hypot(bb[0] - x, bb[1] - y) > 2.5: kend = max(0, k - 1); break
            cross = next((k for k in range(kend + 1) if p.pos(qb, k)[0] is not None and p.pos(qb, k)[0] > 0), None)
            if fw is not None:
                away = (pf['passResult'] == 'I' and 'pass incomplete' in pf['playDescription'] and not re.search(r'pass incomplete \w+ \w+ to ', pf['playDescription'])) if pf is not None else bool(lab.get('throwaway'))
                t = raw.get('target')
                if away or t is None: kind = 'away'
                else:
                    tx = p.pos(t, kend)[0]
                    kind = 'outlet' if raw['players'][t]['group'] == 'RB' or (tx is not None and tx <= 3) else 'downfield'
            elif cross is not None: kind = 'scramble'; kend = cross
            else: kind = 'sack'; kend = wrap_start(p, qb, kend)
            xs = [p.pos(qb, k)[0] for k in range(kend + 1)]
            if any(x is None for x in xs): continue
            depth = xs[0] - min(xs)
            R['0-2' if depth < 2 else '2-3.5' if depth < 3.5 else '3.5-5' if depth < 5 else '5+'].append((kend * p.dt, kind))
    tot = sum(len(v) for v in R.values()); print(f"== {name}: gun dropbacks {tot}")
    for d in DEPTHS:
        S = R[d]; n = len(S)
        if n < 40: continue
        print(f"   drop {d} yd: {n} ({100 * n / tot:.0f}%) | ends: " + ' '.join(f"{k} {100 * sum(1 for s in S if s[1] == k) / n:.0f}%" for k in KINDS))
        print("      ends in bin, % of this depth's dropbacks:  " + '  '.join(f"{k:>9s}" for k in KINDS) + '     alive at start')
        for i in range(4, 22):
            lo, hi = i * 0.25, (i + 1) * 0.25; B = [s for s in S if lo <= s[0] < hi]; alive = sum(1 for s in S if s[0] >= lo)
            if not alive: break
            print(f"      {lo:4.2f}-{hi:4.2f} s                                  " + '  '.join(f"{100 * sum(1 for s in B if s[1] == k) / n:9.1f}" for k in KINDS) + f"     {100 * alive / n:5.1f}%")
        for m in (3.0, 3.5, 4.0):
            L = [s for s in S if s[0] >= m]
            if len(L) >= 20: print(f"      alive at {m:.1f} s: {100 * len(L) / n:.0f}% (n {len(L)}) | end " + ' '.join(f"{k} {100 * sum(1 for s in L if s[1] == k) / len(L):.0f}%" for k in KINDS))
