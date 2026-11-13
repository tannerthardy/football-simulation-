"""Reconcile the scorecard's sack with the pass-rush operators on the same plays (Integration, 2026-11-13).

usage: python3 -I scripts/diag/pass-operators/reconcile-sacks.py <outdir> <export.jsonl.gz>:<review.json> [...]

From the review (native stats, the scorecard's definitions): pass plays, sacked, pressured, scrambles, by play action
(plan.playAction). Also writes each export split into <outdir>/<name>.pa.jsonl.gz and .nopa.jsonl.gz (joined on the
play id) so the operators (pressure-time.py, pressure-source.py) can run on the same subsets.
"""
import sys, os, json, gzip
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
pct = lambda a, b: f"{100 * a / b:.1f}%" if b else '-'
for arg in sys.argv[2:]:
    exp, rev = arg.split(':')
    R = json.load(open(rev))['plays']
    pa = {p['id'] for p in R if p.get('kind') == 'pass' and (p.get('plan') or {}).get('playAction')}
    passes = [p for p in R if p.get('kind') == 'pass']
    for lab, P in (('all', passes), ('play action', [p for p in passes if p['id'] in pa]), ('no play action', [p for p in passes if p['id'] not in pa])):
        n = len(P); st = [p.get('stats') or {} for p in P]
        print(f"{os.path.basename(exp)} {lab:15s} pass plays {n:5d} | native sacked {pct(sum(bool(s.get('sacked')) for s in st), n)}"
              f" | pressured {pct(sum(bool(s.get('pressured')) for s in st), n)} | scramble {pct(sum(bool(s.get('scramble')) for s in st), n)}")
    base = os.path.basename(exp).replace('.jsonl.gz', '')
    a = gzip.open(os.path.join(out, base + '.pa.jsonl.gz'), 'wt'); b = gzip.open(os.path.join(out, base + '.nopa.jsonl.gz'), 'wt')
    for line in gzip.open(exp, 'rt'):
        r = json.loads(line); c = r.get('common', r)
        (a if c.get('id') in pa else b).write(line)
    a.close(); b.close()
