/** Data-only checks/reporting; never simulates. node ... OUT */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const out=process.argv[2];assert.ok(out,'OUT required');
const ledger=JSON.parse(readFileSync(join(out,'batch-ledger.json'),'utf8'));
const close=(a,b)=>Math.abs(a-b)<1e-6;
const report={schema:'matched-controller-game-report-v1',inputSha256:ledger.inputSha256,checks:[],games:[],limitations:['Two matched games per source; outcomes are context, not NFL calibration or population evidence.','Full-game paths diverge after source changes; identical game seed is not identical later snap execution.','Kneels currently consume down/clock without ordinary box rushing credit; separately identified.','Raw-film gain and official credit are distinct.']};
const check=(id,ok,detail)=>report.checks.push({id,pass:!!ok,...(detail?{detail}:{})});
for(const row of ledger.games){
 if(row.status==='unrun')continue;
 check(`${row.arm}/${row.id}/complete`,row.status==='complete',row.status);
 if(!row.summary)continue;
 const s=JSON.parse(readFileSync(row.summary,'utf8')),key=`${row.arm}/${row.id}`;
 check(`${key}/over`,s.finalState.over===true);
 check(`${key}/score-final`,JSON.stringify(s.score)===JSON.stringify(s.finalState.score));
 check(`${key}/quarter-final`,JSON.stringify(s.quarters.at(-1))===JSON.stringify(s.score));
 check(`${key}/finite`,s.teams.every(t=>Object.values(t.box).every(Number.isFinite)));
 const scoreSnapshots=s.log.map(p=>p.score).concat([s.score]);
 check(`${key}/score-monotonic`,scoreSnapshots.every((x,i)=>!i||x.home>=scoreSnapshots[i-1].home&&x.away>=scoreSnapshots[i-1].away));
 for(const t of s.teams){
  const ps=s.log.filter(p=>p.offense===t.abbr),scr=ps.filter(p=>p.kind==='run'||p.kind==='pass');
  const charged=scr.filter(p=>p.officialCredit?p.officialCredit.playCharged:!p.nullified||p.official?.stats==='before_change_of_possession');
  const attempted=p=>p.kind==='kneel'||p.officialCredit?.downAttempt===true||(!p.officialCredit&&!p.nullified&&(p.kind==='run'||p.kind==='pass'));
  const b=t.box,players=t.players,sum=k=>players.reduce((n,p)=>n+p[k],0);
  check(`${key}/${t.abbr}/play-credit`,b.plays===charged.length,{box:b.plays,charged:charged.length});
  check(`${key}/${t.abbr}/total-yards`,close(b.totalYds,b.passYds+b.rushYds));
  check(`${key}/${t.abbr}/rush-credit`,close(b.rushYds,sum('rushYds')));
  check(`${key}/${t.abbr}/pass-net`,close(b.passYds,sum('passYds')-sum('sackYds')));
  check(`${key}/${t.abbr}/completion-credit`,sum('cmp')===sum('rec'));
  check(`${key}/${t.abbr}/attempts`,players.every(p=>p.cmp<=p.att&&p.fumblesLost<=p.fumbles&&p.fgm<=p.fga&&p.xpm<=p.xpa));
  check(`${key}/${t.abbr}/third-attempts`,b.thirdAtt===ps.filter(p=>p.down===3&&attempted(p)).length,{box:b.thirdAtt,log:ps.filter(p=>p.down===3&&attempted(p)).length});
  check(`${key}/${t.abbr}/fourth-attempts`,b.fourthAtt===ps.filter(p=>p.down===4&&attempted(p)).length);
  check(`${key}/${t.abbr}/conversions`,b.thirdConv<=b.thirdAtt&&b.fourthConv<=b.fourthAtt);
 }
 const physical=s.log.filter(p=>p.kind==='run'||p.kind==='pass'),official=physical.map(p=>({p,credit:p.officialCredit,stats:p.officialCredit?.stats??(!p.nullified?p.stats:undefined)})).filter(x=>x.stats);
 report.games.push({arm:row.arm,id:row.id,score:s.score,sourceSha256:s.provenance.sourceSha256,commit:s.provenance.commit,teamsSha256:s.provenance.teamsSha256,
  runtime:{collectionSeconds:s.elapsedSeconds,collectorLauncherSeconds:s.collectionLauncherSeconds,artifactSeconds:s.artifactSeconds,supervisedSeconds:row.launcherSeconds},
  teams:s.teams,physicalScrimmages:s.physicalScrimmages,worldSteps:s.worldSteps,filmedPlays:s.filmedPlays,
  raw:{scrimmages:physical.length,calledFouls:physical.reduce((n,p)=>n+(p.fouls?.length??0),0),nullified:physical.filter(p=>p.nullified).length,ruleLimitations:physical.filter(p=>p.ruleLimitations?.length).map(p=>({index:p.index,call:p.call,limitations:p.ruleLimitations}))},
  official:{creditedPlays:official.length,passes:official.filter(x=>x.stats.attempted).length,completions:official.filter(x=>x.stats.completed).length,sacks:official.filter(x=>x.stats.sacked).length,
  interceptions:official.filter(x=>x.stats.interceptedBy).length,fumbles:official.reduce((n,x)=>n+(x.stats.fumbles?.length??(x.stats.fumbledBy?1:0)),0),
  rushes:official.filter(x=>x.stats.rusher).length,meanYAC:(()=>{const a=official.filter(x=>x.stats.completed&&Number.isFinite(x.stats.yac));return a.length?a.reduce((n,x)=>n+x.stats.yac,0)/a.length:null;})()},
  artifacts:s.artifacts,limitations:s.limitations});
}
report.failed=report.checks.filter(c=>!c.pass);report.passed=report.failed.length===0;report.completedGames=report.games.length;
report.pairs=[];
for(const id of new Set(report.games.map(g=>g.id))){const base=report.games.find(g=>g.id===id&&g.arm==='baseline'),can=report.games.find(g=>g.id===id&&g.arm==='candidate');if(base&&can){check(`${id}/matched-teams`,base.teamsSha256===can.teamsSha256);report.pairs.push({id,baseline:base.score,candidate:can.score,runtimeRatio:can.runtime.collectionSeconds/base.runtime.collectionSeconds,deltaOfficial:{passes:can.official.passes-base.official.passes,completions:can.official.completions-base.official.completions,sacks:can.official.sacks-base.official.sacks,interceptions:can.official.interceptions-base.official.interceptions}});}}
report.failed=report.checks.filter(c=>!c.pass);report.passed=report.failed.length===0;
writeFileSync(join(out,'comparison.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,failed:report.failed,games:report.games.length,pairs:report.pairs}));
if(!report.passed)process.exitCode=1;
