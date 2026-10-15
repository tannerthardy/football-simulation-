#!/usr/bin/env python3
"""Validate returned P045 JSON only: no raw tracking, query or engine execution.

Checks returned bytes, source pins, cached week 1, read accounting, exclusions,
fixed identities, pre-contact windows and recorded measurement arithmetic.
Does not independently re-derive velocities, masses or sample validity from CSVs.
"""
import argparse
import ast
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import time

ROOT = Path(__file__).resolve().parents[2]
RETURN_COMMIT = '07bee7413ee02d7e417f046b599682a77dc9e0fc'
PINS = {
    'p045-nfl-available-weeks-inventory.json': ('a82783df2d2c4d2f10d0701571bf116f9479165bea076ee99a80e5269acb0a95', 'bd6940732fa30c1856d8749466ac223965167aa6'),
    'p045-nfl-available-weeks-return.json': ('4a57b09d246587843f9eb8ac3d03e6fcceb25e0276e679b33371cc63138c272d', '6b49080177653bdef5ef4855f76eb32ebbac77be'),
    'p045-nfl-week1-return.json': ('7911a33decb4ce9f2dfef768f37c527936e573506664b273d231b6c0d0f7f60c', '6d667367847fb6313f20f11f4bb61786bedbbea9'),
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_pin(path):
    b = path.read_bytes()
    digest = hashlib.sha256(b).hexdigest()
    blob = hashlib.sha1(b'blob ' + str(len(b)).encode() + b'\0' + b).hexdigest()
    assert (digest, blob) == PINS[path.name], path.name
    return json.loads(b), {'bytes': len(b), 'sha256': digest, 'blob_sha1': blob}


def literal(path, name):
    # Read constants without importing the query, adapter or driver.
    for node in ast.parse(path.read_text()).body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == name for t in node.targets):
            return ast.literal_eval(node.value)
    raise ValueError(name)


def close(a, b):
    assert math.isclose(a, b, rel_tol=1e-9, abs_tol=1e-9), (a, b)


def key(w):
    return tuple(map(int, w['id'].split('-')))


