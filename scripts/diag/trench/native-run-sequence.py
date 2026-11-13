#!/usr/bin/env python3
"""Read saved movement-continuity traces only; no simulation or engine imports.

Body samples belong to completed, not tick-start, time. NFL-compatible geometry
uses exact 10 Hz samples; native events/loads retain their actual tick brackets.
"""
import argparse
import gzip
import hashlib
import importlib.util
import json
import math
from pathlib import Path

_spec = importlib.util.spec_from_file_location('run_sequence_geometry', Path(__file__).with_name('run-sequence.py'))
geometry = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(geometry)


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()).hexdigest()


def read(path):
    with (gzip.open(path, 'rt') if str(path).endswith('.gz') else open(path)) as handle:
        return json.load(handle)


def normalize(raw, path):
    """Narrow #172 capture adapter; keep the original file's source/flags and IDs."""
    if 'ticks' in raw:
        return raw
    if not all(k in raw for k in ('case', 'frames', 'slots', 'profiles', 'terminal', 'censored')):
        raise ValueError('unsupported saved native schema')
    slots, frames = raw['slots'], raw['frames']
    index = {slot: i for i, slot in enumerate(slots)}
    if len(index) != len(slots) or not frames:
        raise ValueError('missing/ambiguous slot join')
    team = {**raw['setup']['offense'], **raw['setup']['defense']}
    initial = [{'idx': i, 'slot': s, 'player': team[s], 'profile': raw['profiles'][i],
                'pos': frames[0]['before'][i]['pos'], 'initialRecordedPlan': frames[0]['before'][i].get('plan')} for i, s in enumerate(slots)]
    ticks = []
    for f in frames:
        if any([a.get('slot') for a in f[channel]] != slots for channel in ('before', 'after')):
            raise ValueError('body/slot array join differs')
        reps = []
        for h in f.get('handsAfter', []):
            reps.append({'b': index[h['b']], 'd': index[h['d']], **h['hands']})
            reps.extend({'b': index[helper['h']], 'd': index[h['d']], **{k: v for k, v in helper.items() if k != 'h'}}
                        for helper in h.get('helperHands', []))
        ticks.append({'t': f['t'], 'completed': f['end'], 'before': f['before'], 'after': f['after'],
                      'requests': f['raw'], 'intents': f['final'], 'reps': reps, 'contacts': f.get('contacts', [])})
    ending = next((e for e in raw['events'] if e['type'] in {'tackle', 'touchdown', 'out_of_bounds', 'safety', 'qb_slide'}), None)
    ending_tick = next((t for t in ticks if ending and abs(t['t'] - ending['t']) < 1e-8), None)
    terminal = raw['terminal'] and not raw['censored']
    result = dict(raw.get('result') or {})
    result['duration'] = ending_tick['completed'] if terminal and ending_tick else None
    manifest_path = Path(path).with_name('manifest.json')
    manifest = read(manifest_path) if manifest_path.exists() else {}
    arm = 'baselineDiagnostic' if raw['commit'] == manifest.get('baselineDiagnostic') else 'candidate' if raw['commit'] == manifest.get('runtime') else None
    return {**raw, 'id': raw['case'], 'initial': initial, 'ticks': ticks, 'phase': 'dead' if terminal else 'live',
            'outcome': result.get('outcome'), 'gain': result.get('gain'), 'result': result,
            'source': manifest.get('sourceSha256', {}).get(arm), 'sourceCommit': raw['commit'],
            'sourceEvidence': 'Sibling #172 manifest sourceSha256 for matching producing commit' if arm else 'source hash unavailable',
            'contact': [{'t': m['t'], 'b': index[m['b']], 'd': index[m['d']], 'phase': m['kind'], 'data': m['data']}
                        for m in raw.get('moves', [])], 'endEvidence': 'explicit terminal flag and terminal event interval; never recording cutoff'}


def xy(value):
    result = [value['x'], value['y']]
    if not all(isinstance(v, (int, float)) and math.isfinite(v) for v in result):
        raise ValueError('nonfinite/missing body vector')
    return result


def common_different(a, b):
    """Compare shared captured fields; extra metadata does not manufacture divergence."""
    if isinstance(a, dict) and isinstance(b, dict):
        return any(common_different(a[k], b[k]) for k in a.keys() & b.keys())
    if isinstance(a, list) and isinstance(b, list):
        return len(a) != len(b) or any(common_different(x, y) for x, y in zip(a, b))
    return a != b


