"""Validate and publish saved run-line audit results; no tracking replay or World steps."""
import argparse
import csv
import gzip
import hashlib
import json
from pathlib import Path
import platform
import subprocess
import time

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from run_line_geometry import measure, normalize

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--input', type=Path, default=Path('out/run-nfl-line-audit'))
parser.add_argument('--out', type=Path, default=Path('docs/reviews/run-nfl-line-audit'))
args = parser.parse_args()
start = time.perf_counter()
audit = json.loads((args.input / 'audit.json').read_text())
sha = lambda b: hashlib.sha256(b).hexdigest()
checks = {}

# Conservation of cohort membership at every slice, including censored plays.
counts = audit['NFL']['cohortCounts']
assert list(counts.values()) == sorted(counts.values(), reverse=True)
for co, n in counts.items():
    if not n:
        assert not audit['NFL']['cohorts'][co]
        continue
    for label, metrics in audit['NFL']['cohorts'][co].items():
        missing = sum(audit['NFL']['censoring'].get(f'{co}|{label}|{reason}', 0)
                      for reason in ['endedOrCensored', 'missingOLTracking'])
        for m, s in metrics.items():
            assert s['n'] + missing == n, (co, label, m)
            assert all(np.isfinite(v) for v in s.values())
            assert all(s[f'p{x}'] <= s[f'p{y}'] for x, y in zip([10,25,50,75,90], [25,50,75,90,95]))
        if label == '0s':
            for m in ['mean_forward', 'mean_abs_lateral', 'max_retreat']:
                assert metrics[m]['mean'] == metrics[m]['p95'] == 0
checks['cohort_counts_censoring_percentile_order_and_snap_origin'] = 'pass'

# The snap-only extension must not change any earlier matched-time result.
first = json.loads((args.input / 'audit-first.json').read_text())
for co, slices in first['NFL']['cohorts'].items():
    for label, metrics in slices.items():
        assert metrics == audit['NFL']['cohorts'][co][label]
for old, new in zip(first['native'], audit['native']):
    for label, observation in old['observations'].items():
        assert observation == new['observations'][label]
checks['existing_common_time_results_unchanged_after_snap_extension'] = 'pass'

# Independently reconnect each native row to its exact saved positions and time.
packet = Path('data/reviews/current/ace-production-observations.json.gz')
assert sha(packet.read_bytes()) == audit['sourcePacketSha256']
saved = json.loads(gzip.decompress(packet.read_bytes()))
early = []
for source, result in zip(saved['panel'], audit['native']):
    assert source['input'] == result['input']
    actors = {a['idx']: a for a in source['actors']}
    ol = [i for i, a in actors.items() if a['slot'] in {'LT','LG','C','RG','RT'}]
    los, by = source['setup']['los'], source['setup']['ballY']
    initial_exact = {i: (a['initialBody']['pos']['x'], a['initialBody']['pos']['y']) for i,a in actors.items()}
    initial = normalize(initial_exact, los, by, 1)
    frames = {}
    for f in source['detailedFrames']:
        for name, t in [('before', f['t']), ('afterBodies', f['after'])]:
            frames[round(t, 8)] = {a['idx']: (a['pos']['x'], a['pos']['y']) for a in f[name]}
    for label, row in result['observations'].items():
        exact = initial_exact if row['t'] == 0 else frames[round(row['t'], 8)]
        assert row['metrics'] == measure(initial, normalize(exact, los, by, 1), ol)
        assert row['t'] < source['summary']['duration']
    f = next(f for f in source['detailedFrames'] if f['t'] == .4)
    assert not f['report']['contacts'], 'Early snapshot must retain its no-torso-contact condition'
    bodies = {a['idx']: a for a in f['before']}
    for i in ol:
        reps = [r for r in f['beforeReps'] if r['blocker'] == i or i in r['helpers']]
        assert not reps, 'Early command inspection requires unloaded, non-helper OL'
        assert not any(p['rep']['blocker'] == i for p in f['contactPhases'])
        early.append({'case': source['input']['id'], 'slot': actors[i]['slot'], 't': .4,
            'behaviorVelocity': f['requested'][i]['vel'], 'worldTargetVelocity': f['delivered'][i]['vel'],
            'actualEntryVelocity': bodies[i]['vel'], 'support': bodies[i]['support']['state'],
            'engagementOrHelper': False,
            'consumedSources': [c for c in f['consumed'] if c['actor'] == i]})
checks['native_exact_saved_snapshots_inputs_no_interpolation'] = 'pass'
checks['early_OL_commands_have_no_saved_engagement_or_helper'] = 'pass'
assert audit['newWorldSteps'] == audit['newSimulationPlays'] == audit['newGames'] == 0

args.out.mkdir(parents=True, exist_ok=True)
(args.out / 'audit.json').write_text(json.dumps(audit, indent=2) + '\n')
(args.out / 'acquisition.json').write_bytes((args.input / 'acquisition.json').read_bytes())
(args.out / 'early-commands.json').write_text(json.dumps(early, indent=2) + '\n')

