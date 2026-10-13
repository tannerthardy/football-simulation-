import { describe, expect, it } from 'vitest';
import { coherentRunHandDrive } from '../src/sim/run-hand-motion.js';
import type { Vec2 } from '../src/core/vec.js';

const tangent = (a: Vec2, b: Vec2) => {
  const x = b.x-a.x, y=b.y-a.y, l=Math.hypot(x,y);
  return { x:-y/l, y:x/l };
};
const rotate = (v: Vec2, angle: number) => ({ x:v.x*Math.cos(angle)-v.y*Math.sin(angle), y:v.x*Math.sin(angle)+v.y*Math.cos(angle) });
const b={x:39.79851819686015,y:21.7613449669546},d={x:39.32407804219475,y:22.455009920719736};
const command={x:-.31429833708404564,y:-3.0849772668744695}, observed={x:-.6918483521131447,y:-2.2918480508711467};
const target=2.5305244399044957, surface={x:0,y:-1};

describe('an active offensive redirect shares the acquired foot/surface goal', () => {
  it('removes the native RG target opposing its requested seal recovery', () => {
    expect(coherentRunHandDrive(target,tangent(b,d),surface,true,command,observed)).toBe(0);
  });
  it.each([-.8,0,.4,1.7])('makes the same decision after coordinate rotation %s', angle => {
    expect(coherentRunHandDrive(target,rotate(tangent(b,d),angle),rotate(surface,angle),true,
      rotate(command,angle),rotate(observed,angle))).toBe(0);
  });
  it('reflects the native contact including the signed tangent target', () => {
    const reflect=(v:Vec2)=>({x:v.x,y:-v.y});
    // A perpendicular acquired basis reverses orientation on reflection.
    expect(coherentRunHandDrive(-target,tangent(reflect(b),reflect(d)),surface,true,reflect(command),reflect(observed))).toBe(0);
  });
  it('does not change the physical decision when joint endpoints are exchanged', () => {
    expect(coherentRunHandDrive(target,tangent(d,b),surface,false,command,observed)).toBe(0);
  });
  it('uses relative motion rather than absolute running speed', () => {
    const boost=(v:Vec2)=>({x:v.x+6,y:v.y-4});
    expect(coherentRunHandDrive(target,tangent(b,d),surface,true,boost(command),boost(observed))).toBe(0);
  });
  it('retains a redirect reinforcing the chosen seal correction', () => {
    expect(coherentRunHandDrive(-target,tangent(b,d),surface,true,command,observed)).toBe(-target);
  });
  it('retains runoff when the blocker deliberately matches the acquired flow', () => {
    expect(coherentRunHandDrive(target,tangent(b,d),surface,true,observed,observed)).toBe(target);
  });
  it('does not reject hand motion orthogonal to the surface correction', () => {
    expect(coherentRunHandDrive(2,{x:1,y:0},surface,true,command,observed)).toBe(2);
  });
  it('keeps a zero active target as passive contact', () => {
    expect(coherentRunHandDrive(0,tangent(b,d),surface,true,command,observed)).toBe(0);
  });
});
