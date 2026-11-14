// APEX_LEVERAGE staged reads. (1) seam_flat: four verticals with the back's flat (No. 2 seams, back flares; staged
// concept, progression S2/W2 first) and (2) rb_slip_screen, vs cover4 / cover4_meg / cover6, gun_doubles_11, seeds
// 1..N, flip both ways. Per concept: plays, throws to No. 2 / the back / others with completions, yards and YAC;
// on seam_flat the apex on the back's side at the throw (depth, out vs No. 2) and No. 2's separation from the
// nearest defender at the throw and at the catch/arrival.
// usage: APEX_LEVERAGE=N npx tsx scripts/diag/risk/apex-fixture.ts SEEDS
import { PlaySim } from '../../../src/sim/playsim.js';
import { PASS_BY_ID, SCREEN_BY_ID } from '../../../src/playbook/concepts.js';
import { nativeTraceSetup } from '../command-trace.js';
const N = Number(process.argv[2] ?? 32);
PASS_BY_ID.rb_slip_screen = SCREEN_BY_ID.rb_slip_screen;
PASS_BY_ID.seam_flat = { ...PASS_BY_ID.four_verts, id: 'seam_flat', back: 'back_flat', progression: ['S2', 'W2', 'B', 'S1', 'W1'] } as any;
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 5 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(1)).join('/'); };
const mean = (v: number[]) => { v = v.filter(Number.isFinite); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : '-'; };
for (const concept of (process.env.FX ?? 'seam_flat,rb_slip_screen').split(',')) {
  const R: any[] = [];
  for (const coverage of ['cover4', 'cover4_meg', 'cover6']) for (let seed = 1; seed <= N; seed++) for (const flip of [false, true]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip }));
    const back = sim.offense.find((o: any) => o.player?.position === 'RB');
    const twos = [1, -1].map(side => sim.offense.filter((o: any) => ['WR', 'TE'].includes(o.player?.position) && (o.pos.y - sim.ballY) * side > 0).sort((p: any, r: any) => (r.pos.y - sim.ballY) * side - (p.pos.y - sim.ballY) * side)[1]).filter(Boolean);
    const sepOf = (r: any) => Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - r.pos.x, d.pos.y - r.pos.y)));
    const rec: any = { target: null }; const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (sim.ball.kind === 'air' && rec.target === null) {
        rec.target = sim.ball.target; rec.throwT = sim.t;
        rec.sep2 = Math.min(...twos.map(sepOf));
        const side = Math.sign(back.pos.y - sim.ballY) || 1, apex = sim.defense.find((d: any) => d.behavior?.rule === 'q_apex' && (d.pos.y - sim.ballY) * side > 0);
        const two = twos.find((t: any) => (t.pos.y - sim.ballY) * side > 0);
        if (apex && two) { rec.apexDepth = apex.pos.x - sim.los; rec.apexOut2 = (apex.pos.y - two.pos.y) * side; }
      }
      if (rec.target && rec.arrSep === undefined && sim.ball.kind !== 'air') rec.arrSep = sepOf(rec.target);
    };
    const res = sim.run();
    rec.cmp = res.outcome !== 'incomplete' && rec.target !== null && !res.turnover; rec.yards = res.yards; rec.who = rec.target === back ? 'back' : twos.includes(rec.target) ? 'two' : rec.target ? 'other' : 'none';
    rec.yac = rec.cmp && sim.catchAt >= 0 ? res.yards - ((sim.stats?.completedAirYards ?? NaN)) : NaN;
    R.push(rec);
  }
  const cell = (V: any[]) => `n ${V.length}, cmp ${V.filter(r => r.cmp).length}, yds ${mean(V.map(r => r.yards))}, YAC ${mean(V.map(r => r.yac))}`;
  console.log(`== ${concept} APEX_LEVERAGE=${process.env.APEX_LEVERAGE ?? 0}: plays ${R.length} | to No. 2 ${cell(R.filter(r => r.who === 'two'))} | to the back ${cell(R.filter(r => r.who === 'back'))} | other ${cell(R.filter(r => r.who === 'other'))} | no throw ${R.filter(r => r.who === 'none').length}`);
  console.log(`   at the throw: apex depth ${q(R.map(r => r.apexDepth))}, out vs No. 2 ${q(R.map(r => r.apexOut2))} | No. 2 nearest defender ${q(R.map(r => r.sep2))} | throw time ${q(R.map(r => r.throwT))} | target's nearest at arrival ${q(R.map(r => r.arrSep))}`);
}
