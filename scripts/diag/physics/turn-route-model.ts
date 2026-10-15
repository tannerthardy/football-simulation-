/** Independent diagnostic reference; production defaults do not use route selection. */
export {signedAngle,boundedArrival,turnRoute} from '../../../src/physics/turn-route.js';

/** Independent reachable-displacement envelope. Integrate min/max affine
 * velocity bounds exactly, then bisect time. No candidate times/controls. */
export function arrivalReference(D:number,spin:number,A:number,R:number){
  const area=(T:number,upper:boolean)=>{
    const lines=upper?[[R,0],[spin,A],[A*T,-A]]:[[-R,0],[spin,-A],[-A*T,A]],points=[0,T];
    for(let i=0;i<lines.length;i++)for(let j=0;j<i;j++){const t=(lines[j][0]-lines[i][0])/(lines[i][1]-lines[j][1]);if(t>0&&t<T)points.push(t);}
    points.sort((a,b)=>a-b);const f=(t:number)=>(upper?Math.min:Math.max)(...lines.map(([b,m])=>b+m*t));
    return points.slice(1).reduce((s,t,i)=>s+(f(points[i])+f(t))*(t-points[i])/2,0);
  },feasible=(T:number)=>T>=Math.abs(spin)/A&&D>=area(T,false)-1e-14&&D<=area(T,true)+1e-14;
  let lo=0,hi=Math.max(.001,Math.abs(spin)/A);for(let k=0;!feasible(hi);k++){if(k>64)throw Error('Turn reference bound');hi*=2;}
  for(let k=0;k<64;k++){const t=(lo+hi)/2;if(feasible(t))hi=t;else lo=t;}return hi;
}
