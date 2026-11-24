/** ARRIVE_LEAD (defense.ts; experimental, off): on a short completion the nearest underneath zone defender, who
 * cannot beat the ball to the catch, drives to the catcher's upfield shoulder. Measured in live plays (curl/flat,
 * slant/flat and stick against spot Cover 3): at the catch his line of travel crosses the catcher's lateral line
 * further upfield of the catcher. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StagedThrow } from '../src/sim/playsim.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** Staged throws (PlaySetup.stagedThrow): the start, receiver, aim point and flight time develop's QB produced on each
 * play (recorded 2026-11-14 at 45e17fcc, ARRIVE_LEAD off; at 99: he did not throw by 5 s), so a change in the QB does not move this defensive
 * panel. */
const STAGED: Record<string, StagedThrow> = {
  'curl_flat 1': { at: 3.25, slot: 'X', aim: { x: 49.07824426839483, y: 38.978206673768476, z: 0.464884530945363 }, T: 1.1912397312461416 },
  'curl_flat 2': { at: 3.45, slot: 'X', aim: { x: 49.37487690245887, y: 43.474422354367185, z: 0.4 }, T: 1.0785959324110674 },
  'curl_flat 3': { at: 99, slot: 'X' },
  'curl_flat 4': { at: 99, slot: 'X' },
  'curl_flat 5': { at: 3.1, slot: 'H', aim: { x: 60.93696015602997, y: 57.89758748738953, z: 0.9668027060363621 }, T: 2.1884724376310216 },
  'curl_flat 6': { at: 99, slot: 'X' },
  'curl_flat 7': { at: 3.2, slot: 'X', aim: { x: 48.630287747822926, y: 40.11547556561266, z: 1.7720189625054696 }, T: 0.9394762414902134 },
  'curl_flat 8': { at: 3.05, slot: 'H', aim: { x: 49.0973313840371, y: 50.99272781945769, z: 3.2378034764466213 }, T: 1.1243969702610137 },
  'curl_flat 9': { at: 99, slot: 'X' },
  'curl_flat 10': { at: 3.55, slot: 'X', aim: { x: 50.62220496885768, y: 41.12486090114985, z: 1.1412925747325775 }, T: 1.1171619897134808 },
  'curl_flat 11': { at: 3.2, slot: 'X', aim: { x: 48.21488799921075, y: 41.05205326853571, z: 0.8982280861219062 }, T: 0.9298958377900439 },
  'curl_flat 12': { at: 3.2, slot: 'X', aim: { x: 50.034257102256944, y: 38.08782220710584, z: 1.306915520022799 }, T: 0.8805237044836124 },
  'slant_flat 1': { at: 0.95, slot: 'Z', aim: { x: 47.018299052317396, y: 13.393523404845272, z: 1.0283996609737183 }, T: 0.6857788451516733 },
  'slant_flat 2': { at: 99, slot: 'X' },
  'slant_flat 3': { at: 1.75, slot: 'Z', aim: { x: 50.73189888700032, y: 20.29522366907386, z: 1.406993820903329 }, T: 0.8172910991136128 },
  'slant_flat 4': { at: 2.55, slot: 'H', aim: { x: 49.07780730413856, y: 47.11755596948949, z: 1.612757969557649 }, T: 1.685882862542543 },
  'slant_flat 5': { at: 2.75, slot: 'H', aim: { x: 54.56744167703174, y: 58.60662216499473, z: 0.9308125645275283 }, T: 1.4844777094824273 },
  'slant_flat 6': { at: 1, slot: 'Z', aim: { x: 47.26024146079307, y: 11.389549703343494, z: 1.0445799584775344 }, T: 0.7202612723010124 },
  'slant_flat 7': { at: 3, slot: 'H', aim: { x: 55.88161623127298, y: 51.051517497325975, z: 1.9578240732121177 }, T: 2.40925537692069 },
  'slant_flat 8': { at: 3.3, slot: 'H', aim: { x: 56.78445423697813, y: 50.95527251264703, z: 3.4508975714987047 }, T: 2.496304565004336 },
  'slant_flat 9': { at: 2, slot: 'H', aim: { x: 46.34481553411222, y: 51.847555191758026, z: 1.705631045366489 }, T: 1.104946785375389 },
  'slant_flat 10': { at: 0.95, slot: 'Z', aim: { x: 46.292590237872446, y: 13.81818368207781, z: 1.1760982695561766 }, T: 0.6988437950872034 },
  'slant_flat 11': { at: 3, slot: 'H', aim: { x: 56.25338616819468, y: 52.048617975517004, z: 0.9004101006010602 }, T: 2.5876102128461804 },
  'slant_flat 12': { at: 1.3, slot: 'Z', aim: { x: 49.17527113784019, y: 13.304938207747641, z: 1.3020821032332857 }, T: 0.7174028158065584 },
  'stick 1': { at: 1.55, slot: 'Y', aim: { x: 47.37188682243456, y: 19.9721416236776, z: 1.053882767352464 }, T: 0.7860823303618374 },
  'stick 2': { at: 1.3, slot: 'Y', aim: { x: 45.35258568962317, y: 23.251434155828814, z: 1.0538401274209455 }, T: 0.6733556769310036 },
  'stick 3': { at: 1.55, slot: 'Y', aim: { x: 47.40595340759629, y: 21.272332209667116, z: 1.3956298549239872 }, T: 0.772497611523877 },
  'stick 4': { at: 1.8, slot: 'Y', aim: { x: 47.344842760827156, y: 17.992781357404812, z: 1.4591022803596583 }, T: 0.985725730988659 },
  'stick 5': { at: 1.55, slot: 'Y', aim: { x: 47.57970525243517, y: 21.245568498458322, z: 1.2588520532431295 }, T: 0.7341038737414495 },
  'stick 6': { at: 1.85, slot: 'X', aim: { x: 48.056793457364485, y: 31.58542423523495, z: 0.8496647634153818 }, T: 0.8523162300565401 },
  'stick 7': { at: 1.55, slot: 'Y', aim: { x: 46.71516216422797, y: 20.286858889932194, z: 1.645611299533288 }, T: 0.7995220910442863 },
  'stick 8': { at: 1.55, slot: 'Y', aim: { x: 45.97476185343308, y: 20.260749510065406, z: 2.2909113633819005 }, T: 0.798555864023577 },
  'stick 9': { at: 2.25, slot: 'X', aim: { x: 49.00893118387824, y: 28.087548722819847, z: 1.5927033868132796 }, T: 1.0431017430012002 },
  'stick 10': { at: 1.95, slot: 'H', aim: { x: 47.470576866455986, y: 34.023144994214405, z: 1.1796454115988009 }, T: 1.1495933568397263 },
  'stick 11': { at: 1.55, slot: 'Y', aim: { x: 46.6029854797888, y: 20.786310191088297, z: 1.1036983062867853 }, T: 0.8072988057337481 },
  'stick 12': { at: 1.8, slot: 'X', aim: { x: 48.66911850064066, y: 31.356812328493987, z: 1.3018716630875975 }, T: 0.7937124125677456 },
};

