/** Path protection after contact on stretch runs. For every run engagement on
 * a linebacker, from first contact until it ends: where the blocker stands on
 * the line from the backer to the runner (between them or not), how his chest
 * faces the backer, how much load his hands carry, and how the rep ends (shed
 * roll, lost leverage, runner past, came apart, still on at the stop). Then
 * whether that backer makes the runner's first contact, and how soon.
 * Observation only.
 * node --import tsx scripts/diag/zone/path-probe.ts [runs=wz_strong,oz_strong] [seeds=3,7]
 */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import type { Agent, Engagement } from '../../../src/sim/agent.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const runs = (process.argv[2] ?? 'wz_strong,oz_strong').split(',');
const f = (x: number | null) => x === null ? '  -  ' : x.toFixed(2);
const seeds = (process.argv[3] ?? '3,7').split(',').map(Number);
type Rep = { play: string; blocker: string; backer: string; start: number; end: number | null; why: string;
  ticks: number; between: number; startGeo: string; endGeo: string; peakHands: number;
  contactBy: boolean; contactAt: number | null };
const reps: Rep[] = [];
const ALL = process.env.ALL === '1';
const firsts: string[] = [];

/** Blocker position on the segment from backer to runner: along (0 backer, 1
 * runner), lateral offset, and whether his body covers that segment. */
function geometry(b: Agent, lb: Agent, runner: Agent) {
  const dx = runner.pos.x - lb.pos.x, dy = runner.pos.y - lb.pos.y, L = Math.hypot(dx, dy) || 1;
  const rx = b.pos.x - lb.pos.x, ry = b.pos.y - lb.pos.y;
  const along = (rx * dx + ry * dy) / (L * L), off = Math.abs(rx * dy - ry * dx) / L;
  const covers = along > 0 && along * L < L - runner.profile.radius && off < b.profile.radius + lb.profile.radius;
  const toD = Math.atan2(lb.pos.y - b.pos.y, lb.pos.x - b.pos.x);
  const chest = Math.abs(Math.atan2(Math.sin(toD - b.facing), Math.cos(toD - b.facing)));
  return { along, off, L, covers, chest, text: `along ${along.toFixed(2)} off ${off.toFixed(2)} L ${L.toFixed(1)} chest ${(chest * 57.3).toFixed(0)}deg` };
}

