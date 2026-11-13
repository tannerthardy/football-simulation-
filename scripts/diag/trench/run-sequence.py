#!/usr/bin/env python3
"""Frozen, identity-preserving BDB2025 run-sequence query; geometry, not block grades.

python3 -I scripts/diag/trench/run-sequence.py --nfl-dir DIR --selection JSON --out JSON
No download, simulation, imputation, gain filter or whole-season conversion.
"""
import argparse
import csv
import hashlib
import importlib.util
import itertools
import json
import math
import time
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
HELPER_PATH = ROOT / 'scripts/data/run-game-reference.py'
_spec = importlib.util.spec_from_file_location('run_game_reference', HELPER_PATH)
reference = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(reference)
TERMINALS = {'tackle', 'out_of_bounds', 'touchdown', 'qb_sack', 'qb_strip_sack',
             'pass_outcome_incomplete', 'pass_outcome_interception', 'qb_slide', 'safety'}
BLOCKER_POSITIONS = {'C', 'G', 'T', 'OL', 'OT', 'OG', 'TE', 'WR', 'FB', 'RB'}
THRESHOLDS = {'proximityStartYd': 1.0, 'proximityContinueYd': 1.5,
              'interpositionNearYd': 1.2, 'interpositionAlongMinYd': .2,
              'interpositionOffMaxYd': .9, 'preArrivalSeconds': .3}


def file_pin(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b''):
            h.update(block)
    return {'file': Path(path).name, 'bytes': Path(path).stat().st_size, 'sha256': h.hexdigest()}


def number(value):
    try:
        value = float(value)
        return value if math.isfinite(value) else None
    except (TypeError, ValueError):
        return None


def motion(row, los=0.0):
    """Stored s/dir only. Provider angle 0=+y, 90=+x; left rotates both axes."""
    if row is None:
        return {'position': None, 'velocity': None, 'speed': None, 'validity': ['missing_sample']}
    errors = []
    x, y, speed, direction = (number(row.get(k)) for k in ('x', 'y', 's', 'dir'))
    known_direction = row.get('playDirection') in {'left', 'right'}
    valid_xy = x is not None and y is not None and -1 <= x <= 121 and -1 <= y <= 160 / 3 + 1
    if not valid_xy:
        errors.append('invalid_coordinates')
    if not known_direction:
        errors.append('invalid_play_direction')
    position = None
    if valid_xy and known_direction:
        px, py = reference.xy(row)
        position = [px - los, py]
    if speed is None or speed < 0:
        speed = None
        errors.append('invalid_speed')
    if direction is None or not 0 <= direction <= 360:
        direction = None
        errors.append('invalid_travel_direction')
    velocity = None
    if speed is not None and direction is not None and known_direction:
        a = math.radians(direction)
        sign = -1 if row['playDirection'] == 'left' else 1
        velocity = [sign * speed * math.sin(a), sign * speed * math.cos(a)]
    return {'position': position, 'velocity': velocity, 'speed': speed,
            'providerDir': direction, 'providerOrientation': number(row.get('o')),
            'validity': errors}


def interposition(blocker, defender, runner):
    """seal.py's geometric thresholds, retaining continuous values; no engagement claim."""
    if any(p is None for p in (blocker, defender, runner)):
        return {'state': 'unknown', 'pairDistance': None, 'runnerDistance': None,
                'along': None, 'offAxis': None}
    distance = math.dist(defender, runner)
    pair = math.dist(blocker, defender)
    if distance <= 1e-12:
        return {'state': 'runner_coincident_geometry', 'pairDistance': pair,
                'runnerDistance': distance, 'along': None, 'offAxis': None}
    u = [(runner[j] - defender[j]) / distance for j in (0, 1)]
    v = [blocker[j] - defender[j] for j in (0, 1)]
    along, off = sum(v[j] * u[j] for j in (0, 1)), abs(v[0] * u[1] - v[1] * u[0])
    state = 'not_near'
    if pair <= THRESHOLDS['interpositionNearYd']:
        state = 'near_not_interposed'
        if THRESHOLDS['interpositionAlongMinYd'] <= along <= distance and off <= THRESHOLDS['interpositionOffMaxYd']:
            state = 'geometrically_interposed'
    return {'state': state, 'pairDistance': pair, 'runnerDistance': distance,
            'along': along, 'offAxis': off}


