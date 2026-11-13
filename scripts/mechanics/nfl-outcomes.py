"""Pinned offline 2022/23 passing/rushing outcomes; no fitting or downloads.

python3 scripts/mechanics/nfl-outcomes.py [--out-dir out/nfl-review]
Importing exposes the shared outcome operators without collecting data.
"""
import argparse
import hashlib
import importlib.util
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
ref = load('outcome_reference', 'scripts/nflverse-reference.py')
run = load('rushing_reference', 'scripts/data/rushing_benchmark.py')
ops = run.operators
sha = ops.sha256
def source_version():
    digest = hashlib.sha256()
    for p in sorted((ROOT / 'src').rglob('*'), key=lambda p: p.relative_to(ROOT).as_posix()):
        if p.is_file():
            digest.update(p.relative_to(ROOT).as_posix().encode())
            digest.update(b'\0')
            digest.update(p.read_bytes())
            digest.update(b'\0')
    return digest.hexdigest()
query = {
    'seasons': [2022, 2023],
    'selection': 'REG live pass/run; excludes kneels, spikes, two-point attempts and no-play/special teams using current schematic selection helper. Physical outcome cohort requires penalty flag=false. Missing flags/gains remain audited.',
    'throws': 'Recorded completion/incompletion/interception among dropbacks, sacks excluded; includes throwaways. Interception return yards are not offensive pass yards.',
    'yardage': 'Primary whole-play yards_gained; also separately report finite credited passing_yards. Dropbacks include sacks/scrambles; designed runs exclude them. Completions and YAC have separate populations and known-value n.',
    'success': 'Known gain, valid down1-4 and positive finite ydstogo; >=40% first,60% second,100% third/fourth. Turnover gains remain yard success; this is not EPA success.',
    'TD': 'pass_touchdown per recorded throw; rush_touchdown per designed run; pass_touchdown OR rush_touchdown per dropback; require known applicable flags. Generic touchdown can be a defensive score and is not used.',
    'tails': 'Interpolated p10/25/50/75/90/95/99 and max; 10/20/30/40+ known whole-gain rates and field-eligible rates; YAC10/20/40+ among known-YAC completions. Goal-shortened gains remain observed, not invented potential yards.',
    'cells': 'Current rushing benchmark down/distance/field bins. Calling share keeps live flagged rows; cell physical outcomes use penalty=false. Every metric has its own count/denominator; <40 clean plays marked sparse, not silently broadened.',
    'variation': 'Equal-weight observed team-season estimates, pooled64 and each season32; descriptive population variation, not independent trials, confidence intervals, talent-isolated effects or generated-roster limits.',
    'FTN': 'Exact game/play join; separate 2022/23 missingness and known-label denominators. Label outcomes, catchability, out-of-pocket, hit/rusher/blitzer associations are descriptive and cannot identify causes of drops/inaccuracy or all pressure. FTN Data via nflverse; charted derived aggregates CC-BY-SA-4.0.',
    'reserved': 'No 2026 PBP/tracking or reserved weeks read. No network or engine changes.',
}
number, flag = ref.number, ref.flag
def success(r):
    down, distance, gain = (number(r.get(k)) for k in ('down', 'ydstogo', 'yards_gained'))
    return None if down not in (1,2,3,4) or distance is None or distance <= 0 or gain is None else gain >= distance * (.4 if down == 1 else .6 if down == 2 else 1)
def flag_rate(rows, field):
    known = [flag(r.get(field)) for r in rows if flag(r.get(field)) is not None]
    return {**ref.rate(sum(known), len(known)), 'missing': len(rows)-len(known)}
def gain_summary(rows):
    known = [(r, number(r.get('yards_gained'))) for r in rows if number(r.get('yards_gained')) is not None]
    successes = [success(r) for r in rows if success(r) is not None]
    tails = {}
    for threshold in (10,20,30,40):
        eligible = [(r,g) for r,g in known if number(r.get('yardline_100')) is not None and threshold <= number(r.get('yardline_100')) <= 100]
        tails[f'{threshold}plus'] = {**ref.rate(sum(g>=threshold for _,g in known),len(known)),
          'fieldEligible': ref.rate(sum(g>=threshold for _,g in eligible),len(eligible))}
    return {'plays':len(rows), 'games':len({r['game_id'] for r in rows}), 'yards':ops.distribution(g for _,g in known),
            'missingGain':len(rows)-len(known), 'success4060100':ref.rate(sum(successes),len(successes)),
            'stuff':ref.rate(sum(g<=0 for _,g in known),len(known)), 'gainTails':tails}
