"""Reproduce the existing native601 summaries from saved light index only.

No engine imports or simulations. Historical noContact/noAttempt labels are
retained for artifact equality, with their actual proxy definitions in receipt.
"""
import gzip
import hashlib
import json
import math
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
INPUT = ROOT / 'games' / 'index.json.gz'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

with gzip.open(INPUT, 'rt') as f:
    packet = json.load(f)
assert packet['sourceBefore'] == packet['sourceAfter']
rows = [dict(r, id=f'G{g["gameIndex"]}-P{r["index"]:03d}')
        for g in packet['rows'] for r in g['log']
        if r['kind'] in ['run', 'pass'] and not r.get('nullified')]
runs = [r for r in rows if r['kind'] == 'run']
catches = [r for r in rows if r['kind'] == 'pass'
           and r.get('stats', {}).get('completed')
           and not r['stats'].get('interceptedBy') and 'yac' in r['stats']]
stats = lambda r: r.get('stats', {})
brief = lambda r: {k:r[k] for k in ['id', 'yards', 'plan', 'stats']}
rush_yards = round(sum(r['yards'] for r in runs), 2)
summary = {'source':packet['sourceBefore'], 'plays':len(rows),
           'pointsPerTeam':sum(sum(g['score'].values()) for g in packet['rows'])/(2*len(packet['rows'])),
           'runs':len(runs), 'rushYards':rush_yards, 'YPC':rush_yards/len(runs),
           'stuffs':sum(r['yards'] <= 0 for r in runs),
           'run10':sum(r['yards'] >= 10 for r in runs),
           'run20':sum(r['yards'] >= 20 for r in runs),
           'YAC':sum(stats(r)['yac'] for r in catches)/len(catches),
           'missedBrokenPerPlay':sum(stats(r).get('missedTackles',0)+stats(r).get('brokenTackles',0) for r in rows)/len(rows),
           'passAttempts':sum(bool(stats(r).get('attempted')) for r in rows if r['kind']=='pass'),
           'interceptions':sum(bool(stats(r).get('interceptedBy')) for r in rows if r['kind']=='pass'),
           'topRuns':[brief(r) for r in sorted(runs, key=lambda r:r['yards'], reverse=True)[:12]],
           'topYac':[brief(r) for r in sorted(catches, key=lambda r:stats(r)['yac'], reverse=True)[:10]]}

def group_summary(key):
    groups = defaultdict(list)
    for r in runs:
        groups[r['plan'][key]].append(r)
    return [{'name':name, 'n':len(group), 'mean':sum(r['yards'] for r in group)/len(group),
             'stuffs':sum(r['yards']<=0 for r in group),
             '10plus':sum(r['yards']>=10 for r in group),
             '20plus':sum(r['yards']>=20 for r in group),
             'noContact':sum('yardsBeforeContact' not in stats(r) for r in group)}
            for name,group in sorted(groups.items())]

def subset(group):
    return {'n':len(group),
            'noContact':sum('yardsBeforeContact' not in stats(r) for r in group),
            'noAttempt':sum('yardsBeforeContact' not in stats(r) and not(stats(r).get('missedTackles') or stats(r).get('brokenTackles')) for r in group),
            'missed':sum(stats(r).get('missedTackles',0) for r in group),
            'broken':sum(stats(r).get('brokenTackles',0) for r in group)}

xs = sorted(r['yards'] for r in runs)
tail = sorted(runs, key=lambda r:r['yards'], reverse=True)[:10]
tail_sum = sum(r['yards'] for r in tail)
anatomy = {'median':xs[len(xs)//2], 'p90':xs[int(.90*(len(xs)-1))], 'p95':xs[int(.95*(len(xs)-1))],
           'top10Share':tail_sum/rush_yards, 'withoutTop10Mean':(rush_yards-tail_sum)/(len(runs)-10),
           'groups':{key:group_summary(key) for key in ['concept','front','coverage']},
           'all':subset(runs), '20plus':subset([r for r in runs if r['yards']>=20]),
           'stuffs':subset([r for r in runs if r['yards']<=0])}

def compare(a,b,path=''):
    if isinstance(a,dict):
        assert a.keys()==b.keys(), path
        for k in a: compare(a[k],b[k],path+'/'+k)
    elif isinstance(a,list):
        assert len(a)==len(b), path
        for i,(x,y) in enumerate(zip(a,b)): compare(x,y,path+f'/{i}')
    elif isinstance(a,(int,float)) and isinstance(b,(int,float)):
        assert math.isclose(a,b, rel_tol=1e-14, abs_tol=1e-12), (path,a,b)
    else:
        assert a==b, (path,a,b)

checks = []
for name, value in [('summary.json',summary), ('run-anatomy-summary.json',anatomy)]:
    path = ROOT/'games'/name
    compare(json.loads(path.read_text()),value)
    checks.append({'path':str(path.relative_to(ROOT)), 'fileSha256':sha(path), 'reproduced':True})
receipt = {'schema':'saved-native-game-summary-reproduction-v1', 'toolSha256':sha(Path(__file__)),
           'inputSha256':sha(INPUT), 'source':packet['sourceBefore'], 'noSimulations':True,
           'summaryFiles':checks, 'cleanCompletionYacDenominator':len(catches),
           'definitions':{'officialScrimmage':'kind run/pass and not nullified',
                          'calledRun':'official kind run; scrambles on pass calls excluded',
                          'stuff':'called-run gain <= 0',
                          'quantiles':'sorted observed gains at floor(p*(n-1)); median middle observed gain',
                          'cleanCompletionYac':'completed pass with no interceptedBy and explicit yac field',
                          'historicalNoContact':'yardsBeforeContact field absent; not proof of no actual physical contact',
                          'historicalNoAttempt':'YBC absent and zero missed/broken counters; not proof of no actual tackle attempt'},
           'limits':['Descriptive generated-call population; not NFL concept equivalence or source causal effects.',
                     'Selected full native witnesses separately establish actual contact/attempt anatomy.',
                     'Existing summaries reproduced with numerical tolerance 1e-12; no artifact overwritten.']}
(ROOT/'games'/'summary-reproduction-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'summaryFilesReproduced':len(checks), 'runs':len(runs), 'YPC':summary['YPC'],
                  'cleanCompletionYacDenominator':len(catches)}))
