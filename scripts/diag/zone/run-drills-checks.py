"""Reduce cached full-context reports; no simulation or new football inputs."""
import argparse
import gzip
import json
import math
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--capture', default='out/run-drills/native-prefix.json.gz')
parser.add_argument('--output', default='out/run-drills/physical-checks.json')
args = parser.parse_args()
p = json.loads(gzip.decompress(Path(args.capture).read_bytes()))
assert p['prefixExact'] and len(p['hashes']) == 54
maxima = {'armImpulseExcess': 0, 'armWorkExcess': 0, 'supportWorkExcess': 0,
          'workResidual': 0, 'postureRateExcess': 0,
          'wholeContextLinearImpulseResidual': 0}
for f in p['frames']:
    r, dt = f['report'], f['dt']
    assert len(f['beforeBodies']) == len(f['afterBodies']) == 22
    for i, (b, a) in enumerate(zip(f['beforeBodies'], f['afterBodies'])):
        assert b['profile'] == a['profile']
        maxima['armImpulseExcess'] = max(maxima['armImpulseExcess'], r['armImpulse'][i] - r['armImpulseLimit'][i])
        maxima['armWorkExcess'] = max(maxima['armWorkExcess'], r['armWork'][i] - r['armWorkLimit'][i])
        maxima['supportWorkExcess'] = max(maxima['supportWorkExcess'], r['supportMotorWork'][i] - r['supportMotorWorkLimit'][i])
        maxima['postureRateExcess'] = max(maxima['postureRateExcess'], abs(a['support']['posture'] - b['support']['posture']) - 2.5 * dt)
    maxima['workResidual'] = max(maxima['workResidual'], abs(r['work']['residual']))
    residual = []
    for axis in ['x', 'y']:
        delta = sum(b['profile']['massKg'] * (a['vel'][axis] - b['vel'][axis])
                    for b, a in zip(f['beforeBodies'], f['afterBodies']))
        residual.append(delta - sum(q[axis] for q in r['groundImpulse']))
    maxima['wholeContextLinearImpulseResidual'] = max(maxima['wholeContextLinearImpulseResidual'], math.hypot(*residual))
assert all(v < 1e-8 for v in maxima.values()), maxima
out = {'protocol': 'run-drills-cached-physical-checks-v1',
       'scope': 'Pure reduction of captured original reports and22bodies. Internal hand/torso/strike impulses cancel in whole-context linear momentum; grounds are external. Not an angular-law certificate.',
       'maxima': maxima, 'nativeFrameCount': len(p['frames']),
       'newWorldSteps': 0, 'profilesUnchanged': True}
destination = Path(args.output)
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps(out, indent=2) + '\n')
print(json.dumps(out))
