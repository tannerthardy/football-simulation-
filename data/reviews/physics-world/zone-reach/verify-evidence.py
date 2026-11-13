"""Verify the saved solo zone-reach increment without resimulation.

Default verifies immutable evidence. --engine additionally pins the current
source/tools/pointers and reconstructs the baseline and retained prototype.
Stored football intentions are checked separately from achieved motion/load.
"""
import collections
import gzip
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import tempfile
import zipfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
BASELINE = HERE.parent / 'ol-technique'
BEFORE = 'a629d4d04485ade21e4354b8078ed6cd0bf56b155aa92b83dad7f97cc2d8172f'
WORLD = '4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f'
ZONES = ('oz_strong', 'wz_strong')
OL = ('LT', 'LG', 'C', 'RG', 'RT')
CONTROLS = [('iz_strong', 'over', 3), ('duo', 'odd', 11),
            ('power', 'under', 3), ('counter', 'tite', 11)]
FILM_IDS = [f'ZR-R1-{run}-over-{side}-S3' for run in ZONES for side in ('R', 'L')]
CONTROL_IDS = [f'ZR-R1-{run}-{front}-{side}-S{seed}'
               for run, front, seed in CONTROLS for side in ('R', 'L')]
FILM_IDS += CONTROL_IDS


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def finite(value):
    if isinstance(value, float):
        assert math.isfinite(value)
    elif isinstance(value, dict):
        for item in value.values():
            finite(item)
    elif isinstance(value, list):
        for item in value:
            finite(item)


def load(path):
    raw = path.read_bytes()
    value = json.loads(gzip.decompress(raw) if path.suffix == '.gz' else raw)
    finite(value)
    return value


def close(a, b):
    assert abs(a - b) < 1e-8, (a, b)


def source_pin(report, expected):
    assert report['sourceBefore'] == report['sourceAfter'] == expected


def neutral(panel):
    assert panel['schema'] == 'zone-reach-review-v1'
    assert panel['moduleSha256']['src/physics/world.ts'] == WORLD
    assert panel['summary']['snaps'] == panel['summary']['observerVerifiedCount'] == 48
    assert panel['summary']['naturalEnds'] == 48 and panel['summary']['censors'] == 0
    assert len(panel['trials']) == len({r['id'] for r in panel['trials']}) == 48
    assert sum(r['control'] for r in panel['trials']) == 8
    assert panel['filmIds'] == FILM_IDS
    for r in panel['trials']:
        assert r['observerVerified'] and r['observedSignature'] == r['plainSignature']
        assert r['naturalEnd'] and r['result']['outcome'] != 'timeout'
        assert r['roster'] == 0 and r['formation'] == 'ace_11'
        assert r['maxMomentumResidual'] < 1e-7 and r['maxWorkResidual'] < 1e-7
        assert r['maxMotorWorkExcess'] == r['staleMemberUpdates'] == 0


manifest = load(HERE / 'verification-manifest.json')
assert manifest['schema'] == 'zone-reach-verification-v1'
assert manifest['beforeSourceSha256'] == BEFORE and manifest['worldSha256'] == WORLD
AFTER = manifest['finalSourceSha256']
for name, expected in manifest['files'].items():
    assert sha(ROOT / name) == expected, name
panels = [load(HERE / f'{phase}.json.gz') for phase in ('before', 'after')]
for p, pin in zip(panels, (BEFORE, AFTER)):
    source_pin(p, pin)
    neutral(p)
assert panels[0]['cohort'] == panels[1]['cohort']
assert panels[0]['collectorSha256'] == panels[1]['collectorSha256'] == manifest['collectorSha256']
cohort = panels[0]['cohort']
assert cohort['runs'] == list(ZONES) and cohort['fronts'] == ['over', 'under', 'odd', 'tite', 'bear']
assert cohort['playSeeds'] == [3, 11] and cohort['flips'] == [False, True]
assert cohort['coverage'] == 'cover3' and cohort['pressure'] is None and cohort['formation'] == 'ace_11'
assert cohort['controlInputs'] == [dict(zip(('run', 'front', 'seed'), row)) for row in CONTROLS]
initial_matches = exact_runs = exact_controls = 0
for a, b in zip(*(p['trials'] for p in panels)):
    assert all(a[k] == b[k] for k in ('id', 'roster', 'run', 'front', 'flip', 'seed',
                                     'control', 'formation', 'profileSha256'))
    initial_matches += a['initialSha256'] == b['initialSha256']
    same = a['observedSignature'] == b['observedSignature']
    exact_runs += same
    if a['control']:
        assert same and a['result'] == b['result']
        exact_controls += 1
