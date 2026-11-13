/** Movement composition in engaged zone reps. The run rep requests
 * `drive * forward + lat * lateral`, where `drive` comes from the zone read
 * and `lat` from the acquired contact surface. When they are not
 * perpendicular, the forward term leaks into the lateral direction (and the
 * lateral term into the drive). For every engaged OL tick on stretch and
 * inside-zone runs: drive.lat, the intended lateral, the lateral actually
 * requested, the playside component requested and achieved. Observation only.
 * node --import tsx scripts/diag/zone/compose-probe.ts [runs=wz_strong,oz_strong,iz_strong] [seeds=3,7]
 */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import type { Vec2 } from '../../../src/core/vec.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';
import { playSideSign } from '../../../src/sim/behaviors/blocking.js';

const runs = (process.argv[2] ?? 'wz_strong,oz_strong,iz_strong').split(',');
const seeds = (process.argv[3] ?? '3,7').split(',').map(Number);
type Tick = { run: string; dot: number; forward: number; lateral: number; reqLat: number; reqPlay: number; achPlay: number; anchored: boolean; stretch: boolean; mirror: number; seal: number; dLat: number; corr: number; fb: number; err: number; toPlay: number; facingOff: number; across: number; dAimErr: number; dShoulder: number; reading: boolean; declared: boolean };
const ticks: Tick[] = [];
const flips = { n: 0, flip: 0, anch: 0 };
const TRACE = process.env.TRACE, TRACE_SLOT = process.env.TRACE_SLOT ?? 'RG';
const f0 = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
const dotv = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y;

for (const run of runs) for (const seed of seeds) for (const [o, d] of [[31, 32], [41, 42], [51, 52]])
  for (const front of ['over', 'under']) for (const flip of [false, true]) {
    const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(o), 'O', 'O', { strength: .55 }), FORMATION_BY_ID.ace_11.personnel),
      defense: pickDefense(generateTeam(new Rng(d), 'D', 'D', { strength: .55 }), 'base43'),
      offCall: { formation: FORMATION_BY_ID.ace_11, flip, kind: 'run', run: RUN_BY_ID[run], label: run },
      defCall: { personnel: 'base43', front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: front },
      los: 40, ballY: CENTER_Y, firstDownX: 50, seed });
    const side = playSideSign(sim, RUN_BY_ID[run]);
    const pending: { b: any; t: Tick; d?: any; line?: string }[] = [];
    const lastAnch = new Map<unknown, boolean>();
    runContactObservers.set(sim, (e, phase, data) => {
      if (phase !== 'movement' || !e.drive || e.helpers.length) return;
      const lat = data.lat as Vec2, drive = data.drive as Vec2, cmd = (data.command as { vel: Vec2 }).vel;
      const t: Tick = { run, dot: dotv(drive, lat), forward: data.forward as number, lateral: data.lateral as number,
        reqLat: dotv(cmd, lat), reqPlay: cmd.y * side, achPlay: NaN, anchored: !!data.anchored, stretch: !!data.stretch,
        mirror: data.mirror as number, seal: data.seal as number, dLat: data.dLat as number, corr: data.correction as number, fb: data.feedback as number,
        err: (data.wantOffset as number) - (data.offset as number), toPlay: Math.sign(lat.y * side) || 1,
        facingOff: Math.abs(Math.atan2(Math.sin((data.facing as number) - Math.atan2(side, 0)), Math.cos((data.facing as number) - Math.atan2(side, 0)))) * 57.3,
        across: ((data.blockerPos as Vec2).y - (data.defenderPos as Vec2).y) * side,
        dAimErr: ((data.defensiveAim as Vec2).y - (data.defenderPos as Vec2).y) * side,
        dShoulder: ((data.defensiveAim as Vec2).y - (data.blockerPos as Vec2).y) * side,
        reading: !!data.reading, declared: !!data.declared };
      const prev = lastAnch.get(e); lastAnch.set(e, t.anchored);
      if (prev !== undefined) { flips.n++; if (prev !== t.anchored) flips.flip++; if (t.anchored) flips.anch++; }
      ticks.push(t); pending.push({ b: e.blocker, t });
      if (TRACE && `${run} s${seed} ${o} ${front}${flip ? ' flip' : ''}` === TRACE && e.blocker.slot === TRACE_SLOT) {
        const dI = (sim as any).intents; // defender request is written after this observer; print it next tick
        pending[pending.length - 1].d = e.defender; pending[pending.length - 1].line = (`t ${sim.t.toFixed(2)} ${e.blocker.slot}->${e.defender.slot} ${data.anchored ? 'ANCH' : '    '} B req lat ${f0(t.reqPlay)} ach ${f0(e.blocker.vel.y * side)} | D ach ${f0(e.defender.vel.y * side)} prevReq ${f0((dI[e.defender.idx]?.vel?.y ?? NaN) * side)} | across ${f0(t.across)} B err ${f0(t.err * t.toPlay)} corr ${f0(t.corr * t.toPlay)} dLat ${f0(t.dLat * t.toPlay)} fb ${f0(t.fb * t.toPlay)} | D aim-D ${f0(t.dAimErr)} held ${f0(((data.heldFlow as number) ?? NaN) * side)} | forward ${f0(t.forward)} drive.lat ${f0(t.dot)}`);
      }
    });
    while (sim.phase === 'live' && sim.t < 4) {
      (sim as unknown as { tick(): void }).tick();
      for (const p of pending) {
        p.t.achPlay = p.b.vel.y * side;
        if (p.line) { const di = (sim as any).intents[p.d.idx]; console.log(`${p.line} | D final req ${f0(di.vel.y * side)} x ${f0(di.vel.x)} push ${di.push ?? '-'} shed ${p.d.tags.has('shed-attempt') ? 'y' : 'n'} | hands ${p.d.engagement?.hands ? 'joint' : '-'}`); }
      }
      pending.length = 0;
    }
  }