def proximity_episodes(samples, start=1.0, keep=1.5, ending='recording_censor'):
    """samples: ordered {frameId,distance}; unknown breaks observation, never proves release."""
    episodes, active, pending, previous = [], None, None, None
    for sample in samples:
        f, distance = sample['frameId'], sample['distance']
        continuous = previous is not None and f == previous + 1
        if active and (not continuous or distance is None or distance > keep):
            reason = 'unknown_missing_sample' if not continuous or distance is None else 'observed_separation'
            active.update(endReason=reason, firstOutsideFrameId=f if reason == 'observed_separation' else None,
                          observedDurationSeconds=(active['lastObservedFrameId'] - active['startFrameId']) / 10)
            episodes.append(active)
            active = None
        if active:
            active['lastObservedFrameId'] = f
        elif distance is not None and distance <= start:
            if continuous and pending == f - 1:
                active = {'startFrameId': pending, 'confirmedFrameId': f, 'lastObservedFrameId': f}
                pending = None
            else:
                pending = f
        else:
            pending = None
        if not continuous and active is None and not (distance is not None and distance <= start):
            pending = None
        previous = f
    if active:
        active.update(endReason=ending, firstOutsideFrameId=None,
                      observedDurationSeconds=(active['lastObservedFrameId'] - active['startFrameId']) / 10)
        episodes.append(active)
    return episodes


def snapshot(frame, ids, sf, frames, los, initial):
    actors = {}
    for i in ids:
        m = motion(frames.get(frame, {}).get(i), los)
        base = initial.get(i)
        m['displacementFromSnap'] = ([m['position'][j] - base[j] for j in (0, 1)]
                                     if m['position'] is not None and base is not None else None)
        actors[i] = m
    return {'frameId': frame, 'seconds': (frame - sf) / 10, 'actors': actors}


def runner_arrivals(frames, ids, runner, sf, last, los, start_frame=None):
    result = {}
    start = sf if start_frame is None else start_frame
    for d in ids:
        crossings, previous, unknown = [], None, 0
        initial = None
        for f in range(start, last + 1):
            r, p = motion(frames.get(f, {}).get(runner), los)['position'], motion(frames.get(f, {}).get(d), los)['position']
            if r is None or p is None:
                unknown += 1
                previous = None
                continue
            delta = r[0] - p[0]
            if f == start:
                initial = delta
            if previous is not None and previous < 0 <= delta:
                crossings.append(f)
            previous = delta
        result[d] = {'crossingFrameIds': crossings, 'firstFrameId': crossings[0] if crossings else None,
                     'anchorFrameId': start,
                     'state': 'observed_crossing' if crossings else 'already_at_or_past_at_anchor' if initial is not None and initial >= 0
                     else 'not_observed_missing_samples' if unknown else 'not_observed',
                     'unknownFrames': unknown}
    return result


