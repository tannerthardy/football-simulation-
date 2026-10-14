"""Extract a compact review receipt without running any simulations."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path('out/y-coordination')
packet = ROOT / 'review.json.gz'
data = json.loads(gzip.decompress(packet.read_bytes()))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def picture(p):
    if p['source'] == 'unavailable':
        return [p['source']]
    return [p['source'], p['pos']['x'], p['pos']['y'], p['vel']['x'], p['vel']['y'],
            p['sampledAt'], p['availableAt'], p['age'], p['predictedFor']]


def contacts(row):
    return [dict(t=f['t'], **c) for f in row['frames'] for c in f['contacts']
            if {c['i'], c['j']} == {2, 6}]


def body(b):
    return {k: b[k] for k in ('pos', 'vel', 'facing', 'energy', 'support', 'squeeze')}


cases = []
for baseline, trial in zip(data['panel'][::2], data['panel'][1::2]):
    history = [[f['t'], *[picture(x['information']) for x in f['pairs']]] for f in baseline['sightings']]
    opportunities = []
    for f in baseline['sightings']:
        opportunities.append([f['t'], *[[x['angle'], x['engaged'], x['down'],
            [[s['sampledAt'], s['availableAt']] for s in x['pending']]] for x in f['pairs']]])
    legacy = {}
    for q in baseline['legacyQueries']:
        key = (q['t'], q['observer'], q['target'])
        legacy.setdefault(key, [q['t'], q['observer'], q['target'], q['picture']])
    window = []
    for f in baseline['frames']:
        if not 2.2 - 1e-9 <= f['t'] <= 2.6 + 1e-9:
            continue
        window.append(dict(t=f['t'], actors=[dict(idx=a, before=body(f['before'][a]),
            raw=f['raw'][a], final=f['final'][a], after=body(f['after'][a])) for a in (2, 6)],
            information=f['information'], contacts=f['contacts']))
    changed = []
    for f in baseline['frames']:
        actors = [a for a in range(22) if f['final'][a] != f['shadow'][a]]
        if actors:
            changed.append(dict(t=f['t'], actors=[dict(idx=a, native=f['final'][a],
                trial=f['shadow'][a]) for a in actors], actualRB=f['before'][6]['pos']))
    first = next(i for i, (a, b) in enumerate(zip(baseline['hashes'], trial['hashes'])) if a != b)
    cases.append(dict(input=baseline['input'], matchedSavedHashes=baseline['matchedSavedHashes'],
        nativeEndTime=baseline['endTime'], trialEndTime=trial['endTime'],
        nativeYards=baseline['outcome']['yards'], trialYards=trial['outcome']['yards'],
        nativeOutcome=baseline['outcome']['outcome'], trialOutcome=trial['outcome']['outcome'],
        nativeContacts=contacts(baseline), trialContacts=contacts(trial),
        firstTrialDifferenceBoundary=(first+1)*.05,
        installedTrial=baseline['calls'], informationHistory=history, sensingHistory=opportunities,
        legacyRT_RBQueries=list(legacy.values()), collisionWindow=window,
        sameStateRequestChanges=changed, nativeStateRngHashes=baseline['hashes'], trialStateRngHashes=trial['hashes']))

launchers = {p.name: json.loads(p.read_text()) for p in sorted(ROOT.glob('*launcher.json'))}
result = dict(protocol='y-coordination-review-summary-v1', candidate=data['candidate'],
    engineSourceSha256=data['source'], harnessRevision=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    scriptsSha256={str(p): digest(p) for p in [Path('scripts/diag/post-mesh-trial.ts'),
        Path('scripts/diag/y-coordination-review.ts'), Path('scripts/diag/summarize-y-coordination.py'), Path('test/post-mesh-trial.test.ts')]},
    savedPacketSha256=data['savedPacketSha256'], packetSha256=digest(packet), packetBytes=packet.stat().st_size,
    packetPath=str(packet), flags=data['flags'], worldDefaults=data['worldDefaults'],
    historyColumns=['entryTime', 'RT_to_RB', 'RB_to_RT'],
    pictureColumns=['source', 'posX', 'posY', 'velX', 'velY', 'sampledAt', 'availableAt', 'age', 'predictedFor'],
    sensingColumns=['entryTime', 'RT_to_RB', 'RB_to_RT'],
    sensingPairColumns=['torsoBearingRadians', 'engaged', 'down', 'pendingSampleAndDeliveryTimes'],
    historyScope='After once-per-tick sensing, before native decisions. Complete candidate RT/RB query history from snap. Unavailable has no coordinates.',
    cases=cases, launchers=launchers, nativeFinalInternalSeconds=data['seconds'],
    totalNativePlaysCollected=8, newGames=0, productionChanged=False, trialPromoted=False,
    verdict='Nominal post-mesh track missing from install, but this continuation fails: Y collision remains and H gains a new rear collision. No vision/memory extension justified.',
    physicalPreviewScope='Unloaded RB forecast against the recorded RT path only; not a coupled counterfactual or proof of avoiding contact under changed RT/defender responses.')
destination = Path('data/reviews/current/y-coordination-review.json')
destination.write_text(json.dumps(result, separators=(',', ':')) + '\n')
print(json.dumps(dict(path=str(destination), bytes=destination.stat().st_size, sha256=digest(destination))))
