/** Eliminate the linear viscous/work-root forces at moving Gauss stages.
 * The original eight-pass map verifies every accepted stage; all body,
 * material, raw-foot and clock equations must close together. */
import type {SharedGripInput} from './grip-force-shared.js';
import type {SharedGripFrame} from './grip-shared-law.js';
import {sharedViscousCoefficients} from './grip-shared-viscous.js';
// Four-stage Gauss-Legendre, order eight. Integrate its Lagrange basis once.
const inner=Math.sqrt((3-2*Math.sqrt(6/5))/7)/2,outer=Math.sqrt((3+2*Math.sqrt(6/5))/7)/2,
  c=[.5-outer,.5-inner,.5+inner,.5+outer],weights=[(18-Math.sqrt(30))/72,(18+Math.sqrt(30))/72,(18+Math.sqrt(30))/72,(18-Math.sqrt(30))/72],
  A=c.map(end=>c.map((_v,j)=>{
    let p=[1],den=1;
    for(let k=0;k<4;k++)if(k!==j){const next=Array(p.length+1).fill(0);for(let l=0;l<p.length;l++){next[l]-=c[k]*p[l];next[l+1]+=p[l];}p=next;den*=c[j]-c[k];}
    return p.reduce((sum,v,k)=>sum+v*end**(k+1)/(k+1),0)/den;
  }));
