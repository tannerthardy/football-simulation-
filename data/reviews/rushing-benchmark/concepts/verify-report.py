import gzip,hashlib,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
HERE=Path(__file__).resolve().parent
report=json.loads(gzip.decompress((HERE/'report.json.gz').read_bytes()))
old=json.loads(gzip.decompress((ROOT/'data/reviews/run-game-current/reference/bdb-labels.json.gz').read_bytes()))
plan=json.loads((HERE/'query-plan.json').read_text())
checks={}
checks['queryAndDefinitionsAgree']=report['querySha256']==plan['querySha256'] and report['definitions']==plan['query']
checks['collectorAndDependencyAgree']=report['collectorSha256']==plan['collectorSha256'] and report['dependencySha256']==plan['dependencySha256']
checks['sourcesBeforeAfterVerified']=report['sourcePinsVerifiedBeforeAndAfter']
checks['populationExact6223And6103']=report['cohorts']['providerDesigned']['plays']==old['allRuns']['plays']==6223 and report['cohorts']['ordinaryNonSneak']['plays']==old['ordinaryRuns']['plays']==6103
checks['exactPrimaryCountsAndMainMeansMatchExistingReference']=all(cell['plays']==old['byOrdinaryExactPrimary'][label]['plays'] and math.isclose(cell['main']['yards']['mean'],old['byOrdinaryExactPrimary'][label]['yardsGained']['mean'],abs_tol=1e-6) for label,cell in report['ordinaryTables']['byExactPrimary'].items())
checks['split735AndInside489Outside173']=report['ordinaryTables']['bySecondaryTokenOverlapping']['SPLIT']['plays']==735 and report['ordinaryTables']['byPrimarySecondaryTokenOverlapping']['INSIDE ZONE|SPLIT']['plays']==489 and report['ordinaryTables']['byPrimarySecondaryTokenOverlapping']['OUTSIDE ZONE|SPLIT']['plays']==173
checks['disjointTablesPartitionOrdinary']=all(sum(cell['plays'] for cell in table.values())==6103 for name,table in report['ordinaryTables'].items() if 'TokenOverlapping' not in name)
checks['allBinsPartitionKnownGains']=all(sum(cell[operator]['gainBins'].values())==cell[operator]['yards']['n'] for table in report['ordinaryTables'].values() for cell in table.values() for operator in ('main','prePenalty'))
checks['allRateNumeratorsBoundedAndZeroDenomsMissing']=all(0<=rate['count']<=rate['denominator'] and ((rate['denominator']==0 and rate['percent'] is None) or (rate['denominator']>0 and math.isclose(rate['percent'],100*rate['count']/rate['denominator'],abs_tol=1e-6))) for table in report['ordinaryTables'].values() for cell in table.values() for operator in ('main','prePenalty') for rate in cell[operator]['rates'].values())
checks['fieldEligibleDenominatorsNeverExceedKnownGains']=all(cell[operator]['rates'][f'fieldEligibleExplosive{threshold}plus']['denominator']<=cell[operator]['yards']['n'] for table in report['ordinaryTables'].values() for cell in table.values() for operator in ('main','prePenalty') for threshold in (10,15,20,30,40))
checks['motionCoveragePartitionsDesigned']=all(sum(counts[name] for name in ('positivePlays','fullyKnownNegativePlays','unknownOrIncompletePlays'))==6223 for counts in report['audit']['motionFieldCoverageAllDesigned'].values())
checks['bootstrapsSupportedHave1500ValidDraws']=all(all(interval['validDraws']==1500 for interval in cell['intervals'].values()) if cell['eligible'] else not cell['intervals'] for cell in report['uncertainty']['byOrdinaryExactPrimary'].values())
assert all(checks.values()),checks
result={'schema':'bdb-rushing-concept-benchmark-verification-v1','allChecksPass':True,'checks':checks,'reportSha256':hashlib.sha256((HERE/'report.json.gz').read_bytes()).hexdigest(),'sourcePins':report['sources'],'ordinaryCells':sum(len(table) for table in report['ordinaryTables'].values()),'note':'Existing reference exact-primary means/counts are checked; new linear percentiles deliberately differ from its floor-index percentiles. This verifies operators and accounting, not causal scheme validity.'}
(HERE/'verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,sort_keys=True))
