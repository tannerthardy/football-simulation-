"""Reuse pinned mechanical/native evidence; launches no simulation."""
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path('out/directional-brace')
ACCEPTED = 'bed3c36cf08407762fed67abdf0a1651fe6ed7fc8c09b43ab3d9b33f1dfd4616'
CANDIDATE = '19f0ce52abb734528929375f9fd3aee219e619d267c5656151dab57badc6f830'


def read(path):
    p = Path(path)
    return json.loads(gzip.decompress(p.read_bytes()) if p.suffix == '.gz' else p.read_bytes())


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


before = read(ROOT / 'accepted-before.json')
after = read(ROOT / 'after.json')
assert before['source'] == ACCEPTED and after['source'] == CANDIDATE
mechanical = []
for old, new in zip(before['rows'], after['rows'], strict=True):
    assert old['input'] == new['input']
    assert old['preparedCheckpoint'] == new['preparedCheckpoint'] and old['commands'] == new['commands']
    mechanical.append(dict(input=old['input'], independentMoment=new['independentMoment'],
                           firstBefore=old['records'][0], firstAfter=new['records'][0],
                           tipBefore=old['tipAlongCouple'], tipAfter=new['tipAlongCouple'],
                           deviationBefore=old['deviationAlongCouple'], deviationAfter=new['deviationAlongCouple'],
                           completeAfterStateExact=old['after'] == new['after'],
                           momentumResidual=new['momentumResidual'], planarWorkResidual=new['planarWorkResidual']))


def changed_leaves(a, b, prefix=''):
    if a == b:
        return []
    if isinstance(a, dict) and isinstance(b, dict):
        return [x for key in sorted(a.keys() | b.keys()) for x in changed_leaves(a.get(key), b.get(key), prefix + '.' + key)]
    return [dict(field=prefix.lstrip('.'), before=a, after=b,
                 delta=b-a if isinstance(a, (int, float)) and isinstance(b, (int, float)) else None)]


