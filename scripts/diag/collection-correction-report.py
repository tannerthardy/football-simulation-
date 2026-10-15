"""Audit cached collection continuations and draw their achieved paths; no simulation."""
import gzip
import hashlib
import json
import math
from pathlib import Path

root = Path('data/reviews/current/helper-collection')
reference = Path('data/reviews/current/helper-contact-review/trace.json.gz')
load = lambda p: json.loads(gzip.decompress(p.read_bytes()))
baseline, candidate = load(reference), load(root / 'final-context.json.gz')
physical = lambda s: (s['before']['bodies'], s['requested'], s['after']['bodies'], s['report'])

def match(packet, run):
    return next(r for r in packet['runs'] if (r['mode'], r['scenario']) == (run['mode'], run['scenario']))

def metrics(run):
    helper, owner, defender = [run['initial']['slots'].index(s) for s in ('LG', 'C', 'DT_W')]
    contacts = [c for s in run['steps'] for c in s['report']['contacts'] if {c['i'], c['j']} == {helper, owner}]
    acquired = next((s for s in run['steps'] if s['after']['helperEngagement']), None)
    loaded = next((s for s in run['steps'] if s['after']['helperEngagement'] and
                   math.hypot(s['after']['state']['hands']['normal'], s['after']['state']['hands']['tangent']) > 1e-6), None)
    final = run['final']
    return {'firstAcquisition': acquired['before']['t'] if acquired else None,
            'firstCompletedLoadedStep': loaded['before']['t'] + .05 if loaded else None,
            'censor': final['t'], 'helperEngagement': final['helperEngagement'],
            'helperOwnerImpacts': len(contacts), 'helperOwnerImpulseKgYdPerS': sum(c['impulse'] for c in contacts),
            'hands': final['state']['hands'] if final['helperEngagement'] else None,
            'helper': {k: final['bodies'][helper][k] for k in ('pos', 'vel', 'facing')},
            'defender': {k: final['bodies'][defender][k] for k in ('pos', 'vel', 'facing')},
            'support': final['bodies'][helper]['support']['state'],
            'maximumWorkResidual': max(abs(s['report']['work']['residual']) for s in run['steps'])}

summary = {'acceptedBase': '8c891f4cf887b54297efbbc4c7993ba5e2f318b5',
           'controllerCommit': '3b4ea698819074640626a215bf2f06af2735f25a',
           'controllerSource': 'f22dc431da3e62d1b94a5b156835282b111c4bab2aebf9bfba10f64b4a464a67',
           'lawContextCommit': '961415f459420dd393604eb5f5f59a62ac269f2b',
           'lawContextSource': candidate['source'], 'referenceSource': baseline['source'],
           'historicalComparison': '4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',
           'settings': {'control': {'handContact': 'center', 'groundMovement': 'legacy'},
                        'lawContext': {'handContact': 'patch', 'groundMovement': 'legacy'},
                        'flags': '44 resolved values in launcher receipts; RUN_CONTACT_COMPONENTS=1; active hands off'},
           'referencePacketSha256': hashlib.sha256(reference.read_bytes()).hexdigest(),
           'collection': [], 'nativeControls': [], 'otherControls': []}
