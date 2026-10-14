/** Three-stage Gauss for a coupled passive graph. Dynamic closure includes
 * every body, each attachment/share, the one raw foot and physical time. */
const r=Math.sqrt(15),A=[[5/36,2/9-r/15,5/36-r/30],[5/36+r/24,2/9,5/36-r/24],[5/36+r/30,2/9+r/15,5/36]],
  c=[.5-r/10,.5,.5+r/10],b=[5/18,4/9,5/18];
export function sharedGaussStep(y:number[],h:number,derivative:(y:number[])=>number[],dynamic:number[],
  statistics:{steps:number;iterations:number;maximumResidual:number}){
  statistics.steps++;const z=[y.slice(),y.slice(),y.slice()],mask=Array(y.length).fill(false);
  for(const j of dynamic)mask[j]=true;
  for(let iteration=0;iteration<30;iteration++){
    statistics.iterations++;const f=z.map(derivative);let residual=0;
    for(let i=0;i<3;i++)for(let j=0;j<y.length;j++){
      const next=y[j]+h*(A[i][0]*f[0][j]+A[i][1]*f[1][j]+A[i][2]*f[2][j]);
      if(mask[j])residual=Math.max(residual,Math.abs(z[i][j]-next));z[i][j]=next;
    }
    if(residual<1e-13){
      const f=z.map(derivative);let closure=0;
      for(let i=0;i<3;i++)for(const j of dynamic)
        closure=Math.max(closure,Math.abs(z[i][j]-y[j]-h*(A[i][0]*f[0][j]+A[i][1]*f[1][j]+A[i][2]*f[2][j])));
      if(closure>1e-13)continue;
      statistics.maximumResidual=Math.max(statistics.maximumResidual,closure);
      return y.map((v,j)=>v+h*(b[0]*f[0][j]+b[1]*f[1][j]+b[2]*f[2][j]));
    }
  }
  throw new RangeError('Shared-grip stage budget');
}
