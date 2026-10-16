/** Saved-picture predicate inspection only; zero World steps or sense calls. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {FIELD_WIDTH} from '../../src/core/field.ts';
import {sub,clamp} from '../../src/core/vec.ts';
import {alignOffense} from '../../src/playbook/alignment.ts';
import {playSideSign} from '../../src/sim/behaviors/blocking.ts';
const source=readFileSync('src/sim/behaviors/blocking.ts','utf8');
const ast=ts.createSourceFile('blocking.ts',source,ts.ScriptTarget.ES2022,true);
const node=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='climbRoute');
if(!node)throw Error('Missing native pure corridor function');
const original=node.getText(ast),js=ts.transpileModule(original,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const routeFunction=new Function('FIELD_WIDTH','sub','clamp',js+';return climbRoute;')(FIELD_WIDTH,sub,clamp);
const showsNode=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='backerShows');
const showsJs=ts.transpileModule(showsNode.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const showsFunction=new Function('playSideSign',showsJs+';return backerShows;')(playSideSign);
const manifest=JSON.parse(readFileSync('data/reviews/current/duo-transfer/inputs.json'));
const rows=JSON.parse(readFileSync('data/reviews/current/duo-transfer/route-states.json'));
const result=rows.map(r=>{
 const route=routeFunction(r.a,r.defender,r.down,r.partner,r.covered,r.backer);
 const own=r.a.pos.y-r.down.pos.y,partner=r.covered.pos.y-r.down.pos.y,key=r.backer.pos.y-r.down.pos.y;
 const nextKey=key+(r.backer.vel.y-r.down.vel.y)*r.dt;
 const nextPartner=partner+(r.covered.vel.y-r.down.vel.y)*r.dt;
 const halfGate=own*partner<0&&own*key<0&&partner*key>0&&own*nextKey<0&&nextPartner*nextKey>0;
 const input=manifest.rows.find(i=>i.id===r.case).setup;
 const sim={offCall:input.offCall,offAlign:alignOffense(input.offCall.formation,input.offCall.flip,input.los,input.ballY)};
 const filling=Math.hypot(r.backer.pos.x-r.a.pos.x,r.backer.pos.y-r.a.pos.y)<4.2||showsFunction(r.a,sim,r.backer);
 const arriving=!!r.runnerPicture&&r.runnerPicture.pos.x>input.los-2.8;
 const withheldByDuoGate=(filling||arriving)&&!!route?.exit&&halfGate;
 if(withheldByDuoGate&&r.nativeProposal)throw Error('Contradictory native proposal');
 return {case:r.case,t:r.t,actor:r.actorSlot,keeper:r.keeperSlot,backer:r.backerSlot,
  dt:r.dt,own,partner,key,nextKey,nextPartner,route,halfGate,
  filling,arriving,withheldByDuoGate,nativeProposal:r.nativeProposal};
});
writeFileSync('data/reviews/current/duo-transfer/admission.json',JSON.stringify({
 sourceFunctionSha256:createHash('sha256').update(original).digest('hex'),
 qualification:'Exact native climbRoute on captured acquired pictures and actual pre-step own body. Pure admission result only, no feasible-path or physical-counterfactual claim.',rows:result},null,2)+'\n');
for(const caseId of ['D05','D06','A018'])console.log(caseId,result.filter(r=>r.case===caseId&&r.withheldByDuoGate).map(r=>({t:r.t,a:r.actor,keeper:r.keeper,own:r.own,key:r.key})));
