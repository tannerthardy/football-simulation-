// MATCH_DECLARE gate (coverage-position spec gap 6): staged pass concepts against the Cover 3 match family, where the
// seam/curl-flat player runs `seamCurlFlat`. Per play: outcome (completion, yards, interception); at the throw, for
// each seam/curl-flat defender, his distance to the target and whether he was moving away from the catch point
// (Defense's L3: velocity component away from the ball's aim point > 1 yd/s); and the time his rule first committed.
// Run once with MATCH_DECLARE unset and once with MATCH_DECLARE=1.
//   node --import tsx scripts/diag/coverage/match-declare.mts [seeds] [out.json]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 2);
const outPath = process.argv[3] ?? 'out/diag/coverage/match-declare.json';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const COVS = (process.env.COVS ?? 'cover3_match,cover3_seam,cover3_buzz,cover9').split(',');
const RULES = new Set((process.env.RULES ?? 'c3_curl_flat,c3_seam').split(','));
const rows: any[] = [];
for (const concept of (process.env.CONCEPTS?.split(',') ?? Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id))))
  for (const coverage of COVS) for (const formation of (process.env.FORMS?.split(',') ?? ['gun_doubles_11', 'gun_trips_11']))
    for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
      let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
      let at: any[] | null = null;
      const tick = sim.tick.bind(sim);
      sim.tick = () => {
        tick();
        if (at || sim.throwAt < 0 || sim.ball.kind !== 'air') return;
        const aim = sim.ball.intended ?? null;
        const tgt = sim.offense.find((r: any) => r.player.id === sim.stats.target);
        at = [];
        for (const d of sim.defense) {
          const b = d.behavior;
          if (!b || !RULES.has(b.rule)) continue;
          const p = aim ?? tgt?.pos; if (!p) continue;
          const dx = p.x - d.pos.x, dy = p.y - d.pos.y, n = Math.hypot(dx, dy) || 1;
          const toward = (d.vel.x * dx + d.vel.y * dy) / n;
          at.push({ rule: b.rule, toTgt: tgt ? Math.hypot(tgt.pos.x - d.pos.x, tgt.pos.y - d.pos.y) : null, away: toward < -1, near: n < 8 });
        }
      };
      const res = sim.run();
      const s = res.stats;
      const tg = sim.offense.find((r: any) => r.player.id === s.target);
      rows.push({ concept, coverage, formation, seed, flip, tgt: tg?.slot ?? null, num: tg ? Object.entries(sim.offAlign.numbering).find(([, v]) => v === tg.slot)?.[0] ?? null : null, att: !!s.attempted, comp: !!s.completed, int: !!s.interceptedBy,
        yards: res.yards, d: at ?? [] });
    }
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(rows));
const att = rows.filter(r => r.att), ds = rows.flatMap(r => r.d), near = ds.filter((q: any) => q.near);
const avg = (a: number[]) => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(3) : '-';
console.log(JSON.stringify({ MATCH_DECLARE: process.env.MATCH_DECLARE ?? '-', plays: rows.length, att: att.length,
  comp: avg(att.map(r => +r.comp)), ypa: avg(att.map(r => r.yards)), ints: att.filter(r => r.int).length,
  seamFlatAtThrow: ds.length, awayWhenNear: avg(near.map((q: any) => +q.away)), nearN: near.length,
  toTarget: avg(ds.filter((q: any) => q.toTgt != null).map((q: any) => q.toTgt)) }));
