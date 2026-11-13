#!/usr/bin/env python3
"""One-off matched-old-cohort probe; broader football-only sample is incomplete."""
import csv
import hashlib
import json
import math
import statistics
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

D = Path('/workspace/review-aids/bdb2025/big-data-bowl-data')
ROOT = Path('/workspace/football-simulation-')
REF = ROOT / 'data/reviews/run-game-coordination/nfl-reference.json'
OLD = ROOT / 'data/reviews/error-budget/nfl-contact.json'
OUT = ROOT / 'out/run-reference-current/contact-operator-audit.json'
started = datetime.now(timezone.utc).isoformat()
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
reference = json.loads(REF.read_text())
sources = []
for expected in reference['sources']:
    path = D / expected['file']
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    actual = {'file': path.name, 'bytes': path.stat().st_size, 'sha256': digest.hexdigest()}
    if actual != expected:
        raise ValueError('Source mismatch: ' + path.name)
    sources.append(actual)

plays, newplays, oldplays = {}, {}, {}
with (D / 'plays.csv').open() as stream:
    for p in csv.DictReader(stream):
        k = p['gameId'], p['playId']
        plays[k] = p
        if p['playNullifiedByPenalty'] == 'Y':
            continue
        if p['isDropback'] != 'TRUE' and p['qbKneel'] in ('0', 'FALSE', 'NA', '') and p['qbSneak'] != 'TRUE':
            oldplays[k] = p
        if math.isfinite(float(p['yardsGained'])) and p['isDropback'] == 'FALSE' and p['qbKneel'] not in ('1', 'TRUE', 'True') and p['qbSpike'] not in ('1', 'TRUE', 'True') and p['rushLocationType'] not in ('NA', ''):
            newplays[k] = p
rushers = defaultdict(list)
with (D / 'player_play.csv').open() as stream:
    for p in csv.DictReader(stream):
        k = p['gameId'], p['playId']
        if k in newplays and p['hadRushAttempt'] in ('1', 'TRUE', 'True'):
            rushers[k].append(p['nflId'])
balls, runners, events = defaultdict(dict), defaultdict(dict), defaultdict(dict)
seen = set()
for week in (1, 2):
    with (D / f'tracking_week_{week}.csv').open() as stream:
        header = next(csv.reader([stream.readline()]))
        col = {field: i for i, field in enumerate(header)}
        for line in stream:
            lead = line.split(',', 3)
            k = lead[0], lead[1]
            if k not in oldplays and k not in newplays:
                continue
            seen.add(k)
            ids = rushers.get(k, [])
            is_ball = '"football"' in line or ',football,' in line
            if not is_ball and not (len(ids) == 1 and lead[2] == ids[0]):
                continue
            row = next(csv.reader([line]))
            frame, x = int(row[col['frameId']]), float(row[col['x']])
            if is_ball:
                balls[k][frame] = (x, row[col['playDirection']])
                event = row[col['event']].strip()
                if event != 'NA' and event not in events[k]:
                    events[k][event] = (frame, x)
            else:
                runners[k][frame] = x
old, new, operators = {}, {}, {}
for k in seen:
    p, event = plays[k], events[k]
    if 'ball_snap' not in event:
        continue
    snap = event['ball_snap'][0]
    sign = 1 if balls[k][snap][1] == 'right' else -1
    if k in oldplays and all(name in event for name in ('handoff', 'first_contact', 'tackle')):
        handoff, contact, tackle = (event[name] for name in ('handoff', 'first_contact', 'tackle'))
        if snap <= handoff[0] <= contact[0] <= tackle[0]:
            old[k] = (contact[1] - float(p['absoluteYardlineNumber'])) * sign
    if k in newplays and len(rushers.get(k, [])) == 1 and 'first_contact' in event:
        contact = event['first_contact']
        if contact[0] >= snap and contact[0] in runners[k]:
            new[k] = (runners[k][contact[0]] - balls[k][snap][0]) * sign
            operators[k] = {'footballMetadataLos': (contact[1] - float(p['absoluteYardlineNumber'])) * sign,
                            'footballSnapBallLos': (contact[1] - balls[k][snap][0]) * sign,
                            'runnerSnapBallLos': new[k]}
intersection = set(old) & set(new)
summary = lambda values: {'n': len(values), 'mean': statistics.mean(values) if values else None}
matched = {name: summary([operators[k][name] for k in intersection])
           for name in ('footballMetadataLos', 'footballSnapBallLos', 'runnerSnapBallLos')}
if len(old) != 1142 or len(intersection) != 1142:
    raise ValueError('Published old complete-case cohort not reproduced')
new_only = set(new) - set(old)
report = {'schema': 'run-contact-operator-probe-v1',
          'probe': {'file': str(Path(__file__).relative_to(ROOT)), 'sha256': sha(Path(__file__)),
                    'startedAt': started, 'finishedAt': datetime.now(timezone.utc).isoformat()},
          'sources': sources,
          'publishedReferences': [{'file': str(path.relative_to(ROOT)), 'sha256': sha(path)} for path in (REF, OLD)],
          'oldCohort': 'Non-nullified non-dropback, no kneel/sneak; football rows with ordered snap<=handoff<=first_contact<=tackle. Same 1142 complete cases as old reference.',
          'matchedOldCohortOperators': matched,
          'operatorDeltas': {'snapBallLosMinusMetadataLos': matched['footballSnapBallLos']['mean'] - matched['footballMetadataLos']['mean'],
                             'runnerMinusFootballAtSameContact': matched['runnerSnapBallLos']['mean'] - matched['footballSnapBallLos']['mean']},
          'footballOnlyBroaderProbe': {'runnerSnapBallLos': summary(list(new.values())),
                                       'oldIntersection': len(intersection), 'newOnly': len(new_only),
                                       'oldOnly': len(set(old) - set(new)),
                                       'newOnlyRunnerYbc': summary([new[k] for k in new_only]),
                                       'newOnlyFirstRemovalReasons': dict(Counter('noHandoff' if 'handoff' not in events[k] else 'noTackle' if 'tackle' not in events[k] else 'notOldRun' if k not in oldplays else 'ordering' for k in new_only))},
          'publishedAllRowReference': {'n': reference['all']['metrics']['yardsBeforeContact']['n'],
                                       'mean': reference['all']['metrics']['yardsBeforeContact']['mean']},
          'limitations': ['Football-only event probe finds1303 contacts versus1310 published all-player-row contacts. It is NOT a complete broader-cohort decomposition; the seven-row difference is not classified by this probe.',
                          'The matched1142 operator contrast is exact for the reproduced old cohort. Broader samples also differ by ordered handoff/tackle requirements, runner positions and sneaks.',
                          'The new published reference requires22players and unique snap; this shortcut relies on the reviewed reference having no exclusions for this snapshot rather than rerunning its all-player completeness check.',
                          'Event frame resolution is10Hz; positions are tracking coordinates, not measured body-surface contact geometry. Neither operator directly measures physical grip, strike or tackle control.']}
OUT.write_text(json.dumps(report, indent=2, allow_nan=False) + '\n')
print(json.dumps({'out': str(OUT), 'matched': matched, 'broaderProbeN': len(new), 'publishedN': reference['all']['metrics']['yardsBeforeContact']['n']}))
