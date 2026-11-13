#!/usr/bin/env python3
"""Use every combine drill and all three downloaded game seasons for movement.

python3 scripts/data/bdb2027_movement.py <csv-directory> <output.json>
Requires pandas/numpy. No fitting, force inference or all-22 geometry claims.
Trajectory observations are weighted within athlete before cohort summaries.
"""
import argparse
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
import pandas as pd


def stats(values):
    a = np.asarray([v for v in values if np.isfinite(v)], dtype=float)
    if not len(a):
        return {"n": 0}
    return {"n": len(a), "p10": float(np.quantile(a, .1)), "p50": float(np.quantile(a, .5)),
            "p90": float(np.quantile(a, .9)), "mean": float(a.mean())}


def motion(g, start=None, end=None):
    """Resample positions at 10 Hz, speed over .2 s, smooth speed over .5 s.
    Trim edge derivatives. A turn is >=60 degrees over .5 s with entry speed
    >=1.5 yd/s and exit speed >=1 yd/s; report strongest such window per rep.
    This includes effort/contact effects and does not identify foot plants.
    """
    g = g.sort_values("seconds").drop_duplicates("seconds")
    if start is not None:
        g = g[(g.seconds >= start) & (g.seconds <= end)]
    if len(g) < 9:
        return None
    t = g.seconds.to_numpy(); x = g.x.to_numpy(); y = g.y.to_numpy()
    if not np.all(np.isfinite(x)) or not np.all(np.isfinite(y)) or np.max(np.diff(t)) > .2:
        return None
    u = np.arange(t[0], t[-1]+1e-5, .1)
    if len(u) < 9:
        return None
    x = np.interp(u,t,x); y = np.interp(u,t,y)
    vx = np.gradient(x,.1); vy = np.gradient(y,.1); s = np.hypot(vx,vy)
    smooth = np.convolve(s,np.ones(5)/5,mode="valid")
    accel = np.gradient(smooth,.1)[1:-1]
    result = {"peakSpeed": float(np.max(s[1:-1])), "peakAccel": float(max(0, np.max(accel))),
              "peakBrake": float(max(0, -np.min(accel))), "duration": float(u[-1]-u[0])}
    # Lateral acceleration from velocity change (trajectory curvature, not force).
    ax = np.gradient(vx,.1); ay = np.gradient(vy,.1)
    lateral = np.abs(vx*ay-vy*ax)/np.maximum(s,.2)
    result["peakLateral"] = float(np.max(lateral[2:-2]))
    if result["peakSpeed"] > 15 or result["peakAccel"] > 30:
        return None  # explicit gross tracking-outlier screen, not an NFL band
    best = None
    for k in range(1,len(u)-6):
        j=k+5
        if s[k]<1.5 or s[j]<1:
            continue
        cosine = np.clip((vx[k]*vx[j]+vy[k]*vy[j])/(s[k]*s[j]),-1,1)
        angle = float(np.degrees(np.arccos(cosine)))
        if angle>=60 and (best is None or angle>best["angleDegrees"]):
            best={"angleDegrees":angle,"entrySpeed":float(s[k]),"minimumSpeed":float(s[k:j+1].min()),
                  "speedRetention":float(s[k:j+1].min()/s[k]),"exitSpeed":float(s[j])}
    if best:
        result["turn"] = best
    return result


def grouped_report(observations):
    grouped=defaultdict(lambda:defaultdict(list))
    for group,player,m in observations:
        grouped[group][player].append(m)
    result={}
    for group,players in sorted(grouped.items()):
        metrics={}
        for field in ["peakSpeed","peakAccel","peakBrake","peakLateral","duration"]:
            metrics[field]=stats([np.median([m[field] for m in reps]) for reps in players.values()])
        turns=defaultdict(list)
        for p,reps in players.items():
            for m in reps:
                if "turn" in m:
                    turns[p].append(m["turn"])
        result[group]={"players":len(players),"trajectories":sum(len(v) for v in players.values()),
            "playerMedianMetrics":metrics,"turnPlayers":len(turns),
            "turnTrajectories":sum(len(v) for v in turns.values()),
            "playerMedianTurn":{field:stats([np.median([m[field] for m in reps]) for reps in turns.values()])
                for field in ["angleDegrees","entrySpeed","minimumSpeed","speedRetention","exitSpeed"]}}
    return result


