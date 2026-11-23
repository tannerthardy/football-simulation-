"""Path-path crossings at the snap (seat-travel.mts rows): two underneath defenders whose straight paths from their snap
spots to their landmarks properly intersect (the real collision risk), and the Mike on a curl-flat / flat seat.
python3 scripts/diag/coverage/seat_paths.py <jsonl...>"""
import json, sys, collections as C
def cross(a1, a2, b1, b2):
    o = lambda p, q, r: (q[0]-p[0])*(r[1]-p[1]) - (q[1]-p[1])*(r[0]-p[0])
    return o(a1,a2,b1)*o(a1,a2,b2) < 0 and o(b1,b2,a1)*o(b1,b2,a2) < 0
plays = []
for f in sys.argv[1:]:
    cur = []
    for l in open(f):
        r = json.loads(l)
        if cur and (r['s'] in {x['s'] for x in cur} or r['label'] != cur[0]['label']): plays.append(cur); cur = []
        cur.append(r)
    if cur: plays.append(cur)
n = pairs = 0; c = C.Counter(); calls = C.Counter(); mike = 0; seats = 0
for p in plays:
    U = [r for r in p if not r['deep']]; seats += len(U); n += 1
    mike += sum(r['s'] == 'LB_M' and r['zone'].startswith(('curl_flat', 'flat')) for r in U)
    hit = False
    for i in range(len(U)):
        for j in range(i+1, len(U)):
            a, b = U[i], U[j]
            if cross(a['align'], a['lm'], b['align'], b['lm']):
                pairs += 1; hit = True; c[tuple(sorted([f"{a['s']}:{a['zone']}", f"{b['s']}:{b['zone']}"]))] += 1
    if hit: calls[p[0]['cov']] += 1
print(f'dropbacks {n}, underneath seats {seats}; crossing path pairs {pairs} ({pairs/n:.3f} per dropback); dropbacks with one {sum(calls.values())} ({sum(calls.values())/n:.3f}); Mike on a curl-flat/flat {mike} ({mike/seats:.3f} of seats)')
print('  top pairs', c.most_common(6)); print('  by call', calls.most_common(8))