for run in candidate['runs']:
    old = match(baseline, run)
    if run['scenario'] in ('under', 'tite'):
        assert run['observerNeutral'] and run['fingerprint'] == old['fingerprint']
        assert run['final']['t'] == 2 and run['final']['phase'] != 'dead'
        summary['nativeControls'].append({'mode': run['mode'], 'scenario': run['scenario'],
                                         'bodiesRequestsMindsRngEventsUnchanged': True, 'liveCensor': 2})
    elif run['mode'] == 'center' or run['scenario'] == 'recovery':
        assert all(physical(a) == physical(b) for a, b in zip(run['steps'], old['steps']))
        summary['otherControls'].append({'mode': run['mode'], 'scenario': run['scenario'],
                                        'unchangedPhysicalRequestsReportsThrough': old['final']['t']})
    else:
        before, after = metrics(old), metrics(run)
        assert before['helperEngagement'] is None and after['helperEngagement'] == 'DT_W'
        assert after['helperOwnerImpacts'] == 0 and after['support'] == 'up'
        assert after['hands']['active'] and after['hands']['distance'] < 1.01
        first = next((a, b) for a, b in zip(run['steps'], old['steps']) if a['requested'] != b['requested'])
        a, b = first
        assert a['before']['bodies'] == b['before']['bodies']
        assert [i for i, (v, w) in enumerate(zip(a['requested'], b['requested'])) if v != w] == [4]
        read = min(run['reads'], key=lambda d: abs(d['t'] - a['before']['t']))
        summary['collection'].append({'side': run['side'], 'before': before, 'candidate': after,
                                      'firstChangedRequestTime': a['before']['t'], 'samePhysicalFork': True,
                                      'originalRequest': b['requested'][4], 'candidateRequest': a['requested'][4],
                                      'entryVelocity': a['before']['bodies'][4]['vel'],
                                      'achievedVelocity': a['after']['bodies'][4]['vel'],
                                      'achievedPosition': a['after']['bodies'][4]['pos'],
                                      'consumedCues': [p for p in read['pictures'] if p['target'] in ('C', 'DT_W')]})
receipts = []
for p in sorted((root / 'receipts').glob('*.json')):
    r = json.loads(p.read_text())
    receipts.append({'path': str(p.relative_to(root)), 'commit': r['commit'], 'source': r['sourceSha256'],
                     'exitCode': r['exitCode'], 'seconds': sum(c['elapsedSeconds'] for c in r['commands'])})
summary['cost'] = {'commands': receipts, 'summedCommandSeconds': sum(r['seconds'] for r in receipts),
                   'fullGames': 0, 'freshRosters': 0, 'broadScreens': 0,
                   'scope': 'Four saved situations and one constructed obstructed geometry. Includes failed compression expectations and rejected variants. Concurrent command times overlap.'}
(root / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
fig, axes = plt.subplots(2, 2, figsize=(10, 8), sharex=True, sharey=True)
for row, side in enumerate((-1, 1)):
    for col, packet in enumerate((baseline, candidate)):
        ax = axes[row, col]
        run = next(r for r in packet['runs'] if r['mode'] == 'patch' and r.get('side') == side and r['scenario'].startswith('loss'))
        frames = [s['after'] for s in run['steps']]
        for idx, color, label in ((4, '#1674b8', 'LG helper'), (3, '#89939a', 'C former owner'), (14, '#bc3540', 'DT_W')):
            points = [f['bodies'][idx]['pos'] for f in frames]
            ax.plot([p['x'] for p in points], [p['y'] for p in points], color=color, lw=2, label=label)
            ax.scatter(points[-1]['x'], points[-1]['y'], color=color, s=65, zorder=3)
            ax.text(points[-1]['x']+.04, points[-1]['y']+.04, label.split()[0], fontsize=8)
        m = metrics(run)
        if m['hands']:
            h, d = m['helper']['pos'], m['defender']['pos']
            ax.plot([h['x'], d['x']], [h['y'], d['y']], color='#bb8d00', lw=3, label='Actual loaded hands')
        ax.set_title(('Existing' if col == 0 else 'Candidate') + f' · side {side:+d}\nC/LG impacts: {m["helperOwnerImpacts"]}; helper load: '+('yes' if m['hands'] else 'no'), fontsize=10)
        ax.grid(alpha=.2); ax.set_aspect('equal'); ax.set_xlim(39.8, 42.6); ax.set_ylim(24.9, 28.5)
        ax.set_xlabel('Upfield x (yd)')
        if col == 0: ax.set_ylabel('Across field y (yd)')
axes[0, 1].legend(loc='lower left', fontsize=8)
fig.suptitle('Achieved collection paths through 3.40 seconds\nControlled loss fixtures; other players parked; not native rushing outcomes', fontsize=12)
fig.tight_layout(rect=(0, 0, 1, .92)); fig.savefig(root / 'comparison.png', dpi=130); plt.close(fig)
manifest = {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(root.rglob('*')) if p.is_file() and p.name != 'sha256.json'}
(root / 'sha256.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'firstLoad': [r['candidate']['firstCompletedLoadedStep'] for r in summary['collection']],
                  'controls': summary['nativeControls'] + summary['otherControls'], 'cost': summary['cost']}, indent=2))