def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('directory',type=Path);ap.add_argument('out',type=Path)
    args=ap.parse_args();directory=args.directory
    combine=pd.read_csv(directory/'combine_results.csv',dtype={'nfl_id':str})
    position=dict(zip(combine.nfl_id,combine.combine_position));draft=dict(zip(combine.nfl_id,combine.draft_year))
    pp=pd.read_csv(directory/'player_play.csv',usecols=['game_id','play_id','nfl_id','lined_up_position',
        'play_nullified_by_penalty','route_ran','pass_result','player_get_off'],dtype={'game_id':str,'play_id':str,'nfl_id':str})
    labels={key:row for key,row in zip(zip(pp.game_id,pp.play_id,pp.nfl_id),pp.to_dict('records'))}
    inputs={}
    for name in ['combine_results.csv','combine_tracking.csv','player_play.csv',
                 'game_tracking_2023.csv','game_tracking_2024.csv','game_tracking_2025.csv']:
        path=directory/name;h=hashlib.sha256()
        with path.open('rb') as f:
            for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
        inputs[name]={'bytes':path.stat().st_size,'sha256':h.hexdigest()}
    ct=pd.read_csv(directory/'combine_tracking.csv',dtype={'nfl_id':str,'event_id':str})
    raw_combine=len(ct);ct=ct[ct.entity_type=='PLAYER'].copy()
    ct['seconds']=pd.to_datetime(ct.time).astype('int64')/1e9
    drills=[];combine_peaks=defaultdict(list);reject=Counter()
    for (event,p,drill),g in ct.groupby(['event_id','nfl_id','drill_name'],sort=False):
        m=motion(g)
        if m is None:reject['combineShortGappedOrOutlier']+=1;continue
        drills.append((drill,p,m))
        if drill=='FORTY_YARD_DASH':combine_peaks[p].append(m['peakSpeed'])
    del ct
    game_obs=[];game_peaks=defaultdict(list);audit={};seen=set()
    for season in [2023,2024,2025]:
        rows=0;valid=0;players=set();carry=None;counts=Counter()
        path=directory/f'game_tracking_{season}.csv'
        for chunk in pd.read_csv(path,chunksize=250000,dtype={'game_id':str,'play_id':str,'nfl_id':str},
                usecols=['game_id','play_id','nfl_id','time','x','y','s','event']):
            rows+=len(chunk)
            chunk['seconds']=pd.to_datetime(chunk.time).astype('int64')/1e9
            if carry is not None:chunk=pd.concat([carry,chunk],ignore_index=True)
            last=tuple(chunk[['game_id','play_id','nfl_id']].iloc[-1])
            mask=(chunk.game_id==last[0])&(chunk.play_id==last[1])&(chunk.nfl_id==last[2])
            carry=chunk[mask].copy();chunk=chunk[~mask]
            batches=[chunk]
            # The final group is flushed below, not split at chunk boundaries.
            for batch in batches:
                for key,g in batch.groupby(['game_id','play_id','nfl_id'],sort=False):
                    process_game(key,g,labels,position,draft,seen,counts,game_obs,game_peaks,players,season)
        if carry is not None:
            for key,g in carry.groupby(['game_id','play_id','nfl_id'],sort=False):
                process_game(key,g,labels,position,draft,seen,counts,game_obs,game_peaks,players,season)
        valid=counts['retained']
        audit[str(season)]={'rowsRead':rows,'playersRetained':len(players),'retainedPlayerPlays':valid,'counts':dict(counts)}
        print(f'{season}: {rows:,} rows; {valid:,} eligible player-play trajectories',flush=True)
    matched=[]
    for p,peaks in game_peaks.items():
        if p not in combine_peaks:continue
        measured=float(max(combine_peaks[p]));game=float(np.quantile(peaks,.9))
        c=combine[combine.nfl_id==p].iloc[0]
        matched.append({'nfl_id':p,'draftYear':int(draft[p]),'combinePosition':position[p],
            'combine40PeakSpeed':measured,'gamePreThrowP90PeakSpeed':game,'ratio':game/measured,
            'gamePlayerPlays':len(peaks),'forty':None if pd.isna(c.forty) else float(c.forty),
            'tenSplit':None if pd.isna(c.ten_yd_split) else float(c.ten_yd_split)})
    ratios={}
    for group in sorted(set(r['combinePosition'] for r in matched)):
        cohort=[r for r in matched if r['combinePosition']==group]
        ratios[group]={'players':len(cohort),'gamePreThrowToCombine40PeakRatio':stats([r['ratio'] for r in cohort])}
    result={'source':'Kaggle NFL Big Data Bowl 2027 downloaded snapshot','inputs':inputs,
        'method':{'units':'yards, seconds; position-derived speed/acceleration',
            'resamplingHz':10,'speedDifferenceSeconds':.2,'speedSmoothingSeconds':.5,
            'weighting':'median trajectory metrics within player, then quantiles across players',
            'gameWindow':'snap to earliest pass_forward/autoevent_passforward/first_contact, max 3 seconds',
            'gameSelection':'non-nullified, pass-result present, snap and release present; no complete opponent/contact geometry',
            'limits':['Selected draft cohort; no RB or QB combine group.',
                'Game window reduces contact contamination but does not identify all unlabelled blocks/collisions.',
                'Combine s/a includes ball rows; this extraction excludes balls and derives player movement from positions.',
                'A trajectory turn window is not a measured foot plant; no ground/contact force inferred.',
                'Ratio compares game effort/role percentiles with observed combine40 peak, not asymptotic sprint V.',
                'Descriptive cohort audit only: no trained model, no held-out accuracy claim, no fitted engine constants.']},
        'combineRowsRead':raw_combine,'rejected':dict(reject),'gameAudit':audit,
        'drills':grouped_report(drills),'gameByDraftPositionAndRole':grouped_report(game_obs),
        'matchedCombineGame':{'players':len(matched),'byCombinePosition':ratios,'playerObservations':matched}}
    args.out.parent.mkdir(parents=True,exist_ok=True);args.out.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    print(f'Wrote {args.out}',flush=True)


