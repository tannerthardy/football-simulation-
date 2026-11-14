"""Play action against the blitz (BDB 2025, all weeks, dropbacks, no spikes): time to throw and time in the tackle
box on play action with and without a blitz (5+ initial rushers), by QB alignment (shotgun/pistol vs under center);
completion, sacks, air yards. Run: python3 -I nfl_pa_blitz.py [datadir]"""
import csv, sys, os, collections
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
D = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'data', 'raw', 'bdb2025', 'big-data-bowl-data')
P = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(f'{D}/plays.csv')) if r['isDropback'] == 'TRUE' and r['qbSpike'] != 'TRUE'}
rush = collections.Counter()
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k in P and r['wasInitialPassRusher'] in ('1', 'TRUE'): rush[k] += 1
f = lambda v: float(v) if v not in ('NA', '') else None
def q(v, p=.5):
    v = sorted(x for x in v if x is not None)
    if not v: return float('nan')
    i = (len(v) - 1) * p; lo = int(i); return v[lo] + (v[min(lo + 1, len(v) - 1)] - v[lo]) * (i - lo)
print('| PA | blitz | alignment | n | TTT p25/50/75 | quick < 2.0 s | sack | comp (att) | air p50 |')
print('|---|---|---|---|---|---|---|---|---|')
for pa in ('TRUE', 'FALSE'):
    for bl in (True, False):
        for al in ('gun', 'under center'):
            rs = [r for k, r in P.items() if r['playAction'] == pa and (rush[k] >= 5) == bl and
                  ((r['offenseFormation'] in ('SHOTGUN', 'PISTOL', 'EMPTY')) == (al == 'gun'))]
            if not rs: continue
            t = [f(r['timeToThrow']) for r in rs if r['passResult'] in ('C', 'I', 'IN')]
            att = [r for r in rs if r['passResult'] in ('C', 'I', 'IN')]
            print(f"| {'yes' if pa == 'TRUE' else 'no'} | {'yes' if bl else 'no'} | {al} | {len(rs)} | {q(t,.25):.2f} / {q(t):.2f} / {q(t,.75):.2f} | "
                  f"{100*sum(x is not None and x < 2.0 for x in t)/max(1,len(t)):.0f}% | {100*sum(r['passResult']=='S' for r in rs)/len(rs):.1f}% | "
                  f"{100*sum(r['passResult']=='C' for r in att)/max(1,len(att)):.0f}% | {q([f(r['passLength']) for r in att]):.0f} |")