def analyze_play(rows, play, positions, rusher):
    """One exact selected play; all phases/pairs remain tied to original NFL IDs."""
    frames, original, conflicts = defaultdict(dict), {}, set()
    events, snaps, issues = defaultdict(set), set(), Counter()
    for row in rows:
        try:
            f = int(row['frameId'])
        except (ValueError, KeyError):
            issues['invalid_frame_id'] += 1
            continue
        i = 'football' if row.get('club') == 'football' else row.get('nflId', 'NA')
        if i == 'NA':
            issues['missing_player_id'] += 1
            continue
        if row.get('frameType') == 'SNAP' or row.get('event') == 'ball_snap':
            snaps.add(f)
        event = row.get('event')
        if event not in (None, '', 'NA'):
            events[event].add(f)
        key = (f, i)
        if key in original:
            if original[key] == row:
                issues['exact_duplicate_rows'] += 1
            else:
                issues['conflicting_duplicate_rows'] += 1
                conflicts.add(key)
                frames[f].pop(i, None)
            continue
        original[key] = row
        frames[f][i] = row
    result = {'status': 'excluded', 'issues': dict(issues), 'events': {k: sorted(v) for k, v in sorted(events.items())},
              'rawRowCount': len(rows), 'conflictingDuplicates': [{'frameId': f, 'nflId': i} for f, i in sorted(conflicts)]}
    if len(snaps) != 1:
        return {**result, 'exclusion': 'missing_or_ambiguous_snap'}
    sf = next(iter(snaps))
    snap = frames[sf]
    if 'football' not in snap or rusher not in snap:
        return {**result, 'exclusion': 'missing_ball_or_rusher_at_snap'}
    ball = motion(snap['football'])['position']
    if ball is None:
        return {**result, 'exclusion': 'invalid_ball_at_snap'}
    offense = play['possessionTeam']
    ids = sorted(i for i in snap if i != 'football')
    defenders = [i for i in ids if snap[i]['club'] != offense]
    if len(ids) != 22 or len(defenders) != 11:
        return {**result, 'exclusion': 'incomplete_or_ambiguous_snap_teams'}
    los, ball_y = ball
    initial = {i: motion(snap[i], los)['position'] for i in ids}
    last_recorded = max(frames)
    terminal_candidates = sorted({f for event in TERMINALS for f in events[event] if f >= sf})
    known_end = terminal_candidates[0] if len(terminal_candidates) == 1 else None
    until = min(last_recorded, terminal_candidates[0]) if terminal_candidates else last_recorded
    end_state = 'known_terminal' if known_end is not None else 'ambiguous_terminal' if terminal_candidates else 'recording_censor'
    possession_events = {event: sorted(f for f in fs if sf <= f <= until) for event, fs in events.items()
                         if 'fumble' in event.lower() or 'interception' in event.lower()}
    possession_frames = [f for fs in possession_events.values() for f in fs]
    boundary = end_state
    if possession_frames and min(possession_frames) < until:
        until, boundary = min(possession_frames), 'possession_censor'
    first_event = lambda name: next(iter(events[name])) if len(events[name]) == 1 and sf <= next(iter(events[name])) <= until else None
    handoff, contact = first_event('handoff'), first_event('first_contact')
    arrival_anchor = handoff if handoff is not None else sf if positions.get(rusher) == 'QB' else None
    raw_los_frames = [f for f in range(sf, until + 1) if (p := motion(frames.get(f, {}).get(rusher), los)['position']) is not None and p[0] >= 0]
    los_frames = [f for f in raw_los_frames if arrival_anchor is not None and f >= arrival_anchor]
    first_los = los_frames[0] if los_frames else None
    phase_frames = {'snap': sf, 'handoff': handoff, 'firstLOS': first_los, 'firstContact': contact,
                    'knownEnd': known_end}
    for name, offset in (('snapPlus0p5', 5), ('snapPlus1p0', 10),
                         ('snapPlus2p0', 20), ('snapPlus3p0', 30)):
        phase_frames[name] = sf + offset
    for name, offset in (('exchangePlus0p5', 5), ('exchangePlus1p0', 10)):
        phase_frames[name] = handoff + offset if handoff is not None else None
    phases, phase_availability = {}, {}
    for name, f in phase_frames.items():
        state = ('anchor_not_observed' if f is None else 'after_' + boundary if f > until
                 else 'missing_exact_frame' if f not in frames or not frames[f] else 'available')
        phases[name] = snapshot(f, ids, sf, frames, los, initial) if state == 'available' else None
        phase_availability[name] = {'state': state, 'requestedFrameId': f,
                                    'requestedSeconds': (f - sf) / 10 if f is not None else None,
                                    'expectedActors': len(ids)}
        if phases[name] is not None:
            observations = phases[name]['actors'].values()
            phase_availability[name].update(
                observedCoordinates=sum(a['position'] is not None for a in observations),
                observedVelocities=sum(a['velocity'] is not None for a in observations))
    validity = {}
    for i in ids:
        counters, bad = Counter(), defaultdict(list)
        for f in range(sf, until + 1):
            m = motion(frames.get(f, {}).get(i), los)
            for reason in m['validity']:
                counters[reason] += 1
                bad[reason].append(f)
        validity[i] = {'counts': dict(counters), 'frameIds': dict(bad)}
    alignment = {}
    for d in defenders:
        p = initial[d]
        alignment[d] = ('unknown' if p is None else 'front_alignment_proxy' if -.5 <= p[0] <= 2 and abs(p[1] - ball_y) <= 4.5
                        else 'second_level_alignment_proxy' if 2 < p[0] <= 7 and abs(p[1] - ball_y) <= 6.5 else 'other')
    arrivals = (runner_arrivals(frames, defenders, rusher, sf, until, los, arrival_anchor)
                if arrival_anchor is not None else {d: {'crossingFrameIds': [], 'firstFrameId': None,
                                                       'anchorFrameId': None, 'state': 'exchange_not_observed',
                                                       'unknownFrames': None} for d in defenders})
    for item in arrivals.values():
        if item['state'] == 'not_observed':
            item['state'] = 'not_reached_' + boundary
    blockers = [i for i in ids if i != rusher and snap[i]['club'] == offense and positions.get(i) in BLOCKER_POSITIONS]
    pairs = []
    for d in defenders:
        arrival = arrivals[d]['firstFrameId']
        for b in blockers:
            distances = []
            for f in range(sf, until + 1):
                bp, dp = motion(frames.get(f, {}).get(b), los)['position'], motion(frames.get(f, {}).get(d), los)['position']
                distances.append({'frameId': f, 'distance': math.dist(bp, dp) if bp is not None and dp is not None else None})
            episodes = proximity_episodes(distances, ending=boundary)
            at = None
            if arrival is not None:
                state = snapshot(arrival, [b, d, rusher], sf, frames, los, initial)['actors']
                at = interposition(state[b]['position'], state[d]['position'], state[rusher]['position'])
                window = [s for s in distances if arrival - 3 <= s['frameId'] <= arrival]
                observed = [s for s in window if s['distance'] is not None]
                near = sum(s['distance'] <= 1.5 for s in observed)
                at.update(frameId=arrival, seconds=(arrival - sf) / 10,
                          blockerPosition=state[b]['position'], defenderPosition=state[d]['position'],
                          runnerPosition=state[rusher]['position'], blockerVelocity=state[b]['velocity'],
                          defenderVelocity=state[d]['velocity'], runnerVelocity=state[rusher]['velocity'],
                          blockerDisplacementFromSnap=state[b]['displacementFromSnap'],
                          defenderDisplacementFromSnap=state[d]['displacementFromSnap'],
                          preWindowExpectedFrames=4, preWindowObservedFrames=len(observed),
                          preWindowNearFrames=near, preWindowObservationFraction=len(observed) / 4,
                          preWindowNearFractionOfObserved=near / len(observed) if observed else None,
                          continuousObservedNear=len(observed) == 4 and near == 4)
            first = episodes[0]['startFrameId'] if episodes else None
            order = ('no_observed_proximity' if first is None else 'arrival_not_observed' if arrival is None
                     else 'before_arrival' if first < arrival else 'at_arrival' if first == arrival else 'after_arrival')
            pairs.append({'blockerId': b, 'defenderId': d, 'defenderAlignment': alignment[d],
                          'episodes': episodes, 'firstProximityVersusArrival': order,
                          'atRunnerArrival': at})
    pursuit = {}
    for d in defenders:
        observations = {}
        for name, phase in phases.items():
            if phase is None:
                continue
            r, a = phase['actors'][rusher], phase['actors'][d]
            if r['position'] is None or a['position'] is None:
                observations[name] = {'state': 'missing_geometry'}
                continue
            delta = [r['position'][j] - a['position'][j] for j in (0, 1)]
            distance = math.hypot(*delta)
            closing = (sum((a['velocity'][j] - r['velocity'][j]) * delta[j] for j in (0, 1)) / distance
                       if distance > 1e-12 and a['velocity'] is not None and r['velocity'] is not None else None)
            observations[name] = {'separation': distance, 'defenderAheadX': -delta[0],
                                  'lateralSeparation': -delta[1], 'closingSpeed': closing,
                                  'defenderVelocity': a['velocity'], 'runnerVelocity': r['velocity']}
        pursuit[d] = observations
    contact_result = None
    if contact is not None:
        def speed_sample(f):
            if f < sf:
                return {'frameId': f, 'state': 'before_recorded_snap', 'speed': None}
            if f > until:
                return {'frameId': f, 'state': 'earlier_' + boundary, 'speed': None}
            m = motion(frames.get(f, {}).get(rusher), los)
            return {'frameId': f, 'state': 'valid' if m['position'] is not None and m['speed'] is not None else 'missing_or_invalid_sample',
                    'speed': m['speed'] if m['position'] is not None else None}
        cp = phases['firstContact']['actors'][rusher]['position']
        ep = phases['knownEnd']['actors'][rusher]['position'] if phases['knownEnd'] else None
        contact_result = {'label': 'NFL annotated first_contact; initiator and continuous hold unknown',
                          'strictlyPreContact': speed_sample(contact - 1),
                          'post0p3': speed_sample(contact + 3), 'post0p5': speed_sample(contact + 5),
                          'contactToKnownEndingSeconds': (known_end - contact) / 10 if known_end is not None and boundary != 'possession_censor' else None,
                          'physicalNetProgressAfterLabel': ep[0] - cp[0] if ep is not None and cp is not None else None,
                          'creditedProgressAfterLabel': float(play['yardsGained']) - cp[0] if cp is not None else None}
    safe_snap = {i: row for i, row in snap.items() if motion(row, los)['position'] is not None}
    return {**result, 'status': 'analyzed', 'exclusion': None, 'snapFrameId': sf,
            'lastRecordedFrameId': last_recorded, 'analysisThroughFrameId': until,
            'rawFirstLOSFrameId': raw_los_frames[0] if raw_los_frames else None,
            'carrierObservationStartFrameId': arrival_anchor,
            'ending': {'state': end_state, 'knownFrameId': known_end, 'candidateFrameIds': terminal_candidates,
                       'types': sorted(k for k in TERMINALS if events[k])},
            'analysisBoundary': boundary, 'possessionChangingEvents': possession_events,
            'concept': play.get('pff_runConceptPrimary'), 'rushLocationType': play.get('rushLocationType'),
            'frontProxy': reference.front_proxy(safe_snap, positions, offense, los, ball_y),
            'officialYards': float(play['yardsGained']), 'carrierId': rusher, 'ballAtSnap': [los, ball_y],
            'actors': [{'nflId': i, 'position': positions.get(i), 'team': snap[i]['club'],
                        'side': 'D' if i in defenders else 'O', 'alignment': alignment.get(i)} for i in ids],
            'phases': phases, 'phaseAvailability': phase_availability,
            'sampleValidity': validity, 'runnerArrivals': arrivals,
            'candidatePairs': pairs, 'pursuit': pursuit, 'contact': contact_result,
            'coverage': {'defenders': len(defenders), 'candidateBlockers': len(blockers), 'candidatePairs': len(pairs),
                         'firstLOSObserved': first_los is not None, 'firstContactObserved': contact is not None,
                         'knownEnding': known_end is not None, 'analyzedFrames': until - sf + 1}}


