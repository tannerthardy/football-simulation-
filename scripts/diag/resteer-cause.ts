// TKL-2 Move 6 diagnostic (no behavior change): split pursuer re-steers by cause on a frozen case set.
// Aim-bearing change over 0.2 s is decomposed by substitution into
//   geometry (he moved; same aim point) -> intercept-time switch (old forecast, new chosen time)
//   -> forecast change (new picture) -> leverage change, plus target switches.
// Final-command and body re-steers are attributed to the first chase layer that turned, including the
// close gather; each window is also split by the pursuer's speed relative to the runner.
// Uses only the selected-actor command trace. The approach-choice split ('gate'/'far'/'original'/
// 'arrival'/'brake') needs an uncommitted hook, globalThis.__approachHook?.(a, pick), in chooseApproach;
// without it those windows read 'none'. See docs/reviews/pursuit-resteer-cause.md.
//   node --import tsx scripts/diag/resteer-cause.ts setups.bin frozen-cases.json out.json
import { readFileSync, writeFileSync } from 'node:fs';
import { deserialize } from 'node:v8';
import { PlaySim } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
const [setupsPath, casesPath, out] = process.argv.slice(2);
const G = globalThis as any;
const plays = deserialize(readFileSync(setupsPath)) as any[];
const byKey = new Map(plays.map(p => [`${p.seed}:${p.index + 1}`, p]));
const cases = JSON.parse(readFileSync(casesPath, 'utf8')).episodes as any[];
const W = 53.333, BIG = 15;
const bear = (from: any, to: any) => Math.atan2(to.y - from.y, to.x - from.x);
const ang = (v: any) => v && Math.hypot(v.x, v.y) > 0.3 ? Math.atan2(v.y, v.x) : null;
const sd = (a: number, b: number) => (((a - b + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) * 180 / Math.PI; // signed a-b
const dA = (a: number | null, b: number | null) => a === null || b === null ? null : Math.abs(sd(a, b));
const band = (d: number) => d < 3 ? '<3' : d < 6 ? '3-6' : d < 10 ? '6-10' : '10-15';
const path = (ip: any) => (t: number) => { const f = ip.forecast, o = ip.observed.pos, V = f.relaxedSpeed, sp = f.initialSpeed, tau = f.relaxationTime;
  const d = V * t - (V - sp) * tau * (1 - Math.exp(-t / tau)); return { x: o.x + f.heading.x * d, y: Math.min(W, Math.max(0, o.y + f.heading.y * d)) }; };
const inc = (m: any, k: string, v = 1) => { m[k] = (m[k] ?? 0) + v; };
const aimN: any = {}, aimAbs: any = {}, cmd: any = {}, body: any = {}, bodyBand: any = {}, cmdBand: any = {};
const ex: Record<string, any[]> = {};
let windows = 0, bodyN = 0; const clos: any = {}, nh: any = {}, bodySpeed: any = {}, win: any = {};
for (const e of cases) {
  const p = byKey.get(`${e.seed}:${e.play}`); if (!p) continue;
  const sim: any = new PlaySim(restoreSetup(p.setup) as any);
  const trace = sim.recordCommands({ actor: { team: 'D', slot: e.slot }, from: Math.max(0, e.t - 3), to: e.t + 0.3 });
  const carrierAt = new Map<number, any>(), choiceAt = new Map<number, string>();
  let actor: any = null;
  G.__approachHook = (a: any, k: string) => { if (a === actor) choiceAt.set(Math.round(sim.t * 1000), k); };
  const tick = sim.tick.bind(sim);
  sim.tick = () => { actor ??= sim.defense.find((d: any) => d.slot === e.slot); const t = sim.t; tick(); const c = sim.carrier;
    carrierAt.set(Math.round(t * 1000), c && c.team === 'O' && sim.ball.kind === 'held' && c.slot !== 'QB' ? { pos: { ...c.pos }, vel: { ...c.vel }, id: c.player.id } : null); };
  try { sim.run(); } catch { continue; }
  const rows = trace.steps.map((s: any) => {
    const key = Math.round(s.stepStart * 1000), c = carrierAt.get(key);
    const pr = s.pursuit ?? [];
    const ch = [...pr].reverse().find((x: any) => x.data.kind === 'chase');
    const ip = [...pr].reverse().find((x: any) => x.data.kind === 'intercept');
    const pos = s.start.body.position;
    const req = (k: string) => ch?.data.requests.find((r: any) => r.stage === k)?.command.vel ?? null;
    const last = ch?.data.requests.at(-1);
    return { t: s.stepStart, c, ok: !!c && !!ch, pos, dist: c ? Math.hypot(c.pos.x - pos.x, c.pos.y - pos.y) : 99,
      bodySp: Math.hypot(s.start.body.velocity.x, s.start.body.velocity.y), target: ch?.target.playerId ?? null,
      mode: `${s.decision?.owner.controller}/${s.decision?.owner.kind}/${ch?.data.planner}/${last?.stage}`,
      los: ch ? bear(pos, { x: ch.data.observed.pos.x, y: ch.data.observed.pos.y + ch.data.offset }) : null,
      cmdSp: (() => { const v = req('approach-and-gather') ?? req('close-gather'); return v ? Math.hypot(v.x, v.y) : null; })(),
      gather: ch?.data.gather ?? 0, choice: choiceAt.get(key) ?? (ch?.data.planner === 'bypassed-close-gather' ? 'bypass' : 'none'),
      ip: ip?.data ?? null, aim: ip ? bear(pos, ip.data.steeringPoint) : null,
      sprint: ang(req('intercept-sprint')), chosen: ang(req('approach-and-gather') ?? req('close-gather') ?? req('held-tackle')),
      around: ang(last?.command.vel), raw: ang(s.decision?.raw.vel), final: ang(s.final?.vel), bodyV: ang(s.endpoint?.body.velocity),
      contact: (s.endpoint?.lastStepContacts ?? []).length > 0, rewrites: s.rewrites.map((r: any) => r.stage).join(',') };
  });
  const at = new Map(rows.map((r: any) => [Math.round(r.t * 1000), r]));
  const cmdCause = new Map<number, string>();
  const compact = (r: any) => ({ t: +r.t.toFixed(2), dist: +r.dist.toFixed(1), mode: r.mode.split('/').slice(0, 1).concat(r.mode.split('/').slice(3)).join('/'),
    sp: +r.bodySp.toFixed(1), runner: +Math.hypot(r.c.vel.x, r.c.vel.y).toFixed(1), gather: +r.gather.toFixed(2), choice: r.choice, ipT: r.ip ? +r.ip.biasedTime.toFixed(2) : null, status: r.ip?.prediction.estimate.status?.slice(0, 9) ?? null,
    deg: Object.fromEntries(['aim', 'chosen', 'final', 'bodyV'].map(k => [k, r[k] === null ? null : Math.round(r[k] * 180 / Math.PI)])) });
  for (const r of rows) {
    const o: any = at.get(Math.round((r.t - 0.2) * 1000));
    if (!o || !r.ok || !o.ok || r.dist < 1.5 || r.dist > 15 || r.bodySp < 2) continue;
    windows++;
    const slow = r.bodySp / Math.max(0.1, Math.hypot(r.c.vel.x, r.c.vel.y)) < 0.8;
    if (slow && r.choice === 'bypass') { const q = at.get(Math.round((r.t - 0.5) * 1000)) as any; if (q) inc(win, q.bodySp - r.bodySp > 1 ? 'slow in gather: slowed >1 yd/s in last 0.5 s' : q.bodySp < r.bodySp - 0.5 ? 'slow in gather: speeding up' : 'slow in gather: already slow'); }
    const closingK = `${slow ? 'slow' : 'not slow'} gather closing ${((o.dist - r.dist) / 0.2) < 1 ? '<1' : ((o.dist - r.dist) / 0.2) < 3 ? '1-3' : '3+'} yd/s`;
    if (r.choice === 'bypass') { inc(clos, closingK + ' | windows'); if ((dA(r.bodyV, o.bodyV) ?? 0) > BIG) inc(clos, closingK + ' | body re-steers'); }
    inc(win, `${slow ? 'slow<0.8' : 'not slow'} | ${r.ip?.prediction.estimate.status ?? r.choice}`);
    const b = band(r.dist);
    const example = (k: string) => { (ex[k] ??= []); if (ex[k].length < 6 && !ex[k].some((x: any) => x.seed === e.seed && x.play === e.play)) ex[k].push({ seed: e.seed, play: e.play, slot: e.slot, cls: e.cls,
      steps: rows.filter((x: any) => x.t >= r.t - 0.31 && x.t <= r.t + 0.01 && Math.round(x.t * 100) % 5 === 0).map(compact) }); };
    // 1. Aim-bearing decomposition.
    let aimCause: string | null = null;
    if (r.ip && o.ip && r.target === o.target) {
      const B0 = o.aim, B1 = bear(r.pos, o.ip.steeringPoint);
      const tOld = r.t + r.ip.biasedTime - o.t;
      const P2 = path(o.ip)(Math.max(0, tOld)); P2.y += o.ip.leverage;
      const P3 = path(r.ip)(r.ip.biasedTime); P3.y += o.ip.leverage;
      const B2 = bear(r.pos, P2), B3 = bear(r.pos, P3), B4 = r.aim;
      const parts: Record<string, number> = { geometry: sd(B1, B0), 'intercept-time switch': sd(B2, B1), 'forecast change': sd(B3, B2), leverage: sd(B4, B3) };
      if (Math.abs(sd(B4, B0)) > BIG) {
        aimCause = Object.entries(parts).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]))[0][0];
        inc(aimN, `${aimCause} | ${b}`); example('aim: ' + aimCause);
        for (const [k, v] of Object.entries(parts)) inc(aimAbs, k, Math.abs(v));
      }
    } else if (r.ip && o.ip && dA(r.aim, o.aim)! > BIG) { aimCause = 'target switch'; inc(aimN, `target switch | ${b}`); }
    // 2. Final-command re-steer, by layer.
    if ((dA(r.final, o.final) ?? 0) > BIG) {
      const gatherOn = Math.max(r.gather, o.gather) > 0 || ['arrival', 'brake'].includes(r.choice) || ['arrival', 'brake'].includes(o.choice);
      const k = r.target !== o.target ? 'target switch'
        : r.mode.split('/').slice(0, 2).join() !== o.mode.split('/').slice(0, 2).join() ? 'controller switch'
        : r.mode !== o.mode ? (r.mode.endsWith('close-gather') ? 'gather: bypass entry' : r.mode.endsWith('around-bodies') && o.mode.endsWith('close-gather') ? 'gather: bypass exit' : 'planner stage switch')
        : aimCause && !(r.gather >= 0.5 && o.gather >= 0.5) && (dA(r.sprint, o.sprint) ?? 0) > BIG ? 'aim: ' + aimCause
        : gatherOn && (dA(r.chosen, o.chosen) ?? 0) > BIG ? (Math.abs(r.gather - o.gather) > 0.25 ? 'gather: blend ramp'
          : r.choice !== o.choice ? `gather: approach choice ${o.choice}->${r.choice}` : 'gather: near-hip tracking')
        : (dA(r.sprint, o.sprint) ?? 0) > BIG ? 'aim: small/other'
        : (dA(r.chosen, o.chosen) ?? 0) > BIG ? 'approach (no gather)'
        : (dA(r.around, o.around) ?? 0) > BIG ? 'around-bodies'
        : (dA(r.raw, o.raw) ?? 0) > BIG ? 'behavior wrapper'
        : 'post-decision rewrite (' + (r.rewrites || o.rewrites || 'none') + ')';
      const kk = k.startsWith('gather: approach choice') ? 'gather: approach choice switch' : k;
      if (kk === 'gather: near-hip tracking' && r.los !== null && o.los !== null) { const dl = Math.abs(sd(r.los, o.los)), dr = Math.abs(sd(sd(r.chosen, r.los) * Math.PI / 180, sd(o.chosen, o.los) * Math.PI / 180) );
        inc(nh, dl > dr ? 'line-of-sight rotation' : 'command angle off the line of sight'); inc(nh, 'sum dLOS', dl); inc(nh, 'sum dRel', dr); inc(nh, 'n'); inc(nh, 'sum bodySp', r.bodySp); inc(nh, 'sum cmdSp', r.cmdSp ?? 0); inc(nh, 'sum runnerSp', Math.hypot(r.c.vel.x, r.c.vel.y)); }
      inc(cmd, kk); inc(cmdBand, `${kk} | ${b}`); cmdCause.set(Math.round(r.t * 1000), kk);
      if (kk.startsWith('gather') || kk.startsWith('aim')) example(kk);
      if (slow && kk === 'gather: near-hip tracking' && !['hold-finished', 'other-finished'].includes(e.cls)) example('slow hip chase (failed episode)');
    }
    // 3. Body re-steer (comparable with NFL 4.9%): the latest command cause within 0.3 s, else the motion layer.
    if ((dA(r.bodyV, o.bodyV) ?? 0) > BIG) {
      bodyN++;
      let k = r.contact || o.contact ? 'contact' : 'motion layer (no command re-steer within 0.3 s)';
      for (let dt = 0; dt <= 0.3001; dt += 0.05) { const c = cmdCause.get(Math.round((r.t - dt) * 1000)); if (c) { k = c; break; } }
      inc(body, k); inc(bodyBand, `${k} | ${b}`);
      inc(bodySpeed, `${slow ? 'slow<0.8' : 'not slow'} | ${k}`);
    }
  }
}
const sortObj = (m: any) => Object.fromEntries(Object.entries(m).sort((x: any, y: any) => y[1] - x[1]));
const res = { clos: sortObj(clos), win: sortObj(win), bodySpeed: sortObj(bodySpeed), nh, windows, bodyResteers: bodyN, bodyShare: bodyN / windows, body: sortObj(body), bodyBand: sortObj(bodyBand), cmd: sortObj(cmd), cmdBand: sortObj(cmdBand),
  aim: sortObj(aimN), aimAbsDegrees: sortObj(aimAbs), examples: ex };
writeFileSync(out, JSON.stringify(res, null, 1));
const { examples, ...summary } = res; console.log(JSON.stringify(summary, null, 1));
