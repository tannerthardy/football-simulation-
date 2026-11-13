/** Fresh full games: snap-frame positions in the NFL file's shape (x = yd off the ball toward the defense's side for
 * defenders, offense negative; players side/group; down/yardsToGo), for rgtools/mugwalk.py. usage: <seed>... */
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
const grp = (a: any, side: string) => side === 'O' ? (['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot) ? 'OL' : a === a._qb ? 'QB' : 'SK')
  : /^(DE|DT|NT)/.test(a.slot) ? 'DL' : /LB/.test(a.slot) ? 'LB' : 'DB';
for (const seed of process.argv.slice(2).map(Number)) {
  const rng = new Rng(seed); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  let st: any = null, i = 0;
  simulateGame(home, away, { seed, record: false, hooks: {
    playSetup(_s: any, ctx: any) { st = ctx.state; },
    playResult(sim: any, kind: string) { if (kind !== 'scrimmage' || !st) return undefined;
      const down = st.down, togo = st.distance, id = `${seed}-${i++}`, call = sim.defCall;
      const tick = sim.tick.bind(sim); let done = false;
      sim.tick = () => { if (!done && sim.t >= 0) { done = true; const d2 = sim.attackDir(sim.offense[0].team), los = sim.los;
          const all = [...sim.offense.map((a: any) => [a, 'O']), ...sim.defense.map((a: any) => [a, 'D'])];
          console.log(JSON.stringify({ id, down, togo, kind: sim.isPass ? 'pass' : 'run', mug: call?.mug ?? 0, front: call?.front?.id, personnel: call?.personnel,
            players: all.map(([a, s]: any) => ({ side: s, group: s === 'O' ? (['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot) ? 'OL' : 'SK') : grp(a, s), slot: a.slot })),
            xy: [all.flatMap(([a]: any) => [+((a.pos.x - los) * d2).toFixed(2), +a.pos.y.toFixed(2)])] })); }
        tick(); };
      return undefined; } } });
}
