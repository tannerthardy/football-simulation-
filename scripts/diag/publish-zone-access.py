"""Package saved evidence; executes zero simulations. Run from the research host."""
import difflib
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

BASE = 'bb6d4c73948d53ba841dd9338dd240146c739f8c'
OUT = Path('data/reviews/current/zone-second-level-access')
RAW = Path('out/zone-access')
OUT.mkdir(parents=True, exist_ok=True)
digest = lambda b: hashlib.sha256(b).hexdigest()
def put(path, data):
    path.write_text(json.dumps(data, indent=2) + '\n')
def packed(path, data):
    path.write_bytes(gzip.compress(json.dumps(data, separators=(',', ':')).encode(), mtime=0))
def body(b):
    r = {k: b[k] for k in ('pos', 'vel', 'facing', 'energy', 'spin') if k in b}
    if b.get('support'): r['support'] = {k:b['support'][k] for k in ('state','posture') if k in b['support']}
    return r
def frame(f):
    r = {k: v for k, v in f.items() if k not in ('before', 'after')}
    for k in ('before', 'after'):
        if k in f: r[k] = [body(b) for b in f[k]]
    return r
versions = {}
for rev in subprocess.check_output(['git','log','--format=%H','--',str(OUT/'inputs.json')], text=True).splitlines():
    b = subprocess.check_output(['git','show',f'{rev}:{OUT}/inputs.json'])
    versions.setdefault(digest(b), rev)
index = {'accepted': BASE, 'historical': '4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',
         'qualification': 'Compact tapes retain all22 position/velocity/facing and requested movement at published frames, reported budgets, events and RNG. Profiles/support internals are omitted; frozen inputs and pinned source reconstruct native state. Rejected trials and hold diagnostics are sampled every.25 plus first-contact windows; candidate and Under reference keep every frame. Raw hashes identify original full local observers. Research variants are not promotion candidates.',
         'arms': [], 'payloads': {}}
for trace in sorted(RAW.glob('*/trace.json.gz')):
    arm = trace.parent.name
    data = json.loads(gzip.decompress(trace.read_bytes()))
    receipt = data['receipt']
    rows = data.get('rows', [data])
    compact = []
    for r in rows:
        row = {k: v for k, v in r.items() if k not in ('result', 'frames', 'calls', 'reads', 'joined')}
        full=arm in ('planned-fit','near-fit-controls','matched-candidate','matched-reference')
        arrival=next((e['t'] for e in r['events'] if e['type']=='carrier_contact'),100)
        selected=[f for i,f in enumerate(r['frames']) if full or i%5==0 or abs(f['t']-arrival)<=.1 or (arm.startswith('holds-') and (3.85<=f['t']<=3.95 or 4.4<=f['t']<=4.55))]
        times={f['t'] for f in selected}
        row['frameSelection']='every tick' if full else 'every.25 plus native first-contact window; hold diagnostics retain3.85–3.95/4.40–4.55'
        row['frames'] = [frame(f) for f in selected]
        # Preserve the actual consumed pictures, joined security and requests.
        if 'calls' in r: row['calls'] = [{**c,'body':body(c['body'])} for c in r['calls'] if c['t'] in times and c['a'] in (2,3,5,7) and c['method'] in ('attack','plannedClimb','leaveCombination','startDeparture')]
        if 'reads' in r: row['reads'] = [c for c in r['reads'] if c['t'] in times and c['a'] in (2,3,5,7)]
        if 'joined' in r: row['joined'] = [c for c in r['joined'] if c['t'] in times]
        compact.append(row)
    name = f'{arm}.json.gz'
    packed(OUT/name, {'receipt': receipt, 'rows': compact})
    item = {'arm': arm, 'receipt': receipt, 'rawSha256': digest(trace.read_bytes()), 'compact': name,
            'inputManifestCommit': versions.get(receipt['inputManifestSha256']),
            'source': receipt.get('sourceSha256',receipt.get('source'))}
    host = RAW/f'{arm}-host'
    if host.exists():
        patch = ''
        for p in sorted((host/'src').rglob('*')):
            if not p.is_file(): continue
            rel = p.relative_to(host)
            b = subprocess.check_output(['git','show',f'{BASE}:{rel}'],text=True)
            c = p.read_text()
            if b != c: patch += ''.join(difflib.unified_diff(b.splitlines(True),c.splitlines(True),f'a/{rel}',f'b/{rel}'))
        if patch:
            path = OUT/f'{arm}.patch';path.write_text(patch);item['patch']=path.name
    index['arms'].append(item)

# Compatible full-resolution Under reference from the prior completed task.
path=Path('out/current-protection-access/current/trace.json.gz')
prior=json.loads(gzip.decompress(path.read_bytes()))
r=next(r for r in prior['rows'] if r['id']=='DuoUnder')
packed(OUT/'under-reference.json.gz',{'receipt':prior['receipt'],'rawSha256':digest(path.read_bytes()),
 'row':{k:v for k,v in r.items() if k not in ('result','frames','calls','reads','joined')},
 'frames':[frame(f) for f in r['frames']]})
for arm in ('matched-reference','matched-candidate'):
    put(OUT/f'{arm}-exchange.json', json.loads((RAW/arm/'exchange.json').read_text()))
checks=[]
for p in (Path('out/baseline/run-1792133044847-282954.json'),Path('out/baseline/run-1792133072788-283219.json')):
    r=json.loads(p.read_text());checks.append(r)
put(OUT/'focused-checks.json',checks)
launchers=[]
for p in list(Path('out/baseline').glob('*.json'))+list(RAW.glob('*-host/out/baseline/*.json')):
    r=json.loads(p.read_text())
    if any(any(n in ' '.join(c['command']) for n in ('zone-access-capture','match-climb-exchange','inspect-collection-holds')) for c in r.get('commands',[])):
        launchers.append({'path':str(p),'receipt':r})
put(OUT/'native-launchers.json',launchers)
index['nativeCollectorSeconds']=sum(a['receipt']['elapsedSeconds'] for a in index['arms'])
index['newContinuations']=sum(len(a['receipt'].get('cases',[1])) for a in index['arms'])
index['nativeLauncherSeconds']=sum(c['elapsedSeconds'] for r in launchers for c in r['receipt']['commands'])
index['focusedLauncherSeconds']=sum(c['elapsedSeconds'] for r in checks for c in r['commands'])
for p in sorted(OUT.iterdir()):
    if p.is_file() and p.name!='evidence-index.json': index['payloads'][p.name]={'bytes':p.stat().st_size,'sha256':digest(p.read_bytes())}
put(OUT/'evidence-index.json',index)
print(json.dumps({k:index[k] for k in ('nativeCollectorSeconds','newContinuations','focusedLauncherSeconds')}))
print('Compact payload bytes',sum(p['bytes'] for p in index['payloads'].values()))
