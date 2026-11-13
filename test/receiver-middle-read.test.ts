import { describe, expect, it } from 'vitest';
import { ROUTES } from '../src/playbook/routes.js';
import { installedRead, readRoute, type RouteKeyPicture } from '../src/sim/route-read.js';

const read = installedRead(ROUTES.seam_read)!;
const context = { start: { x: 40, y: 32 }, pos: { x: 48, y: 32 }, los: 40, middleY: 26.667, outside: 1 };
const key = (id: string, x: number, y: number, age = .2): RouteKeyPicture => ({ id, pos: { x, y }, vel: { x: 0, y: 0 }, age });

describe('installed near-safety seam read', () => {
  it('bends between acquired split roofs rather than inferring two high from a call name', () => {
    const choice = readRoute(read, context, [key('left', 57, 19), key('right', 57, 35)]);
    expect(choice).toEqual({ answer: 'post', reason: 'split-roof', keys: ['left', 'right'] });
    // Normal half-field players can widen past twelve yards from middle.
    expect(readRoute(read, context, [key('left-half', 58.6, 13.84), key('right-half', 58.7, 39.06)]).answer).toBe('post');
  });
  it('continues the seam away from a central safety and works underneath a roof shading the seam', () => {
    expect(readRoute(read, context, [key('middle', 57, 26.667)]).answer).toBe('base');
    expect(readRoute(read, context, [key('middle', 57, 29)]).answer).toBe('under');
  });
  it('does not use missing or expired opposite-safety information to authorize the post', () => {
    expect(readRoute(read, context, []).answer).toBe('base');
    expect(readRoute(read, context, [key('left', 57, 19)]).answer).toBe('base');
    expect(readRoute(read, context, [key('left', 57, 19), key('right', 57, 35, .8)]).answer).toBe('base');
    expect(readRoute(read, context, [key('outside-left', 60, 2), key('outside-right', 60, 51)]).answer).toBe('base');
  });
  it('takes the installed underneath answer when the near roof is already very deep', () => {
    expect(readRoute(read, context, [key('left', 75, 19), key('right', 75, 35)])).toMatchObject({ answer: 'under' });
  });
  it('preserves the mirrored read and exposes a central robber as contradictory evidence', () => {
    const seen = [key('left', 57, 19), key('right', 57, 35), key('robber', 53, 27)];
    expect(readRoute(read, context, seen).answer).not.toBe('post');
    const flip = (y: number) => 2 * context.middleY - y;
    const mirrored = { ...context, outside: -1, start: { ...context.start, y: flip(context.start.y) }, pos: { ...context.pos, y: flip(context.pos.y) } };
    expect(readRoute(read, mirrored, seen.map(p => ({ ...p, pos: { ...p.pos, y: flip(p.pos.y) } }))).answer)
      .toBe(readRoute(read, context, seen).answer);
    expect(read.answers.some(a => String(a.id) === 'corner')).toBe(false); // No uninstalled sail conversion.
  });
});
