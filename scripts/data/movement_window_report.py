"""Actor-window helper for movement_task_report.py, not a second experiment runner."""
from collections import Counter
import copy
import hashlib
import json
import math
from pathlib import Path

from yaw_measurement import (POLICY, circular_difference, clean, connected,
                             isolated_excursions, number, pin, position_motion)

SCHEMA = 'movement-window-panel-v1'
EPS = 1e-7


def vector(value):
    if not isinstance(value, dict):
        return None
    x, y = number(value.get('x')), number(value.get('y'))
    return {'x': x, 'y': y} if x is not None and y is not None else None


def magnitude(v):
    return math.hypot(v['x'], v['y']) if v is not None else None


def heading(v, minimum_speed):
    return math.degrees(math.atan2(v['y'], v['x'])) % 360 if v and magnitude(v) > 0 and magnitude(v) >= minimum_speed else None


def body_sample(t, state):
    body = state.get('body', {})
    pos, vel, facing = vector(body.get('position')), vector(body.get('velocity')), number(body.get('facing'))
    return dict(t=number(t), x=pos['x'] if pos else None, y=pos['y'] if pos else None,
                vx=vel['x'] if vel else None, vy=vel['y'] if vel else None,
                body=math.degrees(facing) % 360 if facing is not None else None)


def angular(values, rows, joins):
    known = [(i, a) for i, a in enumerate(values) if a is not None]
    pairs = [(a, b) for a, b in zip(known, known[1:]) if b[0] == a[0] + 1
             and joins(rows[a[0]], rows[b[0]])]
    endpoint = (circular_difference(values[-1], values[0]) if values and values[0] is not None
                and values[-1] is not None else None)
    return dict(knownFrames=len(known), adjacentPairs=len(pairs), endpointDegrees=endpoint,
                observedAbsoluteArcDegrees=sum(abs(circular_difference(b[1], a[1])) for a, b in pairs) if pairs else None,
                missingOrSlowFrames=len(rows) - len(known))


def residual(velocity, direction):
    if velocity is None or direction is None:
        return None
    along = velocity['x'] * direction['x'] + velocity['y'] * direction['y']
    v = {'x': velocity['x'] - along * direction['x'], 'y': velocity['y'] - along * direction['y']}
    return {**v, 'magnitudeYdS': magnitude(v), 'alongDesiredYdS': along}


