/** Lead/wrap puller probe (power, counter): does the lead block anyone, a
 * backer, before the back crosses the line; does he lead the back (outside
 * the kick when the kick is a log); how often his man changes; outcomes.
 * Every play runs to its end (phase end, or PlaySim's 25 s cap, whistled as
 * PlaySim.run does). Same code for every arm; true positions (the probe is
 * the observer, not a player).
 * Per play:
 * - geo: kick geometry from true positions at the kicker's first contact
 *   with his installed man (engagement between them, or bodies within
 *   r+r+.1): 'log' if the kicker's center is outside the man's, 'out'
 *   (kick-out) otherwise, 'none' if they never touch. kickOff0 / 3 are the
 *   kicker-man lateral (+ = kicker outside) at that contact and .3 s on;
 *   geo3 is the settled relation (log: more than .25 yd outside .3 s on).
 * - cornerVsKick: the lead's turn-up corner (last pull waypoint) minus the
 *   kicker, laterally (+ outside), when the lead leaves his pull path or at
 *   the carrier's cross, whichever is first. upVsKick: the lead minus the
 *   kicker when the lead first reaches the line (his turn-up), or at the
 *   cross if earlier. leadVsKick / backVsKick: at the cross.
 * - switches: changes of the lead's man (plan.target, consecutive repeats
 *   collapsed, null skipped); aba: changes back to a man he had held before;
 *   dbTargeted / dbBlocked: a DB was ever his man / ever engaged by him.
 * usage: node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/gap/leadprobe.ts OUT.jsonl [seeds] */
