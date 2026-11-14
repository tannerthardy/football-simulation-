/** Underneath-defender audit (Defense, 2026-11-11; report only). League-sampled games
 * (leagueSample, as sim-export). For each completion, every unengaged underneath defender
 * (LB / NB / DB slot, or a non-deep zone job) within 6 yd of the catcher at arrival and over
 * him (2+ yd deeper) 0.6 s before arrival: at -1.0 s, -0.6 s and the release, his technique
 * label, job, rule; his requested and achieved velocity toward the catcher; the catcher's
 * number (#1/#2/#3 by the offence's alignment table: grading only, the defender never sees it)
 * and route class from true geometry at the release; and the item of the coverage-rule
 * audit (docs/reviews/2026-11-11-coverage-rule-audit.md) his situation falls under.
 * usage: node --import tsx scripts/diag/defense-yards/underaudit.mts <out.jsonl> [games] [seed] */
import { writeFileSync } from 'node:fs';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { COVERAGE_BY_ID } from '../../../src/playbook/defense.js';
import { isDeepZone } from '../../../src/playbook/alignment.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { facingTechnique } from '../../../src/sim/coverage/orientation.js';

const [out = 'out/underaudit.jsonl', gamesArg = '16', seedArg = '101'] = process.argv.slice(2);
const games = Number(gamesArg), seed0 = Number(seedArg);
const UNDER = (slot: string) => /^(LB|NB|DB)/.test(slot);
type Snap = { t: number; label: string | null; job: string | null; kind: string | null; zone: string | null; rule: string | null;
  pos: { x: number; y: number }; vel: { x: number; y: number }; req: { x: number; y: number } | null; eng: boolean };
const S = new WeakMap<object, any>(); const rows: any[] = [];
const tick0 = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: any) {
  tick0.call(this); const sim = this;
  let s = S.get(sim); if (!s) { s = { hist: new Map<object, Snap[]>(), off: [] as any[], rel: -1, done: false }; S.set(sim, s); }
  if (s.done || sim.offCall?.kind === 'run') return;
  for (const d of sim.defense) {
    const b: any = d.behavior, cmd = sim.cmds[d.idx], h = s.hist.get(d) ?? [];
    h.push({ t: sim.t, label: cmd ? facingTechnique(cmd)?.label ?? null : null, job: b?.job ?? null, kind: b?.kind ?? null,
      zone: b?.recordedZone?.() ?? b?.zone ?? null, rule: b?.rule ?? null, pos: { ...d.pos }, vel: { ...d.vel }, req: cmd?.vel ? { ...cmd.vel } : null, eng: !!d.engagement });
    if (h.length > 40) h.shift(); s.hist.set(d, h);
  }
  s.off.push({ t: sim.t, o: sim.offense.map((o: any) => ({ o, pos: { ...o.pos }, vel: { ...o.vel } })) }); if (s.off.length > 40) s.off.shift();
  if (s.rel < 0 && sim.ball?.kind === 'air') s.rel = sim.t;
  const c = sim.carrier;
  if (s.rel < 0 || !c || c.team !== 'O' || c === sim.qb || sim.ball?.kind !== 'held') return;
  s.done = true;
  const at = (h: any[], t: number) => h.reduce((p, q) => Math.abs(q.t - t) < Math.abs(p.t - t) ? q : p);
  const ca = (t: number) => at(s.off, t).o.find((x: any) => x.o === c);
  const cov = sim.defCall.coverage, fam = (COVERAGE_BY_ID as any)[cov.id]?.family ?? cov.id;
  const num = Object.entries(sim.offAlign.numbering).find(([, slot]) => slot === c.slot)?.[0] ?? (sim.offAlign.spots[c.slot]?.backfield ? 'back' : '?');
  const cr = ca(s.rel), los = sim.los, side = Math.sign(cr.pos.y - sim.ballY) || 1;
  const route = cr.vel.x > 3 && Math.abs(cr.vel.y) < cr.vel.x ? 'vertical' : Math.hypot(cr.vel.x, cr.vel.y) < 1.5 ? 'stop'
    : side * cr.vel.y > 0 ? (cr.pos.x - los < 4 ? 'flat' : 'out') : (cr.vel.x < -0.5 ? 'comeback' : 'in');
  for (const d of sim.defense) {
    const h = s.hist.get(d); if (!h) continue;
    const now = h[h.length - 1], e6 = at(h, sim.t - 0.6), e10 = at(h, sim.t - 1.0), er = at(h, s.rel);
    const deep = e6.zone ? isDeepZone(e6.zone) : false;
    if (!(UNDER(d.slot) || (e6.kind === 'zone' && !deep))) continue;
    if (Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) > 6 || d.engagement) continue;
    const c6 = ca(sim.t - 0.6); if (e6.pos.x - c6.pos.x <= 2) continue;
    const tw = (sn: Snap, t: number, v: { x: number; y: number } | null) => { if (!v) return null; const cp = ca(t).pos, dx = cp.x - sn.pos.x, dy = cp.y - sn.pos.y, l = Math.hypot(dx, dy) || 1; return +((v.x * dx + v.y * dy) / l).toFixed(2); };
    const job = (er.job ?? '') as string, lab = er.label ?? '';
    const item = job.startsWith('man:') ? '6 man (CUSHION_NEED)'
      : (num.endsWith('3') || num === 'back' || num === 'B') && (route === 'flat' || cr.pos.x - los < 5) ? '5 #3/back to the flat'
      : num.endsWith('2') && (route === 'out' || route === 'vertical') && cr.pos.x - los >= 8 ? '2 #2 outside break released'
      : /lane|zone-settle|zone-landmark|spot-settle|hook-stem-read/.test(lab) ? '8 underneath ownership re-picked'
      : /carry|wall/.test(lab) ? 'carry/wall' : 'other';
    rows.push({ fam, cov: cov.id, slot: d.slot, rule: er.rule, catcherNum: num, route, catchDepth: +(c.pos.x - los).toFixed(1), item,
      ...Object.fromEntries([['m10', e10, sim.t - 1.0], ['m06', e6, sim.t - 0.6], ['rel', er, s.rel]].map(([k, sn, t]: any) =>
        [k, { label: sn.label, job: sn.job, kind: sn.kind, spd: +Math.hypot(sn.vel.x, sn.vel.y).toFixed(2), tw: tw(sn, t, sn.vel), req: sn.req ? +Math.hypot(sn.req.x, sn.req.y).toFixed(2) : null, reqTw: tw(sn, t, sn.req) }])) });
  }
};
const rng = new Rng(seed0); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed0 + g), leagueSample(away, seed0 + g), { seed: seed0 + g, record: false });
writeFileSync(out, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
console.log(out, rows.length);