const med = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
const f = f0;
for (const run of runs) for (const anchored of [false, true]) {
  const rs = ticks.filter((t) => t.run === run && t.anchored === anchored);
  if (!rs.length) continue;
  const big = rs.filter((t) => Math.abs(t.dot) > .3);
  console.log(`${run.padEnd(10)} ${anchored ? 'anchored' : 'free    '} ticks ${String(rs.length).padStart(4)} | |drive.lat| median ${med(rs.map((t) => Math.abs(t.dot))).toFixed(2)}, >0.3 on ${(big.length / rs.length).toFixed(2)}`
    + ` | lateral intended ${f(mean(rs.map((t) => t.lateral)))} requested ${f(mean(rs.map((t) => t.reqLat)))} | leak (req-int) mean |${mean(rs.map((t) => Math.abs(t.reqLat - t.lateral))).toFixed(2)}|`
    + ` | playside requested ${f(mean(rs.map((t) => t.reqPlay)))} achieved ${f(mean(rs.map((t) => t.achPlay)))} | forward ${f(mean(rs.map((t) => t.forward)))}`);
}

console.log('\nfree (not anchored) ticks, play-side signs: defender lateral, feedback, correction, seal, cap; share at cap; facing off the play-side direction');
for (const run of runs) {
  const rs = ticks.filter((t) => t.run === run && !t.anchored);
  const pl = (k: keyof Tick) => f(mean(rs.map((t) => (t[k] as number) * t.toPlay)));
  console.log(`${run.padEnd(10)} dLat ${pl('dLat')} feedback ${pl('fb')} correction ${pl('corr')} (offset error ${pl('err')}) seal ${pl('seal')} lateral ${pl('lateral')} | mirror ${f(mean(rs.map((t) => t.mirror)))}, at cap ${(rs.filter((t) => Math.abs(Math.abs(t.seal) - t.mirror) < 1e-6).length / rs.length).toFixed(2)} | facing off play side ${med(rs.map((t) => t.facingOff)).toFixed(0)} deg`);
}

console.log('\nfree ticks: blocker play side of defender (yd), defender aim minus defender, defender aim minus blocker (play-side +)');
for (const run of runs) {
  const rs = ticks.filter((t) => t.run === run && !t.anchored);
  console.log(`${run.padEnd(10)} blocker across ${f(med(rs.map((t) => t.across)))} | DL aim - DL ${f(med(rs.map((t) => t.dAimErr)))} | DL aim - blocker ${f(med(rs.map((t) => t.dShoulder)))} | DL aims outside the blocker on ${(rs.filter((t) => t.dShoulder > 0).length / rs.length).toFixed(2)} | reading run ${(rs.filter((t) => t.reading).length / rs.length).toFixed(2)} declared ${(rs.filter((t) => t.declared).length / rs.length).toFixed(2)}`);
}

console.log(`\nanchor: ${(flips.anch / flips.n).toFixed(2)} of ticks anchored, state flips on ${(flips.flip / flips.n).toFixed(2)} of consecutive ticks`);
for (const run of runs) {
  const rs = ticks.filter((t) => t.run === run && t.stretch);
  if (rs.length) console.log(`${run.padEnd(10)} stretch ticks ${rs.length}: forward < 0 on ${(rs.filter((t) => t.forward < 0).length / rs.length).toFixed(2)}, median forward ${f(med(rs.map((t) => t.forward)))}`);
}
