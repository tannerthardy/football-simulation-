/** Installed receiver rules evaluated from one player's picture. No agents,
 * defensive calls, private route choices, random draws or world queries. */
import type { Vec2 } from '../core/vec.js';
import { FIELD_WIDTH } from '../core/field.js';
import type { RouteDef, RouteRead } from '../playbook/types.js';

export interface RouteKeyPicture {
  readonly id: string;
  readonly pos: Readonly<Vec2>;
  readonly vel: Readonly<Vec2>;
  /** Age of this observer's held picture, including latency where available. */
  readonly age: number;
}
export interface RouteReadContext {
  readonly start: Readonly<Vec2>;
  readonly pos: Readonly<Vec2>;
  readonly los: number;
  readonly middleY: number;
  readonly outside: number;
}
export interface RouteChoice {
  readonly answer: 'base' | 'away' | 'post' | 'under';
  readonly reason: 'no-fresh-key' | 'escape-open' | 'escape-capped' | 'split-roof' | 'seam-capped' | 'seam-open';
  readonly keys: readonly string[];
}

/** Old saved constructors retain their installed vsMan alternative. */
export function installedRead(route: RouteDef): RouteRead | null {
  return route.read ?? (route.vsMan ? { key: 'underneath',
    depth: Math.max(0, route.vsMan[0].d - 2),
    answers: [{ id: 'away', points: route.vsMan, end: 'continue' }] } : null);
}

export function readRoute(read: RouteRead, c: RouteReadContext, pictures: readonly RouteKeyPicture[]): RouteChoice {
  // A held picture is not new evidence. Half a second is the existing QB
  // memory's bounded motion-prediction horizon, not a commitment timer.
  const seen = pictures.filter(p => Number.isFinite(p.age) && p.age >= 0 && p.age <= .5);
  const base = (reason: RouteChoice['reason'], keys: string[] = []): RouteChoice => ({ answer: 'base', reason, keys });
  if (read.key === 'underneath') {
    const away = read.answers.find(a => a.id === 'away');
    if (!away) return base('no-fresh-key');
    const breakX = c.los + away.points[0].d;
    const direction = Math.sign(away.points.at(-1)!.l - away.points[0].l) * c.outside;
    const window = seen.filter(p => Math.abs(p.pos.x - breakX) < 4 && Math.abs(p.pos.y - c.start.y) < 5)
      .sort((a, b) => Math.hypot(a.pos.x - breakX, a.pos.y - c.start.y)
        - Math.hypot(b.pos.x - breakX, b.pos.y - c.start.y));
    const key = window[0];
    if (!key) return base('no-fresh-key');
    // Work away from a squeezing/trailing key only when the installed exit
    // has access. A second defender sitting in that exit still matters.
    const last = away.points.at(-1)!;
    const exitWidth = Math.abs(last.l - away.points[0].l);
    const cap = seen.find(p => (p.pos.y - c.start.y) * direction > .5
      && (p.pos.y - c.start.y) * direction <= exitWidth + 1
      && Math.abs(p.pos.x - breakX) < 3 && p.pos.x >= c.pos.x - 1);
    if (cap) return base('escape-capped', [key.id, ...(cap === key ? [] : [cap.id])]);
    return { answer: 'away', reason: 'escape-open', keys: [key.id] };
  }

  // This install is a seam with post/under answers, not a universal coverage
  // identifier. Positive evidence of BOTH split safeties is needed for post;
  // absence of a central safety from the picture does not prove open middle.
  const roof = seen.filter(p => p.pos.x > c.los + read.depth + 3
    && Math.abs(p.pos.y - c.middleY) < FIELD_WIDTH / 4 + 2);
  const middle = roof.find(p => Math.abs(p.pos.y - c.middleY) < 4);
  const left = roof.find(p => p.pos.y <= c.middleY - 4);
  const right = roof.find(p => p.pos.y >= c.middleY + 4);
  // Very deep roofs leave the underneath answer. The safety's space at this
  // read depth matters; two distant silhouettes are not a command to post.
  const deepRoof = roof.filter(p => Math.abs(p.pos.y - c.start.y) < 4
    && p.pos.x > c.los + read.depth + 14)[0];
  if (deepRoof && read.answers.some(a => a.id === 'under'))
    return { answer: 'under', reason: 'seam-capped', keys: [deepRoof.id] };
  if (!middle && left && right && read.answers.some(a => a.id === 'post'))
    return { answer: 'post', reason: 'split-roof', keys: [left.id, right.id] };
  const cap = roof.filter(p => Math.abs(p.pos.y - c.start.y) < 4)
    .sort((a, b) => a.pos.x - b.pos.x)[0];
  if (cap && read.answers.some(a => a.id === 'under'))
    return { answer: 'under', reason: 'seam-capped', keys: [cap.id] };
  return base(roof.length ? 'seam-open' : 'no-fresh-key', middle ? [middle.id] : []);
}
