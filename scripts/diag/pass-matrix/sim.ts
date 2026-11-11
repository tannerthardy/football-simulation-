/**
 * Pass-game stress matrix, sim side: every base coverage call against every
 * pass concept from five formation families (2x2, 3x1, bunch, empty, 12
 * personnel), both flips, on league-sampled rosters and coordinators
 * (leagueSample: habits and coaching per seed). The QB plays each one
 * normally. Each play is written in the common play format of
 * scripts/mechanics/sim-export.ts (read by matrix.py, the same operator as the
 * NFL side), plus the cell (called and played coverage, concept, formation),
 * each offensive player's receiver number, and, at the throw, the defender
 * nearest the target and the job he was running (his rule and job for a
 * pattern-match seat; "no rule" for a plain zone; man and his man).
 *
 *   node --import tsx scripts/diag/pass-matrix/sim.ts --seeds 101-108 --out out/pass-matrix/sim.jsonl.gz [--shard 0/4]
 */
import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createGzip } from 'node:zlib';
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import type { PlayLog } from '../../../src/game/game.js';
import { generateTeam, leagueSample, pickDefense, pickOffense } from '../../../src/league/team.js';
import { coverageHasNamedZonePlayers } from '../../../src/playbook/call-integrity.js';
import { PASS_CONCEPTS } from '../../../src/playbook/concepts.js';
import { COVERAGES } from '../../../src/playbook/coverages.js';
import { FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import type { Coverage, DefPersonnelId } from '../../../src/playbook/types.js';
import { ManCoverage, ZoneCoverage } from '../../../src/sim/behaviors/defense.js';
import { CoverageDefender } from '../../../src/sim/coverage/defender.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { commonPlay } from '../../mechanics/sim-export.js';

const arg = (name: string, fallback: string) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : fallback; };
const [s0, s1] = arg('--seeds', '101-104').split('-').map(Number);
const out = arg('--out', 'out/pass-matrix/sim.jsonl.gz');
const [shard, shards] = arg('--shard', '0/1').split('/').map(Number);

/** Formation families and the formation that stands for each. */
const FORMS: Record<string, string> = { '2x2': 'gun_doubles_11', '3x1': 'gun_trips_11', bunch: 'gun_bunch_11', empty: 'gun_empty_11', '12p': 'gun_wing_12' };
/** Base calls: those that are not only reached as another call's formation check. */
const checkOnly = new Set(COVERAGES.flatMap((c) => [...Object.values(c.checks ?? {}).flat(), ...(c.structureChecks ?? []).flatMap((k) => k.to)]));
const CALLS = COVERAGES.filter((c) => !checkOnly.has(c.id));
const CONCEPTS = PASS_CONCEPTS;

function personnelFor(formPersonnel: string, cov: Coverage): DefPersonnelId | null {
  const order: DefPersonnelId[] = formPersonnel === '12' ? ['base43', 'nickel'] : ['nickel', 'dime', 'base43'];
  return order.find((p) => coverageHasNamedZonePlayers(p, cov)) ?? null;
}

function jobOf(d: { behavior: unknown; slot: string } | undefined): string {
  if (!d) return 'none';
  const b = d.behavior;
  if (b instanceof CoverageDefender) return `${b.rule}|${b.job}`;
  if (b instanceof ZoneCoverage) return `no rule|zone:${b.zone}:${b.style}`;
  if (b instanceof ManCoverage) return `man|${(b as unknown as { target?: { slot: string } }).target?.slot ?? '?'}`;
  return `other|${(b as { kind?: string })?.kind ?? '?'}`;
}

