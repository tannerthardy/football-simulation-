"""The finish: from first contact on the QB to the outcome (Integration, 2026-11-13: sacked given contact 53% NFL
against 14-26% ours, with arrival and contact rates matching). Same operator on NFL tracking and sim exports.

usage: python3 -I scripts/diag/pass-operators/finish.py [--nfl-labels <bdb2025 dir> | --review <review.json>]
       <plays.jsonl.gz> [trace-seed]

Dropbacks. First contact: the first frame, ball in the QB's hands and after 0.5 s, with a defender within 1.0 yd of
the QB. Outcome: sacked (NFL plays.csv passResult 'S'; sim stats.sacked), threw (a forward pass within the play), or
neither (escaped: scramble, run, fumble or the play ending otherwise). Time from contact to the sack (NFL timeToSack;
sim: the review's sack time if present, else the play's end) or to the release.

Splits at contact:
- where the rusher is: front (between the QB and the line, x > QB x + 0.3), behind (x < QB x - 0.3), side;
- free (no offensive non-QB within 1.5 yd of him) or still partly blocked;
- his speed toward the QB.
A trace seed prints 12 contacts with their split and outcome, for eye-checks.
"""
import sys, os, json, gzip, math, csv, random
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
args = sys.argv[1:]; labels = review = None
while args and args[0].startswith('--'):
    if args[0] == '--nfl-labels': labels = args[1]
    elif args[0] == '--review': review = args[1]
    args = args[2:]
path = args[0]; seed = int(args[1]) if len(args) > 1 else None
SACK = {}
if labels:
    for r in csv.DictReader(open(os.path.join(labels, 'plays.csv'))):
        tts = r.get('timeToSack')
        SACK[f"{r['gameId']}-{r['playId']}"] = (r.get('passResult') == 'S', float(tts) if tts not in (None, '', 'NA') else None)
if review:
    for p in json.load(open(review))['plays']:
        if p.get('kind') != 'pass': continue
        st = p.get('stats') or {}; ev = p.get('events') or []
        ts = next((e['t'] for e in ev if e.get('type') == 'sack'), None)
        SACK[p['id']] = (bool(st.get('sacked')), ts)
rows = []; drops = 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw)
    if raw.get('kind') != 'pass' or not raw.get('xy'): continue
    p = Play(raw); ev = raw['events']; pid = raw.get('id')
    qbs = p.who('O', 'QB')
    if not qbs or pid not in SACK: continue
    qb = qbs[0]; drops += 1
    others = [o for o in p.who('O') if o != qb]
    fw = ev.get('pass_forward'); tend = fw if fw is not None else p.end
    hit = None
    for k in range(p.k(0.5), min(p.frames - 1, p.k(tend)) + 1):
        qx, qy = p.pos(qb, k)
        if qx is None: break
        for d in p.who('D'):
            dx, dy = p.pos(d, k)
            if dx is not None and math.hypot(dx - qx, dy - qy) <= 1.0:
                hit = (k, d); break
        if hit: break
    if not hit: continue
    k, d = hit; t = k * p.dt
    qx, qy = p.pos(qb, k); dx, dy = p.pos(d, k)
    where = 'front' if dx > qx + 0.3 else 'behind' if dx < qx - 0.3 else 'side'
    free = all(p.pos(o, k)[0] is None or math.hypot(p.pos(o, k)[0] - dx, p.pos(o, k)[1] - dy) > 1.5 for o in others)
    vx, vy = p.velocity(d, k); gl = math.hypot(qx - dx, qy - dy) or 1e-6
    closing = (vx * (qx - dx) + vy * (qy - dy)) / gl
    sacked, ts = SACK[pid]
    out = 'sacked' if sacked else 'threw' if fw is not None else 'escaped'
    after = (ts - t) if sacked and ts is not None else (fw - t) if out == 'threw' else (p.end - t)
    rows.append({'pid': pid, 't': t, 'where': where, 'free': free, 'closing': closing, 'out': out, 'after': after})
n = len(rows)
print(f"== {os.path.basename(path)}: dropbacks {drops} | first contact (a defender within 1.0 yd, ball in hand) {n} ({100 * n / max(1, drops):.1f}%)")
def line(lab, R):
    if len(R) < 5: return
    m = len(R); s = [r for r in R if r['out'] == 'sacked']; th = [r for r in R if r['out'] == 'threw']; es = [r for r in R if r['out'] == 'escaped']
    print(f"   {lab:22s} n {m:5d} | sacked {100 * len(s) / m:4.0f}% (after {q([r['after'] for r in s]):.2f} s) | threw {100 * len(th) / m:4.0f}% (after {q([r['after'] for r in th]):.2f} s)"
          f" | escaped {100 * len(es) / m:4.0f}% | contact at {q([r['t'] for r in R]):.2f} s, closing {q([r['closing'] for r in R]):+.1f}")
line('all', rows)
for w in ('front', 'side', 'behind'): line(f'from {w}', [r for r in rows if r['where'] == w])
line('free', [r for r in rows if r['free']]); line('partly blocked', [r for r in rows if not r['free']])
for w in ('front', 'side', 'behind'):
    line(f'{w}, free', [r for r in rows if r['where'] == w and r['free']])
if seed is not None:
    for r in random.Random(seed).sample(rows, min(12, n)):
        print(f"   trace {r['pid']} contact {r['t']:.1f} s {r['where']} {'free' if r['free'] else 'blocked'} closing {r['closing']:+.1f} -> {r['out']} after {r['after']:.2f} s")
