/** Who stops designed runs on the zone-lab cases, and what had happened to
 * the block on him (lab version of run-attrib.ts: same classes, controlled
 * cases and seeds as the open-field arms). Observation only.
 *
 * node --import tsx scripts/diag/runblock/lab-attrib.ts --out out/run-attrib/LABEL-i.json [lab args] [--shard i/n]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { PlaySim } from '../../../src/sim/playsim.js';
import type { Agent } from '../../../src/sim/agent.js';
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';
import { caseId, LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const out = arg('--out', 'out/run-attrib/lab.json');

interface Track {
  concept: string; scheme: string; front: string; los: number; dir: number; ballY: number;
  handoffT: number | null;
  /** First tick each blocker took each defender as its target, with the plan kind then. */
  assigned: Map<number, Map<number, { t: number; kind: string; role?: string }>>;
  /** First and last tick each (blocker, defender) pair was engaged, by defender. */
  engaged: Map<number, { first: number; last: number; blockers: Set<number> }>;
  contact: { t: number; stopper: number; x: number; y: number; engagedNow: boolean; via: string } | null;
  /** Each shed: defender, blocker, and whether the blocker's body was between him and the ball. */
  sheds: Array<{ t: number; d: number; b: number; why: string; between: number; dBall: number; carrierDepth: number }>;
  /** Every 0.1 s: [t, carrier idx, positions rel LOS/ball in attack frame, engagement pairs [blocker, defender, phi, driveX, driveY]]. */
  film: any[];
  carrierLosT: number | null;
  end: { x: number; y: number } | null;
  plansAtSnap: Array<{ slot: string; kind: string; target: string | null; role?: string }>;
}
const tracks = new WeakMap<PlaySim, Track>();
const done: Array<Track & { sim: PlaySim }> = [];

