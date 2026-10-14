"""Compact the bounded controller receipts without simulating another play."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

root = Path('out/rb-gather-release')
def read(name):
    path = root / name
    return json.loads(gzip.decompress(path.read_bytes()) if path.suffix == '.gz' else path.read_text())
def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

before = read('mechanism-exact-before.json.gz')
after = read('mechanism-exact-final.json.gz')
coupled = read('coupled.json.gz')
first = read('first-change.json.gz')
fixture_path = Path('data/reviews/current/rb-gather-release-state.json')
fixture = json.loads(fixture_path.read_text())
reference = json.loads(gzip.decompress(Path('out/y-coordination/review.json.gz').read_bytes()))
cases = []
for row in coupled['panel']:
    prior = next(r for r in reference['panel'] if not r['trial'] and r['input'] == row['input'])
    assert prior['hashes'] == next(r for r in json.loads(gzip.decompress(Path('out/y-coordination/saved/packets/candidate-outcomes.json.gz').read_bytes()))['panel'] if r['input'] == row['input'])['legacyStateRngHashes']
    def contacts(frames):
        return [dict(t=f['t'], **c) for f in frames for c in f['contacts'] if {c['i'], c['j']} == {2, 6}]
    windows = lambda frames: [dict(t=f['t'], RT=f['final'][2], RB=f['final'][6],
        rbVelocity=f['before'][6]['vel'], rtVelocity=f['before'][2]['vel'])
        for f in frames if 2.2 - 1e-9 <= f['t'] <= 2.65 + 1e-9]
    first_request = next((dict(t=a['t'], actors=[i for i, (x,y) in enumerate(zip(a['final'],b['final'])) if x!=y])
        for a,b in zip(prior['frames'],row['frames']) if a['final']!=b['final']), None)
    cases.append(dict(input=row['input'], fromSnap=row['fromSnap'], bodyRestores=row['bodyRestores'],
        nativeHashes=row['hashes'], referenceHashes=prior['hashes'],
        matchedReferenceHashes=sum(x==y for x,y in zip(row['hashes'],prior['hashes'])),
        firstRequestDifference=first_request, firstDifferenceBoundary=row['firstDifferenceBoundary'],
        reference=dict(yards=prior['outcome']['yards'],endTime=prior['endTime'],contacts=contacts(prior['frames'])),
        candidate=dict(yards=row['outcome']['yards'],endTime=row['endTime'],contacts=contacts(row['frames'])),
        referenceWindow=windows(prior['frames']),candidateWindow=windows(row['frames'])))

packets = [p for p in sorted(root.glob('*.json.gz')) if p.name != 'mechanism.json.gz']
launchers = {}
for p in sorted(root.glob('*launcher.json')):
    row = json.loads(p.read_text())
    assert row.pop('flags') == coupled['flags']
    assert row.pop('worldDefaults') == coupled['worldDefaults']
    launchers[p.name] = dict(sha256=digest(p), **row)
output = dict(protocol='rb-gather-release-summary-v1',
    candidate='68284671d062dfd4e7e879bcd037bc21dad3e3ac',
    priorReview='a6bf3cf47af738298c67ec45301d17c1d06b4cd3',
    runtimeCommit=subprocess.check_output(['git','rev-parse','3965abf'],text=True).strip(),testedCoupledCommit=coupled['commit'],
    testedChecksCommit=launchers['focused-passing-launcher.json']['commit'],
    publicationParent=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
    referenceSource=before['source'],initialCandidateSource='e7fff5a0792ccaed77f1e3aba1aa49a442f70c0415ce85f282b1794270643002',
    finalSource=after['source'],flags=coupled['flags'],worldDefaults=coupled['worldDefaults'],
    fixture=dict(path=str(fixture_path),sha256=digest(fixture_path),matchedSavedPrefixHashes=len(fixture['matchedSavedPrefixHashes']),
        nonFiniteNumbers=fixture['bodyNonFinite'],guards=fixture['guards']),
    sameStateComparison={k:dict(request=v['request'],upright=v['up'],clearances=v['clearances']) for k,v in after['identicalStateComparison'].items()},
    threshold=dict(before=[dict(speed=r['speed'],request=r['request']) for r in before['transition']],
        after=[dict(speed=r['speed'],request=r['request']) for r in after['transition']],
        caution=after['transitionCaution']),
    exactDecision=dict(before=before['exactDecision']['request'],after=after['exactDecision']['request']),
    clearPath=dict(request=after['clearPath']['request'],visiblePeers=0,clearances=after['clearPath']['forecast']['clearances'],
        finalMotion=after['clearPath']['forecast']['samples'][-1]),
    firstChange=dict(now=first['now'],body=first['body'],engaged=first['engaged'],constrained=first['constrained'],
        peerY=next(p for p in first['peers'] if p['idx']==7),
        comparison={k:dict(request=v['request'],upright=v['up'],clearances=v['clearances']) for k,v in first['comparison'].items()}),
    cases=cases,packetDigests={str(p):dict(sha256=digest(p),bytes=p.stat().st_size) for p in packets},launchers=launchers,
    scriptsSha256={p:digest(p) for p in ['scripts/diag/rb-gather-release.ts','scripts/diag/summarize-rb-gather-release.py',
        'test/gather-release.test.ts','test/traffic-turning.test.ts','src/sim/spacing.ts']},
    newCompleteNativePlays=4,newNativePrefixCaptures=4,newGames=0,
    retainedFailures=[
        'baseline:info without --candidate rejected the experimental runtime as expected; no simulations.',
        'First focused run: 24/25 pass; second:25/26 pass. Both fail the overbroad global no-preview squeeze assertion.',
        'A spy held mutable body references. The displayed final velocity -4e-51 was initially misread as call-time velocity. Frozen probe establishes actual unsqueezed-peer speed .20096; candidate returns the same request and both squeeze modes preserve all command/body/report frames.',
        'The assertion now excludes preview for squeezed bodies/requests; full coupled-frame identity remains required. Numerical-rest guard is machine epsilon, not a football speed cutoff.',
        'Initial clear-path forecast was incorrectly scored against witness pictures. Final measurement uses the same empty picture set as the control decision.',
        'Initial fixture JSON stored support.since=-Infinity as null. Final fixture carries a non-finite side table, restores it and strictly matches the original full native body before capture completes.'
    ],
    mechanismVerdict='The original speed gate releases an achievable-path-unsafe request at the identical saved low-speed state. Candidate keeps gathering, with all acquired peer pictures clear and support upright in the held-command preview.',
    footballVerdict='H is fully unchanged. Y still collides, later and harder after a supported earlier RT gather; no whole-football improvement or promotion claim.',
    forecastLimits=after['forecastCaution'],
    scope='No shared information, teammate sensing/memory, physics/capacity, nominal post-mesh, RT recovery search, new baseline or accepted runtime changed. Candidate remains on isolated experimental branch; Integration owns full checks.')
path = Path('data/reviews/current/rb-gather-release.json')
path.write_text(json.dumps(output,indent=2)+'\n')
print(json.dumps(dict(path=str(path),bytes=path.stat().st_size,source=after['source'],cases=[dict(input=r['input']['id'],reference=r['reference'],candidate=r['candidate']) for r in cases])))
