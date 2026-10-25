#!/usr/bin/env python3
"""Verify saved joined-combo attention evidence without rerunning football.

Reuse the immutable B162 baseline. Whole events, controls and native budget
maxima cover all 162 inputs; detailed eye/hand continuity covers only the six
common witnesses. The old collector omits the new prepass. Default verification
is historical; --engine additionally pins current files and reverses the patch.
"""
import base64
import gzip
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import zipfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
BASELINE = HERE.parent / 'zone-helper-check'
BEFORE = 'd6dfa190412da52725780c71db02f73305b3e3f5541b4c8e9d755a3296ee568f'
AFTER = '246931590ef723662a4e6178755660185b13487efe2a7d7e8dce503710b08469'
WORLD = '4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f'
COLLECTOR = '1e6180d476b3a8ff5476badcf02309cf8706adcf0e954d9e475c4cce5f3685f6'
WITNESS = '46e3be84d1e29f81f4d2be60b94e7ae6759587ceef266a16d0581d1a82149ccb'
ADVERSE = '78f02656390e01960c1a0662ea06c2a8f3e83e6bbbbd7c12b617b8868d09710b'
FIXED = [f'CA-R1-{run}-{front}-{side}-S{seed}' for run, front, seed in
         [('iz_strong', 'over', 3), ('duo', 'odd', 11), ('power', 'under', 3)] for side in ('R', 'L')]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    with gzip.open(path, 'rt') if path.suffix == '.gz' else path.open() as stream:
        return json.load(stream, parse_constant=lambda token: (_ for _ in ()).throw(ValueError(token)))


def finite(value):
    if isinstance(value, float):
        assert math.isfinite(value)
    elif isinstance(value, dict):
        for item in value.values(): finite(item)
    elif isinstance(value, list):
        for item in value: finite(item)


def close(a, b):
    assert abs(a - b) < 1e-8, (a, b)


def pinned(report, source, tool):
    assert report['sourceBefore'] == report['sourceAfter'] == source
    assert report['collectorSha256'] == tool
    assert report['moduleSha256']['src/physics/world.ts'] == WORLD
    finite(report)


def budgets(load):
    for value, limit in [('armImpulse', 'armImpulseLimit'), ('armWork', 'armWorkLimit'),
                         ('supportMotorWork', 'supportMotorWorkLimit')]:
        assert 0 <= load[value] <= load[limit] + 1e-7
    assert math.hypot(load['groundImpulse']['x'], load['groundImpulse']['y']) <= load['groundTractionLimit'] + 1e-7


def whole_climbs(play):
    return [e for e in play['result']['events'] if e['type'] == 'block_climb']


def panel_metrics(trials):
    events = [e for t in trials for e in whole_climbs(t)]
    return {'snaps': len(trials), 'meanYards': sum(t['result']['offenseYards'] for t in trials) / len(trials),
            'stuffs': sum(t['result']['offenseYards'] <= 0 for t in trials),
            'olFalls': sum(m['falls'] for t in trials for m in t['olMetrics'].values()),
            'actualWholePlayClimbs': len(events),
            'actualCheckClimbs': sum(e.get('note', '').startswith('check') for e in events),
            'commandLocalClimbsReportedByOldCollector': sum(t['earnedClimbs'] for t in trials)}