def load_selection(path):
    selection = json.loads(Path(path).read_text())
    keys = [(str(p['gameId']), str(p['playId'])) for p in selection['plays']]
    if not keys or len(keys) != len(set(keys)):
        raise ValueError('Selection must contain nonempty unique exact gameId/playId inputs')
    return selection


def verify_sources(directory, selection):
    expected = selection.get('sources', [])
    if isinstance(expected, dict):
        expected = [{'file': name, **pin} for name, pin in expected.items()]
    required = {'plays.csv', 'players.csv', 'player_play.csv'} | {f"tracking_week_{int(p['week'])}.csv" for p in selection['plays']}
    provided = {Path(p.get('file', p.get('path', ''))).name: p for p in expected}
    if not required <= provided.keys():
        raise ValueError('Selection is missing expected source hashes: ' + ','.join(sorted(required - provided.keys())))
    actual = []
    for name in sorted(required):
        pin = file_pin(Path(directory) / name)
        if any(pin[k] != provided[name][k] for k in ('bytes', 'sha256')):
            raise ValueError('Source checksum/size mismatch: ' + name)
        actual.append(pin)
    return actual


def summarize(plays):
    groups = defaultdict(list)
    for p in plays:
        if p['status'] == 'analyzed':
            groups[p.get('concept') or 'unknown'].append(p)
    cells = {}
    for concept, rows in sorted(groups.items()):
        lateral, absolute_lateral, interposed = [], [], []
        geometry_exposure = Counter()
        for p in rows:
            front = [a['nflId'] for a in p['actors'] if a['alignment'] == 'front_alignment_proxy']
            phase = p['phases']['firstLOS']
            values = [phase['actors'][i]['displacementFromSnap'][1] for i in front
                      if phase and phase['actors'][i]['displacementFromSnap'] is not None]
            if values:
                lateral.append(sum(values) / len(values))
                absolute_lateral.append(sum(abs(v) for v in values) / len(values))
            arrivals = [d for d, r in p['runnerArrivals'].items() if r['firstFrameId'] is not None]
            complete = []
            for d in arrivals:
                observations = [q['atRunnerArrival'] for q in p['candidatePairs'] if q['defenderId'] == d]
                geometry_exposure['arrivedDefenders'] += 1
                if observations and all(o is not None and o['state'] != 'unknown' for o in observations):
                    complete.append(any(o['state'] == 'geometrically_interposed' for o in observations))
                    geometry_exposure['fullyObservedDefenderArrivals'] += 1
                else:
                    geometry_exposure['incompleteOrUnknownDefenderArrivals'] += 1
            if complete:
                interposed.append(sum(complete) / len(complete))
        cells[concept] = {'plays': len(rows), 'knownEndings': sum(p['coverage']['knownEnding'] for p in rows),
                          'firstLOSObserved': sum(p['coverage']['firstLOSObserved'] for p in rows),
                          'firstContactObserved': sum(p['coverage']['firstContactObserved'] for p in rows),
                          'playMeanFrontSignedLateralDisplacementAtLOS': reference.stats(lateral),
                          'playMeanFrontAbsoluteLateralDisplacementAtLOS': reference.stats(absolute_lateral),
                          'arrivalGeometryExposure': dict(geometry_exposure),
                          'playFractionFullyObservedArrivalDefendersWithAnyGeometricInterposition': reference.stats(interposed)}
    return {'selected': len(plays), 'analyzed': sum(p['status'] == 'analyzed' for p in plays),
            'exclusions': dict(Counter(p['exclusion'] for p in plays if p.get('exclusion'))),
            'byProviderConcept': cells, 'weighting': 'Each value summarized above is one per-play mean/fraction; actor/pair exposure remains separate.'}


