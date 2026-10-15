#!/usr/bin/env python3
"""Isolated research on the existing 2022 TB-DAL StatsBomb sample only.

No acquisition, engine, calibration or BDB query. Provider engagement state,
proximity and illustrative center-line clearance remain separate measurements.
Outputs contain derived summaries, not raw tracking trajectories.
"""
import argparse
from collections import Counter, defaultdict
import csv
import gzip
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import time

REPO=Path(__file__).resolve().parents[2]
SPEC=importlib.util.spec_from_file_location('amf_sample_audit',REPO/'scripts/diag/amf-source-audit.py')
HELPERS=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(HELPERS)
tags,finite,summary=HELPERS.tags,HELPERS.finite,HELPERS.summary
SOURCE='0ef19db20d768f34ad0e260c9c19b85c30ab8984'
RADII=(.75,1.,1.25) # illustrative body-center corridor sensitivity, not calibrated reach
SELECTED=((65,'1024499'),(1587,'1024469'),(1457,'1023916'),(1631,'1024499'))


def ident(x): return str(int(float(x))) if x else None
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def point(step,play):
    return (step['x'],step['y']) if play['offense_left_to_right'] else (100-step['x'],160/3-step['y'])
def nearest(track,when): return min(track['steps'],key=lambda s:abs(s['timestamp']/1e6-when))


def indexed(track):
    frames=defaultdict(list)
    for s in track['steps']: frames[round(s['timestamp']*30/1e6)].append(s)
    return frames


def quality(track,frames,start,end):
    reasons=Counter()
    if track['on_camera_ratio']<1: reasons['camera_ratio_below_1_somewhere_in_track']+=1
    for k in range(math.ceil(start*30-1e-7),math.floor(end*30+1e-7)+1):
        ss=frames[k]
        if len(ss)!=1: reasons['missing_or_duplicate_tick']+=1;continue
        if not finite(ss[0]): reasons['nonfinite_xy']+=1
        if ss[0].get('calibration_fault'): reasons['calibration_fault']+=1
    return dict(reasons)


def segment_geometry(r,q,b):
    v=[q[j]-r[j] for j in (0,1)];d2=sum(x*x for x in v)
    u=sum((b[j]-r[j])*v[j] for j in (0,1))/max(d2,1e-12)
    lateral=abs((b[0]-r[0])*v[1]-(b[1]-r[1])*v[0])/max(math.sqrt(d2),1e-12)
    return u,lateral