assert initial_matches == 48 and exact_controls == 8
films = [load(HERE / f'{phase}-film.json.gz') for phase in ('before', 'after')]
line_profiles = {p['slot']: p['profile'] for p in films[1]['plays'][0]['players'] if p['slot'] in OL}

# Recompute read eligibility/cues from saved ordinary controller inputs. Never
# infer a winning seal, a contact force or future reachability from a phase.
fresh = collections.Counter()
phase_by_run = {run: collections.Counter() for run in ZONES}
preserved_contact_reads = earned_contact_transfers = 0
for trial in panels[1]['trials']:
    if trial['control']:
        assert all(u['afterBody']['plan']['zoneRead'] is None for u in trial['updates'])
        continue
    bound_slots = {}
    installed = {m['slot']: m['plan'] for m in trial['updates'][0]['before']}
    for u in trial['updates']:
        a, b = u['beforeBody'], u['afterBody']
        p, old = b['plan'], a['plan']['zoneRead']
        z = p['zoneRead']
        if not z or not u['zoneReadChanged'] or z['t'] != u['t']:
            continue
        assert trial['run'] in ZONES and u['observer'] in OL
        assert p['kind'] == 'reach' and (not p['combination'] or p['combination']['released'])
        assert bound_slots.setdefault(z['target'], p['target']) == p['target']
        assert z['seen'] in [c['image'] for c in u['consumedImages'] if c['target'] == p['target']]
        if old and old['target'] == z['target']:
            assert u['t'] >= old['nextRead']
        assert z['nextRead'] > u['t'] and z['side'] == (1 if trial['flip'] else -1)
        for key in ('pos', 'vel', 'facing', 'stance', 'support', 'energy'):
            assert a[key] == b[key], (trial['id'], u['t'], key)
        e = b['engagement']
        if e:
            assert e['blocker'] == u['observer'] and e['defender'] == p['target'] and not e['helpers']
            axis = e['surfaceAxis']
            assert axis and axis['x'] < 0
            close(math.hypot(axis['x'], axis['y']), 1)
            assert e['drive'] == z['drive']
            close(e['sealTarget'], 2 / math.pi * math.asin(math.sin(z['sealTarget'] * math.pi / 2) * -axis['x']))
        prior = a['engagement']
        if prior and e and prior['blocker'] == e['blocker'] and prior['defender'] == e['defender']:
            for key in ('control', 'start', 'contactReported'):
                assert prior[key] == e[key]
            assert e['surfaceAxis'] == (prior['surfaceAxis'] or
                                       {'x': -prior['drive']['x'], 'y': -prior['drive']['y']})
            if prior['helpers']:
                assert u['classification'] == 'earned-climb'
                assert any(event['type'] == 'block_climb' for event in u['events'])
                dx = a['pos']['x'] - u['targetGeometry']['actualPosition']['x']
                dy = a['pos']['y'] - u['targetGeometry']['actualPosition']['y']
                axis = e['surfaceAxis']
                close(e['phi'], math.atan2(dx * axis['y'] - dy * axis['x'],
                                          dx * axis['x'] + dy * axis['y']) / (math.pi / 2))
                earned_contact_transfers += 1
            else:
                assert prior['phi'] == e['phi']
                preserved_contact_reads += 1
        elif e:
            assert e['surfaceAxis'] == {'x': -1, 'y': 0}
        g, seen = u['targetGeometry'], z['seen']
        assert g and g['slot'] == p['target']
        side, radius = z['side'], g['radiusSum']
        lateral = (a['pos']['y'] - seen['pos']['y']) * side
        along = a['pos']['x'] - seen['pos']['x']
        close(z['horizon'], max(.1, min(.4, max(0, -along - radius)
                                       / max(.5, a['vel']['x'] - seen['vel']['x']))))
        close(z['neededTravel'], max(0, -lateral + .45 * radius
                                     + seen['vel']['y'] * side * z['horizon']))
        assert z['availableTravel'] >= 0
        angle = abs(math.atan2(a['pos']['y'] - seen['pos']['y'], -along)) / (math.pi / 2)
        # The unchanged physical profile records reach=.25+.85*arm length.
        # Every input uses the same offensive roster; target radius is native.
        contact = radius + .1 + (line_profiles[u['observer']]['reach'] - .25) / .85 * .45
        possible_seal = lateral >= .45 * radius and -radius <= along <= .35 * radius
        possible_seal &= angle < 1.1 and (not a['support'] or a['support']['state'] == 'up')
        possible_seal &= math.hypot(along, a['pos']['y'] - seen['pos']['y']) <= contact
        expected_phase = 'seal' if possible_seal else (
            'runoff' if seen['vel']['y'] * side > 0 and lateral < .45 * radius
            and z['neededTravel'] > z['availableTravel'] else 'reach')
        assert z['phase'] == expected_phase
        surface = -side if z['phase'] == 'runoff' else side
        close(z['sealTarget'], surface * .3)
        assert z['aim'] == {'x': seen['pos']['x'] - .3, 'y': seen['pos']['y'] + surface * .6}
        assert z['drive'] == (installed[u['observer']]['drive'] if z['phase'] == 'runoff'
                              else {'x': 1, 'y': 0})
        fresh[z['phase']] += 1
        phase_by_run[trial['run']][z['phase']] += 1

