"""Offline comparison of the one RB-reference candidate and three saved Ace controls.

Reads measured values only; advances no simulations, creates no perceptions,
and never overwrites the pinned diagnosis or its 1.433-yard witness.
"""
import argparse
import gzip
import hashlib
import json
import math
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--candidate', default='out/rb-live-assessment')
parser.add_argument('--reference', default='/workspace/football-under-center-zone/out/under-center-zone')
args = parser.parse_args()
candidate_root, reference_root = Path(args.candidate), Path(args.reference)


def read(path):
    return json.loads(Path(path).read_text())


def packet(root, name):
    return json.loads(gzip.decompress((root / f'{name}.json.gz').read_bytes()))


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def measured(play):
    slots = {a['id']: a['slot'] for a in play['players']}
    rb = next(i for i, slot in slots.items() if slot == 'RB')
    first = next(e for e in play['events'] if e['type'] == 'carrier_contact' and rb in [e.get('a'), e.get('b')])
    contact_frame = next(f for f in play['frames'] if f['t'] == first['t'])
    crossing = next((f['after'] for f in play['frames'] if f.get('carrier') == rb and f['agents'][rb]['pos']['x'] >= 40), None)
    events = [e for f in play['frames'] for e in f['carrierEvents'] if e['actor'] == rb]
    starts = [e for e in events if e['phase'] == 'carrier-start']
    phases = [dict(t=e['t'], designed=e['designed'], aimUntil=e['aimUntil']) for i, e in enumerate(starts)
              if i == 0 or e['designed'] != starts[i-1]['designed']]
    loaded = {}
    for f in play['frames']:
        for j in f['physicsInput']['jointOutputs']:
            force = math.hypot(j.get('normalForce', 0), j.get('tangentForce', 0))
            if j['kind'] != 'hands' or force <= 1:
                continue
            pair = slots[j['a']] + '/' + slots[j['b']]
            row = loaded.setdefault(pair, dict(first=f['after'], last=f['after'], maximumForce=0))
            row['last'] = f['after']
            row['maximumForce'] = max(row['maximumForce'], force)
    installs = []
    for a in play['frames'][0]['agents']:
        p = a.get('work')
        if p and p.get('target'):
            installs.append(dict(slot=a['slot'], kind=p['kind'], target=slots[p['target']['agent']]))
    return dict(designedPhaseChanges=phases, crossingBoundary=crossing, firstContact=first,
                firstOpponent=slots[first['b'] if first['a'] == rb else first['a']],
                exactPostStepContactDepth=contact_frame['physicsInput']['afterBodies'][rb]['pos']['x']-40,
                endTime=play['endTime'], gain=play['gain'], outcome=play['outcome'],
                loadedPairs=loaded, installed=installs), rb


rows, launchers = [], {}
for name, reference_name in [('ace', 'carrier-design'), ('weak', 'carrier-design-weak')]:
    candidate, reference = packet(candidate_root, name), packet(reference_root, reference_name)
    check = read(candidate_root / f'{name}-checks.json')
    assert check['exitCode'] == 0 and check['inputsUnchanged']
    assert candidate['provenance']['commit'] == check['commit'] == '7ff529b28de496eb438bbf478ff3de4217367625'
    assert candidate['provenance']['sourceSha256'] == check['sourceSha256'] == '973d4ab84f80e5aa74a25c918fb96ef0189b938f4d22c8350aba9d121bb7f965'
    assert reference['provenance']['sourceSha256'] == '09c65f70ff3835dba17fb08487582d65f49eaea827f4e6e48f396f93210b773c'
    assert candidate['inputs'] == reference['inputs']
    assert candidate['provenance']['flags'] == reference['provenance']['flags'] == check['flags']
    assert check['node'] == 'v22.23.3'
    assert candidate['stop'] == reference['stop'] == 25
    assert candidate['provenance']['intervention'] == reference['provenance']['intervention'] == dict(remove='', keep='')
    launchers[name] = check
    for c, b in zip(candidate['panel'], reference['panel']):
        assert c['input'] == b['input'] and c['players'] == b['players'] and c['initial'] == b['initial']
        assert c['observerNeutral'] and not c['live'] and c['censoring'] is None
        # Attest the observed result on this candidate, not a required invariant
        # for all football corrections or future law candidates.
        assert c['hashes'] == b['hashes'] and c['events'] == b['events']
        for f, g in zip(c['frames'], b['frames']):
            assert f['cues'] == g['cues']
            assert f['agents'] == g['agents']
            assert f['physicsInput'] == g['physicsInput']
            assert f['contactEvents'] == g['contactEvents']
        baseline_metrics, rb = measured(b)
        candidate_metrics, _ = measured(c)
        assert baseline_metrics == candidate_metrics
        decisions, entries = [], []
        for f, g in zip(c['frames'], b['frames']):
            native = [e for e in f['carrierEvents'] if e['actor'] == rb]
            old = [e for e in g['carrierEvents'] if e['actor'] == rb]
            selected = [e for e in native if e['phase'] == 'aim']
            previous = [e for e in old if e['phase'] == 'aim']
            assert selected == previous
            for e in selected:
                if e['t'] < baseline_metrics['firstContact']['t']:
                    entries.append(dict(t=e['t'], entry=e['selected'], preferred=e['preferred'], candidates=e['candidates']))
            current = next((e for e in native if e['phase'] == 'lane-evaluation' and e['designed']), None)
            prior = next((e for e in old if e['phase'] == 'lane-evaluation' and e['designed']), None)
            assert bool(current) == bool(prior)
            if not current:
                continue
            start = next(e for e in native if e['phase'] == 'carrier-start')
            command = next(e for e in native if e['phase'] == 'command')
            snap = start['controllerState']['opts']['aim']
            live = dict(x=snap['x'], y=command['pos']['y'] + math.tan(command['heading'])*(snap['x']-command['pos']['x']))
            reference_error = math.dist(list(current['assessmentAim'].values()), list(live.values()))
            assert reference_error < 1e-12
            def action(e):
                result = e['result']
                return bool(result and result['aimBlocked'] and result['score'] > result['aimScore'] + e['earlyAbandonThreshold'])
            assert action(current) == action(prior)
            decisions.append(dict(t=f['t'], snapAssessment=snap, liveAssessment=current['assessmentAim'],
                                  referenceAlignmentError=reference_error, threshold=current['earlyAbandonThreshold'],
                                  originalResult=prior['result'], correctedResult=current['result'],
                                  originalAbandon=action(prior), correctedAbandon=action(current),
                                  ownPosition=command['pos'], ownVelocity=command['vel'],
                                  acquiredEnd=[q['seen'] for q in f['cues'] if q['defender'] == rb
                                               and q['slot'] == ('DE_W' if c['side'] > 0 else 'DE_S')][-1]))
        rows.append(dict(input=c['input'], side=c['side'], ticks=len(c['hashes']),
                         inputSha256=digest(c['input']), profilesSha256=digest(c['players']),
                         completeHistorySha256=digest(c['hashes']), completeHistoryExact=True,
                         consumedCuesExact=True, nativeCommandsAndPositionsExact=True,
                         worldInputsAndOutputsExact=True, contactRequestsAndLoadsExact=True,
                         original=baseline_metrics, corrected=candidate_metrics,
                         assessments=decisions, precontactEntries=entries,
                         changedRoute=False, protectionImprovement=False, protectionRegression=False,
                         feasibility='No different decision or route was executed; the previous momentum/traffic limits remain.'))
        print(f"{c['input']['id']}: complete history/cues/World exact; no changed abandonment or lane")

