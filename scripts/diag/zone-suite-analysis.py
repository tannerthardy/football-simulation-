"""Offline zone diagnosis of #101's frozen census. Simulates zero plays.

Run from repository root after validating the detailed caches with the frozen
suite's validateCache/preflightEvidence helpers. No gameplay or flag changes.
"""
import collections
import gzip
import hashlib
import json
from pathlib import Path
import statistics
import time

START = time.perf_counter()
DEST = Path('data/reviews/current/zone-suite-analysis')
DEST.mkdir(parents=True, exist_ok=True)
CATALOG = Path('data/reviews/current/run-action-suite/rows.json.gz')
ROWS = json.loads(gzip.decompress(CATALOG.read_bytes()))
INDEX = json.loads(Path('out/run-action-accepted/index.json').read_text())
LOOKUP = {r['id']: r for r in INDEX['rows']}
ZONES = ['insideZone', 'outsideZone', 'wideZone', 'splitZone']
OL = {'LT', 'LG', 'C', 'RG', 'RT'}


def median(items):
    values = [v for v in items if v is not None]
    return statistics.median(values) if values else None


def stats(rows):
    terminal = [r for r in rows if r['metrics']['terminal']]
    gains = [r['metrics']['gain'] for r in terminal]
    return {'n': len(rows), 'terminal': len(terminal), 'censored': len(rows)-len(terminal),
            'median': median(gains), 'mean': statistics.mean(gains) if gains else None,
            'fourPlusNoTurnover': sum(r['metrics']['success'] for r in terminal)/len(terminal) if terminal else None,
            'stuff': sum(y <= 0 for y in gains)/len(gains) if gains else None}


def raw(row):
    value = json.loads(gzip.decompress(Path(LOOKUP[row['case']['id']]['path']).read_bytes()))
    assert value['row']['physicalSignature'] == row['physicalSignature']
    assert value['row']['case']['inputSha256'] == row['case']['inputSha256']
    return value['row']


primary = {}
for family in ZONES + ['duo']:
    rows = [r for r in ROWS if r['case']['phase'] == 'primary' and r['case']['family'] == family]
    assert len(rows) == 80
    detailed = [raw(r) for r in rows]
    counts = collections.Counter(r['indicators']['firstDefender'] for r in rows)
    jobs = [j for r in rows for j in r['indicators']['secondLevelJobs']]
    opening = {}
    for tick in ['1', '2']:
        snapshots = [r['indicators']['opening'][tick] for r in rows if tick in r['indicators']['opening']]
        body_n = backward = 0
        for r in detailed:
            f = next((f for f in r['observation']['frames'] if abs(f['afterAt']-float(tick)) < 1e-5), None)
            if f is None:
                continue
            initial = {a['slot']: a['pos'] for a in r['observation']['initial']}
            for a in f['agents']:
                if a['slot'] in OL:
                    body_n += 1
                    backward += a['pos']['x'] < initial[a['slot']]['x']-.1
        opening[tick] = {'snapshots': len(snapshots), 'olBodies': body_n,
                         'backwardMoreThanPointOneYard': backward,
                         **{k: median(s[k] for s in snapshots) for k in ['olLateral', 'olForward', 'loadedFirstLevelForward']}}
    primary[family] = {**stats(rows), 'firstContactYardsMedian': median(r['metrics']['contactYards'] for r in rows),
                       'loadedFirstContactDefender': sum(r['indicators']['loadedFirstDefenderAtContact'] is True for r in rows),
                       'firstDefenderCounts': dict(counts),
                       'secondLevelJobs': len(jobs), 'jobsLoadedByFirstContact': sum(j['loadedByContact'] for j in jobs),
                       'opening': opening,
                       'firstOLLoadMedian': median(min(p['first'] for p in r['observation']['loads'] if p['blocker'] in OL) for r in detailed),
                       'inlineSoloReachAtInstallCases': sum(any(p['slot'] in ['Y', 'H'] and p['kind'] == 'reach' and not p['combination'] for p in r['observation']['installed']) for r in detailed),
                       'positivePeerImpactBeforeOneSecondCases': sum(any(p['interval'][0] < 1 for p in r['observation']['offenseImpacts']) for r in detailed),
                       'positivePeerImpactBeforeFirstContactCases': sum(any(p['interval'][0] < (r['metrics']['firstContact']['t'] if r['metrics']['firstContact'] else float('inf')) for p in r['observation']['offenseImpacts']) for r in detailed)}