comparison = load(HERE / 'comparison.json')
assert comparison['schema'] == 'zone-fit-comparison-v1'
assert comparison['beforeSource'] == BEFORE and comparison['afterSource'] == AFTER
assert comparison['comparisonToolSha256'] == manifest['comparisonToolSha256']
assert comparison['freshCurrentSoloReadPhaseCounts'] == {k: dict(v) for k, v in phase_by_run.items()}
assert len(comparison['freshCurrentSoloReads']) == sum(fresh.values())
assert comparison['checks']['installedControlCompleteExecutionCount'] == exact_controls
assert comparison['checks']['unchangedCompleteExecutionCount'] == exact_runs
assert comparison['checks']['initialProjectionHashesEqualCount'] == initial_matches
for name, pin in comparison['inputSha256'].items():
    assert sha(ROOT / name) == pin, name

# Bind first useful hands to the original solo assignment, independently of
# the phase label or later retargets. Initial live doubles remain excluded.
original_hand_counts = {}
for run in ZONES:
    original_hand_counts[run] = {}
    for phase, panel in zip(('before', 'after'), panels):
        count = collections.Counter()
        starts, ends, offsets = [], [], []
        for trial in (t for t in panel['trials'] if t['run'] == run):
            installed = {m['slot']: m['plan'] for m in trial['updates'][0]['before']}
            for slot, metrics in trial['olMetrics'].items():
                plan = installed[slot]
                if plan['kind'] != 'reach' or (plan['combination'] and not plan['combination']['released']):
                    continue
                count['originalInstalledSoloReachPairs'] += 1
                contact = next((h for h in metrics['firstHands'] if h['other'] == plan['target']), None)
                if not contact:
                    continue
                count['pairsWithSurvivingHands'] += 1
                offset = (contact['blockerPosition']['y'] - contact['defenderPosition']['y']) * (1 if trial['flip'] else -1)
                loaded = any({j['a'], j['b']} == {slot, plan['target']}
                             and abs(j['normalForce']) + abs(j['tangentForce']) > 1e-9
                             for j in contact['nativeLoad']['liveHandsAfterPhysics'])
                count['playsideCenterAtFirstHands'] += offset > 0
                count['firstHandsWithLoadedJoint'] += loaded
                count['playsideCenterAndLoadedJoint'] += offset > 0 and loaded
                count['playsideCenterAndLoadedJointAndTickArmImpulse'] += offset > 0 and loaded and contact['nativeLoad']['armImpulse'] > 1e-9
                starts.append(contact['t'])
                ends.append(contact['completedAt'])
                offsets.append(offset)
        count['pairsWithoutSurvivingHands'] = count['originalInstalledSoloReachPairs'] - count['pairsWithSurvivingHands']
        assert count['originalInstalledSoloReachPairs'] == 39
        recorded = comparison['originalInstalledReachFirstHands'][run][phase]
        for key, value in count.items():
            assert recorded[key] == value
        for key, values in (('meanFirstHandsTickStart', starts), ('meanFirstHandsCompletedAt', ends),
                            ('meanPlaysideCenterOffset', offsets)):
            close(recorded[key], sum(values) / len(values))
        original_hand_counts[run][phase] = dict(count)

