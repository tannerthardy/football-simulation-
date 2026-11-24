// The dither budget's panel (test/dither-budget.test.ts measure(), shift 0): for zone and man coverage defenders apart
// (dither-core's GROUP remapped for this run), every stage's re-aims and reversed re-aims, and per behaviour state, under
// Commit to a decision. node --import tsx scripts/diag/coverage/dither-stage-table.mts
import { readFileSync } from 'node:fs';
const W = process.cwd();
for (const [k, v] of Object.entries(JSON.parse(readFileSync(`${W}/config/reference-stack.json`, 'utf8')).flags as Record<string, string>))
  if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam, pickDefense, pickOffense } = await import(`${W}/src/league/team.ts`);
const { PASS_BY_ID, RUN_BY_ID, SCREEN_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import(`${W}/src/playbook/defense.ts`);
const { FORMATION_BY_ID } = await import(`${W}/src/playbook/formations.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const core = await import(`${W}/scripts/diag/effective-mass/dither-core.ts`);
core.instrument(PlaySim);
core.GROUP.zone = 'zone'; core.GROUP.man = 'man';
const ACC: any = {};
ACC.__log = [];
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const { ZoneCoverage, ManCoverage, ballPhaseBranchOf } = await import(`${W}/src/sim/behaviors/defense.ts`);
// The technique label each zone / man behaviour returned, per agent and tick (its decided command), and the play phase.
const label = new Map<any, Map<number, string>>();
const DBG = new Map<any, Map<number, any>>();
const DC = new Map<any, Map<number, any>>();
for (const C of [ZoneCoverage, ManCoverage]) {
  const up0 = C.prototype.update;
  C.prototype.update = function (a: any, sim: any) { const c = up0.call(this, a, sim);
    (a.__reqs ??= new Map()).set(+sim.t.toFixed(3), { ...c.vel });
    const ph = sim.ball?.kind === 'air' ? 'air' : sim.ball?.kind === 'held' && sim.ball.carrier !== sim.qb ? 'after-catch' : 'pre-throw';
    const dc = (a as any).__dc; if (dc && Math.abs(dc.t - sim.t) < 1e-6) { let h = DC.get(a); if (!h) DC.set(a, h = new Map()); h.set(+sim.t.toFixed(3), { ...dc }); }
    const dbg = (a as any).__fbdbg; if (dbg) { let h = DBG.get(a); if (!h) DBG.set(a, h = new Map()); h.set(+sim.t.toFixed(3), { ...dbg }); (a as any).__fbdbg = undefined; }
    let m = label.get(a); if (!m) label.set(a, m = new Map()); m.set(+sim.t.toFixed(3), `${ph}:${facingTechnique(c)?.label ?? (() => { const b = ballPhaseBranchOf(a); return b && Math.abs(b.t - sim.t) < 1e-6 ? b.branch : 'untagged'; })()}`); return c; };
}
const offense = generateTeam(new Rng(101), 'Dither O', 'DTO', { strength: .55 });
const defense = generateTeam(new Rng(102), 'Dither D', 'DTD', { strength: .55 });
const go = (label: string, setup: any) => { const acc: any = ACC; const sim: any = new PlaySim(setup);
  core.watch(sim, acc); sim.run();
};
for (const run of ['oz_strong', 'oz_weak', 'wz_strong', 'iz_strong', 'power', 'counter', 'toss', 'duo']) for (let seed = 1; seed <= 5; seed++) {
  const formation = FORMATION_BY_ID.ace_12;
  go(`${run} ${seed}`, { offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: seed % 2 === 0, kind: 'run', run: RUN_BY_ID[run], label: run },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'u3' },
    los: 35, ballY: 26.65, firstDownX: 45, seed });
}
for (const pass of ['curl_flat', 'stick', 'mesh', 'smash', 'slant_flat', 'four_verts']) for (let seed = 1; seed <= 5; seed++) {
  const formation = FORMATION_BY_ID.gun_doubles_11;
  go(`${pass} ${seed}`, { offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[pass], label: pass },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1, pressure: null, zoneStyle: 'spot', label: 'o31' },
    los: 35, ballY: 26.65, firstDownX: 45, seed });
}
for (const pass of ['bubble_screen', 'rb_slip_screen', 'tunnel_screen', 'wide_now_screen', 'four_verts', 'y_cross', 'flood', 'pa_shot', 'pa_flood'])
  for (let seed = 1; seed <= (pass.includes('screen') ? 10 : 5); seed++) {
    const deep = !pass.includes('screen'), formation = deep ? FORMATION_BY_ID.gun_doubles_11 : FORMATION_BY_ID.gun_trips_11;
    go(`${pass}#3 ${seed}`, { offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: deep ? PASS_BY_ID[pass] : SCREEN_BY_ID[pass], label: pass },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: pass.startsWith('pa_') ? COVERAGE_BY_ID.cover1 : deep ? COVERAGE_BY_ID.cover2 : seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1,
        pressure: null, zoneStyle: 'spot', label: 'scr' },
      los: 35, ballY: 26.65, firstDownX: 45, seed });
  }
