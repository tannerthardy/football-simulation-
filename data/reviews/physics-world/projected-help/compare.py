"""Compare fixed saved coverage panels without resimulation or outcome fitting."""
import collections
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
# Reuse the published endpoint definitions: live censors and defensive returns
# never acquire an imputed offensive gain. The manifest pins this dependency.
spec = importlib.util.spec_from_file_location('endpoint_definitions', HERE.parent / 'visible-help/compare.py')
endpoints = importlib.util.module_from_spec(spec)
spec.loader.exec_module(endpoints)


def load(path):
    return json.loads(gzip.decompress(path.read_bytes()))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def execution(context):
    # Keep requests, bodies, joints, events, ball, stats and random stream;
    # exclude only controller beliefs and memory, reported separately.
    return {key: value if key != 'agents' else [
        {field: a[field] for field in ('idx', 'slot', 'team', 'body', 'stance',
                                     'engagement', 'shedBy', 'downUntil')}
        for a in value] for key, value in context.items()
        if key not in ('perception', 'qbMind')}


reports = [load(HERE / f'panel-{phase}.json.gz') for phase in ('before', 'after')]
before, after = reports
assert [p['capModel'] for p in reports] == ['legacy-spacing', 'projected-motion']
for key in ('toolSha256', 'sourceVersionToolSha256', 'inputSha256', 'profilesSha256', 'inputs', 'inspectionSeconds'):
    assert before[key] == after[key], key
assert all(len(p['rows']) == len(p['observerNeutrality']) == 24 for p in reports)
assert all(c['initial'] and c['final'] and c['observedSignature'] == c['plainSignature']
           for p in reports for c in p['observerNeutrality'])
pairs = []
for b, a in zip(before['rows'], after['rows']):
    assert b['id'] == a['id'] and b['input'] == a['input'] and b['players'] == a['players']
    assert b['initialContext'] == a['initialContext']
    old, new = [endpoints.decision_map(row) for row in (b, a)]
    changes, cap_changes = [], []
    added = sorted(new.keys() - old.keys())
    removed = sorted(old.keys() - new.keys())
    for key in sorted(old.keys() & new.keys()):
        x, y = old[key], new[key]
        if x['chosen'] != y['chosen'] or x['reason'] != y['reason']:
            changes.append({'t': key[0], 'observer': x['slot'],
                            'before': {k: x[k] for k in ('chosen', 'reason')},
                            'after': {k: y[k] for k in ('chosen', 'reason')}})
        def queries(d):
            counts = collections.Counter()
            indexed = {}
            for q in d['queries']:
                n = counts[q['key']]; counts[q['key']] += 1
                indexed[(q['key'], n)] = q
            return indexed
        qx, qy = queries(x), queries(y)
        for qkey in sorted(qx.keys() & qy.keys()):
            p, q = qx[qkey], qy[qkey]
            if p['accepted'] != q['accepted']:
                cap_changes.append({'t': key[0], 'observer': x['slot'], 'key': qkey,
                                    'before': p, 'after': q})
    pairs.append({'id': b['id'], 'input': b['input'], 'initialContextMatches': True,
                  'fullEndpointContextIdentical': b['endpointContext'] == a['endpointContext'],
                  'executionIdentical': execution(b['endpointContext']) == execution(a['endpointContext']),
                  'before': endpoints.anatomy(b), 'after': endpoints.anatomy(a),
                  'matchedDirectiveChanges': changes, 'matchedCapAcceptanceChanges': cap_changes,
                  'addedQueryBearingRecords': added, 'removedQueryBearingRecords': removed})
phases = []
for name, report in zip(('before', 'after'), reports):
    candidates = [c for r in report['rows'] for d in r['decisions'] for q in d['queries'] for c in q['candidates']]
    phases.append({'phase': name, 'sourceSha256': report['sourceSha256'], 'capModel': report['capModel'],
                   'rawSha256': sha(HERE / f'panel-{name}.json.gz'), 'summary': report['summary'],
                   'football': endpoints.totals(report['rows']),
                   'acceptedFarCandidateQueries': sum(c['accepted'] and c['depth'] >= 6 for c in candidates),
                   'legacyEligibleRejectedQueries': sum(c['geometryMatches'] and not c['accepted'] for c in candidates)})
result = {'schema': 'projected-help-comparison-v1', 'validatorSha256': sha(Path(__file__)),
          'endpointDefinitionsSha256': sha(HERE.parent / 'visible-help/compare.py'),
          'collectorSha256': before['toolSha256'], 'phases': phases, 'pairs': pairs,
          'identicalInitialContexts': 24,
          'identicalFullEndpointContexts': sum(p['fullEndpointContextIdentical'] for p in pairs),
          'identicalExecutions': sum(p['executionIdentical'] for p in pairs),
          'matchedDirectiveChanges': sum(len(p['matchedDirectiveChanges']) for p in pairs),
          'limits': [
              'Repeated cap queries and query-bearing records are not independent decisions, plays or bust rates.',
              'Matched cap acceptance changes can follow divergent earlier motion; all consumed pictures are retained.',
              'Only natural offensive endpoints have a field advance; these are not official credited game yards.',
              'Two generated roster pairs, fixed calls and a single play seed are mechanics guards, not NFL population estimates.',
              'Near persistence is an imperfect short kinematic guess, not a teammate assignment or future physical execution; distant help remains unestablished.',
          ]}
(HERE / 'comparison.json').write_text(json.dumps(result, separators=(',', ':')) + '\n')
print(json.dumps({k: result[k] for k in ('identicalInitialContexts', 'identicalFullEndpointContexts',
                                      'identicalExecutions', 'matchedDirectiveChanges')}, indent=2))