def outcomes(rows):
    db = [r for r in rows if ref.classify(r)=='dropback']
    runs = [r for r in rows if ref.classify(r)=='designedRun']
    throws = [r for r in db if ref.is_throw(r)]
    completions = [r for r in throws if flag(r.get('complete_pass')) is True]
    back_runs = [r for r in runs if r.get('carrierGroup')=='RB_FB']
    scrambles = [r for r in db if ops.run_kind(r)=='scramble']
    yac = [number(r.get('yards_after_catch')) for r in completions if number(r.get('yards_after_catch')) is not None]
    offensive_td = [flag(r.get('pass_touchdown')) or flag(r.get('rush_touchdown')) for r in db
                    if flag(r.get('pass_touchdown')) is not None and flag(r.get('rush_touchdown')) is not None]
    result = {'plays':len(rows),'games':len({r['game_id'] for r in rows}), 'dropbacks':len(db),'throws':len(throws),'completions':len(completions),
      'dropbackShare':ref.rate(len(db),len(rows)), 'completion':ref.rate(len(completions),len(throws)),
      'interception':flag_rate(throws,'interception'), 'sackPerDropback':flag_rate(db,'sack'),
      'scramblePerDropback':ref.rate(len(scrambles),len(db)), 'passTDPerThrow':flag_rate(throws,'pass_touchdown'),
      'offensiveTDPerDropback':ref.rate(sum(offensive_td),len(offensive_td)), 'rushTDPerDesignedRun':flag_rate(runs,'rush_touchdown'),
      'twentyYardCompletionPerThrow':ref.rate(sum(number(r.get('yards_gained')) is not None and number(r.get('yards_gained'))>=20 for r in completions),len(throws)),
      'dropback':gain_summary(db),'throw':gain_summary(throws),'completionGain':gain_summary(completions),
      'designedRun':gain_summary(runs),'designedRB_FB':gain_summary(back_runs),'scramble':gain_summary(scrambles),
      'creditedPassingYards':ops.distribution(number(r.get('passing_yards')) for r in throws if number(r.get('passing_yards')) is not None),
      'completedYAC':{**ops.distribution(yac),'completionCount':len(completions),'missing':len(completions)-len(yac),
        'coverage':ref.rate(len(yac),len(completions)), 'tails':{f'{t}plus':ref.rate(sum(y>=t for y in yac),len(yac)) for t in (10,20,40)}},
      'allThrowAirYards':ops.distribution(number(r.get('air_yards')) for r in throws if number(r.get('air_yards')) is not None),
      'namedTargetAirYards':ops.distribution(number(r.get('air_yards')) for r in throws if r.get('receiver_player_id') and number(r.get('air_yards')) is not None)}
    assert len(db)+len(runs)==len(rows)
    assert len(completions)+sum(flag(r.get('incomplete_pass')) is True for r in throws)+sum(flag(r.get('interception')) is True for r in throws)==len(throws)
    return result

def verify_inputs():
    """Use tracked pins, reading exactly the six 2022/23 outcome inputs."""
    locations = [
        (ROOT / 'data/raw/nflverse', ROOT / 'data/reviews/nflverse/input-manifest.json'),
        (ROOT / 'data/raw/rushing-benchmark', ROOT / 'data/reviews/rushing-benchmark/reference/input-manifest.json'),
    ]
    records = [(folder, manifest, {r['name']: r for r in json.loads(manifest.read_text())['files']})
               for folder, manifest in locations]
    inputs, used_manifests = {}, {}
    for year in (2022, 2023):
        inputs[year] = {}
        for role, name in [('pbp', f'play_by_play_{year}.csv.gz'), ('roster', f'roster_{year}.csv'), ('chart', f'ftn_charting_{year}.csv')]:
            pins = [rows[name] for _, _, rows in records if name in rows]
            if not pins or any(pin['bytes'] != pins[0]['bytes'] or pin['sha256'] != pins[0]['sha256'] for pin in pins):
                raise ValueError(f'Missing or conflicting tracked pins: {name}')
            # A pinned download may put every season in the same cache. The
            # tracked manifest identifies bytes, independently of cache layout.
            candidates = [folder / name for folder, _, _ in records if (folder / name).is_file()]
            if not candidates:
                raise ValueError(f'Missing cached input {name}; fetch the tracked pin before running offline')
            path = candidates[0]
            _, manifest, rows = next(record for record in records if name in record[2])
            pin = rows[name]
            if path.stat().st_size != pin['bytes'] or sha(path) != pin['sha256']:
                raise ValueError(f'Input differs from tracked size/SHA256: {path}')
            inputs[year][role] = (path, {**pin, 'verifiedSizeAndSha256': True})
            used_manifests[manifest.as_posix()] = {'manifest': str(manifest.relative_to(ROOT)), 'sha256': sha(manifest)}
    return inputs, list(used_manifests.values())


