#!/usr/bin/env python3
"""Independent saved witnesses for run_box_suite admission, never a counter.

python3 -I scripts/mechanics/box_suite_recheck_controls.py --suite PATH
Report every result and exit nonzero for any failed requirement. Fixtures are
analytic, not NFL incidence or a native simulation. Run owns implementation.
"""
from pathlib import Path
from collections import Counter
import argparse,copy,hashlib,importlib.util,json,math,tempfile
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--suite',type=Path,required=True);args=parser.parse_args();suite=args.suite.resolve();spec=importlib.util.spec_from_file_location('candidate',suite);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);op=m.operator()
# Reuse the saved f11fa6af analytic geometry; these are not native executions.
def scene():
 groups=['OL']*5+['QB','RB','TE','RB','WR','WR']+['DL']*4+['LB']*3+['DB']*4
 players=[{'side':'O' if i<11 else 'D','group':g,'id':str(i)} for i,g in enumerate(groups)]
 snap=[[-.5,y] for y in (16,18,20,22,24)]+[[-4,20],[-6,20],[-.5,25],[-3,21],[-.5,5],[-.5,40]]+[[.5,y] for y in (17,19,21,23)]+[[4,y] for y in (16,20,24)]+[[12,y] for y in (10,30,0,45)]
 return {'src':'nfl','concept':'POWER','players':players,'xy':[copy.deepcopy(snap) for _ in range(41)],'carrier':6,'handoff':.1,'contact':None,'end':4.}
def native(p):
 positions={'OL':'OT','QB':'QB','RB':'RB','TE':'TE','WR':'WR','DL':'DT','LB':'LB','DB':'CB'}
 return {'id':'G1-P1','nullified':False,'setup':{'concept':'power','los':45,'agents':[{'i':i,'team':a['side'],'pos':positions[a['group']],'slot':'QB' if i==5 else 'RB' if i==6 else str(i),'plan':None} for i,a in enumerate(p['players'])]},'frames':[{'t':round(k*.1,2),'c':p['carrier'],'a':[[x+45,y] for x,y in f]} for k,f in enumerate(p['xy'])],'events':[{'type':'tackle','t':p['end']}]}
def through_native(raw):
 with tempfile.TemporaryDirectory() as d:
  f=Path(d)/'trace.json';f.write_text(json.dumps([raw]));p,meta=next(m.streams(f,'sim',op,Counter()));return m.observe(p,op,clock_valid=meta['clock_valid'],source_reasons=meta['source_reasons']),meta
checks=[]
def check(name,ok,**evidence):checks.append({'name':name,'passed':bool(ok),'evidence':evidence})
p=scene();p['end']=.5;p['xy'][8][2]=[3.8,20];r=m.observe(p,op);h=m.observe(p,op,live=False,correct_carrier=False);check('post_end_removed',r['touched']==0 and h['touched']==1,current=r,historical=h)
p=scene();p['end']=.5;p['xy'][4][2]=[3.8,20];r=m.observe(p,op);check('live_opposing_control',r['touched']==1,row=r)
for carrier in (7,2):
 p=scene();p['carrier']=carrier;p['xy'][0][6][1]=40;r=m.observe(p,op);check('carrier_excluded_'+str(carrier),r['blockers']==r['published_counts']['blockers']-1 and r['carrier_blocker_credit_removed'],row=r)
p=scene();p['carrier']=7;p['xy'][0][7][1]=26.5;p['xy'][0][6][1]=40;r=m.observe(p,op);check('split_TE_no_double_subtraction',not r['carrier_blocker_credit_removed'] and r['blockers']==r['published_counts']['blockers'],row=r)
p=scene();p['xy'][0][11][0]=math.nan;r=m.observe(p,op);check('NaN_unknown',r['status']=='unknown',row=r)
p=scene();p['players'][12]['id']=p['players'][11]['id'];r=m.observe(p,op);check('duplicate_identity_unknown',r['status']=='unknown',row=r)
p=scene();p['players']=[{k:v for k,v in q.items() if k!='id'} for q in p['players']];p['players'][0]['id']='shared';p['players'][1]['id']='shared';r=m.observe(p,op);check('partial_duplicate_unknown',r['status']=='unknown',row=r)
p=scene();raw=native(p);raw['setup']['agents'][1]['i']=0;r,meta=through_native(raw);check('native_duplicate_index_unknown',r['status']=='unknown',row=r,meta=meta)
for end,unknown in ((4.,True),(.8,False)):
 p=scene();p['end']=end;raw=native(p);raw['frames'][35]['t']+=.05;r,meta=through_native(raw);check('live_clock' if unknown else 'postend_clock_retains_live',r['status']=='observed' and (r['touch_status']=='unknown')==unknown and not meta['full_clock_valid'],row=r,meta=meta)
p=scene();raw=native(p);raw['frames']=raw['frames'][:16];r,meta=through_native(raw);check('native_truncation_unknown',r['touch_status']=='unknown',row=r,meta=meta)
p=scene();p['xy']=p['xy'][:16];r=m.observe(p,op);check('NFL_truncation_unknown',r['touch_status']=='unknown',row=r)
p=scene();p['end']=.55;p['xy'][5][2]=[3.8,20];r=m.observe(p,op);h=m.observe(p,op,live=False,correct_carrier=False);check('last_strictly_live_sample_retained',r['touched']==1,current=r,historical=h,first_proximity=.5,reported_end=.55)
report={'suite':str(suite),'suite_sha256':hashlib.sha256(suite.read_bytes()).hexdigest(),'checks':checks,'passed':sum(x['passed'] for x in checks),'failed':[x['name'] for x in checks if not x['passed']]}
print(json.dumps(report,indent=2))
raise SystemExit(1 if report['failed'] else 0)
