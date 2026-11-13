"""Validate saved strike-repair transfer guards; no simulation or NFL fitting."""
import gzip
import hashlib
import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
OLD = HERE.parent / 'hand-force'


def load(path):
    data = path.read_bytes()
    return json.loads(gzip.decompress(data) if path.suffix == '.gz' else data)


def finite(value):
    if isinstance(value, float):
        assert math.isfinite(value)
    elif isinstance(value, dict):
        for item in value.values():
            finite(item)
    elif isinstance(value, list):
        for item in value:
            finite(item)


def pair(old_name, new_name):
    paths = [OLD / old_name, HERE / new_name]
    reports = [load(path) for path in paths]
    for report in reports:
        finite(report)
        if 'sourceBefore' in report:
            assert report['sourceBefore'] == report['sourceAfter']
    old, new = reports
    for key in ('scriptSha256', 'node'):
        if key in old:
            assert old[key] == new[key], key
    provenance = [{'file': str(path.relative_to(ROOT)),
                   'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                   'source': report.get('sourceBefore', report.get('sourceSha256'))}
                  for path, report in zip(paths, reports)]
    return old, new, provenance


before, after, run_provenance = pair('centered-runs-compact.json.gz', 'current-runs.json.gz')
assert before['cohort'] == after['cohort']
left = {row['id']: row for row in before['trials']}
right = {row['id']: row for row in after['trials']}
assert left.keys() == right.keys() and len(left) == 144
inputs = ('roster', 'run', 'scheme', 'front', 'seed', 'flip', 'rbProfile', 'rbRatings')
assert all(all(left[key][field] == right[key][field] for field in inputs) for key in left)
assert all(row['observerVerified'] is not False for row in after['trials'])
assert after['observerVerifiedCount'] == sum(row['observerVerified'] is True for row in after['trials']) == 7
assert after['summary']['timeouts'] == after['summary']['lowerReachReleases'] == 0
pairs = [{'id': key, 'beforeGain': left[key]['yards'], 'afterGain': right[key]['yards'],
          'gainDelta': right[key]['yards'] - left[key]['yards'],
          'beforeFinish': left[key]['finishCause'], 'afterFinish': right[key]['finishCause']}
         for key in left]
runs = {'provenance': run_provenance, 'matchedInputsProfilesAndTool': True,
        'before': before['summary'], 'after': after['summary'],
        'byConcept': [{'before': a, 'after': b} for a, b in zip(before['byConcept'], after['byConcept'])],
        'identicalGains': sum(row['gainDelta'] == 0 for row in pairs),
        'differentFinishes': sum(row['beforeFinish'] != row['afterFinish'] for row in pairs),
        'largestAbsoluteGainChanges': sorted(pairs, key=lambda row: abs(row['gainDelta']), reverse=True)[:5],
        'observerChecksPerPhase': 7}

before, after, tackle_provenance = pair('current-tackles.json.gz', 'current-tackles.json.gz')
ignored = {'sourceBefore', 'sourceAfter', 'startedAt'}
assert before.keys() == after.keys()
assert all(before[key] == after[key] for key in before if key not in ignored)
tackles = {'provenance': tackle_provenance, 'identicalPayloadExceptTimestampAndSource': True,
           'primary': after['primarySummary'], 'witnesses': after['witnessSummary'],
           'observerChecks': len(after['observerChecks'])}

before, after, hand_provenance = pair('panel-centered.json', 'current-hands.json')
assert before['cohort'] == after['cohort']
assert all(before[key] == after[key] for key in ('summaries', 'redirects', 'frontalApproaches'))
hands = {'provenance': hand_provenance, 'identicalOutcomeAndRefinementRows': True,
         'redirects': len(after['redirects']), 'frontalApproaches': len(after['frontalApproaches']),
         'summaries': after['summaries']}

before, after, game_provenance = pair('centered-games9.json.gz', 'current-games9.json')
for key in ('seed', 'rosterSha256', 'excludedWarmGameSeed', 'gamesOnly'):
    assert before[key] == after[key]
assert [game['seed'] for game in before['games']] == [game['seed'] for game in after['games']]
assert len(after['games']) == 2
assert all(game['physicalTimeoutsIncludingNullified'] == 0 for game in after['games'])
assert after['physics']['lowerHoldReleases'] == after['physics']['maxMotorWorkExcessKgYd2S2'] == 0
games = {'provenance': game_provenance, 'matchedInitialRosterAndSeedsOnly': True,
         'before': before['games'], 'after': after['games'],
         'beforePhysics': before['physics'], 'afterPhysics': after['physics']}

result = {'schema': 'strike-transfer-validation-v1',
          'validatorSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
          'scope': 'Saved paired football regression guards; no resimulation, NFL fit or timing benchmark.',
          'limits': ['Later trajectories, decisions, draws and game calls can diverge.',
                     'Controlled run gains are credited outcomes, not unpenalized physical gain.',
                     'Live encounter inspection limits are censored, not forced misses or timeouts.',
                     'Hand rows retain the preceding repair\'s individual adverse refinement errors.',
                     'Two games and reused geometries do not estimate league means or improvement.'],
          'runs': runs, 'tackles': tackles, 'hands': hands, 'games': games}
finite(result)
(HERE / 'transfer-validation.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'runs': len(pairs), 'tackles': tackles['primary']['encounters'] + tackles['witnesses']['encounters'],
                  'handRedirects': hands['redirects'], 'games': len(after['games']), 'passed': True}))