async function plays(flag: string) {
  vi.resetModules();
  vi.stubEnv('ARRIVE_LEAD', flag);
  // Pinned to FLIGHT_BREAK=0 (engine-93, Coverage C14): ARRIVE_LEAD steers the can't-beat-the-ball drive to the catch
  // point, a path FLIGHT_BREAK replaces (its moving break takes that defender before this branch); with the break on
  // the lead's own effect is not reached (on and off medians are identical, 2.34 yd). Owner: Coverage. Remove this test with
  // ARRIVE_LEAD when FLIGHT_BREAK=0's paths (flightApproach's fixed catch-point drive) are retired.
  vi.stubEnv('FLIGHT_BREAK', '0');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { ZoneCoverage } = await import('../src/sim/behaviors/defense.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const offense = generateTeam(new Rng(51), 'Lead offense', 'LDO', { strength: .55 });
  const defense = generateTeam(new Rng(52), 'Lead defense', 'LDD', { strength: .55 });
  const angles: number[] = [];
  for (const concept of ['curl_flat', 'slant_flat', 'stick'] as const) for (let seed = 1; seed <= 12; seed++) {
    const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID[concept], label: 'lead' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
        pressure: null, zoneStyle: 'spot', label: 'lead' }, los: 40, ballY: 26, firstDownX: 50, seed, stagedThrow: STAGED[`${concept} ${seed}`] });
    let thrown = false, caught: { c: { pos: { x: number; y: number } }; d: { idx: number; vel: { x: number; y: number }; pos: { x: number; y: number } }; t: number } | null = null;
    while (sim.t < 5) {
      sim.tick();
      const air = sim.ball.kind === 'air';
      if (air) thrown = true;
      else if (thrown && !caught && sim.ball.kind === 'held' && sim.ball.carrier !== sim.qb && sim.ball.carrier.team !== sim.defense[0].team) {
        const c = sim.ball.carrier;
        if (c.pos.x - sim.los > 10) break;
        const d = sim.defense.filter(x => x.behavior instanceof ZoneCoverage && !(x.behavior as { plastersScramble?: boolean }).plastersScramble)
          .sort((p, q) => Math.hypot(p.pos.x - c.pos.x, p.pos.y - c.pos.y) - Math.hypot(q.pos.x - c.pos.x, q.pos.y - c.pos.y))[0];
        if (!d || Math.hypot(d.vel.x, d.vel.y) < 1) break;
        caught = { c, d: { idx: d.idx, vel: { ...d.vel }, pos: { ...d.pos } }, t: sim.t };

        const { vel, pos } = caught.d;
        // Where his line of travel crosses the catcher's lateral line, yd upfield of the catcher.
        if (Math.abs(vel.y) > 0.3 && (c.pos.y - pos.y) * vel.y > 0) angles.push(pos.x + vel.x * (c.pos.y - pos.y) / vel.y - c.pos.x);
        break;
      } else if (thrown && !air && !caught) break;
    }
  }
  return angles;
}

describe('ARRIVE_LEAD: an underneath zone defender leads the catcher on a short throw', () => {
  it('at the catch his line of travel crosses the catcher further upfield', async () => {
    const off = await plays('0'), on = await plays('1');
    const median = (v: number[]) => [...v].sort((p, q) => p - q)[Math.floor(v.length / 2)];
    expect(off.length).toBeGreaterThan(5);
    expect(on.length).toBeGreaterThan(5);
    expect(median(on)).toBeGreaterThan(median(off) + 0.3);
  }, 120_000);
});