def process_game(key,g,labels,position,draft,seen,counts,observations,peaks,players,season):
    counts['trajectoriesRead']+=1
    if key in seen:
        raise ValueError(f'Non-contiguous duplicate trajectory {key}; use a regrouping reader')
    seen.add(key)
    label=labels.get(key)
    if label is None:counts['missingLabel']+=1;return
    if label['play_nullified_by_penalty']!='N':counts['nullified']+=1;return
    if pd.isna(label['pass_result']):counts['notPassLabel']+=1;return
    snap=g[g.event=='ball_snap'].seconds
    release=g[g.event.isin(['pass_forward','autoevent_passforward'])].seconds
    if snap.empty or release.empty:counts['missingSnapOrRelease']+=1;return
    start=float(snap.min());end=min(float(release.min()),start+3)
    first=g[g.event=='first_contact'].seconds
    if len(first) and first.min()>start:end=min(end,float(first.min()))
    m=motion(g,start,end)
    if m is None:counts['shortGappedOrOutlier']+=1;return
    p=key[2];group=position.get(p,'unknown');role=str(label['lined_up_position'])
    observations.append((f'{draft.get(p,"unknown")}:{group}:{role}',p,m));peaks[p].append(m['peakSpeed'])
    players.add(p);counts['retained']+=1


if __name__=='__main__':main()
