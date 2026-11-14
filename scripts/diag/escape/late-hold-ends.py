"""QB lane, 2026-11-14: how a dropback ends when he is still holding the ball behind the line late. Same code on NFL
tracking and sim exports; non-designed dropbacks. At 3.0 / 4.0 / 5.0 s: the share of dropbacks with the ball still in
his hand and him behind the line, and how those end: throw (a targeted forward pass), thrown away, run (he crosses the
line), sack (no pass, never past the line). The witness Integration and Flex named for the out-of-pocket phase and the
throw-away decision (their early-sack.py takes the same rows on the default engine).
usage: python3 -I late-hold-ends.py name=a.jsonl.gz,... [--plays-csv plays.csv]"""
import sys, os, json, gzip, math, re, csv
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
def wrap_start(p, qb, kend):
    """A sack's time is when the last unbroken stretch with a defender within 1.5 yd of him begins (the wrap), not the
    whistle: going down in a defender's arms is not holding the ball. The cut Flex's early-sack.py uses, so one
    definition serves both lanes."""
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
pc = lambda a, b: f"{100 * a / max(1, b):.0f}%"
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
MARKS = (3.0, 4.0, 5.0)
for arg in args:
    name, paths = arg.split('=', 1); n = 0; H = {m: [] for m in MARKS}
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id'])
            if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['qbSpike'] == 'TRUE' or pf['isDropback'] != 'TRUE'): continue
            if raw.get('source') == 'sim' and DES.search(str((raw.get('cell') or {}).get('concept') or '')): continue
            p = Play(raw); qbs = p.who('O', 'QB')
            if not qbs or p.pos(qbs[0], 0)[0] is None: continue
            qb = qbs[0]; n += 1; ev = raw['events']; fw = ev.get('pass_forward'); lab = raw.get('labels') or {}
            kend = min(p.frames - 1, p.k(fw if fw is not None else p.end)); b = raw.get('bxy')
            if b and fw is None:
                for k in range(min(kend, len(b) - 1) + 1):
                    x, y = p.pos(qb, k); bb = b[k]
                    if x is not None and bb and bb[0] is not None and math.hypot(bb[0] - x, bb[1] - y) > 2.5: kend = max(0, k - 1); break
            cross = next((k for k in range(kend + 1) if p.pos(qb, k)[0] is not None and p.pos(qb, k)[0] > 0), None)
            if fw is None and cross is None: kend = wrap_start(p, qb, kend)
            if fw is not None:
                away = (pf['passResult'] == 'I' and 'pass incomplete' in pf['playDescription'] and not re.search(r'pass incomplete \w+ \w+ to ', pf['playDescription'])) if pf is not None else bool(lab.get('throwaway'))
                res = 'away' if away else 'throw'
            else: res = 'run' if cross is not None else 'sack'
            for m in MARKS:
                k = int(round(m / p.dt))
                if k <= kend and (cross is None or cross > k): H[m].append(res)
    print(f"== {name}: dropbacks {n}")
    for m in MARKS:
        S = H[m]; c = lambda r: sum(x == r for x in S)
        print(f"   still holding behind the line at {m:.1f} s: {pc(len(S), n)} of dropbacks (n {len(S)}) | ends throw {pc(c('throw'), len(S))} away {pc(c('away'), len(S))} run {pc(c('run'), len(S))} sack {pc(c('sack'), len(S))}")