type AnySim = PlaySim & Record<string, any>;
const original = (PlaySim.prototype as any).tick as (this: PlaySim) => void;
(PlaySim.prototype as any).tick = function (this: AnySim) {
  const run = this.offCall?.kind === 'run' ? this.offCall.run : null;
  if (!run) return original.call(this);
  let tr = tracks.get(this);
  if (!tr) {
    tr = { concept: run.id, scheme: run.scheme, front: this.defCall?.front?.id ?? '?', los: this.los, dir: this.attackDir('O'), ballY: this.ballY,
      handoffT: null, assigned: new Map(), engaged: new Map(), contact: null, sheds: [], film: [], carrierLosT: null, end: null,
      plansAtSnap: (this.offense as Agent[]).filter((a: any) => a.behavior?.plan).map((a: any) => ({ slot: a.slot, kind: a.behavior.plan.kind,
        target: a.behavior.plan.target?.slot ?? null, role: a.behavior.plan.pullRole })) };
    tracks.set(this, tr);
    const ends: Array<{ t: number; b: number; d: number; reason: string }> = (tr as any).ends = [];
    runContactObservers.set(this, (rep, phase, data) => {
      if (phase === 'end') ends.push({ t: this.t, b: rep.blocker.idx, d: rep.defender.idx, reason: String(data.reason ?? '') });
    });
  }
  const nEvents = this.events.length;
  original.call(this);
  const t = this.t;
  for (const a of this.offense as any[]) {
    const plan = a.behavior?.plan;
    if (!plan) continue;
    // A double's backer is owned by the double from the snap, before release.
    const owned: Array<[any, string]> = [];
    if (plan.target) owned.push([plan.target, plan.kind]);
    if (plan.combination?.backer && plan.combination.backer !== plan.target) owned.push([plan.combination.backer, 'combo-backer']);
    for (const [target, kind] of owned) {
      const m = tr.assigned.get(target.idx) ?? new Map();
      if (!m.has(a.idx)) m.set(a.idx, { t, kind, role: plan.pullRole });
      tr.assigned.set(target.idx, m);
    }
  }
  const lb = ((tr as any).lastBlockers ??= new Map<number, Agent[]>());
  for (const e of this.engagements as any[]) lb.set(e.defender.idx, [e.blocker, ...e.helpers]);
  for (const e of this.engagements as any[]) {
    const d = e.defender.idx;
    const rec = tr.engaged.get(d) ?? { first: t, last: t, blockers: new Set<number>() };
    rec.last = t; rec.blockers.add(e.blocker.idx); for (const h of e.helpers) rec.blockers.add(h.idx);
    tr.engaged.set(d, rec);
  }
  const c = this.carrier as Agent | null;
  for (const ev of this.events.slice(nEvents)) {
    if (ev.type === 'handoff' && tr.handoffT === null) tr.handoffT = ev.t;
    if (ev.type === 'shed' && ev.a !== undefined && ev.b !== undefined && c) {
      const d = this.agents[ev.a] as Agent, b = this.agents[ev.b] as Agent;
      const tb = { x: b.pos.x - d.pos.x, y: b.pos.y - d.pos.y }, tc = { x: c.pos.x - d.pos.x, y: c.pos.y - d.pos.y };
      const lb = Math.hypot(tb.x, tb.y) || 1, lc = Math.hypot(tc.x, tc.y) || 1;
      tr.sheds.push({ t: ev.t, d: ev.a, b: ev.b, why: ev.note ?? '', between: (tb.x * tc.x + tb.y * tc.y) / (lb * lc), dBall: lc, carrierDepth: (c.pos.x - tr.los) * tr.dir });
    }
    if (tr.contact || !c || c.team !== 'O' || c === this.qb) continue;
    let stopper: number | undefined;
    if (ev.type === 'carrier_contact' && ev.a === c.idx) stopper = ev.b;
    if ((ev.type === 'tackle_wrap' || ev.type === 'hit') && ev.b === c.idx) stopper = ev.a;
    if (stopper === undefined) continue;
    const engagedNow = (this.engagements as any[]).some((e) => e.defender.idx === stopper);
    const P = (a: Agent) => ({ x: +((a.pos.x - tr.los) * tr.dir).toFixed(2), y: +((a.pos.y - tr.ballY) * tr.dir).toFixed(2) });
    const blockers = (this.engagements as any[]).filter((e) => e.defender.idx === stopper).flatMap((e) => [e.blocker, ...e.helpers]);
    // Last engagement pair positions are recorded at contact: the blocker(s)
    // that held the stopper this tick or last.
    const lastB = blockers.length ? blockers : ((tr as any).lastBlockers?.get(stopper) ?? []);
    tr.contact = { t: ev.t, stopper, x: (c.pos.x - tr.los) * tr.dir, y: (c.pos.y - tr.ballY), engagedNow, via: ev.note ?? ev.type,
      geo: { c: P(c), cv: { x: +(c.vel.x * tr.dir).toFixed(2), y: +(c.vel.y * tr.dir).toFixed(2) }, d: P(this.agents[stopper] as Agent),
        b: lastB.map((x: Agent) => ({ slot: x.slot, ...P(x) })) } } as any;
  }
  if (c && c.team === 'O' && c !== this.qb && tr.carrierLosT === null && (c.pos.x - tr.los) * tr.dir > 0) tr.carrierLosT = t;
  if (c && c.team === 'O') tr.end = { x: (c.pos.x - tr.los) * tr.dir, y: c.pos.y - tr.ballY };
  if (process.env.RB_FILM === '1' && Math.round(t * 20) % 2 === 0) {
    const P = (v: { x: number; y: number }) => [+((v.x - tr!.los) * tr!.dir).toFixed(2), +((v.y - tr!.ballY) * tr!.dir).toFixed(2)];
    tr.film.push([+t.toFixed(2), c ? c.idx : -1, (this.agents as Agent[]).map((a) => P(a.pos)),
      (this.engagements as any[]).map((e) => [e.blocker.idx, e.defender.idx, +e.phi.toFixed(2), +((e.drive?.x ?? 0) * tr!.dir).toFixed(2), +((e.drive?.y ?? 0) * tr!.dir).toFixed(2), e.helpers.map((h: Agent) => h.idx)])]);
  }
  if (this.phase === 'dead' && !(tr as any).closed) { (tr as any).closed = true; done.push({ ...tr, sim: this }); }
};

const playSide = (sim: AnySim) => { const run = sim.offCall.run!; return run.direction === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign; };
const group = (slot: string) => /^(DE|DT|NT|E|T)/.test(slot) ? 'DL' : /^(LB|M|W|S?LB|ILB|OLB|SAM|MIKE|WILL)/.test(slot) ? 'LB'
  : /^(CB|NB|DB)/.test(slot) ? 'CB' : /^(FS|SS)/.test(slot) ? 'S' : slot;