def analyze_native(path):
    raw = normalize(read(path), path)
    ticks, initial, setup = raw['ticks'], raw['initial'], raw['setup']
    if not ticks or not raw.get('inputSha256'):
        raise ValueError('empty native trace')
    by_index = {a['idx']: a for a in initial}
    if set(by_index) != set(range(len(initial))) or len({a['player']['id'] for a in initial}) != len(initial):
        raise ValueError('ambiguous actor identity join')
    ids = {i: a['player']['id'] for i, a in by_index.items()}
    offensive_ids = {a['id'] for a in setup['offense'].values()}
    defensive_ids = {a['id'] for a in setup['defense'].values()}
    if offensive_ids & defensive_ids or set(ids.values()) != offensive_ids | defensive_ids:
        raise ValueError('initial/setup team identity mismatch')
    defenders = [i for i in ids if ids[i] in defensive_ids]
    result, events = raw.get('result') or {}, raw.get('events', [])
    runner_id = result.get('stats', {}).get('rusher')
    exchanges = [e for e in events if e['type'] in {'handoff', 'pitch_catch'}]
    if runner_id is None and exchanges:
        e = exchanges[0]
        runner_id = ids[e['a'] if e['type'] == 'pitch_catch' else e['b']]
    runner = next((i for i in ids if ids[i] == runner_id), None)
    if runner is None:
        raise ValueError('actual runner identity unavailable')
    blockers = [i for i in ids if ids[i] in offensive_ids and i != runner and by_index[i]['player']['position'] != 'QB']
    last = None
    for tick in ticks:
        if not isinstance(tick['t'], (int, float)) or not math.isfinite(tick['t']) or not math.isfinite(tick['completed']):
            raise ValueError('invalid tick timestamp')
        if tick['completed'] <= tick['t'] or (last is not None and abs(tick['t'] - last) > 1e-8):
            raise ValueError('missing/nonmonotonic native interval; no imputation permitted')
        for channel in ('before', 'after'):
            if len(tick[channel]) != len(ids):
                raise ValueError('missing native actor sample')
            for body in tick[channel]:
                xy(body['pos']); xy(body['vel'])
        last = tick['completed']
    los, ball_y = setup['los'], setup['ballY']
    snap = ticks[0]['before']
    cohorts = {'front': [i for i in defenders if -.5 <= snap[i]['pos']['x'] - los <= 2 and abs(snap[i]['pos']['y'] - ball_y) <= 4.5],
               'secondLevel': [i for i in defenders if 2 < snap[i]['pos']['x'] - los <= 7 and abs(snap[i]['pos']['y'] - ball_y) <= 6.5]}
    body_samples = {round(t['completed'], 8): (t['after'], t) for t in ticks}
    body_samples[round(ticks[0]['t'], 8)] = (snap, None)
    ten_hz = [(t, bodies, tick) for t, (bodies, tick) in sorted(body_samples.items()) if abs(t * 10 - round(t * 10)) < 1e-7]
    duration = result.get('duration')
    known_end = duration if raw.get('phase') == 'dead' and isinstance(duration, (int, float)) and math.isfinite(duration) and 0 <= duration <= last + 1e-8 else None

    def event_info(event):
        if event is None:
            return None
        tick = next((t for t in ticks if abs(t['t'] - event['t']) < 1e-8), None)
        if tick is None:
            tick = next((t for t in ticks if t['t'] <= event['t'] <= t['completed']), None)
        return {'logicalTime': event['t'], 'interval': [tick['t'], tick['completed']] if tick else None,
                'completedSampleTime': tick['completed'] if tick else None, 'event': event}

    exchange = event_info(exchanges[0]) if exchanges else None
    exchange_time = exchange['completedSampleTime'] if exchange else None
    first_contact = event_info(next((e for e in events if e['type'] == 'carrier_contact' and e.get('a') == runner), None))
    phases = {'snap': ticks[0]['t'], 'exchange': exchange_time,
              'runnerLOS': next((t for t, b, _ in ten_hz if exchange_time is not None and t >= exchange_time and b[runner]['pos']['x'] >= los), None),
              'firstCarrierContact': first_contact['completedSampleTime'] if first_contact else None, 'ending': known_end}
    phases.update({name: ticks[0]['t'] + dt for name, dt in (('snapPlus0p5', .5), ('snapPlus1p0', 1.), ('snapPlus2p0', 2.), ('snapPlus3p0', 3.))})
    if exchange_time is not None:
        phases.update({name: round(exchange_time + dt, 8) for name, dt in (('exchangePlus0p5', .5), ('exchangePlus1p0', 1.))})
    else:
        phases.update(exchangePlus0p5=None, exchangePlus1p0=None)

    def snapshot(t, details=True):
        if t is None:
            return {'status': 'anchor_not_observed'}
        if known_end is not None and t > known_end + 1e-8:
            return {'status': 'play_ended_before_phase', 'requestedTime': t}
        sample = body_samples.get(round(t, 8))
        if sample is None:
            return {'status': 'recording_censor_or_missing_sample', 'requestedTime': t}
        bodies, tick = sample
        rp, rv = xy(bodies[runner]['pos']), xy(bodies[runner]['vel'])
        actors = {}
        for i in defenders:
            b = bodies[i]; p, v = xy(b['pos']), xy(b['vel'])
            distance = math.dist(p, rp)
            candidates = [{'blockerId': ids[o], **geometry.interposition(xy(bodies[o]['pos']), p, rp)} for o in blockers]
            cues = [{'observedId': ids.get(c.get('b')), 'consumer': c.get('consumer'), 'picture': c.get('picture')}
                    for c in raw.get('cues', []) if tick and abs(c['t'] - tick['t']) < 1e-8 and c.get('a') == i]
            actors[ids[i]] = {'slot': by_index[i]['slot'], 'position': [p[0] - los, p[1]], 'velocity': v,
                             'displacementFromSnap': [p[j] - xy(snap[i]['pos'])[j] for j in (0, 1)],
                             'runnerSeparation': distance, 'depthToRunner': p[0] - rp[0], 'lateralToRunner': p[1] - rp[1],
                             'closingVelocity': sum((p[j] - rp[j]) * (rv[j] - v[j]) for j in (0, 1)) / distance if distance else None,
                             'blockerGeometry': candidates}
            if details:
                actors[ids[i]].update(capturedRequest=tick['requests'][i] if tick and 'requests' in tick else None,
                                     finalIntent=tick['intents'][i] if tick and 'intents' in tick else None,
                                     retainedPlan=b.get('plan'), declarationState=tick.get('reads', [None] * len(ids))[i] if tick else None,
                                     acquiredPictures=cues)
        offensive = {ids[i]: {'position': [bodies[i]['pos']['x'] - los, bodies[i]['pos']['y']], 'velocity': xy(bodies[i]['vel']),
                             'displacementFromSnap': [bodies[i]['pos'][k] - snap[i]['pos'][k] for k in ('x', 'y')]}
                     for i in blockers}
        if details:
            for i in blockers:
                offensive[ids[i]].update(retainedPlan=bodies[i].get('plan'), capturedRequest=tick['requests'][i] if tick else None,
                                         finalIntent=tick['intents'][i] if tick else None)
        return {'status': 'observed', 'time': t, 'runner': {'id': runner_id, 'position': [rp[0] - los, rp[1]], 'velocity': rv},
                'defenders': actors, 'blockerCandidates': offensive}

    def positive_reps(tick, defender):
        return [dict(r, blockerId=ids[r['b']], defenderId=ids[r['d']]) for r in tick.get('reps', []) if r['d'] == defender and r.get('normal', 0) > 0]

    def bearing_reps(tick, defender):
        return [dict(r, blockerId=ids[r['b']], defenderId=ids[r['d']]) for r in tick.get('reps', [])
                if r['d'] == defender and any(abs(r.get(k, 0)) > 1e-9 for k in ('normal', 'tangent'))]

    arrivals, pair_episodes = {}, []
    for d in defenders:
        candidates = [(t, b, tick) for t, b, tick in ten_hz if exchange_time is not None and t >= exchange_time and (known_end is None or t <= known_end)]
        crossings = [(t, b, tick) for previous, (t, b, tick) in zip(candidates, candidates[1:])
                     if previous[1][runner]['pos']['x'] < previous[1][d]['pos']['x'] and b[runner]['pos']['x'] >= b[d]['pos']['x']]
        crossing = crossings[0] if crossings else None
        arrivals[ids[d]] = {'status': 'observed_crossing' if crossing else 'already_at_or_past_exchange' if candidates and candidates[0][1][runner]['pos']['x'] >= candidates[0][1][d]['pos']['x'] else 'not_observed',
                            'time': crossing[0] if crossing else None,
                            'crossingTimes': [sample[0] for sample in crossings],
                            'geometry': snapshot(crossing[0])['defenders'][ids[d]] if crossing else None,
                            'positiveNormalRepsInArrivalInterval': positive_reps(crossing[2], d) if crossing and crossing[2] else [],
                            'forceBearingRepsInArrivalInterval': bearing_reps(crossing[2], d) if crossing and crossing[2] else []}
        for o in blockers:
            samples = [{'frameId': round(t * 10), 'distance': math.dist(xy(b[o]['pos']), xy(b[d]['pos']))} for t, b, _ in ten_hz]
            near = geometry.proximity_episodes(samples, ending='known_terminal' if known_end is not None else 'recording_censor')
            intervals = [{'interval': [tick['t'], tick['completed']], 'normal': r['normal'], 'tangent': r.get('tangent')}
                         for tick in ticks for r in tick.get('reps', []) if r['b'] == o and r['d'] == d and r.get('normal', 0) > 0]
            bearing = [{'interval': [tick['t'], tick['completed']], 'normal': r.get('normal'), 'tangent': r.get('tangent')}
                       for tick in ticks for r in bearing_reps(tick, d) if r['b'] == o]
            if near or bearing:
                pair_episodes.append({'blockerId': ids[o], 'defenderId': ids[d], 'geometricProximityEpisodes': near,
                                      'positiveNormalRepIntervals': intervals, 'forceBearingRepIntervals': bearing})
    body_contacts = [{'interval': [tick['t'], tick['completed']], 'contact': c,
                      'otherId': ids[c['j'] if c['i'] == runner else c['i']],
                      'otherSide': 'D' if ids[c['j'] if c['i'] == runner else c['i']] in defensive_ids else 'O'}
                     for tick in ticks for c in tick.get('contacts', []) if runner in (c['i'], c['j']) and c.get('impulse', 0) > 0]
    body_contact = body_contacts[0] if body_contacts else None
    opponent_body_contact = next((c for c in body_contacts if c['otherSide'] == 'D'), None)
    contact_motion = None
    if first_contact and first_contact['interval']:
        tick = next(t for t in ticks if t['t'] == first_contact['interval'][0])
        contact_motion = {'preIntervalTime': tick['t'], 'preVelocity': xy(tick['before'][runner]['vel']),
                          'postWindows': {str(dt): snapshot(round(tick['completed'] + dt, 8), False) for dt in (.3, .5)},
                          'contactToKnownEndingSecondsBounds': [known_end - tick['completed'], known_end - tick['t']] if known_end is not None else None}
    return {'id': raw['id'], 'file': str(path), 'fileSha256': hashlib.sha256(Path(path).read_bytes()).hexdigest(),
            'producingSource': raw.get('source'), 'producingCommit': raw.get('sourceCommit'), 'sourceEvidence': raw.get('sourceEvidence', 'per-file source field'),
            'flags': raw.get('flags'), 'node': raw.get('node'), 'passiveObserverVerified': raw.get('passiveObserverVerified'),
            'inputSha256': raw.get('inputSha256'), 'setupSha256': digest(setup),
            'initialSha256': digest([{k: a[k] for k in ('idx', 'slot', 'player', 'profile', 'pos')} for a in initial]),
            'profileSha256': digest({ids[i]: by_index[i]['profile'] for i in ids}),
            'identities': {ids[i]: {'index': i, 'slot': by_index[i]['slot'], 'side': 'D' if i in defenders else 'O',
                                  'initialRecordedBehavior': by_index[i].get('behavior'),
                                  'initialRecordedPlan': by_index[i].get('initialRecordedPlan')} for i in ids},
            'cohorts': {k: [ids[i] for i in v] for k, v in cohorts.items()}, 'runnerId': runner_id,
            'installation': {'offCall': setup['offCall'], 'defCall': setup['defCall'], 'seed': setup['seed'], 'los': los, 'ballY': ball_y},
            'recording': {'firstTime': ticks[0]['t'], 'lastCompletedTime': last, 'nativeIntervals': len(ticks), 'geometrySamples10Hz': len(ten_hz), 'bodyTimestamp': 'completed'},
            'ending': {'known': known_end is not None, 'time': known_end, 'phase': raw.get('phase'), 'outcome': raw.get('outcome'), 'reportedGain': raw.get('gain') if known_end is not None else None},
            'exchange': exchange, 'phases': {name: snapshot(t) for name, t in phases.items()},
            'defenderArrivals': arrivals, 'pairs': pair_episodes,
            'nativeEvents': {'firstCarrierContact': first_contact, 'firstPositiveBodyImpulseOnRunner': body_contact,
                             'firstPositiveOpponentBodyImpulseOnRunner': opponent_body_contact,
                             'firstAcquiredWrap': event_info(next((e for e in events if e['type'] == 'tackle_wrap' and e.get('b') == runner), None)),
                             'repLifecycle': [e for e in events if e['type'].startswith('block_')],
                             'contactRefinementEnds': [e for e in raw.get('contact', []) if e.get('phase') == 'end']},
            'contactMotion': contact_motion,
            'capturedChannels': {'rng': all('rng' in t for t in ticks), 'declarationReads': any('reads' in t for t in ticks),
                                 'acquiredPictures': 'cues' in raw, 'retainedPlans': any('plan' in b for b in snap)},
            'missingStages': ['No separate complete contact/bond, spacing and readiness request stages: final intent cannot reconstruct them.',
                              'Installation comes from setup calls; recorded initial behavior and retained plans are separate captured states.',
                              'Declaration readAt age and acquired picture age are distinct; absent cues/RNG remain unavailable.'],
            'limits': ['Source-specific saved comparison; adoption status comes from the source receipt, not the filename.',
                       'Proximity/interposition is geometry; signed normal/tangent are recorded native loads, neither is a block win.',
                       'Contact-to-ending bounds are elapsed time, not continuous hold duration.']}