def panel_audit(before, after, comparison):
    assert before['cohort'] == after['cohort'] == comparison['cohort']
    assert before['filmIds'] == after['filmIds']
    native_rows, adverse, exact, public_exact = [0, 0], [], 0, 0
    for i, panel in enumerate((before, after)):
        pinned(panel, (BEFORE, AFTER)[i], COLLECTOR)
        assert len(panel['trials']) == 160 and len(panel['supplementalTrials']) == 2
        for trial in panel['trials'] + panel['supplementalTrials']:
            assert trial['observerVerified'] and trial['observedSignature'] == trial['plainSignature']
            assert trial['naturalEnd'] and trial['result']['outcome'] != 'timeout'
            assert trial['maxMomentumResidual'] < 1e-7 and trial['maxWorkResidual'] < 1e-7
            assert trial['maxMotorWorkExcess'] == 0
            for row in trial['updates']:
                for load in row['deliveredStep']:
                    budgets(load); native_rows[i] += 1
            # Actual contact observations remain native even when a prepass
            # release is absent from the old command-local decision records.
            for metrics in trial['olMetrics'].values():
                for row in metrics['firstHands'] + metrics['firstContacts']: budgets(row['nativeLoad'])
    for scope, stored_key in [('trials', 'pairedResults'), ('supplementalTrials', 'pairedSupplementalResults')]:
        old, new = before[scope], after[scope]
        assert len({t['id'] for t in old}) == len(old)
        assert [t['id'] for t in old] == [t['id'] for t in new]
        assert len(comparison[stored_key]) == len(old)
        for a, b, stored in zip(old, new, comparison[stored_key]):
            assert all(a[k] == b[k] for k in ('roster', 'run', 'front', 'flip', 'seed', 'formation', 'supplemental'))
            assert a['initialProjection'] == b['initialProjection']
            assert a['initialSha256'] == b['initialSha256'] and a['profileSha256'] == b['profileSha256']
            assert stored['id'] == a['id']
            assert stored['beforeYards'] == a['result']['offenseYards'] and stored['afterYards'] == b['result']['offenseYards']
            close(stored['yardsDelta'], b['result']['offenseYards'] - a['result']['offenseYards'])
            assert stored['beforeClimbs'] == len(whole_climbs(a)) and stored['afterClimbs'] == len(whole_climbs(b))
            assert stored['identicalCompleteExecution'] == (a['observedSignature'] == b['observedSignature'])
            assert stored['identicalCompletePublicResult'] == (a['result'] == b['result'])
            if scope == 'trials':
                exact += stored['identicalCompleteExecution']
                public_exact += stored['identicalCompletePublicResult']
            if stored['yardsDelta'] < -1e-9: adverse.append(stored)
    expected_adverse = comparison['adverseAnyGainPairs'] + comparison['supplementalAdverseAnyGainPairs']
    adverse_keys = ('id', 'beforeYards', 'afterYards', 'yardsDelta')
    assert [{k: row[k] for k in adverse_keys} for row in adverse] == [
        {k: row[k] for k in adverse_keys} for row in expected_adverse]
    metrics = [panel_metrics(p['trials']) for p in (before, after)]
    for phase, raw in zip(('before', 'after'), metrics):
        for key, value in raw.items(): close(comparison['ordinary'][phase][key], value)
    for name in ('src/sim/engagement.ts', 'src/physics/world.ts'):
        assert before['moduleSha256'][name] == after['moduleSha256'][name]
    return {'matchedFullInitialProjections': 162, 'panelObservedPlainControls': 324,
            'ordinaryExactCompleteSignatures': exact, 'ordinaryExactCompletePublicResults': public_exact,
            'ordinaryMetrics': metrics,
            'retainedOLControllerLoadsChecked': native_rows,
            'allAdversePairs': [{k: p[k] for k in ('id', 'beforeYards', 'afterYards', 'yardsDelta')} for p in adverse]}


def member(combo, slot):
    return next(m for m in combo['memberState'] if m['slot'] == slot)


def hand(combo, keeper):
    engagement = member(combo, keeper)['engagement']
    native = next(m for m in engagement['members'] if m['slot'] == keeper)
    return native['hands'], engagement, native


def dist(a, b):
    return math.hypot(a['x'] - b['x'], a['y'] - b['y'])


def own_images(images, observer, target):
    return [c['image'] for c in images if c['observer'] == observer and c['target'] == target]