import { writeFileSync } from 'node:fs';
import { RunBlocker, playSideSign } from '../../../src/sim/behaviors/blocking.js';
import { makeSim, rosters, LOOK_SPECS } from '../zone-lab/lab.js';
import type { Agent } from '../../../src/sim/agent.js';
const [out = 'out/gs/lead.jsonl', seedsS = '2,71001'] = process.argv.slice(2);
const R = rosters(), r2 = (x: number) => Math.round(x * 100) / 100;
const DB = /^(CB|S|FS|SS|NB|DB)/, BACKER = /^(LB|S|FS|SS|NB)/, MAX_T = 25;
const rows: string[] = [];
for (const seed of seedsS.split(',').map(Number)) for (const concept of ['power', 'counter']) for (const formation of ['i_pro_21', 'ace_12'])
for (const dir of ['strong', 'weak'] as const) for (const [look] of LOOK_SPECS) {
  const id = [concept, dir, formation, look, 'pair11', seed].join('/');
  let sim;
  try { sim = makeSim({ concept, dir, formation, look, roster: 'pair11', seed } as never, R); } catch { continue; }
  const ps = playSideSign(sim, sim.offCall.run!), ad = sim.attackDir('O');
  const lead = sim.offense.find(o => o.behavior instanceof RunBlocker && (o.behavior as RunBlocker).plan.kind === 'pull'
    && (o.behavior as RunBlocker).plan.pullRole === 'lead');
  if (!lead) continue;
  const lb = lead.behavior as RunBlocker, path = lb.plan.pullPath!;
  const kicker = sim.offense.find(o => o.behavior instanceof RunBlocker && (o.behavior as RunBlocker).plan.pullRole === 'kick' && o !== lead);
  const kman: Agent | null = kicker ? (kicker.behavior as RunBlocker).plan.target : null;
  const lat = (p: { y: number }, q: { y: number }) => r2((p.y - q.y) * ps);
  let first: { slot: string; t: number } | null = null, cross: number | null = null, leadAtCross: number | null = null;
  let leadVsKick: number | null = null, backVsKick: number | null = null, cornerVsKick: number | null = null, upVsKick: number | null = null;
  let kickT: number | null = null, kickOff0: number | null = null, kickOff3: number | null = null;
  let pathDone: number | null = null, live8 = false;
  const depth: Record<string, number | null> = { '1.4': null, '1.8': null, '2.2': null };
  const seq: Agent[] = [], seqT: string[] = [];
  let switches = 0, switchesPreCross = 0, aba = 0, dbTargeted = false, dbBlocked = false, lastEng: Agent | null = null;
  const note = (tg: Agent | null) => {
    if (!tg || seq.at(-1) === tg) return;
    if (seq.length) { switches++; if (cross === null) switchesPreCross++; if (seq.includes(tg)) aba++; }
    seq.push(tg); seqT.push(`${tg.slot}@${r2(sim.t)}`);
    if (DB.test(tg.slot)) dbTargeted = true;
  };
  note(lb.plan.target);
  while (sim.phase === 'live' && sim.t < MAX_T) {
    sim.tick();
    note(lb.plan.target);
    const e = lead.engagement && lead.engagement.blocker === lead ? lead.engagement.defender : null;
    if (e && e !== lastEng && DB.test(e.slot)) dbBlocked = true;
    lastEng = e;
    if (!first && e) first = { slot: e.slot, t: r2(sim.t) };
    if (kicker && kman) {
      const touching = (kicker.engagement && kicker.engagement.blocker === kicker && kicker.engagement.defender === kman)
        || Math.hypot(kicker.pos.x - kman.pos.x, kicker.pos.y - kman.pos.y) <= kicker.profile.radius + kman.profile.radius + .1;
      if (kickT === null && touching) { kickT = r2(sim.t); kickOff0 = lat(kicker.pos, kman.pos); }
      if (kickT !== null && kickOff3 === null && sim.t >= kickT + .3 - 1e-9) kickOff3 = lat(kicker.pos, kman.pos);
    }
    const c = sim.carrier;
    const crossing = cross === null && c && c.team === 'O' && c !== sim.qb && (c.pos.x - sim.los) * ad >= 0;
    if (pathDone === null && ((lb as any).pullIdx >= path.length || lead.engagement || crossing)) {
      pathDone = r2(sim.t);
      if (kicker) cornerVsKick = lat(path.at(-1)!, kicker.pos);
    }
    if (upVsKick === null && kicker && ((lead.pos.x - sim.los) * ad >= 0 || crossing)) upVsKick = lat(lead.pos, kicker.pos);
    if (crossing) {
      cross = r2(sim.t); leadAtCross = lat(lead.pos, c!.pos);
      if (kicker) { leadVsKick = lat(lead.pos, kicker.pos); backVsKick = lat(c!.pos, kicker.pos); }
    }
    for (const k of Object.keys(depth)) if (depth[k] === null && sim.t >= Number(k) - 1e-9) depth[k] = r2((lead.pos.x - sim.los) * ad);
    if (sim.t >= 8 - 1e-9 && sim.t < 8 + sim.dt - 1e-9) live8 = sim.phase === 'live';
  }
  if (sim.phase === 'live') { const c = sim.carrier ?? sim.qb; sim.whistle('timeout', c.pos); }
  const res = sim.buildResult();
  // What the old 8 s probe reported: 0 for a play still live at 8 s.
  const gain8 = live8 ? 0 : res.offenseYards;
  const rc = sim.carrier && sim.carrier.team === 'O' ? sim.carrier : sim.slot('RB')!;
  const fc = sim.events.find((e: any) => (e.type === 'carrier_contact' && (e.a === rc.idx || e.b === rc.idx))
    || ((e.type === 'tackle_wrap' || e.type === 'hit' || e.type === 'tackle') && e.b === rc.idx)) as any;
  const fcd = fc ? sim.agents[fc.a === rc.idx ? fc.b : fc.a] : null;
  // 'log': the kicker's center outside the man's at first contact; geo3 is
  // the settled relation .3 s on (more than a quarter yard outside).
  const geo = kickT === null ? 'none' : kickOff0! > 0 ? 'log' : 'out';
  const geo3 = kickOff3 === null ? 'none' : kickOff3 > .25 ? 'log' : 'out';
  rows.push(JSON.stringify({ id, concept, formation, dir, look, seed, lead: lead.slot, kicker: kicker?.slot ?? null, kman: kman?.slot ?? null,
    gain: r2(res.offenseYards), gain8: r2(gain8), live8, end: r2(sim.t),
    first, cross, leadAtCross, depth, blockedBeforeCross: !!first && cross !== null && first.t <= cross,
    backerBeforeCross: !!first && cross !== null && first.t <= cross && BACKER.test(first.slot),
    geo, geo3, kickT, kickOff0, kickOff3, pathDone, cornerVsKick, upVsKick, leadVsKick, backVsKick,
    switches, switchesPreCross, aba, dbTargeted, dbBlocked, seq: seqT, wrapLog: lead.tags.has('wrap-log'),
    firstContact: fcd ? fcd.slot : null }));
}
writeFileSync(out, rows.join('\n') + '\n');
console.log(out, rows.length);
