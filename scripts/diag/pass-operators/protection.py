"""Protection size, rush size and free rushers on dropbacks, same operator both sides (report only;
docs/reviews/2026-11-11-protection.md).

  python3 -I scripts/diag/pass-operators/protection.py nfl out/mechanics/nfl-plays.jsonl.gz data/raw/bdb2025/big-data-bowl-data
  python3 -I scripts/diag/pass-operators/protection.py sim <export.jsonl.gz>:<review.json>[,...]

Geometry (rushcount.py / freerush.py): at 1.5 s, or the throw if earlier, a rusher is a defender more than 1.0 yd
past his snap spot toward the QB and within 3 yd of the line; a protector is an offensive non-QB player behind the
line (x < 0.3) within the OL span +-3 yd. First pressure: first frame from 0.3 s, before the throw, with a defender
within 2.0 yd of the QB; free if no offensive non-QB player is within 1.2 yd of him then.
Joined per play: down, distance, rushers sent (NFL wasInitialPassRusher; sim plan.rushers), sack.
Prints protection size (5 / 6 / 7+) by down-and-distance and by rushers sent, and per protection size and margin
(rushers - protectors) the free-first-pressure and sack rates."""
import sys, os, json, gzip, math, csv, collections as C
mode = sys.argv[1]
def plays_from(path):
    for l in gzip.open(path, 'rt'):
        p = json.loads(l)
        if p.get('kind') == 'pass': yield p
side = {}
if mode == 'nfl':
    path, D = sys.argv[2], sys.argv[3]
    T = lambda v: v in ('1', 'TRUE', 'True')
    for r in csv.DictReader(open(f'{D}/plays.csv')):
        side[f"{r['gameId']}-{r['playId']}"] = {'down': int(r['down']), 'dist': int(r['yardsToGo']), 'sack': r['passResult'] == 'S', 'sent': 0}
    for r in csv.DictReader(open(f'{D}/player_play.csv')):
        k = f"{r['gameId']}-{r['playId']}"
        if k in side and T(r['wasInitialPassRusher']): side[k]['sent'] += 1
    paths = [path]
else:
    paths = []
    for pair in sys.argv[2].split(','):
        exp, rev = pair.split(':'); paths.append(exp)
        for p in json.load(open(rev))['plays']:
            if p['kind'] != 'pass' or p.get('nullified') or not p.get('plan'): continue
            side[p['id']] = {'down': p['down'], 'dist': p['distance'], 'sack': bool(p['stats'].get('sacked')), 'sent': p['plan'].get('rushers')}
rows = []
for path in paths:
    for p in plays_from(path):
        s = side.get(p['id'])
        if not s: continue
        pl, X = p['players'], p['xy']; Q = [i for i, q in enumerate(pl) if q['group'] == 'QB']
        if len(Q) != 1: continue
        q = Q[0]; O = [i for i, a in enumerate(pl) if a['side'] == 'O' and i != q]; Dd = [i for i, a in enumerate(pl) if a['side'] == 'D']
        OLi = [i for i in O if pl[i]['group'] == 'OL']
        if len(OLi) < 5: continue
        thr = p['events'].get('pass_forward'); end = len(X) if thr is None else min(len(X), int(round(thr / 0.1)))
        if end < 8: continue
        P = lambda i, f: (X[f][2 * i], X[f][2 * i + 1]); k = min(15, end - 1, len(X) - 1)
        ys = sorted(P(o, 0)[1] for o in OLi); lo, hi = ys[0] - 3, ys[-1] + 3
        rush = sum(1 for e in Dd if P(e, k)[0] < P(e, 0)[0] - 1.0 and P(e, k)[0] < 3)
        prot = sum(1 for o in O if P(o, k)[0] < 0.3 and lo <= P(o, k)[1] <= hi)
        hit = None
        for f in range(3, end):
            dm, d = min((math.dist(P(e, f), P(q, f)), e) for e in Dd)
            if dm <= 2.0: hit = (f, d); break
        free = bool(hit and min(math.dist(P(o, hit[0]), P(hit[1], hit[0])) for o in O) > 1.2)
        rows.append({**s, 'rush': rush, 'prot': prot, 'pressure': hit is not None, 'free': free, 'tp': hit[0] * 0.1 if hit else None})
n = len(rows)
print(f"== {mode}: {n} dropbacks (5 OL, at least 0.8 s before the throw)")
def bucket(r):
    if r['down'] == 1: return '1st'
    return f"{'2nd' if r['down'] == 2 else '3rd'}_{'short' if r['dist'] <= 3 else 'med' if r['dist'] <= 7 else 'long'}"
ps = lambda v: '5-' if v <= 5 else '6' if v == 6 else '7+'
sz = lambda R: ' '.join(f"{k} {100 * sum(ps(r['prot']) == k for r in R) / len(R):4.1f}" for k in ('5-', '6', '7+'))
print(f"  protection size (protectors at 1.5 s) all: {sz(rows)}")
for b in ('1st', '2nd_short', '2nd_med', '2nd_long', '3rd_short', '3rd_med', '3rd_long'):
    R = [r for r in rows if bucket(r) == b]
    if R: print(f"    {b:10} n{len(R):5} {sz(R)}")
for sent in ('3-', '4', '5', '6+'):
    R = [r for r in rows if r['sent'] is not None and (('3-' if r['sent'] <= 3 else '4' if r['sent'] == 4 else '5' if r['sent'] == 5 else '6+') == sent)]
    if R: print(f"    sent {sent:3} n{len(R):5} ({100 * len(R) / n:4.1f}%) {sz(R)}")
print('  by protection size: share | free first pressure | any first pressure | sack')
for k in ('5-', '6', '7+'):
    R = [r for r in rows if ps(r['prot']) == k]
    if R: print(f"    {k:3} {100 * len(R) / n:5.1f}% | free {100 * sum(r['free'] for r in R) / len(R):5.1f}% | pressure {100 * sum(r['pressure'] for r in R) / len(R):5.1f}% | sack {100 * sum(r['sack'] for r in R) / len(R):4.1f}%")
print('  by margin (rushers - protectors, geometric): share | free | sack')
for m in (-2, -1, 0, 1):
    R = [r for r in rows if max(-2, min(1, r['rush'] - r['prot'])) == m]
    if R: print(f"    {m:+d}{'+' if m == 1 else ' '} {100 * len(R) / n:5.1f}% | free {100 * sum(r['free'] for r in R) / len(R):5.1f}% | sack {100 * sum(r['sack'] for r in R) / len(R):4.1f}%")
print(f"  all: free first pressure {100 * sum(r['free'] for r in rows) / n:.1f}%, any first pressure {100 * sum(r['pressure'] for r in rows) / n:.1f}%, sack {100 * sum(r['sack'] for r in rows) / n:.1f}%")
