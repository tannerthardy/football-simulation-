/** Blocks that still hold: at the carrier's 5 / 10 yd crossings, every DL (snap within 2 yd of the line):
 * blocked (O player within 1 yd), engaged, and for unengaged-but-blocked: the nearest O's behavior,
 * engaged?, intent speed into the DL, and whether he is behind the DL's facing. Plus mean yards / capped,
 * and every run block started after the ball crossed (new sim.engagements objects): its geometry.
 * The 336-run identical-call lab of #221 (7 run concepts x 4 formations x 6 coverages x n=2, Over front,
 * los 35, left hash, seeds from the cell key; roster Rng(7), strength .55). Flags from the environment.
 * node --import tsx scripts/diag/runblock/holdlab.ts [--n 2] [--runs iz_strong,...] */
import { HASH_LEFT_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import type { DefSlot } from '../../../src/playbook/types.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const n = Number(arg('--n', '2'));
const rng = new Rng(7);
const off = generateTeam(rng, 'O', 'OFF', { strength: .55 }), def = generateTeam(rng, 'D', 'DEF', { strength: .55 });
const runs = arg('--runs', 'iz_strong,oz_strong,duo,power,counter,trap,toss').split(',');
const forms = ['ace_11', 'gun_trips_11', 'i_pro_21', 'ace_12'];
const covs = 'cover1,cover2,cover3,cover4,cover6,cover2man'.split(',');
type Row = { n: number; blocked: number; eng: number; loose: number; behind: number; into: number[]; dlInto: number[]; dlToRunner: number[]; engAge: number[]; kinds: Record<string, number>; behindRunner: number; blockedBehindRunner: number };
const rows: Record<number, Row> = {};
const ys: number[] = [];
const angs = { want: [] as number[], got: [] as number[], beh: {} as Record<string, number> };
const re = { n: 0, first: 0, behind: 0, away: 0, runnerPast: 0, both: 0 };
for (const run of runs) for (const form of forms) for (const cov of covs) {
  const formation = FORMATION_BY_ID[form];
  const personnel = formation.personnel === '21' || formation.personnel === '12' ? 'base43' : 'nickel';
  for (let i = 0; i < n; i++) {
    const seed = [...`${run}|${form}|${cov}|${i}`].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
    const sim = new PlaySim({ offense: pickOffense(off, formation.personnel), defense: pickDefense(def, personnel),
      offCall: { formation, flip: i % 2 === 1, kind: 'run', run: RUN_BY_ID[run], label: run },
      defCall: { personnel, front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, label: cov },
      los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, seed });
    const dir = sim.attackDir('O');
    const dl = sim.defense.filter(d => Math.abs(sim.defAlign.spots[d.slot as DefSlot]!.pos.x - sim.los) < 2);
    const marks = [5, 10]; let mi = 0;
    const tick0 = sim.tick.bind(sim);
    sim.tick = () => {
      tick0();
      const c = sim.carrier;
      if (mi >= marks.length || !c || c.team !== 'O' || c === sim.qb) return;
      const yard = (c.pos.x - sim.los) * dir;
      if (yard < marks[mi]) return;
      const r = rows[marks[mi]] ??= { n: 0, blocked: 0, eng: 0, loose: 0, behind: 0, into: [], dlInto: [], dlToRunner: [], engAge: [], kinds: {}, behindRunner: 0, blockedBehindRunner: 0 };
      for (const d of dl) {
        r.n++;
        const near = sim.offense.filter(o => o !== c).map(o => ({ o, r: Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) })).sort((p, q) => p.r - q.r)[0];
        const blocked = near && near.r <= 1;
        const behindRunner = (d.pos.x - c.pos.x) * dir < 0;
        if (behindRunner) { r.behindRunner++; if (blocked) r.blockedBehindRunner++; }
        if (!blocked) continue;
        r.blocked++;
        if (d.engagement) { r.eng++; r.engAge.push(sim.t - ((d.engagement as any).start ?? (d.engagement as any).t0 ?? sim.t)); const di = sim.intents[d.idx]; if (di) { const ux=c.pos.x-d.pos.x, uy=c.pos.y-d.pos.y, L=Math.hypot(ux,uy); r.dlToRunner.push((di.vel.x*ux+di.vel.y*uy)/L); } continue; }
        r.loose++;
        const o = near.o, nx = (d.pos.x - o.pos.x) / near.r, ny = (d.pos.y - o.pos.y) / near.r;
        const it = sim.intents[o.idx];
        if (it) r.into.push(it.vel.x * nx + it.vel.y * ny);
        const di = sim.intents[d.idx]; if (di) r.dlInto.push(-(di.vel.x * nx + di.vel.y * ny));
        if (Math.cos(d.facing) * -nx + Math.sin(d.facing) * -ny < 0) r.behind++;
        const pk = (o.behavior as any)?.plan?.kind ?? '?'; const bk = Math.cos(d.facing) * -nx + Math.sin(d.facing) * -ny < 0; const tg = (o.behavior as any)?.target; const k = `${o.behavior?.kind ?? '?'}:${pk}:${tg === d ? 'his-man' : tg ? 'other-target' : 'no-target'}${bk ? ':behind' : ':front'}${it && (it.vel.x * nx + it.vel.y * ny) > 1 ? ':INTO' : ''}`; r.kinds[k] = (r.kinds[k] ?? 0) + 1;
      }
      mi++;
    };
    const had = new Set<number>(); const known = new WeakSet<object>();
    const tick1 = sim.tick.bind(sim);
    sim.tick = () => {
      tick1();
      for (const e of sim.engagements) {
        if (known.has(e)) continue; known.add(e);
        const o = e.blocker, d = e.defender; if (!dl.includes(d)) continue;
        const c = sim.carrier; const crossed = c && c.team === 'O' && c !== sim.qb && (c.pos.x - sim.los) * dir > 0;
        if (!crossed) { had.add(d.idx); continue; }
        re.n++; if (!had.has(d.idx)) re.first++; had.add(d.idx);
        const ux = o.pos.x - d.pos.x, uy = o.pos.y - d.pos.y, L = Math.hypot(ux, uy) || 1;
        const behind = Math.cos(d.facing) * ux / L + Math.sin(d.facing) * uy / L < 0;
        const away = (d.vel.x * -ux + d.vel.y * -uy) / L > .5;
        const past = (c!.pos.x - d.pos.x) * dir > 0;
        { const ang = (x: number) => Math.abs(Math.atan2(Math.sin(x), Math.cos(x))) * 180 / Math.PI;
          const toR = Math.atan2(c!.pos.y - d.pos.y, c!.pos.x - d.pos.x), it = sim.intents[d.idx];
          if (it && it.facing !== undefined) angs.want.push(ang(it.facing - toR));
          angs.got.push(ang(d.facing - toR)); const k = d.behavior?.kind ?? '?'; angs.beh[k] = (angs.beh[k] ?? 0) + 1; }
        if (behind) re.behind++; if (away) re.away++; if (past) re.runnerPast++; if (behind && past) re.both++;
      }
    };
    ys.push(sim.run().yards);
  }
}
const q = (v: number[]) => v.length ? [...v].sort((a, b) => a - b)[v.length >> 1].toFixed(2) : '-';
const pct = (a: number, b: number) => `${(100 * a / Math.max(1, b)).toFixed(0)}%`;
console.log(`runs ${ys.length} | mean ${(ys.reduce((a, b) => a + b, 0) / ys.length).toFixed(2)} capped10 ${(ys.reduce((a, b) => a + Math.min(10, b), 0) / ys.length).toFixed(2)} | 10+ ${pct(ys.filter(y => y >= 10).length, ys.length)} 20+ ${pct(ys.filter(y => y >= 20).length, ys.length)}`);
console.log(`  engagements made after the ball crossed: ${re.n} (${pct(re.first, re.n)} on a DL never engaged before) | blocker behind DL facing ${pct(re.behind, re.n)} | DL moving away from blocker >0.5 yd/s ${pct(re.away, re.n)} | runner past the DL ${pct(re.runnerPast, re.n)} | behind and runner past ${pct(re.both, re.n)}`);
console.log(`  at re-engagement, DL facing off the runner direction: requested p50 ${q(angs.want)} deg (n ${angs.want.length}), actual p50 ${q(angs.got)} deg | DL behavior ${JSON.stringify(angs.beh)}`);
for (const [m, r] of Object.entries(rows)) console.log(`  back at ${m} yd: DL ${r.n} | blocked ${pct(r.blocked, r.n)} (engaged ${pct(r.eng, r.n)}, body only ${pct(r.loose, r.n)}) | DL behind runner ${pct(r.behindRunner, r.n)}, of those blocked ${pct(r.blockedBehindRunner, r.behindRunner)} | body-only: blocker behind DL's facing ${pct(r.behind, r.loose)}, blocker request into DL p50 ${q(r.into)} (>1 yd/s ${pct(r.into.filter(v=>v>1).length, r.into.length)}), DL request into blocker p50 ${q(r.dlInto)} (>1 ${pct(r.dlInto.filter(v=>v>1).length, r.dlInto.length)}) | engaged DL request toward runner p50 ${q(r.dlToRunner)} yd/s, age p50 ${q(r.engAge)} s | ${JSON.stringify(r.kinds)}`);