def attention_reads(play):
    """Count actual readAt changes; an attempt can stop before any visual call."""
    seen, reads = set(), []
    for tick in play['ticks']:
        assert all(c['ordinal'] == i for i, c in enumerate(tick['consumedImages']))
        boundaries = ([tick['prepass']] if tick['prepass'] else []) + tick['commands']
        for boundary in boundaries:
            before = {c['id']: c for c in boundary['beforeCombinations']}
            pictures = tick['consumedImages'][boundary['firstImageOrdinal']:boundary['endImageOrdinal']]
            for combo in boundary['afterCombinations']:
                old = before.get(combo['id'])
                for i, current in enumerate(combo['personalReads'] or []):
                    prior = old['personalReads'][i] if old and old['personalReads'] else None
                    if current['readAt'] != tick['t'] or (prior and prior['readAt'] == current['readAt']): continue
                    key = (combo['id'], current['observer'], current['readAt'])
                    assert key not in seen
                    seen.add(key)
                    actor = member(old or combo, current['observer'])
                    assert current['observer'] == combo['members'][i]
                    assert tick['t'] >= actor['snapReadyAt']
                    if prior: assert tick['t'] + 1e-9 >= prior['nextRead']
                    close(current['nextRead'], tick['t'] + actor['decisionInterval'])
                    keeper = combo['members'][1-i]
                    surface = all(own_images(pictures, current['observer'], target) for target in (keeper, combo['defender']))
                    fill = all(own_images(pictures, current['observer'], target) for target in (combo['backer'], 'RB'))
                    e = actor['engagement']
                    support = next(m for m in e['members'] if m['slot'] == keeper)
                    joint = support['hands']
                    admissible = (e['control'] > -.12 + .12 * (.5 - actor['urgency']) and e['baseB'] > .60 and abs(e['phi']) < .55
                                  and not support['down'] and support['supportAvailability'] > .60 and abs(support['surfacePhi']) < .65
                                  and joint and joint['live'] and joint['a'] == keeper and joint['b'] == combo['defender']
                                  and (keeper == e['blocker'] or support['helperSupport'] >= .25))
                    assert surface == bool(admissible), (play['id'], tick['t'], current['observer'])
                    for cue in pictures: assert cue['image']['age'] >= 0
                    if current['proposal']:
                        proposal = current['proposal']
                        assert proposal['climber'] == current['observer'] and proposal['t'] == current['readAt']
                        assert proposal['keeper'] == keeper and surface and fill
                    reads.append({'id': play['id'], 'combo': combo['id'], 'observer': current['observer'],
                                  't': tick['t'], 'surface': surface, 'fill': fill,
                                  'joined': bool(old and old['genuinelyJoined']), 'physicalVeto': not admissible})
    return reads


def self_departure(play, row):
    """Verify the actual departing player's proposal and consumed visual cues."""
    old, decision = row['beforeCombination'], row['eventBoundaryCombination']
    climber = row['climber']; keeper = next(s for s in old['members'] if s != climber)
    j0, e0, native = hand(old, keeper)
    assert row['phase'] == 'joined-prepass'
    selected = next(r for r in decision['personalReads'] if r['observer'] == climber)
    proposal = selected['proposal']
    assert selected['readAt'] == proposal['t'] == row['t']
    assert row['t'] - selected['secureSince'] >= .15 - 1e-9
    assert proposal['climber'] == climber and proposal['keeper'] == keeper and proposal['hands'] == j0
    close(proposal['phi'], native['surfacePhi'])
    image_range = row['decisionImageOrdinalRange']
    images = row['consumedImages'][image_range['first']:image_range['end']]
    cues = [own_images(images, climber, target) for target in (keeper, old['defender'], row['backer'], 'RB')]
    assert all(len(cue) == 1 for cue in cues)
    covered, down, backer, runner = [cue[0] for cue in cues]
    actor = member(old, climber)
    assert covered['pose'] == down['pose'] == 'up' and all(cue[0]['age'] >= 0 for cue in cues)
    axis = e0['axis']; dx = covered['pos']['x'] - down['pos']['x']; dy = covered['pos']['y'] - down['pos']['y']
    phi = math.atan2(-(dx * -axis['y'] + dy * axis['x']), dx * axis['x'] + dy * axis['y']) / (math.pi / 2)
    profiles = {p['slot']: p['profile'] for p in play['players']}
    reach = profiles[keeper]['radius'] + profiles[old['defender']]['radius'] + (profiles[keeper]['reach'] - .25) / .85
    assert abs(phi) < .55 and dist(covered['pos'], down['pos']) <= reach
    assert dist(backer['pos'], actor['physical']['pos']) < 4.2 or runner['pos']['x'] > play['los'] - 2.8
    close(proposal['cost'], dist(backer['pos'], actor['physical']['pos']) + (.30 if climber == e0['blocker'] else 0))
    assert e0['control'] > -.12 + .12 * (.5 - actor['urgency']) and e0['baseB'] > .60 and abs(e0['phi']) < .55


