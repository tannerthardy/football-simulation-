import {describe,expect,it} from 'vitest';
import {trafficDistance,trafficRoute} from '../src/sim/traffic-distance.js';
import {trafficPath,type TrafficDisc} from '../src/sim/traffic-path.js';

const start={x:-3,y:0},goal={x:3,y:0};
function same(discs:TrafficDisc[],bounds?:{minX:number;maxX:number;minY:number;maxY:number}) {
  const before=structuredClone(discs),proposal=trafficPath(start,goal,discs,bounds);
  expect(trafficDistance(start,goal,discs,bounds)).toBe(proposal?.distance??null);
  const selected=trafficRoute(start,goal,discs,bounds);
  expect(selected?.distance??null).toBe(proposal?.distance??null);
  if(selected){
    expect(selected.firstPiece).toEqual(selected.pieces[0]??null);
    for(const piece of selected.pieces){
      if(piece.kind==='arc')expect(discs[piece.disc]).toEqual({center:piece.center,radius:piece.radius});
      for(let k=0;k<=80;k++){
        const t=k/80;
        const p=piece.kind==='line'?{x:piece.from.x+(piece.to.x-piece.from.x)*t,y:piece.from.y+(piece.to.y-piece.from.y)*t}
          :{x:piece.center.x+piece.radius*Math.cos(piece.startAngle+piece.sweep*t),y:piece.center.y+piece.radius*Math.sin(piece.startAngle+piece.sweep*t)};
        for(const disc of discs)expect(Math.hypot(p.x-disc.center.x,p.y-disc.center.y)).toBeGreaterThanOrEqual(disc.radius-1e-8);
        if(bounds){expect(p.x).toBeGreaterThanOrEqual(bounds.minX-1e-8);expect(p.x).toBeLessThanOrEqual(bounds.maxX+1e-8);expect(p.y).toBeGreaterThanOrEqual(bounds.minY-1e-8);expect(p.y).toBeLessThanOrEqual(bounds.maxY+1e-8);}
      }
    }
  }
  expect(discs).toEqual(before);
  expect(trafficPath(start,goal,discs,bounds)).toEqual(proposal);
}
describe('scalar route cost retains the full geometry problem',()=>{
  it.each([-1,1])('checks an omitted obstacle inside the proposed arc in mirror %i',side=>{
    // These small circles miss the initial straight segment. Checking only
    // tangent lines or arc endpoints would incorrectly accept the shorter arc.
    same([{center:{x:0,y:.2*side},radius:1},{center:{x:0,y:-.95*side},radius:.25}]);
    same([{center:{x:0,y:0},radius:1},{center:{x:0,y:1.15},radius:.25},{center:{x:0,y:-1.15},radius:.25}]);
  });
  it('keeps all constraints while avoiding needless distant-disc graph nodes',()=>{
    same([{center:{x:0,y:0},radius:1},...Array.from({length:9},(_,i)=>({center:{x:i*2,y:20},radius:1}))]);
    same(Array.from({length:10},(_,i)=>({center:{x:i*2,y:20},radius:1})));
    same([{center:{x:0,y:0},radius:1},{center:{x:0,y:0},radius:1},{center:{x:.2,y:.1},radius:.3}]);
  });
  it.each([.5,.1])('retains the bounded full solve when the plane shortcut leaves the field (%s)',maxY=>{
    const discs=[{center:{x:0,y:-.35},radius:1}];
    same(discs,{minX:-4,maxX:4,minY:maxY===.5?-2:-.1,maxY});
  });
  it('keeps unknown, invalid, inside-body and excessive-peer cases unavailable',()=>{
    expect(trafficDistance({x:NaN,y:0},goal,[])).toBeNull();
    expect(trafficDistance(start,goal,[{center:{x:0,y:0},radius:NaN}])).toBeNull();
    expect(trafficDistance(start,goal,[{center:start,radius:1}])).toBeNull();
    expect(trafficDistance(start,goal,Array.from({length:11},()=>({center:{x:0,y:20},radius:1})))).toBeNull();
    expect(trafficDistance(start,start,[])).toBe(0);
  });
});
