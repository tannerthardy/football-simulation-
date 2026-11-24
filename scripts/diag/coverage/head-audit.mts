// HEAD_FOLLOW audit (Coverage C14, 2026-11-24): every live tick, every player whose head is set, his behaviour kind, whether
// something turned his head this tick (a zone-eyed defender: stepHeads; the passer while his controller runs: qb.ts), and
// the head's offset off his body facing. Perception reads that head (release-evidence's sawAt, the ball estimator), so an
// offset beyond the neck (90 deg standing; zone eyes ride on the shoulders, up to 55 deg of trunk twist, so 145) is a
// look the body cannot make. Read-only. Tools' game set.
//   HEAD_FOLLOW=0 node --import tsx scripts/diag/coverage/head-audit.mts <seed> <games>
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { compilingPlan } from '../../../src/playbook/read-compiler/runtime.js';
import { zoneEyesFor } from '../../../src/sim/zone-eyes.js';

const seed = Number(process.argv[2] ?? 23), games = Number(process.argv[3] ?? 1);
const P: any = PlaySim.prototype, tick0 = P.tick;
type Cell = { n: number; over100: number; over145: number; max: number; offs: number[] };
const cells = new Map<string, Cell>();
const deg = (x: number) => Math.abs(Math.atan2(Math.sin(x), Math.cos(x))) * 180 / Math.PI;
P.tick = function () {
  tick0.call(this);
  if (compilingPlan() || this.phase !== 'live') return;
  for (const a of this.agents) {
    if (a.head === null || a.head === undefined) continue;
    const kind = a === this.qb ? `qb ${this.ball?.kind === 'held' && this.ball.carrier === a ? 'holding' : 'not holding'} ${a.behavior?.kind ?? '?'}`
      : `${a.team === 'D' ? 'D' : 'O'} ${a.behavior?.kind ?? '?'}`;
    const driven = a === this.qb ? 'controller' : zoneEyesFor(a) ? 'zone eyes' : 'not driven';
    const key = `${kind} | ${driven}`, off = deg(a.head - a.body.facing);
    const c = cells.get(key) ?? { n: 0, over100: 0, over145: 0, max: 0, offs: [] };
    c.n++; if (off > 100) c.over100++; if (off > 145) c.over145++; c.max = Math.max(c.max, off);
    if (c.offs.length < 20000) c.offs.push(off);
    cells.set(key, c);
  }
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let i = 0; i < games; i++) simulateGame(home, away, { seed: seed + i });
const out = [...cells].map(([k, c]) => { const s = [...c.offs].sort((p, q) => p - q);
  return { cell: k, ticks: c.n, p95: +(s[Math.floor(0.95 * (s.length - 1))] ?? 0).toFixed(0), max: +c.max.toFixed(0), over100: c.over100, over145: c.over145 }; });
console.log(JSON.stringify({ seed, HEAD_FOLLOW: process.env.HEAD_FOLLOW ?? 'default', cells: out }));