def witness_audit(before, after, comparison):
    counts, all_reads = [], []
    for phase, report, source in zip(('before', 'after'), (before, after), (BEFORE, AFTER)):
        pinned(report, source, WITNESS)
        assert [p['id'] for p in report['plays']] == FIXED
        counts.append({'climbs': 0, 'keeperContinuity': 0, 'positiveKeeperForce': 0,
                       'laterLoadedBackerContact': 0, 'historicalRemoteDepartures': 0,
                       'selfCurrentProposalsWithOwnFourCues': 0})
        for play in report['plays']:
            assert play['observerVerified'] and play['observedSignature'] == play['plainSignature']
            assert play['naturalEnd'] and play['result']['outcome'] != 'timeout'
            assert play['prepassAvailable'] == (phase == 'after')
            assert play['personalReadSchemaAvailable'] == (phase == 'after')
            assert [r['event'] for r in play['climbs']] == whole_climbs(play)
            reads = attention_reads(play)
            if phase == 'before': assert not reads and all(t['prepass'] is None for t in play['ticks'])
            else: all_reads.extend(reads)
            for row in play['climbs']:
                old, decision, solved = [row[k] for k in ('beforeCombination', 'eventBoundaryCombination', 'afterWholeTickCombination')]
                climber = row['climber']; keeper = next(s for s in old['members'] if s != climber)
                assert old['genuinelyJoined'] and not old['released'] and decision['released']
                assert row['physicalBodiesUnchangedAtDecision'] and row['physicsStepRecorded'] and row['completedAt'] > row['t']
                assert [m['physical'] for m in old['memberState']] == [m['physical'] for m in decision['memberState']]
                assert member(decision, climber)['plan']['kind'] == 'climb'
                assert member(decision, climber)['plan']['target'] == row['backer']
                j0, e0, native = hand(old, keeper); j1, e1, _ = hand(decision, keeper); j2, _, _ = hand(solved, keeper)
                assert j0 == j1 and j0['id'] == j2['id']
                assert all(j['live'] and j['kind'] == 'hands' and j['a'] == keeper and j['b'] == old['defender'] for j in (j0, j1, j2))
                assert native['supportAvailability'] > .60 and abs(native['surfacePhi']) < .65 and not native['down']
                if keeper != e0['blocker']: assert native['helperSupport'] >= .25
                assert all(e0.get(k) == e1.get(k) for k in ('control', 'baseB', 'baseD', 'start', 'axis', 'drive', 'surfaceAxis'))
                force = math.hypot(j2['state'].get('normalForce', 0), j2['state'].get('tangentForce', 0))
                assert force > 1e-6
                for load in row['loads']: budgets(load)
                counts[-1]['climbs'] += 1; counts[-1]['keeperContinuity'] += 1; counts[-1]['positiveKeeperForce'] += 1
                if phase == 'before':
                    assert decision['personalReads'] is None
                    counts[-1]['historicalRemoteDepartures'] += row['initiatingObserver'] != climber
                else:
                    self_departure(play, row)
                    counts[-1]['selfCurrentProposalsWithOwnFourCues'] += 1
            for contact in play['backerContacts']:
                assert any(r['t'] == contact['climbT'] and r['climber'] == contact['climber'] and r['backer'] == contact['backer'] for r in play['climbs'])
                assert contact['completedAt'] > contact['climbT']
                assert any(math.hypot(j['state'].get('normalForce', 0), j['state'].get('tangentForce', 0)) > 1e-6 for j in contact['hands']) or any(c['impulse'] > 1e-6 for c in contact['bodyContacts'])
                for load in contact['loads']: budgets(load)
                counts[-1]['laterLoadedBackerContact'] += 1
    assert before['cohort'] == after['cohort']
    for old, new in zip(before['plays'], after['plays']):
        assert all(old[k] == new[k] for k in ('initialProjection', 'initialSha256', 'profileSha256', 'players', 'offCall', 'defCall', 'run', 'front', 'flip', 'seed'))
    stored = comparison['sixCommonTapNativeWitnesses']
    for phase, count in zip(('before', 'after'), counts):
        for raw, key in [('climbs', 'actualWholePlayClimbs'), ('keeperContinuity', 'sameKeeperJointAfterSolve'),
                         ('positiveKeeperForce', 'positiveKeeperPairForceAfterSolve'), ('laterLoadedBackerContact', 'laterActualLoadedBackerContactConfirmed')]:
            assert count[raw] == stored[phase][key]
    assert len(all_reads) == stored['after']['recordedPersonalAttentionAttempts']
    assert sum(r['surface'] for r in all_reads) == stored['after']['actualOwnKeeperDLVisualReads']
    assert sum(r['fill'] for r in all_reads) == stored['after']['actualOwnBackerRunnerReads']
    assert sum(r['physicalVeto'] for r in all_reads) == stored['after']['attentionAttemptsWithRecordedPhysicalVeto']
    pairs = {(r['id'], r['combo']) for r in all_reads if r['joined']}
    both_attempts = sum(len({r['observer'] for r in all_reads if (r['id'], r['combo']) == pair}) == 2 for pair in pairs)
    both_visual = sum(len({r['observer'] for r in all_reads if (r['id'], r['combo']) == pair and r['surface']}) == 2 for pair in pairs)
    assert both_attempts == stored['after']['observedGenuinelyJoinedPairsWithBothMemberAttentionAttempts']
    assert both_visual == stored['after']['observedGenuinelyJoinedPairsWithBothMemberVisualSurfaceReads']
    return {'matchedCommonWitnessInputs': 6, 'witnessObservedPlainControls': 12, 'witnessClimbProof': counts,
            'personalAttentionAttempts': len(all_reads), 'ownSurfaceVisualReads': sum(r['surface'] for r in all_reads),
            'ownBackerRunnerReads': sum(r['fill'] for r in all_reads),
            'attentionAttemptsStoppedByPhysicalKeeperGate': sum(r['physicalVeto'] for r in all_reads),
            'joinedPairsBothAttentionAttempts': both_attempts, 'joinedPairsBothVisualSurfaceReads': both_visual}


