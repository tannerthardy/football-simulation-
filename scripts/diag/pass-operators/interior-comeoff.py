"""After an interior rusher releases: what happens before he reaches the QB (Integration, 2026-11-15, after the hand
fight's stage 1). Same code on NFL tracking and sim exports (common play format).

usage: python3 -I scripts/diag/pass-operators/interior-comeoff.py <plays.jsonl.gz> [...] [--examples N] [--plays-csv plays.csv]

Pairs and release exactly as interior-fight.py: each of the three middle OL and the nearest DL within 1.2 yd from the
snap + 0.2 s; release is the first frame within 2.5 s of contact, before the throw, where the separation opens past
1.2 yd or the rusher's bearing from the blocker passes 70 deg off the blocker's line to the QB. From the release to the
throw (or the play's end with no throw):

  1. Reach: the first frame the rusher is within 1.5 yd of the QB; the time from release; the share that reach before
     the throw. Path: his heading over the first 0.5 s after release against the line from him to the QB at the
     release (0 = straight at him); flattened past 45 deg.
  2. What is near him in the 0.5 s after the release (each a share of released rushers, split by reach / not):
     - blocker attached: his own blocker within 1.2 yd of him at release + 0.3 s (and + 0.5 s);
     - help: another offensive lineman within 1.0 yd of him at some frame;
     - back: another offensive non-lineman, not the QB, within 1.0 yd of him at some frame;
     - QB moved: the QB's displacement over those 0.5 s past 1.0 yd; and the rusher's line wrong: the angle at the
       rusher between the QB at the release and the QB 0.5 s later, past 20 deg.
  3. What a release is: which test fired (separation or past the shoulder), the separation at the release, and the
     blocker's distance at + 0.3 s: clean (past 1.5 yd), at his hip (within 1.2), between. --examples N prints N
     releases with those numbers (the first N in file order, so the same each run).
"""
import sys, os, json, gzip, math, re, csv
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
pct = lambda a, n: f"{100 * a / max(1, n):.0f}%"
wrap = lambda a: (a + 180) % 360 - 180
args = [a for a in sys.argv[1:]]
nex = 0
if '--examples' in args:
    i = args.index('--examples'); nex = int(args[i + 1]); del args[i:i + 2]
# --plays-csv: the QB lane's population (early-sack.py): NFL dropbacks by PFF that are not designed movement, not play
# action and not a spike; ours without a boot / roll / sprint / waggle / naked / screen or play-action concept.
PFF = None; DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen|^pa_|\+pa', re.I)
if '--plays-csv' in args:
    i = args.index('--plays-csv'); PFF = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(args[i + 1]))}; del args[i:i + 2]
def keep(raw):
    if PFF is None: return True
    if raw.get('source') == 'sim': return not DES.search(str((raw.get('cell') or {}).get('concept') or ''))
    pf = PFF.get(str(raw.get('id')))
    return pf is not None and pf['isDropback'] == 'TRUE' and not pf['dropbackType'].startswith('DESIGNED') and pf['playAction'] != 'TRUE' and pf['qbSpike'] != 'TRUE'

