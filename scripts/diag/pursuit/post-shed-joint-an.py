"""Summary of post-shed-joint-tap.mts files: python3 -I post-shed-joint-an.py GLOB"""
import json, glob, sys, collections
GRP = {'DE': 'DL', 'DT': 'DL', 'NT': 'DL', 'EDGE': 'DL', 'OLB': 'LB', 'ILB': 'LB', 'MLB': 'LB', 'LB': 'LB'}
D = [json.load(open(f)) for f in sorted(glob.glob(sys.argv[1]))]
R = [r for d in D for r in d['rows']]
G = sum(d['games'] for d in D); H = sum(d.get('fouls', {}).get('holding', 0) for d in D); FG = sum(d.get('fouls', {}).get('frameGrabs', 0) for d in D)
print(f"games {G}: offensive holding events {H} = {H / max(1, 2 * G):.2f} per team-game | frame grabs chosen (BLOCK_FRAME) {FG}")
def pct(n, d): return f"{100*n/max(1,d):.0f}%"
for typ in ('run', 'pass'):
    for g in ('DL', 'LB'):
        X = [r for r in R if r['type'] == typ and GRP.get(r['pos'], 'DB') == g]
        if not X: continue
        F = [r for r in X if r['first']]
        I = [r for r in X if r.get('immediate')]
        tk = sum(r.get('ticks', 0) for r in X)
        print(f"{typ} {g}: immediately re-engaged at the end tick {pct(len(I), len(X))} (same blocker {sum(r['immediate']['same'] for r in I)}) | body contact (any) on {pct(sum(r.get('bodyTicks', 0) for r in X), tk)} of the next 0.5 s ticks, with the former blocker {pct(sum(r.get('bodyOld', 0) for r in X), tk)}")
        print(f"{typ} {g}: block ends {len(X)} | a joint survives the end {pct(sum(r['survived'] for r in X), len(X))} | back on him within 0.5 s {pct(len(F), len(X))}")
        if not F: continue
        c = collections.Counter
        print(f"   source: " + ', '.join(f"{k} {v}" for k, v in c(('same blocker' if r['first']['same'] else 'new blocker') + ' / ' + (r['first']['joint'] or 'engagement only') for r in F).most_common()))
        print(f"   blocker from his facing: {dict(c(r['first']['fromFacing'] for r in F))} | from his travel: {dict(c(r['first']['fromTravel'] for r in F))}")
        ha = [r['first']['handAngle'] for r in F if r['first']['handAngle'] is not None]
        print(f"   hand contact on his torso: front (<45 deg) {sum(a < 45 for a in ha)}, side {sum(45 <= a <= 135 for a in ha)}, back {sum(a > 135 for a in ha)} (recorded {len(ha)})"
              f" | cloth hold > 0 {sum(1 for r in F if (r['first']['hold'] or 0) > 0)}, grip {sum(1 for r in F if r['first']['grip'])}, chosen hold (tryHold) {sum(r['first']['chosenHold'] for r in F)}, holding foul called on the pair {sum(r['foul'] for r in F)}")
        S = [r for r in F if r['first']['joint'] == 'survived']
        if S: print(f"   surviving joints n {len(S)}: from travel {dict(c(r['first']['fromTravel'] for r in S))}, was the engagement holding {sum(r['wasHolding'] for r in S)}, foul {sum(r['foul'] for r in S)}")
