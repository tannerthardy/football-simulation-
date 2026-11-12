"""usage: python3 -I scripts/diag/pass-operators/qb-moves.py [--plays BDB plays.csv] [--dump rows.jsonl] <plays.jsonl.gz> [...]
Do QBs escape, or climb and slide? (Tanner via Integration, 2026-11-11.) Same code on NFL tracking and sim plays.
Every dropback: his set point = his deepest frame (minimum x) after the snap and before the ball is out (or the end);
the tackle box = between the two widest OL at the set frame. From the set point to the release (throw), to the end
(sack), or to the frame he crosses the line (scramble): forward = change in x, lateral = |change in y|. Classes, first
match: rolled outside (ends outside the tackle box) / retreated (forward <= -1) / stood (displacement < 0.5) /
climbed 3+ (forward >= 3) / climbed 1-3 (forward >= 1, >= lateral) / slid (lateral >= 1) / stepped (< 1 yd).
Reported for all dropbacks and for those where a defender came within 1.0 yd of him before the ball was out.
--plays: for NFL records (id gameId-playId) drop designed movement (dropbackType DESIGNED_ROLLOUT_* or playAction
TRUE), leaving pocket dropbacks; sim plays pass through. For dropbacks that end outside the box: whether he first
set inside it and the time from set to leaving it; the side he left toward relative to the rusher who reached 1 yd
(toward / away), and to his right (y decreasing when facing upfield: a right-hander's arm side; no handedness in
the data)."""
import sys, os, json, statistics as st, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'defense-yards'))
_a = sys.argv; sys.argv = sys.argv[:1]
from yards import plays
sys.argv = _a
import csv
DESIGNED = set()
args = sys.argv[1:]
if args[:1] == ['--plays']:
    for row in csv.DictReader(open(args[1])):
        if row['dropbackType'].startswith('DESIGNED_ROLLOUT') or row['playAction'] == 'TRUE': DESIGNED.add(f"{row['gameId']}-{row['playId']}")
    args = args[2:]
DUMP = None
if args[:1] == ['--dump']:
    DUMP = open(args[1], 'w'); args = args[2:]
CLS = ['stood', 'stepped', 'climbed 1-3', 'climbed 3+', 'slid', 'rolled outside', 'retreated']
def klass(fwd, lat, outside):
    if outside: return 'rolled outside'
    if fwd <= -1: return 'retreated'
    if (fwd * fwd + lat * lat) ** .5 < 0.5: return 'stood'
    if fwd >= 3: return 'climbed 3+'
    if fwd >= 1 and fwd >= lat: return 'climbed 1-3'
    if lat >= 1: return 'slid'
    return 'stepped'