interface Geometry extends SharedGripFrame{rax:number;ray:number;rbx:number;rby:number;share:number;c:number;s:number}
function linearSolve(matrix:number[][],rhs:number[]){
  const n=rhs.length;
  for(let k=0;k<n;k++){
    let pivot=k;for(let i=k+1;i<n;i++)if(Math.abs(matrix[i][k])>Math.abs(matrix[pivot][k]))pivot=i;
    if(!Number.isFinite(matrix[pivot][k])||Math.abs(matrix[pivot][k])<1e-12)throw new RangeError('Shared stage matrix');
    [matrix[k],matrix[pivot]]=[matrix[pivot],matrix[k]];[rhs[k],rhs[pivot]]=[rhs[pivot],rhs[k]];
    for(let i=k+1;i<n;i++){const v=matrix[i][k]/matrix[k][k];for(let j=k+1;j<n;j++)matrix[i][j]-=v*matrix[k][j];rhs[i]-=v*rhs[k];}
  }
  const x=Array(n).fill(0);for(let k=n-1;k>=0;k--){let v=rhs[k];for(let j=k+1;j<n;j++)v-=matrix[k][j]*x[j];x[k]=v/matrix[k][k];}return x;
}
export function eliminatedSharedStep(y:number[],h:number,input:SharedGripInput,Z:number,FOOT:number,T:number,
  geometry:(y:number[])=>Geometry[],derivative:(y:number[])=>number[],direction:number,
  statistics:{steps:number;iterations:number;maximumResidual:number;maximumForceResidual?:number}){
  statistics.steps++;const M=input.grips.length,N=input.bodies.length,G=A.map(row=>row.map(v=>h*v)),
    B=G.map(row=>c.map((_v,j)=>row.reduce((s,v,k)=>s+v*G[k][j],0))),stages=c.map(ci=>{
      const z=y.slice();for(let i=0;i<N;i++){const k=6*i;z[k]+=ci*h*y[k+2];z[k+1]+=ci*h*y[k+3];z[k+5]+=ci*h*y[k+4];}z[T]+=ci*h;return z;});
  for(let iteration=0;iteration<12;iteration++){
    statistics.iterations++;
    const g=stages.map(geometry),coefficients=g.map(v=>sharedViscousCoefficients(v,input.mobility,direction).matrix),
      at=Array.from({length:4},()=>Array(M).fill(0)),bt=Array.from({length:4},()=>Array(M).fill(0)),free=Array.from({length:4},()=>Array(M).fill(0));
    for(let s=0;s<4;s++)for(let q=0;q<M;q++){
      const v=g[s][q],ai=6*input.grips[q].holder;
      at[s][q]=v.rax*v.nx+v.ray*v.ny;bt[s][q]=v.rbx*v.nx+v.rby*v.ny;
      free[s][q]=-(y[8]-y[ai+2])*v.ny+(y[9]-y[ai+3])*v.nx+y[10]*bt[s][q]-y[ai+4]*at[s][q];
    }
    const size=4*M,matrix=Array.from({length:size},()=>Array(size).fill(0)),rhs=Array(size).fill(0),
      inverseB=1/input.bodies[1].mass,inertiaB=1/input.bodies[1].inertia;
    for(let s=0;s<4;s++)for(let q=0;q<M;q++){
      const index=s*M+q;
      for(let l=0;l<M;l++)rhs[index]+=coefficients[s][q][l]*free[s][l];
      for(let t=0;t<4;t++)for(let k=0;k<M;k++){
        let value=0;
        for(let l=0;l<M;l++){
          const u=g[s][l],v=g[t][k],holder=input.bodies[input.grips[l].holder],same=l===k,
            dot=u.nx*v.nx+u.ny*v.ny,
            coupling=inverseB*dot+bt[s][l]*bt[t][k]*inertiaB+(same?dot/holder.mass+at[s][l]*at[t][k]/holder.inertia:0);
          value+=coefficients[s][q][l]*coupling;
        }
        matrix[index][t*M+k]=(index===t*M+k?1:0)-G[s][t]*value;
      }
    }
    const force=linearSolve(matrix,rhs),acc=Array.from({length:4},()=>Array(6*N).fill(0)),
      foot=Array.from({length:4},()=>({x:0,y:0})),material=Array.from({length:4},()=>Array(2*M).fill(0));
    for(let s=0;s<4;s++){
      for(let k=0;k<M;k++){
        const v=g[s][k],f=force[s*M+k],fx=-v.ny*f,fy=v.nx*f,ai=6*input.grips[k].holder,body=input.bodies[input.grips[k].holder];
        acc[s][ai+2]-=fx/body.mass;acc[s][ai+3]-=fy/body.mass;acc[s][ai+4]-=at[s][k]*f/body.inertia;
        acc[s][8]+=fx/input.bodies[1].mass;acc[s][9]+=fy/input.bodies[1].mass;acc[s][10]+=bt[s][k]*f/input.bodies[1].inertia;
        foot[s].x+=input.mobility*(v.xx*fx+v.xy*fy);foot[s].y+=input.mobility*(v.xy*fx+v.yy*fy);
      }
      for(let k=0;k<M;k++){const v=g[s][k];material[s][2*k]=v.share*(v.c*foot[s].x+v.s*foot[s].y);material[s][2*k+1]=v.share*(-v.s*foot[s].x+v.c*foot[s].y);}
    }
    let residual=0;
    for(let s=0;s<4;s++){
      const z=stages[s];
      for(let i=0;i<N;i++){
        const k=6*i,next=[y[k]+c[s]*h*y[k+2],y[k+1]+c[s]*h*y[k+3],y[k+2],y[k+3],y[k+4],y[k+5]+c[s]*h*y[k+4]];
        for(let t=0;t<4;t++){
          next[0]+=B[s][t]*acc[t][k+2];next[1]+=B[s][t]*acc[t][k+3];next[5]+=B[s][t]*acc[t][k+4];
          next[2]+=G[s][t]*acc[t][k+2];next[3]+=G[s][t]*acc[t][k+3];next[4]+=G[s][t]*acc[t][k+4];
        }
        for(let j=0;j<6;j++){residual=Math.max(residual,Math.abs(z[k+j]-next[j]));z[k+j]=next[j];}
      }
      for(let k=0;k<M;k++)for(let j=0;j<2;j++){
        const index=Z+3*k+j;let value=y[index];for(let t=0;t<4;t++)value+=G[s][t]*material[t][2*k+j];
        residual=Math.max(residual,Math.abs(z[index]-value));z[index]=value;
      }
      let x=y[FOOT],v=y[FOOT+1];for(let t=0;t<4;t++){x+=G[s][t]*foot[t].x;v+=G[s][t]*foot[t].y;}
      residual=Math.max(residual,Math.abs(z[FOOT]-x),Math.abs(z[FOOT+1]-v));z[FOOT]=x;z[FOOT+1]=v;
    }
    if(residual<1e-13){
      const d=stages.map(derivative),J=FOOT+2;let closure=0,forceResidual=0;
      for(let s=0;s<4;s++){
        for(let k=0;k<M;k++)forceResidual=Math.max(forceResidual,
          Math.hypot(d[s][J+12*k+10],d[s][J+12*k+11]-force[s*M+k])/Math.max(1,input.grips[k].capacity));
        for(let j=0;j<=FOOT+2;j++){const index=j===FOOT+2?T:j;let value=y[index];for(let t=0;t<4;t++)value+=G[s][t]*d[t][index];closure=Math.max(closure,Math.abs(stages[s][index]-value));}
      }
      if(forceResidual>1e-10||closure>1e-13)throw new RangeError('Shared eliminated force/state consistency');
      statistics.maximumForceResidual=Math.max(statistics.maximumForceResidual??0,forceResidual);
      statistics.maximumResidual=Math.max(statistics.maximumResidual,closure);
      const result=y.slice();for(let j=0;j<y.length;j++)for(let s=0;s<4;s++)result[j]+=h*weights[s]*d[s][j];return result;
    }
  }
  throw new RangeError('Shared eliminated geometry budget');
}
