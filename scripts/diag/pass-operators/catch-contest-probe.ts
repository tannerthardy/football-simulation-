// C14 (passive): what the catch code does with the defender at the catch point. On the matched panel
// (out/matched-restage/seed{7,11}.json, SHIFTS dice shifts), at the first catch / miss / drop / pbu / interception by
// or against the target: separation at the throw, every defender within 2.2 yd of the target with his distance, whether
// he faces the ball (catching.ts facingBall: body facing within ~110 deg of the incoming ball, or the 'looking' tag),
// his distance to the ball, his ball skills, the receiver's contestedCatch; the contest quality the code computes for
// the best one (q = proximity x (facing ? 1 : 0.45)) and the resulting PBU chance; then the outcome, and the play's
// pass fouls (sim.penalties) by kind.   node --import tsx scripts/diag/pass-operators/catch-contest-probe.ts out/cc.jsonl
import { readFileSync, writeFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { restoreSetup } from '../saved-play.js';
const out: string[] = []; const shifts = Number(process.env.SHIFTS ?? 4);
const facingBall = (a: any, bv: any) => { if (a.tags.has('looking')) return true; const sp = Math.hypot(bv.x, bv.y) || 1;
  return Math.cos(a.body.facing) * (-bv.x / sp) + Math.sin(a.body.facing) * (-bv.y / sp) > -0.35; };
for (const seed of ['7', '11']) { const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8'));
  plays.forEach((p: any, pi: number) => { if (!p.pass) return; for (let k = 0; k < shifts; k++) { const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); for (let j = 0; j < k; j++) sim.rng.nextU32();
    const dice = sim.dice.bind(sim), made = new Set<string>();
    sim.dice = (kind: string, a?: any, b?: any) => { const r = dice(kind, a, b), l = `${kind}:${a?.idx}:${b?.idx}`; if (!made.has(l)) { made.add(l); for (let j = 0; j < k; j++) r.nextU32(); } return r; };
    let target: any = null, tsep = NaN, relT = -1, rec: any = null; const touch = new Set<number>();
    const tick = sim.tick.bind(sim);
    sim.tick = () => { const air0 = sim.ball.kind === 'air'; tick();
      if (!air0 && sim.ball.kind === 'air' && relT < 0 && sim.ball.target && !sim.ball.throwaway) { relT = sim.t; target = sim.ball.target;
        tsep = Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - target.pos.x, d.pos.y - target.pos.y))); }
      if (target && !rec && sim.ball.kind === 'air') for (const d of sim.defense) if (Math.hypot(d.pos.x - target.pos.x, d.pos.y - target.pos.y) <= d.profile.radius + target.profile.radius + 0.1) touch.add(d.idx); };
    const snap = (type: string, a: any) => {
      if (target && !rec && sim.ball.kind === 'air') {
        const R = target, bv = sim.ball.flight.vel, bp = sim.ball.flight.pos, air = sim.t - sim.ball.releaseT, range = air > 1.3 ? 2.2 : 1.35;
        const ds = sim.defense.map((d: any) => ({ d, dd: Math.hypot(d.pos.x - R.pos.x, d.pos.y - R.pos.y) })).filter((x: any) => x.dd <= 2.2)
          .map(({ d, dd }: any) => ({ dd: +dd.toFixed(2), face: facingBall(d, bv), look: d.tags.has('looking'), engaged: !!d.engagement,
            dBall: +Math.hypot(d.pos.x - bp.x, d.pos.y - bp.y).toFixed(2), reach: d.profile.reach, bs: d.r('ballSkills'),
            q: Math.max(0, 1 - dd / range) * (facingBall(d, bv) ? 1 : 0.45) }));
        ds.sort((x: any, y: any) => x.dd - y.dd);
        const nd = sim.defense.reduce((b: any, d: any) => Math.hypot(d.pos.x - R.pos.x, d.pos.y - R.pos.y) < Math.hypot(b.pos.x - R.pos.x, b.pos.y - R.pos.y) ? d : b);
        const sp = Math.hypot(bv.x, bv.y) || 1, along = -((nd.pos.x - R.pos.x) * bv.x + (nd.pos.y - R.pos.y) * bv.y) / sp;
        const nearest = { dd: +Math.hypot(nd.pos.x - R.pos.x, nd.pos.y - R.pos.y).toFixed(2), pos: along > 0.5 ? 'front' : along < -0.5 ? 'behind' : 'level', face: facingBall(nd, bv), early: touch.has(nd.idx) };
        rec = { type, by: a === R ? 'R' : a?.team === 'D' ? 'D' : 'other', air: +air.toFixed(2), range, cc: R.r('contestedCatch'), hands: R.r('hands'),
          ballToR: +Math.hypot(bp.x - R.pos.x, bp.y - R.pos.y).toFixed(2), z: +bp.z.toFixed(2), ds, nearest };
      } };
    const evf = sim.event.bind(sim);
    sim.event = (type: string, a?: any, b?: any, note?: any) => { if (['miss', 'drop', 'pbu', 'deflection'].includes(type)) snap(type, a); return evf(type, a, b, note); };
    const pos = sim.possess.bind(sim);
    sim.possess = (a: any, how: any, ...rest: any[]) => { if (how === 'catch' || how === 'interception') snap(how, a); return pos(a, how, ...rest); };
    sim.run(); if (!target || !rec) continue;
    const fouls: Record<string, number> = {}; for (const f of sim.penalties ?? []) if (['dpi', 'opi', 'defensive_holding', 'illegal_contact', 'holding'].includes(f.kind)) fouls[f.kind] = (fouls[f.kind] ?? 0) + 1;
    out.push(JSON.stringify({ seed, pi, k, arm: process.env.ARM ?? '', evs: sim.events.filter((e: any) => ['catch','miss','drop','pbu','interception','deflection'].includes(e.type)).map((e: any) => e.type + (e.a === target.idx ? '@R' : sim.agents[e.a]?.team === 'D' ? '@D' : '@O')), tsep: +tsep.toFixed(2), depth: +(target.pos.x - sim.los).toFixed(1), comp: !!sim.stats.completed && sim.events.some((e: any) => e.type === 'catch' && e.a === target.idx), intc: !!sim.stats.interceptedBy, fouls, ...rec })); } }); }
writeFileSync(process.argv[2], out.join('\n') + '\n'); console.log(out.length);
