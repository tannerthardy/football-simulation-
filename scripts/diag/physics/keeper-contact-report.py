"""Offline reduction of pinned keeper replays; advances zero simulations."""
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path('out/keeper-contact-law')
EVIDENCE = '45a35bbe1b09554e874370604c83df47fca809f6'


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def body(frame, slot):
    return next(b for b in frame['bodies'] if b['slot'] == slot)


def motion(value):
    return {k: value[k] for k in ['pos', 'vel', 'facing', 'spin', 'request', 'intent']}


native = json.loads((ROOT / 'native-final.json').read_text())
mechanical = json.loads((ROOT / 'mechanical-final.json').read_text())
previous_bytes = subprocess.check_output(['git', 'show', f'{EVIDENCE}:docs/reviews/under-center-zone-receipt.json'])
previous = json.loads(previous_bytes)
checks = {name: json.loads((ROOT / f'{name}-final-settings.json').read_text())
          for name in ['mechanical', 'native', 'focused', 'typecheck']}
assert all(r['exitCode'] == 0 and r['inputsUnchanged'] for r in checks.values())
assert len({r['commit'] for r in checks.values()}) == 1
assert len({r['sourceSha256'] for r in checks.values()}) == 1
assert len({json.dumps(r['flags'], sort_keys=True) for r in checks.values()}) == 1
assert mechanical['worldSha256'] == native['worldSha256']
assert hashlib.sha256(Path('src/physics/world.ts').read_bytes()).hexdigest() == native['worldSha256']
assert hashlib.sha256(Path('config/keeper-contact-law.json').read_bytes()).hexdigest() == native['manifestSha256']
assert hashlib.sha256(Path('scripts/diag/physics/keeper-contact-native.ts').read_bytes()).hexdigest() == native['collectorSha256']
assert hashlib.sha256(Path('docs/reviews/under-center-zone-keeper-world-witness.json').read_bytes()).hexdigest() == mechanical['witnessSha256']

rows = []
for play in native['panel']:
    reference, snap, fork = play['arms']
    saved = next(row['default'] for row in previous['rows'] if row['default']['id'] == play['id'])
    history_hash = digest(reference['hashes'])
    assert history_hash == saved['stateRngHistorySha256'], 'Complete baseline state/RNG history must match'
    assert reference['gain'] == saved['gain'] and reference['endTime'] == saved['endTime']
    assert reference['firstContact']['opponent'] == saved['firstOpponent']
    assert digest(reference['initial']) == saved['initialSha256']
    assert digest(reference['profiles']) == saved['profilesSha256']
    assert digest(reference['input']) == saved['inputSha256']
    prefix = play['prefixTicks']
    assert reference['hashes'][:prefix] == fork['hashes'][:prefix]
    keeper, end = ('LT', 'DE_W') if 'weak' in play['id'] else ('RT', 'DE_S')
    arms = []
    for arm in play['arms']:
        first = arm['firstContact']
        contact_frame = next(f for f in arm['frames'] if f['t'] == first['t'])
        contact_index = arm['frames'].index(contact_frame)
        prior = arm['frames'][max(0, contact_index - 1)]
        row = {key: arm[key] for key in ['arm', 'endTime', 'outcome', 'censored', 'crossing', 'gain', 'firstContact', 'limits', 'frozenInputError']}
        row['approach'] = ('ended-unreached' if arm['crossing'] is None else
                           'clean' if first['t'] > arm['crossing'] else
                           'same-step-uncertain' if first['t'] >= arm['crossing'] - .05 - 1e-8 else 'interrupted')
        row['handsAtFirstContact'] = [h for h in contact_frame['hands'] if h['b'] == first['opponent']]
        row['handsBeforeFirstContact'] = [h for h in prior['hands'] if h['b'] == first['opponent']]
        row['deliveredBodyContactAtFirst'] = [c for c in contact_frame['contacts'] if c['delivered'] and
                                             'RB' in [c['a'], c['b']] and first['opponent'] in [c['a'], c['b']]]
        if arm is not reference:
            index = next(i for i, (a, b) in enumerate(zip(reference['hashes'], arm['hashes'])) if a != b)
            a, b = reference['frames'][index], arm['frames'][index]
            row['firstDifference'] = dict(t=a['t'], referenceHandCount=len(a['hands']), candidateHandCount=len(b['hands']),
                                         referenceContactCount=len(a['contacts']), candidateContactCount=len(b['contacts']),
                                         keeperReference=motion(body(a, keeper)), keeperCandidate=motion(body(b, keeper)),
                                         rbReference=motion(body(a, 'RB')), rbCandidate=motion(body(b, 'RB')))
            # Report velocity request differences separately from facing changes.
            requests = [dict(t=a['t'], reference=body(a, keeper)['intent'], candidate=body(b, keeper)['intent'])
                        for a, b in zip(reference['frames'], arm['frames'])
                        if body(a, keeper)['intent']['vel'] != body(b, keeper)['intent']['vel']]
            row['firstKeeperMovementRequestDifference'] = requests[0] if requests else None
            row['gainDifference'] = arm['gain'] - reference['gain']
        arms.append(row)
    rows.append(dict(id=play['id'], historyExact=True, historySha256=history_hash,
                     prefixTicks=prefix, prefixExact=True, arms=arms))