def collect(OUT):
    source_before = source_version()
    query_record = {'query': query, 'declaredAtUtc': datetime.now(timezone.utc).isoformat(),
                    'collectorSha256': sha(Path(__file__)),
                    'operatorHashes': {p: sha(ROOT / p) for p in ['scripts/nflverse-reference.py', 'scripts/data/rushing_benchmark.py', 'scripts/data/run_outcome_context.py', 'scripts/data/schematic_context_audit.py']}}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'reference-query.json').write_text(json.dumps(query_record, indent=2) + '\n')
    inputs, manifests = verify_inputs()
    needed = 'game_id play_id season week season_type play_type posteam defteam penalty sack complete_pass incomplete_pass interception qb_hit qb_scramble qb_dropback pass_attempt rush_attempt qb_kneel qb_spike two_point_attempt down ydstogo yardline_100 score_differential qtr game_seconds_remaining yards_gained yards_after_catch air_yards receiver_player_id pass_touchdown rush_touchdown fumble_lost rusher_player_id passing_yards rushing_yards first_down_rush epa no_huddle shotgun goal_to_go run_location run_gap'.split()
    seasons, team_seasons, cells, ftn, input_records = {}, [], [], {}, []
    all_clean = []
    for year, files in inputs.items():
        for role,item in files.items():
            if item: input_records.append({'season':year,'role':role,**item[1],'path':str(item[0].relative_to(ROOT))})
        positions = ops.roster_positions(ref.read_csv(files['roster'][0]))
        audit, live, seen = Counter(), [], set()
        for raw in ref.read_csv(files['pbp'][0]):
            audit['rawRows']+=1
            reason = ops.context_audit.selection_reason(raw)
            if reason: audit['excluded_'+reason]+=1; continue
            assert number(raw.get('season'))==year
            key = ref.play_key(raw); assert key not in seen; seen.add(key)
            row = {k:raw.get(k,'') for k in needed}
            row['carrierGroup']=ops.carrier_group(row,positions)
            live.append(row)
        clean = [r for r in live if flag(r.get('penalty')) is False]
        audit.update(livePlays=len(live),cleanPlays=len(clean),flaggedPenaltyRows=sum(flag(r.get('penalty')) is True for r in live),missingPenaltyFlagRows=sum(flag(r.get('penalty')) is None for r in live))
        all_clean.extend(clean)
        seasons[str(year)]={'audit':dict(audit),'liveCallingDropbackShare':ref.rate(sum(ref.classify(r)=='dropback' for r in live),len(live)),**outcomes(clean)}
        grouped = defaultdict(list)
        for r in clean: grouped[r['posteam']].append(r)
        team_seasons.extend({'season':year,'team':team,**outcomes(rows)} for team,rows in sorted(grouped.items()))
        grouped = defaultdict(list)
        for r in live:
            ctx = run.context(r,r['carrierGroup'])
            grouped[(ctx['down'],ctx['distance'],ctx['field'])].append(r)
        for key,rows in sorted(grouped.items(),key=lambda item:str(item[0])):
            cell_clean=[r for r in rows if flag(r.get('penalty')) is False]
            cells.append({'season':year,**dict(zip(('down','distance','field'),key)), 'liveCallingPlays':len(rows),
              'liveCallingDropbackShare':ref.rate(sum(ref.classify(r)=='dropback' for r in rows),len(rows)),
              'sparse':len(cell_clean)<40,'cleanOutcomes':outcomes(cell_clean)})
        charts = list(ref.read_csv(files['chart'][0]))
        chart_index = ops.context_audit.index_chart(charts)
        db = [r for r in clean if ref.classify(r)=='dropback']
        matched = [(r,chart_index[ref.play_key(r)]) for r in db if ref.play_key(r) in chart_index]
        chart_report = ref.charting_reference(db,charts)
        incompletes=[(r,c) for r,c in matched if ref.is_throw(r) and flag(r.get('incomplete_pass')) is True and flag(r.get('interception')) is not True]
        known_drop=[flag(c.get('is_drop')) for _,c in incompletes if flag(c.get('is_drop')) is not None]
        chart_report['dropShareAmongKnownLabelIncompletions']={**ref.rate(sum(known_drop),len(known_drop)), 'missing':len(incompletes)-len(known_drop)}
        associations = {}
        for label in ('is_qb_out_of_pocket','is_catchable_ball','is_interception_worthy','is_drop','is_throw_away'):
            associations[label]={str(value).lower():outcomes([r for r,c in matched if flag(c.get(label)) is value]) for value in (False,True)}
            associations[label]['unknownMatchedDropbacks']=sum(flag(c.get(label)) is None for _,c in matched)
        associations['qb_hit']={str(value).lower():outcomes([r for r in db if flag(r.get('qb_hit')) is value]) for value in (False,True)}
        associations['n_pass_rushers']={group:outcomes([r for r,c in matched if number(c.get('n_pass_rushers')) is not None and number(c.get('n_pass_rushers'))==int(number(c.get('n_pass_rushers'))) and 0<=number(c.get('n_pass_rushers'))<=11 and (number(c.get('n_pass_rushers'))<=4)==(group=='4orFewer')]) for group in ('4orFewer','5plus')}
        ftn[str(year)]={**chart_report,'matchedDropbacks':len(matched),'associations':associations,
          'associationLimit':'Observational charted labels/known-hit/rusher associations; QB hit is not all pressure. No counterfactual or identified cause of accuracy/drop/INT. FTN Data via nflverse, CC-BY-SA-4.0.'}

    metric_paths = ['completion.percent','interception.percent','sackPerDropback.percent','scramblePerDropback.percent','passTDPerThrow.percent','twentyYardCompletionPerThrow.percent',
     'dropback.yards.mean','dropback.success4060100.percent','dropback.gainTails.20plus.percent','throw.yards.mean','completionGain.yards.mean',
     'completedYAC.mean','completedYAC.p90','completedYAC.p95','completedYAC.p99','completedYAC.tails.20plus.percent',
     'designedRun.yards.mean','designedRun.success4060100.percent','designedRun.gainTails.20plus.percent','rushTDPerDesignedRun.percent',
     'designedRB_FB.yards.mean','designedRB_FB.success4060100.percent','designedRB_FB.gainTails.20plus.percent']
    def get(row,path):
        for part in path.split('.'): row=row[part]
        return row
    ranges={}
    for group in ('pooled2022_2023','2022','2023'):
        rows=team_seasons if group.startswith('pooled') else [r for r in team_seasons if r['season']==int(group)]
        ranges[group]={'teamSeasons':len(rows),'metrics':{path:ops.distribution(get(r,path) for r in rows if get(r,path) is not None) for path in metric_paths}}
    assert len(team_seasons)==64
    source_after = source_version()
    assert source_after==source_before, 'Engine changed during outcome reference extraction'
    assert sha(Path(__file__))==query_record['collectorSha256']
    result={'schema':'passing-rushing-outcome-reference-v1','query':query_record,
     'provenance':{'sourceBefore':source_before,'sourceAfter':source_after,'sourceHashLayout':'SHA-256 of globally sorted repo-relative POSIX src file paths: path + NUL + contents + NUL; identical to scripts/source-version.ts.','inputs':input_records,'manifests':manifests,
       'sourceAttribution':'nflverse/nflfastR PBP and listed roster positions; FTN Data via nflverse, charting and derived charting aggregates CC-BY-SA-4.0',
       'rawSourceRoot':'https://github.com/nflverse/nflverse-data/releases/download','networkUsed':False},
     'pooled':outcomes(all_clean),'seasons':seasons,'teamSeasons':team_seasons,'teamSeasonRanges':ranges,'conditionalCells':cells,'ftnCharting':ftn,
     'limitations':['Already-studied public reference, not a blind holdout or numeric tuning target.','Team-season ranges are observed roster/opponent/situation mixtures, not synthetic-roster acceptance bounds.','Passing/rushing yard outcomes and FTN associations do not identify contact forces, hand control, pursuit or the cause of a drop/miss.','Sparse conditional rows retain actual count/denominator; no fabricated target, causal adjustment or NGS gold-target constant.']}
    (OUT/'reference.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    print(json.dumps({'output':str(OUT/'reference.json'),'source':source_before,'collectorSha256':query_record['collectorSha256'],
     'pooled':{k:result['pooled'][k] for k in ('plays','dropbacks','throws','completion','sackPerDropback','interception','passTDPerThrow','twentyYardCompletionPerThrow','completedYAC')},
     'teamSeasons':len(team_seasons),'conditionalCells':len(cells)},indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out-dir', type=Path, default=ROOT / 'out/nfl-review')
    args = parser.parse_args()
    collect(args.out_dir)
