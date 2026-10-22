/**
 * Film one coverage scene: who each coverage defender took, and when.
 *
 *   node --import tsx scripts/coverage-rule-film.ts <formation> <coverage> [S1=go,S2=seam,W1=slant,B=flat] [until=3.2] [seed=5]
 *
 * Unnamed receivers run hitches; the back blocks unless B= names a route.
 * M=<slot>:<across|jet|empty|return> puts a player in motion (needs MOTION=1).
 * Prints the played call (after any formation check), the numbering, and each
 * defender's jobs and rule modes with times.
 */
import { filmScene } from '../src/lab/coverage-scene.js';

const [formation, coverage, routeArg = '', untilArg, seedArg] = process.argv.slice(2);
if (!formation || !coverage) throw new Error('usage: coverage-rule-film.ts <formation> <coverage> [S1=go,...] [until] [seed]');
const strong: Record<number, string> = {}, weak: Record<number, string> = {};
let back = 'block';
let motion: { slot: string; kind: string } | undefined;
for (const part of routeArg.split(',').filter(Boolean)) {
  const [ref, route] = part.split('=');
  if (ref === 'M') { const [slot, kind] = route.split(':'); motion = { slot, kind }; }
  else if (ref === 'B') back = route;
  else (ref[0] === 'S' ? strong : weak)[Number(ref.slice(1))] = route;
}
const film = filmScene({ formation, coverage, strong, weak, back, until: Number(untilArg ?? 3.2), seed: Number(seedArg ?? 5),
  motion: motion as Parameters<typeof filmScene>[0]['motion'] });
console.log(`${film.called} → played ${film.played}; numbering ${Object.entries(film.numbering).map(([k, v]) => `${k}=${v}`).join(' ')}`);
for (const d of Object.values(film.defenders))
  console.log(`${d.slot.padEnd(5)} ${(d.rule ?? '').padEnd(15)} ${d.jobs.join(' ')}${d.modes.length > 1 ? `   modes ${d.modes.join(' ')}` : ''}`);
