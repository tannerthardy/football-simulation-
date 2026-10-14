"""Reduce short native opening captures; this script executes zero World steps.

Example:
 python3 scripts/diag/wz-execution-report.py --input before=out/wz-execution/before.json.gz \
   --input candidate=/absolute/candidate.json.gz --check-baseline before --plot

Positions here are diagnostic actual bodies, never controller observations. The
force integrals use each OL's own transmitted hand load, not engagement labels.
No score or safe-block conclusion is manufactured from any single metric.
"""
import argparse
import csv
import gzip
import hashlib
import json
import math
from pathlib import Path
import time


OL = ('LT', 'LG', 'C', 'RG', 'RT')
EPS = 1e-8


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read(path):
    data = Path(path).read_bytes()
    return json.loads(gzip.decompress(data) if str(path).endswith('.gz') else data)


def actor(value):
    return value.get('agent') if isinstance(value, dict) else value


def magnitude(value):
    return math.hypot(value['x'], value['y'])


def placement(body, defender, rb):
    """Report actual geometry without claiming an interception certificate."""
    ox, oy = body['pos']['x'] - defender['pos']['x'], body['pos']['y'] - defender['pos']['y']
    rx, ry = rb['pos']['x'] - defender['pos']['x'], rb['pos']['y'] - defender['pos']['y']
    r2 = rx * rx + ry * ry
    fraction = (ox * rx + oy * ry) / r2 if r2 > 1e-12 else None
    lateral = abs(ox * ry - oy * rx) / math.sqrt(r2) if r2 > 1e-12 else None
    return {'olMinusDefenderX': ox, 'olMinusDefenderY': oy,
            'rbMinusDefenderX': rx, 'olDefenderDistance': math.hypot(ox, oy),
            'fractionAlongDefenderToRB': fraction, 'distanceFromDefenderRBLine': lateral,
            'betweenDefenderAndRBProjection': None if fraction is None else 0 <= fraction <= 1}


def opening_rows(label, case):
    actors = case['actors']
    side = 1 if case['input']['concept'] == 'wz_weak' else -1
    rb = next(a['idx'] for a in actors if a['slot'] == 'RB')
    rows = []
    for frame in case['frames']:
        before, after = frame['beforeBodies'], frame['afterBodies']
        assert len(before) == len(after) == 22
        assert abs(frame['after'] - frame['t'] - frame['dt']) < 1e-12
        for a in actors:
            if a['slot'] not in OL:
                continue
            i = a['idx']
            plan = frame['behavior'][i]['plan']
            target = actor(plan.get('target'))
            memberships = [e for e in frame['engagements'] if actor(e['blocker']) == i
                           or i in [actor(h) for h in e['helpers']]]
            status = ('free' if not memberships else 'owner' if any(actor(e['blocker']) == i
                      for e in memberships) else 'helper')
            hands = [j for j in frame['jointOutputs'] if j['kind'] == 'hands' and i in (j['a'], j['b'])
                     and actors[j['b'] if j['a'] == i else j['a']]['team'] != a['team']]
            normal = sum(abs(j.get('normalForce') or 0) for j in hands)
            tangent = sum(abs(j.get('tangentForce') or 0) for j in hands)
            loaded = normal > EPS or tangent > EPS
            impacts = [c for c in frame['report']['contacts'] if i in (c['i'], c['j'])
                       and c['impulse'] > EPS and actors[c['i']]['team'] == actors[c['j']]['team']]
            raw, final = frame['requested'][i], frame['final'][i]
            dx = after[i]['pos']['x'] - before[i]['pos']['x']
            dy = after[i]['pos']['y'] - before[i]['pos']['y']
            row = {'arm': label, 'case': case['input']['id'], 'entry': frame['t'], 'after': frame['after'],
                   'slot': a['slot'], 'assignment': plan['kind'], 'target': target,
                   'targetSlot': actors[target]['slot'] if target is not None else None, 'status': status,
                   'raw_vx': raw['vel']['x'], 'raw_vy': raw['vel']['y'],
                   'final_vx': final['vel']['x'], 'final_vy': final['vel']['y'],
                   'entry_vx': before[i]['vel']['x'], 'entry_vy': before[i]['vel']['y'],
                   'post_vx': after[i]['vel']['x'], 'post_vy': after[i]['vel']['y'],
                   'dx': dx, 'dy': dy, 'facing_before': before[i]['facing'], 'facing_after': after[i]['facing'],
                   'playside_progress': side * (after[i]['pos']['y'] - a['initialBody']['pos']['y']),
                   'forward_progress': after[i]['pos']['x'] - a['initialBody']['pos']['x'],
                   'x': after[i]['pos']['x'], 'y': after[i]['pos']['y'],
                   'normalForceKgYdPerS2': normal, 'tangentForceKgYdPerS2': tangent,
                   'normalImpulseKgYdPerS': normal * frame['dt'], 'tangentImpulseKgYdPerS': tangent * frame['dt'],
                   'loaded': loaded, 'loadedPlaysideDisplacement': side * dy if loaded else 0,
                   'nominalJoinWithoutOwnLoad': status != 'free' and not loaded,
                   'handJointWithoutOwnLoad': bool(hands) and not loaded,
                   'teammateImpactCount': len(impacts), 'teammateImpactImpulseKgYdPerS': sum(c['impulse'] for c in impacts),
                   'support': after[i]['support']['state'],
                   'loadedOpponents': ','.join(sorted({actors[j['b'] if j['a'] == i else j['a']]['slot']
                        for j in hands if abs(j.get('normalForce') or 0) > EPS or abs(j.get('tangentForce') or 0) > EPS}))}
            row.update(placement(after[i], after[target], after[rb]) if target is not None else
                       {k: None for k in placement(after[i], after[i], after[rb])})
            rows.append(row)
    return rows