loaded_hands = [0, 0]
for phase, (f, p, pin) in enumerate(zip(films, panels, (BEFORE, AFTER))):
    source_pin(f, pin)
    assert f['schema'] == 'zone-reach-film-v1' and f['collectorSha256'] == p['collectorSha256']
    assert [r['id'] for r in f['plays']] == FILM_IDS
    by_id = {r['id']: r for r in p['trials']}
    for play in f['plays']:
        assert play['selection'] == ('installed-negative-control' if play['id'] in CONTROL_IDS else 'fixed-before-outcomes')
        assert {k: v for k, v in play['result'].items() if k not in ('frames', 'telemetry')} == by_id[play['id']]['result']
        assert play['trace'][0]['t'] == 0 and play['trace'][-1]['phase'] == 'dead'
        close(play['trace'][-1]['t'] + .05, play['result']['duration'])
        assert play['result']['telemetry']['level'] == 'full'
        for tick in play['trace']:
            achieved = {r['slot']: r for r in tick['after']}
            for delivered in tick['deliveredStep']:
                assert delivered['achievedPos'] == achieved[delivered['slot']]['pos']
                assert delivered['achievedVel'] == achieved[delivered['slot']]['vel']
                for value, limit in (('armImpulse', 'armImpulseLimit'), ('armWork', 'armWorkLimit'),
                                     ('supportMotorWork', 'supportMotorWorkLimit')):
                    assert delivered[value] <= delivered[limit] + 1e-7
                loaded_hands[phase] += sum(abs(j['normalForce']) + abs(j['tangentForce']) > 1e-8
                                           for j in delivered['liveHandsAfterPhysics'])
for a, b in zip(*(f['plays'] for f in films)):
    assert a['id'] == b['id'] and a['players'] == b['players']
    assert a['result']['frames'][0] == b['result']['frames'][0]
assert all(count > 0 for count in loaded_hands)

# Independently bind the claimed sustained runoff to genuine native loaded
# hands, actual inside position and consecutive ordinary ticks.
w = comparison['sustainedRunoffNativeWitness']
assert w and len(w['rows']) == 3
film = next(p for p in films[1]['plays'] if p['id'] == w['id'])
for i, row in enumerate(w['rows']):
    if i:
        close(row['t'] - w['rows'][i - 1]['t'], .05)
    tick = next(t for t in film['trace'] if t['t'] == row['t'])
    u = next(u for u in tick['updates'] if u['observer'] == w['slot'])
    assert row['beforeBody'] == u['beforeBody'] and row['afterBody'] == u['afterBody']
    assert row['read'] == u['afterBody']['plan']['zoneRead'] and row['read']['phase'] == 'runoff'
    assert film['players'][row['read']['target']]['slot'] == w['target']
    assert row['actualPlaysideCenterOffset'] < 0
    close(row['actualPlaysideCenterOffset'], (u['beforeBody']['pos']['y']
          - u['targetGeometry']['actualPosition']['y']) * row['read']['side'])
    delivered = next(r for r in tick['deliveredStep'] if r['slot'] == w['slot'])
    assert row['nativeLoad'] == delivered and delivered['armImpulse'] > 1e-9
    assert any({j['a'], j['b']} == {w['slot'], w['target']}
               and abs(j['normalForce']) + abs(j['tangentForce']) > 1e-9
               for j in delivered['liveHandsAfterPhysics'])

retained_panels = {}
for phase in manifest.get('retainedPhases', []):
    p = load(ROOT / phase['panel'])
    source_pin(p, phase['sourceSha256'])
    neutral(p)
    assert p['cohort'] == cohort and p['collectorSha256'] == panels[0]['collectorSha256']
    assert all(a['id'] == b['id'] and a['profileSha256'] == b['profileSha256']
               for a, b in zip(p['trials'], panels[0]['trials']))
    retained_panels[phase['label']] = p
    if phase.get('physicalExecutionExactFinal'):
        assert all(a['observedSignature'] == b['observedSignature']
                   for a, b in zip(p['trials'], panels[1]['trials']))
assert all(a['observedSignature'] == b['observedSignature']
           for a, b in zip(retained_panels['prototype']['trials'], retained_panels['pre-transition']['trials']))

audit = load(HERE / 'transition-audit.json')
assert audit['schema'] == 'zone-fit-transition-audit-v1'
assert audit['afterSource'] == AFTER and audit['worldSha256'] == WORLD
for name, pin in audit['inputSha256'].items():
    assert sha(ROOT / name) == pin
pre = load(HERE / 'pre-transition.json.gz')
assert audit['beforeSource'] == pre['sourceBefore'] == pre['sourceAfter']
pre_by_id = {t['id']: t for t in pre['trials']}
final_by_id = {t['id']: t for t in panels[1]['trials']}
changed_ids = {t['id'] for t in pre['trials']
               if t['observedSignature'] != final_by_id[t['id']]['observedSignature']}