controls = [dict(mode=r['mode'], mirror=r['mirror'], substeps=r['substeps'], clean=r['clean'],
                 angularChange=r['angularChange'], linearResidual=r['linearResidual'],
                 workResidual=max(abs(q['work']['residual']) for q in r['reports'])) for r in mechanical['controls']]
assert all(r['clean'] for r in controls)
assert all(abs(r['angularChange']) < 1e-8 for r in controls if r['mode'] == 'patch')
interval = {}
for mode, result in mechanical['native'].items():
    interval[mode] = dict(bodies=[{k: b[k] for k in ['pos', 'vel', 'facing', 'spin']} for b in result['bodies']],
                          joints=result['joints'], work=result['reports'][0]['work'], contacts=result['reports'][0]['contacts'])
costs = {p.name: dict(seconds=sum(c['elapsedSeconds'] for c in json.loads(p.read_text())['commands']),
                      exitCode=json.loads(p.read_text())['exitCode']) for p in ROOT.glob('*settings.json')}
receipt = dict(protocol='keeper-contact-law-review-v1', testedCommit=checks['native']['commit'],
               comparisonCommit=native['comparisonCommit'], sourceSha256=checks['native']['sourceSha256'],
               worldSha256=native['worldSha256'], witnessSha256=mechanical['witnessSha256'],
               previousEvidenceCommit=EVIDENCE, previousReceiptSha256=hashlib.sha256(previous_bytes).hexdigest(),
               manifest=json.loads(Path('config/keeper-contact-law.json').read_text()),
               collectorSha256=native['collectorSha256'],
               reducerSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
               rawSha256={name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
                          for name in ['native-final.json', 'mechanical-final.json']},
               flags=checks['native']['flags'],
               settings={name: {k: v for k, v in check.items() if k != 'flags'} for name, check in checks.items()},
               nativeMaximumError=mechanical['nativeMaximumError'], focusedTestsPassed=68,
               mechanicalControls=controls, nativeInterval=interval, rows=rows,
               commandCosts=costs, totalRecordedCommandSeconds=sum(c['seconds'] for c in costs.values()),
               correctedDiagnosticTypeErrors=['Flat hand packet was not typed as a HandJoint before revival.',
                                               'Rounded event position is optional; exact firstContactX is now reported separately.'],
               scope='No runtime/default/law/capacity change; existing patch diagnosis only. 68 focused tests/typecheck; no new full suite or games.',
               retainedFailures='Nine historical patch-gate failures remain separate, as pinned in PR #7; not rerun or reclassified here.',
               limitations=['Three reused football inputs, not an outcome sample.',
                            'The full patch also changes ground facing, torso ordering and grasp laws; endpoint causation is not isolated.',
                            'The weak fork at 2.40 is after its first contact, so it cannot establish protection improvement.',
                            'Contacts are tick-boundary observations: body impulses, acquired grasps and mere proximity remain distinct.',
                            'The saved successful first opponent is CB_S; prose claiming SS disagrees with its own saved receipt.'])
destination = Path('data/reviews/current/keeper-contact-law.json')
destination.write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(dict(saved=str(destination), bytes=destination.stat().st_size,
                      nativeMaximumError=receipt['nativeMaximumError'], rows=len(rows),
                      allHistoriesExact=True, totalRecordedCommandSeconds=sum(c['seconds'] for c in costs.values()))))
