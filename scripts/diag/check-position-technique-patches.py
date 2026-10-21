from pathlib import Path
import hashlib, io, json, subprocess, tarfile, tempfile
ROOT=Path(__file__).resolve().parents[2]
BASE='80e815102709a19026eb5398a7e5daaa844d7bb4'
BASE_SOURCE='246931590ef723662a4e6178755660185b13487efe2a7d7e8dce503710b08469'
EXPECTED={
    'coarse-engine.patch':'f641f128241746ab1b0b6a90f13affb05a0c8505e35792195ce19497ea5bccdd',
    'combined-engine.patch':'d73aaed8c8095e2b7050ae1fd07fe257ff44c8b7805811369b955750856b1121',
    'engine.patch':'dd4cbb75c981e82e8a33d8e5d1c30d72d922d824de99fd9cba77403d0c7f9843',
}
archive=subprocess.check_output(['git','archive',BASE,'src','scripts/source-version.ts','package.json'],cwd=ROOT)
def canonical_source(directory):
    return subprocess.check_output(['node','--import','tsx','-e',"import('./scripts/source-version.ts').then(m=>console.log(m.sourceVersion()))"],cwd=directory,text=True).strip()
rows=[]
for name,expected in EXPECTED.items():
    patch=ROOT/'data/reviews/physics-world/position-technique'/name
    with tempfile.TemporaryDirectory(prefix='position-patch-',dir='/tmp') as temporary:
        directory=Path(temporary)
        with tarfile.open(fileobj=io.BytesIO(archive)) as tf:tf.extractall(directory,filter='data')
        (directory/'node_modules').symlink_to(ROOT/'node_modules',target_is_directory=True)
        before=canonical_source(directory);assert before==BASE_SOURCE
        subprocess.run(['git','apply','--check',str(patch)],cwd=directory,check=True)
        subprocess.run(['git','apply',str(patch)],cwd=directory,check=True)
        after=canonical_source(directory);assert after==expected,(name,after,expected)
        if name=='engine.patch':
            actual={str(f.relative_to(directory)):f.read_bytes() for f in (directory/'src').rglob('*') if f.is_file()}
            live={str(f.relative_to(ROOT)):f.read_bytes() for f in (ROOT/'src').rglob('*') if f.is_file()}
            assert actual==live,'Final patched C source is not byte-exact current frozen source'
        subprocess.run(['git','apply','--reverse',str(patch)],cwd=directory,check=True)
        reversed_source=canonical_source(directory);assert reversed_source==BASE_SOURCE
        rows.append({'patch':str(patch.relative_to(ROOT)),'patchSha256':hashlib.sha256(patch.read_bytes()).hexdigest(),'baselineCommit':BASE,'beforeSource':before,'afterSource':after,'reverseSource':reversed_source,'actualCanonicalSourceVersion':True,'forwardPatchApplied':True,'reversePatchApplied':True,'finalWholeTreeMatchesLive':True if name=='engine.patch' else None})
proof={'schema':'independent-position-technique-patch-proof-v1','passed':True,'toolSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'proofs':rows,'scope':'Ephemeral independent git archives only; no baseline or production files modified; source identity comes from actual scripts/source-version.ts.'}
output=ROOT/'out/position-technique-verification/patch-proof.json';output.write_text(json.dumps(proof,indent=2)+'\n')
print(json.dumps(proof,indent=2))