const byLab: Record<string, Record<string, [number, number]>> = {};
for (const e of ACC.__log) { if (e.src !== 'behaviour' || (e.g !== 'zone' && e.g !== 'man')) continue;
  const m = label.get(e.who); let lab = 'unknown';
  if (m) { let best = Infinity; for (const [t, l] of m) { const d = Math.abs(t - e.t); if (d < best) { best = d; lab = l; } } }
  ((byLab[e.g] ??= {})[lab] ??= [0, 0])[0]++; }
{ (globalThis as any).__shown = 0; const c: Record<string, number> = {}; const dgs: number[] = [];
  for (const e of ACC.__log) { if (e.src !== 'behaviour') continue; const h = DBG.get(e.who); if (!h) continue;
    const t = +e.t.toFixed(3), cur = h.get(t), prev = h.get(+(t - 0.05).toFixed(3)); if (!cur) continue;
    const k = !prev ? 'break started' : prev.top !== cur.top ? 'over-the-top flip' : prev.out !== cur.out ? 'outward flip' : cur.dg < cur.contact * 1.5 ? 'at the goal (dg < 1.5 contact)' : 'other';
    c[k] = (c[k] ?? 0) + 1; dgs.push(cur.dg);
    if (k === 'other' && (globalThis as any).__shown++ < 6) { const r = (q: any) => `goal(${q.goal.x.toFixed(1)},${q.goal.y.toFixed(1)}) gv(${q.gv.x.toFixed(1)},${q.gv.y.toFixed(1)}) pos(${q.pos.x.toFixed(1)},${q.pos.y.toFixed(1)}) vel(${q.vel.x.toFixed(1)},${q.vel.y.toFixed(1)}) req(${q.req.x.toFixed(1)},${q.req.y.toFixed(1)}) ${q.via} ${q.R}`;
      console.log(`  ${e.who.slot} t ${t}: prev ${r(prev)}\n      cur  ${r(cur)}`); for (const dt of [0.05, 0.1, 0.15, 0.2]) { const n = h.get(+(t + dt).toFixed(3)); if (n) console.log(`      +${dt} ${r(n)}`); } } }
  console.log('break reversals by cause:', JSON.stringify(c), 'goal distance p50', dgs.sort((p, q) => p - q)[Math.floor(dgs.length / 2)]?.toFixed(2)); }
{ const c: Record<string, number> = {};
  for (const e of ACC.__log) { if (e.src !== 'behaviour') continue; const h = DC.get(e.who); if (!h) continue;
    const t = +e.t.toFixed(3), cur = h.get(t), prev = h.get(+(t - 0.05).toFixed(3)); if (!cur) continue;
    const k = !prev ? 'entered the carry' : prev.deep !== cur.deep ? 'deepest switched' : prev.n !== cur.n ? 'vertical count changed' : prev.turn !== cur.turn ? 'turn-run toggled' : prev.keyAim !== cur.keyAim ? 'key aim toggled' : Math.abs(cur.ty - prev.ty) > 1 ? 'ty jump > 1 yd' : 'other';
    c[k] = (c[k] ?? 0) + 1;
    if (k === 'other' && ((globalThis as any).__dshown = ((globalThis as any).__dshown ?? 0) + 1) <= 5) {
      const req = (tt: number) => { const it = e.who.__reqs?.get(+tt.toFixed(3)); return it ? `(${it.x.toFixed(1)},${it.y.toFixed(1)})` : '?'; };
      const f = (q: any, tt: number) => `tgt(${q.tx.toFixed(1)},${q.ty.toFixed(1)}) pos(${q.pos.x.toFixed(1)},${q.pos.y.toFixed(1)}) rcv(${q.dp.x.toFixed(1)},${q.dp.y.toFixed(1)}) rv(${q.dv.x.toFixed(1)},${q.dv.y.toFixed(1)}) req${req(tt)} turn ${q.turn}`;
      console.log(`  ${e.who.slot} t ${t}: prev ${f(prev, t - 0.05)}\n     cur ${f(cur, t)}`);
      for (const dt of [0.05, 0.1, 0.15]) { const nn = h.get(+(t + dt).toFixed(3)); if (nn) console.log(`     +${dt} ${f(nn, t + dt)}`); } } }
  console.log('deep-carry reversals by cause:', JSON.stringify(c)); }
for (const g of ['zone', 'man']) { console.log(`${g} behaviour reversals by phase:technique at the re-aim:`);
  for (const [l, v] of Object.entries(byLab[g] ?? {}).sort((a, b) => b[1][0] - a[1][0]).slice(0, 14)) console.log(`  ${l.padEnd(34)} ${v[0]}`); }
for (const g of ['zone', 'man']) {
  const G = ACC[g]; if (!G) continue;
  console.log(`${g}: moving ${G.moving.toFixed(0)} s, re-aims ${G.reaims} (${(G.reaims / G.moving).toFixed(3)}/s), reversed ${G.reversed} (${(G.reversed / G.moving).toFixed(4)}/s)`);
  for (const [src, S] of Object.entries(G.src as Record<string, any>).sort((a: any, b: any) => b[1].n - a[1].n))
    console.log(`  ${src.padEnd(14)} re-aims ${String(S.n).padStart(5)} (${(S.n / G.reaims * 100).toFixed(1)}%)  reversed ${String(S.reversed).padStart(4)} (${(S.reversed / G.moving).toFixed(4)}/s)`);
}
