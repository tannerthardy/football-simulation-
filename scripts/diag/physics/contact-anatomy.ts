/** Anatomy of the first contact on designed runs, in full games.
 * For each run: the first contact's kind (torso collision or grasp), the
 * contact defender's closing speed and approach angle, whether he struck or
 * dove, the carrier's speed at contact and 0.1 / 0.2 / 0.4 s later, when the
 * first grasp formed, and how the play ended (carrier fall, stalled forward
 * progress, out of bounds) and how long after contact. Observation only.
 * node --import tsx scripts/diag/physics/contact-anatomy.ts [seed=101] [games=4] [--rows]
 */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import type { Agent } from '../../../src/sim/agent.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const seed = Number(args[0] ?? 101), games = Number(args[1] ?? 4);
type Row = { kind: string; closing: number; angle: number; struck: boolean; dove: boolean; carrierSpeed: number;
  speeds: (number | null)[]; graspAfter: number | null; end: string; endAfter: number | null; fallNote: string; tacklers: number };
type Track = { t0: number | null; row: Partial<Row>; samples: Map<number, number>; seen: number; fall: string };
const tracks = new WeakMap<PlaySim, Track>();
const rows: Row[] = [];
type AnySim = PlaySim & Record<string, any>;
const original = (PlaySim.prototype as any).tick as (this: PlaySim) => void;
(PlaySim.prototype as any).tick = function (this: AnySim) {
  if (this.offCall?.kind !== 'run') return original.call(this);
  let tr = tracks.get(this);
  if (!tr) { tr = { t0: null, row: {}, samples: new Map(), seen: 0, fall: '' }; tracks.set(this, tr); }
  original.call(this);
  const c = this.carrier as Agent | null;
  const handed = this.handoffAt >= 0;
  const fresh = this.events.slice(tr.seen); tr.seen = this.events.length;
  for (const ev of fresh) {
    if (!handed || !c || c.team !== 'O' || c === this.qb) break;
    if (tr.t0 === null && ev.type === 'carrier_contact' && ev.a === c.idx && ev.b !== undefined) {
      const d = this.agents[ev.b] as Agent;
      const dx = d.pos.x - c.pos.x, dy = d.pos.y - c.pos.y, L = Math.hypot(dx, dy) || 1;
      const closing = ((d.vel.x - c.vel.x) * -dx + (d.vel.y - c.vel.y) * -dy) / L;
      const sp = Math.hypot(c.vel.x, c.vel.y);
      // Angle between the carrier's travel and the direction to the defender: 0 head-on ahead, 180 from behind.
      const angle = sp > .5 ? Math.acos(Math.max(-1, Math.min(1, (c.vel.x * dx + c.vel.y * dy) / (sp * L)))) * 180 / Math.PI : NaN;
      tr.t0 = this.t;
      tr.row = { kind: ev.note ?? '?', closing, angle, carrierSpeed: sp, struck: !!d.body.support?.strike, dove: d.isDown(this.t) || d.tags.has('dive'), graspAfter: null };
    }
    if (tr.t0 !== null && tr.row.graspAfter === null && ev.type === 'tackle_wrap') tr.row.graspAfter = this.t - tr.t0;
    if (tr.t0 !== null && ev.type === 'fall' && ev.a === c.idx) tr.fall = ev.note ?? 'fall';
  }
  if (tr.t0 !== null && c) for (const off of [.1, .2, .4]) {
    if (!tr.samples.has(off) && this.t >= tr.t0 + off - 1e-9) tr.samples.set(off, Math.hypot(c.vel.x, c.vel.y));
  }
  if (this.phase === 'dead' && tr.t0 !== null && !(tr as any).closed) {
    (tr as any).closed = true;
    const bond = this.bond;
    const sup = (bond?.carrier ?? c)?.body.support;
    const end = this.endReason ?? (sup?.state === 'down' ? 'carrier down' : bond && (bond.stalled ?? 0) >= .8 ? 'progress stopped' : bond ? 'held (other)' : 'other');
    rows.push({ ...(tr.row as Row), speeds: [.1, .2, .4].map((o) => tr!.samples.get(o) ?? null), end: String(end),
      endAfter: this.t - tr.t0, fallNote: tr.fall, tacklers: bond?.tacklers.length ?? 0 });
  }
};

const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(home, away, { seed: seed + g });

const med = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
const f = (x: number) => Number.isFinite(x) ? x.toFixed(2) : '  - ';
if (process.argv.includes('--rows')) for (const r of rows) console.log(JSON.stringify(r));
console.log(`designed runs with a first contact: ${rows.length}`);
const show = (label: string, rs: Row[]) => {
  if (!rs.length) return;
  const drop = (j: number) => med(rs.filter((r) => r.speeds[j] !== null).map((r) => r.carrierSpeed - r.speeds[j]!));
  console.log(`  ${label.padEnd(34)} n ${String(rs.length).padStart(4)} | speed at contact ${f(med(rs.map((r) => r.carrierSpeed)))} | lost by +0.1/+0.2/+0.4 s ${f(drop(0))} / ${f(drop(1))} / ${f(drop(2))}`
    + ` | closing ${f(med(rs.map((r) => r.closing)))} | ends within 0.8 s ${(rs.filter((r) => (r.endAfter ?? 9) <= .8).length / rs.length).toFixed(2)}`);
};
show('all', rows);
for (const k of [...new Set(rows.map((r) => r.kind))]) show(`first contact: ${k}`, rows.filter((r) => r.kind === k));
show('head-on (angle < 45)', rows.filter((r) => r.angle < 45));
show('side (45-135)', rows.filter((r) => r.angle >= 45 && r.angle <= 135));
show('from behind (> 135)', rows.filter((r) => r.angle > 135));
show('defender striking at contact', rows.filter((r) => r.struck));
show('grasp within 0.1 s', rows.filter((r) => r.graspAfter !== null && r.graspAfter <= .1));
show('no grasp within 0.4 s', rows.filter((r) => r.graspAfter === null || r.graspAfter > .4));
console.log('endings:');
for (const k of [...new Set(rows.map((r) => r.end))]) {
  const rs = rows.filter((r) => r.end === k);
  console.log(`  ${k.padEnd(20)} n ${String(rs.length).padStart(4)} | contact to whistle median ${f(med(rs.map((r) => r.endAfter ?? NaN)))} s | tacklers median ${med(rs.map((r) => r.tacklers))}`);
}
const falls = new Map<string, number>();
for (const r of rows) if (r.fallNote) falls.set(r.fallNote, (falls.get(r.fallNote) ?? 0) + 1);
console.log('carrier fall notes:', [...falls].map(([k, v]) => `${k} ${v}`).join(', '));