def kinematics(rows, direction, objective, requested, native_intervals=None):
    if len(rows) < 2:
        return {'status': 'unavailable', 'reason': 'fewer than two observed states', 'frames': len(rows)}
    velocities = [vector({'x': r.get('vx'), 'y': r.get('vy')}) for r in rows]
    speeds = [magnitude(v) for v in velocities]
    known_speeds = [s for s in speeds if s is not None]
    positions = [vector({'x': r.get('x'), 'y': r.get('y')}) for r in rows]
    complete = abs(rows[0]['t'] - requested[0]) <= EPS and abs(rows[-1]['t'] - requested[1]) <= EPS
    joins = (lambda a, b: (a['t'], b['t']) in native_intervals) if native_intervals is not None else (
        lambda a, b: connected(a, b, POLICY['maxGapSeconds']))
    heading_floor = 0 if native_intervals is not None else POLICY['minimumTravelSpeedYdS']
    gaps = sum(not joins(a, b) for a, b in zip(rows, rows[1:]))
    missing = sum(v is None for v in velocities) + sum(v is None for v in positions) + sum(r.get('body') is None for r in rows)
    out = dict(status='complete' if complete and not gaps and not missing else 'partial',
        frames=len(rows), actualStart=rows[0]['t'], actualEnd=rows[-1]['t'], elapsedSeconds=rows[-1]['t'] - rows[0]['t'],
        requestedBoundsObserved=complete, gapIntervals=gaps, missingRequiredValues=missing,
        entryVelocityYdS=velocities[0], exitVelocityYdS=velocities[-1],
        bodyRotation=angular([r.get('body') for r in rows], rows, joins),
        travelDirectionChange={**angular([heading(v, heading_floor) for v in velocities], rows, joins),
                               'minimumHeadingSpeedYdS': heading_floor},
        speed=dict(knownFrames=len(known_speeds), entryYdS=speeds[0], exitYdS=speeds[-1],
                   minimumYdS=min(known_speeds) if known_speeds else None,
                   entryToExitLossYdS=speeds[0] - speeds[-1] if speeds[0] is not None and speeds[-1] is not None else None,
                   entryToMinimumLossYdS=speeds[0] - min(known_speeds) if speeds[0] is not None and known_speeds else None),
        transverseVelocity=dict(direction=direction, entry=residual(velocities[0], direction), exit=residual(velocities[-1], direction)),
        orientationExcursionFrames=len(isolated_excursions(rows, POLICY)))
    rates = [(a - b) / (rows[i + 1]['t'] - rows[i]['t']) for i, (a, b) in enumerate(zip(speeds, speeds[1:]))
             if a is not None and b is not None and joins(rows[i], rows[i + 1])]
    out['peakAdjacentSpeedLossYdS2'] = max([0, *rates]) if rates else None
    if objective is None:
        out['objective'] = {'status': 'unavailable', 'reason': 'no fixed recorded or explicitly declared evaluation objective'}
    else:
        point = objective.get('point')
        distances = []
        for r, pos in zip(rows, positions):
            target = point or next((p['point'] for p in objective.get('samples', []) if abs(p['t'] - r['t']) <= EPS), None)
            if pos is not None and target is not None:
                distances.append((r['t'], math.hypot(pos['x'] - target['x'], pos['y'] - target['y'])))
        at = number(objective.get('at'))
        arrival = next((d for t, d in distances if at is not None and abs(t - at) <= EPS), None)
        closest = min(distances, key=lambda pair: pair[1]) if distances else None
        out['objective'] = dict(status='recorded-or-declared', source=objective['source'], point=point,
            mode='fixed-point' if point else 'contemporaneous-recorded-point-stream',
            distanceSamples=len(distances), closestObservedDistanceYd=closest[1] if closest else None,
            closestObservedAt=closest[0] if closest else None, arrivalAt=at, arrivalErrorYd=arrival,
            arrivalStatus='observed' if arrival is not None else 'unavailable: no recorded deadline/state at deadline')
    return out


