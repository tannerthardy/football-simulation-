#!/usr/bin/env python3
"""Independent checks of the supplied box/touch reference, not a new counter.

python3 -I scripts/mechanics/box_reference_review_controls.py --reference PATH
The untouched f7251869 source has known failing essential controls. Preserve
those failures; passing the characterization controls is not overall ACCEPT.
All scenes are analytic fixtures, never NFL incidence or native game evidence.
"""
import argparse
import contextlib
import copy
import gzip
import importlib.util
import io
import json
import math
from pathlib import Path
import tempfile
import unittest


def run(reference):
    spec=importlib.util.spec_from_file_location('reviewed_box_reference',reference)
    op=importlib.util.module_from_spec(spec);spec.loader.exec_module(op)
    def scene():
        groups=['OL']*5+['QB','RB','TE','RB','WR','WR']+['DL']*4+['LB']*3+['DB']*4
        players=[{'side':'O' if i<11 else 'D','group':g,'id':str(i)} for i,g in enumerate(groups)]
        snap=[[-.5,y] for y in (16,18,20,22,24)]+[[-4,20],[-6,20],[-.5,25],[-3,21],[-.5,5],[-.5,40]]+[[.5,y] for y in (17,19,21,23)]+[[4,y] for y in (16,20,24)]+[[12,y] for y in (10,30,0,45)]
        return {'src':'nfl','concept':'POWER','players':players,'xy':[copy.deepcopy(snap) for _ in range(41)],'carrier':6,'handoff':.1,'contact':None,'end':4.}
    def measured(p):
        from collections import defaultdict,Counter
        out={k:defaultdict(Counter) for k in ('concept','personnel','composition','touch')};op.measure(p,out);return out
    def box(p):return measured(p)['concept'][(p['src'],'ALL')]
    def touched(p):return sum(v['touched'] for k,v in measured(p)['touch'].items() if k[1]=='ALL')
    def raw_nfl(p):
        return {'source':'nfl-bdb2025','kind':'run','carrier':p['carrier'],'players':p['players'],'dt':.1,'cell':{'concept':p['concept']},'xy':[[v for point in f for v in point] for f in p['xy']],'events':{'handoff':.1,'end':p['end']}}
    def raw_sim(p):
        agents=[{'team':a['side'],'pos':'OT' if a['group']=='OL' else a['group'],'slot':'QB' if i==5 else 'RB' if i==6 else str(i),'plan':'unread'} for i,a in enumerate(p['players'])]
        return {'nullified':False,'setup':{'concept':'power','los':45,'agents':agents},'frames':[{'t':round(k*.1,2),'c':5 if k==0 else p['carrier'],'a':[[x+45,y] for x,y in f]} for k,f in enumerate(p['xy'])],'events':[{'type':'handoff','t':.1},{'type':'tackle','t':p['end']}]}
    class Supported(unittest.TestCase):
        def test_even_box_baseline(self):
            p=scene();c=box(p);self.assertEqual((c['box'],c['blk'],c['surplus'],c['even']),(7,7,0,1))
        def test_mirror(self):
            p=scene();q=copy.deepcopy(p);q['xy']=[[[x,160/3-y] for x,y in f] for f in q['xy']];self.assertEqual(measured(p),measured(q))
        def test_lateral_translation(self):
            p=scene();q=copy.deepcopy(p);q['xy']=[[[x,y+3] for x,y in f] for f in q['xy']];self.assertEqual(measured(p),measured(q))
        def test_actor_permutation(self):
            p=scene();q=copy.deepcopy(p);order=list(reversed(range(22)));q['players']=[q['players'][i] for i in order];q['carrier']=order.index(q['carrier']);q['xy']=[[f[i] for i in order] for f in q['xy']];self.assertEqual(measured(p),measured(q))
        def test_strict_defender_edges(self):
            for x,y,expected in [(7.5,20,6),(7.499,20,7),(.5,26.5,6),(.5,26.499,7)]:
                p=scene();p['xy'][0][11]=[x,y];self.assertEqual(box(p)['box'],expected)
        def test_split_out_te_and_back_depth(self):
            p=scene();p['xy'][0][7][1]=26.5;self.assertEqual(box(p)['blk'],6)
            p=scene();p['xy'][0][8][0]=-1;self.assertEqual(box(p)['blk'],6)
            p['xy'][0][8][0]=-1.001;self.assertEqual(box(p)['blk'],7)
        def test_all_extra_ol_counted(self):
            p=scene()
            for i,y in [(9,14),(10,26)]:p['players'][i]['group']='OL';p['xy'][0][i]=[-.5,y]
            self.assertEqual(box(p)['blk'],9)
        def test_fewer_than_five_ol_are_skipped(self):
            p=scene();p['players'][0]['group']='WR';self.assertFalse(measured(p)['concept'])
        def test_strata_partition(self):
            self.assertEqual([op.bucket(d) for d in (-3,-1,0,1,2,5)],['light','light','even','+1','+2 or more','+2 or more'])
        def test_snap_counts_do_not_depend_on_gain_or_late_motion(self):
            p=scene();q=copy.deepcopy(p);q['yards']=-99;q['xy'][-1][11]=[100,45];self.assertEqual(box(p),box(q))
        def test_live_positive_control(self):
            p=scene();p['end']=.5;p['xy'][4][2]=[3.8,20];self.assertEqual(touched(p),1)
        def test_zero_backers_is_no_denominator(self):
            p=scene()
            for q in p['players']:
                if q['group']=='LB':q['group']='DL'
            out=measured(p);self.assertTrue(out['concept']);self.assertFalse(out['touch'])
        def test_same_box_can_have_different_target_populations(self):
            p=scene();q=copy.deepcopy(p);q['players'][15]['group']='DL'
            self.assertEqual(box(p),box(q))
            targets=lambda play:sum(v['n'] for k,v in measured(play)['touch'].items() if k[1]=='ALL')
            self.assertEqual((targets(p),targets(q)),(3,2))
        def test_same_geometry_through_public_loaders(self):
            p=scene()
            with tempfile.TemporaryDirectory() as d:
                a,b=Path(d)/'nfl.gz',Path(d)/'sim.json'
                with gzip.open(a,'wt') as f:f.write(json.dumps(raw_nfl(p))+'\n')
                b.write_text(json.dumps([raw_sim(p)]));n=next(op.nfl(a));s=next(op.run_films([b]));self.assertEqual(box(n),box(s));self.assertEqual(touched(n),touched(s))
        def test_shifted_snap_is_rejected(self):
            p=raw_sim(scene());p['frames'][0]['t']=.05
            with tempfile.TemporaryDirectory() as d:
                a=Path(d)/'sim.json';a.write_text(json.dumps([p]));
                with self.assertRaises((SystemExit,ValueError)):list(op.run_films([a]))
    class Essential(unittest.TestCase):
        def test_no_post_end_positive(self):
            p=scene();p['end']=.5;p['xy'][8][2]=[3.8,20];self.assertEqual(touched(p),0,'only credited proximity is after recorded ending')
        def test_touch_matches_shared_fallback(self):
            spec=importlib.util.spec_from_file_location('public_rfr',Path(reference).with_name('run_film_reference.py'))
            shared=importlib.util.module_from_spec(spec);spec.loader.exec_module(shared)
            from collections import defaultdict
            p=scene();p['end']=.5;p['xy'][8][2]=[3.8,20];out=defaultdict(list);shared.measure(p,out)
            self.assertEqual(touched(p),sum(r[2] for r in out['backer']),'never-arrives fallback differs from the cited shared operator')
        def test_carrier_is_not_its_own_blocker(self):
            p=scene();p['carrier']=7;p['xy'][0][6][1]=40;self.assertEqual(box(p)['blk'],6,'TE carrier must not add its own blocking support')
        def test_nan_does_not_become_known_light_box(self):
            p=scene();p['xy'][0][11][0]=math.nan
            try:out=measured(p)
            except (ValueError,TypeError):return
            self.assertFalse(out['concept'],'nonfinite defender silently omitted from a known count')
        def test_duplicate_identity_not_counted_twice(self):
            p=scene();p['players'][12]['id']=p['players'][11]['id']
            try:out=measured(p)
            except (ValueError,TypeError):return
            self.assertFalse(out['concept'],'duplicate recorded identity silently counted as a second body')
        def test_late_clock_drift_is_rejected(self):
            p=raw_sim(scene());p['frames'][35]['t']+=.05
            with tempfile.TemporaryDirectory() as d:
                a=Path(d)/'sim.json';a.write_text(json.dumps([p]))
                with self.assertRaises((SystemExit,ValueError)):list(op.run_films([a]))
    suite=unittest.TestSuite([unittest.defaultTestLoader.loadTestsFromTestCase(c) for c in (Supported,Essential)])
    return unittest.TextTestRunner(verbosity=2).run(suite)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--reference',type=Path,required=True);args=parser.parse_args()
    result=run(args.reference)
    raise SystemExit(0 if result.wasSuccessful() else 1)
