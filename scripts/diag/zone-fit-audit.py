#!/usr/bin/env python3
"""Read-only acquisition/drive-axis audit of saved ordinary OL evidence.

python3 scripts/diag/zone-fit-audit.py [panel.json.gz film.json.gz output.json]
Counts describe retained observations, not NFL rates or technique error rates.
"""
import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path


def read(path):
    with gzip.open(path, 'rt') as stream:
        return json.load(stream)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def clamp(value, low, high):
    return max(low, min(high, value))


def sign(value):
    return 1 if value > 0 else -1 if value < 0 else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('panel', type=Path, nargs='?', default=Path('data/reviews/physics-world/ol-technique/after.json.gz'))
    parser.add_argument('film', type=Path, nargs='?', default=Path('data/reviews/physics-world/ol-technique/after-film.json.gz'))
    parser.add_argument('output', type=Path, nargs='?', default=Path('out/zone-fit/saved-audit.json'))
    args = parser.parse_args()
    panel, film = read(args.panel), read(args.film)
    assert panel['sourceBefore'] == panel['sourceAfter'] == film['sourceBefore'] == film['sourceAfter']
    assert panel['collectorSha256'] == film['collectorSha256']
    assert panel['sourceBefore'] == 'a629d4d04485ade21e4354b8078ed6cd0bf56b155aa92b83dad7f97cc2d8172f'
    zones = ['oz_strong', 'wz_strong']
    trials = [t for t in panel['trials'] if t['run'] in zones]
    trial_by_id = {t['id']: t for t in panel['trials']}
    contacts = []
    for t in trials:
        for slot, metrics in t['olMetrics'].items():
            # First surviving hand pair for this OL. Late recontacts and
            # different target pairs remain in the input, not this entry set.
            initial = metrics['firstHands'][0] if metrics['firstHands'] else None
            if initial is None or initial['planKind'] != 'reach':
                continue
            ps = sign(initial['drive']['y'])
            half = (initial['blockerPosition']['y'] - initial['defenderPosition']['y']) * ps
            contacts.append({'id': t['id'], 'slot': slot, 'other': initial['other'], 't': initial['t'],
                'drive': initial['drive'], 'playsideCenterOffset': half,
                'planTarget': initial['planTarget'], 'native': initial})
    requests, controls = [], []
    for play in film['plays']:
        if play['selection'] != 'fixed-before-outcomes':
            continue
        for tick in play['trace']:
            for u in tick['updates']:
                slot = u['observer']
                if slot not in ['LT', 'LG', 'C', 'RG', 'RT']:
                    continue
                p = u['afterBody']['plan']
                g = u['targetGeometry']
                if not p or not g or g['observedPosition'] is None:
                    continue
                if u['beforeBody']['engagement'] or u['afterBody']['engagement']:
                    continue
                seen = g['observedPosition']
                drive = p['drive']
                ps = sign(drive['y'])
                if not ps:
                    continue
                rel = {k: u['beforeBody']['pos'][k] - seen[k] for k in ['x', 'y']}
                phi = math.atan2(-rel['x']*drive['y'] + rel['y']*drive['x'],
                                 -rel['x']*drive['x'] - rel['y']*drive['y']) / (math.pi/2)
                if play['run'] not in zones or p['kind'] != 'reach':
                    if len(controls) < 12 and p['kind'] in ['drive', 'cutoff', 'combo', 'down']:
                        controls.append({'id': play['id'], 't': u['t'], 'slot': slot,
                            'kind': p['kind'], 'drive': drive, 'phi': phi, 'requested': u['requested']})
                    continue
                installed = next(b['plan'] for b in play['trace'][0]['before'] if b['slot'] == slot)
                if installed['kind'] != 'reach' or p['target'] != installed['target']:
                    continue
                metrics = trial_by_id[play['id']]['olMetrics'][slot]
                first_native_contact = min((c['t'] for c in [*metrics['firstContacts'], *metrics['firstHands']]
                    if c['other'] == p['target']), default=math.inf)
                if u['t'] >= first_native_contact:
                    continue
                if p['combination'] and not p['combination']['released']:
                    continue
                # runThrough omits facing; chooseRunBlockFit supplies the
                # facing of this consumed image. First-step facing is zero.
                facing = math.atan2(seen['y'] - u['beforeBody']['pos']['y'], seen['x'] - u['beforeBody']['pos']['x'])
                f = u['requested'].get('facing')
                if f is None or abs(f) < 1e-9 or abs(f-facing) > 1e-9:
                    continue
                nominal = {'x': -.3, 'y': drive['y']*.6}
                axis = {k: -drive[k] for k in ['x', 'y']}
                lat = {'x': -axis['y'], 'y': axis['x']}
                dot = nominal['x']*axis['x'] + nominal['y']*axis['y']
                sep = g['radiusSum'] + .15
                lateral = clamp(nominal['x']*lat['x'] + nominal['y']*lat['y'], -.45*sep, .45*sep)
                projection = {'x': axis['x']*sep + lat['x']*lateral,
                              'y': axis['y']*sep + lat['y']*lateral}
                delivered = next((d for d in tick['deliveredStep'] if d['slot'] == slot), None)
                seen_vel = g['observedVelocity']
                requested_side_relative_speed = (u['requested']['vel']['y'] - seen_vel['y']) * ps
                requests.append({'id': play['id'], 'run': play['run'], 't': u['t'], 'slot': slot,
                    'target': p['target'], 'drive': drive, 'bodyRelativeToConsumedImage': rel,
                    'observedLeverage': phi, 'lostByCurrentBoundary': abs(phi) >= 1.1,
                    'nominalReachOffset': nominal, 'nominalDotOppositeDrive': dot,
                    'preArcProjectedOffset': projection,
                    'preArcProjectedPlaysideOffset': projection['y']*ps,
                    'requestedRelativePlaysideSpeed': requested_side_relative_speed,
                    'firstNativeContactTime': first_native_contact if math.isfinite(first_native_contact) else None,
                    'controller': u, 'completedNativeLoad': delivered})
    healthy = [r for r in requests if not r['lostByCurrentBoundary']]
    grouped = {}
    for run in zones:
        rs = [r for r in requests if r['run'] == run]
        hs = [r for r in rs if not r['lostByCurrentBoundary']]
        cs = [c for c in contacts if run in c['id']]
        grouped[run] = {'pooledSnaps': sum(t['run'] == run for t in trials),
            'firstReachHands': len(cs), 'firstReachHandsPlaysideCenter': sum(c['playsideCenterOffset'] > 0 for c in cs),
            'firstReachHandsBacksideCenter': sum(c['playsideCenterOffset'] < 0 for c in cs),
            'snapsWithFirstReachHandsBacksideCenter': len({c['id'] for c in cs if c['playsideCenterOffset'] < 0}),
            'retainedHealthyFreeFitUpdates': len(hs), 'retainedHealthyFreeFitSnaps': len({r['id'] for r in hs}),
            'healthyOppositeHalfProjectionUpdates': sum(r['preArcProjectedPlaysideOffset'] < 0 for r in hs),
            'healthyRelativeAwayFromPlaysideRequests': sum(r['requestedRelativePlaysideSpeed'] < 0 for r in hs)}
    witnesses = []
    for run in zones:
        candidates = [r for r in healthy if r['run'] == run and r['requestedRelativePlaysideSpeed'] < -.1]
        if candidates:
            witnesses.append(candidates[0])
    report = {'schema': 'zone-fit-saved-audit-v1', 'engineSource': panel['sourceBefore'],
        'worldSha256': panel['moduleSha256']['src/physics/world.ts'],
        'auditToolSha256': sha(Path(__file__)), 'inputSha256': {str(p): sha(p) for p in [args.panel, args.film]},
        'summaryByConcept': grouped, 'firstReachContacts': contacts, 'retainedFreeReachFits': requests,
        'witnesses': witnesses, 'nonReachControls': controls,
        'limits': ['40 pooled OZ/WZ snaps contribute native first surviving hand contacts; only four fixed-film snaps retain complete unengaged reads and requests.',
            'Acquisition requests are installed reach jobs on the original target strictly before that pair first has a native body or surviving hand contact; no arbitrary time cutoff is used.',
            'No new plays, reads, RNG or live code are executed. Saved traces are immutable observations of sourcea629d4.',
            'Backside hands at first contact are not automatically a football error: a stretch block can make contact there before working around.',
            'The policy mismatch is between the explicitly playside reach nominal landmark and its opposite-half pre-arc projection, independently of achieved contact outcome.',
            'Native completed-step impulses/velocity describe physical response; requested velocity alone does not prove achieved body displacement.',
            'Tick-ending first hands omit joints removed within a tick. Surviving geometry is not NFL leverage truth.']}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'output': str(args.output), 'summaryByConcept': grouped,
        'witnesses': [{k:w[k] for k in ['id','t','slot','target','observedLeverage',
            'nominalDotOppositeDrive','preArcProjectedPlaysideOffset','requestedRelativePlaysideSpeed']} for w in witnesses]}, indent=2))


if __name__ == '__main__':
    main()
