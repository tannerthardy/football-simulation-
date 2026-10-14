/** A numerical force-angle clock. Gauss stages carry physical time along with
 * the state, so impulse moments and power see exactly the same clock. */
const r=Math.sqrt(15),A=[
  [5/36,2/9-r/15,5/36-r/30],
  [5/36+r/24,2/9,5/36-r/24],
  [5/36+r/30,2/9+r/15,5/36]],c=[.5-r/10,.5,.5+r/10],b=[5/18,4/9,5/18];
const dynamic=[...Array.from({length:16},(_v,j)=>j),27,30];
export function angleGripStep(s:number,y:number[],h:number,derivative:(s:number,y:number[])=>number[],
  statistics:{steps:number;iterations:number;maximumStageResidual?:number;maximumClockResidual?:number}) {
  statistics.steps++;
  const z=[y.slice(),y.slice(),y.slice()];
  for(let iteration=0;iteration<30;iteration++) {
    statistics.iterations++;
    const f=c.map((v,i)=>derivative(s+v*h,z[i]));let residual=0;
    for(let i=0;i<3;i++)for(let j=0;j<y.length;j++){
      const next=y[j]+h*(A[i][0]*f[0][j]+A[i][1]*f[1][j]+A[i][2]*f[2][j]);
      if(j<16||j===27||j===30)residual=Math.max(residual,Math.abs(next-z[i][j]));z[i][j]=next;
    }
    if(residual<1e-13){
      const f=c.map((v,i)=>derivative(s+v*h,z[i]));
      let closure=0,clock=0;
      for(let i=0;i<3;i++)for(const j of dynamic){
        const gap=Math.abs(z[i][j]-y[j]-h*(A[i][0]*f[0][j]+A[i][1]*f[1][j]+A[i][2]*f[2][j]));
        closure=Math.max(closure,gap);if(j===27||j===30)clock=Math.max(clock,gap);
      }
      if(closure>1e-13)continue;
      statistics.maximumStageResidual=Math.max(statistics.maximumStageResidual??0,closure);
      statistics.maximumClockResidual=Math.max(statistics.maximumClockResidual??0,clock);
      return y.map((v,j)=>v+h*(b[0]*f[0][j]+b[1]*f[1][j]+b[2]*f[2][j]));
    }
  }
  throw new RangeError('Force-angle stage iteration limit');
}