def compare(old, new):
    assert old['setupHash'] == new['setupHash']
    assert old['initialProfilesAndBodiesSha256'] == new['initialProfilesAndBodiesSha256']
    assert old['initial'] == new['initial']
    assert old['error'] is None and new['error'] is None
    assert len(old['frames']) == len(new['frames'])
    first_support = first_pose = first_request = None
    issued_actors = None
    first_hand_load = None
    endpoint_actors = dict(support=None, pose=None, request=None)
    max_runner_position = max_body_position = 0
    transitions_equal = True
    for a, b in zip(old['frames'], new['frames'], strict=True):
        assert a['t'] == b['t']
        frame_actors = dict(support=[], pose=[], request=[])
        for x, y in zip(a['bodies'], b['bodies'], strict=True):
            assert x['idx'] == y['idx']
            for label, fields in [('support', ['support']), ('pose', ['pos', 'vel', 'facing', 'spin']), ('request', ['request'])]:
                differences = changed_leaves({k: x[k] for k in fields}, {k: y[k] for k in fields})
                if differences: frame_actors[label].append(x['slot'])
                event = dict(t=a['t'], actor=x['slot'], differences=differences)
                if differences and label == 'support' and first_support is None: first_support = event
                if differences and label == 'pose' and first_pose is None: first_pose = event
            distance = ((x['pos']['x']-y['pos']['x'])**2+(x['pos']['y']-y['pos']['y'])**2)**.5
            max_body_position = max(max_body_position, distance)
            if a['runner'] and x['idx'] == a['runner']['idx']: max_runner_position = max(max_runner_position, distance)
            transitions_equal &= x['support']['state'] == y['support']['state']
        for label in frame_actors:
            if endpoint_actors[label] is None and frame_actors[label]:
                endpoint_actors[label] = dict(t=a['t'], actors=frame_actors[label])
    # A post-tick frame carries the preceding interval's command. Use the
    # interval START to report when a request was actually issued.
    slots = {a['idx']: a['slot'] for a in old['initial']}
    for a, b in zip(old['physicalIntervals'], new['physicalIntervals'], strict=True):
        assert a['start'] == b['start'] and a['end'] == b['end']
        if first_hand_load is None and a['handLoads'] != b['handLoads']:
            first_hand_load = dict(start=a['start'], end=a['end'], beforeCount=len(a['handLoads']), afterCount=len(b['handLoads']),
                changed=[dict(pair=x['key'], differences=changed_leaves(x, y))
                         for x, y in zip(a['handLoads'], b['handLoads']) if x != y])
        actors = []
        for i, (x, y) in enumerate(zip(a['requests'], b['requests'], strict=True)):
            differences = changed_leaves(x, y, 'request')
            if differences:
                actors.append(slots[i])
                if first_request is None:
                    first_request = dict(t=a['start'], intervalEnd=a['end'], actor=slots[i], differences=differences)
        if actors and issued_actors is None: issued_actors = dict(t=a['start'], actors=actors)
    passages = lambda r: [(a['key'], a['bracket'], a['observation']['engagementPresent'],
                           a['observation']['geometry']['directCenterlineInterposition']) for a in r['pairArrivals']]
    hand_loads = lambda r: [i['handLoads'] for i in r['physicalIntervals']]
    return dict(id=new['id'], input=new['input'], setupHash=new['setupHash'],
                initialProfilesAndBodiesSha256=new['initialProfilesAndBodiesSha256'],
                before=dict(gain=old['gain'], ending=old['ending'], t=old['finalTime'], censor=old['censor'], firstContact=old['firstContact']),
                after=dict(gain=new['gain'], ending=new['ending'], t=new['finalTime'], censor=new['censor'], firstContact=new['firstContact']),
                firstSupportDifference=first_support, firstPoseDifference=first_pose, firstIssuedRequestDifference=first_request,
                firstIssuedRequestActors=issued_actors,
                firstReportedHandLoadDifference=first_hand_load,
                firstDivergentEndpointActors=endpoint_actors,
                endpointOrdering='First detailed record uses body-index order within a .05s endpoint; causal body ordering comes from substep bracing events, not frame array order.',
                maxLiveRunnerPositionDifferenceYd=max_runner_position, maxLiveBodyPositionDifferenceYd=max_body_position,
                supportStatesEqual=transitions_equal, handLoadHistoryExact=hand_loads(old) == hand_loads(new),
                localPassageClassificationsEqual=passages(old) == passages(new),
                lineArrivalBracketsEqual=old['lineArrival']['bracket'] == new['lineArrival']['bracket'],
                maxPlanarWorkResidual=max(abs(i['workResidual']) for i in new['physicalIntervals']))


native_before = read('out/block-strength/protection.json.gz')
native_after = read(ROOT / 'native-after.json.gz')
assert native_before['source'] == '0a5e365a07640d77a03eec95361de93bb98f917c65a5b161874ca5e4938b5c4c'
assert native_after['source'] == CANDIDATE
native = [compare(a, b) for a, b in zip(native_before['rows'], native_after['rows'], strict=True)]
fresh_before = read(ROOT / 'fresh-before-final.json.gz')
fresh_after = read(ROOT / 'fresh-after.json.gz')
assert fresh_before['source'] == ACCEPTED and fresh_after['source'] == CANDIDATE
fresh = compare(fresh_before['rows'][0], fresh_after['rows'][0])
overlay = read(ROOT / 'fresh-before-final-overlay.json')
assert overlay['candidateRestored'] and overlay['exitCode'] == 0

