// HALF_OWN gate (coverage-position spec gap 3): staged two-vertical concepts against half-field and middle-third
// safeties. Per play: the outcome (completion, yards, interception, air yards, deep = catch point 15+ yd) and, at the
// throw, each unruled deep_half/deep_mid safety's lateral miss from the midpoint of the two deepest verticals in his
// band (true positions) and his depth over the deepest. Run once with HALF_OWN unset and once with HALF_OWN=1.
//   node --import tsx scripts/diag/coverage/half-own.mts [seeds] [out.json]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 4);
const outPath = process.argv[3] ?? 'out/diag/coverage/half-own.json';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { ZoneCoverage } = await import(`${W}/src/sim/behaviors/defense.ts`);
const CONCEPTS = (process.env.CONCEPTS ?? 'four_verts,verts_hitch,dagger,smash,y_cross').split(',');
const COVS = (process.env.COVS ?? 'cover2,cover2_match,tampa2,cover1,cover3,cover6,cover9,cover2man').split(',');
const OWN = new Set(['deep_half_s', 'deep_half_w', 'deep_mid']);
const rows: any[] = [];
for (const concept of CONCEPTS) for (const coverage of COVS) for (const formation of ['gun_doubles_11', 'gun_trips_11'])
  for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
    const dir = sim.attackDir(sim.offense[0].team);
    let at: any[] | null = null;
    const lastVy = new Map<any, number>(); let flips = 0, secs = 0;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      // Dither: a half/middle safety's lateral velocity reversing (|vy| > 0.5 yd/s both sides) before the throw.
      if (sim.throwAt < 0 && sim.t > 0) for (const d of sim.defense) {
        const b = d.behavior;
        if (!(b instanceof ZoneCoverage) || !OWN.has(b.zone)) continue;
        secs += sim.dt ?? 1 / 30;
        const p = lastVy.get(d);
        if (Math.abs(d.vel.y) > 0.5) { if (p !== undefined && Math.sign(p) !== Math.sign(d.vel.y)) flips++; lastVy.set(d, d.vel.y); }
      }
      if (at || sim.throwAt < 0) return;
      at = [];
      for (const d of sim.defense) {
        const b = d.behavior;
        if (!(b instanceof ZoneCoverage) || !OWN.has(b.zone)) continue;
        const band = (b as any).band as [number, number];
        const v = sim.offense.filter((r: any) => r !== sim.qb && (r.pos.x - sim.los) * dir > 7 && r.pos.y >= band[0] && r.pos.y <= band[1])
          .sort((p: any, q: any) => (q.pos.x - p.pos.x) * dir);
        if (!v.length) continue;
        const mid = v.length >= 2 ? (v[0].pos.y + v[1].pos.y) / 2 : v[0].pos.y;
        at.push({ zone: b.zone, n: v.length, miss: Math.abs(d.pos.y - mid), over: (d.pos.x - v[0].pos.x) * dir });
      }
    };
    const res = sim.run();
    const s = res.stats;
    rows.push({ concept, coverage, formation, seed, flip, att: !!s.attempted, comp: !!s.completed, int: !!s.interceptedBy,
      flips, secs, yards: res.yards, air: s.airYards ?? null, deep: s.attempted && (s.airYards ?? 0) >= 15, safeties: at ?? [] });
  }
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(rows));
const att = rows.filter(r => r.att), deep = att.filter(r => r.deep), two = rows.flatMap(r => r.safeties).filter((q: any) => q.n >= 2);
const avg = (a: number[]) => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : '-';
console.log(JSON.stringify({ HALF_OWN: process.env.HALF_OWN ?? '-', plays: rows.length, att: att.length,
  comp: avg(att.map(r => +r.comp)), ypa: avg(att.map(r => r.yards)), ints: att.filter(r => r.int).length,
  deepAtt: deep.length, deepComp: avg(deep.map(r => +r.comp)), deepYpa: avg(deep.map(r => r.yards)),
  twoVertMiss: avg(two.map((q: any) => q.miss)), twoVertOver: avg(two.map((q: any) => q.over)), twoVertN: two.length,
  flipsPerSafetySec: (rows.reduce((x, r) => x + r.flips, 0) / Math.max(1e-9, rows.reduce((x, r) => x + r.secs, 0))).toFixed(3) }));
