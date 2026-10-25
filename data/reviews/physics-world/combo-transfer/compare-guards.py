"""Compare saved unchanged-input guards; no simulation or NFL fitting.

Run from the repository root:
python3 data/reviews/physics-world/combo-transfer/compare-guards.py
"""
import gzip
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
BEFORE = HERE.parent / 'zone-reach'
BEFORE_SOURCE = 'cf53e3f0e72915d9798ed0cd411f669ae8bba40db9ed4bd9f6b630173f939316'
AFTER_SOURCE = 'ff641a802030edddaa1eac42b8d0991b4cba43dd9f4fa0f3ef45ee3dd3bcfbac'


def load(path):
    raw = path.read_bytes()
    return json.loads(gzip.decompress(raw) if path.suffix == '.gz' else raw)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


panels = {}
inputs = {}
for name in ['current-runs.json.gz', 'current-tackles.json.gz', 'current-games9.json']:
    b, a = (load(folder / name) for folder in (BEFORE, HERE))
    assert b['sourceBefore'] == b['sourceAfter'] == BEFORE_SOURCE
    assert a['sourceBefore'] == a['sourceAfter'] == AFTER_SOURCE
    assert b['scriptSha256'] == a['scriptSha256']
    panels[name] = (b, a)
    for folder in (BEFORE, HERE):
        path = folder / name
        inputs[str(path.relative_to(ROOT))] = sha(path)

b, a = panels['current-runs.json.gz']
assert b['cohort'] == a['cohort'] and len(b['trials']) == len(a['trials']) == 144
pairs = []
for old, new in zip(b['trials'], a['trials']):
    assert all(old[k] == new[k] for k in ['id', 'roster', 'run', 'scheme', 'front', 'seed', 'flip', 'rbProfile', 'rbRatings'])
    pairs.append({'id': old['id'], 'run': old['run'], 'front': old['front'],
                  'beforeYards': old['yards'], 'afterYards': new['yards'],
                  'yardsDelta': new['yards'] - old['yards'], 'exactSavedTrial': old == new})
run = {'before': b['summary'], 'after': a['summary'],
       'matchedInputPairs': len(pairs), 'exactSavedTrials': sum(p['exactSavedTrial'] for p in pairs),
       'observerPlainChecksPerPhase': [b['observerVerifiedCount'], a['observerVerifiedCount']],
       'byConcept': {'before': b['byConcept'], 'after': a['byConcept']},
       'pairedResults': pairs, 'adverse2YardPairs': [p for p in pairs if p['yardsDelta'] <= -2]}

b, a = panels['current-tackles.json.gz']
for key in ['inputSha256', 'cohortSha256', 'profilesSha256', 'primaryInputs', 'witnessInputs']:
    assert b[key] == a[key]
assert b['primary'] == a['primary'] and b['witnesses'] == a['witnesses']
tackles = {'exactSavedEncounters': len(a['primary']) + len(a['witnesses']),
           'observerPlainChecksPerPhase': [len(b['observerChecks']), len(a['observerChecks'])],
           'primary': a['primarySummary'], 'witnesses': a['witnessSummary'], 'mirrors': a['mirrors']}

b, a = panels['current-games9.json']
assert b['rosterSha256'] == a['rosterSha256'] and b['seed'] == a['seed'] == 9
assert [g['seed'] for g in b['games']] == [g['seed'] for g in a['games']] and len(a['games']) == 2
game_fields = ['seed', 'score', 'officialScrimmagePlays', 'physicalTimeoutsIncludingNullified',
               'rushes', 'rushYardsPerAttempt', 'rushStuffs', 'rushExplosives10', 'dropbacks',
               'passAttempts', 'completions', 'completionYards', 'sacks', 'interceptions']
physics_fields = ['ticks', 'lowerJointTicks', 'maxMomentumResidualKgYdS', 'maxWorkResidualKgYd2S2',
                  'maxMotorWorkExcessKgYd2S2', 'maxPassiveGripPositiveWorkKgYd2S2']
games = {phase: {'games': [{k: g[k] for k in game_fields} for g in p['games']],
                 'physics': {k: p['physics'][k] for k in physics_fields}}
         for phase, p in [('before', b), ('after', a)]}

report = {'schema': 'combo-transfer-guards-v1', 'toolSha256': sha(Path(__file__)), 'inputs': inputs,
          'sources': {'before': BEFORE_SOURCE, 'after': AFTER_SOURCE},
          'runs': run, 'tackles': tackles, 'games': games,
          'limitations': ['The run guard verifies seven observed/plain controls per phase, unlike the separate fully verified 162-input panel.',
                          'Game paths and subsequent calls diverge; two games are regression guards, not a league estimate or isolated pass-effect experiment.',
                          'Concurrent diagnostic wall times are not a cost benchmark. World code and resolution are unchanged.']}
(HERE / 'guard-comparison.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'runs': {k: run[k] for k in ['matchedInputPairs', 'exactSavedTrials', 'observerPlainChecksPerPhase']},
                  'tackles': tackles['exactSavedEncounters'], 'games': len(a['games'])}, indent=2))