def trace_window(case, trace, measured):
    start, end = case['window']
    steps = [s for s in trace.get('steps', []) if number(s.get('stepStart')) is not None
             and start - EPS <= s['stepStart'] < end - EPS]
    if len({s['stepStart'] for s in steps}) != len(steps):
        return {'status': 'rejected', 'reason': 'duplicate native command interval'}
    if any(any(s.get('actor', {}).get(k) != v for k, v in case['actor'].items()) for s in steps):
        return {'status': 'rejected', 'reason': 'trace actor differs from frozen actor'}
    samples, requests = [], []
    intervals = set()
    contact_known, contact_intervals, support_known, fall_intervals = 0, 0, 0, 0
    engagement_known, engaged, contact_context_known, bond_known, bonded = 0, 0, 0, 0, 0
    support_states = Counter()
    for step in steps:
        a, b = step.get('start', {}), step.get('endpoint', {})
        samples.append(body_sample(step['stepStart'], a))
        if step.get('endpointTime') is not None:
            if number(step['endpointTime']) is None or step['endpointTime'] <= step['stepStart']:
                return {'status': 'rejected', 'reason': 'invalid native elapsed interval'}
            intervals.add((step['stepStart'], step['endpointTime']))
            samples.append(body_sample(step['endpointTime'], b))
        decision = step.get('decision') or {}
        raw = decision.get('raw')
        applied = step.get('final')
        prediction = step.get('prediction')
        if prediction is None:
            prediction = decision.get('prediction')
        requests.append(dict(t=step['stepStart'], endpointTime=step.get('endpointTime'), raw=raw, applied=applied,
                             owner=decision.get('owner'), decisionEvaluated=decision.get('evaluated'),
                             ownerAfterUpdate=decision.get('ownerAfterUpdate'), rewrites=step.get('rewrites'),
                             prediction=prediction if prediction is not None else {'status': 'unavailable:not-recorded'}))
        contacts = b.get('lastStepContacts')
        if isinstance(contacts, list):
            contact_known += 1
            contact_intervals += bool(contacts)
            contact_context_known += all(k in state for state in (a, b) for k in ('engagement', 'tackleBond'))
        support = b.get('body', {}).get('support')
        if isinstance(support, dict) and support.get('state') is not None:
            support_states[support['state']] += 1
            support_known += (support['state'] in ('up', 'falling', 'down', 'rising')
                and (a.get('body', {}).get('support') or {}).get('state') in ('up', 'falling', 'down', 'rising'))
            fall_intervals += support['state'] in ('falling', 'down')
        if 'engagement' in a:
            engagement_known += 1
            engaged += a['engagement'] is not None
        if 'tackleBond' in b:
            bond_known += 1
            bonded += b['tackleBond'] is not None
    rows, failure, duplicates = clean(samples)
    context = dict(intervals=len(steps), bodyContactKnownIntervals=contact_known, bodyContactIntervals=contact_intervals,
                   supportKnownIntervals=support_known, fallingOrDownIntervals=fall_intervals,
                   engagementKnownIntervals=engagement_known, engagedIntervals=engaged, supportStates=dict(support_states),
                   contactContextKnownIntervals=contact_context_known, tackleBondKnownIntervals=bond_known, tackleBondIntervals=bonded,
                   events=[event for event in trace.get('events', []) if number(event.get('t')) is not None and start - EPS <= event['t'] <= end + EPS])
    cursor, covered = start, 0.
    for a, b in sorted(intervals):
        left, right = max(start, a, cursor), min(end, b)
        if right > left:
            covered += right - left
            cursor = right
    context['unrecordedIntervalSeconds'] = max(0., end - start - covered)
    if failure:
        return dict(status='rejected', reason=failure, context=context, requests=requests)
    rows = [r for r in rows if start - EPS <= r['t'] <= end + EPS]
    declared = case.get('desiredDirection')
    direction = vector(declared.get('vector')) if isinstance(declared, dict) and declared.get('source') else None
    direction_source = declared['source'] if direction is not None else 'entry applied request'
    if direction is None and requests:
        direction = vector((requests[0]['applied'] or {}).get('vel'))
    if direction is not None:
        speed = magnitude(direction)
        direction = {k: v / speed for k, v in direction.items()} if speed > 0 else None
    objective = copy.deepcopy(case.get('objective'))
    if objective is not None:
        if not objective.get('source') or vector(objective.get('point')) is None:
            raise ValueError('An evaluation objective needs an explicit source and finite point')
        objective['point'] = vector(objective['point'])
    else:
        goals = [(r['applied'] or {}).get('objective') for r in requests]
        if goals and all(isinstance(g, dict) and g.get('kind') == 'fixed' and vector(g.get('point')) for g in goals):
            point = goals[0]['point']
            if all(g['point'] == point for g in goals):
                objective = {'point': point, 'source': 'unchanged recorded applied objective'}
        if objective is None:
            points = [dict(t=r['t'], point=vector((r['applied'].get('objective') or {}).get('point')))
                      for r in requests if r['applied'] and vector((r['applied'].get('objective') or {}).get('point'))]
            if points:
                objective = {'samples': points, 'source': 'applied objective point at its recorded request time; no extrapolation'}
    native = kinematics(rows, direction, objective, case['window'], intervals)
    # Observe the 10Hz grid without interpolating orientation; retain the exact
    # terminal sample, whose shorter interval is handled by #255's clock logic.
    selected = [r for r in rows if abs((r['t'] - start) / .1 - round((r['t'] - start) / .1)) <= .002 / .1]
    if rows and rows[-1] not in selected:
        selected.append(rows[-1])
    sampled = copy.deepcopy(selected)
    position_motion(sampled, POLICY['maxGapSeconds'])
    for r in sampled:
        speed, angle = r.get('speed'), r.get('travel')
        # Reconstruct the secant velocity rather than borrow stored native v.
        if speed is not None and angle is not None:
            r['vx'], r['vy'] = speed * math.cos(math.radians(angle)), speed * math.sin(math.radians(angle))
        elif speed == 0:
            r['vx'], r['vy'] = 0., 0.
        else:
            r['vx'], r['vy'] = None, None
    sampled_measurement = kinematics(sampled, direction, objective, case['window'])
    points = [[r['t'], r['x'], r['y'], r['vx'], r['vy']] for r in rows]
    filtered = measured(points) if len(rows) >= 2 and all(number(r['x']) is not None and number(r['y']) is not None for r in rows) else None
    filtered_info = dict(status='measured' if filtered is not None else 'rejected', measurements=filtered,
                         reason=None if filtered is not None else 'Existing movement-task filtered operator returned no measurement')
    if filtered is not None:
        filtered_info['positionResampleWindow'] = [rows[0]['t'], rows[0]['t'] + filtered['duration']]
        filtered_info['speedDerivativeCentersWindow'] = [rows[0]['t'] + .3, rows[0]['t'] + filtered['duration'] - .3]
    return dict(status=native['status'], native=native, sampled=sampled_measurement, filteredMotion=filtered_info,
        context=context, requests=requests, directionSource=direction_source if direction else 'unavailable: zero or missing request/direction',
        exactDuplicateStatesCollapsed=duplicates)


