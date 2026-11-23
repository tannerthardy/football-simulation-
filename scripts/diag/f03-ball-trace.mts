/** Trace the ball state tick by tick around the catch of one census play (game g of Coverage's census: teams from Rng(11), leagueSample(team, 11+g), seed 11+g), matched by the line of scrimmage and concept.
 *   node --import tsx scripts/diag/f03-ball-trace.mts [game=6] [los=41.4247] [from=2.9] [to=3.8]   Read-only tap on PlaySim.tick. */
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam, leagueSample } from '../../src/league/team.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { compilingPlan } from '../../src/playbook/read-compiler/runtime.js';
const g = Number(process.argv[2] ?? 6), los = Number(process.argv[3] ?? 41.4247), from = Number(process.argv[4] ?? 2.9), to = Number(process.argv[5] ?? 3.8);
const rng = new Rng(11);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const proto = PlaySim.prototype as unknown as { tick: () => void };
const t0 = proto.tick;
const hit = new WeakMap<object, boolean>();
proto.tick = function (this: any) {
  if (!hit.has(this)) hit.set(this, !compilingPlan() && this.offCall?.kind === 'pass' && Math.abs(this.los - los) < 0.01 && this.offCall.pass?.id === 'post_cross');
  const r = t0.call(this);
  if (hit.get(this) && this.t >= from && this.t <= to) {
    const b = this.ball, x = this.agents.find((a: any) => a.slot === 'X');
    const pos = b.kind === 'air' ? b.flight.pos : b.kind === 'held' ? b.carrier?.pos : b.pos ?? b.flight?.pos;
    console.log(`t=${this.t.toFixed(3)} ball.kind=${b.kind} ${b.kind === 'held' ? 'carrier=' + b.carrier?.slot : ''} pos=(${pos?.x?.toFixed(2)},${pos?.y?.toFixed(2)},z${(pos?.z ?? b.z ?? NaN).toFixed?.(2)}) X=(${x.pos.x.toFixed(2)},${x.pos.y.toFixed(2)}) |ball-X|=${pos ? Math.hypot(pos.x - x.pos.x, pos.y - x.pos.y).toFixed(2) : '?'} ${Object.keys(b).join(',')}`);
  }
  return r;
};
const res = simulateGame(leagueSample(home, 11 + g), leagueSample(away, 11 + g), { seed: 11 + g });
const e = res.log.filter((l: any) => l.kind === 'pass' && l.replay && Math.abs(l.replay.los - los) < 0.01);
for (const l of e) console.log('log:', l.text, '| events:', JSON.stringify(l.replay.events.filter((v: any) => ['throw', 'secure', 'catch', 'drop', 'touchdown', 'fumble', 'incomplete'].includes(v.type)).map((v: any) => [v.t, v.type])));