def summarize(rows):
    result = []
    for slot in OL:
        rs = [r for r in rows if r['slot'] == slot]
        if not rs:
            continue
        transitions = [r for k, r in enumerate(rs) if k == 0 or
                       any(r[q] != rs[k - 1][q] for q in ('assignment', 'target', 'status'))]
        last = rs[-1]
        summary = {'slot': slot, 'through': last['after'], 'playsideProgress': last['playside_progress'],
                   'forwardProgress': last['forward_progress'],
                   'progressAt': {str(t): next((r['playside_progress'] for r in rs if abs(r['after'] - t) < 1e-9), None)
                                  for t in (.3, .5, 1, 1.5, 2)},
                   'loadedPlaysideDisplacement': sum(r['loadedPlaysideDisplacement'] for r in rs),
                   'ownNormalImpulseKgYdPerS': sum(r['normalImpulseKgYdPerS'] for r in rs),
                   'ownTangentImpulseKgYdPerS': sum(r['tangentImpulseKgYdPerS'] for r in rs),
                   'loadedSeconds': .05 * sum(r['loaded'] for r in rs),
                   'firstOwnLoadEntry': next((r['entry'] for r in rs if r['loaded']), None),
                   'firstNominalJoinEntry': next((r['entry'] for r in rs if r['status'] != 'free'), None),
                   'nominalJoinWithoutOwnLoadSeconds': .05 * sum(r['nominalJoinWithoutOwnLoad'] for r in rs),
                   'handJointWithoutOwnLoadSeconds': .05 * sum(r['handJointWithoutOwnLoad'] for r in rs),
                   'nominalJoinNeverLoaded': any(r['status'] != 'free' for r in rs) and not any(r['loaded'] for r in rs),
                   'teammateImpactCount': sum(r['teammateImpactCount'] for r in rs),
                   'teammateImpactImpulseKgYdPerS': sum(r['teammateImpactImpulseKgYdPerS'] for r in rs),
                   'nonUprightSeconds': .05 * sum(r['support'] != 'up' for r in rs),
                   'transitions': [{k: r[k] for k in ('entry', 'assignment', 'targetSlot', 'status')} for r in transitions],
                   'final': {k: last[k] for k in ('assignment', 'targetSlot', 'status', 'x', 'y', 'post_vx', 'post_vy',
                            'olMinusDefenderX', 'olMinusDefenderY', 'rbMinusDefenderX', 'olDefenderDistance',
                            'fractionAlongDefenderToRB', 'distanceFromDefenderRBLine', 'betweenDefenderAndRBProjection')}}
        result.append(summary)
    return result


def check_published(label, capture, rows, published):
    assert capture['sourceSha256'] == '60120551f0ad09415b47150f5edd9cdbd179955010a33d557af817fec31a01f1'
    witness = read(published / 'first-breakdown.json.gz')
    for case in capture['panel']:
        saved = next(c for c in witness['cases'] if c['input'] == case['input'])
        assert saved['initializedInformationSha256'] == case['initializedInformationSha256']
        assert saved['frame'] == next(f for f in case['frames'] if f['t'] == .05)
    saved = list(csv.DictReader((published / 'timeline.csv').open()))
    numeric = ('entry', 'after', 'raw_vx', 'raw_vy', 'final_vx', 'final_vy', 'entry_vx', 'entry_vy',
               'post_vx', 'post_vy', 'dx', 'dy', 'facing_before', 'facing_after', 'playside_progress')
    count = 0
    for row in rows:
        if row['arm'] != label or row['after'] > 1:
            continue
        prior = next(r for r in saved if r['arm'] == 'awareness' and r['case'] == row['case']
                     and r['slot'] == row['slot'] and float(r['entry']) == row['entry'])
        for key in numeric:
            assert float(prior[key]) == row[key], (row['case'], row['slot'], key)
        for key in ('assignment', 'status'):
            assert prior[key] == row[key]
        assert int(prior['target']) == row['target']
        count += 1
    assert count == 300
    return {'firstActionAll22BodiesInformationRNGAndRequestsExactlyMatch': True,
            'installedInitializationExactlyMatches': True, 'publishedAlignedOLRowsExactlyMatch': count,
            'timelineSha256': sha(published / 'timeline.csv'),
            'firstBreakdownSha256': sha(published / 'first-breakdown.json.gz')}


