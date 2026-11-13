"""Summarize the native read-information probe; detailed evidence stays in out/."""
import collections
import hashlib
import json
import math
from pathlib import Path
import statistics
import sys


def distance(a, b):
    return math.hypot(a['x'] - b['x'], a['y'] - b['y'])


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else 'out/run-read-information')
    output = Path(sys.argv[2] if len(sys.argv) > 2 else 'data/reviews/run-read-information/summary.json')
    panels = {}
    receipts = {}
    for flow in ['current', 'hold', 'over']:
        for mode in ['off', 'on']:
            path = root / f'{flow}-{mode}.json'
            if not path.exists():
                continue
            raw = path.read_bytes()
            receipt = json.loads(raw)
            panels[f'{flow}-{mode}'] = receipt['panel']
            receipts[path.name] = {'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)}
            assert all(p['observerNeutral'] for p in receipt['panel'])
    off = panels['current-off']
    on = panels['current-on']
    assert len(off) == len(on) == 96
    rows = []
    for old, p in zip(off, on):
        assert old['input'] == p['input']
        d = p['decision']
        branches = p['branches']
        selected = p.get('selected')
        labels = []
        row = {'input': p['input'], 'offGain': old['gain'], 'onGain': p['gain'], 'delta': p['gain'] - old['gain'],
               'offCensored': old['censored'], 'onCensored': p['censored'], 'handoffAt': p['handoffAt'],
               'offOutcome': old.get('outcome'), 'onOutcome': p.get('outcome'),
               'offFumble': any(e['type'] == 'fumble' for e in old.get('events', [])),
               'onFumble': any(e['type'] == 'fumble' for e in p.get('events', [])),
               'nominalMesh': p['mesh']['nominalTime'], 'firstReachableMesh': p['firstReachableMesh'],
               'labels': labels, 'primary': 'unresolved', 'answer': d['answer'] if d else None}
        # Matching bodies and handoff means late mesh is a common constraint,
        # not an established incremental effect of the read.
        row['sameHandoff'] = p['handoffAt'] == old['handoffAt']
        same_mesh = all(a['pos'] == b['pos'] and a['vel'] == b['vel']
                        for a, b in zip(p['path'], old['path']) if a['t'] <= p['handoffAt'])
        row['sameMeshPath'] = same_mesh
        if p['handoffAt'] > p['mesh']['nominalTime'] + .2:
            labels.append('late mesh exposure (common constraint)')
        if d:
            reads = [e for e in p['observations'] if e['phase'] == 'read' and e['t'] <= d['t']]
            acquired = reads[0]
            slots = {a['id']: a['slot'] for a in p['players']}
            dl_takeovers = [e for e in reads if e['physicalKey'] is not None and e['physicalKey'] != e['key']
                            and slots[e['physicalKey']].startswith('D') and slots[e['key']].startswith('D')
                            and e['keyBody']['pos']['x'] - 40 < 2]
            row.update({'acquiredKey': acquired['key'], 'key': d['key'], 'candidateKey': d['candidateKey'],
                        'physicalKey': d['physicalKey'], 'blocker': d['blocker'], 'actualBlock': d['actualBlock'],
                        'acquiredKeySlot': slots[acquired['key']], 'keySlot': slots[d['key']],
                        'candidateKeySlot': slots.get(d['candidateKey']), 'physicalKeySlot': slots.get(d['physicalKey']),
                        'blockerSlot': slots.get(d['blocker']),
                        'leverage': d['leverage'], 'actualLeverage': d['actualLeverage'],
                        'actualProjectedLeverage': d['actualProjectedLeverage'], 'keySeenAge': d['keySeen'].get('age'),
                        'why': d['why'], 'decisionAt': d['t'], 'decisionPosition': d['pos'],
                        'entries': d['entries'], 'expectedEntry': d['entry'], 'risks': d['risks'],
                        'prefix': d['prefix'], 'heldPastCandidateChange': any(e['candidateKey'] != e['key'] for e in reads),
                        'initialBond': d.get('initialBond', []), 'lastOpposingContacts': d.get('lastOpposingContacts', []),
                        'heldPastPhysicalChange': any(e['physicalKey'] != e['key'] for e in reads),
                        'physicalKeyChanged': len({e['physicalKey'] for e in reads}) > 1,
                        'heldThroughLateralDLTakeover': bool(dl_takeovers),
                        'lateralDLTakeoverBeats': [{'t': e['t'], 'held': e['key'], 'current': e['physicalKey'],
                                                    'heldPosition': e['keyBody']['pos']} for e in dl_takeovers],
                        'contactPreviouslyReported': any(e['contactReported'] for e in d['actualBlock']),
                        'loadedBlockAtDecision': any(abs((e.get('hands') or {}).get('normalForce', 0)) + abs((e.get('hands') or {}).get('tangentForce', 0)) > 1 for e in d['actualBlock']),
                        'leverageSignDisagrees': d['actualProjectedLeverage'] is not None and d['leverage'] * d['actualProjectedLeverage'] < 0})
            first_ordinary_aim = next((e for e in old['observations'] if e['phase'] == 'aim'), None)
            row['ordinaryFirstAimAt'] = first_ordinary_aim['t'] if first_ordinary_aim else None
            row['pressAfterOrdinaryAim'] = first_ordinary_aim is not None and first_ordinary_aim['t'] < d['t']
            start = next((e for e in p['observations'] if e['phase'] == 'carrier-start' and e['t'] == d['t']), None)
            row['cachedDesignedAtCommit'] = start['designed'] if start else None
            row['selectedEntry'] = selected['selected'] if selected else None
            row['selectedAt'] = selected['t'] if selected else None
            row['selectionDelay'] = selected['t'] - d['t'] if selected else None
            row['entryDifference'] = distance(d['entry'], selected['selected']) if selected else None
            row['plannerLateralOverride'] = abs(selected['selected']['y'] - selected['preferred']) if selected else None
            rb_id = next(a['id'] for a in p['players'] if a['slot'] == 'RB')
            actual_arrival = next((q['t'] for q in p['path'] if q['t'] > d['t'] and q.get('carrier') == rb_id and distance(q['pos'], d['entry']) <= .65), None)
            selected_arrival = next((q['t'] for q in p['path'] if selected and q['t'] > selected['t'] and q.get('carrier') == rb_id and distance(q['pos'], selected['selected']) <= .65), None)
            row['actualExpectedArrival'] = actual_arrival
            row['actualSelectedArrival'] = selected_arrival
            row['actualFirstContact'] = p['firstContact']
            actual_clean = actual_arrival is not None and not row['initialBond'] and (not p['firstContact'] or actual_arrival <= p['firstContact']['t'])
            row['actualExpectedClean'] = actual_clean
            row['branches'] = {}
            for name, b in branches.items():
                assert b['branch']['prefixVerified'] and b['branch']['prefix'] == d['prefix']
                row['branches'][name] = {**b['branch'], 'gain': b['gain'], 'censored': b['censored'], 'firstContact': b['firstContact']}
            chosen = branches.get(d['answer'])
            alternate_clean = [name for name in ['bounce', 'bang', 'bend'] if name != d['answer'] and branches.get(name, {}).get('branch', {}).get('clean')]
            row['alternativeClean'] = alternate_clean
            if chosen:
                bc = chosen['branch']
                sb = branches.get('selected')
                if bc['clean'] and sb and not sb['branch']['clean'] and row['plannerLateralOverride'] > .65:
                    row['plannerTargetMismatchWitness'] = True
                    if not actual_clean:
                        labels.append('controller-choice mismatch')
                    row['mismatchGainWitness'] = chosen['gain'] > sb['gain'] + .5 and chosen['gain'] > p['gain'] + .5
                if not bc['clean'] and alternate_clean:
                    row['branchWrongReadOpportunity'] = True
                    if not actual_clean:
                        labels.append('wrong read opportunity')
                    row['alternativeGainWitness'] = any(branches[name]['gain'] > p['gain'] + .5 for name in alternate_clean)
                if not bc['clean'] and chosen['firstContact'] and chosen['firstContact']['t'] <= bc['at'] + bc['testedHorizon'] and (bc['reached'] is None or chosen['firstContact']['t'] < bc['reached']):
                    row['branchApproachContact'] = True
                    if not actual_clean:
                        labels.append('missing blocked corridor')
                    row['corridorStopperWasKey'] = chosen['firstContact']['defender'] == d['key']
                    row['corridorStopperWasBlocked'] = chosen['firstContact']['blocked']
                    row['predictedCleanButBlocked'] = d['risks'].get(d['answer'], float('inf')) < .6
                elif not bc['clean'] and bc['reached'] is None and not actual_clean:
                    labels.append('unreachable opening under tested route')
                for label in ['controller-choice mismatch', 'wrong read opportunity', 'missing blocked corridor', 'unreachable opening under tested route']:
                    if label in labels:
                        row['primary'] = label
                        break
                row['noTestedCleanAnswer'] = not any(branches.get(name, {}).get('branch', {}).get('clean') for name in ['bounce', 'bang', 'bend'])
                row['chosenCleanActualFailed'] = bc['clean'] and p['firstContact'] is not None and p['firstContact']['t'] < bc['reached']
        rows.append(row)
    lost = [r for r in rows if r['delta'] <= -.5]
    label_totals = {}
    for label in sorted({label for r in lost for label in r['labels']}):
        subset = [r for r in lost if label in r['labels']]
        label_totals[label] = {'runs': len(subset), 'lostYards': sum(-r['delta'] for r in subset)}
    primary = {}
    for label in ['controller-choice mismatch', 'wrong read opportunity', 'missing blocked corridor', 'unreachable opening under tested route', 'unresolved']:
        subset = [r for r in lost if r['primary'] == label]
        primary[label] = {'runs': len(subset), 'lostYards': sum(-r['delta'] for r in subset)}
    statistics_out = {key: {'n': len(panel), 'meanGain': statistics.mean(p['gain'] for p in panel),
                          'censored': sum(p['censored'] for p in panel), 'observerNeutral': sum(p['observerNeutral'] for p in panel)}
                      for key, panel in panels.items()}
    summary = {'protocol': 'read-information-v1', 'baseline': 'f3b764d2792c8eba8769e7ec94880c05f68c270e',
               'arrivalRadius': .65, 'branchHorizon': 2.5, 'lossThreshold': .5,
               'classifierOrder': ['controller-choice mismatch', 'wrong read opportunity', 'missing blocked corridor', 'unreachable opening under tested route', 'unresolved'],
               'stats': statistics_out, 'ordinaryLost': len(lost), 'grossLostYards': sum(-r['delta'] for r in lost),
               'overlapLabels': label_totals, 'primary': primary,
               'lossThresholdSensitivity': {str(t): sum(r['delta'] < -t if t == 0 else r['delta'] <= -t for r in rows) for t in [0, .25, .5, 1, 2]},
               'mechanismThresholdSensitivity': {str(t): dict(collections.Counter(r['primary'] for r in rows if (r['delta'] < -t if t == 0 else r['delta'] <= -t))) for t in [0, .25, .5, 1, 2]},
               'completedLossPrimary': dict(collections.Counter(r['primary'] for r in lost if not r['offCensored'] and not r['onCensored'])),
               'completedLossYardsByPrimary': {label: sum(-r['delta'] for r in lost if r['primary'] == label and not r['offCensored'] and not r['onCensored']) for label in primary},
               'completedLost': sum(not r['offCensored'] and not r['onCensored'] for r in lost),
               'completedNetMeanDelta': statistics.mean(r['delta'] for r in rows if not r['offCensored'] and not r['onCensored']),
               'handoff': {'onMean': statistics.mean(p['handoffAt'] for p in on), 'onMedian': statistics.median(p['handoffAt'] for p in on),
                           'sameMatchedTime': sum(r['sameHandoff'] for r in rows), 'sameMatchedPath': sum(r['sameMeshPath'] for r in rows)},
               'lostDiagnostics': {key: sum(bool(r.get(key)) for r in lost) for key in ['heldPastCandidateChange', 'heldPastPhysicalChange',
                  'physicalKeyChanged', 'heldThroughLateralDLTakeover', 'loadedBlockAtDecision', 'leverageSignDisagrees', 'pressAfterOrdinaryAim', 'cachedDesignedAtCommit',
                  'noTestedCleanAnswer', 'corridorStopperWasKey', 'corridorStopperWasBlocked', 'predictedCleanButBlocked', 'chosenCleanActualFailed',
                  'initialBond', 'mismatchGainWitness', 'alternativeGainWitness', 'plannerTargetMismatchWitness',
                  'branchWrongReadOpportunity', 'branchApproachContact', 'actualExpectedClean']},
               'receipts': receipts, 'rows': rows}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(summary, indent=2) + '\n')
    manifest = output.parent / 'input-manifest.json'
    manifest.write_text(json.dumps({'inputs': [p['input'] for p in on], 'flowArms': ['current', 'hold', 'over'],
                                    'readArms': ['off', 'on'], 'originalStop': 8}, indent=2) + '\n')
    print(json.dumps({k: v for k, v in summary.items() if k not in ['rows', 'receipts']}, indent=2))


if __name__ == '__main__':
    main()
