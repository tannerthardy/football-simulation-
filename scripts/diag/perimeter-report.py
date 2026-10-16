"""Summarize saved perimeter traces and render offline film; simulates zero snaps.

Run from the repository root after the commands in the review README.
"""
import gzip
import hashlib
import json
import math
from pathlib import Path

DEST = Path('data/reviews/current/perimeter-runs')
ARMS = ['initial', 'buck-mesh', 'climber-account', 'force-entry', 'corner', 'final', 'transfer']
all_rows, film, costs = [], {}, []


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


for arm in ARMS:
    folder = Path('out/perimeter-' + arm)
    path = folder / 'trace.json.gz'
    tape = json.loads(gzip.decompress(path.read_bytes()))
    receipt = tape['receipt']
    saved_rows = []
    for row in tape['rows']:
        slots = {a['idx']: a['slot'] for a in row['initial']}
        pulls = [a for a in row['initial'] if a['plan'] and a['plan']['kind'] == 'pull']
        impacts = [{'t': f['t'], 'a': slots[c['i']], 'b': slots[c['j']], 'impulse': c['impulse']}
                   for f in row['frames'] for c in f['report']['contacts']
                   if c['i'] < 11 and c['j'] < 11 and c['impulse'] > 0]
        events = row['events']
        arrival = row['firstContact']
        at_arrival = min(row['frames'], key=lambda f: abs(f['t'] - arrival['t'])) if arrival else None
        jobs = []
        for a in pulls:
            i, p = a['idx'], a['plan']
            side = 1 if p['pullPath'][-1]['y'] > a['body']['pos']['y'] else -1
            crossing = next((f['t'] for f in row['frames']
                             if (f['before'][i]['pos']['y'] - p['pullPath'][-1]['y']) * side >= 0), None)
            jobs.append({'slot': a['slot'], 'role': p['pullRole'], 'target': slots.get(p['target']),
                         'crossedCornerAt': crossing,
                         'loadedContact': [e for e in events if e['type'] == 'block_contact' and e['a'] == i],
                         'atArrival': None if at_arrival is None else {
                             'own': at_arrival['before'][i], 'rawRequest': at_arrival['raw'][i],
                             'target': at_arrival['before'][p['target']] if p['target'] is not None else None}})
        saved_rows.append({'id': row['id'], 'inputSha256': row['inputSha256'], 'gain': row['gain'],
                           'endTime': row['endTime'], 'censor': row['censor'], 'outcome': row['outcome'],
                           'firstContact': arrival, 'pullers': jobs, 'installed': row['installed'],
                           'offensivePeerImpacts': impacts, 'events': events,
                           'maxWorkResidual': max(abs(f['report']['work']['residual']) for f in row['frames']),
                           'elapsedSeconds': row['elapsedSeconds']})
        if arm in ['initial', 'final', 'transfer']:
            # The film uses post-World body positions. Its ball snapshot was
            # captured before World, so never present it as a synchronized ball
            # flight reconstruction. Show possession only, label the pitch.
            frames = []
            for index, f in enumerate(row['frames']):
                if index % 2 and index != len(row['frames']) - 1:
                    continue
                bodies = [[round(b['pos']['x'], 3), round(b['pos']['y'], 3),
                           round(b['facing'], 3)] for b in f['after']]
                loads = [[e['b'], e['d']] for e in f['afterReps'] if e['hands'] and
                         math.hypot(e['hands']['normal'], e['hands']['tangent']) > 1e-8]
                frames.append({'t': round(f['t'] + .05, 2), 'b': bodies, 'loads': loads,
                               'carrier': f['ball']['carrier'], 'ballKind': f['ball']['kind']})
            film.setdefault(row['id'], {})[arm] = {'source': receipt['source'], 'gain': row['gain'],
                'endTime': row['endTime'], 'slots': list(slots.values()),
                'radius': [a['body']['profile']['radius'] for a in row['initial']],
                'jobs': [[a['idx'], a['plan']['kind'], a['plan']['pullRole'], a['plan']['target']]
                         for a in row['initial'] if a['plan']], 'frames': frames}
    all_rows.append({'arm': arm, 'receipt': receipt, 'traceSha256': digest(path), 'rows': saved_rows})