assert changed_ids == {r['id'] for r in audit['changedExecutions']} and len(changed_ids) == 13
for r in audit['changedExecutions']:
    witness = r['firstFrameDifferenceOnSameNativeBody']
    assert witness and witness['sameNativeBodyInput'] and r['phaseDifferencesOnSameNativeBodyAndPicture'] == []
    for label, panel_row in (('before', pre_by_id[r['id']]), ('after', final_by_id[r['id']])):
        u = next(u for u in panel_row['updates'] if u['t'] == witness['t'] and u['observer'] == witness['slot'])
        assert u == witness[label]
    assert all(witness['before']['beforeBody'][k] == witness['after']['beforeBody'][k]
               for k in ('pos', 'vel', 'facing', 'stance', 'support', 'energy'))
    assert witness['before']['afterBody']['engagement']['surfaceAxis'] != witness['after']['afterBody']['engagement']['surfaceAxis']
assert len(audit['newFalls']) == audit['summary']['newNativeFallTicks'] == 1
fall = audit['newFalls'][0]
assert fall['t'] == 3 and fall['slot'] == 'LT' and fall['newNativeContactPartners'] == ['RB']
assert fall['afterFallTick']['nativeLoad']['fall'] and not fall['beforeFallTick']['nativeLoad']['fall']
assert fall['afterFallTick']['nativeLoad']['slot'] == fall['slot']
assert fall['afterFallTick']['nativeLoad'] in next(u for u in final_by_id[fall['id']]['updates']
                                                if u['t'] == fall['t'])['deliveredStep']

# Broader panels share initial rosters/calls/profiles; run and game outcomes
# may change with the controller. Tackle-only interactions must remain exact.
guard_exact_runs = 0
for kind, suffix in (('runs', '.json.gz'), ('tackles', '.json.gz'), ('games9', '.json')):
    old, new = [load(folder / f'current-{kind}{suffix}') for folder in (BASELINE, HERE)]
    source_pin(old, BEFORE)
    source_pin(new, AFTER)
    assert old['scriptSha256'] == new['scriptSha256']
    if kind == 'runs':
        assert old['cohort'] == new['cohort'] and len(old['trials']) == len(new['trials']) == 144
        assert old['observerVerifiedCount'] == new['observerVerifiedCount'] == 7
        for a, b in zip(old['trials'], new['trials']):
            assert all(a[k] == b[k] for k in ('id', 'roster', 'run', 'scheme', 'front', 'seed', 'flip', 'rbProfile', 'rbRatings'))
            guard_exact_runs += a == b
    elif kind == 'tackles':
        assert old['primary'] == new['primary'] and old['witnesses'] == new['witnesses']
        assert len(new['primary']) == 56 and len(new['witnesses']) == 8
        assert all(c['passed'] and c['observed'] == c['plain'] for c in new['observerChecks'])
    else:
        assert old['rosterSha256'] == new['rosterSha256'] and old['seed'] == new['seed'] == 9
        assert len(old['games']) == len(new['games']) == 2
        assert [g['seed'] for g in old['games']] == [g['seed'] for g in new['games']]
        assert new['physics']['maxMotorWorkExcessKgYd2S2'] == 0
        assert new['physics']['maxMomentumResidualKgYdS'] < 1e-7
        assert new['physics']['maxWorkResidualKgYd2S2'] < 1e-7

integrity, browser = [load(HERE / name) for name in ('film-integrity.json', 'browser-check.json')]
assert integrity['schema'] == 'zone-reach-film-integrity-v1'
assert integrity['clips'] == integrity['naturalFinishes'] == integrity['predeterminedClips'] == 24
assert integrity['zoneClips'] == 8 and integrity['installedControlClips'] == 16 and integrity['inspectionCensors'] == 0
for key in ('exactFullTelemetry', 'exactRawEventsActorsNotesTimes', 'exactPlayersProfilesRatingsWeights',
            'exactNativeOwnershipAndDeliveredLoads', 'recordedFrameTimesAndPossession', 'zipHtmlByteExact',
            'allEightInstalledControlsExecutionExact', 'all48ObserverControlsPerPhaseNeutral',
            'storedZoneReadOriginsAndConsumedImagesExact'):
    assert integrity[key], key
