// Whole games on this checkout: every scrimmage pass play's stats plus game state at the snap.
// node --import tsx scripts/diag/yac/gameyac.ts SEED GAMES OUT.jsonl
import { writeFileSync } from 'node:fs';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
const [seed0, games, out] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4]];
const rows: string[] = [];
const rng = new Rng(seed0);
for (let g = 0; g < games; g++) {
  const home = generateTeam(rng.fork(`h${g}`), 'Home', 'HOM', { strength: 0.55 });
  const away = generateTeam(rng.fork(`a${g}`), 'Away', 'AWY', { strength: 0.55 });
  let n = 0;
  simulateGame(home, away, { seed: rng.nextU32(), hooks: { playResult(sim, kind) {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    const en = (team: 'O' | 'D') => { const v = sim.agents.filter(a => a.team === team).map(a => a.body.energy); return v.reduce((s, x) => s + x, 0) / v.length; };
    const pre = { eO: en('O'), eD: en('D'), los: sim.los, call: sim.offCall.label, cov: sim.defCall.coverage?.id ?? sim.defCall.label };
    const run = sim.run.bind(sim);
    sim.run = () => {
      const r = run(); const st = r.stats;
      const ev = r.events, c = ev.find(e => e.type === 'catch');
      const ct = c ? ev.find(e => e.type === 'carrier_contact' && e.t >= c.t) : undefined;
      rows.push(JSON.stringify({ g, n: n++, ...pre, comp: !!st.completed, yac: st.yac ?? null, sep: st.separation ?? null,
        air: st.completedAirYards ?? st.airYards ?? null, contactT: ct && c ? +(ct.t - c.t).toFixed(2) : null, yards: r.yards, td: ev.some(e => e.type === 'touchdown') }));
      return r;
    };
    return undefined;
  } } });
  process.stderr.write(`game ${g + 1}\n`);
}
writeFileSync(out, rows.join('\n') + '\n');
