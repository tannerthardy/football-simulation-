/** Independent zero-simulation check: execute the pinned cancellation block
 * against a dot-projection oracle; check fixed-state unequal-duration sums.
 * This does not claim unequal-step World trajectory convergence. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const started=performance.now();
const head='3b426fb1b82639d99bb6384276cc315a3e266c42';
const source=execFileSync('git',['show',`${head}:src/physics/world.ts`],{encoding:'utf8'});
const block=source.slice(source.indexOf('      const ankleBrace ='),source.indexOf('      sup.feltTip =',source.indexOf('      const ankleBrace =')));
assert(block.includes('transverse !== 0'));
const run=new Function('feltMoment','ankleMoment','leanBrace','oldTip','h','i',block);
const rotate=([x,y],a)=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];
const near=(actual,expected)=>assert(Math.abs(actual-expected)<2e-12,`${actual} != ${expected}`);
let cases=0,exactCollinear=0,maxError=0;
for(const T of [[0,0],[2,0],[-2,0],[0,3],[2,-3]]) for(const b of [[0,0],[1,0],[-1,0],[0,2],[1,2]])
for(const angle of [0,.7]) for(const a of [0,.3,1]) for(const l of [0,.2,.8,1]) {
 const [tx,ty]=rotate(T,angle),[bx,by]=rotate(b,angle),norm=Math.hypot(tx,ty);
 const ankle=norm>1e-9?a:0,brace2=bx*bx+by*by,extra=brace2?Math.max(l-ankle,0):0;
 // The input must be a state this World can produce: positive lean fraction
 // requires a nonzero attained brace. A zero brace has lean fraction zero.
 if(!brace2&&l!==0)continue;
 const dot=tx*bx+ty*by;
 const expected=[ankle*tx+extra*bx*dot/(brace2||1),ankle*ty+extra*by*dot/(brace2||1)];
 const cancel=h=>{
  const state={tipX:[4*h],tipY:[-5*h],braceX:[bx],braceY:[by]};
  run.call(state,norm,a*norm,l,{x:tx,y:ty},h,0);
  return [4*h-state.tipX[0],-5*h-state.tipY[0]];
 };
 for(const h of [.05,.011,.007,.032]){
  const actual=cancel(h);actual.forEach((v,i)=>{near(v,expected[i]*h);maxError=Math.max(maxError,Math.abs(v-expected[i]*h));});
  // The added lean cancellation is parallel to b, leaving transverse ankle
  // cancellation bounded by the one existing aggregate ankle allowance.
  near((actual[0]-ankle*tx*h)*by-(actual[1]-ankle*ty*h)*bx,0);
 }
 const whole=cancel(.05),parts=[.011,.007,.032].map(cancel);
 whole.forEach((v,i)=>near(v,parts.reduce((s,p)=>s+p[i],0)));
 if(bx*ty-by*tx===0){
  const h=.05,state={tipX:[.2],tipY:[-.25],braceX:[bx],braceY:[by]};
  run.call(state,norm,a*norm,l,{x:tx,y:ty},h,0);
  const legacy=Math.max(l,ankle);
  assert.equal(state.tipX[0],.2-tx*legacy*h);assert.equal(state.tipY[0],-.25-ty*legacy*h);exactCollinear++;
 }
 cases++;
}
console.log(JSON.stringify({protocol:'directional-cancellation-algebra-v1',head,node:process.version,sourceBlockSha256:createHash('sha256').update(block).digest('hex'),scriptSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),cases,exactCollinear,maxError,elapsedSeconds:(performance.now()-started)/1000,engineSteps:0,result:'PASS',limits:'Fixed-state algebra only; unequal World trajectories remain outside this check.'},null,2));
