import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { CONCEPT_MENU, MENU_CONCEPTS, PASS_BY_ID, PASS_CONCEPTS } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { getRoute } from '../src/playbook/routes.js';
import type { PassConcept, ReceiverRef } from '../src/playbook/types.js';
import { RouteRunner } from '../src/sim/behaviors/receiver.js';
import { PlaySim } from '../src/sim/playsim.js';

/** CONCEPT_MENU (src/playbook/concepts.ts): the drop-back concepts added from the NFL's own route combinations. */
/** The coverage a concept is drawn against: its first named coverage (man = Cover 1). */
const COVER: Record<string, string> = { cover1: 'cover1', cover2: 'cover2_match', cover3: 'cover3_match', cover4: 'cover4', man: 'cover1', blitz: 'cover1' };
const coverFor = (c: PassConcept) => COVER[c.beats.find((b) => COVER[b]) ?? 'cover3'];
/** Trips concepts (a #3 route that matters) from 3x1, the rest from 2x2. */
const formFor = (c: PassConcept) => (c.progression.slice(0, 3).includes('S3') ? 'gun_trips_11' : 'gun_doubles_11');

function sim(c: PassConcept, seed: number, cover = coverFor(c)) {
  // Fresh rosters for every play: a play leaves its players' state (energy) behind.
  const off = generateTeam(new Rng(31), 'O', 'O', { strength: 0.6 }), def = generateTeam(new Rng(32), 'D', 'D', { strength: 0.6 });
  const formation = FORMATION_BY_ID[formFor(c)];
  return new PlaySim({
    offense: pickOffense(off, formation.personnel), defense: pickDefense(def, 'nickel'),
    offCall: { formation, flip: seed % 2 === 1, kind: 'pass', pass: c, label: c.id },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cover], pressure: null, zoneStyle: 'match', label: cover },
    los: 40, ballY: 26.65, firstDownX: 50, seed,
  });
}

/** Lateral direction of a route's last leg in its own frame: + toward his sideline, - toward the ball. */
function lastLeg(id: string): { d: number; l: number } {
  const pts = getRoute(id).points;
  const a = pts.length > 1 ? pts[pts.length - 2] : { d: 0, l: 0 }, b = pts[pts.length - 1];
  return { d: b.d - a.d, l: b.l - a.l };
}