def witness(w, masses):
    ids, chosen, ev = w['player_ids_by_common_index'], w['selected_defender_ids'], w['events']
    assert len(ids) == len(set(ids)) == 22 and len(chosen) == len(set(chosen))
    assert w['receiver_id'] == w['target_id'] and w['receiver_id'] in ids
    labels = w['labels']
    assert w['id'] == labels['gameId']+'-'+labels['playId']
    assert labels['pff_passCoverage'].upper() == 'QUARTERS' and labels['routeRan'].upper() == 'POST'
    assert labels['official_target_had_reception'] and labels['all_22_positions_observed_snap_through_endpoint']
    frames = w['frame_provenance']
    mapping = {'pass_forward':'pass_forward','pass_arrived':'pass_arrived','catch':'pass_outcome_caught','first_contact':'first_contact'}
    for name, original in mapping.items():
        if name in ev:
            close(ev[name], (frames['original_event_frames'][original]-frames['snap_frame'])/10)
    assert any(math.isclose(ev['end'], (frames['original_event_frames'][e]-frames['snap_frame'])/10)
               for e in ('tackle','out_of_bounds','touchdown') if e in frames['original_event_frames'])
    assert ev['pass_forward'] <= ev['pass_arrived'] <= ev['catch'] <= ev['end']
    phases = [('release',ev['pass_forward']),('flight_midpoint',(ev['pass_forward']+ev['catch'])/2),('catch',ev['catch'])]
    assert len(w['snapshots']) == 3 and w['endpoint'] == 'catch'
    result = {'id':w['id'],'receiver_id':w['receiver_id'],'defender_ids':chosen,
              'depth_yd':w['catch_depth_yd'],'yac_yd':w['yac_yd'],'events':ev,'snapshots':[]}
    for s, (phase,t) in zip(w['snapshots'],phases):
        assert s['phase'] == phase
        close(s['event_t_s'],t); close(s['position_sample_t_s'],round(t/.1)*.1)
        assert [d['id'] for d in s['defenders']] == chosen
        def check_motion(motion):
            b = math.floor(t/.1+1e-9)
            if 'first_contact' in ev:
                b = min(b, math.ceil(ev['first_contact']/.1-1e-9)-1)
            unavailable = b<4 or ('first_contact' in ev and t>ev['first_contact']+1e-9)
            assert (motion is None) == unavailable
            if motion:
                a,end = motion['sample_window_s']
                close(end,b*.1);close(end-a,.4)
                assert a>=0 and end<=t+1e-9
                if 'first_contact' in ev: assert end<ev['first_contact']
        check_motion(s['receiver_motion'])
        rv = s['receiver_motion']['velocity_yd_s'] if s['receiver_motion'] else None
        row = {'phase':phase,'time_s':t,'receiver_velocity_yd_s':rv,
               'receiver_speed_yd_s':math.hypot(*rv) if rv else None,
               'nearest_id':s['nearest_id'],'defenders':[]}
        for d in s['defenders']:
            assert ids[d['index']] == d['id']
            rel = d['relative_xy_yd'];sep = math.hypot(*rel)
            close(d['separation_yd'],sep);close(d['downfield_lead_yd'],rel[0])
            check_motion(d['motion'])
            if d['motion'] and rv:
                dv = d['motion']['velocity_yd_s'];speed = math.hypot(*dv)
                close(d['speed_yd_s'],speed)
                close(d['closing_yd_s'],-sum(rel[j]*(dv[j]-rv[j]) for j in (0,1))/max(1e-9,sep))
                if math.hypot(*rv)>1:
                    close(d['lead_along_receiver_motion_yd'],sum(rel[j]*rv[j] for j in (0,1))/math.hypot(*rv))
                    close(d['lateral_to_receiver_motion_yd'],abs(rel[0]*rv[1]-rel[1]*rv[0])/math.hypot(*rv))
                if 'momentum_kg_m_s' in d and speed>0:
                    mass = math.hypot(*d['momentum_kg_m_s'])/(.9144*speed)
                    close(mass,masses.setdefault(d['id'],mass))
                    for j in (0,1): close(d['momentum_kg_m_s'][j],mass*.9144*dv[j])
                demand = d['catch_landmark_demand']
                if phase=='catch': assert demand is None
                elif demand:
                    # These retained windows align position with velocity time.
                    close(d['motion']['sample_window_s'][1],s['position_sample_t_s'])
                    pos = [s['receiver_xy'][j]+rel[j] for j in (0,1)]
                    landmark = w['snapshots'][-1]['receiver_xy']
                    horizon = ev['catch']-s['position_sample_t_s']
                    close(demand['horizon_s'],horizon);close(demand['radius_yd'],1)
                    close(demand['speed_cap_required_at_least_yd_s'],max(0,math.dist(pos,landmark)-1)/horizon)
                    drift = [pos[j]+dv[j]*horizon for j in (0,1)]
                    close(demand['peak_accel_required_at_least_yd_s2'],2*max(0,math.dist(drift,landmark)-1)/horizon**2)
            row['defenders'].append({k:d.get(k) for k in ('id','separation_yd','downfield_lead_yd','speed_yd_s','closing_yd_s','catch_landmark_demand')}
                                    | {'momentum_magnitude_kg_m_s':math.hypot(*d['momentum_kg_m_s']) if d.get('momentum_kg_m_s') else None})
        nearest = min(s['defenders'],key=lambda d:(d['separation_yd'],d['index']))
        assert s['nearest_id'] == nearest['id'] # true for these retained cases
        result['snapshots'].append(row)
    close(w['catch_depth_yd'],w['snapshots'][-1]['receiver_xy'][0])
    assert 15<=w['catch_depth_yd']<=30 and 1<=ev['catch']-ev['pass_forward']<=2
    assert 1<=min(d['separation_yd'] for d in w['snapshots'][-1]['defenders'])<=4
    endpoint_union = {d['id'] for s in (w['snapshots'][0],w['snapshots'][-1])
                      for d in sorted(s['defenders'],key=lambda d:(d['separation_yd'],d['index']))[:2]}
    assert endpoint_union == set(chosen)
    return result