assert [r['input']['id'] for r in rows] == ['uc12-wz-s3', 'uc12-wz-s3-mirror', 'uc12-wz-weak-s3']
preserved = {}
for path in ['docs/reviews/under-center-zone-inputs.json', 'docs/reviews/under-center-zone-direction-inputs.json',
             'docs/reviews/under-center-zone-runner-read-witness.json', 'docs/reviews/under-center-zone-keeper-world-witness.json']:
    contents = Path(path).read_bytes()
    assert contents == subprocess.check_output(['git', 'show', '45a35bbe1b09554e874370604c83df47fca809f6:'+path])
    preserved[path] = dict(sha256=hashlib.sha256(contents).hexdigest(), bytes=len(contents))
world = hashlib.sha256(Path('src/physics/world.ts').read_bytes()).hexdigest()
assert world == 'ed1708d764c355da60bd31c115f557baf3d81af18c89f3479c471bf981732ca2'
receipt = dict(protocol='rb-live-aim-native-comparison-v1',
               comparisonCommit='4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',
               physicsReviewCommit='22d3b34df18124ffad1a5eebd30d6f41bbb67d57',
               testedCandidateCommit='7ff529b28de496eb438bbf478ff3de4217367625',
               testedEngineCommit='139f55bfecf62b61f8ebee49647e6e2b6999764f',
               sourceSha256=launchers['ace']['sourceSha256'], worldSha256=world,
               resolvedFlags=launchers['ace']['flags'], preserved=preserved,
               newCandidateObservedPlainPairs=3, newReferencePairs=0, newGames=0, newFullSuites=0,
               referenceEvidence='PR #11 saved default packets; all three complete histories independently exact to actual 4ded6b6.',
               rawPackets={str(root/name): hashlib.sha256((root/name).read_bytes()).hexdigest()
                           for root, name in [(candidate_root, 'ace.json.gz'), (candidate_root, 'weak.json.gz'),
                                              (reference_root, 'carrier-design.json.gz'), (reference_root, 'carrier-design-weak.json.gz')]},
               launchers=launchers, recordedCollectionCommandSeconds=sum(c['elapsedSeconds'] for r in launchers.values() for c in r['commands']),
               existingPreparationEvidence='rb-live-aim-preparation.json: eight focused controller checks/typecheck on same engine bytes, reused.',
               conclusions=['The correction removes the assessment-reference mismatch.',
                            'All twelve actual abandonment checks retain the same decisions; all precontact entries and native trajectories remain identical.',
                            'No protection improvement or regression on these three controls; no football causal rescue claimed.',
                            'Successful first stopper is assigned CB_S, not SS; earlier safety prose was incorrect.',
                            'Original center law still has its independently reviewed angular defect. Results do not certify legitimate defensive wins.',
                            'PR #14 full patch combines contact correction and precontact locomotion; its outcomes cannot isolate contact-law causation.'], rows=rows)
Path('docs/reviews/rb-live-aim-comparison.json').write_text(json.dumps(receipt, indent=2)+'\n')
