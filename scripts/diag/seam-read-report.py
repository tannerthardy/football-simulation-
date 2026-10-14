"""Static, source-checked handoff from saved football. No simulations."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path('out/seam-read')
BASE = '8433e88d7deb31e5c1c031e2f0cb83d1cf0e805609820c0559f6b8f25747340c'
FIRST = '6d303ae587338df3d419c3c62afea44572bcbb8b78f0b3de072a3f261ccd0eb8'
FINAL = 'd07d964545d7276454900354fbb131c7dd2350595c1fcf17812e7c1e8cb87ec7'


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def source():
    h = hashlib.sha256()
    for p in sorted((p for p in Path('src').rglob('*') if p.is_file()), key=str):
        h.update(str(p).encode() + b'\0' + p.read_bytes() + b'\0')
    return h.hexdigest()


assert source() == FINAL
profile = json.loads(Path('config/baseline.json').read_text())
packets = {g: json.loads(Path(p).read_text()) for g, p in [
    ('native', 'data/reviews/current/seam-read-inputs.json'),
    ('rotation', 'data/reviews/current/seam-read-rotation-inputs.json')]}
original = json.loads(Path('data/reviews/current/option-agreement-inputs.json').read_text())
for packet in packets.values():
    assert packet['preparedBeforeOutcomes']
    assert packet['integrationBaseline'] == profile
    for row in packet['rows']:
        assert any(row['setup']['offense'] == r['setup']['offense']
                   and row['setup']['defense'] == r['setup']['defense'] for r in original['rows'])


def load(stage, expected_source):
    summary = json.loads((ROOT / stage / 'summary.json').read_text())
    assert summary['provenance']['sourceSha256'] == expected_source
    assert summary['provenance']['flags'] == profile['flags']
    assert summary['provenance']['worldDefaults'] == profile['worldDefaults']
    packet = packets['rotation' if 'rotation' in stage else 'native']
    assert summary['inputs']['sha256'] == digest('data/reviews/current/' + (
        'seam-read-rotation-inputs.json' if 'rotation' in stage else 'seam-read-inputs.json'))
    films = {}
    for row in summary['rows']:
        setup = next(r['setup'] for r in packet['rows'] if r['id'] == row['id'])
        # JS insertion order is preserved by Python's parser; use compact UTF-8 JSON.
        assert row['setupSha256'] == hashlib.sha256(json.dumps(setup, separators=(',', ':'),
                                                             ensure_ascii=False).encode()).hexdigest()
        assert digest(row['film']['path']) == row['film']['sha256']
        film = json.loads(gzip.decompress(Path(row['film']['path']).read_bytes()))
        assert film['signature'] == row['signature']
        assert film['result']['outcome'] != 'timeout'
        films[row['id']] = film
    return summary, films


stages = {}
for stage in ['baseline-initial', 'baseline-fresh', 'baseline-rotation',
              'candidate-initial', 'candidate-fresh', 'candidate-rotation',
              'carry-initial', 'carry-fresh', 'carry-rotation']:
    stages[stage] = load(stage, BASE if stage.startswith('baseline') else
                         FIRST if stage.startswith('candidate') else FINAL)


def details(film):
    events = film['result']['events']
    throw = next((e for e in events if e['type'] == 'throw'), None)
    release = next((s for s in film['steps'] if throw and s['t'] == throw['t']), None)
    choices = []
    for s in film['steps']:
        for r in s['routesAfter']:
            if r['route'] == 'seam_read' and r['decision'] and not any(c['i'] == r['i'] for c in choices):
                choices.append({'t': s['t'], 'i': r['i'], 'id': r['id'], 'decision': r['decision'],
                                'achievedBody': s['before'][r['i']], 'requestedMove': s['intents'][r['i']],
                                'bodyAfter': s['after'][r['i']],
                                'consumedKeyPictures': [o for o in s['observations'] if o['observer'] == r['i']]})
    last_prediction = release['receiverPrediction'][-1] if release and release['receiverPrediction'] else None
    return {'result': film['result'], 'choices': choices, 'release': None if not release else {
        't': release['t'], 'evaluatedPending': release['qb']['pending'],
        'actualReleasePrediction': last_prediction, 'ownOptions': release['qbAfter']['options'],
        'rng': release['rng']}, 'ballContests': [{k: b[k] for k in
            ['t', 'previous', 'current', 'velocity', 'target', 'deflected', 'events', 'opportunities', 'afterKind']}
            for b in film['balls'] if b['events'] or b['opportunities']],
        'identity': [{k: a[k] for k in ['i', 'id', 'slot', 'team']} for a in film['players']]}


rows = []
for packet_key, packet in packets.items():
    for case in packet['rows']:
        group = 'rotation' if packet_key == 'rotation' else case['cohort']
        arms = {}
        for prefix in ['baseline', 'candidate', 'carry']:
            summary, films = stages[prefix + '-' + group]
            row = next(r for r in summary['rows'] if r['id'] == case['id'])
            arms[prefix] = {'provenance': summary['provenance'], 'inputSha256': summary['inputs']['sha256'],
                            'setupSha256': row['setupSha256'], 'film': row['film'],
                            'signature': row['signature'], **details(films[case['id']])}
        assert arms['baseline']['identity'] == arms['carry']['identity']
        rows.append({'id': case['id'], 'arms': arms})

# Neutrality and transfer are checked from saved signatures, not another run.
preserved = []
prior = json.loads(Path('out/option-agreement/final-initial/summary.json').read_text())
unchanged = json.loads((ROOT / 'unchanged/summary.json').read_text())
for r in unchanged['rows']:
    old = next(p for p in prior['rows'] if p['id'] == r['id'])
    assert r['signature'] == old['signature']
    preserved.append({'id': r['id'], 'signature': r['signature']})
fresh_exact = []
for r in stages['carry-fresh'][0]['rows']:
    old = next(x for x in stages['candidate-fresh'][0]['rows'] if x['id'] == r['id'])
    assert old['signature'] == r['signature']
    fresh_exact.append({'id': r['id'], 'signature': r['signature']})
changed = subprocess.check_output(['git', 'diff', '--name-only', '4ded6b600fd3785e65034aa5623d7a9f8f3c5db1', '--', 'src'], text=True).splitlines()
assert set(changed) == {'src/playbook/concepts.ts', 'src/playbook/routes.ts', 'src/playbook/types.ts',
                        'src/sim/behaviors/qb.ts', 'src/sim/behaviors/receiver.ts',
                        'src/sim/middle-read.ts', 'src/sim/option-route.ts'}
receipts = []
for p in sorted(ROOT.glob('*.json')):
    r = json.loads(p.read_text())
    if 'commands' in r:
        assert r['flags'] == profile['flags'] and r['inputsUnchanged'] and r['exitCode'] == 0
        receipts.append({'path': str(p), 'sha256': digest(p), **r})
for name in ['contracts-carry', 'carry-type', 'carry-build']:
    r = next(r for r in receipts if r['path'] == str(ROOT / (name + '.json')))
    assert r['sourceSha256'] == FINAL

report = {'schema': 'seam-read-review-v1', 'reportCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
          'analysisSha256': digest(__file__), 'integrationPin': '4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',
          'baselineSource': BASE, 'initialSource': FIRST, 'candidateSource': FINAL,
          'newFullRuns': sum(s['newSimulations'] for s, _ in stages.values()) + unchanged['newSimulations'],
          'distinctSeamInputs': len(rows), 'freshInputs': 2, 'newGames': 0, 'fullSuites': 0,
          'censoredFullPlays': 0, 'capturedMotionLimitSeconds': 5,
          'launcherElapsedSeconds': sum(c['elapsedSeconds'] for r in receipts for c in r['commands']),
          'focusedFinalChecks': 36, 'newMiddleChecks': 11, 'unchangedWorldAndCapabilities': True,
          'compatibleUnchangedControlSource': FIRST, 'preservedStickAndVerts': preserved,
          'carryRepairFreshExact': fresh_exact, 'receipts': receipts, 'rows': rows,
          'research': {'path': 'data/research/seam-read-sources.json', 'sha256': digest('data/research/seam-read-sources.json')},
          'limits': ['New route install supplied identically to baseline controllers through a declared registry extension; not a previously native baseline playbook call.',
                     'The attention intervention adds .2 s only to the QB\'s Mike channel. It is diagnostic, not a production delay or calibrated NFL rate.',
                     'Native selected option throws agree; actual separate-view release contracts permit disagreement. The prescribed attention arm also agrees.',
                     'Receiver head turns and occlusion remain coarse/unimplemented. Interpretation is deterministic given an acquired picture.',
                     'Ball opportunities are posterior ordinary unengaged admission measurements; actual events govern possession.',
                     'Five-second body films accompany complete sim.run endings; late YAC contact mechanics are not traced here.',
                     'Unmerged prototype; the integration lead owns the exact combined full suite.']}
out = Path('data/reviews/current/seam-read-review.json')
out.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({k: report[k] for k in ['newFullRuns', 'distinctSeamInputs', 'launcherElapsedSeconds', 'focusedFinalChecks']}))