def research(root):
    began=time.perf_counter()
    manifest=json.loads((REPO/'data/reviews/current/amf-acquisition-manifest.json').read_text())
    assert manifest['source_commit']==SOURCE
    names=['data/tracking/SB_tracking_20220911_TB_DAL.json.gz','data/plays/tb12_plays_dataset_2022_2023.csv',
           'data/events/tb12_events_dataset_2022_2023.csv','data/lft/lft_1501094.csv']
    pins={}
    for name in names:
        expected=next(e for e in manifest['files']+manifest['alternative_game_lft_csvs'] if e['path']==name)
        path=root/name
        assert path.stat().st_size==expected['bytes'] and digest(path)==expected['sha256'],name
        pins[name]={'bytes':expected['bytes'],'sha256':expected['sha256']}
    game=json.load(gzip.open(root/names[0],'rt'));assert game['game_id']==1501094 and game['frequency']==30 and game['units']=='yards'
    plays={p['play_uuid']:p for p in csv.DictReader((root/names[1]).open()) if p['game_id']=='1501094'}
    events=[e for e in csv.DictReader((root/names[2]).open()) if e['game_id']=='1501094']
    em={e['event_uuid']:e for e in events};byplay=defaultdict(list)
    for e in events:byplay[e['play_uuid']].append(e)
    lft=defaultdict(dict)
    for row in csv.DictReader((root/names[3]).open()):
        if row['player_id']:
            assert row['player_id'] not in lft[row['event_uuid']]
            lft[row['event_uuid']][row['player_id']]=row
    counts=Counter();rejections=[];pair_ledger=[];witnesses=[];base_types=Counter();end_deltas=[];start_dist=[]
    source_start_residuals=[];label_audit=Counter();press_audit=Counter()
    for p in sorted(game['plays'],key=lambda p:p['gsis_play_id']):
        if p['play_type']!='Pass':continue
        counts['hf_pass_type_plays']+=1;ee=byplay[p['play_uuid']]
        tm={str(t['player']['player_id']):t for t in p['tracks']};assert len(tm)==len(p['tracks'])==22
        frames={id:indexed(t) for id,t in tm.items()}
        snap=next(e for e in ee if tags(e)=={'Snap'});z=float(snap['event_video_timestamp'])
        passes=[e for e in ee if 'Pass' in tags(e)]
        starts=[e for e in ee if 'Engagement Start' in tags(e)]
        counts['all_hf_pass_engagement_starts']+=len(starts)
        counts['snap_receiver_qb_id_populated']+=bool(snap['receiver_player_id'])
        pairids={}
        for e in starts:
            er=em.get(e['end_engagement_uuid']);a,b=ident(e['player_id']),ident(e['opponent_player_id'])
            assert er and 'Engagement End' in tags(er) and er['start_engagement_uuid']==e['event_uuid']
            assert er['play_uuid']==e['play_uuid'] and {ident(er['player_id']),ident(er['opponent_player_id'])}=={a,b}
            assert float(er['event_video_timestamp'])>=float(e['event_video_timestamp'])
            assert not e['event_tackle_contact'] and not e['event_success']
            label_audit['reciprocal_temporal_same_pair']+=1
            base_types['no_base_event' if not e['base_event_uuid'] else em[e['base_event_uuid']]['event_types']]+=1
            if passes:
                end_deltas.append(float(er['event_video_timestamp'])-min(float(k['event_video_timestamp']) for k in passes))
            if a not in tm or b not in tm:
                label_audit['pair_ids_missing_hf']+=1
                rejections.append({'play':p['gsis_play_id'],'event_uuid':e['event_uuid'],'reason':'engagement_actor_id_absent','actor_ids':[a,b]})
                continue
            label_audit['both_ids_present_hf']+=1;pairids[e['event_uuid']]=(a,b)
            when=float(e['event_video_timestamp']);ss=[nearest(tm[id],when) for id in (a,b)]
            near_start=all(finite(s) and not s.get('calibration_fault') and abs(s['timestamp']/1e6-when)<=.017 for s in ss)
            label_audit['both_start_samples_finite_unflagged_within_17ms']+=near_start
            if near_start:start_dist.append(math.dist(point(ss[0],p),point(ss[1],p)))
            if a in lft[e['event_uuid']] and b in lft[e['event_uuid']]:
                label_audit['pair_ids_present_lft_at_start']+=1
                for id,s in zip((a,b),ss):
                    if finite(s) and not s.get('calibration_fault') and abs(s['timestamp']/1e6-when)<=.017:
                        row=lft[e['event_uuid']][id];source_start_residuals.append(math.dist(point(s,p),(float(row['track_x']),float(row['track_y']))))
        for e in ee:
            if 'Pressure' in tags(e):
                press_audit['pressure_events']+=1
                press_audit['pressure_actor_id_in_hf']+=ident(e['player_id']) in tm
                press_audit['pressure_actor_on_defense']+=ident(e['player_id']) in tm and tm[ident(e['player_id'])]['team_id']!=p['play_offense_team_id']
                press_audit['opponent_id_populated']+=bool(e['opponent_player_id'])
                press_audit['linked_pressured_event_resolves']+=e['opposing_pressured_event_uuid'] in em
        qbs=[id for id,t in tm.items() if t['team_id']==p['play_offense_team_id'] and t['player']['position_code']=='QB']
        reason='not_unique_own_qb' if len(qbs)!=1 else 'passer_not_unique_qb' if passes and any(ident(e['player_id'])!=qbs[0] for e in passes) else None
        if reason:
            counts[reason]+=1;rejections.append({'play':p['gsis_play_id'],'reason':reason});continue
        qb=qbs[0];terminal=passes or [e for e in ee if {'Sack','Sacked'}&tags(e)]
        if not terminal:counts['missing_terminal']+=1;continue
        stop=min(float(e['event_video_timestamp']) for e in terminal);duration=stop-z
        assert duration>0
        # QB contact changes the pursuit target and motion. Do not let it
        # contribute to first-access geometry or blocking-path displacement.
        qb_contacts=[e for e in ee if (('Tackle Attempt' in tags(e) and e['event_tackle_contact']=='True'
                                      and ident(e['opponent_player_id'])==qb)
                                     or ('Passer-Hit' in tags(e) and ident(e['opponent_player_id'])==qb))
                     and float(e['event_video_timestamp'])<=stop]
        contact=min((float(e['event_video_timestamp']) for e in qb_contacts),default=None)
        counts['admitted_qb_dropbacks']+=1
        off=[id for id,t in tm.items() if t['team_id']==p['play_offense_team_id']]
        reasons={id:quality(tm[id],frames[id],z,stop) for id in tm}
        snap_ol=[point(nearest(tm[id],z),p)[1] for id in off if tm[id]['player']['position_code']=='OL']
        edge=[]
        for id,t in tm.items():
            s=nearest(t,z)
            if not finite(s):continue
            x,y=point(s,p)
            if t['team_id']!=p['play_offense_team_id'] and t['player']['position_code'] in ('DL','LB') and -.5<=x-float(snap['event_x'])<=3 and (y<min(snap_ol) or y>max(snap_ol)):edge.append(id)
        counts['snap_aligned_edge_candidates']+=len(edge)
        edge_pairs=defaultdict(list)
        for e in starts:
            if e['event_uuid'] not in pairids:continue
            a,b=pairids[e['event_uuid']]
            if a not in edge and b not in edge:continue
            rid,bid=(a,b) if a in edge else (b,a)
            er=em[e['end_engagement_uuid']];t0=float(e['event_video_timestamp'])-z;t1=float(er['event_video_timestamp'])-z
            if not 0<=t0<duration:continue
            assert bid in off
            if tm[bid]['player']['position_code'] not in ('OL','TE','RB'):
                counts['unexpected_blocker_role']+=1;continue
            record={'play':p['gsis_play_id'],'rusher_id':rid,'blocker_id':bid,'start_uuid':e['event_uuid'],'end_uuid':er['event_uuid'],
                    'start_s':t0,'end_s':t1,'end_at_or_after_terminal':t1>=duration,
                    'trio_quality_reasons':{id:reasons[id] for id in (rid,bid,qb)},'all_offense_quality_pass':all(not reasons[id] for id in off)}
            record['trio_quality_pass']=all(not x for x in record['trio_quality_reasons'].values())
            pair_ledger.append(record);edge_pairs[rid].append(record)
        counts['edge_pair_intervals']+=sum(map(len,edge_pairs.values()))
        for rid,pairs in edge_pairs.items():
            valid=[x for x in pairs if x['trio_quality_pass'] and x['all_offense_quality_pass']]
            if not valid:continue
            counts['full_offense_and_trio_valid_edges']+=1
            first=math.ceil(z*30-1e-7)
            # Exclude the camera frame nearest the contact label as well as
            # all later frames; a few microseconds before a label is not an
            # independently resolved pre-contact observation at 30Hz.
            last=min(math.floor(stop*30+1e-7),round(contact*30)-1) if contact else math.floor(stop*30+1e-7)
            rows=[]
            for k in range(first,last+1):
                pos={id:point(frames[id][k][0],p) for id in off+[rid]};r,q=pos[rid],pos[qb]
                gap=math.dist(r,q);closing=None
                if k-6>=first:
                    past_r=point(frames[rid][k-6][0],p);past_q=point(frames[qb][k-6][0],p)
                    closing=(math.dist(past_r,past_q)-gap)/.2
                obstacles=[]
                for id in off:
                    if id==qb:continue
                    u,lat=segment_geometry(r,q,pos[id])
                    if 0<u<1:obstacles.append((lat,id))
                margin=min(obstacles,default=(math.inf,None))
                t=k/30-z
                rows.append({'t':t,'gap':gap,'closing':closing,'clearance':margin[0],'interposing_id':margin[1],
                             'active_labeled_pairs':[x['start_uuid'] for x in pairs if x['start_s']<=t<x['end_s']]})
            probe={}
            for radius in RADII:
                hits=[x for x in rows if x['t']>=.5 and x['closing'] is not None and x['closing']>0 and x['clearance']>radius]
                x=hits[0] if hits else None
                probe[str(radius)]={'first_clear_closing_frame_s':x['t'] if x else None,
                                   'first_time_bracket_s':[max(.5,x['t']-1/30),x['t']] if x else None,
                                   'gap_yd':x['gap'] if x else None,'active_engagement_uuids':x['active_labeled_pairs'] if x else []}
            close2=next((x for x in rows if x['t']>=.5 and x['gap']<=2),None)
            pressure=[e for e in ee if 'Pressure' in tags(e) and ident(e['player_id'])==rid and float(e['event_video_timestamp'])<=stop]
            if (p['gsis_play_id'],rid) not in SELECTED:continue
            assert len(valid)==len(pairs), 'Selected edge contains an invalid pair'
            def observation(when):
                samples={id:nearest(tm[id],when) for id in [qb,rid]+[x['blocker_id'] for x in pairs]}
                dt=max(abs(s['timestamp']/1e6-when) for s in samples.values())
                assert dt<=.017 and all(finite(s) and not s.get('calibration_fault') for s in samples.values())
                pos={id:point(s,p) for id,s in samples.items()};r,q=pos[rid],pos[qb]
                return {'event_time_s':when-z,'max_nearest_frame_offset_s':dt,'rusher_qb_gap_yd':math.dist(r,q),
                        'original_tracking_timestamps':{id:s['timestamp'] for id,s in samples.items()},
                        'position_sample_time_range_s':[min(s['timestamp'] for s in samples.values())/1e6-z,
                                                        max(s['timestamp'] for s in samples.values())/1e6-z],
                        'nearest_position_sample_after_event':any(s['timestamp']/1e6>when+1e-9 for s in samples.values()),
                        'at_or_after_labeled_qb_contact':contact is not None and when>=contact,
                        'blockers':[{'id':id,'rusher_blocker_gap_yd':math.dist(r,pos[id]),
                                     'projection_u':segment_geometry(r,q,pos[id])[0],
                                     'lateral_to_rusher_qb_segment_yd':segment_geometry(r,q,pos[id])[1]} for id in pos if id not in (qb,rid)]}
            keytimes={'first_engagement_start':z+min(x['start_s'] for x in pairs),'terminal':stop}
            keytimes.update({f'engagement_{j}_end':z+x['end_s'] for j,x in enumerate(pairs) if x['end_s']<duration})
            keytimes.update({f'pressure_{j}':float(e['event_video_timestamp']) for j,e in enumerate(pressure)})
            if contact:keytimes['first_labeled_qb_contact']=contact
            # Describe bend of the rusher's actual center path during each pair.
            bend=[]
            for pair in pairs:
                aa=math.ceil((z+pair['start_s'])*30-1e-7);bb=min(last,math.floor((z+pair['end_s'])*30+1e-7))
                rpos=[point(frames[rid][k][0],p) for k in range(aa,bb+1)]
                q0=point(frames[qb][aa][0],p);q1=point(frames[qb][bb][0],p)
                path=sum(math.dist(a,b) for a,b in zip(rpos,rpos[1:]));v=[q0[j]-rpos[0][j] for j in (0,1)];disp=[rpos[-1][j]-rpos[0][j] for j in (0,1)]
                bend.append({'blocker_id':pair['blocker_id'],'sampled_interval_s':[aa/30-z,bb/30-z],
                             'rusher_path_length_yd':path,'rusher_net_displacement_yd':math.dist(rpos[0],rpos[-1]),
                             'rusher_transverse_displacement_to_initial_qb_line_yd':abs(disp[0]*v[1]-disp[1]*v[0])/math.hypot(*v),
                             'qb_displacement_same_interval_yd':math.dist(q0,q1),
                             'interposed_fraction_at_1yd_center_radius':sum(0<u<1 and lat<=1 for u,lat in
                                 (segment_geometry(point(frames[rid][k][0],p),point(frames[qb][k][0],p),point(frames[pair['blocker_id']][k][0],p))
                                  for k in range(aa,bb+1)))/(bb-aa+1)})
            last_pair_held=any(x['start_s']<=duration<=x['end_s'] for x in pairs)
            witnesses.append({'play':p['gsis_play_id'],'play_uuid':p['play_uuid'],'qb_id':qb,
                              'rusher':tm[rid]['player'],'blockers':[tm[x['blocker_id']]['player'] for x in pairs],
                              'terminal_type':'pass' if passes else 'sack','terminal_s':duration,
                              'kinematic_analysis_last_sample_s':last/30-z,
                              'first_labeled_qb_contact_s':contact-z if contact else None,
                              'qb_contact_events':[{'uuid':e['event_uuid'],'time_s':float(e['event_video_timestamp'])-z,
                                                   'actor_id':ident(e['player_id']),'opponent_id':ident(e['opponent_player_id']),
                                                   'tags':sorted(tags(e)),'contact':e['event_tackle_contact']} for e in qb_contacts],
                              'terminal_event_rows':[{'uuid':e['event_uuid'],'actor_id':ident(e['player_id']),
                                                     'opponent_id':ident(e['opponent_player_id']),'tags':sorted(tags(e)),
                                                     'base_event_uuid':e['base_event_uuid'],'preceding_tackle_attempt_uuid':e['preceding_tackle_attempt_uuid']}
                                                     for e in terminal if float(e['event_video_timestamp'])==stop],
                              'engagements':pairs,'named_pressure_times_s':[float(e['event_video_timestamp'])-z for e in pressure],
                              'other_pressure_events':[{'actor_id':ident(e['player_id']),'time_s':float(e['event_video_timestamp'])-z}
                                                       for e in ee if 'Pressure' in tags(e) and ident(e['player_id'])!=rid],
                              'label_active_at_terminal':last_pair_held,'first_2yd_proximity_s':close2['t'] if close2 else None,
                              'clear_closing_corridor_sensitivity':probe,'observations':{k:observation(v) for k,v in keytimes.items()},
                              'path_bend_during_labels_before_qb_contact':bend,'context':{k:plays[p['play_uuid']][k] for k in ('play_action_pass','play_qb_pressure','play_qb_exit_pocket_clock','play_yards_net','play_pass_outcome')}})
    assert {(w['play'],str(w['rusher']['player_id'])) for w in witnesses}==set(SELECTED)
    counts['trio_valid_edge_intervals']=sum(x['trio_quality_pass'] for x in pair_ledger)
    counts['full_offense_and_trio_valid_intervals']=sum(x['trio_quality_pass'] and x['all_offense_quality_pass'] for x in pair_ledger)
    counts['full_offense_and_trio_valid_distinct_plays']=len({x['play'] for x in pair_ledger if x['trio_quality_pass'] and x['all_offense_quality_pass']})
    quality_reasons=Counter(k for x in pair_ledger for v in x['trio_quality_reasons'].values() for k in v)
    return {'schema':'amf-protection-access-sample-v1','source_commit':SOURCE,'game':'2022_01_TB_DAL','pins':pins,
            'counts':dict(counts),'engagement_identity_timing_audit':dict(label_audit),
            'engagement_start_base_types':dict(base_types),'pressure_identity_audit':dict(press_audit),
            'pass_engagement_end_minus_release_s':{'n':len(end_deltas),'summary':summary(end_deltas),
                'after_release':sum(x>0 for x in end_deltas),'within_67ms_of_release':sum(abs(x)<=.067 for x in end_deltas),
                'exactly_50ms_after_release_tolerance_20us':sum(abs(x-.05)<.00002 for x in end_deltas)},
            'engagement_start_hf_body_gap_yd':{'summary':summary(start_dist),'n':len(start_dist),
                                            'over_1p5yd':sum(x>1.5 for x in start_dist),'over_2yd':sum(x>2 for x in start_dist)},
            'lft_hf_same_player_start_residual_yd':{'n':len(source_start_residuals),'summary':summary(source_start_residuals)},
            'overlapping_trio_quality_reasons_by_actor_interval':dict(quality_reasons),
            'identity_rejections':rejections,'edge_pair_ledger':pair_ledger,'selected_examples':witnesses,
            'selection':'Fixed research witnesses: 65/Barrett quick clean release; 1587/Tryon contained edge with other pressure; 1457/Parsons sack; 1631/Barrett guard-to-RB sequence. No outcome-rate claim.',
            'method':{'edge_alignment':'Opposing DL/LB at snap, normalized x from LOS -0.5..3 yd, outside outer OL lateral range. Candidate alignment, not edge assignment.',
                      'quality':'Exact identity/team joins, one own QB matching passer (or sole QB on sack); one finite unflagged 30Hz tick from snap to terminal; provider camera ratio=1. Trio plus all offense screened for corridor geometry.',
                      'corridor':'At t>=0.5, shrinking rusher-QB distance over trailing .2 s, no other offensive body center within .75/1/1.25 yd of open rusher-QB segment. Instantaneous geometry only, not physical usable access. Kinematics exclude the frame nearest explicit actor-linked QB contact and all later frames, and stop at pass/sack; later outcome positions flagged separately.',
                      'proximity':'First rusher within 2 yd of QB at t>=.5 before pass/sack, same distance threshold as existing pass metric, sampled at native 30Hz here.',
                      'contact':'Engagement Start/End is provider-labeled state, not inferred 1.5yd proximity; no blocking-contact boolean, hands/load or validated disengagement timestamp supplied.'},
            'usage':'Isolated noncommercial research. No raw redistribution or commercial use of derived analysis without source permission; published analysis requires StatsBomb credit/logo.',
            'bulk_downloads':0,'engine_imports':0,'simulations':0,'bdb_queries':0,
            'elapsed_s':time.perf_counter()-began,'script_sha256':digest(Path(__file__))}


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root',type=Path,default=Path('/workspace/datasets/amf-open-data')/SOURCE)
    p.add_argument('--out',type=Path,required=True)
    a=p.parse_args();result=research(a.root)
    a.out.parent.mkdir(parents=True,exist_ok=True);a.out.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    print(json.dumps({k:result[k] for k in ('counts','engagement_identity_timing_audit','pass_engagement_end_minus_release_s','elapsed_s')}))
