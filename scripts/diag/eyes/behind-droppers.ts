// usage: npm run ref -- --flag HEAD=1 --flag ZONE_EYES=0|1 -- npx tsx scripts/diag/eyes/behind-droppers.ts SEED GAMES
// ZONE_EYES' cost, reported not fixed: thrown passes against zone, by where the target is at the throw relative to the
// nearest underneath zone defender to him: behind him (more than 90 deg off his bearing to the QB, so outside the cone
// of a head on the QB) or in front. Throws, completions, completion rate, mean yards; and the share of all zone throws
// that went behind a dropper.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, ev0 = P.event, b0 = P.buildResult;
const dif = (a: number, b: number) => Math.abs(((a - b) * 180 / Math.PI + 540) % 360 - 180);
const rows: any[] = [];
P.event = function (type: string, a: any, b: any, note?: string) {
  if (type === 'throw' && b && !this.__bd && !this.defCall?.coverage?.man) {
    const R = b, q = this.qb.pos;
    const under = this.defense.filter((d: any) => d.behavior?.kind === 'zone' && !d.behavior.deep);
    const n = under.reduce((m: any, d: any) => (!m || Math.hypot(d.pos.x - R.pos.x, d.pos.y - R.pos.y) < Math.hypot(m.pos.x - R.pos.x, m.pos.y - R.pos.y) ? d : m), null);
    if (n && Math.hypot(n.pos.x - R.pos.x, n.pos.y - R.pos.y) < 10) {
      const behind = dif(Math.atan2(R.pos.y - n.pos.y, R.pos.x - n.pos.x), Math.atan2(q.y - n.pos.y, q.x - n.pos.x)) > 90;
      this.__bd = { R, behind, depth: R.pos.x - this.los };
    }
  }
  if ((type === 'catch' || type === 'secure') && this.__bd && a?.team === 'O') this.__bd.caught = true;
  return ev0.call(this, type, a, b, note);
};
P.buildResult = function () {
  const res = b0.call(this);
  if (this.__bd) rows.push({ ...this.__bd, comp: !!this.__bd.caught, yds: res.yards ?? 0 });
  this.__bd = undefined; return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
for (const [nm, f] of [['behind the dropper', (r: any) => r.behind], ['in front of him', (r: any) => !r.behind]] as const) {
  const T = rows.filter(f), C = T.filter(r => r.comp);
  console.log(`BD ${nm}: throws ${T.length} (${(T.length / Math.max(1, rows.length)).toFixed(2)} of zone throws within 10 yd of a dropper) | complete ${C.length} (${(C.length / Math.max(1, T.length)).toFixed(2)}) | mean yards ${(T.reduce((s, r) => s + r.yds, 0) / Math.max(1, T.length)).toFixed(1)} | target depth median ${T.length ? [...T.map(r => r.depth)].sort((a, b) => a - b)[Math.floor(T.length / 2)].toFixed(1) : '-'}`);
}