assert len(browser['clips']) == 24 and browser['pageErrors'] == []
videos = browser['videoExportUsesSelectedEngineSource']
assert len(videos) == 2 and [v['selectedSourceSha256'] for v in videos] == [BEFORE, AFTER]
assert all(v['nonemptyBytes'] > 0 and v['paintedStampUsesSelectedSource'] for v in videos)
assert integrity['checkerSha256'] == sha(HERE / 'film-check.py')
assert integrity['htmlSha256'] == sha(ROOT / 'viewer/zone-reach.html')
assert integrity['zipSha256'] == sha(ROOT / 'viewer/zone-reach.zip')
with zipfile.ZipFile(ROOT / 'viewer/zone-reach.zip') as archive:
    assert archive.testzip() is None and archive.namelist() == ['zone-reach.html']
    assert archive.read('zone-reach.html') == (ROOT / 'viewer/zone-reach.html').read_bytes()
proof = manifest['independentChecks']
assert proof['freshSoloReads'] == dict(fresh)
assert proof['existingContactControllerStatePreservedReads'] == preserved_contact_reads
assert proof['earnedContactTransfersGeometricallyChecked'] == earned_contact_transfers
assert proof['loadedSurvivingHandEntries'] == loaded_hands
assert proof['broaderCompleteRunRowsExact'] == guard_exact_runs
assert proof['originalInstalledReachFirstHands'] == original_hand_counts
checks = manifest['checks']
assert f"{checks['testsPassed']} passed ({checks['testsPassed']})" in (HERE / 'tests.log').read_text()
assert '18 passed (18)' in (HERE / 'focused-tests-after.log').read_text()
assert '13 failed | 5 passed (18)' in (HERE / 'focused-tests-before.log').read_text()
assert 'Ran 22 tests' in (HERE / 'python.log').read_text()
assert all(v == 0 for k, v in checks.items() if k.endswith('ExitCode'))
recorded_checks = load(HERE / 'checks.json')
assert recorded_checks['finalSourceSha256'] == AFTER and recorded_checks['typescriptTestsPassed'] == checks['testsPassed']
assert recorded_checks['focusedTestsPassed'] == 18 and recorded_checks['pythonTestsPassed'] == 22
assert all(value == 0 for key, value in recorded_checks.items() if key.endswith('ExitCode'))

if '--engine' in sys.argv:
    for name, expected in manifest['currentCodeFiles'].items():
        assert sha(ROOT / name) == expected, name
    assert sha(ROOT / 'src/physics/world.ts') == WORLD
    changed = manifest['changedEngineFiles']
    paths = sorted((p for p in (ROOT / 'src').rglob('*') if p.is_file()),
                   key=lambda p: p.relative_to(ROOT).as_posix())
    with tempfile.TemporaryDirectory(prefix='zone-reach-source-', dir='/tmp') as directory:
        scratch = Path(directory)
        for name in changed:
            path = scratch / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes((ROOT / name).read_bytes())
        subprocess.run(['git', 'apply', '--reverse', str(HERE / 'engine.patch')], cwd=scratch, check=True)
        def source_at(tree=None):
            digest = hashlib.sha256()
            for path in paths:
                name = path.relative_to(ROOT).as_posix()
                alternate = tree / name if tree and name in changed else path
                if not alternate.exists():
                    assert name in manifest['addedEngineFiles']
                    continue
                digest.update(name.encode() + b'\0' + alternate.read_bytes() + b'\0')
            return digest.hexdigest()
        assert source_at() == AFTER and source_at(scratch) == BEFORE
        for phase in manifest.get('retainedPhases', []):
            if 'enginePatch' not in phase:
                continue
            variant = scratch / phase['label']
            for name in changed:
                baseline = scratch / name
                if baseline.exists():
                    destination = variant / name
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    destination.write_bytes(baseline.read_bytes())
            subprocess.run(['git', 'apply', str(ROOT / phase['enginePatch'])], cwd=variant, check=True)
            assert source_at(variant) == phase['sourceSha256']
print(json.dumps({'passed': True, 'fixedInputProfilePairs': 48, 'observedPlainControls': 96,
                  'installedControlsExecutionExact': exact_controls, 'freshSoloReads': dict(fresh),
                  'existingContactControllerStatePreservedReads': preserved_contact_reads,
                  'earnedContactTransfersGeometricallyChecked': earned_contact_transfers,
                  'loadedSurvivingHandEntries': loaded_hands, 'broaderCompleteRunRowsExact': guard_exact_runs,
                  'unchangedTackleRows': 64, 'naturalFilmClips': 24,
                  'assetHashes': len(manifest['files']), 'engineChecked': '--engine' in sys.argv}))
