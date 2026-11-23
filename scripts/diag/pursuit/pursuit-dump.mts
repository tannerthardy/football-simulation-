// Pursuit operator, sim side (2026-11-23). Every completion: carrier and defender tracks at 0.1 s from the catch to the
// end of the play, normalised to +x downfield, in the same row format as pursuit-dump-nfl.py. Engine events are kept
// only to validate the proximity proxy, never in the comparison.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { writeFileSync } = await import('node:fs');
const SEEDS = Number(process.argv[2] ?? 3), OUT = process.argv[3];
const COVS = (process.env.COVS ?? 'cover0,cover1,cover2man,cover2,cover3,cover4,cover6,tampa2').split(',');
const MAN = new Set(['cover0', 'cover1', 'cover2man']);
const r2 = (v: number) => Math.round(v * 100) / 100;
const out: any[] = [];
for (const cov of COVS) for (const concept of Object.keys(PASS_BY_ID)) for (const formation of ['gun_doubles_11', 'gun_trips_11'])
  for (let seed = 1; seed <= SEEDS; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage: cov, concept, seed, roster: seed, formation, flip })); } catch { continue; }
    const dir = sim.attackDir(sim.offense[0].team), los = sim.los;
    const P = (p: any) => [r2((p.x - los) * dir), r2(p.y)], V = (v: any) => [r2(v.x * dir), r2(v.y)];
    let C: any = null, tc = -1, next = 0; const car: any[] = [], defs: Record<string, any[]> = {};
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); const bc = sim.ball.kind === 'held' ? sim.ball.carrier : null;
      if (!C && bc && bc.team === sim.offense[0].team && bc !== sim.qb) { C = bc; tc = sim.t; next = tc; }
      if (C && sim.t >= next - 1e-9) { next += 0.1; const t = r2(sim.t - tc);
        car.push([t, ...P(C.pos), ...V(C.vel)]);
        for (const d of sim.defense) (defs[d.slot] ??= []).push([t, ...P(d.pos), ...V(d.vel), r2(Math.atan2(Math.sin(d.body.facing), Math.cos(d.body.facing) * dir))]); } };
    let r: any; try { r = sim.run(); } catch { continue; }
    if (!C || !sim.stats.completed || car.length < 2) continue;
    const ev = sim.events.filter((e: any) => e.t >= tc - 1e-6 && /tackle|missed|broken|hit|carrier_contact|out_of_bounds|touchdown|fall/.test(e.type))
      .map((e: any) => [r2(e.t - tc), e.type, e.a != null ? sim.agents[e.a]?.slot : null, e.b != null ? sim.agents[e.b]?.slot : null]);
    const end = sim.events.some((e: any) => e.type === 'touchdown') ? 'td' : sim.events.some((e: any) => e.type === 'out_of_bounds') ? 'oob' : sim.events.some((e: any) => e.type === 'tackle') ? 'tackle' : 'other';
    out.push({ src: 'sim', key: [cov, concept, formation, seed, flip], cov, man: MAN.has(cov), air: r2(sim.stats.airYards ?? 0), end, car, defs, ev,
      radius: { car: C.profile.radius, def: sim.defense[0].profile.radius } });
  }
writeFileSync(OUT, JSON.stringify(out)); console.log('rows', out.length);