def audit():
    comparison = read(HERE / 'comparison.json')
    assert comparison['schema'] == 'combo-attention-comparison-v1' and comparison['sources'] == {'before': BEFORE, 'after': AFTER}
    input_paths = [BASELINE / 'candidate.json.gz', HERE / 'candidate.json.gz',
                   HERE / 'witness-before.json.gz', HERE / 'witness-after.json.gz']
    assert comparison['inputs'] == {p.relative_to(ROOT).as_posix(): sha(p) for p in input_paths}
    panels = [read(BASELINE / 'candidate.json.gz'), read(HERE / 'candidate.json.gz')]
    witnesses = [read(HERE / f'witness-{phase}.json.gz') for phase in ('before', 'after')]
    proof = {**panel_audit(*panels, comparison), **witness_audit(*witnesses, comparison)}
    # Four outcome-selected investigations remain a separate population.
    adverse = [read(HERE / f'adverse-{phase}.json.gz') for phase in ('before', 'after')]
    adverse_hands, adverse_remote, adverse_self = [0, 0], [0, 0], [0, 0]
    for phase, (report, panel) in enumerate(zip(adverse, panels)):
        pinned(report, (BEFORE, AFTER)[phase], ADVERSE)
        assert report['schema'] == 'combo-attention-posthoc-adverse-witness-v1' and report['instrumentationSourceSha256'] == WITNESS
        assert len(report['plays']) == 4
        by_id = {t['id']: t for t in panel['trials'] + panel['supplementalTrials']}
        for play in report['plays']:
            assert play['selection'] == 'post-hoc-adverse-case' and play['naturalEnd']
            assert play['observerVerified'] and play['observedSignature'] == play['plainSignature']
            recorded = by_id[play['id'].replace('CAP-', 'CT-')]
            assert all(play[k] == recorded[k] for k in ('run', 'front', 'flip', 'seed', 'formation'))
            assert play['initialProjection']['players'] == recorded['initialProjection']['players']
            assert {k: v for k, v in play['result'].items() if k not in ('frames', 'telemetry')} == recorded['result']
            assert [r['event'] for r in play['climbs']] == whole_climbs(play)
            for row in play['climbs']:
                old, decision, solved = [row[k] for k in ('beforeCombination', 'eventBoundaryCombination', 'afterWholeTickCombination')]
                keeper = next(s for s in old['members'] if s != row['climber'])
                j0, e0, native = hand(old, keeper)
                j1, j2 = [hand(c, keeper)[0] for c in (decision, solved)]
                assert old['genuinelyJoined'] and row['physicalBodiesUnchangedAtDecision'] and row['physicsStepRecorded']
                assert [m['physical'] for m in old['memberState']] == [m['physical'] for m in decision['memberState']]
                assert j0 == j1 and j0['id'] == j2['id'] and j2['live']
                assert native['supportAvailability'] > .60 and abs(native['surfacePhi']) < .65 and not native['down']
                if keeper != e0['blocker']: assert native['helperSupport'] >= .25
                assert math.hypot(j2['state'].get('normalForce', 0), j2['state'].get('tangentForce', 0)) > 1e-6
                if phase:
                    self_departure(play, row); adverse_self[phase] += 1
                else:
                    assert decision['personalReads'] is None
                    adverse_remote[phase] += row['initiatingObserver'] != row['climber']
                for load in row['loads']: budgets(load)
                adverse_hands[phase] += 1
    assert adverse[0]['cohort'] == adverse[1]['cohort']
    assert adverse[0]['generatedInstrumentSha256'] == adverse[1]['generatedInstrumentSha256']
    first_changes = []
    for a, b in zip(adverse[0]['plays'], adverse[1]['plays']):
        assert all(a[k] == b[k] for k in ('id', 'initialProjection', 'initialSha256', 'profileSha256', 'players', 'offCall', 'defCall'))
        releases = {c['t'] for play in (a, b) for c in play['climbs']}
        times = {}
        for key in ('afterAllBodiesSha256', 'completedIntentSha256', 'afterAllAssignmentsSha256'):
            first = next((old['t'] for old, new in zip(a['ticks'], b['ticks']) if old[key] != new[key]), None)
            assert first in releases, (a['id'], key, first)
            times[key] = first
        first_changes.append({'id': a['id'], 'firstChangedTick': times})
    proof.update(posthocAdverseInputs=4, posthocObservedPlainControls=8, posthocContinuousLoadedKeeperJoints=adverse_hands,
                 posthocHistoricalRemoteDepartures=adverse_remote, posthocSelfDeparturesWithOwnFourCues=adverse_self,
                 posthocFirstBodyIntentJobChangesAtRelease=first_changes)
    checks = read(HERE / 'checks.json')
    assert checks['sourceSha256'] == AFTER and checks['sourceFrozen']
    for key in ('fullTypeScriptTests', 'typecheck', 'build', 'pythonTests', 'attentionTests'):
        assert checks[key]['exitCode'] == 0
    assert checks['finalDiagnosticExportCompile']['exitCode'] == 0
    assert checks['fullTypeScriptTests']['passed'] == 812 and checks['fullTypeScriptTests']['files'] == 72
    assert checks['pythonTests']['passed'] == 22 and checks['attentionTests']['passed'] == 20
    full_log = (HERE / checks['fullTypeScriptTests']['log']).read_text()
    focused_log = (HERE / checks['attentionTests']['candidateLog']).read_text()
    assert '812 passed (812)' in full_log and '72 passed (72)' in full_log and 'Unhandled Error' not in full_log
    assert '66 passed (66)' in focused_log and 'Ran 22 tests' in (HERE / checks['pythonTests']['log']).read_text()
    assert '19 failed | 1 passed (20)' in (HERE / 'tests-before.log').read_text()
    assert '1 failed | 18 passed (19)' in (HERE / 'optional-controls-before.log').read_text()
    archived = (HERE / 'controlled-tests.ts').read_text()
    assert 'readCombination' in archived and 'resolveJoinedCombination' in archived and 'world.step' in archived
    # Browser checking is recorded once. Independently bind the shipped data
    # and ZIP to the exact witnesses, rather than trusting only a green flag.
    html = ROOT / 'viewer/combo-attention.html'
    packed = json.loads(re.search(r'const REPLAY = (\{[^\n]*\});', html.read_text()).group(1).replace('<\\/', '</'))
    assert len(packed['plays']) == 12 and packed['meta']['predeterminedInputs'] == FIXED
    for phase, report in enumerate(witnesses):
        for play, rendered in zip(report['plays'], packed['plays'][phase*6:(phase+1)*6]):
            assert rendered['sourceSha256'] == report['sourceBefore'] and rendered['fixtureId'] == play['id']
            assert rendered['naturalResult'] == {k: v for k, v in play['result'].items() if k not in ('frames', 'telemetry')}
            assert rendered['eventDetails'] == play['result']['events'] and rendered['recordedPlayers'] == play['players']
            assert rendered['climbs'] == play['climbs'] and rendered['backerContacts'] == play['backerContacts']
            assert json.loads(gzip.decompress(base64.b64decode(rendered['telemetry']['data']))) == play['result']['telemetry']
    with zipfile.ZipFile(html.with_suffix('.zip')) as bundle:
        assert bundle.testzip() is None and bundle.namelist() == [html.name] and bundle.read(html.name) == html.read_bytes()
    integrity, browser = [read(HERE / 'film' / name) for name in ('film-integrity.json', 'browser-check.json')]
    assert integrity['clips'] == integrity['naturalFinishes'] == 12 and integrity['zipHtmlByteExact']
    assert integrity['htmlSha256'] == sha(html) and integrity['zipSha256'] == sha(html.with_suffix('.zip'))
    assert integrity['checkerSha256'] == sha(HERE / 'film-check.py')
    assert len(browser['clips']) == 12 and browser['pageErrors'] == [] and browser['mobileNoHorizontalOverflow']
    assert len(browser['videoExport']) == 2 and all(v['bytes'] > 0 and v['sourceStampCorrect'] for v in browser['videoExport'])
    assert [v['sourceSha256'] for v in browser['videoExport']] == [BEFORE, AFTER]
    assert all((HERE / 'film' / v['filename']).stat().st_size == v['bytes'] for v in browser['videoExport'])
    assert integrity['historicalMissingPersonalReadStateExplicit'] and integrity['attentionAttemptsNotRelabeledVisualReads']
    proof.update(fullTypeScriptTests=812, pythonTests=22, focusedTests=66, naturalShippedFilmClips=12)
    return proof


