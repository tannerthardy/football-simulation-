"""Exact replay reuse check: held #180 tape versus final execution optimization."""
import gzip, hashlib, json
from pathlib import Path
ROOT=Path.cwd()
old_path=ROOT/'out/loaded-movement/yaw-native/native/current-fast/TOSS.json.gz'
original_path=ROOT/'out/loaded-movement/yaw-native/native/current-candidate/TOSS.json.gz'
new_path=ROOT/'out/yaw-readiness/native-final/TOSS.json.gz'
old=json.load(gzip.open(old_path,'rt'))
original=json.load(gzip.open(original_path,'rt'))
new=json.load(gzip.open(new_path,'rt'))
launch=json.loads((ROOT/'out/yaw-readiness/native-parity-launch.json').read_text())
normalize=lambda row:{k:v for k,v in row.items() if k not in ('source','elapsedSeconds')}
def digest(value):
 return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest()
def artifact(p):
 return {'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size}
a,b,c=normalize(old),normalize(new),normalize(original)
changed=[k for k in sorted(a.keys()|b.keys()) if a.get(k)!=b.get(k)]
result={
 'question':'Can final #180 execution optimization reuse held native body-facing and adverse-contact evidence?',
 'reference_commit':'aadac6d8b78bd452ff3bb92b337e027bec4a0d25',
 'new_commit':'f96a85fdd818b6fd860554e7a9881083ae0dd60c',
 'reference_source':old['source'],'new_source':new['source'],
 'input_sha256':old['inputSha256'],'input_equal':old['inputSha256']==new['inputSha256'],
 'normalized_fields_excluded':['source','elapsedSeconds'],
 'normalized_reference_sha256':digest(a),'normalized_new_sha256':digest(b),
 'normalized_original_unoptimized_sha256':digest(c),
 'normalized_exact_equal':a==b,'original_unoptimized_exact_equal':b==c,
 'different_fields':changed,'tick_count':len(new['ticks']),
 'field_parity':{k:old[k]==new[k] for k in ('initial','ticks','cues','calls','aims','contact','events','result')},
 'recording_seconds':new['elapsedSeconds'],
 'cost_qualification':'One saved Toss input, passive capture. Recording is not an uninstrumented benchmark; cost owner runs after this work.',
 'launch_exit_code':launch['exitCode'],'launch_inputs_unchanged':launch['inputsUnchanged'],
 'launch_source_matches_tape':launch['sourceSha256']==new['source'],
 'node':launch['node'],'platform':launch['platform'],'arch':launch['arch'],
 'flags':launch['flags'],'worldDefaults':launch['worldDefaults'],
 'artifacts':[artifact(p) for p in (old_path,original_path,new_path,ROOT/'out/loaded-movement/yaw-native/capture-current.mjs',ROOT/'out/loaded-movement/yaw-native/toss-input.json.gz')]
}
output=ROOT/'out/yaw-readiness/final-native-parity.json'
output.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
assert result['input_equal']
assert result['normalized_exact_equal'],changed
assert result['original_unoptimized_exact_equal']
assert result['tick_count']==94
assert result['launch_inputs_unchanged']
assert result['launch_source_matches_tape']
