"""Inspect saved first cutoff forecasts. Zero simulations or new expectations."""
import gzip
import hashlib
import json
import math
from pathlib import Path

root = Path('data/reviews/current/pass-cutoff-approach')
source = '0eb4c7652f49c420c25535f4932bdc6abe24443ba05163f8ac2d999a7f6bee56'
distance = lambda a, b: math.hypot(a['x'] - b['x'], a['y'] - b['y'])
rows, inputs = [], []
for folder in ('production-controls', 'production-transfer'):
    path = root / folder / 'trace.json.gz'
    packet = json.loads(gzip.decompress(path.read_bytes()))
    assert packet['receipt']['sourceSha256'] == source
    inputs.append({'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    for run in packet['rows']:
        for slot in ('LT', 'RT'):
            request = next(d for d in run['decisions'] if d['slot'] == slot and d.get('cutoff'))
            cutoff = request['cutoff']
            deadline = request['t'] + cutoff['tau']
            frame = min(run['frames'], key=lambda f: abs(f['t'] + .05 - deadline))
            initial = next(f for f in run['frames'] if abs(f['t'] - request['t']) < 1e-8)
            assert abs(frame['t'] + .05 - deadline) < 1e-8
            blocker, rusher = frame['after'][request['a']], frame['after'][request['target']]
            rows.append({'play': run['play'], 'index': run['index'], 'slot': slot,
                         'requestTime': request['t'], 'interval': cutoff['tau'], 'deadline': deadline,
                         'forecastOwnReach': cutoff['tReach'], 'raw': request['raw'],
                         'final': initial['final'][request['a']], 'insidePoint': cutoff['inside'],
                         'predictedRusherPoint': cutoff['rusherPoint'],
                         'actualBlocker': blocker, 'actualRusher': rusher,
                         'ownMissToInsidePoint': distance(blocker['pos'], cutoff['inside']),
                         'rusherPredictionError': distance(rusher['pos'], cutoff['rusherPoint']),
                         'actualPairDistance': distance(blocker['pos'], rusher['pos']),
                         'nominalContact': cutoff['contact'],
                         'firstEngagement': next((e['t'] for e in run['engagementStarts'] if e['b'] == request['a']), None),
                         'savedHeldInitialRequestProbe': request.get('probe')})
result = {'source': source, 'runtime': packet['receipt']['commit'], 'inputs': inputs,
          'scope': 'Offline six first-set proposals in the same three frozen inputs; zero simulations.',
          'qualification': 'Native deadline states include ordinary resampling. Saved free-body probes hold only the initial request. Engagement appearance is not first physical load. These distances alone do not certify impossibility or a complete protection ending.',
          'rows': rows}
(root / 'forecast-resume.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps([{k: r[k] for k in ('play', 'slot', 'deadline', 'actualPairDistance', 'rusherPredictionError')} for r in rows], indent=2))