def plot(result, captures, output):
    import os
    os.environ.setdefault('MPLCONFIGDIR', '/tmp/wz-execution-matplotlib')
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    cases = list(dict.fromkeys(c['case'] for c in result['cases']))
    fig, axes = plt.subplots(len(cases), 2, figsize=(12, 3.7 * len(cases)), squeeze=False)
    colors = dict(zip(OL, ('#4263a8', '#dd8944', '#288d7b', '#985a9e', '#b14947')))
    styles = ('-', '--', ':', '-.')
    for n, ident in enumerate(cases):
        ax, geometry = axes[n]
        for k, (label, cap) in enumerate(captures.items()):
            case = next((c for c in cap['panel'] if c['input']['id'] == ident), None)
            if case is None:
                continue
            rs = [r for r in result['rows'] if r['arm'] == label and r['case'] == ident]
            for slot in OL:
                points = [r for r in rs if r['slot'] == slot]
                ax.plot([0] + [r['after'] for r in points], [0] + [r['playside_progress'] for r in points],
                        color=colors[slot], ls=styles[k % len(styles)], label=f'{label} {slot}')
                a = next(a for a in case['actors'] if a['slot'] == slot)
                geometry.plot([a['initialBody']['pos']['y']] + [r['y'] for r in points],
                              [a['initialBody']['pos']['x']] + [r['x'] for r in points],
                              color=colors[slot], ls=styles[k % len(styles)])
                loaded = [r for r in points if r['loaded']]
                geometry.scatter([r['y'] for r in loaded], [r['x'] for r in loaded], s=8, color=colors[slot])
                geometry.annotate(f'{label} {slot}', (points[-1]['y'], points[-1]['x']), fontsize=7)
            last = case['frames'][-1]['afterBodies']
            for a in case['actors']:
                if a['slot'] in ('RB', 'DE_S', 'DT_S', 'DT_W', 'DE_W'):
                    body = last[a['idx']]
                    geometry.scatter([body['pos']['y']], [body['pos']['x']], s=25, marker='x', color='#333333')
                    geometry.annotate(f"{label} {a['slot']}", (body['pos']['y'], body['pos']['x']), fontsize=6)
        ax.set(title=ident, xlabel='Executed boundary (s)', ylabel='Signed playside progress (yd)')
        ax.grid(alpha=.2)
        geometry.set(title='Actual paths; dots mean own nonzero hand load', xlabel='Field y (yd)', ylabel='Field x (yd)')
        geometry.invert_xaxis()
        geometry.grid(alpha=.2)
        if n == 0:
            ax.legend(ncol=2, fontsize=7)
    fig.suptitle('Short wide-zone opening: movement, position and transmitted load')
    fig.tight_layout()
    fig.savefig(output / 'comparison.png', dpi=140)
    fig.savefig(output / 'comparison.svg')
    plt.close(fig)