def main():
    started = time.perf_counter()
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source',type=Path,default=ROOT/'out/p045-nfl/source/expanded')
    p.add_argument('--week1',type=Path,default=ROOT/'out/p045-nfl/source/p045-nfl-week1-return.json')
    p.add_argument('--out',type=Path,default=ROOT/'out/p045-nfl/expanded-validation.json')
    a = p.parse_args()
    r,rpin = read_pin(a.source/'p045-nfl-available-weeks-return.json')
    i,ipin = read_pin(a.source/'p045-nfl-available-weeks-inventory.json')
    cache,cpin = read_pin(a.week1)
    driver = ROOT/'scripts/diag/p045-nfl-expand.py'
    modules = literal(driver,'MODULES')
    for filename, expected in modules.items(): assert sha(ROOT/filename)==expected
    assert r['module_sha256']==i['module_sha256']==cache['module_sha256']==modules
    assert r['driver_sha256']==i['driver_sha256']==sha(driver)
    assert r['query_commit']==i['query_commit']==cache['query_commit']==literal(driver,'QUERY_COMMIT')
    q = literal(ROOT/'scripts/diag/p045-nfl-approach.py','QUERY')
    assert cache['query']==q and r['query']==q|{'weeks':list(range(1,10))}
    assert r['status']=='complete' and i['status']=='inventoried_not_executed'
    assert r['inventory']==i['inventory']
    inv = r['inventory'];weeks=inv['weeks']
    assert [w['week'] for w in weeks]==list(range(1,10))
    assert all(w['restored_readable'] and w['restored_bytes']==w['bytes'] for w in weeks)
    assert inv['new_weeks']==r['new_query_weeks_attempted']==list(range(2,10))
    assert not inv['outside_catalog_weeks'] and not r['unrun_weeks'] and r['reused_weeks']==[1]
    catalog=next(s for s in json.loads((ROOT/'data/sources.json').read_text())['sources'] if s['id']=='bdb2025-2022')
    assert inv['archive_bytes']==catalog['archiveBytes']
    assert r['archive_sha256']==literal(driver,'ARCHIVE_SHA')==catalog['archiveSha256']
    assert r['simulation_runs']==i['simulation_runs']==0
    assert r['budget']==i['budget']=={'wall_seconds':300,'input_read_bytes':12*1024**3}
    assert 0<r['elapsed_s']<300 and r['input_read_bytes']<12*1024**3
    reads=r['input_reads'];freq=Counter(x['member'].split('/')[-1] for x in reads)
    assert freq==Counter({'games.csv':1,'players.csv':16,'plays.csv':8,'player_play.csv':16,
                          **{f'tracking_week_{w}.csv':1 for w in range(2,10)}})
    assert all(x['complete'] and len(x['sha256'])==64 for x in reads)
    for x in reads:
        name=x['member'].split('/')[-1]
        if name in ('players.csv','plays.csv','player_play.csv'):
            assert x['bytes']==cache['access'][name]['bytes'] and x['sha256']==cache['access'][name]['sha256']
        elif name.startswith('tracking_week_'):
            w=int(name.split('_')[-1].split('.')[0]);assert x['bytes']==weeks[w-1]['bytes']
    assert r['input_read_bytes']==inv['planned_input_read_bytes']==inv['archive_bytes']+sum(x['bytes'] for x in reads)
    per=r['per_week'];assert [x['week'] for x in per]==list(range(1,10))
    assert per[0]['status']=='reused' and per[0]['original']==cache['nfl'] and per[0]['result_sha256']==cpin['sha256']
    totals=dict(cache['nfl']['counts']);failures,memberships,bins=Counter(),Counter(),Counter()
    all_cases=[];retained={};group_examples={'contained':[],'offensive_win':[]}
    for g,w in cache['nfl']['witnesses'].items(): group_examples[g].append(w)
    for w in per[1:]:
        assert w['status']=='complete'
        c,audit=w['original']['counts'],w['audit'];cases=audit['cases']
        assert c['label_candidates']==totals['label_candidates']==26
        assert audit['metadata_candidates_by_week']==per[1]['audit']['metadata_candidates_by_week']
        assert sum(audit['metadata_candidates_by_week'].values())==26
        assert len(cases)==audit['stream_fragments']==audit['distinct_label_play_ids_seen']==audit['metadata_candidates_by_week'].get(str(w['week']),0)
        f=Counter(x['reason'] for x in cases if 'reason' in x);b=Counter(x['outcome_bin'] for x in cases if 'outcome_bin' in x)
        assert f==Counter(audit['disjoint_first_failure']) and b==Counter(audit['outcome_bins'])
        membership=Counter()
        for case in cases:
            if case.get('reason','').startswith('geometry_'):
                tests={'depth':15<=case['depth_yd']<=30,'flight':1<=case['flight_s']<=2,'separation':1<=case['nearest_yd']<=4}
                failed=[k for k,v in tests.items() if not v]
                assert failed==case['failed_filters'] and case['reason']=='geometry_'+failed[0]
                membership.update(failed)
            if 'outcome_bin' in case:
                assert case['outcome_bin']==('contained' if case['yac_yd']<=5 else 'offensive_win' if case['yac_yd']>=15 else 'middle_yac')
        assert membership==Counter(audit['geometry_failure_memberships_overlap'])
        invalid=sum(f[k] for k in ('duplicate_fragment','conversion_rejected_unspecified','missing_required_events','not_22_player_ids','sample_validity'))
        assert c['invalid']==invalid and c['geometry_matched']==sum(b.values())
        assert c['converted']==sum(b.values())+sum(v for k,v in f.items() if k.startswith('geometry_'))+f['not_22_player_ids']+f['sample_validity']
        for g in group_examples:
            assert c[g]==b[g]
            eligible=sorted((x for x in cases if x.get('outcome_bin')==g),key=key)
            assert [x['id'] for x in w['examples'][g]]==[x['id'] for x in eligible[:3]]
            if eligible: assert w['original']['witnesses'][g]==w['examples'][g][0]
            else: assert g not in w['original']['witnesses']
            group_examples[g].extend(w['examples'][g])
        for name in totals:
            if name!='label_candidates':totals[name]+=c[name]
        all_cases.extend(cases);failures.update(f);memberships.update(membership);bins.update(b)
    assert len({x['id'] for x in all_cases})==len(all_cases)
    assert totals==r['aggregate_counts']
    for g,examples in group_examples.items():
        assert r['examples'][g]==sorted(examples,key=key)[:3]
        for w in examples:
            if w['id'] in retained:assert retained[w['id']]==w
            retained[w['id']]=w
    masses={};measured=[witness(w,masses) for w in sorted(retained.values(),key=key)]
    result={'schema':'p045-nfl-expanded-return-validation-v1','status':'validated_expansion_complete',
            'return_commit':RETURN_COMMIT,'result':rpin,'inventory':ipin,'week1':cpin,
            'query_commit':r['query_commit'],'module_sha256':modules,'driver_sha256':sha(driver),
            'weeks':list(range(1,10)),'reused_weeks':[1],'new_query_weeks':list(range(2,10)),
            'aggregate_counts':totals|{'middle_yac':totals['geometry_matched']-totals['contained']-totals['offensive_win']},
            'per_week':[{'week':w['week'],'status':w['status'],'counts':w['original']['counts'],
                         'audit':w['audit'] if w['week']==1 else {k:v for k,v in w['audit'].items() if k!='cases'}} for w in per],
            'new_week_disjoint_first_failure':dict(failures),'new_week_overlapping_geometry_memberships':dict(memberships),
            'new_week_depth_failure_sides':dict(Counter('shallower_than_15' if c['depth_yd']<15 else 'deeper_than_30'
                for c in all_cases if c.get('reason')=='geometry_depth')),
            'qualifying_ledger':[{'week':1,'id':cache['nfl']['witnesses']['contained']['id'],'outcome_bin':'contained','yac_yd':cache['nfl']['witnesses']['contained']['yac_yd']}]
                +[{'week':w['week'],**c} for w in per[1:] for c in w['audit']['cases'] if 'outcome_bin' in c],
            'contained_measurements':measured,
            'remote_cost':{'wall_seconds':r['elapsed_s'],'input_read_bytes':r['input_read_bytes'],'input_member_reads':len(reads)},
            'checks':['exact returned SHA256/Git blobs','pinned modules/driver and unchanged filters','exact week1 cache reuse without tracking_week_1 read',
                      'nine-week inventory/completion and 49 complete member reads','metadata hashes, archive pin, planned/actual read accounting and budget',
                      'global candidates counted once, per-week ledgers/counters and canonical selection','fixed IDs, event frames, pre-contact windows and measurement arithmetic'],
            'boundary':'Returned-packet integrity and arithmetic only. Raw CSV hashes, observed all-22 validity, original velocity/mass derivation and selection were collected on Catching executor, not independently remeasured here. Middle-YAC cases retain IDs/counts/YAC only, not full motion snapshots.',
            'new_raw_queries':0,'new_simulations':0,'validation_elapsed_s':time.perf_counter()-started,'validator_sha256':sha(Path(__file__))}
    a.out.parent.mkdir(parents=True,exist_ok=True);a.out.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    print(json.dumps({k:result[k] for k in ('status','aggregate_counts','new_week_disjoint_first_failure','remote_cost','validation_elapsed_s')}))


if __name__=='__main__': main()