mkdirSync(dirname(out), { recursive: true });
const gz = createGzip();
const done = new Promise<void>((resolve) => gz.pipe(createWriteStream(out)).on('finish', () => resolve()));
let job = 0, n = 0;
const t0 = Date.now();
for (let seed = s0; seed <= s1; seed++) {
  const rng = new Rng(seed);
  const off = leagueSample(generateTeam(rng, 'Offense', 'OFF', { strength: 0.55 }), seed);
  const def = leagueSample(generateTeam(rng, 'Defense', 'DEF', { strength: 0.55 }), seed);
  const style = new Rng(seed * 7919 + 1);
  for (const cov of CALLS) for (const concept of CONCEPTS) for (const [fam, formId] of Object.entries(FORMS)) for (const flip of [false, true]) {
    if (job++ % shards !== shard) continue;
    const formation = FORMATION_BY_ID[formId];
    const personnel = personnelFor(formation.personnel, cov);
    if (!personnel) continue;
    const ruled = Object.values(cov.roles).some((r) => r?.kind === 'zone' && r.rule) || cov.underneath.some((u) => typeof u !== 'string' && u.rule);
    const zoneStyle = cov.man ? undefined : ruled || style.chance(def.coach.matchRate) ? 'match' as const : 'spot' as const;
    const ballY = CENTER_Y + (style.chance(0.5) ? 1 : -1) * style.range(0, 3.1);
    const sim = new PlaySim({
      offense: pickOffense(off, formation.personnel), defense: pickDefense(def, personnel),
      offCall: { formation, flip, kind: 'pass', pass: concept, label: concept.id },
      defCall: { personnel, front: FRONT_BY_ID.over, coverage: cov, pressure: null, zoneStyle, label: cov.id, checkPick: style.int(0, 1) },
      los: 45, ballY, firstDownX: 55, seed: seed * 100003 + job, record: true, down: 1,
    });
    let nearest = 'none', nearestSlot: string | null = null, nearestDist: number | null = null;
    const tick = (sim as unknown as { tick(): void }).tick.bind(sim);
    let thrown = false;
    (sim as unknown as { tick(): void }).tick = () => {
      tick();
      if (!thrown && sim.ball.kind === 'air') {
        thrown = true;
        const tgt = sim.ball.target;
        if (tgt) {
          const d = [...sim.defense].sort((a, b) => Math.hypot(a.pos.x - tgt.pos.x, a.pos.y - tgt.pos.y) - Math.hypot(b.pos.x - tgt.pos.x, b.pos.y - tgt.pos.y))[0];
          nearest = jobOf(d); nearestSlot = d?.slot ?? null; nearestDist = d ? Math.hypot(d.pos.x - tgt.pos.x, d.pos.y - tgt.pos.y) : null;
        }
      }
    };
    const r = sim.run();
    const log = {
      kind: 'pass', nullified: false, yards: r.yards,
      replay: { frames: r.frames, players: sim.agents.map((a) => ({ team: a.team, slot: a.slot, pos: a.player.position })), los: sim.los, events: r.events },
      plan: { concept: concept.id, coverage: cov.id, formation: formId },
    } as unknown as PlayLog;
    const p = commonPlay(log, `M${seed}-${job}`);
    if (!p) continue;
    const refs = sim.agents.map((a) => (a.team === 'O' ? sim.offAlign.refOf[a.slot as never] ?? null : null));
    gz.write(JSON.stringify({ ...p, matrix: {
      called: cov.id, family: cov.family, played: sim.defCall.coverage.id, playedFamily: sim.defCall.coverage.family, zoneStyle,
      concept: concept.id, conceptFamily: concept.family, formation: fam, formationId: formId, flip, seed,
      refs, nearest, nearestSlot, nearestDist: nearestDist === null ? null : Math.round(nearestDist * 100) / 100,
      stats: { attempted: !!r.stats.attempted, completed: !!r.stats.completed, sacked: !!r.stats.sacked, intercepted: !!r.stats.interceptedBy,
        throwaway: !!r.stats.throwaway, scramble: !!r.stats.scramble, separation: r.stats.separation ?? null },
    } }) + '\n');
    n++;
  }
  console.error(`seed ${seed}: ${n} plays, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
gz.end();
await done;
console.error(`${n} plays -> ${out}`);