for path in sorted(Path('out/baseline').glob('run-*.json')):
    value = json.loads(path.read_text())
    # This worktree's receipts only. Keep original failed invocations failed.
    if value.get('branch') != 'codex/perimeter-run-concepts':
        continue
    costs.append({'file': path.name, 'sha256': digest(path), 'exitCode': value['exitCode'],
                  'commands': value['commands']})
    (DEST / 'receipts').mkdir(parents=True, exist_ok=True)
    (DEST / 'receipts' / path.name).write_bytes(path.read_bytes())

report = {'schema': 'perimeter-report-v1', 'arms': all_rows, 'commands': costs,
          'nativeSnaps': sum(len(a['rows']) for a in all_rows), 'games': 0,
          'nativeCollectorSeconds': sum(a['receipt']['elapsedSeconds'] for a in all_rows),
          'commandSeconds': sum(c['elapsedSeconds'] for r in costs for c in r['commands']),
          'qualifications': ['All 22 normal reactions, no full games or roster panel.',
            'A block_contact event requires delivered load, but does not itself certify route protection.',
            'Offensive peer contacts use World contact i/j indices and positive impulse, not hand links.',
            'Frame t is the interval [t,t+.05]; native event clocks are retained without rewriting.',
            'Same inputs/seed do not guarantee matching later execution draws after changed interactions.']}
(DEST / 'summary.json').write_text(json.dumps(report, indent=2) + '\n')

