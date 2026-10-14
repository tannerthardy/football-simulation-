/** Diagnostic two-stage implicit step. The rank-one Jacobian only
 * preconditions Newton; every residual uses the full moving force law.
 * No capacities, work or state are replaced by the linear approximation. */
export function stiffTailStep(
  t:number,y:number[],h:number,
  derivative:(t:number,y:number[],validate:boolean)=>number[],
  rank:{u:number[];w:number[]},
  scale:(delta:number[])=>number,
  method:'gauss'|'radau',
) {
  const offset=Math.sqrt(3)/6,A=method==='gauss'?[[1/4,1/4-offset],[1/4+offset,1/4]]:[[5/12,-1/12],[3/4,1/4]],
    c=method==='gauss'?[1/2-offset,1/2+offset]:[1/3,1],b=method==='gauss'?[1/2,1/2]:[3/4,1/4],
    dot=(x:number[],z:number[])=>x.reduce((s,v,i)=>s+v*z[i],0),
    gamma=dot(rank.w,rank.u),q=h*gamma,
    m00=1+q*A[0][0],m01=q*A[0][1],m10=q*A[1][0],m11=1+q*A[1][1],
    det=m00*m11-m01*m10;
  let k=[y.map(()=>0),y.map(()=>0)];
  const stages=()=>c.map((_,i)=>y.map((v,j)=>v+h*(A[i][0]*k[0][j]+A[i][1]*k[1][j])));
  for(let iteration=0;iteration<12;iteration++) {
    const z=stages(),f=z.map((v,i)=>derivative(t+c[i]*h,v,false)),
      r=k.map((v,i)=>v.map((x,j)=>x-f[i][j]));
    if(Math.max(...r.map(v=>scale(v.map(x=>h*x))))<=1e-9) {
      // Trial iterates may leave scope; accepted collocation nodes may not.
      z.forEach((v,i)=>derivative(t+c[i]*h,v,true));
      return y.map((v,j)=>v+h*(b[0]*k[0][j]+b[1]*k[1][j]));
    }
    const d0=-dot(rank.w,r[0]),d1=-dot(rank.w,r[1]),
      alpha=[(m11*d0-m01*d1)/det,(m00*d1-m10*d0)/det];
    k=k.map((v,i)=>v.map((x,j)=>x-r[i][j]-h*rank.u[j]*(A[i][0]*alpha[0]+A[i][1]*alpha[1])));
  }
  throw new RangeError('Bounded tangent implicit iteration limit');
}