def run_query(args):
    args._started = getattr(args, '_started', time.perf_counter())
    selection = load_selection(args.selection)
    args._selection = selection
    required = {'plays.csv', 'players.csv', 'player_play.csv'} | {f"tracking_week_{int(p['week'])}.csv" for p in selection['plays']}
    missing = [name for name in sorted(required) if not (args.nfl_dir / name).is_file()]
    if missing:
        return write_failure(args, 'missing_input', 'Required raw NFL files are unavailable', missing)
    sources = verify_sources(args.nfl_dir, selection)
    selected = {(str(p['gameId']), str(p['playId'])): p for p in selection['plays']}
    read = lambda name: csv.DictReader((args.nfl_dir / name).open(newline=''))
    positions = {r['nflId']: r['position'] for r in read('players.csv')}
    meta = {(r['gameId'], r['playId']): r for r in read('plays.csv') if (r['gameId'], r['playId']) in selected}
    rushers = defaultdict(set)
    for row in read('player_play.csv'):
        key = row['gameId'], row['playId']
        if key in selected and row.get('hadRushAttempt') in reference.TRUTH:
            rushers[key].add(row['nflId'])
    found = {}
    args._progress = found
    for week in sorted({int(p['week']) for p in selection['plays']}):
        wanted = {k for k, v in selected.items() if int(v['week']) == week}
        with (args.nfl_dir / f'tracking_week_{week}.csv').open(newline='') as handle:
            for key, rows in itertools.groupby(csv.DictReader(handle), lambda r: (r['gameId'], r['playId'])):
                if key not in wanted:
                    continue
                row = {'gameId': key[0], 'playId': key[1], 'week': week}
                if key not in meta or not reference.is_run(meta[key]):
                    row.update(status='excluded', exclusion='missing_or_ineligible_run_metadata')
                elif len(rushers[key]) != 1:
                    row.update(status='excluded', exclusion='missing_or_multiple_labeled_rushers')
                else:
                    try:
                        row.update(analyze_play(list(rows), meta[key], positions, next(iter(rushers[key]))))
                    except (ValueError, KeyError, csv.Error) as error:
                        row.update(status='excluded', exclusion='selected_play_reader_error', error=str(error))
                found[key] = row
                if wanted <= found.keys():
                    break
    plays = [found.get(k, {'gameId': k[0], 'playId': k[1], 'week': selected[k]['week'],
                          'status': 'excluded', 'exclusion': 'selected_tracking_not_found'}) for k in selected]
    output = {'schema': 'run-sequence-reference-v1', 'status': 'complete', 'selection': file_pin(args.selection),
              'requested': len(selection['plays']), 'trackingGroupsAttempted': len(found),
              'measured': sum(p['status'] == 'analyzed' for p in plays),
              'sources': sources, 'operator': file_pin(Path(__file__)), 'dependencies': [file_pin(HELPER_PATH)],
              'summary': summarize(plays), 'plays': plays, 'thresholds': THRESHOLDS,
              'definitions': {'clock': 'frameId differences at 10Hz; snap-relative. No interpolated or carried samples.',
                              'coordinates': 'Offense attacks +x; left rotates both axes; x relative to ball at snap.',
                              'velocity': 'Provider s/dir only, vx=s*sin(dir), vy=s*cos(dir); both rotate for left. Provider smoothing remains unknown.',
                              'runnerArrival': 'At/after observed handoff (snap for a labeled QB rush), first consecutive-valid change from runner behind to at/past this same defender longitudinal plane; already-past and multiple crossings retained.',
                              'fixedPhases': 'Exact10Hz frames at snap+.5/1/2/3s and observed exchange+.5/1s; unavailable after analysis boundary or a missing frame, never clamped. Actor coordinate/velocity exposure is separate.',
                              'secondLevel': 'Fixed snap geometry:2<x<=7yd pastLOS and abs(y-ballY)<=6.5yd, matching the existing timeline/native operator. This is not an installed responsibility.',
                              'pairs': 'All eligible noncarrier OL/TE/WR/FB/RB by snap identity against each defender; candidates are not assigned or engaged blockers.',
                              'ending': 'Exactly one distinct actual terminal frame establishes known ending. Multiple terminal frames stay ambiguous; last recording alone is censored.',
                              'possession': 'Fixed labeled rusher identity; observed fumble/interception stops carrier-mechanism follow-up at that frame rather than assuming unchanged possession.',
                              'contact': 'Annotated NFL first_contact, not identified contactor or grip; strictly prior-frame entry speed; valid live exact post checkpoints.',
                              'validity': 'Finite coordinates within field plus1yd gross tolerance; finite nonnegative stored speed; dir0–360. Unknown stays unknown.'},
              'limits': ['Selected plays establish geometry/timing examples, not NFL population rates or causal technique grades.',
                         'Run assignment, hand/grip force, keeper security, gaze and continuous hold are not observable.',
                         'Longitudinal plane crossing is a local timing anchor, not a legal contact or successful protection label.',
                         'Known ending or recording cutoff bounds a proximity episode; it does not prove physical release.',
                         'Candidate pair interposition and sustained proximity are geometric proxies; offensive and defensive wins require witness review.',
                         'Tracking is streamed in source play-group order until exact selected IDs are found; later noncontiguous duplicates outside the scan are not assessed.']}
    output['queryElapsedSecondsBeforeWrite'] = time.perf_counter() - args._started
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, indent=1, allow_nan=False) + '\n')
    print(json.dumps(output['summary'], sort_keys=True))
    return 0


