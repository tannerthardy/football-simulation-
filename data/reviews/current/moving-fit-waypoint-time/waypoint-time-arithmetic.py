"""Pure planner arithmetic and existing saved rows; no engine import or World.

The scalar ODE below is the model requestToCover algebraically inverts. It is
not a replacement for current traction, facing, cutting or braking execution.
"""
import gzip,hashlib,json,math,pathlib,subprocess,time
start=time.perf_counter();root=pathlib.Path('.');out=root/'out/moving-fit'
source=(root/'src/sim/motion-plan.ts').read_bytes()
def request(tau,distance,horizon,v0):
 lag=tau*(1-math.exp(-horizon/tau))
 return (distance-v0*lag)/max(1e-3,horizon-lag)
def digest(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
tape=pathlib.Path('/workspace/football-db-stalk-workoff/out/db-stalk-workoff/baseline/OZ4.json.gz')
a=json.loads(gzip.decompress(tape.read_bytes()));agent=next(x for x in a['initial']if x['slot']=='LB_M');idx=agent['idx'];tau=agent['profile']['tau']
di=.2;H=2*di;velocity=2.;gap0=10.;waypoint=gap0+velocity*H
steady=[]
for elapsed in [0,.05,.10,.15,.20]:
 own=gap0+velocity*elapsed;distance=waypoint-own
 steady.append({'elapsed':elapsed,'atReadBoundary':elapsed==di,'ownPosition':own,'gapPosition':own,'heldWaypoint':waypoint,'distance':distance,'oldFullHorizon':H,'remainingHorizon':H-elapsed,'oldRequest':request(tau,distance,H,velocity),'remainingTimeRequest':request(tau,distance,H-elapsed,velocity)})
# Analytic integration of ONLY the assumed 1D first-order actuator, held for
# each .05s command. This calls neither World nor the simulator/controller.
lagTrajectories={}
for policy in ['restart-full-H','remaining-deadline']:
 y=gap0;v=velocity;rows=[]
 for step in range(4):
  elapsed=step*.05;remaining=H-elapsed if policy=='remaining-deadline'else H
  u=request(tau,waypoint-y,remaining,v);dt=.05;decay=math.exp(-dt/tau);lag=tau*(1-decay)
  y+=u*(dt-lag)+v*lag;v=u+(v-u)*decay
  rows.append({'at':(step+1)*dt,'request':u,'ownPosition':y,'ownVelocity':v,'linearGapPosition':gap0+velocity*(step+1)*dt})
 lagTrajectories[policy]=rows
# Producer dates must be identified; these are opposing arithmetic examples,
# not proof that one global deadline is a correct football objective.
producerControls={
 'plug':{'DI':di,'actualGapLead':di,'plannerHorizon':H,'distanceAtSteadyStart':velocity*di,'oldInitialRequest':request(tau,velocity*di,H,velocity),'usingActualProducerDateRequest':request(tau,velocity*di,di,velocity)},
 'flowPlusScrape':{'runnerLead':velocity*H,'gapLead':velocity*H,'selectedDistance':2*velocity*H,'oldInitialRequest':request(tau,2*velocity*H,H,velocity),'remainingAtAdoptionSameAsOld':True,'meaning':'Timing repair cannot remove the two already composed spatial leads.'},
 'pull':{'pullLook':.4,'twoDIAtOZ4Mike170':None,'meaning':'PULL_LOOK=.4 is not generally twoDI; any extra SCRAPE offset has separate provenance.'},
 'fixedGoal':{'meaning':'A dated arrival waypoint does not impose terminal speed=0. Keeping a static fit needs its own arrival/stationkeeping interpretation, not automatic future-waypoint semantics.'}
}
rows=[]
for aim in a['aims']:
 if aim['a']!=idx or aim['job']!='run-fit' or not 1.7<=aim['t']<=1.9:continue
 tick=next(t for t in a['ticks']if t['t']==aim['t']);body=tick['before'][idx];DI=tick['minds'][idx]['decisionInterval'];adoption=1.7 if aim['t']<1.9 else 1.9
 first=next(z for z in a['aims']if z['a']==idx and z['job']=='run-fit'and z['t']==adoption);D0=first['heldUntil']-adoption;deadline=adoption+2*D0;remaining=deadline-aim['t']
 delta=aim['selected']['y']-body['pos']['y'];old=request(tau,delta,2*DI,body['vel']['y']);clock=request(tau,delta,remaining,body['vel']['y'])
 rows.append({'tickEntry':aim['t'],'adoption':adoption,'selectedPoint':aim['selected'],'newDesiredPoint':aim['desired'],'heldUntil':aim['heldUntil'],'adoptionDI':D0,'currentDI':DI,'datedWaypointDeadline':deadline,'remainingTime':remaining,'ownPosition':body['pos'],'ownVelocity':body['vel'],'rawRequest':tick['requests'][idx],'finalIntent':tick['intents'][idx],'fullHRequestArithmetic':old,'remainingRequestArithmetic':clock,'vmax':agent['profile']['vmax'],'qualifier':'Arithmetic counterfactual, not an executed request. Current raw command may choose a different mode; changing that mode remains a separate question.'})
producerControls['pull']['twoDIAtOZ4Mike170']=2*rows[0]['adoptionDI']
receipt={'createdBy':'/root/responsibility_generalization','scope':'Pure scalar first-order arithmetic; existing native tape inspection only','simulatorCalls':0,'worldSteps':0,'controllerUpdates':0,'newSensing':0,'newNFLQueries':0,'head':subprocess.check_output(['git','rev-parse','HEAD']).decode().strip(),'assumedGaitStep':0,'plannerSource':'src/sim/motion-plan.ts','plannerSourceSha256':hashlib.sha256(source).hexdigest(),'runFitSourceSha256':digest(root/'src/sim/run-fits.ts'),'arithmeticScriptSha256':digest(out/'waypoint-time-arithmetic.py'),'synthetic':{'description':'STACK, SCRAPE-only, uncapped constant-velocity gap. Initial own position equals current gap; own speed equals gap speed. Waypoint has exactly one already-applied H lead. No FLOW_READ, pull or placement error.','tau':tau,'DI':di,'H':H,'velocity':velocity,'initialGap':gap0,'heldWaypoint':waypoint,'rows':steady,'assumedLagTrajectories':lagTrajectories},'producerOpposingControls':producerControls,'savedOZ4':{'path':str(tape),'tapeSha256':digest(tape),'source':a['source'],'inputSha256':a['inputSha256'],'slot':agent['slot'],'player':agent['player']['id'],'tau':tau,'rows':rows},'elapsedSeconds':time.perf_counter()-start}
(out/'waypoint-time-arithmetic.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'scope':receipt['scope'],'simulatorCalls':0,'tau':tau,'steadyRequests':[(r['elapsed'],r['oldRequest'],r['remainingTimeRequest'])for r in steady],'plug':producerControls['plug'],'OZ4adoptionDeadline':rows[0]['datedWaypointDeadline'],'rows':len(rows),'elapsedSeconds':receipt['elapsedSeconds']}))