def load_trace_files(trials, directory):
    trials = copy.deepcopy(trials)
    for trial in trials['trials']:
        if 'traceFile' not in trial:
            continue
        path = Path(directory) / trial['traceFile']
        try:
            identity = pin(path)
            trial['traceIdentity'] = identity
            if trial.get('traceSha256') and trial['traceSha256'] != identity['sha256']:
                raise ValueError('trace checksum differs')
            trial['trace'] = json.loads(path.read_text())
        except (OSError, ValueError) as error:
            trial['loadError'] = str(error)
    return trials


def build_window_report(fixtures, trials, measured):
    cases, indexed = {}, {}
    for case in fixtures['cases']:
        if case['id'] in cases or not case.get('source'):
            raise ValueError('Frozen cases need unique IDs and an explicit source')
        a, b = case['window']
        if number(a) is None or number(b) is None or a >= b or not case.get('actor'):
            raise ValueError('Frozen actor/window is unavailable or invalid')
        actor = case['actor']
        if not actor.get('playerId') and not (actor.get('team') in ('O', 'D') and actor.get('slot')):
            raise ValueError('Use a stable playerId or team/slot, never an index alone')
        direction = case.get('desiredDirection')
        if direction is not None and (not isinstance(direction, dict) or not direction.get('source') or vector(direction.get('vector')) is None):
            raise ValueError('A declared evaluation direction needs a source and finite vector')
        cases[case['id']] = case
    arms = fixtures['arms']
    if not arms or len(set(arms)) != len(arms):
        raise ValueError('Arm names must be unique and declared before comparison')
    for trial in trials['trials']:
        key = trial['caseId'], trial['arm']
        if key in indexed or key[0] not in cases or key[1] not in arms:
            raise ValueError('Duplicate or unmatched trial; frozen selection must stay paired')
        indexed[key] = trial
    rows, exposure = [], Counter()
    by_arm = {arm: Counter() for arm in arms}
    for case in cases.values():
        for arm in arms:
            trial = indexed.get((case['id'], arm))
            trace = trial.get('trace') if trial else None
            verification = trace.get('verification') if isinstance(trace, dict) else None
            verification = verification if isinstance(verification, dict) else {}
            meta = trace.get('meta') if isinstance(trace, dict) else None
            meta = meta if isinstance(meta, dict) else {}
            source_known = bool(meta.get('engineSha256')) and isinstance(meta.get('settings'), dict)
            check_keys = ('originalVsPlain', 'originalVsTrace', 'traceVsPlain')
            reference_changed = any(verification[k] is not None for k in check_keys[:2] if k in verification)
            observer_changed = verification.get('traceVsPlain') is not None
            verification_state = ('failed' if observer_changed or (arm == arms[0] and reference_changed)
                                  else 'reference-changed' if reference_changed
                                  else 'passed' if all(k in verification for k in check_keys) else 'unavailable')
            if trial is None:
                result = {'status': 'missing', 'reason': 'expected trial not supplied'}
            elif trial.get('loadError') or trial.get('rejected') or not isinstance(trace, dict):
                result = {'status': 'rejected', 'reason': trial.get('loadError') or trial.get('rejected') or 'trace unavailable'}
            elif verification_state == 'failed':
                result = {'status': 'rejected', 'reason': 'recorded restoration/trace verification differs'}
            elif case.get('inputSha256') and (not any(p is not None for p in
                 (trial.get('inputSha256'), verification.get('setupSha256'))) or any(
                 p != case['inputSha256'] for p in (trial.get('inputSha256'), verification.get('setupSha256')) if p is not None)):
                result = {'status': 'rejected', 'reason': 'native input differs from frozen case'}
            else:
                try:
                    result = trace_window(case, trace, measured)
                except (KeyError, TypeError, ValueError) as error:
                    result = {'status': 'rejected', 'reason': f'incompatible trace: {error}'}
            context = result.get('context', {})
            counts = {'expectedTrials': 1, result['status'] + 'Trials': 1,
                'unknownContactTrials': int(not context.get('intervals') or context.get('unrecordedIntervalSeconds', 0) > EPS or context.get('contactContextKnownIntervals', 0) < context['intervals']),
                'unknownSupportTrials': int(not context.get('intervals') or context.get('unrecordedIntervalSeconds', 0) > EPS or context.get('supportKnownIntervals', 0) < context['intervals']),
                'unknownSourceTrials': int(not source_known),
                'changedReferenceExecutionTrials': int(reference_changed),
                'fallingOrDownTrials': int(context.get('fallingOrDownIntervals', 0) > 0)}
            if 'filteredMotion' in result:
                counts['filteredMeasurementRejectedTrials'] = int(result['filteredMotion']['status'] == 'rejected')
            exposure.update(counts)
            by_arm[arm].update(counts)
            rows.append(dict(caseId=case['id'], category=case['category'], actor=case['actor'], requestedWindow=case['window'], arm=arm,
                caseSource=case['source'], inputSha256=case.get('inputSha256'), source=meta,
                sourceIdentityStatus='supplied' if source_known else 'unavailable',
                replayVerification=dict(status=verification_state, missingChecks=[k for k in check_keys if k not in verification],
                    referenceDifferences={k: verification[k] for k in check_keys[:2] if k in verification},
                    observerParity='unavailable' if 'traceVsPlain' not in verification else 'failed' if observer_changed else 'passed'),
                traceIdentity=(trial.get('traceIdentity') or {'kind': 'canonical inline JSON',
                    'sha256': hashlib.sha256(json.dumps(trace, sort_keys=True).encode()).hexdigest()})
                    if isinstance(trace, dict) else None, **result))
    return dict(schema='movement-window-report-v1', measurementVersion='pursuit-window-v1', inputSha256=trials['inputSha256'],
        selectionSource=fixtures.get('source'), clockPolicy=dict(native='Explicit recorded step-start/endpoint intervals',
             sampledMaximumGapSeconds=POLICY['maxGapSeconds'], sampledCadenceSeconds=.1, sampledClockToleranceSeconds=.002,
             nativeMinimumHeadingSpeedYdS=0, sampledMinimumHeadingSpeedYdS=POLICY['minimumTravelSpeedYdS']),
        frozenSelection=fixtures.get('selection'), cases=fixtures['cases'], arms=arms, exposure=dict(exposure),
        exposureByArm={arm: dict(counts) for arm, counts in by_arm.items()}, rows=rows,
        operators={name: pin(Path(__file__).with_name(name)) for name in ('movement_window_report.py', 'movement_task_report.py', 'bdb2027_movement.py', 'yaw_measurement.py')},
        definitions=dict(native='Stored native velocity, heading from nonzero v (undefined at zero; near-stop angles are sensitive and not capacity). Body facing radians converted to circular degrees. Actual recorded physics intervals, no cadence assumption; endpoint angles and contiguous shortest-step sums are separate.',
            sampled='Observed .1s grid clipped to the frozen window, plus exact terminal sample; no body interpolation. Position secants from #255, centered inside runs and one-sided at window/gap edges; heading needs >=1yd/s under that tracking-style rule. Actual elapsed intervals, not a .2s multiplier.',
            filtered='Existing movement_task_report.measured / bdb2027_movement.motion unchanged: 10Hz positional interpolation, .5s smoothed speed derivatives and trimmed edges. Resample and derivative-center spans are reported, not necessarily the native full window. Native coordinate precision is retained: no NFL/replay quantization is simulated. Rejections stay in exposure counts; peak braking is not physical capacity.',
            transverse='Residual v-(v dot u)u and signed along-axis v dot u against a sourced frozen direction, otherwise the entry applied request. Negative along-axis velocity points opposite that axis. No direction is inferred from the path; a zero/missing request has no direction.',
            speedLoss='Entry minus minimum speed and entry minus exit speed are separate. Negative entry-to-exit loss means speed gain. Peak adjacent loss includes every native impulse/contact effect; it is not motor capacity.',
            objective='Closest observed state to a sourced fixed point, or contemporaneous distance to each recorded applied objective point at request time, without extrapolation. A changing goal-point stream is not a target interception/arrival. Arrival error requires a supplied fixed point/deadline and a state at that time.',
            context='Known recorder fields only. Null/missing support is unknown; [] lastStepContacts means no contact in that native report, not proof of all contact/support absence. Categories come from the frozen case declaration, not a new causal classifier.',
            pairing='Cases, actors, windows and expected arms are frozen in the hashed fixture file. Missing/rejected/partial measurements stay in exposure counts. Numeric rows do not certify a controller intervention or profile/source compatibility.'))


