"""Small synthetic tracking fixtures; no licensed NFL rows or credentials."""
import importlib.util
import unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('reference',Path(__file__).parents[1]/'scripts/data/run-game-reference.py')
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)

def fixture(left=False,contact=True):
    positions={str(i):p for i,p in enumerate(['C','G','G','T','T','QB','RB','TE','TE','WR','WR','NT','DT','DT','DE','DE','LB','LB','CB','CB','FS','SS'])}
    ys=[0,1.3,-1.3,2.6,-2.6,0,0,3.9,-3.9,15,-15,0,2.2,-2.2,4.7,-4.7,1,-1,15,-15,2,-2]
    rows=[]
    for f in range(0,31):
        for i in list(positions)+['']:
            n=int(i) if i else 99
            y=26.667+(ys[n] if i else 0)
            x=(39.4 if n<5 else 35 if n<11 else 44 if n>=16 else 40.2) if i else 40
            if n<5 and f>=15:x+=.1;y+=.4
            if n==6 and f==30 and contact:x=41
            event='ball_snap' if f==10 else 'handoff' if f==23 else 'first_contact' if f==30 and contact else 'NA'
            rows.append({'nflId':i,'frameId':str(f),'frameType':'SNAP' if f==10 else 'BEFORE_SNAP' if f<10 else 'AFTER_SNAP',
              'club':'OFF' if n<11 else 'DEF' if i else 'football','x':str(120-x if left else x),'y':str(53.333333333333336-y if left else y),
              'playDirection':'left' if left else 'right','event':event})
    play={'possessionTeam':'OFF','pff_runConceptPrimary':'INSIDE ZONE','yardsGained':'4'}
    return rows,play,positions

class ReferenceTest(unittest.TestCase):
    def test_rotating_both_axes_preserves_metrics(self):
        rows,p,positions=fixture();left,_,_=fixture(left=True)
        a,error=r.measure(rows,p,positions,'6');b,error2=r.measure(left,p,positions,'6')
        self.assertIsNone(error);self.assertIsNone(error2)
        for key in a:
            if isinstance(a[key],float):self.assertAlmostEqual(a[key],b[key])
            else:self.assertEqual(a[key],b[key])
        self.assertEqual(a['frontProxy'],'Tite_proxy')
        self.assertAlmostEqual(a['olForwardAt0p5'],.1)
        self.assertAlmostEqual(a['olLateralAbsAt0p5'],.4)
        self.assertEqual(a['handoffTime'],1.3)
        self.assertEqual(a['timeToLos'],2)
        self.assertEqual(a['firstSustainedOlProximity'],0)
    def test_missing_contact_and_crossings_remain_missing(self):
        rows,p,positions=fixture(contact=False);a,error=r.measure(rows,p,positions,'6')
        self.assertNotIn('firstContactTime',a);self.assertNotIn('yardsBeforeContact',a);self.assertNotIn('timeToLos',a)
        b=dict(a,firstContactTime=2.5);summary=r.aggregate([a,b])
        self.assertEqual(summary['metrics']['firstContactTime']['n'],1)
        self.assertEqual(r.aggregate([])['plays'],0)
    def test_incomplete_snap_is_excluded(self):
        rows,p,positions=fixture();rows=[row for row in rows if not(row['frameId']=='10' and row['nflId']=='21')]
        a,error=r.measure(rows,p,positions,'6');self.assertIsNone(a);self.assertEqual(error,'incomplete_snap')
    def test_bear_does_not_capture_inside_tackle_shades(self):
        rows,p,positions=fixture();snap={row['nflId']:row for row in rows if row['frameId']=='10'}
        for i in ['12','13']:snap[i]['y']=str(26.667+(1.3 if i=='12' else -1.3))
        self.assertEqual(r.front_proxy(snap,positions,'OFF',40,26.667),'Bear_proxy')
        snap.pop('7');snap.pop('8');snap['11']['y']='28'
        self.assertEqual(r.front_proxy(snap,positions,'OFF',40,26.667),'Other_or_ambiguous')
    def test_overlapping_reduced_windows_remain_ambiguous(self):
        rows,p,positions=fixture();snap={row['nflId']:row for row in rows if row['frameId']=='10'}
        for i in ['12','13']:snap[i]['y']=str(26.667+(1.9 if i=='12' else -1.9))
        self.assertEqual(r.front_proxy(snap,positions,'OFF',40,26.667),'Reduced_ambiguous_proxy')
    def test_cohort_excludes_dropback_nullified_kneel_and_invalid_yards(self):
        p={'yardsGained':'4','playNullifiedByPenalty':'N','isDropback':'FALSE','qbKneel':'FALSE','qbSpike':'FALSE','rushLocationType':'INSIDE_LEFT'}
        self.assertTrue(r.is_run(p))
        for key,value in [('yardsGained','NA'),('playNullifiedByPenalty','Y'),('isDropback','TRUE'),('qbKneel','TRUE')]:self.assertFalse(r.is_run(dict(p,**{key:value})))

if __name__=='__main__':unittest.main()