for (const run of runs) for (const seed of seeds) for (const [o, d] of [[31, 32], [41, 42], [51, 52]])
  for (const front of ['over', 'under']) for (const flip of [false, true]) {
    const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(o), 'O', 'O', { strength: .55 }), FORMATION_BY_ID.ace_11.personnel),
      defense: pickDefense(generateTeam(new Rng(d), 'D', 'D', { strength: .55 }), 'base43'),
      offCall: { formation: FORMATION_BY_ID.ace_11, flip, kind: 'run', run: RUN_BY_ID[run], label: run },
      defCall: { personnel: 'base43', front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: front },
      los: 40, ballY: CENTER_Y, firstDownX: 50, seed });
    const name = `${run} s${seed} ${o}/${d} ${front}${flip ? ' flip' : ''}`;
    const rb = sim.offense.find((a) => a.slot === 'RB')!;
    const open = new Map<Engagement, Rep>();
    let seen = 0, firstContact: { t: number; by: number; depth: number } | null = null;
    while (sim.phase === 'live' && sim.t < 8) {
      (sim as unknown as { tick(): void }).tick();
      const runner = sim.carrier && sim.carrier.team === rb.team ? sim.carrier : rb;
      const fresh = sim.events.slice(seen); seen = sim.events.length;
      for (const e of sim.engagements) {
        if (e.type !== 'run' || open.has(e)) continue;
        const g = geometry(e.blocker, e.defender, runner);
        const r: Rep = { play: name, blocker: e.blocker.slot, backer: e.defender.slot, start: sim.t, end: null, why: 'on at stop',
          ticks: 0, between: 0, startGeo: g.text, endGeo: '', peakHands: 0, contactBy: false, contactAt: null };
        open.set(e, r); reps.push(r);
      }
      for (const [e, r] of open) {
        if (r.end !== null) continue;
        if (!sim.engagements.includes(e)) {
          r.end = sim.t;
          const shed = fresh.find((ev) => ev.type === 'shed' && ev.a === e.defender.idx && ev.b === e.blocker.idx);
          const past = sim.carrier && (sim.carrier.pos.x - e.defender.pos.x) * sim.attackDir(sim.carrier.team) > 2.5;
          r.why = shed ? shed.note ?? 'shed' : past ? 'runner past' : e.blocker.isDown(sim.t) ? 'blocker down' : e.defender.isDown(sim.t) ? 'defender down' : 'came apart';
          continue;
        }
        const g = geometry(e.blocker, e.defender, runner);
        r.ticks++; if (g.covers) r.between++;
        r.endGeo = g.text;
        r.peakHands = Math.max(r.peakHands, Math.hypot(e.hands?.normalForce ?? 0, e.hands?.tangentForce ?? 0));
      }
      if (!firstContact) for (const ev of fresh) if (['hit', 'tackle_wrap', 'carrier_contact', 'missed_tackle'].includes(ev.type) && ev.a !== undefined) {
        const by = ev.type === 'carrier_contact' ? ev.b : ev.a;
        if (by === undefined || sim.agents[by].team === rb.team) continue;
        firstContact = { t: ev.t, by, depth: ((ev.pos?.x ?? sim.los) - sim.los) * sim.attackDir(rb.team) }; break;
      }
    }
    if (firstContact) {
      const a = sim.agents[firstContact.by], mine = reps.filter((r) => r.play === name && r.backer === a.slot);
      const intended = sim.offense.filter((x) => { const p = (x.behavior as unknown as { plan?: { kind: string; target?: Agent | null; combination?: { backer?: Agent | null } } }).plan;
        return p && ((p.kind === 'climb' && p.target === a) || p.combination?.backer === a || p.target === a); }).map((x) => x.slot);
      firsts.push(`${name.padEnd(30)} first contact ${f(firstContact.t)} by ${a.slot.padEnd(5)} planned blockers [${intended.join(',')}] reps [${mine.map((r) => `${r.blocker} ${r.why}`).join('; ')}]`
        + ` at ${firstContact.depth.toFixed(1)} yd, gain ${sim.endSpot ? ((sim.endSpot.x - sim.los) * sim.attackDir(rb.team)).toFixed(1) : 'live'}`);
    }
    for (const r of open.values()) if (firstContact && sim.slot(r.backer)?.idx === firstContact.by) { r.contactBy = true; r.contactAt = firstContact.t; }
  }

for (const r of reps) if (ALL || r.backer.startsWith('LB')) console.log(`${r.play.padEnd(30)} ${r.blocker.padEnd(3)} on ${r.backer.padEnd(5)} ${f(r.start)}-${f(r.end)} ${r.why.padEnd(22)} covers ${String(r.between).padStart(3)}/${String(r.ticks).padStart(3)} hands ${r.peakHands.toFixed(0).padStart(5)}`
  + ` | start ${r.startGeo} | end ${r.endGeo}${r.contactBy ? ` | BACKER FIRST CONTACT ${f(r.contactAt)}` : ''}`);
const by = new Map<string, Rep[]>();
for (const r of reps) if (r.backer.startsWith('LB')) by.set(r.why, [...(by.get(r.why) ?? []), r]);
console.log(`\n${reps.filter((r) => r.backer.startsWith('LB')).length} linebacker reps`);
for (const [why, rs] of by) {
  const cov = rs.reduce((p, r) => p + r.between, 0) / Math.max(1, rs.reduce((p, r) => p + r.ticks, 0));
  const dur = rs.reduce((p, r) => p + ((r.end ?? r.start) - r.start), 0) / rs.length;
  console.log(`${why.padEnd(24)} n ${String(rs.length).padStart(3)} | mean duration ${dur.toFixed(2)} s | covering ${(100 * cov).toFixed(0)}% of ticks | backer then makes first contact ${rs.filter((r) => r.contactBy).length}`);
}
console.log('');
for (const l of firsts) console.log(l);