def markdown(report):
    lines = ['| Case / actor | Arm | Native status | elapsed s | entry v yd/s | endpoint body / travel deg | entry−minimum speed yd/s | transverse entry / exit, evaluation axis yd/s | goal-point / arrival error yd | sampled endpoint body / travel deg | peak speed loss native / filtered yd/s² | entry raw → applied v yd/s | owner; prediction; contact/support |',
             '|---|---|---|---:|---|---|---:|---|---|---|---:|---|---|']
    def f(v):
        return 'unknown' if v is None else f'{v:.3f}'
    def rotations(m):
        return f"{f(m.get('bodyRotation', {}).get('endpointDegrees'))} / {f(m.get('travelDirectionChange', {}).get('endpointDegrees'))}"
    for row in report['rows']:
        n, s = row.get('native', {}), row.get('sampled', {})
        v = n.get('entryVelocityYdS') or {}
        cross, goal = n.get('transverseVelocity', {}), n.get('objective', {})
        actor = row['actor']
        label = ':'.join(str(actor[k]) for k in ('team', 'slot') if k in actor) or actor.get('playerId', 'unknown')
        requests, context = row.get('requests', []), row.get('context', {})
        entry = requests[0] if requests else {}
        def request(kind):
            vel = (entry.get(kind) or {}).get('vel') or {}
            return f"({f(vel.get('x'))},{f(vel.get('y'))})"
        predictions = dict(Counter(str(r['prediction'].get('status', 'provided-without-status'))
                           if isinstance(r['prediction'], dict) else 'provided-without-status' for r in requests))
        owners = list(dict.fromkeys((r.get('owner') or {}).get('kind', 'unknown') for r in requests))
        prediction_text = ', '.join(f'{key}:{value}' for key, value in predictions.items()) or 'unknown'
        notes = (f"{'→'.join(owners) or 'unknown'}; {prediction_text}; body contacts {context.get('bodyContactIntervals', 0)}"
                 f" (known {context.get('bodyContactKnownIntervals', 0)}/{context.get('intervals', 0)});"
                 f" bond {context.get('tackleBondIntervals', 0)}; support {context.get('supportStates', {}) or 'unknown'}")
        lines.append(f"| {row['caseId']} / {label} | {row['arm']} | {row['status']} | {f(n.get('elapsedSeconds'))} | ({f(v.get('x'))}, {f(v.get('y'))}) | {rotations(n)} | {f(n.get('speed', {}).get('entryToMinimumLossYdS'))} | {f((cross.get('entry') or {}).get('magnitudeYdS'))} / {f((cross.get('exit') or {}).get('magnitudeYdS'))} | {f(goal.get('closestObservedDistanceYd'))} / {f(goal.get('arrivalErrorYd'))} | {rotations(s)} | {f(n.get('peakAdjacentSpeedLossYdS2'))} / {f(((row.get('filteredMotion') or {}).get('measurements') or {}).get('peakBrake'))} | {request('raw')} → {request('applied')} | {notes} |")
    lines += ['', 'Unknown is unavailable evidence, not zero. Native/sampled states and filtered derivatives use different declared operators.',
              'Exposure (includes missing/rejected/partial trials): ' + json.dumps(report['exposure'], sort_keys=True),
              'By arm: ' + json.dumps(report['exposureByArm'], sort_keys=True), '']
    return '\n'.join(lines)
