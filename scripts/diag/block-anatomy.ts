/** How block engagements start, how long they last and how they end, by
 * play type (development aid).  node --import tsx scripts/diag/block-anatomy.ts [games] [seed] */
import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { simulateGame } from '../../src/game/game.js';
import type { PlaySim } from '../../src/sim/playsim.js';
import type { Engagement } from '../../src/sim/agent.js';
const games = Number(process.argv[2] ?? 1);
const rng = new Rng(Number(process.argv[3] ?? 21));
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
type Row = { play: 'run' | 'pass'; kind: string; blocker: string; dur: number; end: string; startT: number; fallB: boolean; fallD: boolean };
const rows: Row[] = [];
let plays = { run: 0, pass: 0 };
const hooks = {
  playResult: (sim: PlaySim) => {
    const tick = sim as unknown as { tick(): void };
    const play = sim.isPass ? 'pass' : 'run';
    plays[play]++;
    const live = new Map<Engagement, Row>();
    while (sim.phase === 'live' && sim.t < 25) {
      const n = sim.events.length;
      tick.tick();
      for (const e of sim.engagements) if (!live.has(e)) live.set(e, { play, kind: e.type, blocker: OL.has(e.blocker.slot) ? 'OL' : e.blocker.slot, dur: 0, end: 'open', startT: sim.t, fallB: false, fallD: false });
      const ev = sim.events.slice(n);
      for (const [e, r] of live) {
        if (r.end !== 'open') continue;
        if (e.blocker.body.support!.state !== 'up') r.fallB = true;
        if (e.defender.body.support!.state !== 'up') r.fallD = true;
        if (!sim.engagements.includes(e)) {
          const shed = ev.find((x) => x.type === 'shed' && x.a === e.defender.idx);
          r.end = shed?.note ?? (sim.phase !== 'live' ? 'whistle' : 'released');
          r.dur = sim.t - r.startT;
          rows.push(r);
        }
      }
    }
    for (const [, r] of live) if (r.end === 'open') { r.end = 'whistle'; r.dur = sim.t - r.startT; rows.push(r); }
    if (sim.phase === 'live') sim.whistle('timeout', sim.qb.pos);
    return sim.buildResult();
  },
};
for (let g = 0; g < games; g++) simulateGame(generateTeam(rng, 'H', 'HHH', { strength: 0.55 }), generateTeam(rng, 'A', 'AAA', { strength: 0.55 }), { seed: rng.nextU32(), hooks } as never);
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
for (const play of ['run', 'pass'] as const) {
  const rs = rows.filter((r) => r.play === play);
  console.log(`${play} plays ${plays[play]}: engagements ${rs.length} (${(rs.length / Math.max(1, plays[play])).toFixed(1)}/play), mean ${avg(rs.map((r) => r.dur)).toFixed(2)} s, blocker falls ${(100 * rs.filter((r) => r.fallB).length / Math.max(1, rs.length)).toFixed(0)}%, defender falls ${(100 * rs.filter((r) => r.fallD).length / Math.max(1, rs.length)).toFixed(0)}%`);
  const ends: Record<string, number> = {};
  for (const r of rs) ends[`${r.blocker}/${r.kind}: ${r.end}`] = (ends[`${r.blocker}/${r.kind}: ${r.end}`] ?? 0) + 1;
  for (const [k, v] of Object.entries(ends).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    const sub = rs.filter((r) => `${r.blocker}/${r.kind}: ${r.end}` === k);
    console.log(`   ${k.padEnd(40)} ${String(v).padStart(4)}  mean ${avg(sub.map((r) => r.dur)).toFixed(2)} s  start ${avg(sub.map((r) => r.startT)).toFixed(2)}`);
  }
}
