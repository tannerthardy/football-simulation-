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
  /** UNDERNEATH_MOVE: where the key is looking in this picture (rad, field frame): his seen head, else his seen hips, sampled
   * with the picture's delay. Absent or null: not seen. */
  readonly look?: number | null;
}
export interface RouteReadContext {
  readonly start: Readonly<Vec2>;
  readonly pos: Readonly<Vec2>;
  /** UNDERNEATH_MOVE: whether a key has been playing him as a man (eyes on him, or moving with him) (trailing or closing on his line) in this observer's picture;
   * absent, the old position-only read. */
  readonly movingWith?: (key: RouteKeyPicture) => boolean;
  readonly los: number;
  readonly middleY: number;
  readonly outside: number;
}
export interface RouteChoice {
  readonly answer: 'base' | 'away' | 'post' | 'under';
  readonly reason: 'no-fresh-key' | 'escape-open' | 'escape-capped' | 'split-roof' | 'seam-capped' | 'seam-open' | 'key-sitting';
  readonly keys: readonly string[];
}

/** UNDERNEATH_MOVE (on; `=0` restores; Flex, 2026-11-25, from Rules' staging via Integration): the 'underneath' read (stick, hook:
 * the installed vsMan alternative) works away only from a key that is moving with him in his own picture, not from any defender
 * standing within 4 yd of the break. Before, a zone defender merely in the window sent the stick to the flat at full speed (12 of
 * 12 in Cover 2 and Cover 4). */
export const UNDERNEATH_MOVE = process.env.UNDERNEATH_MOVE !== '0';
/** A key is moving with him when he trails on his hip (no deeper than TRAIL_DEPTH past him and coming upfield at least half his
 * own upfield speed) or closes on his line (lateral speed toward him). Enter and exit thresholds on opposite sides (stated
 * choices): a key once moving with him keeps it until he is 1.5 yd past him or closing under 1.0 yd/s. */
const TRAIL_DEPTH = 1.0, TRAIL_DEPTH_EXIT = 1.5, CLOSE_SPEED = 1.5, CLOSE_SPEED_EXIT = 1.0;
export function keyMovesWithHim(key: RouteKeyPicture, pos: Readonly<Vec2>, vel: Readonly<Vec2>, held: boolean): boolean {
  const past = key.pos.x - pos.x, toward = -Math.sign(key.pos.y - pos.y) * key.vel.y;
  const trailing = past <= (held ? TRAIL_DEPTH_EXIT : TRAIL_DEPTH) && key.vel.x >= 0.5 * Math.max(vel.x, 1);
  return trailing || toward >= (held ? CLOSE_SPEED_EXIT : CLOSE_SPEED);
}
/** UNDERNEATH_MOVE, the eyes and hips (Integration, 2026-11-25; docs/reviews/2026-11-25-receiver-outside-audit.md §1: "eyes on
 * the receiver and a square stance: man; eyes in the backfield, hips turned: zone"): where the key looks in his own picture.
 * Within LOOK_ON of the line to him and nearer him than the passer: on him. Within LOOK_ON of the passer and nearer the passer:
 * on the passer. Stated choices; the margins are on opposite sides of a held answer (a key held as a man needs the tighter
 * look to turn zone, and keeps 'on him' to LOOK_EXIT). */
const LOOK_ON = 25 * Math.PI / 180, LOOK_EXIT = 35 * Math.PI / 180;
export function keyLooksAt(key: RouteKeyPicture, pos: Readonly<Vec2>, passer: Readonly<Vec2> | null, held: boolean): 'him' | 'passer' | null {
  const look = key.look;
  if (look === null || look === undefined || !Number.isFinite(look)) return null;
  const off = (to: Readonly<Vec2>) => { const d = look - Math.atan2(to.y - key.pos.y, to.x - key.pos.x); return Math.abs(Math.atan2(Math.sin(d), Math.cos(d))); };
  const offHim = off(pos), offPasser = passer ? off(passer) : Infinity;
  if (offHim < (held ? LOOK_EXIT : LOOK_ON) && offHim < offPasser) return 'him';
  if (offPasser < (held ? LOOK_ON : LOOK_EXIT) && offPasser < offHim) return 'passer';
  return null;
}
/** UNDERNEATH_MOVE: the key plays him as a man in this picture: eyes on him, or moving with him while his eyes are not in the
 * backfield. `held`: he already reads the key as a man. */
export function keyIsMan(key: RouteKeyPicture, pos: Readonly<Vec2>, vel: Readonly<Vec2>, passer: Readonly<Vec2> | null, held: boolean): boolean {
  const look = keyLooksAt(key, pos, passer, held);
  return look === 'him' || (look !== 'passer' && keyMovesWithHim(key, pos, vel, held));
}
/** UNDERNEATH_MOVE: the exit is capped by where a defender will be, his picture carried CAP_LEAD ahead: a man leaving the exit
 * box does not cap it, a man arriving does (stated choice, the stem's last few steps to the break). */
export const CAP_LEAD = 0.4;

/** How long a key must have been moving with him before the read takes it as a man (s; Integration: about 0.3 s). */
export const MOVING_HOLD = 0.3;

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
    const at = (p: RouteKeyPicture) => UNDERNEATH_MOVE ? { x: p.pos.x + p.vel.x * CAP_LEAD, y: p.pos.y + p.vel.y * CAP_LEAD } : p.pos;
    const cap = seen.find(p => { const q = at(p); return (q.y - c.start.y) * direction > .5
      && (q.y - c.start.y) * direction <= exitWidth + 1
      && Math.abs(q.x - breakX) < 3 && q.x >= c.pos.x - 1; });
    if (cap) return base('escape-capped', [key.id, ...(cap === key ? [] : [cap.id])]);
    // UNDERNEATH_MOVE: a key merely standing or sinking in the window is zone: he sits on base. He works away only from a key
    // moving with him (trailing on his hip or closing on his line), as taught: sit against zone, work away from a man.
    if (UNDERNEATH_MOVE && c.movingWith && !c.movingWith(key)) return base('key-sitting', [key.id]);
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
