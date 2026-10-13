/** Follow-up pair tests on the four losses. Requests alone are removed or
 * isolated; native/plain controls, ownership and solver remain unchanged. */
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const root=process.argv[2] ?? 'out/hand-action-protection';
const arms=[
 ['combined-remove-LT',['RUN_CONTACT_COMPONENTS=1','PULL_HANDOVER=1','HAND_MOTOR=1','RUN_HANDS=1','DL_HANDS=1'],'LT:DE_W',''],
 ['offense-remove-LT',['RUN_CONTACT_COMPONENTS=1','HAND_MOTOR=1','RUN_HANDS=1'],'LT:DE_W',''],
 ['offense-remove-RG-S',['RUN_CONTACT_COMPONENTS=1','HAND_MOTOR=1','RUN_HANDS=1'],'RG:DT_S',''],
 ['combined-only-LT',['RUN_CONTACT_COMPONENTS=1','PULL_HANDOVER=1','HAND_MOTOR=1','RUN_HANDS=1','DL_HANDS=1'],'','LT:DE_W'],
 ['combined-only-RG-S',['RUN_CONTACT_COMPONENTS=1','PULL_HANDOVER=1','HAND_MOTOR=1','RUN_HANDS=1','DL_HANDS=1'],'','RG:DT_S'],
 ['defense-remove-LG-S',['PULL_HANDOVER=1','HAND_MOTOR=1','DL_HANDS=1'],'LG:DT_S',''],
 ['combined-remove-LG-S',['RUN_CONTACT_COMPONENTS=1','PULL_HANDOVER=1','HAND_MOTOR=1','RUN_HANDS=1','DL_HANDS=1'],'LG:DT_S',''],
 ['defense-only-LG-S',['PULL_HANDOVER=1','HAND_MOTOR=1','DL_HANDS=1'],'','LG:DT_S'],
];
const results=[];
for(const [name,flags,remove,keep] of arms){
 console.log(name);
 const output=`${root}/${name}.json.gz`,receipt=`${root}/${name}-receipt.json`;
 const p=spawnSync(process.execPath,['scripts/baseline.mjs','--candidate','--receipt',receipt,...flags.flatMap(f=>['--flag',f]),'--',process.execPath,'--import','tsx','scripts/diag/defense/hand-action-panel.ts',output],
 {encoding:'utf8',maxBuffer:16*1024*1024,env:{...process.env,FLOW_INPUTS:`${root}/four-inputs.json`,FLOW_STOP:'25',FLOW_TRACE:'1',CONTACT_TRACE:'1',CONTACT_SNAPSHOT:'',HAND_REMOVE:remove,HAND_KEEP:keep}});
 writeFileSync(`${root}/${name}.log`,(p.stdout??'')+(p.stderr??''));results.push({name,flags,remove,keep,output,receipt,exitCode:p.status});
 writeFileSync(`${root}/more-ablations.json`,JSON.stringify(results,null,2)+'\n');if(p.status!==0)throw Error(name+' failed');
}