def main():
    manifest = read(HERE / 'verification-manifest.json')
    assert manifest['schema'] == 'combo-attention-verification-v1'
    assert manifest['beforeSourceSha256'] == BEFORE and manifest['finalSourceSha256'] == AFTER
    assert manifest['worldSha256'] == WORLD and manifest['collectorSha256'] == COLLECTOR and manifest['witnessSha256'] == WITNESS
    assert manifest['posthocWitnessSha256'] == ADVERSE and manifest['checks'] == read(HERE / 'checks.json')
    assert manifest['comparisonSha256'] == read(HERE / 'comparison.json')['comparisonSha256']
    assert manifest['currentCodeFiles']['scripts/diag/combo-transfer-review.ts'] == COLLECTOR
    assert manifest['currentCodeFiles']['scripts/diag/combo-attention-witness.ts'] == WITNESS
    assert manifest['currentCodeFiles']['scripts/diag/combo-attention-adverse-witness.ts'] == ADVERSE
    assert manifest['currentCodeFiles']['scripts/diag/combo-attention-compare.py'] == manifest['comparisonSha256']
    for name, expected in manifest['files'].items(): assert sha(ROOT / name) == expected, name
    proof = audit()
    assert proof == manifest['independentChecks']
    if '--engine' in sys.argv:
        for name, expected in manifest['currentCodeFiles'].items(): assert sha(ROOT / name) == expected, name
        changed = manifest['changedEngineFiles']
        assert changed == ['src/sim/behaviors/blocking.ts', 'src/sim/playsim.ts'] and manifest['addedEngineFiles'] == []
        paths = sorted((p for p in (ROOT / 'src').rglob('*') if p.is_file()), key=lambda p: p.relative_to(ROOT).as_posix())
        with tempfile.TemporaryDirectory(prefix='combo-attention-', dir='/tmp') as directory:
            scratch = Path(directory)
            for name in changed:
                path = scratch / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes((ROOT / name).read_bytes())
            subprocess.run(['git', 'apply', '--reverse', str(HERE / 'engine.patch')], cwd=scratch, check=True)
            def source_at(previous=False):
                digest = hashlib.sha256()
                for path in paths:
                    name = path.relative_to(ROOT).as_posix()
                    actual = scratch / name if previous and name in changed else path
                    digest.update(name.encode() + b'\0' + actual.read_bytes() + b'\0')
                return digest.hexdigest()
            assert source_at() == AFTER and source_at(True) == BEFORE
    print(json.dumps({'passed': True, **proof, 'assetHashes': len(manifest['files']), 'engineChecked': '--engine' in sys.argv}))


if __name__ == '__main__': main()