const [si, sn] = arg('--shard', '0/1').split('/').map(Number);
const R = rosters();
const cases: LabCase[] = [];
for (const formation of list('--formations', 'ace_12')) for (const concept of list('--concepts', 'iz,oz,wz'))
  for (const dir of list('--dirs', 'strong,weak') as Array<'strong' | 'weak'>) for (const lk of list('--looks', LOOK_SPECS.map(l => l[0]).join(',')))
    for (const roster of list('--rosters', 'pair11,pair31')) for (const seed of list('--seeds', '77,71001,1,2,3,4,5,6,7,8').map(Number))
      cases.push({ concept, dir, look: lk, roster, seed, formation });
const rows: any[] = [];
for (const lc of cases.filter((_, i) => i % sn === si)) {
  done.length = 0;
  const s0 = makeSim(lc, R);
  while (s0.phase === 'live' && s0.t < 20) s0.tick();
  for (const tr of done) {
    const sim = tr.sim as AnySim;
    const carrierIdx = sim.events.find((e: any) => e.type === 'handoff')?.b;
    if (carrierIdx === undefined) continue; // designed RB/FB handoffs only
    const agents = sim.agents as Agent[];
    const yards = tr.end?.x ?? 0;
    const row: any = { id: caseId(lc), formation: lc.formation, concept: tr.concept, scheme: tr.scheme, front: tr.front, yards: +yards.toFixed(2), handoffT: tr.handoffT, carrierLosT: tr.carrierLosT };
    if (tr.contact) {
      const s = tr.contact.stopper, sd = agents[s];
      const asg = tr.assigned.get(s), eng = tr.engaged.get(s);
      const shedBefore = sim.events.some((e: any) => e.type === 'shed' && e.a === s && e.t <= tr.contact!.t);
      const assignedBefore = asg ? [...asg.entries()].filter(([, v]) => v.t <= tr.contact!.t) : [];
      let cls: string;
      if (tr.contact.engagedNow) cls = 'blocked at contact';
      else if (eng && eng.first <= tr.contact.t) cls = shedBefore ? 'shed before contact' : 'engaged, released before contact';
      else if (assignedBefore.length && assignedBefore.every(([, v]) => v.kind === 'combo-backer')) cls = 'double backer, never engaged';
      else if (assignedBefore.length) cls = 'assigned, never engaged';
      else cls = 'never assigned';
      const firstOwner = assignedBefore.sort((p, q) => p[1].t - q[1].t)[0];
      // How his last block ended: the rep's own reason, or (no reason
      // recorded) a reach from the block, a blocker who left, or a grasp.
      const ended = ((tr as any).ends as Array<{ t: number; b: number; d: number; reason: string }>).filter((x) => x.d === s && x.t <= tr.contact!.t + 1e-9);
      const lastEnd = ended.at(-1);
      const gap = eng ? +(tr.contact.t - eng.last).toFixed(2) : null;
      const endWhy = tr.contact.engagedNow ? 'still engaged' : !eng ? 'never engaged'
        : lastEnd && Math.abs(lastEnd.t - eng.last) <= 0.06 ? lastEnd.reason : gap !== null && gap <= 0.06 ? 'reached from the block' : 'blocker left/retargeted';
      const ps = (playSide(sim) * tr.dir);
      row.contact = { endWhy, gap, ps, geo: (tr.contact as any).geo, t: tr.contact.t, depth: +tr.contact.x.toFixed(2), lateral: +tr.contact.y.toFixed(2), via: tr.contact.via,
        stopper: sd.slot, group: group(sd.slot), cls,
        owner: firstOwner ? { slot: agents[firstOwner[0]].slot, kind: firstOwner[1].kind, role: firstOwner[1].role, at: firstOwner[1].t } : null,
        engagedFrom: eng?.first ?? null, engagedTo: eng?.last ?? null,
        engagedBy: eng ? [...eng.blockers].map((b) => agents[b].slot) : [] };
    }
    row.plans = tr.plansAtSnap;
    if (process.env.RB_FILM === '1' && (yards <= 1 || process.env.RB_FILM_ALL === '1')) { row.film = tr.film; row.slots = agents.map((a) => a.slot); row.ps = playSide(sim) * tr.dir; }
    row.sheds = tr.sheds.map((x) => ({ ...x, d: agents[x.d].slot, b: agents[x.b].slot, between: +x.between.toFixed(2), dBall: +x.dBall.toFixed(2), carrierDepth: +x.carrierDepth.toFixed(2),
      stopper: row.contact?.stopper === agents[x.d].slot }));
    rows.push(row);
  }
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(rows));
console.error(`${rows.length} designed runs -> ${out}`);
