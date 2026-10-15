import datetime,json,pathlib,subprocess,time
root=pathlib.Path('/workspace/football-experimental-games');control=pathlib.Path('/workspace/football-experimental-controls');out=root/'out/experimental-games/checkpoint';out.mkdir(parents=True,exist_ok=True)
manifest=json.load(open(root/'data/reviews/current/experimental-game-inputs.json'))
verification=json.load(open(root/'out/experimental-games/combined-verification-final.json'));assert verification['exitCode']==0 and verification['inputsUnchanged'],'Final exact verification must pass first'
node='/workspace/.football-tools/node-v22.23.3-linux-x64/bin/node';jobs=[(f['id'],arm) for f in manifest['fixtures'] for arm in ['accepted','experimental']]
ledger={'schema':'experimental-game-batch-v1','startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'planned':jobs,'completed':[],'failures':[],'unrun':jobs.copy(),'budget':manifest['budget']}
start=time.monotonic()
for game_id,arm in jobs:
 if time.monotonic()-start>manifest['budget']['maxCombinedGameSeconds']:
  ledger['failures'].append({'reason':'Combined wall budget exhausted before next game'});break
 cwd=control if arm=='accepted' else root
 receipt=f'out/experimental-games/{arm}-{game_id}-launcher.json'
 cmd=[node,'scripts/baseline.mjs','--candidate','--flag','RUN_CONTACT_COMPONENTS=1','--receipt',receipt,'--','node','--import','tsx','scripts/experimental-games.mjs','run','data/reviews/current/experimental-game-inputs.json',game_id,arm,str(out)]
 ledger['current']={'id':game_id,'arm':arm,'cwd':str(cwd),'command':cmd};(out/'batch.json').write_text(json.dumps(ledger,indent=2)+'\n')
 print(json.dumps({'startingGame':game_id,'arm':arm,'completed':len(ledger['completed'])}),flush=True)
 logpath=out/f'{arm}-{game_id}.log';began=time.monotonic()
 with logpath.open('w') as log:
  proc=subprocess.Popen(cmd,cwd=cwd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
  for line in proc.stdout:log.write(line);log.flush();print(line,end='',flush=True)
  code=proc.wait()
 if code:
  ledger['failures'].append({'id':game_id,'arm':arm,'exitCode':code,'log':str(logpath),'receipt':str(cwd/receipt)});break
 summary=json.load(open(out/arm/game_id/'summary.json'));assert summary['complete']
 ledger['completed'].append({'id':game_id,'arm':arm,'score':summary['score'],'simulationSeconds':summary['elapsedSeconds'],'commandWallSeconds':time.monotonic()-began,'receipt':str(cwd/receipt),'log':str(logpath)})
 ledger['unrun']=jobs[len(ledger['completed']):];ledger.pop('current',None);ledger['elapsedSeconds']=time.monotonic()-start;(out/'batch.json').write_text(json.dumps(ledger,indent=2)+'\n')
ledger['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();ledger['elapsedSeconds']=time.monotonic()-start;ledger['complete']=len(ledger['completed'])==len(jobs) and not ledger['failures'];(out/'batch.json').write_text(json.dumps(ledger,indent=2)+'\n');print(json.dumps({'batchComplete':ledger['complete'],'completed':len(ledger['completed']),'elapsedSeconds':ledger['elapsedSeconds'],'failures':ledger['failures']}),flush=True)
if not ledger['complete']:raise SystemExit(1)
