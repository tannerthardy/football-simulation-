"""Compare the six declared native passing inputs; never imports the engine."""
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
paths = {name: ROOT / filename for name, filename in {
    'baseline': 'baseline-enriched.json.gz', 'component': 'component-enriched.json.gz',
    'final': 'final-promoted.json.gz'}.items()}
phases = {name: json.load(gzip.open(path, 'rt')) for name, path in paths.items()}
assert len({p['toolSha256'] for p in phases.values()}) == 1
sha = lambda value: hashlib.sha256(json.dumps(value, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()
rows = []
for baseline, component, final in zip(*(phases[name]['rows'] for name in ['baseline', 'component', 'final'])):
    assert baseline['id'] == component['id'] == final['id']
    for key in ['setup', 'profilesSha256', 'physicalInitial', 'initialRng', 'offAlign', 'players']:
        assert baseline[key] == component[key] == final[key], (baseline['id'], key)
    for phase in [baseline, component, final]:
        assert phase['observerVerified'] and phase['executionSha256'] == phase['plainExecutionSha256']
        assert phase['nextRng'] == phase['plainNextRng']
    assert baseline['baselineRetainedExecutionVerified']
    assert component['executionSha256'] == final['executionSha256']
    requests = None
    movement = None
    for old, new in zip(baseline['steps'], final['steps']):
        assert old['t'] == new['t']
        if requests is None and old['intents'] != new['intents']:
            changed = [i for i, (a, b) in enumerate(zip(old['intents'], new['intents'])) if a != b]
            requests = {'t': old['t'], 'players': [{
                'idx': i, 'slot': old['agents'][i]['slot'], 'oldRequest': old['intents'][i],
                'newRequest': new['intents'][i], 'bodyAtForkIdentical': all(old['agents'][i][k] == new['agents'][i][k]
                    for k in ['position', 'velocity', 'facing', 'support', 'read']),
                'oldTarget': old['agents'][i]['target'], 'newTarget': new['agents'][i]['target'],
                'body': {k: old['agents'][i][k] for k in ['position', 'velocity', 'facing', 'read']}} for i in changed]}
        if movement is None:
            changed = [i for i, (a, b) in enumerate(zip(old['agents'], new['agents'])) if a['position'] != b['position']]
            if changed:
                movement = {'t': old['t'], 'players': [{'idx': i, 'slot': old['agents'][i]['slot'],
                    'old': old['agents'][i]['position'], 'new': new['agents'][i]['position']} for i in changed]}
        if requests is not None and movement is not None:
            break
    important = {'throw', 'catch', 'interception', 'carrier_contact', 'tackle_wrap', 'broken_tackle', 'missed_tackle',
                 'fall', 'tackle', 'touchdown'}
    row = {'id': baseline['id'], 'initialProfilesBodiesMindsAndRngExact': True,
        'observerPlainVerifiedAllPhases': True, 'componentFinalExecutionExact': True,
        'baselineFinalExecutionExact': baseline['executionSha256'] == final['executionSha256'],
        'firstRequest': requests, 'firstMovement': movement,
        'outcomes': {name: {key: phase['result'].get(key) for key in ['outcome', 'offenseYards', 'duration', 'stats', 'penalty']}
            for name, phase in [('baseline', baseline), ('component', component), ('final', final)]},
        'events': {name: [e for e in phase['result']['events'] if e['type'] in important]
            for name, phase in [('baseline', baseline), ('final', final)]}}
    if baseline['id'] == 'DA-R2-curl_flat-cover3-R':
        row['firstConsumedPictures'] = [p for p in final['pictures'] if p['t'] == requests['t'] and p['a'] == 19 and p['b'] in [8, 10]]
        row['actualChoices'] = [d for d in final['result']['telemetry']['decisions'] if d['kind'] == 'coverage-flat-expand']
        row['tackleLifecycle'] = []
        for frame in final['result']['telemetry']['frames']:
            tackle = frame.get('tackle')
            if tackle:
                row['tackleLifecycle'].append({'t': frame['t'], 'tackle': tackle,
                    'carrierSupport': frame['agents'][tackle['carrier']]['body'],
                    'tacklerSupport': [{'idx': t['a'], 'support': frame['agents'][t['a']]['body']} for t in tackle['tacklers']]})
    rows.append(row)
receipt = {'schema': 'passing-flat-component-comparison-v1',
    'sources': {name: p['sourceBefore'] for name, p in phases.items()},
    'toolSha256': phases['final']['toolSha256'],
    'artifacts': {name: {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        'bytes': path.stat().st_size} for name, path in paths.items()},
    'sameCohortAndInitialProfilesBodiesMindsRng': True, 'observerPlainVerified': 18,
    'componentFinalExecutionExact': 6, 'baselineFinalExecutionExact': sum(r['baselineFinalExecutionExact'] for r in rows),
    'limits': ['Retrospective six-input diagnosis, not a representative NFL call frequency or fresh population estimate.',
        'Same starting generated players; correct curl-flat responsibility can leave the curl open and alter QB target choice.',
        'Inherited generic QB-eyes identity and current QB position remain authoritative shortcuts; no new gaze/occlusion model.',
        'First divergent acquired cue/request and actual solved motion shown; no claim of same hidden state after divergent choices.',
        'No shared-physics, capability, force/grip budget or resolution change.'], 'rows': rows}
(ROOT / 'comparison.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps({k: receipt[k] for k in ['sources', 'observerPlainVerified', 'componentFinalExecutionExact', 'baselineFinalExecutionExact']}, indent=2))
