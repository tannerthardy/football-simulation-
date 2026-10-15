"""Reconstruct P040's loaded pass foot request from saved native evidence.

Zero simulations. Only use ticks whose preceding hand force was recorded;
never interpolate that force across contact. Units are yd/s, yards and N.
"""
import gzip
import json
import math
from pathlib import Path

root = Path('data/reviews/current/pass-set-opening')
row = json.loads(gzip.decompress((root/'baseline/trace.json.gz').read_bytes()))['rows'][0]
manifest = json.loads(Path('data/reviews/current/experimental-game-inputs.json').read_text())
fixture = next(f for f in manifest['fixtures'] if f['id'] == 'spread-air')
game = json.loads(gzip.decompress(Path('data/reviews/current/experimental-game-checkpoint/experimental/spread-air/game.json.gz').read_bytes()))
observation = next(o for o in game['observations'] if o['seedState']['key'] == row['initialization']['seed'])
player_id = observation['initialPlayers'][1]['id']
player = next(p for team in fixture['teams'].values() for p in team['roster'] if p['id'] == player_id)
profile = next(d['profile'] for d in row['decisions'] if d['a'] == 1)
recorded = json.loads((root/'recorded-loaded-interval.json').read_text())['frames']
los = game['log'][39]['replay']['los']
clamp = lambda x, lo, hi: max(lo, min(hi, x))
dot = lambda a, b: sum(x*y for x, y in zip(a, b))
norm = lambda x, y: (x/math.hypot(x, y), y/math.hypot(x, y))
vector = lambda v: [v['x'], v['y']]
r = lambda k: clamp((player['ratings'][k]-1)/98, 0, 1)
cone = clamp((8-player['measurables']['threeCone'])/1.3, 0, 1)
shuttle = clamp((4.9-player['measurables']['shuttle'])/.9, 0, 1)
feet = .6*r('passBlock')+.2*r('balance')+.2*cone
read = .6*r('awareness')+.4*r('handTechnique')
lateral = profile['vmax']*profile['shuffle']*(.55+.45*(.5*cone+.5*shuttle))
mirror = lateral*(.75+.35*feet)
first = next(d for d in row['decisions'] if d['a'] == 1 and d.get('cutoff'))
sep = first['cutoff']['contact']-.1-player['measurables']['armIn']/36*.55
lane = row['initialization']['ballY']+2.6+.8
results, skipped = [], []
for frame in row['frames']:
    t = frame['t']
    if not 1.4 <= t <= 1.7:
        continue
    prev = next((f for f in recorded if abs(f['t']-(t-.05)) < 1e-8), None)
    if t == 1.4:
        # First engagement tick: preceding free controller was still tracking.
        prior = next(d for d in row['decisions'] if d['a'] == 1 and d['t'] == 1.35)
        assert prior.get('steering') and prior['raw']['vel'] != {'x': 0, 'y': 0}
        force = 0
    elif prev is not None:
        block = next(e for e in prev['blocks'] if e['a'] == 1 and e['b'] == 11)
        force = block['hands']['tangentForce']
    else:
        skipped.append({'t': t, 'reason': 'Preceding hand force not recorded at this 20 Hz tick'})
        continue
    b, d, q = (frame['before'][i] for i in [1, 11, 0])
    axis = norm(q['pos']['x']-d['pos']['x'], q['pos']['y']-d['pos']['y'])
    lat = (-axis[1], axis[0])
    front = [d['pos'][k]+axis[i]*(sep+.15) for i, k in enumerate(['x', 'y'])]
    if d['pos']['y']-b['pos']['y'] > .15:
        front[1] += clamp((lane-front[1])*.5, -.4, .4)
    lead = .15+.15*read
    offlat = dot([front[i]+d['vel'][k]*lead-b['pos'][k] for i, k in enumerate(['x', 'y'])], lat)
    dlat = dot(vector(d['vel']), lat)
    bd = norm(d['pos']['x']-b['pos']['x'], d['pos']['y']-b['pos']['y'])
    felt = -dot((-bd[1], bd[0]), lat)*force/profile['massKg']*.3
    wanted = dlat+felt*(.6+.6*feet)+offlat*(3+3*feet)
    vlat = clamp(wanted, -mirror, mirror)
    depth = los-b['pos']['x']
    setdepth = max(1.4, los-q['pos']['x']-2.8)
    kick = min(profile['vmax']*profile['backpedal']*(.75+.25*feet), (setdepth-depth)/.55) if depth < setdepth else 0
    calculated = [lat[0]*vlat-kick, lat[1]*vlat]
    final = vector(frame['final'][1]['vel'])
    residual = math.dist(calculated, final)
    assert residual < 1e-10, (t, residual)
    phi = math.atan2(-dot((-bd[0], -bd[1]), lat), dot((-bd[0], -bd[1]), axis))/(math.pi/2)
    results.append(dict(t=t, axis=axis, tangent=lat, phi=phi,
        handTangentForce=force, mirror=mirror, dlat=dlat, felt=felt,
        offlat=offlat, unclampedMirror=wanted, vlat=vlat, depth=depth,
        setDepth=setdepth, kick=kick, independentlyCalculated=calculated,
        final=final, finalRequestResidual=residual, kickTangent=kick*axis[1],
        mirrorAndKickAgree=vlat*axis[1]*kick > 0,
        requestNormal=dot(calculated, axis), requestTangent=dot(calculated, lat),
        achievedNormal=dot(vector(frame['after'][1]['vel']), axis),
        achievedTangent=dot(vector(frame['after'][1]['vel']), lat)))

result = dict(schema='pass-loaded-accounting-v1', nativeSimulations=0,
    qualification='Independent reconstruction at recorded-force ticks. Exact agreement with final request demonstrates no net spacing change for this blocker, not the absence of all teammate interactions.',
    sourceSha256='1ee8610175f7f9e7ebafcbdddfe2c2aab2162e945a7668cbd54579e4d5fb6309',
    rows=results, skipped=skipped)
out = Path('out/pass-loaded-objective')
out.mkdir(parents=True, exist_ok=True)
(out/'accounting.json').write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps(result, indent=2))
