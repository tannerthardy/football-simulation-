"""Gain bands and total variation distance from NFL60 for lab arms. Bands
<0, 0-3, 4-9, 10-19, 20-39, 40+; NFL is runs with 60+ yd to go, restricted
to the charted concepts of the mode (zone: inside/outside zone; gap: power,
counter, duo, trap).
usage: bands.py zone|gap LABEL [LABEL ...]  (out/open-field/all/LABEL.jsonl.gz)"""
import gzip, json, sys
ytg = json.load(open('out/mechanics/nfl-ytg.json'))
B = [(-99, 0, '<0'), (0, 4, '0-3'), (4, 10, '4-9'), (10, 20, '10-19'), (20, 40, '20-39'), (40, 999, '40+')]
def dist(g): return [100 * sum(1 for x in g if lo <= x < hi) / len(g) for lo, hi, _ in B]
def gains(path, nfl, concepts=None):
    g = []
    for line in gzip.open(path, 'rt'):
        r = json.loads(line); raw = r.get('common', r) if 'common' in r else r
        if raw.get('kind') != 'run': continue
        if nfl:
            if ytg.get(raw['id'], 0) < 60: continue
            if concepts and (raw.get('cell') or {}).get('concept') not in concepts: continue
        g.append(raw['yards'])
    return g
mode = sys.argv[1]
nflc = {'zone': ('INSIDE ZONE', 'OUTSIDE ZONE'), 'gap': ('POWER', 'COUNTER', 'DUO', 'TRAP')}[mode]
N = dist(gains('out/mechanics/nfl-plays.jsonl.gz', True, nflc))
print(f"{'NFL60 ' + mode:12s} " + ' '.join(f"{b[2]} {v:5.1f}" for b, v in zip(B, N)))
for l in sys.argv[2:]:
    D = dist(gains(f'out/open-field/all/{l}.jsonl.gz', False))
    print(f"{l:12s} " + ' '.join(f"{b[2]} {v:5.1f}" for b, v in zip(B, D)) + f" | TVD {0.5 * sum(abs(a - b) for a, b in zip(D, N)):.1f}")
