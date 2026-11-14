"""QB lane, 2026-11-14: where his feet are while he holds the ball, and how near the rush gets. Same code on NFL
tracking and sim exports. Non-designed dropbacks from the gun, the ball in his hand (escape.py's held_end cut).
  1 DEPTH while still holding at 2.0 / 2.5 / 3.0 / 3.5 s (yd behind the line, median), and at the release, split by
    how long the ball was held. x is downfield from the line of scrimmage, so depth = -x.
  2 INTO THE THROW: his change in depth and his net movement over the 0.6 s before the release, by how long the
    ball was held (a quick throw's last 0.6 s is still the drop).
  3 PROXIMITY: share of dropbacks on which a DL/LB is within 2 yd and within 3 yd of him while he holds the ball
     after 1.0 s.
usage: python3 -I qb-hold-depth.py <plays.jsonl.gz>... [--plays-csv plays.csv]"""
import sys, json, gzip, math, csv, re, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
def held_end(raw, p, qb, kend):
    b = raw.get('bxy')
    if not b or raw['events'].get('pass_forward') is not None: return kend
    for k in range(min(kend, len(b) - 1) + 1):
        x, y = p.pos(qb, k); bb = b[k]
        if x is None or not bb or bb[0] is None: continue
        if math.hypot(bb[0] - x, bb[1] - y) > 2.5: return max(0, k - 1)
    return kend
args = sys.argv[1:]; PFF = {}
if '--plays-csv' in args:
    i = args.index('--plays-csv')
    for r in csv.DictReader(open(args[i + 1])): PFF[f"{r['gameId']}-{r['playId']}"] = r
    del args[i:i + 2]
def q(v, p=.5):
    v = sorted(x for x in v if x is not None)
    return v[int(p * (len(v) - 1))] if v else float('nan')
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
MARKS = (2.0, 2.5, 3.0, 3.5)
for path in args:
    hold = {m: [] for m in MARKS}; rel = {'<2.5': [], '2.5-3.5': [], '3.5+': []}; into = {k: [] for k in rel}; net = {k: [] for k in rel}; n = 0; w2 = 0; w3 = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        pf = PFF.get(raw['id'])
        if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['qbSpike'] == 'TRUE' or pf['isDropback'] != 'TRUE'): continue
        if raw.get('source') == 'sim' and DES.search(str((raw.get('cell') or {}).get('concept') or '')): continue
        p = Play(raw); qbs = p.who('O', 'QB')
        if not qbs or p.pos(qbs[0], 0)[0] is None: continue
        qb = qbs[0]
        if p.pos(qb, 0)[0] >= -3: continue
        fw = raw['events'].get('pass_forward')
        kend = held_end(raw, p, qb, min(p.frames - 1, p.k(fw if fw is not None else p.end)))
        dt = p.dt; tend = kend * dt
        n += 1
        RU = [d for d in p.who('D') if p.players[d]['group'] in ('DL', 'LB')]
        near = 99.0
        for k in range(int(round(1.0 / dt)), kend + 1):
            x, y = p.pos(qb, k)
            if x is None: continue
            for d in RU:
                dx, dy = p.pos(d, k)
                if dx is not None: near = min(near, math.hypot(dx - x, dy - y))
        w2 += near <= 2; w3 += near <= 3
        for m in MARKS:
            k = int(round(m / dt))
            if k <= kend and p.pos(qb, k)[0] is not None: hold[m].append(-p.pos(qb, k)[0])
        if fw is not None and p.pos(qb, kend)[0] is not None:
            c = '<2.5' if tend < 2.5 else '2.5-3.5' if tend < 3.5 else '3.5+'
            rel[c].append(-p.pos(qb, kend)[0])
            k0 = kend - int(round(0.6 / dt))
            if k0 > 0 and p.pos(qb, k0)[0] is not None:
                a, b = p.pos(qb, k0), p.pos(qb, kend); into[c].append(b[0] - a[0]); net[c].append(math.hypot(b[0] - a[0], b[1] - a[1]))
    print(f"== {os.path.basename(path)}: gun dropbacks {n}")
    print('   depth while still holding at ' + '  '.join(f"{m:.1f} s {q(hold[m]):.1f} yd (n {len(hold[m])})" for m in MARKS))
    print('   depth at the release, ball held ' + '  '.join(f"{k} s {q(v):.1f} yd (n {len(v)})" for k, v in rel.items()))
    for c in rel: print(f"   last 0.6 s before the release, ball held {c} s: came up p25/50/75 {q(into[c], .25):+.1f}/{q(into[c]):+.1f}/{q(into[c], .75):+.1f} yd; net movement p50 {q(net[c]):.1f} yd")
    print(f"   a DL/LB within 2 yd while he holds it (after 1.0 s) {100 * w2 / max(1, n):.0f}%; within 3 yd {100 * w3 / max(1, n):.0f}%")