def compare_native(baseline, candidate):
    before, after = analyze_native(baseline), analyze_native(candidate)
    for key in ('id', 'inputSha256', 'setupSha256', 'initialSha256', 'profileSha256', 'flags', 'node'):
        if before[key] != after[key] or before[key] is None:
            raise ValueError(f'incompatible paired {key}')
    if not isinstance(before['flags'], dict) or not before['flags'] or not isinstance(before['node'], str) or not before['node']:
        raise ValueError('unknown paired flags/node are not compatible evidence')
    b, a = normalize(read(baseline), baseline), normalize(read(candidate), candidate)
    maps = [{x['player']['id']: x['idx'] for x in data['initial']} for data in (b, a)]
    first = {}
    for bt, at in zip(b['ticks'], a['ticks']):
        if (bt['t'], bt['completed']) != (at['t'], at['completed']):
            raise ValueError('paired native interval mismatch')
        for channel in ('after', 'requests', 'intents'):
            if channel in first or channel not in bt or channel not in at:
                continue
            changed = []
            for i in maps[0]:
                old, new = bt[channel][maps[0][i]], at[channel][maps[1][i]]
                if channel == 'after':
                    fields = ('pos', 'vel', 'facing', 'spin', 'energy', 'support')
                    old, new = ({k: state[k] for k in fields if k in state} for state in (old, new))
                if common_different(old, new):
                    changed.append(i)
            if changed:
                first[channel] = {'tickStart': bt['t'], 'completed': bt['completed'], 'actorIds': changed}
        if 'rng' not in first and 'rng' in bt and 'rng' in at and common_different(bt['rng'], at['rng']):
            first['rng'] = {'tickStart': bt['t'], 'completed': bt['completed']}
    phase_deltas = {}
    for phase, old in before['phases'].items():
        new = after['phases'].get(phase, {})
        if old['status'] == new.get('status') == 'observed':
            phase_deltas[phase] = {'baselineTime': old['time'], 'candidateTime': new['time'], 'sameActorDeltas': {
                i: {field: new['defenders'][i][field] - old['defenders'][i][field] for field in ('runnerSeparation', 'depthToRunner', 'lateralToRunner')}
                for i in old['defenders']}}
    return {'id': before['id'], 'baseline': before, 'candidate': after, 'firstCommonFieldDivergence': first,
            'sharedTickIntervals': min(len(b['ticks']), len(a['ticks'])), 'rngComparisonAvailable': all('rng' in t for data in (b, a) for t in data['ticks']),
            'mechanismPhaseDeltas': phase_deltas,
            'outcomesSeparate': {'baseline': before['ending'], 'candidate': after['ending']},
            'comparisonLimit': 'Shared captured fields only; absent fields are not assumed equal. Later reacting bodies/requests/RNG can differ.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', nargs='+', type=Path, required=True)
    parser.add_argument('--candidate', nargs='+', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    candidates = {normalize(read(p), p)['id']: p for p in args.candidate}
    baselines = {normalize(read(p), p)['id']: p for p in args.baseline}
    if set(baselines) != set(candidates) or len(baselines) != len(args.baseline) or len(candidates) != len(args.candidate):
        raise ValueError('duplicate/unmatched native play IDs')
    result = {'schema': 'saved-native-run-sequence-v1', 'geometryOperatorSha256': hashlib.sha256(Path(geometry.__file__).read_bytes()).hexdigest(),
              'nativeOperatorSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              'newNativeRuns': 0, 'plays': [compare_native(baselines[i], candidates[i]) for i in sorted(baselines)]}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2, allow_nan=False) + '\n')


if __name__ == '__main__':
    main()
