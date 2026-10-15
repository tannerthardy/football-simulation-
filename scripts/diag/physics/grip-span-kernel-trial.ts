/** PR43 DOP853 with sparse dynamic stages; same unchanged RK8
 * table. Error is checked component-by-component (including every ledger),
 * not averaged across state dimensions. FSAL reuses one accepted endpoint.
 */
import {DOP853_TABLE} from './grip-shared-explicit.js';
const E3=[-.18980075407240762,0,0,0,0,4.450312892752409,1.8915178993145003,-5.801203960010585,-.4226823213237919,-.1521609496625161,.20136540080403034,.02265179219836082,0],
  E5=[.01312004499419488,0,0,0,0,-1.2251564463762044,-.4957589496572502,1.6643771824549864,-.35032884874997366,.3341791187130175,.08192320648511571,-.022355307863886294,0];
const pairs=[[0,5e-10],[2,2.5e-8],[6,5e-10],[8,2.5e-8],[12,5e-10],[14,5e-10],[16,5e-10],[18,5e-10]],
  used=new Set(pairs.flatMap(([i])=>[i,i+1]));
/** Ledgers never feed this passive ODE. Only body/material/foot/time are
 * needed at intermediate stages. Every ledger still gets its original final
 * quadrature and embedded error, with original summation order. */
const dynamics=[...Array.from({length:16},(_v,i)=>i),32];
export function spanKernelTrial(y:number[],h:number,derivative:(y:number[])=>number[],start?:number[],dynamicShare=false){
  const {A,B}=DOP853_TABLE,f:number[][]=[];
  for(let i=0;i<A.length;i++){
    if(i===0&&start){f.push(start);continue;}
    const z=y.slice();
    for(let j=0;j<i;j++)if(A[i][j]!==0)for(const k of dynamics)z[k]+=h*A[i][j]*f[j][k];
    if(dynamicShare)for(let j=0;j<i;j++)if(A[i][j]!==0)z[27]+=h*A[i][j]*f[j][27];
    f.push(derivative(z));
  }
  const z=y.slice();for(let j=0;j<B.length;j++)if(B[j]!==0)for(let k=0;k<y.length;k++)z[k]+=h*B[j]*f[j][k];
  const end=derivative(z),error=y.map((_v,k)=>{
    let e3=0,e5=0;for(let j=0;j<E3.length-1;j++){e3+=E3[j]*f[j][k];e5+=E5[j]*f[j][k];}
    const denominator=Math.hypot(e5,.1*e3);return denominator===0?0:Math.abs(h*e5)*Math.abs(e5)/denominator;
  });
  let norm=0;for(const [i,scale] of pairs)norm=Math.max(norm,Math.hypot(error[i],error[i+1])/scale);
  for(let i=0;i<y.length;i++)if(!used.has(i)){
    const scale=i===4||i===10?2.5e-7:i===5||i===11?2.5e-9:i===27?1e-9:i===32?1e-12:1e-9;
    norm=Math.max(norm,error[i]/scale);
  }
  return {state:z,start:f[0],end,error:norm};
}
