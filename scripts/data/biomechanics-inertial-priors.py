"""Extract existing Hamner OpenSim segment masses/inertias from .b3d model passes."""
from pathlib import Path
import hashlib, json, xml.etree.ElementTree as ET
import sys, argparse
ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--data-dir', type=Path, default=ROOT/'out/virtual-foot-data')
parser.add_argument('--reader-dir', type=Path, default=ROOT/'out/virtual-foot-data/reader')
parser.add_argument('--out', type=Path, default=ROOT/'out/biomechanics-inertial-priors.json')
args = parser.parse_args()
sys.path.insert(0, str(args.reader_dir))
import nimblephysics_libs._nimblephysics as nimble
results=[]
for sid in ('hamner-subject01','hamner-subject02'):
    path=args.data_dir/f'{sid}.b3d'
    sub=nimble.biomechanics.SubjectOnDisk(str(path))
    passes=[]
    for p in range(sub.getNumProcessingPasses()):
        root=ET.fromstring(sub.getOpensimFileText(p))
        bodies={}
        for body in root.iter('Body'):
            name=body.attrib.get('name','')
            if not any(k in name.lower() for k in ('tibia','fibula','talus','calcn','toes','foot')): continue
            body_mass=float(body.findtext('mass','nan'))
            center=[float(v) for v in body.findtext('mass_center','nan nan nan').split()]
            inertia=[float(v) for v in body.findtext('inertia','nan nan nan nan nan nan').split()]
            bodies[name]={'massKg':body_mass,'massCenterM':center,'inertiaKgM2_IxxIyyIzzIxyIxzIyz':inertia}
        skel=sub.readSkel(p,'',True)
        total=skel.getMass()
        def m(name):return bodies[name]['massKg']
        footR=sum(m(x) for x in ('talus_r','calcn_r','toes_r'))
        footL=sum(m(x) for x in ('talus_l','calcn_l','toes_l'))
        passes.append({'index':p,'processingPass':str(sub.getProcessingPassType(p)),'skeletonMassKg':total,
          'relevantBodies':bodies,'derivedMassFractions':{
            'rightFootTalusCalcnToesKg':footR,'leftFootTalusCalcnToesKg':footL,
            'oneFootFractionOfModelMass':footR/total,'bothFeetFractionOfModelMass':(footR+footL)/total,
            'oneFootCalcnToesExcludingTalusKg':m('calcn_r')+m('toes_r'),
            'oneFootCalcnToesExcludingTalusFractionOfModelMass':(m('calcn_r')+m('toes_r'))/total,
            'oneTibiaShankKg':m('tibia_r'),'oneTibiaShankFractionOfModelMass':m('tibia_r')/total,
            'remainderAfterBilateralFootLumpsKg':total-footR-footL}})
    results.append({'subject':sid,'headerMassKg':sub.getMassKg(),'heightM':sub.getHeightM(),
      'quality':str(sub.getQuality()),'b3dBytes':path.stat().st_size,'b3dSha256':hashlib.sha256(path.read_bytes()).hexdigest(),
      'passes':passes})
out=args.out
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps({
    'reader':'nimblephysics 0.10.52.1 native SubjectOnDisk/readSkel and embedded OpenSim model XML',
    'scriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    'pythonVersion': sys.version.split()[0],
    'interpretation': 'Embedded model segment assignments, not measured segment masses. Two scaled models use the same proportions; no NFL population or effective point-foot inertia claim.',
    'subjects':results},indent=2)+'\n')
print(out)
for s in results:
 print('\n',s['subject'],'header=',s['headerMassKg'],'height=',s['heightM'],'sha256=',s['b3dSha256'])
 for p in s['passes']:
  d=p['derivedMassFractions'];print(p['processingPass'],'model mass',p['skeletonMassKg'],'foot/side',d['rightFootTalusCalcnToesKg'],'fraction',d['oneFootFractionOfModelMass'],'bilat fraction',d['bothFeetFractionOfModelMass'],'calcn+toes fraction',d['oneFootCalcnToesExcludingTalusFractionOfModelMass'],'tibia',d['oneTibiaShankKg'],'tibia fraction',d['oneTibiaShankFractionOfModelMass'])
