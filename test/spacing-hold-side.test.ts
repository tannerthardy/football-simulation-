import {describe,expect,it} from 'vitest';
import {pickBendSide} from '../src/sim/spacing.js';

// SPACING_HOLD's side of a bend, chosen once at entry. po / no: the smallest clearing bend on the left (+) and right (-); the free space ahead in HIS picture on each side; whether the teammate is on his left.
describe('SPACING_HOLD: the side of a bend',()=>{
  it('takes the only side that clears',()=>{
    expect(pickBendSide(.4,undefined,undefined,undefined,false)).toBe(.4);
    expect(pickBendSide(undefined,-.6,3,1,true)).toBe(-.6);
    expect(pickBendSide(undefined,undefined,null,null,false)).toBeUndefined();
  });
  it('goes where his picture shows more space, whichever side that is',()=>{
    expect(pickBendSide(.2,-.2,3,1,false)).toBe(.2);
    expect(pickBendSide(.2,-.2,1,3,false)).toBe(-.2);
    expect(pickBendSide(.6,-.2,3,1,true)).toBe(.6);     // more space beats a smaller bend
  });
  it('with no better than 0.1 yd of space, or no picture of space, takes the smaller bend, then goes away from the teammate',()=>{
    expect(pickBendSide(.4,-.2,2,2.05,false)).toBe(-.2);
    expect(pickBendSide(.2,-.4,null,null,true)).toBe(.2);
    expect(pickBendSide(.2,-.2,2,2.05,true)).toBe(-.2);  // teammate on his left: bend right
    expect(pickBendSide(.2,-.2,undefined,undefined,false)).toBe(.2);   // teammate on his right: bend left
    expect(pickBendSide(.2,-.2,null,3,true)).toBe(-.2);
  });
});