def write_failure(args, reason, error, missing=None):
    selection = getattr(args, '_selection', {})
    progress = getattr(args, '_progress', {})
    requested = selection.get('plays', [])
    plays = [progress.get((str(p['gameId']), str(p['playId'])),
                          {**p, 'status': 'unrun', 'exclusion': 'not_attempted_' + reason}) for p in requested]
    output = {'schema': 'run-sequence-reference-v1', 'status': 'blocked', 'reason': reason,
              'error': error, 'missingFiles': missing or [], 'requested': len(requested),
              'measured': sum(p['status'] == 'analyzed' for p in plays),
              'trackingGroupsAttempted': len(progress), 'plays': plays,
              'queryElapsedSecondsBeforeWrite': max(0.0, time.perf_counter() - getattr(args, '_started', time.perf_counter())),
              'operator': file_pin(Path(__file__)), 'summary': summarize(plays),
              'limits': ['A blocked query is not an empty NFL cohort or evidence that the mechanism is absent.']}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, indent=1, allow_nan=False) + '\n')
    print(json.dumps({k: output[k] for k in ('status', 'reason', 'requested', 'measured', 'missingFiles')}))
    return 2


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--nfl-dir', type=Path, required=True)
    parser.add_argument('--selection', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    args._started = time.perf_counter()
    try:
        return run_query(args)
    except (OSError, ValueError, KeyError, csv.Error) as error:
        return write_failure(args, 'source_verification_or_reader_error', str(error))


if __name__ == '__main__':
    raise SystemExit(main())
