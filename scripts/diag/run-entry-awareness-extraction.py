"""Build review-only patches and check them in temporary Git indexes.
No working-tree source edit, production ref update, PlaySim or World execution.
"""
from pathlib import Path
import difflib, hashlib, json, os, subprocess, tempfile, io, tarfile
BASE='a1b16e666a9ee7d1bc1d2aecba141fc535863b24'
REVIEW='0f70bb2a4205497d7df8ed1ed59391d87084c603'
OWNER='68284671d062dfd4e7e879bcd037bc21dad3e3ac'
root=Path('docs/reviews/run-entry-awareness-extraction'); patches=root/'patches'
patches.mkdir(parents=True,exist_ok=True)
def git(*args):return subprocess.check_output(['git',*args])
def get(ref,path):return git('show',ref+':'+path).decode()
def shim(old):
 s=old.replace("import { PerceptionBuffer, type Perceived } from './perception.js';","import { PerceptionBuffer, type Perceived } from './perception.js';\nimport { TeammateInformation, type TeammatePicture } from './teammate-information.js';",1)
 s=s.replace('  readonly perception: PerceptionBuffer;','  readonly perception: PerceptionBuffer;\n  readonly teammateAwareness: TeammateInformation;',1)
 s=s.replace('    assignBehaviors(this);','    assignBehaviors(this);\n    // Observation-only extraction: no installed-call builder or touch writer.\n    this.teammateAwareness = new TeammateInformation(this.agents, new Map());',1)
 s=s.replace('  slot(name: string): Agent | undefined {',"  /** Pure acquired-picture query; unavailable never falls back to live state. */\n  teammateInformation(observer: Agent, target: Agent): TeammatePicture {\n    if (observer === target || observer.team !== target.team) return { source: 'unavailable' };\n    return this.teammateAwareness.query(observer.idx, target.idx, this.t, this.dt);\n  }\n  slot(name: string): Agent | undefined {",1)
 s=s.replace('    for (const d of this.defense) d.recog?.update(d, this);','    this.teammateAwareness.sense(this.agents, t, this.dt);\n    for (const d of this.defense) d.recog?.update(d, this);',1)
 assert s!=old and s.count('teammateAwareness.sense')==1
 return s
core=get(OWNER,'src/sim/teammate-information.ts')
new_file='diff --git a/src/sim/teammate-information.ts b/src/sim/teammate-information.ts\nnew file mode 100644\n'+''.join(difflib.unified_diff([],core.splitlines(True),fromfile='/dev/null',tofile='b/src/sim/teammate-information.ts'))
for ref,name in [(BASE,'01-observation-core-proposal.patch'),(REVIEW,'01b-observation-core-after63-proposal.patch')]:
 path='src/sim/playsim.ts';old=get(ref,path)
 (patches/name).write_text(new_file+'diff --git a/'+path+' b/'+path+'\n'+''.join(difflib.unified_diff(old.splitlines(True),shim(old).splitlines(True),fromfile='a/'+path,tofile='b/'+path)))
(patches/'02-information-risk.patch').write_bytes(git('diff','f8ce858^','f8ce858','--','src/sim/behaviors/carrier.ts'))
s=git('diff','--binary','f8ce858','cfcb7db','--','src','test').decode()
context='private evaluate(a: Agent, sim: PlaySim, dir: number, designed: boolean, assessmentAim = this.opts.aim):'
assert context in s
(patches/'03-admission-context-only-proposal.patch').write_text(s.replace(context,'private evaluate(a: Agent, sim: PlaySim, dir: number, designed: boolean):'))
# Git accepts unprefixed empty context lines; avoid whitespace-only lines in
# a patch stored inside another diff without changing its source meaning.
for patch in patches.glob('*.patch'):
 patch.write_text(patch.read_text().replace('\n \n','\n\n'))
checks=[]
for ref,first in [(BASE,'01-observation-core-proposal.patch'),(REVIEW,'01b-observation-core-after63-proposal.patch')]:
 with tempfile.TemporaryDirectory(prefix='entry-extraction-') as temp:
  env=dict(os.environ,GIT_INDEX_FILE=temp+'/index');subprocess.run(['git','read-tree',ref],env=env,check=True)
  statuses=[]
  for name in [first,'02-information-risk.patch','03-admission-context-only-proposal.patch']:
   r=subprocess.run(['git','apply','--cached',str(patches/name)],env=env,capture_output=True,text=True)
   statuses.append({'patch':name,'exitCode':r.returncode,'stderr':r.stderr})
   if r.returncode:break
  tree=subprocess.check_output(['git','write-tree'],env=env).decode().strip() if all(s['exitCode']==0 for s in statuses) else None
  check={'base':ref,'temporaryIndexOnly':True,'patches':statuses,'proposedTree':tree};checks.append(check)
  if tree:
   check['changedFiles']=git('diff','--name-only',ref,tree).decode().splitlines()
   if ref==BASE:
    out=Path('out/run-entry-awareness/proposed-typecheck');out.mkdir(parents=True,exist_ok=True)
    archive=git('archive',tree,'src','scripts','test','tsconfig.json','package.json','package-lock.json')
    with tarfile.open(fileobj=io.BytesIO(archive)) as t:t.extractall(out,filter='data')
    deps=out/'node_modules'
    if not deps.exists():deps.symlink_to(Path('node_modules').resolve())
    h=hashlib.sha256()
    for p in sorted((p for p in (out/'src').rglob('*') if p.is_file()),key=lambda p:str(p.relative_to(out))):
     h.update(str(p.relative_to(out)).encode());h.update(b'\0');h.update(p.read_bytes());h.update(b'\0')
    check['proposedSourceSha256']=h.hexdigest();check['typecheckProject']=str(out/'tsconfig.json')
report={'schema':'run-entry-awareness-extraction-check-v1','accepted':BASE,'review63':REVIEW,'owner':OWNER,
 'ownerCoreSha256':hashlib.sha256(core.encode()).hexdigest(),'checks':checks,
 'patchSha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(patches.glob('*.patch'))},
 'original63ImportConflict':'Accepted-base import context overlaps #63 IncidentalCatchReadiness. The after63 variant preserves that import; same semantic shim and unchanged owner core.',
 'admissionContextAdaptation':'Preserve accepted four-argument evaluate signature. Do not import recorded-engine assessmentAim change or Behavior.runSurfaceMotion.',
 'productionRuntimeEdited':False,'newWorldSteps':0,'semanticApproval':False}
(root/'application-check.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
assert all(c['proposedTree'] for c in checks),'Preserve failed context and stop before runtime implementation'