transfers = []
for family in ZONES:
    rows = [r for r in ROWS if r['case']['phase'] == 'transfer' and r['case']['family'] == family]
    for formation in sorted({r['case']['formation'] for r in rows}):
        selected = [r for r in rows if r['case']['formation'] == formation]
        matched = [r for r in ROWS if r['case']['phase'] == 'primary' and r['case']['family'] == family
                   and r['case']['roster'] == 'pair11' and r['case']['seed'] == 77
                   and r['case']['look'] in ['over3', 'under3', 'wide9', 'tite4']]
        assert len(selected) == len(matched) == 8
        transfers.append({'family': family, 'formation': formation, **stats(selected), 'matchedPrimary': stats(matched)})

selected_ids = json.loads(Path('out/zone-analysis-ids.json').read_text())
traces = []
for case_id in selected_ids:
    compact = next(r for r in ROWS if r['case']['id'] == case_id)
    r = raw(compact)
    traces.append({'id': case_id, 'inputSha256': r['case']['inputSha256'], 'key': LOOKUP[case_id]['key'],
                   'metrics': r['metrics'], 'indicators': compact['indicators'],
                   'installed': r['observation']['installed'], 'loads': r['observation']['loads'],
                   'climbs': [e for e in r['observation']['events'] if e['type'] == 'block_climb']})

report = {'schema': 'zone-suite-analysis-v1', 'basis': INDEX['provenance'],
          'censusCollectorCommit': INDEX['head'], 'analysisHost': 'd87387d3872822613111d53253b1b9bef24734d8',
          'compactRowsFileSha256': hashlib.sha256(CATALOG.read_bytes()).hexdigest(),
          'zonePrimaryCases': 320, 'zoneTransferCases': 80, 'duoContrasts': 80,
          'newNativeCases': 0, 'reserveOpened': False, 'primary': primary, 'transfer': transfers,
          'focusedTraces': traces,
          'limits': ['Designed stress matrix, not NFL call-weighted or calibrated technique data.',
                     'A body averaged across all five OL includes climbs/cutoffs and is not a five-man front-side track.',
                     'Load before contact does not establish useful protection or a safe/attainable missed job.',
                     'Positive peer impulses are exposure flags, not proof of wrong avoidance or causal lost yards.',
                     'Raw/final movement differences include engagement control as well as spacing.',
                     'Native caches omit full RB candidate scores and every intermediate modifier.',
                     'PR104 inline eligibility and PR102 separated-hand-span changes are unaccepted and excluded.']}
(DEST/'summary.json').write_text(json.dumps(report, indent=2)+'\n')

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
names = ['Inside zone', 'Outside zone', 'Wide zone', 'Split zone', 'Duo contrast']
families = ZONES + ['duo']
fig, ax = plt.subplots(figsize=(9, 4.4))
y = list(range(5))
ax.barh(y, [primary[f]['median'] for f in families], color=['#4b9baf']*4+['#9b9b9b'], height=.58)
for i, f in enumerate(families):
    p = primary[f]
    ax.text(p['median']+.09, i, f"{p['median']:.2f} yd   |   {p['fourPlusNoTurnover']:.0%} gained 4+ without turnover", va='center', fontsize=9)
ax.set_yticks(y, names); ax.invert_yaxis(); ax.set_xlim(0, 8); ax.set_xlabel('Median credited gain (yards)')
ax.set_title('Zone can work, but ordinary gains remain inconsistent', loc='left', weight='bold')
ax.spines[['top', 'right', 'left']].set_visible(False); ax.grid(axis='x', alpha=.17); ax.set_axisbelow(True)
fig.text(.02,.015,'80 saved primary plays per concept; fixed stress matrix, not NFL frequencies. Different concepts/formations are observational contrasts.', fontsize=8)
fig.tight_layout(rect=[0,.05,1,1])
fig.savefig('docs/reviews/run-playaction-stress/zone-analysis.png', dpi=150)
plt.close(fig)
elapsed = time.perf_counter()-START
(DEST/'offline-cost.json').write_text(json.dumps({'seconds': elapsed, 'newNativeCases': 0,
    'scriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()},indent=2)+'\n')
print(json.dumps({'primary': {k: {p:v[p] for p in ['n','median','mean','fourPlusNoTurnover','firstContactYardsMedian','jobsLoadedByFirstContact','secondLevelJobs','inlineSoloReachAtInstallCases']} for k,v in primary.items()}, 'offlineSeconds':elapsed, 'newNativeCases':0},indent=2))