with (args.out / 'measurements.csv').open('w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['source','cohort_or_case','slice','metric','n','mean_or_observation','p10','p50','p90'])
    for co, slices in audit['NFL']['cohorts'].items():
        for label, metrics in slices.items():
            for metric, s in metrics.items():
                writer.writerow(['NFL',co,label,metric,s['n'],s['mean'],s['p10'],s['p50'],s['p90']])
    for c in audit['native']:
        for label, row in c['observations'].items():
            for metric, v in row['metrics'].items():
                writer.writerow(['saved accepted sim',c['input']['id'],label,metric,1,v,'','',''])

times = audit['operator']['times']
labels = [f'{t:g}s' for t in times]
cohort = audit['NFL']['cohorts']['outsideZoneUnderCenter12']
panels = [
    ('mean_abs_lateral', 'Sideways movement per lineman', 'Mean absolute yards from snap'),
    ('mean_forward', 'Upfield movement per lineman', 'Mean signed yards from snap'),
    ('max_retreat', 'Worst individual retreat', 'Yards backward from snap'),
    ('lateral_span', 'Width of the five-man line', 'Lateral span, yards'),
    ('depth_span', 'Depth spread of the five-man line', 'Upfield span, yards'),
    ('minimum_pair_distance', 'Closest pair of offensive linemen', 'Center distance, yards'),
]
plt.rcParams.update({'font.family':'DejaVu Sans', 'font.size':10, 'axes.spines.top':False,
                    'axes.spines.right':False, 'svg.hashsalt':'run-line-audit-v1'})
fig, axes = plt.subplots(2,3,figsize=(15,8.8))
colors = ['#2463A0','#BD5326','#168172']
names = ['Accepted Y strong', 'Accepted H strong (D01)', 'Accepted H weak']
for ax, (metric,title,ylabel) in zip(axes.flat,panels):
    med = [cohort[t][metric]['p50'] for t in labels]
    lo = [cohort[t][metric]['p10'] for t in labels]
    hi = [cohort[t][metric]['p90'] for t in labels]
    ax.fill_between(times,lo,hi,color='#b4becb',alpha=.35,label='NFL 10th–90th percentiles')
    ax.plot(times,med,color='#303c4b',linewidth=2.5,label='NFL median (34 plays)')
    for c, color, name in zip(audit['native'],colors,names):
        ax.plot(times,[c['observations'][t]['metrics'][metric] for t in labels],
                marker='o',markersize=4,color=color,linewidth=1.7,label=name)
    ax.set(title=title,xlabel='Seconds after snap',ylabel=ylabel,xticks=times)
    ax.grid(alpha=.18);ax.set_axisbelow(True)
fig.suptitle('Wide-zone line movement: sideways flow is the clearest current gap',fontsize=18,x=.055,ha='left',y=.975)
fig.text(.055,.926,'NFL 2022 week 1 · outside-zone / under-center / 12-personnel proxies vs three saved Ace calls on develop a1b16e6',fontsize=11)
handles, legend_labels = axes.flat[0].get_legend_handles_labels()
fig.legend(handles,legend_labels,loc='lower left',bbox_to_anchor=(.045,.033),ncol=5,frameon=False,fontsize=10)
fig.text(.055,.022,'Same position-only operator, rounded 0.1 yd. Bands describe NFL plays, not pass/fail limits. Exact two-attached-TE match: unavailable.',fontsize=9,color='#414955')
fig.subplots_adjust(left=.065,right=.975,top=.87,bottom=.15,hspace=.42,wspace=.30)
for ext in ['png','svg','pdf']:
    fig.savefig(args.out / f'line-position-comparison.{ext}',dpi=170)
plt.close(fig)

receipt = {'protocol':'run-nfl-line-audit-publication-v1',
    'collectorRevision':audit['testedRevision'],
    'publicationToolRevision':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
    'acceptedDevelop':audit['acceptedDevelop'], 'runtimeSourceSha256':audit['runtimeSourceSha256'],
    'settingsAndInputs':'audit.json: settings (all 44 flags, World defaults, original producer) and native[].input',
    'sourcePacketSha256':audit['sourcePacketSha256'], 'operatorSha256':audit['operator']['sha256'],
    'checks':checks,
    'focusedUnitTests':{'revision':'5b2c1a1','command':'python3 -m unittest discover -s test -p test_run_line_geometry_audit.py','passed':5},
    'executionHistory':[
        {'revision':'5b2c1a1','operation':'verified NFL acquisition','seconds':21.33377927800757,'downloadedBytes':150675268},
        {'revision':'5b2c1a1','operation':'first compatible collector, without snap rows','seconds':13.543995489},
        {'revision':'a857809','operation':'snap extension collector','result':'failed: NameError in native support lookup; no output accepted; zero simulation'},
        {'revision':audit['testedRevision'],'operation':'corrected collector with snap rows','seconds':audit['elapsedSeconds']},
    ],
    'python':platform.python_version(),'numpy':np.__version__,'pandas':__import__('pandas').__version__,'matplotlib':matplotlib.__version__,
    'newWorldSteps':0,'newSimulationPlays':0,'newGames':0,
    'productionFilesChanged':False,'awarenessCandidateEvaluated':False,
    'publicationToolSha256':sha(Path(__file__).read_bytes()),
    'publicationSeconds':time.perf_counter()-start,
    'files':{p.name:{'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())}
             for p in args.out.iterdir() if p.is_file() and p.name != 'receipt.json'}}
(args.out / 'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'checks':checks,'publicationSeconds':receipt['publicationSeconds'],
                  'newSimulationPlays':0,'out':str(args.out)}))