describe('CONCEPT_MENU', () => {
  it('is off by default: the caller pool is unchanged, the concepts exist for labs', () => {
    expect(CONCEPT_MENU).toBe(false);
    for (const c of MENU_CONCEPTS) expect(PASS_CONCEPTS.includes(c)).toBe(false);
    for (const c of MENU_CONCEPTS) expect(PASS_BY_ID[c.id]).toBe(c);
  });

  it('every concept is complete: routes that exist, a progression on its own receivers, a read, a coverage it beats', () => {
    for (const c of MENU_CONCEPTS) {
      for (const side of [c.strong, c.weak]) for (const id of Object.values(side)) expect(() => getRoute(id!), `${c.id} ${id}`).not.toThrow();
      if (c.back !== 'block' && c.back !== 'check') expect(() => getRoute(c.back)).not.toThrow();
      expect(c.read, c.id).toBeTruthy();
      expect(c.beats.length, c.id).toBeGreaterThan(0);
      for (const ref of c.progression) {
        const [side, n] = [ref[0], Number(ref.slice(1))];
        if (ref === 'B') continue;
        expect((side === 'S' ? c.strong : c.weak)[n as 1 | 2 | 3], `${c.id} ${ref}`).toBeTruthy();
      }
    }
  });

  it('the routes run as drawn: each numbered receiver runs his route, and its last leg goes the way it is drawn', () => {
    for (const c of MENU_CONCEPTS) {
      // A play that lives to 2.6 s with the ball held (a sack ends the drawing early): the first such seed.
      let s!: PlaySim, start!: Map<PlaySim['offense'][number], { x: number; y: number }>, at!: Map<string, Array<{ x: number; y: number }>>;
      for (const seed of [3, 5, 7, 9, 11, 13]) {
        s = sim(c, seed);
        s.throwBall = () => undefined;
        start = new Map(s.offense.map((a) => [a, { ...a.pos }]));
        at = new Map();
        const tick = s as unknown as { tick(): void };
        // Throws are held here, so the quarterback eventually scrambles and receivers break to the scramble drill:
        // the drawing ends there.
        while (s.phase === 'live' && s.t < 2.6 && !s.scrambleDrill) {
          tick.tick();
          for (const a of s.offense) (at.get(a.slot) ?? at.set(a.slot, []).get(a.slot)!).push({ ...a.pos });
        }
        if (s.t >= 2.55 || (s.t >= 2.1 && s.scrambleDrill)) break;
      }
      for (const [sideKey, side] of [['S', c.strong], ['W', c.weak]] as const) {
        for (const [n, id] of Object.entries(side)) {
          const slot = s.offAlign.numbering[`${sideKey}${n}` as ReceiverRef];
          if (!slot || !id) continue;
          const a = s.slot(slot)!;
          const b = a.behavior as unknown as { route?: { id: string } };
          expect(a.behavior instanceof RouteRunner ? b.route?.id : `${a.behavior.constructor.name}`, `${c.id} ${sideKey}${n}`).toBe(id);
          // The last leg's direction, in field terms: downfield gained and lateral toward his sideline.
          const leg = lastLeg(id), path = at.get(slot)!, p0 = start.get(a)!, end = path[path.length - 1], mid = path[Math.max(0, path.length - 8)];
          const outSign = Math.sign(p0.y - s.ballY) || 1, dir = s.attackDir(a.team);
          const lat = (end.y - mid.y) * outSign, down = (end.x - mid.x) * dir;
          if (Math.abs(leg.l) > 3 && Math.hypot(lat, down) > 1) expect(Math.sign(lat), `${c.id} ${sideKey}${n} ${id} lateral`).toBe(Math.sign(leg.l));
          // A deep route is still climbing at the end, unless a defender is on him (a wall or reroute stops a
          // stem; that is execution, not the drawing).
          const walled = s.defense.some((d) => Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y) < 1.6);
          if (getRoute(id).family === 'deep' && leg.d > 5 && !walled) expect(down, `${c.id} ${sideKey}${n} ${id} still climbing`).toBeGreaterThan(0.5);
        }
      }
    }
  });

  it('against the coverage it is drawn to beat, the quarterback throws most balls to the first two reads', () => {
    const rows: string[] = [];
    for (const c of MENU_CONCEPTS) {
      let throws = 0, first2 = 0;
      for (let seed = 1; seed <= 12; seed++) {
        const s = sim(c, 100 + seed);
        const r = s.run();
        if (!r.stats.attempted || r.stats.throwaway) continue;
        throws++;
        const tgt = s.offense.find((a) => a.player.id === r.stats.target);
        const ref = tgt ? s.offAlign.refOf[tgt.slot as never] : undefined;
        if (ref && c.progression.slice(0, 2).includes(ref)) first2++;
      }
      rows.push(`${c.id} ${first2}/${throws}`);
      console.log(`read ${c.id} vs ${coverFor(c)}: first two reads ${first2}/${throws}`);
      expect(throws, c.id).toBeGreaterThanOrEqual(6);
      expect(first2 / throws, `${c.id}: ${rows.at(-1)}`).toBeGreaterThanOrEqual(0.5);
    }
  });
});

describe('CONCEPT_MENU trips: #3 releases where the defence reads him as #3', () => {
  // The new #3 routes: a hitch, an out off a vertical stem, a quick out, a flat. The hook defender's own
  // release reader (src/sim/coverage/reads.ts, through his perception) must declare a release from the #3 he
  // keys by the time the route breaks, and the class must be the route's: a stem shows vertical first; a
  // flat shows flat.
  const EXPECT: Record<string, string[]> = { hitch: ['vertical'], out: ['vertical'], quick_out: ['vertical'], flat: ['flat', 'out'] };
  it('the hook defender declares #3 with the release his route shows', async () => {
    const { ReleaseReader } = await import('../src/sim/coverage/reads.js');
    const trips = MENU_CONCEPTS.filter((c) => c.strong[3] && EXPECT[c.strong[3]] && formFor(c) === 'gun_trips_11');
    expect(trips.length).toBeGreaterThanOrEqual(4);
    for (const c of trips) {
      const s = sim(c, 5, 'cover3_match');
      s.throwBall = () => undefined;
      const three = s.slot(s.offAlign.numbering.S3!)!;
      const key = s.slot('LB_M') ?? s.slot('LB_S')!;
      const reader = new ReleaseReader(key, s);
      const tick = s as unknown as { tick(): void };
      let first: string | null = null, at = -1;
      // In 3x1 (gun_trips_11) #3 is the attached end: his release through the edge is slower than a slot's.
      while (s.phase === 'live' && s.t < 2.6 && !s.scrambleDrill) {
        tick.tick();
        const rd = reader.read(s, three);
        if (rd && rd.first !== 'none' && first === null) { first = rd.first; at = s.t; }
      }
      expect(first, `${c.id} #3 ${c.strong[3]}`).not.toBeNull();
      expect(EXPECT[c.strong[3]!], `${c.id} #3 ${c.strong[3]} declared ${first} at ${at.toFixed(2)} s`).toContain(first);
      expect(at, c.id).toBeLessThan(2.4);
    }
  });
});
