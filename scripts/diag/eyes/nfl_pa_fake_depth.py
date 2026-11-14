"""Play-action fake by blitz (common-format NFL plays joined to plays.csv/player_play.csv): QB depth behind the line
and his facing proxy (lateral offset) at 0.5 / 1.0 / 1.5 s, PA under center vs gun, blitz (5+ initial rushers) vs not.
Run: python3 -I nfl_pa_fake_depth.py <nfl-plays.jsonl.gz> <datadir>"""
import sys, os, json, gzip, csv, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
plays, D = sys.argv[1], sys.argv[2]
P = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{D}/plays.csv')) if r['isDropback'] == 'TRUE'}
rush = collections.Counter()
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    if r['wasInitialPassRusher'] in ('1', 'TRUE'): rush[f"{r['gameId']}-{r['playId']}"] += 1
def q(v, p=.5):
    v = sorted(x for x in v if x is not None)
    return v[int(p * (len(v) - 1))] if v else float('nan')
C = collections.defaultdict(lambda: collections.defaultdict(list))
for line in gzip.open(plays, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw); pr = P.get(raw.get('id'))
    if pr is None or raw.get('kind') != 'pass' or pr['playAction'] != 'TRUE': continue
    p = Play(raw); qbs = p.who('O', 'QB')
    if not qbs: continue
    al = 'gun' if pr['offenseFormation'] in ('SHOTGUN', 'PISTOL', 'EMPTY') else 'under center'
    key = (al, rush[raw['id']] >= 5)
    for T in (0.5, 1.0, 1.5):
        k = p.k(T)
        if k < p.frames and p.pos(qbs[0], k)[0] is not None: C[key][T].append(-p.pos(qbs[0], k)[0])
print('| PA alignment | blitz | n | QB depth behind the line at 0.5 / 1.0 / 1.5 s (p50) |\n|---|---|---|---|')
for key in sorted(C):
    print(f"| {key[0]} | {'yes' if key[1] else 'no'} | {len(C[key][0.5])} | " + ' / '.join(f'{q(C[key][T]):.1f}' for T in (0.5, 1.0, 1.5)) + ' |')
