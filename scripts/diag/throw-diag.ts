/** Separation at throw vs. at catch, and who is closest, per coverage. */
import { Rng } from '../../src/core/rng.js';
import { HASH_LEFT_Y } from '../../src/core/field.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_CONCEPTS, PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';

const [nStr = '40', covArg = 'cover1,cover2,cover3,cover4,cover6', conArg] = process.argv.slice(2);
const rng = new Rng(5);
const off = generateTeam(rng, 'O', 'OFF', { strength: 0.55 });
const def = generateTeam(rng, 'D', 'DEF', { strength: 0.55 });
const formation = FORMATION_BY_ID.gun_doubles_11;
const offense = pickOffense(off, formation.personnel);
const defense = pickDefense(def, 'nickel');
const concepts = conArg ? conArg.split(',') : PASS_CONCEPTS.filter((c) => !c.fake).map((c) => c.id);
for (const cov of covArg.split(',')) {
  const rows: Array<{ depth: number; s0: number; s1: number; fl: number; comp: boolean; yac: number; who: string }> = [];
  for (const cid of concepts) {
    for (let i = 0; i < Number(nStr); i++) {
      const sim = new PlaySim({ offense, defense, offCall: { formation, flip: false, kind: 'pass', pass: PASS_BY_ID[cid], label: cid }, defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, label: '' }, los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, seed: rng.nextU32(), record: true, recordEvery: 1 });
      const r = sim.run();
      const th = r.events.find((e) => e.type === 'throw');
      const ca = r.events.find((e) => e.type === 'catch' || e.type === 'pbu' || e.type === 'incomplete' || e.type === 'interception' || e.type === 'drop');
      if (!th || !ca || r.stats.throwaway || th.b === undefined) continue;
      const fr = (t: number) => r.frames!.reduce((b, f) => (Math.abs(f.t - t) < Math.abs(b.t - t) ? f : b));
      const n = sim.agents.length;
      const near = (f: { agents: number[] }, i: number) => {
        let best = Infinity, who = '';
        for (let j = 0; j < n; j++) {
          if (sim.agents[j].team !== 'D') continue;
          const d = Math.hypot(f.agents[j * 3] - f.agents[i * 3], f.agents[j * 3 + 1] - f.agents[i * 3 + 1]);
          if (d < best) { best = d; who = sim.agents[j].slot; }
        }
        return [best, who] as const;
      };
      const ti = th.b;
      const f0 = fr(th.t), f1 = fr(ca.t);
      const [s0] = near(f0, ti);
      const [s1, who] = near(f1, ti);
      rows.push({ depth: f1.agents[ti * 3] - 35, s0, s1, fl: ca.t - th.t, comp: r.stats.completed, yac: r.stats.yac ?? 0, who });
      if (process.env.LIST && f1.agents[ti * 3] - 35 >= 10 && f1.agents[ti * 3] - 35 < 20) console.log(`    ${cid} ${sim.agents[ti].slot} route=${(() => { const ref = (sim.offAlign.refOf as any)[sim.agents[ti].slot]; if (!ref) return '?'; if (ref[0] === 'B') return PASS_BY_ID[cid].back; const side = ref[0] === 'S' ? PASS_BY_ID[cid].strong : PASS_BY_ID[cid].weak; return (side as any)[Number(ref[1])] ?? '?'; })()} catchY=${f1.agents[ti * 3 + 1].toFixed(1)} depth=${(f1.agents[ti * 3] - 35).toFixed(1)} s0=${s0.toFixed(1)} s1=${s1.toFixed(1)} nearest=${who}`);
    }
  }
  const bucket = (lo: number, hi: number) => rows.filter((r) => r.depth >= lo && r.depth < hi);
  console.log(`\n${cov}: ${rows.length} targets`);
  for (const [lo, hi] of [[-10, 0], [0, 10], [10, 20], [20, 60]]) {
    const b = bucket(lo, hi);
    if (!b.length) continue;
    const avg = (f: (r: (typeof rows)[0]) => number) => (b.reduce((s, r) => s + f(r), 0) / b.length).toFixed(2);
    const comp = b.filter((r) => r.comp);
    const whoCount: Record<string, number> = {};
    for (const r of b) whoCount[r.who] = (whoCount[r.who] ?? 0) + 1;
    console.log(`  depth ${String(lo).padStart(3)}..${hi}: n=${String(b.length).padStart(4)} sepThrow=${avg((r) => r.s0)} sepCatch=${avg((r) => r.s1)} flight=${avg((r) => r.fl)} comp=${((100 * comp.length) / b.length).toFixed(0)}% yac=${(comp.reduce((s, r) => s + r.yac, 0) / Math.max(1, comp.length)).toFixed(2)} nearest: ${Object.entries(whoCount).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k}:${v}`).join(' ')}`);
  }
}