for path in args:
    R = []
    for kind, p, c, k0, last in plays(path):
        if kind != 'pass' or p.raw['id'] in DESIGNED: continue
        qbs = [i for i, pl in enumerate(p.players) if pl.get('group') == 'QB']
        if not qbs: continue
        q = qbs[0]; ev = p.raw.get('events', {}); fw = ev.get('pass_forward')
        kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
        xs = [(k, p.pos(q, k)[0]) for k in range(0, kend + 1) if p.pos(q, k)[0] is not None]
        if len(xs) < 5: continue
        ks, xset = min(xs, key=lambda t: t[1])
        ol = [i for i, pl in enumerate(p.players) if pl.get('group') == 'OL' and p.pos(i, ks)[0] is not None]
        if len(ol) < 2: continue
        ys = sorted(p.pos(i, ks)[1] for i in ol); lo, hi = ys[0], ys[-1]
        D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None]
        hit = None
        for k in range(0, kend + 1):
            if p.pos(q, k)[0] is None: continue
            dd = next((d for d in D if p.pos(d, k)[0] is not None and p.dist(q, d, k) <= 1.0), None)
            if dd is not None: hit = (k, dd); break
        if fw is not None: out = 'throw'; ke = kend
        else:
            kx = next((k for k in range(ks, kend + 1) if (p.pos(q, k)[0] or -9) > 0), None)
            out, ke = ('scramble', kx) if kx is not None else ('sack', kend)
        a, b = p.pos(q, ks), p.pos(q, ke)
        if None in (a[0], b[0]): continue
        fwd, lat = b[0] - a[0], abs(b[1] - a[1]); outside = not (lo - 0.5 <= b[1] <= hi + 0.5)
        setIn = lo - 0.5 <= a[1] <= hi + 0.5
        kl = next((k for k in range(ks, ke + 1) if p.pos(q, k)[1] is not None and not (lo - 0.5 <= p.pos(q, k)[1] <= hi + 0.5)), None)
        dy = b[1] - a[1]; side = None
        if hit is not None and p.pos(hit[1], hit[0])[1] is not None:
            ry = p.pos(hit[1], hit[0])[1] - p.pos(q, hit[0])[1]
            side = 'toward' if dy * ry > 0 else 'away'
        vmax = max((p.speed(q, k) for k in range(0, p.frames) if p.pos(q, k)[0] is not None), default=0)
        if DUMP: DUMP.write(json.dumps({'id': p.raw['id'], 'cls': klass(fwd, lat, outside), 'out': out, 'hit': hit is not None, 'outside': outside, 'yards': p.raw['yards'], 'vmax': vmax}) + '\n')
        R.append({'cls': klass(fwd, lat, outside), 'out': out, 'hit': hit is not None, 'fwd': fwd, 'lat': lat, 'outside': outside,
                  'yards': p.raw['yards'], 'comp': 'catch' in ev, 'setIn': setIn, 'leave': (kl - ks) * p.dt if kl is not None else None,
                  'side': side, 'right': dy < 0})
    print(f"== {os.path.basename(path)}: dropbacks {len(R)}")
    for lab, S in (('all dropbacks', R), ('a rusher within 1 yd before the ball is out', [r for r in R if r['hit']])):
        n = len(S); print(f"  {lab} (n {n})")
        cc = C.Counter(r['cls'] for r in S)
        o = [r for r in S if r['outside']]
        if o:
            si = [r for r in o if r['setIn'] and r['leave'] is not None]
            print(f"    ended outside the box {100*len(o)/n:.0f}%: set inside first {100*len(si)/len(o):.0f}%, set -> leaving p50 {st.median(r['leave'] for r in si) if si else float('nan'):.2f} s"
                  + (f" | toward the rusher {100*sum(r['side']=='toward' for r in o)/max(1,sum(r['side'] is not None for r in o)):.0f}% away {100*sum(r['side']=='away' for r in o)/max(1,sum(r['side'] is not None for r in o)):.0f}%" if any(r['side'] for r in o) else '')
                  + f" | to his right {100*sum(r['right'] for r in o)/len(o):.0f}%")
        print("    movement:   " + ' | '.join(f"{k} {100*cc[k]/n:.0f}%" for k in CLS))
        for out in ('throw', 'sack', 'scramble'):
            s = [r for r in S if r['out'] == out]
            if not s: continue
            c2 = C.Counter(r['cls'] for r in s)
            line = f"    {out:8s} {100*len(s)/n:3.0f}% | " + ' | '.join(f"{k} {100*c2[k]/len(s):.0f}%" for k in CLS if c2[k])
            print(line)
            if out == 'throw':
                for k in CLS:
                    t = [r for r in s if r['cls'] == k]
                    if len(t) >= 5: print(f"        {k:15s} n {len(t):5d} complete {100*sum(r['comp'] for r in t)/len(t):3.0f}% yd/att {st.mean(r['yards'] for r in t):5.1f}")
            if out == 'scramble':
                print(f"        crossed inside the tackle box {100*sum(not r['outside'] for r in s)/len(s):.0f}% | forward p50 {st.median(r['fwd'] for r in s):.1f} lateral p50 {st.median(r['lat'] for r in s):.1f} | yards p50 {st.median(r['yards'] for r in s):.1f}")
            if out == 'sack':
                print(f"        sack spot vs set point: forward p50 {st.median(r['fwd'] for r in s):+.1f} lateral p50 {st.median(r['lat'] for r in s):.1f}")