html = '''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Perimeter-run development film</title>
<style>body{font:16px system-ui;background:#101b23;color:#eee;margin:20px;max-width:1500px}button,select,input{font:inherit;margin:6px}canvas{width:100%;background:#133d31}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:14px}small{color:#bdd2d4}p{max-width:1000px}h2{font-size:18px}</style>
<h1>Buck sweep · Pin and pull · Crack toss</h1>
<p>Explicit-call development prototypes. These clips include failed protection and defensive wins; gains are individual outcomes, not averages. Both panels are new-call development versions, not accepted-baseline comparisons.</p>
<select id="pick"></select><button id="play">Play</button><button id="reset">Restart</button>
<select id="rate"><option value="1">1×</option><option value="0.5">½×</option><option value="0.25">¼×</option></select>
<label><input type="checkbox" id="zoom" checked> Core view</label>
<label><input type="checkbox" id="jobs"> Installed jobs</label><br>
<input id="scrub" type="range" min="0.05" max="5" step="0.05" value="0.05" style="width:80%"><span id="clock"></span>
<p><small>Blue offense; red defense; yellow ring denotes possession. Gold links show measured hand force, including lateral load at zero compression. They do not prove protection. Dashed job links show installed assignments, not player knowledge. Full-field view includes all 22. Post-World bodies at 10 Hz; possession is the pre-World snapshot. Pitch flight is labelled rather than drawn out of sync. No interpolated motion.</small></p>
<section><div><h2 id="title0"></h2><canvas id="c0" width="900" height="700"></canvas><small id="pin0"></small></div><div><h2 id="title1"></h2><canvas id="c1" width="900" height="700"></canvas><small id="pin1"></small></div></section>
<p>Download this HTML and open it in a browser. It is self-contained, uses no network requests and needs no server. Engine 8ebc4c5; Node22.23.3; accepted44 flags, RUN_CONTACT_COMPONENTS=1, CF_FLOW unset. Physics/capacities unchanged.</p>
<script>const film=__FILM__;
const $=id=>document.getElementById(id), labels={B01:'Buck / Over',P01:'Pin-pull / Over',C01:'Crack toss / strong / Over',P02:'Pin-pull / Under (fresh)',C02:'Crack toss / weak / Over (fresh)'};
for(const key of Object.keys(film)){const o=document.createElement('option');o.value=key;o.textContent=labels[key];$('pick').append(o)}
let running=false,previous=0,current=.05;
function draw(id,data,title){const canvas=$('c'+id),ctx=canvas.getContext('2d');ctx.clearRect(0,0,900,700);$('title'+id).textContent=title;
if(!data){ctx.fillStyle='#fff';ctx.font='22px system-ui';ctx.fillText('Fresh case: no initial-version replay',100,300);$('pin'+id).textContent='';return}
const time=+$('scrub').value,frame=data.frames.filter(f=>f.t<=time).at(-1)||data.frames[0],core=$('zoom').checked;
const ymin=core?13:0,ymax=core?40.34:53.33,xmin=30,xmax=55,scale=Math.min(850/(ymax-ymin),640/(xmax-xmin));
const xy=(x,y)=>[450-(y-(ymin+ymax)/2)*scale,350-(x-(xmin+xmax)/2)*scale];
ctx.strokeStyle='#507367';ctx.lineWidth=1;ctx.font='14px system-ui';
for(let x=30;x<=55;x+=5){const a=xy(x,ymin),b=xy(x,ymax);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();ctx.fillStyle='#abc';ctx.fillText(x,a[0]-25,a[1]-4)}
ctx.strokeStyle='#82d8ff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(...xy(40,ymin));ctx.lineTo(...xy(40,ymax));ctx.stroke();
function link(a,b,color,dashed=false){if(!frame.b[a]||!frame.b[b])return;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash(dashed?[6,5]:[]);ctx.beginPath();ctx.moveTo(...xy(...frame.b[a]));ctx.lineTo(...xy(...frame.b[b]));ctx.stroke();ctx.setLineDash([])}
if($('jobs').checked)for(const [a,k,r,b] of data.jobs)if(b!==null)link(a,b,'#b4bfd480',true);
for(const [a,b] of frame.loads)link(a,b,'#ffc34b');
for(let i=0;i<frame.b.length;i++){const [x,y,face]=frame.b[i],p=xy(x,y);ctx.fillStyle=i<11?'#68b9ef':'#fa8585';ctx.beginPath();ctx.arc(...p,data.radius[i]*scale,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(p[0]-Math.sin(face)*.65*scale,p[1]-Math.cos(face)*.65*scale);ctx.stroke();if(frame.carrier===i){ctx.strokeStyle='#ffe85b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(...p,(data.radius[i]+.2)*scale,0,Math.PI*2);ctx.stroke()}
ctx.font='13px system-ui';ctx.fillStyle='#fff';ctx.fillText(data.slots[i],p[0]+7,p[1]-7)}
ctx.fillStyle='#fff';ctx.font='18px system-ui';ctx.fillText(frame.ballKind==='pitch'?'Backward pitch in flight':time>=data.endTime?'Native ending: tackle':'Live',25,30);
$('pin'+id).textContent=data.gain.toFixed(2)+' yd · ending '+data.endTime.toFixed(2)+'s · source '+data.source.slice(0,12)}
function render(){const r=film[$('pick').value];draw(0,r.initial,'First development version');draw(1,r.final||r.transfer,'Refined development version');$('clock').textContent=(+$('scrub').value).toFixed(2)+'s'}
$('play').onclick=()=>{running=!running;$('play').textContent=running?'Pause':'Play'};
$('reset').onclick=()=>{current=.05;$('scrub').value=current;render()};for(const id of ['scrub','pick','zoom','jobs'])$(id).oninput=()=>{current=+$('scrub').value;render()};
function tick(now){if(running&&previous){const r=film[$('pick').value],end=Math.max(...Object.values(r).map(a=>a.endTime));current=Math.min(end,current+(now-previous)/1000*+$('rate').value);$('scrub').value=current;if(current>=end){running=false;$('play').textContent='Play'}render()}previous=now;requestAnimationFrame(tick)}render();requestAnimationFrame(tick);
</script>'''.replace('__FILM__', json.dumps(film, separators=(',', ':')))
target = Path('docs/reviews/perimeter-runs')
target.mkdir(parents=True, exist_ok=True)
(target / 'film.html').write_text(html)
print(json.dumps({k: report[k] for k in ['nativeSnaps', 'games', 'nativeCollectorSeconds', 'commandSeconds']}))
print('Film bytes:', len(html.encode()))
