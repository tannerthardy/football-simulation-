#!/usr/bin/env python3
"""Specific saved-evidence handoff for A020/A044 and A008/A032. No simulation."""
import argparse
import gzip
import hashlib
import io
import json
import tarfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ARCHIVE_SHA = '72a62b95145cd64bb3bf06d60a62adbb7735cf872d777ff35faa5883e138e397'
NFL_SHA = '4a57b09d246587843f9eb8ac3d03e6fcceb25e0276e679b33371cc63138c272d'
SELECTED = ['A008', 'A020', 'A032', 'A044']
WINDOWS = {'A008': [(1.8, 3.35)], 'A020': [(1.95, 3.75)],
           'A032': [(2, 4.3)], 'A044': [(1.95, 3.4), (4.5, 5.6)]}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def file_sha(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, separators=(',', ':'), ensure_ascii=False)+'\n')


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--archive', type=Path, required=True)
    ap.add_argument('--nfl-return', type=Path, required=True)
    ap.add_argument('--out', type=Path, default=ROOT/'data/reviews/current/accepted-audit-handoff')
    args = ap.parse_args()
    start = time.monotonic()
    collection = json.loads((ROOT/'data/reviews/current/accepted-broad-audit/collection.json').read_text())
    expected = {r['id']: r['sha256'] for r in collection['rows']}
    assert file_sha(args.archive) == ARCHIVE_SHA
    assert file_sha(args.nfl_return) == NFL_SHA
    keep = {'manifest.json', 'summary.json', 'run-receipt.json', 'plan-receipt.json'}
    keep.update(f'cases/{case}.json' for case in SELECTED)
    subset_members, windows, verified = [], [], {}
    with tarfile.open(args.archive, 'r:gz') as archive:
        for member in archive:
            parts = Path(member.name).parts
            assert parts[0] == 'accepted-broad-audit' and '..' not in parts
            assert member.isdir() or member.isfile(), 'No links or special files admitted'
            if not member.isfile():
                continue
            relative = '/'.join(parts[1:])
            stream = archive.extractfile(member)
            if relative.startswith('cases/'):
                case_id = Path(relative).stem
                assert case_id in expected
                if case_id in SELECTED:
                    raw = stream.read()
                    verified[case_id] = sha(raw)
                    data = json.loads(raw)
                    result, actors = data['result'], data['actors']
                    focus = {a['idx'] for a in actors if a['slot'] in ['SS', 'LB_M', 'NB', 'H', 'Y', 'Z', 'CB_S', 'FS']}
                    rows = []
                    assert len(result['frames']) == len(result['telemetry']['frames'])
                    for frame, state in zip(result['frames'], result['telemetry']['frames']):
                        assert frame['t'] == state['t']
                        if not any(lo <= frame['t'] <= hi for lo, hi in WINDOWS[case_id]):
                            continue
                        samples = []
                        for actor, native in zip(actors, state['agents']):
                            body = native.get('body', {})
                            samples.append({'idx': actor['idx'], 'id': actor['id'],
                                'kind': native['kind'], 'job': native.get('job'), 'target': native.get('target'),
                                'runFit': native.get('runFit'), 'runBlock': native.get('runBlock'),
                                'belief': native.get('belief'), 'achievedVelocity': body.get('velocity'),
                                'bodyState': body.get('state'), 'finalIntent': native.get('intent')})
                        rows.append({'t': frame['t'], 'frame': frame, 'agents': samples,
                            'ball': state.get('ball'), 'blocks': state.get('blocks'), 'tackle': state.get('tackle'),
                            'contacts': state.get('contacts'),
                            'requestedPerception': [p for p in state.get('perception', []) if p['a'] in focus and p['b'] in focus]})
                    windows.append({'caseId': case_id, 'rawSha256': sha(raw), 'inputSha256': data['inputSha256'],
                        'matchup': data['matchup'], 'actors': actors, 'setup': data['setup'], 'initial': data['initial'],
                        'events': result['events'], 'stats': result['stats'], 'outcome': result['outcome'],
                        'windows': WINDOWS[case_id], 'rows': rows})
                    subset_members.append((member, raw))
                else:
                    h = hashlib.sha256()
                    for chunk in iter(lambda: stream.read(1 << 20), b''):
                        h.update(chunk)
                    verified[case_id] = h.hexdigest()
                assert verified[case_id] == expected[case_id]
            elif relative in keep:
                raw = stream.read()
                if relative == 'manifest.json':
                    assert sha(raw) == collection['nativeManifestFileSha256']
                if relative == 'summary.json':
                    assert sha(raw) == collection['nativeSummaryFileSha256']
                subset_members.append((member, raw))
    assert verified == expected
    subset = args.archive.parent/'accepted-8ca8dee-flex-A008-A020-A032-A044.tar.gz'
    temporary = subset.with_suffix('.tmp')
    with temporary.open('wb') as output, gzip.GzipFile(filename='', mode='wb', fileobj=output, mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode='w') as tar:
            for member, raw in sorted(subset_members, key=lambda v: v[0].name):
                tar.addfile(member, io.BytesIO(raw))
    if subset.exists():
        assert file_sha(subset) == file_sha(temporary), 'Existing different transfer preserved'
        temporary.unlink()
    else:
        temporary.rename(subset)
    # Verify every transferred original byte independently after packaging.
    with tarfile.open(subset, 'r:gz') as tar:
        for member in tar:
            assert sha(tar.extractfile(member).read()) == next(sha(raw) for original, raw in subset_members if original.name == member.name)
    reference = {'schema': 'accepted-audit-flex-windows-v1', 'acceptedRuntime': collection['provenance']['acceptedCommit'],
        'sourceSha256': collection['provenance']['sourceSha256'], 'manifestSha256': collection['manifestSha256'],
        'consumer': 'Flex/Do-It-All A020/A044 command attribution; A008/A032 opposing controls',
        'scope': 'Selected native windows, not complete original raw files. All22 actor indices, original IDs, setup and initial state retained.',
        'timing': 'Native frame label is enclosing tick start after physics. Stored velocity is recorded body velocity. No positional differentiation or extra cue-age extrapolation.',
        'requestStages': {'finalIntent': 'recorded after containment/engagement/bond/spacing',
            'originalBehaviorRequest': None, 'afterContainment': None, 'afterEngagementAndBond': None,
            'discardedStages': 'Not recorded; cannot reconstruct. Coordinate passive existing-value capture with Flex.'},
        'omissions': 'Outside-window frames; perception calls outside focus actor pairs; support/force internals beyond sampled contacts/blocks. Raw four-case transfer preserves all original fields.',
        'cases': sorted(windows, key=lambda w: w['caseId'])}
    encoded = (json.dumps(reference, separators=(',', ':'), ensure_ascii=False)+'\n').encode()
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out/'flex-windows.json.gz').write_bytes(gzip.compress(encoded, mtime=0))
    nfl = json.loads(args.nfl_return.read_text())
    contained = {w['id']: w for w in nfl['examples']['contained']}
    for week in nfl['per_week']:
        for record in week.get('examples', {}).get('contained', []):
            contained[record['id']] = record
    assert len(contained) == 4
    geometry = []
    for case_id, case in sorted(contained.items()):
        snapshots = []
        for snapshot in case['snapshots']:
            snapshots.append({k: snapshot[k] for k in ['phase', 'event_t_s', 'position_sample_t_s', 'nearest_id']} |
                {'defenders': [{k: d[k] for k in ['id', 'index', 'separation_yd', 'relative_xy_yd', 'downfield_lead_yd']} for d in snapshot['defenders']]})
        events = case['events']
        geometry.append({'id': case_id, 'receiverId': case['receiver_id'], 'selectedDefenderIds': case['selected_defender_ids'],
            'originalEvents': events, 'originalFrameProvenance': case['frame_provenance'], 'yac': case['yac_yd'],
            'catchToAnnotatedFirstContactSeconds': round(events['first_contact']-events['catch'], 6),
            'nearestIdentityChangedReleaseToCatch': snapshots[0]['nearest_id'] != snapshots[-1]['nearest_id'],
            'snapshots': snapshots})
    write_json(args.out/'nfl-support-geometry.json', {'schema': 'completed-nfl-support-geometry-handoff-v1',
        'question': 'Does an NFL contained catch require the original nearest defender to retain access, or can a different lead defender supply the near-catch support geometry?',
        'sourceReturnSha256': NFL_SHA, 'queryCommit': nfl['query_commit'], 'sourceCountsUnchanged': nfl['aggregate_counts'],
        'selection': 'All four already returned contained witnesses; no raw scan, new admission, filter change or broader outcome search. Two middle-YAC qualifiers have no returned phase snapshots; do not invent them.',
        'velocityPolicy': 'This answer uses positions, IDs and original event times only. Legacy query velocity/momentum fields were trailing position differences; preserved unchanged in original return and deliberately not used as stored velocity here. A stored NFL s/dir comparison requires a separate minimal source-row handoff from Catching.',
        'limits': 'Quarters/POST selected sample, not mesh controls or general NFL frequency. First-contact actor and actual contact force absent; geometry does not prove an attainable action, installed responsibility, observed cue, gaze, grip or causal stop.',
        'cases': geometry})
    receipt = {'schema': 'accepted-audit-transfer-receipt-v1', 'querySha256': file_sha(Path(__file__)),
        'archive': {'path': str(args.archive), 'bytes': args.archive.stat().st_size, 'sha256': ARCHIVE_SHA, 'nativeCasesRehashed': len(verified)},
        'flexRawSubset': {'path': str(subset), 'bytes': subset.stat().st_size, 'sha256': file_sha(subset),
            'caseIds': SELECTED, 'members': [m.name for m, raw in sorted(subset_members, key=lambda v: v[0].name)]},
        'publishedReference': {p.name: {'bytes': p.stat().st_size, 'sha256': file_sha(p)} for p in [args.out/'flex-windows.json.gz', args.out/'nfl-support-geometry.json']},
        'archiveAccess': 'Local originals valid. gh release API request denied Forbidden at api.github.com; no supported upload tool exposed. Raw transfer needs an allowed artifact uploader; no raw blobs added to source tree.',
        'newSimulations': 0, 'rawNFLQueries': 0, 'amfReads': 0, 'wallSeconds': time.monotonic()-start}
    write_json(args.out/'transfer-receipt.json', receipt)
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    main()
