#!/usr/bin/env python3
"""Audit preserved-contact transitions using recorded native states only.

python scripts/diag/zone-fit-transition-audit.py pre-transition.json.gz after.json.gz output.json
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path


def read(path):
    with gzip.open(path, 'rt') as stream:
        return json.load(stream)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def native_body(row):
    b = row['beforeBody']
    return {k: b[k] for k in ['pos', 'vel', 'facing', 'stance', 'support', 'energy']}


def native_at(trial, slot, time):
    rows = [u for u in trial['updates'] if abs(u['t'] - time) < 1e-9]
    if not rows:
        return None
    own = next((u for u in rows if u['observer'] == slot), None)
    ownership = next(r for r in rows[-1]['after'] if r['slot'] == slot)
    load = next(r for r in rows[-1]['deliveredStep'] if r['slot'] == slot)
    return {'t': time, 'ownController': own, 'ownershipAfterRetainedUpdate': ownership,
            'nativeLoad': load}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('before', type=Path)
    parser.add_argument('after', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    b, a = read(args.before), read(args.after)
    assert b['sourceBefore'] == b['sourceAfter']
    assert a['sourceBefore'] == a['sourceAfter']
    assert b['collectorSha256'] == a['collectorSha256']
    assert b['cohort'] == a['cohort']
    assert b['moduleSha256']['src/physics/world.ts'] == a['moduleSha256']['src/physics/world.ts']
    changed, falls = [], []
    for bt, at in zip(b['trials'], a['trials']):
        assert bt['id'] == at['id'] and bt['profileSha256'] == at['profileSha256']
        for t in [bt, at]:
            assert t['observerVerified'] and t['observedSignature'] == t['plainSignature']
        if bt['observedSignature'] != at['observedSignature']:
            bm = {(u['t'], u['observer']): u for u in bt['updates']}
            am = {(u['t'], u['observer']): u for u in at['updates']}
            frame_rows, phase_rows = [], []
            for key in sorted(bm.keys() & am.keys()):
                bu, au = bm[key], am[key]
                if native_body(bu) != native_body(au):
                    continue
                be, ae = bu['afterBody']['engagement'], au['afterBody']['engagement']
                bz, az = bu['afterBody']['plan']['zoneRead'], au['afterBody']['plan']['zoneRead']
                if be and ae and be['surfaceAxis'] != ae['surfaceAxis']:
                    frame_rows.append({'t': key[0], 'slot': key[1],
                        'sameNativeBodyInput': True, 'before': bu, 'after': au})
                if bz and az and bz['t'] == az['t'] and bz['seen'] == az['seen'] and bz['phase'] != az['phase']:
                    phase_rows.append({'t': key[0], 'slot': key[1],
                        'sameNativeBodyAndConsumedPicture': True, 'before': bu, 'after': au})
            changed.append({'id': at['id'], 'beforeGain': bt['result']['offenseYards'],
                'afterGain': at['result']['offenseYards'],
                'firstFrameDifferenceOnSameNativeBody': frame_rows[0] if frame_rows else None,
                'phaseDifferencesOnSameNativeBodyAndPicture': phase_rows})
        for slot, m in at['olMetrics'].items():
            if m['falls'] <= bt['olMetrics'][slot]['falls']:
                continue
            times = sorted({u['t'] for u in at['updates']
                if any(r['slot'] == slot and r['fall'] for r in u['deliveredStep'])})
            for time in times:
                new = native_at(at, slot, time)
                old = native_at(bt, slot, time)
                fall_events = [e for e in at['result']['events'] if e['type'] == 'fall' and abs(e['t'] - time) < 1e-9]
                # Retain preceding support and ensuing support state. The
                # world produces the fall; a zone phase is not a fall cue.
                before_after = {phase: [native_at(t, slot, round(time + offset, 9))
                    for offset in [-.1, -.05, 0, .05]] for phase, t in [('before', bt), ('after', at)]}
                falls.append({'id': at['id'], 'slot': slot, 't': time,
                    'beforeGain': bt['result']['offenseYards'], 'afterGain': at['result']['offenseYards'],
                    'fallEvents': fall_events, 'beforeFallTick': old, 'afterFallTick': new,
                    'nativeWindow': before_after,
                    'newNativeContactPartners': sorted({c['other'] for c in new['nativeLoad']['physicalContacts']}
                        - {c['other'] for c in old['nativeLoad']['physicalContacts']}) if old else None})
    report = {
        'schema': 'zone-fit-transition-audit-v1', 'auditToolSha256': sha(Path(__file__)),
        'inputSha256': {str(p): sha(p) for p in [args.before, args.after]},
        'beforeSource': b['sourceBefore'], 'afterSource': a['sourceBefore'],
        'collectorSha256': a['collectorSha256'], 'worldSha256': a['moduleSha256']['src/physics/world.ts'],
        'summary': {'pairedInputs': len(a['trials']), 'changedCompleteExecutions': len(changed),
            'changedExecutionsWithFrameInterventionOnIdenticalNativeBody': sum(
                c['firstFrameDifferenceOnSameNativeBody'] is not None for c in changed),
            'phaseChangesOnIdenticalNativeBodyAndPicture': sum(
                len(c['phaseDifferencesOnSameNativeBodyAndPicture']) for c in changed),
            'newNativeFallTicks': len(falls)},
        'changedExecutions': changed, 'newFalls': falls,
        'definitions': {
            'sameNativeBodyInput': 'Exact pos, vel, facing, stance, support and energy at controller start; new frame/plan metadata is compared separately.',
            'phaseChange': 'A different desired phase with identical native body, read creation time and consumed image. Free-travel estimate differences alone are not physical changes.',
            'nativeUnits': 'Force kg*yd/s^2, impulse kg*yd/s and work kg*yd^2/s^2. Multiply force/impulse by .9144 for N/N*s and work by .9144^2 for J. Saved fields remain native.',
            'fall': 'Native lastStep reports a fall, with actual contacts, impulse/work budgets and pre/next support states retained. It is not inferred from a phase label.'},
        'limits': ['Native first-frame intervention supports a mechanism, not a one-factor ablation proving causal exclusivity.',
            'These panels change both legacy-frame preservation and the support-scaled free-travel heuristic. Changed endpoints have no observed phase switch on identical native inputs before a frame change.',
            'Native support and collision consequence can be physically coherent while the runner/controller choice that creates the contact remains poor football.',
            'Every comparison uses saved observations; no new perception, RNG, plays or forced finishes.']}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'output': str(args.output), 'summary': report['summary']}, indent=2))


if __name__ == '__main__':
    main()
