"""Completion by target depth and width, same code on NFL tracking and sim plays (common format).
Throws: pass plays with events.pass_forward and a target. Depth = the target's x (yards past the line) at the ball's
arrival (events.pass_arrived; else the last frame, so incompletions without an arrival tag are kept). Width = his
lateral distance from the ball's snap spot then. Caught = events.catch (not a defender carrying). Interceptions are
not reported: the common format does not mark them reliably on either side. Also, per bucket, the nearest defender to the target at the release (p50).
usage: python3 -I scripts/diag/pass-operators/depthwidth.py <plays.jsonl.gz> [...]"""
import sys, os, json, gzip, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
DB = lambda d: '<0' if d < 0 else '0-5' if d < 5 else '5-10' if d < 10 else '10-20' if d < 20 else '20+'
for path in sys.argv[1:]:
    G = collections.defaultdict(list)
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {})
        if raw.get('kind') != 'pass' or 'pass_forward' not in ev or raw.get('target') is None: continue
        p = Play(raw); t = raw['target']; kr = p.k(ev['pass_forward']); ka = p.k(ev['pass_arrived']) if 'pass_arrived' in ev else len(raw['xy']) - 1
        ka = min(ka, len(raw['xy']) - 1)
        if p.pos(t, ka)[0] is None or p.pos(t, kr)[0] is None: continue
        x, y = p.pos(t, ka); w = abs(y - raw['ball_y'])
        car = raw.get('carrier'); intc = car is not None and p.players[car]['side'] == 'D'
        caught = 'catch' in ev and not intc
        near = min((p.dist(t, d, kr) for d in p.who('D') if p.pos(d, kr)[0] is not None), default=float('nan'))
        for key in ((DB(x), 'mid' if w < 9 else 'wide'), (DB(x), 'all'), ('all', 'all')):
            G[key].append((caught, intc, near))
    print('==', os.path.basename(path))
    order = ['<0', '0-5', '5-10', '10-20', '20+', 'all']
    for k in sorted(G, key=lambda k: (order.index(k[0]), k[1])):
        v = G[k]; n = len(v); c = sum(a for a, _, _ in v) / n
        print(f"   {k[0]:6} {k[1]:5} n {n:5}  comp {c:.2f}±{math.sqrt(c*(1-c)/n):.2f}  nearest at release p50 {q([z for _, _, z in v]):.1f}")
