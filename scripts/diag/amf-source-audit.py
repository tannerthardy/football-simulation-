#!/usr/bin/env python3
"""Audit one Hudl/StatsBomb game without importing the engine or BDB query.

Inputs are original provider files, kept outside the simulation repository.
This is a source/observability audit, not a matched football comparison.
"""
import argparse
from collections import Counter, defaultdict
import csv
import gzip
import hashlib
import json
import math
from pathlib import Path
import statistics


def tags(row):
    return set(next(csv.reader([row['event_types'].strip('{}')])) or [])


def finite(step):
    return all(isinstance(step.get(k), (int, float)) and math.isfinite(step[k])
               for k in ('x', 'y'))


def count(values):
    return dict(sorted(Counter(values).items(), key=lambda x: str(x[0])))


def summary(values):
    a = sorted(values)
    return {'min': a[0], 'median': statistics.median(a), 'max': a[-1]} if a else None


def audit(root, tracking, plays, events, lft):
    paths = [root / p for p in (tracking, plays, events, lft)]
    pins = [{'path': str(p.relative_to(root)), 'bytes': p.stat().st_size,
             'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths]
    body = gzip.decompress(paths[0].read_bytes())
    game = json.loads(body)
    game_id = str(game['game_id'])
    with paths[1].open() as f:
        all_plays = list(csv.DictReader(f))
    with paths[2].open() as f:
        event_game_ids, ee = set(), []
        for event in csv.DictReader(f):
            event_game_ids.add(event['game_id'])
            if event['game_id'] == game_id:
                ee.append(event)
    with paths[3].open() as f:
        low = list(csv.DictReader(f))
    pp = [p for p in all_plays if p['game_id'] == game_id]
    assert all(x['game_id'] == game_id for x in low)
    hp = {p['play_uuid']: p for p in game['plays']}
    assert len(hp) == len(game['plays'])
    assert set(hp) <= {p['play_uuid'] for p in pp}
    event_by_id = {e['event_uuid']: e for e in ee}
    assert len(event_by_id) == len(ee)
    assert {x['event_uuid'] for x in low} <= set(event_by_id)
    tracks = [t for p in hp.values() for t in p['tracks']]
    steps = [s for t in tracks for s in t['steps']]
    good = [s for s in steps if finite(s)]
    deltas = [y['timestamp'] - x['timestamp'] for t in tracks
              for x, y in zip(t['steps'], t['steps'][1:])]
    assert abs(statistics.median(deltas) - 1e6 / game['frequency']) < 1
    lft_by_event = defaultdict(list)
    for row in low:
        lft_by_event[row['event_uuid']].append(row)
    by_play = defaultdict(list)
    for e in ee:
        by_play[e['play_uuid']].append(e)
    phase_counts = defaultdict(Counter)
    actor_samples = defaultdict(Counter)
    duration = []
    full_grid = Counter()
    event_time_error = []
    coordinate_residuals = []
    examples = []
    selected = set()
    # Select by GSIS order and label presence, never by a desired yardage result.
    for p in sorted(hp.values(), key=lambda p: p['gsis_play_id']):
        ev = by_play[p['play_uuid']]
        snap = next((e for e in ev if 'Snap' in tags(e)), None)
        if snap is None:
            continue
        snap_time = float(snap['event_video_timestamp'])
        grid = defaultdict(set)
        for t in p['tracks']:
            for s in t['steps']:
                if finite(s) and not s.get('calibration_fault', False):
                    grid[s['timestamp']].add(t['player']['player_id'])
                event_time_error.append(abs(s['timestamp'] / 1e6 - snap_time - s['time_since_snap']))
        all_times = {s['timestamp'] for t in p['tracks'] for s in t['steps']}
        full_grid['frames'] += len(all_times)
        full_grid['frames_22_finite_unflagged'] += sum(len(grid[t]) == 22 for t in all_times)
        ts = [s['time_since_snap'] for t in p['tracks'] for s in t['steps']]
        duration.append((min(ts), max(ts)))
        tm = {str(t['player']['player_id']): t for t in p['tracks'] if t.get('player')}
        for e in ev:
            et = tags(e)
            origin = event_by_id.get(e.get('preceding_ball_origin_uuid'), {})
            phase = ('snap' if 'Snap' in et else 'release' if 'Pass' in et else
                     'pass_catch_attempt' if 'Catch' in et and origin and 'Pass' in tags(origin) else
                     'handoff' if 'Handoff' in et else
                     'tackle_attempt' if 'Tackle Attempt' in et else
                     'tackle' if 'Tackle' in et else None)
            if not phase:
                continue
            when = float(e['event_video_timestamp'])
            phase_counts[phase]['events'] += 1
            present = 0
            for t in p['tracks']:
                nearest = min(t['steps'], key=lambda s: abs(s['timestamp']/1e6 - when), default=None)
                if nearest and abs(nearest['timestamp']/1e6 - when) <= 0.017 and finite(nearest) and not nearest.get('calibration_fault', False):
                    present += 1
            phase_counts[phase]['all_22_finite_unflagged_within_17ms'] += present == 22
            pid = str(int(float(e['player_id']))) if e['player_id'] else ''
            t = tm.get(pid)
            near = min(t['steps'], key=lambda s: abs(s['timestamp']/1e6 - when), default=None) if t else None
            actor_samples[phase]['events'] += 1
            valid = bool(near and abs(near['timestamp']/1e6 - when) <= 0.017 and finite(near) and not near.get('calibration_fault', False))
            actor_samples[phase]['actor_sample_valid'] += valid
            if not valid:
                reason = ('no_actor_track' if not t else 'no_nearby_timestamp' if not near or abs(near['timestamp']/1e6-when)>0.017
                          else 'nonfinite_xy' if not finite(near) else 'calibration_fault')
                actor_samples[phase][reason] += 1
            if valid and e['event_x'] and e['event_y']:
                x, y = near['x'], near['y']
                if not p['offense_left_to_right']:
                    x, y = 100-x, 160/3-y
                coordinate_residuals.append(math.hypot(x-float(e['event_x']), y-float(e['event_y'])))
        label = ('first_pass_with_broken_and_successful_tackles' if p['play_type'] == 'Pass' and
                 any('Tackle Broken' in tags(e) for e in ev) and any('Tackle' in tags(e) and e['event_success']=='True' for e in ev) else
                 'first_rush' if p['play_type']=='Rush' else
                 'first_pass_with_pressure' if p['play_type']=='Pass' and any('Pressure' in tags(e) for e in ev) else None)
        if label and label not in selected:
            selected.add(label)
            intervals = [(s['time_since_snap']) for t in p['tracks'] for s in t['steps']]
            examples.append({'selection': label, 'play_uuid': p['play_uuid'], 'gsis_play_id': p['gsis_play_id'],
                             'play_type': p['play_type'], 'time_since_snap_range': [min(intervals),max(intervals)],
                             'event_type_counts': count(tag for e in ev for tag in tags(e)),
                             'player_ids': sorted(tm),
                             'all_track_on_camera_ratio': all(t['on_camera_ratio']==1 for t in p['tracks'])})
    attempts = [e for e in ee if 'Tackle Attempt' in tags(e)]
    engagements = [e for e in ee if 'Engagement Start' in tags(e)]
    low_times = defaultdict(set)
    for event_id in lft_by_event:
        e = event_by_id[event_id]
        if e['play_uuid']:
            low_times[e['play_uuid']].add(float(e['event_video_timestamp']))
    low_deltas = [b-a for times in low_times.values()
                  for a,b in zip(sorted(times),sorted(times)[1:])]
    source_coverage = count(p['play_type'] for p in pp)
    out = {
        'schema': 'amf-single-game-source-audit-v1', 'pins': pins,
        'game_id': game['game_id'], 'nfl_game_id': game['nfl_game_id'], 'frequency':game['frequency'], 'units':game['units'],
        'decompressed_tracking_bytes': len(body),
        'season_label_file_game_counts': {'plays':len({p['game_id'] for p in all_plays}), 'events':len(event_game_ids)},
        'game_play_labels': source_coverage, 'tracking_plays':len(hp),
        'tracking_play_types': count(p['play_type'] for p in hp.values()),
        'untracked_play_types': count(p['play_type'] for p in pp if p['play_uuid'] not in hp),
        'tracks':len(tracks), 'tracks_per_play':count(len(p['tracks']) for p in hp.values()),
        'distinct_player_ids_per_hf_play':count(len({t['player']['player_id'] for t in p['tracks']}) for p in hp.values()),
        'player_coverage_count_provider':count(p['player_coverage_count'] for p in hp.values()),
        'non_player_tracks':sum(not t.get('player') for t in tracks),
        'steps':len(steps), 'nonfinite_or_null_xy':len(steps)-len(good),
        'step_timestamp_delta_raw':count(deltas), 'nonpositive_timestamp_deltas':sum(d<=0 for d in deltas),
        'gaps_over_34ms':sum(d>34000 for d in deltas),
        'on_camera_ratio': summary(t['on_camera_ratio'] for t in tracks),
        'tracks_with_on_camera_ratio_under_1':sum(t['on_camera_ratio']<1 for t in tracks),
        'plays_with_calibration_fault_ratio_over_0':sum(p['calibration_fault_ratio']>0 for p in hp.values()),
        'steps_flagged_calibration_fault':sum(bool(s.get('calibration_fault')) for s in steps),
        'unflagged_does_not_mean_on_camera':True, 'full_game_frame_counts':dict(full_grid),
        'first_track_time_since_snap':summary(x[0] for x in duration),
        'last_track_time_since_snap':summary(x[1] for x in duration),
        'timestamp_units_empirical':'microseconds; divide by 1e6 to align event_video_timestamp seconds',
        'max_snap_alignment_error_seconds':max(event_time_error),
        'ngs_transform_max_error':{'x_equals_6x_plus_90':max(abs(s['ngs_x']-(6*s['x']+90)) for s in good),
                                   'y_equals_6y_plus_30':max(abs(s['ngs_y']-(6*s['y']+30)) for s in good)},
        'coordinate_event_actor_residual_yards':summary(coordinate_residuals),
        'phase_samples':{k:dict(v) for k,v in phase_counts.items()},
        'actor_samples':{k:dict(v) for k,v in actor_samples.items()},
        'events':len(ee), 'event_type_counts':count(tag for e in ee for tag in tags(e)),
        'tackle_attempt_contact_values':count(e['event_tackle_contact'] or 'missing' for e in attempts),
        'tackle_attempt_opponent_id_present':sum(bool(e['opponent_player_id']) for e in attempts),
        'engagement_starts':len(engagements),
        'engagement_start_opponent_id_present':sum(bool(e['opponent_player_id']) for e in engagements),
        'engagement_start_end_uuid_resolves':sum(e['end_engagement_uuid'] in event_by_id for e in engagements),
        'lft':{'rows':len(low), 'events':len(lft_by_event),
               'rows_per_event':count(len(v) for v in lft_by_event.values()),
               'distinct_player_ids_per_event':count(len({x['player_id'] for x in v if x['player_id']}) for v in lft_by_event.values()),
               'duplicate_player_id_events':sum(len([x['player_id'] for x in v if x['player_id']]) != len({x['player_id'] for x in v if x['player_id']}) for v in lft_by_event.values()),
               'positive_event_timestamp_gap_seconds':summary(low_deltas),
               'indices':sorted({int(x['track_player_index']) for x in low}),
               'null_player_id_rows':sum(not x['player_id'] for x in low),
               'synthetic_ball_index_minus_1_rows':sum(x['track_player_index']=='-1' for x in low),
               'events_without_lft':len(ee)-len(lft_by_event),
               'events_without_lft_but_no_reason':sum(e['event_uuid'] not in lft_by_event and not e['event_no_ff_cause'] for e in ee)},
        'selected_examples':examples,
        'limits':['One game only; nominal 30Hz is not observed 30Hz all-22 or ball tracking.',
                  'Finite unflagged is a necessary screen, not proof of on-camera observation.',
                  'No gaze, grip, force, body pose, play responsibility or causal decision labels.',
                  'No BDB query or engine runtime imported, no trajectories imputed.']}
    return out


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root',type=Path,required=True)
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--tracking',default='data/tracking/SB_tracking_20220911_TB_DAL.json.gz')
    p.add_argument('--plays',default='data/plays/tb12_plays_dataset_2022_2023.csv')
    p.add_argument('--events',default='data/events/tb12_events_dataset_2022_2023.csv')
    p.add_argument('--lft',default='data/lft/lft_1501094.csv')
    a = p.parse_args()
    result = audit(a.root,a.tracking,a.plays,a.events,a.lft)
    a.out.parent.mkdir(parents=True,exist_ok=True)
    a.out.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    print(json.dumps({k:result[k] for k in ('game_id','tracking_plays','steps','nonfinite_or_null_xy','gaps_over_34ms','lft')}))