def main():
    start = time.perf_counter()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', action='append', required=True, metavar='LABEL=PATH')
    parser.add_argument('--out', type=Path, default=Path('out/wz-execution/report'))
    parser.add_argument('--published-root', type=Path, default=Path('docs/reviews/wide-zone-opening'))
    parser.add_argument('--check-baseline', help='Label whose 1s prefix must exactly match PR42 published evidence')
    parser.add_argument('--plot', action='store_true')
    parser.add_argument('--allow-stretch-help-install', action='store_true',
                        help='Allow only the declared new stretchHelp installation in otherwise identical initial actors')
    args = parser.parse_args()
    captures, rows, cases, inputs, checks = {}, [], [], [], {}
    for item in args.input:
        label, path = item.split('=', 1)
        assert label not in captures
        capture = read(path)
        assert capture['protocol'] == 'wide-zone-opening-capture-v1'
        assert not capture['diagnosticBypass'], 'Rejected RT bypass is outside this comparison'
        assert capture['from'] == 0 and capture['stop'] <= 2
        captures[label] = capture
        inputs.append({'arm': label, 'path': str(Path(path).resolve()), 'sha256': sha(path),
                       'revision': capture['revision'], 'sourceSha256': capture['sourceSha256'],
                       'collectorSha256': capture['collectorSha256'], 'elapsedSeconds': capture['elapsedSeconds'],
                       'worldSteps': capture['newWorldSteps'], 'stop': capture['stop']})
        for case in capture['panel']:
            assert case['restoredFromSnap'] and not case['actions']
            local = opening_rows(label, case)
            rows += local
            teammate = [c for f in case['frames'] for c in f['report']['contacts'] if c['impulse'] > EPS
                        and case['actors'][c['i']]['team'] == case['actors'][c['j']]['team']]
            cases.append({'arm': label, 'case': case['input']['id'], 'input': case['input'],
                          'end': case['end'], 'censored': case['censored'], 'slots': summarize(local),
                          'unitTeammateImpactCount': len(teammate),
                          'unitTeammateImpactImpulseKgYdPerS': sum(c['impulse'] for c in teammate),
                          'unitImpacts': [{'entry': f['t'], 'a': case['actors'][c['i']]['slot'],
                              'b': case['actors'][c['j']]['slot'], 'impulseKgYdPerS': c['impulse']}
                              for f in case['frames'] for c in f['report']['contacts']
                              if c['impulse'] > EPS and case['actors'][c['i']]['team'] == case['actors'][c['j']]['team']],
                          'maxAbsoluteWorkResidual': max(abs(f['report']['work']['residual']) for f in case['frames'])})
    if args.check_baseline:
        checks['publishedBaseline'] = check_published(args.check_baseline, captures[args.check_baseline], rows, args.published_root)
    # Same initial observations and raw requests are compared before any changed
    # controller action; a native body-only restart is never accepted.
    labels = list(captures)
    if len(labels) > 1:
        initial = []
        for ident in {c['case'] for c in cases}:
            matched = [(label, next((c for c in captures[label]['panel'] if c['input']['id'] == ident), None)) for label in labels]
            matched = [(label, c) for label, c in matched if c is not None]
            if len(matched) < 2:
                continue
            base = matched[0][1]
            for label, case in matched[1:]:
                def without_stretch_help(value):
                    if isinstance(value, list):
                        return [without_stretch_help(v) for v in value]
                    if isinstance(value, dict):
                        return {k: without_stretch_help(v) for k, v in value.items() if k != 'stretchHelp'}
                    return value
                same_actors = case['actors'] == base['actors']
                if args.allow_stretch_help_install:
                    assert without_stretch_help(case['actors']) == without_stretch_help(base['actors'])
                else:
                    assert same_actors
                assert case['frames'][0]['beforeBodies'] == base['frames'][0]['beforeBodies']
                initial.append({'case': ident, 'arms': [matched[0][0], label],
                                'sameAll22PhysicalAndBehaviorInitialization': same_actors,
                                'sameAll22PhysicalAndAssignmentsApartFromDeclaredStretchHelp': True,
                                'installedInformationIdentical': case['initializedInformationSha256'] == base['initializedInformationSha256']})
        checks['matchedInitialStates'] = initial
    result = {'protocol': 'wz-execution-report-v1', 'inputs': inputs, 'checks': checks, 'cases': cases,
              'metricNotes': ['All positions are actual post-World diagnostic bodies and never supplied to the controller.',
                  'Normal/tangent impulse is integral of each OL own absolute transmitted hand force, in kg yd/s (engine units; multiply by .9144 for N s).',
                  'Loaded playside displacement counts signed achieved displacement only on intervals with own nonzero hand force.',
                  'Nominal joins and hand joints with zero own load are reported separately; neither proves a useful block.',
                  'Defender-to-RB projection and distance describe access geometry; they do not certify future interception.',
                  'A direct climb may legitimately have little playside progress. All results stop at the declared short boundary.'],
              'rows': rows, 'newReportWorldSteps': 0}
    args.out.mkdir(parents=True, exist_ok=True)
    with (args.out / 'timeline.csv').open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    if args.plot:
        plot(result, captures, args.out)
    result['reportSeconds'] = time.perf_counter() - start
    result['reportSha256'] = sha(__file__)
    (args.out / 'comparison.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'out': str(args.out), 'checks': checks, 'nativeSeconds': sum(i['elapsedSeconds'] for i in inputs),
                      'nativeWorldSteps': sum(i['worldSteps'] for i in inputs), 'reportSeconds': result['reportSeconds'],
                      'cases': [{k: c[k] for k in ('arm', 'case', 'end', 'unitTeammateImpactCount', 'unitTeammateImpactImpulseKgYdPerS')}
                                for c in cases]}))


if __name__ == '__main__':
    main()