mass_before = read('out/block-mass-response/raw.json')
mass_after = read(ROOT / 'mass-transfer/raw.json')
assert mass_before['sourceSha256'] == ACCEPTED and mass_after['sourceSha256'] == CANDIDATE
mass = []
for new in mass_after['runs']:
    old = next(r for r in mass_before['runs'] if r['scene']['id'] == new['scene']['id'])
    assert old['scene'] == new['scene'] and old['profiles'] == new['profiles'] and old['initial'] == new['initial']
    assert old['steps'] == new['steps'] and old['final'] == new['final']
    m = [p['massKg'] for p in new['profiles']]
    com = sum(m[i]*(new['final'][i]['pos']['x']-new['initial'][i]['pos']['x']) for i in range(2))/sum(m)
    mass.append(dict(id=new['scene']['id'], completeStepsExact=True, pairComAdvanceYd=com, summary=new['summary']))

bracing = read(ROOT / 'bracing-summary.json')
assert bracing['source'] == CANDIDATE and bracing['error'] is None
assert sha(ROOT / 'native-after.json.gz') == bracing['nativeOutputSha256']
# Full per-body observations stay in ignored output. Preserve relevant events
# and explicitly identify bodies below the reporting threshold.
bracing = dict(bracing)
bracing['worlds'] = [dict({k: v for k, v in w.items() if k != 'bodies'},
    bodies=[b for b in w['bodies'] if b['significantSubsteps']],
    belowReportingThresholdActors=[b['actor'] for b in w['bodies'] if not b['significantSubsteps']])
    for w in bracing['worlds']]
cost = 0
receipts = []
settings = None
for path in sorted(ROOT.glob('*.receipt.json')):
    r = read(path)
    current_settings = dict(flags=r['flags'], worldDefaults=r['worldDefaults'], node=r['node'], platform=r['platform'], arch=r['arch'])
    settings = settings or current_settings
    assert settings == current_settings
    cost += sum(c['elapsedSeconds'] for c in r['commands'])
    receipts.append(dict(file=path.name, sha256=sha(path), **{k: r[k] for k in
        ['commit', 'sourceSha256', 'validationSha256', 'commands', 'inputsUnchanged', 'exitCode', 'trackedChanges']}))
    if path.name not in ['red.receipt.json', 'fresh-before.receipt.json']:
        assert r['exitCode'] == 0 and r['inputsUnchanged']

result = dict(protocol='directional-load-bracing-v1', acceptedBase='d682b1f474cb6ba260a7b8b1119a62919c5a2159',
              acceptedSource=ACCEPTED, candidateSource=CANDIDATE, settings=settings,
              mechanical=mechanical, native=native, fresh=fresh, massTransfer=mass,
              nativeBracing=bracing, freshBaselineSourceOverlay=overlay,
              sourceCompatibility='Cached3-native source includes only an unused optional force interface. Profiles/complete initial bodies match exactly; its omitted-input arithmetic was independently tested identical. It is retained under its actual source pin, not relabeled accepted. Mechanical/fresh/mass references use literal accepted sourcebed3c36.',
              preservedFailures=dict(red='Three expected directional failures plus one JSON -Infinity sentinel mismatch; the test restores that existing sentinel without weakening numeric comparison.',
                                     rejectedFreshReceipt='Child completed, but validation tree changed while a diagnostic file was being written. Receipt rejected; repeated after freeze.'),
              counts=dict(newFocusedChecks=7, existingFocusedChecks=30, focusedTestExecutions=44,
                          explicitWitnessRowsExecuted=21, selectedMassRowsExecuted=6,
                          nativeExecutions=6, cachedNativeComparisons=3),
              commandSeconds=cost, receipts=receipts,
              limits='No force calibration, block-win/NFL benefit, full-suite/game campaign, whole-World solver expansion or resolved historical mechanical hold is claimed. Actual-minus-legacy moment events at current states are not a paired-history counterfactual. Native cost is instrumented collection cost, not an uninstrumented speed benchmark.')
target = Path('data/reviews/current/directional-load-bracing.json')
target.write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps(dict(output=str(target), commandSeconds=cost,
                     native=[dict(id=r['id'], gain=r['after']['gain'], endpoints=r['firstDivergentEndpointActors']) for r in native],
                     fresh=fresh['after'], allSixMassControlsExact=True), indent=2))