for path in args:
    R = []; pairs = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy') or not keep(raw): continue
        p = Play(raw); ev = raw.get('events', {})
        OL = sorted([i for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None], key=lambda i: p.pos(i, 0)[1])
        qbs = p.who('O', 'QB')
        if len(OL) < 5 or not qbs: continue
        qb = qbs[0]
        others = [i for i in p.who('O') if i != qb and i not in OL]
        DL = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and p.players[d]['group'] == 'DL']
        fw = ev.get('pass_forward'); kend = min(p.frames - 1, p.k(fw) if fw is not None else p.frames - 1)
        ok = lambda i, k: p.pos(i, k)[0] is not None
        for b in OL[1:4]:
            k0 = d = None
            for k in range(p.k(0.2), min(kend, p.k(2.0)) + 1):
                if not ok(b, k): continue
                c = [(p.dist(b, x, k), x) for x in DL if ok(x, k) and p.dist(b, x, k) <= 1.2]
                if c: k0 = k; d = min(c)[1]; break
            if k0 is None: continue
            pairs += 1
            def geo(k):
                (bx, by), (dx, dy), (qx, qy) = p.pos(b, k), p.pos(d, k), p.pos(qb, k)
                ux, uy = qx - bx, qy - by; L = math.hypot(ux, uy) or 1; ux, uy = ux / L, uy / L
                rx, ry = dx - bx, dy - by
                ang = math.degrees(math.atan2(rx * -uy + ry * ux, -(rx * ux + ry * uy)))
                return math.hypot(rx, ry), ang
            kr = None; why = None
            for k in range(k0, min(kend, k0 + 25) + 1):
                if not (ok(b, k) and ok(d, k) and ok(qb, k)): break
                s, a = geo(k)
                if s > 1.2 or abs(a) > 70: kr = k; why = 'sep' if s > 1.2 else 'shoulder'; break
            if kr is None: continue
            r = {'id': raw.get('id'), 't': round((kr - k0) * p.dt, 2), 'why': why, 'sep': geo(kr)[0], 'ang': geo(kr)[1]}
            # 1. reach and path
            reach = None
            for k in range(kr, kend + 1):
                if ok(d, k) and ok(qb, k) and p.dist(d, qb, k) <= 1.5: reach = k; break
            r['reach'] = None if reach is None else round((reach - kr) * p.dt, 2)
            k5 = min(kend, kr + p.k(0.5) - p.k(0))
            (dx0, dy0), (qx0, qy0) = p.pos(d, kr), p.pos(qb, kr)
            if k5 > kr and ok(d, k5):
                hx, hy = p.pos(d, k5)[0] - dx0, p.pos(d, k5)[1] - dy0
                r['path'] = abs(wrap(math.degrees(math.atan2(hy, hx) - math.atan2(qy0 - dy0, qx0 - dx0)))) if math.hypot(hx, hy) > 0.2 else None
            else: r['path'] = None
            # 2. what is near him
            def bd(dtk):
                k = kr + dtk
                return p.dist(b, d, k) if k <= kend and ok(b, k) and ok(d, k) else None
            r['b3'] = bd(p.k(0.3) - p.k(0)); r['b5'] = bd(p.k(0.5) - p.k(0))
            near = lambda grp: any(ok(x, k) and ok(d, k) and p.dist(x, d, k) <= 1.0 for k in range(kr, k5 + 1) for x in grp)
            r['help'] = near([o for o in OL if o != b]); r['back'] = near(others)
            if k5 > kr and ok(qb, k5):
                qx5, qy5 = p.pos(qb, k5)
                r['qbmove'] = math.hypot(qx5 - qx0, qy5 - qy0)
                r['qbline'] = abs(wrap(math.degrees(math.atan2(qy5 - dy0, qx5 - dx0) - math.atan2(qy0 - dy0, qx0 - dx0))))
            else: r['qbmove'] = r['qbline'] = None
            r['left'] = round((kend - kr) * p.dt, 2); r['thrown'] = fw is not None
            # Distance to the QB at the release and its closing rate over the next 0.5 s (yd/s, + = closing).
            r['dq'] = p.dist(d, qb, kr)
            r['close'] = (r['dq'] - p.dist(d, qb, k5)) / ((k5 - kr) * p.dt) if k5 > kr and ok(d, k5) and ok(qb, k5) else None
            R.append(r)
    n = len(R); hit = [r for r in R if r['reach'] is not None]; miss = [r for r in R if r['reach'] is None]
    print(f"== {os.path.basename(path)}: interior pairs {pairs}, released {n} ({pct(n, pairs)}), reached the QB (1.5 yd) before the throw {len(hit)} ({pct(len(hit), n)} of released)")
    print(f"   1. release to reach p25/50/75 {q([r['reach'] for r in hit], .25):.1f}/{q([r['reach'] for r in hit]):.1f}/{q([r['reach'] for r in hit], .75):.1f} s | path off his line to the QB p50 {q([r['path'] for r in R if r['path'] is not None]):.0f} deg, flattened past 45: {pct(sum(1 for r in R if r['path'] is not None and r['path'] > 45), sum(1 for r in R if r['path'] is not None))} (reach {pct(sum(1 for r in hit if r['path'] is not None and r['path'] > 45), sum(1 for r in hit if r['path'] is not None))}, not {pct(sum(1 for r in miss if r['path'] is not None and r['path'] > 45), sum(1 for r in miss if r['path'] is not None))})")
    for name, f in [('blocker attached at +0.3 s (1.2 yd)', lambda r: r['b3'] is not None and r['b3'] <= 1.2),
                    ('blocker attached at +0.5 s', lambda r: r['b5'] is not None and r['b5'] <= 1.2),
                    ('help: another OL within 1.0 yd by +0.5 s', lambda r: r['help']),
                    ('back: an RB/TE within 1.0 yd by +0.5 s', lambda r: r['back']),
                    ('QB moved past 1.0 yd in 0.5 s', lambda r: r['qbmove'] is not None and r['qbmove'] > 1.0),
                    ("QB's move turns the rusher's line past 20 deg", lambda r: r['qbline'] is not None and r['qbline'] > 20)]:
        print(f"   2. {name}: all {pct(sum(1 for r in R if f(r)), n)} | reached {pct(sum(1 for r in hit if f(r)), len(hit))} | not {pct(sum(1 for r in miss if f(r)), len(miss))}")
    for name, G in [('blocker still on him at +0.5 s (<=1.2 yd)', [r for r in R if r['b5'] is not None and r['b5'] <= 1.2]),
                    ('blocker off him at +0.5 s (>1.2 yd)', [r for r in R if r['b5'] is not None and r['b5'] > 1.2])]:
        gh = [r for r in G if r['reach'] is not None]
        print(f"   2b. {name}: {pct(len(G), n)} of released | reached {pct(len(gh), len(G))} | help {pct(sum(1 for r in G if r['help']), len(G))} | QB moved {pct(sum(1 for r in G if r['qbmove'] is not None and r['qbmove'] > 1.0), len(G))} | release to throw / end p25/50/75 {q([r['left'] for r in G], .25):.1f}/{q([r['left'] for r in G]):.1f}/{q([r['left'] for r in G], .75):.1f} s (thrown {pct(sum(1 for r in G if r['thrown']), len(G))}) | to the QB at release p50 {q([r['dq'] for r in G]):.1f} yd, closing p25/50/75 {q([r['close'] for r in G if r['close'] is not None], .25):.1f}/{q([r['close'] for r in G if r['close'] is not None]):.1f}/{q([r['close'] for r in G if r['close'] is not None], .75):.1f} yd/s")
    off5 = [r for r in R if r['b5'] is not None and r['b5'] > 1.2]
    for name, G in [('off, help came', [r for r in off5 if r['help']]), ('off, no help', [r for r in off5 if not r['help']]),
                    ('off, no help, QB moved', [r for r in off5 if not r['help'] and r['qbmove'] is not None and r['qbmove'] > 1.0]),
                    ('off, no help, QB still', [r for r in off5 if not r['help'] and r['qbmove'] is not None and r['qbmove'] <= 1.0])]:
        cl = [r['close'] for r in G if r['close'] is not None]
        print(f"   2c. {name}: {pct(len(G), len(off5))} of them | reached {pct(sum(1 for r in G if r['reach'] is not None), len(G))} | closing p50 {q(cl):.1f} yd/s")
    print(f"   3. release by separation {pct(sum(1 for r in R if r['why'] == 'sep'), n)}, past the shoulder {pct(sum(1 for r in R if r['why'] == 'shoulder'), n)} | separation at it p50 {q([r['sep'] for r in R]):.2f} yd | blocker at +0.3 s: clean (>1.5) {pct(sum(1 for r in R if r['b3'] is not None and r['b3'] > 1.5), n)}, at his hip (<=1.2) {pct(sum(1 for r in R if r['b3'] is not None and r['b3'] <= 1.2), n)}, between {pct(sum(1 for r in R if r['b3'] is not None and 1.2 < r['b3'] <= 1.5), n)}, gone (play over) {pct(sum(1 for r in R if r['b3'] is None), n)}")
    for r in R[:nex]:
        f = lambda v, s='{:.2f}': '-' if v is None else s.format(v)
        print(f"     {r['id']}: at {r['t']:.1f} s by {r['why']}, sep {r['sep']:.2f}, bearing {r['ang']:+.0f} | blocker +0.3 {f(r['b3'])} +0.5 {f(r['b5'])} | help {int(r['help'])} back {int(r['back'])} | QB moved {f(r['qbmove'])} line {f(r['qbline'], '{:.0f}')} | path {f(r['path'], '{:.0f}')} | reach {f(r['reach'], '{:.1f}')}")
