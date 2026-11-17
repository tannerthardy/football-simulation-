/** ZONE_EYES (on by default, engine-76; ZONE_EYES=0 turns it off; C14 zone coached rules item 13, 2026-11-17): a zone defender's eyes follow the sequence
 * coaches teach, on one head, and he sees through that head. Off, with GAZE and HEAD off, SIGHT_COVER gives a zone
 * defender occlusion-only sight with no view bound: facing the QB he had every receiver at once, a bailing corner the
 * whole field behind him. On, his head (`Agent.head`, head.ts's turn rate and neck range) is wanted on his key for the
 * declare phase, then on the passer; what is inside the head's view cone (HEAD_CONE, about 90 deg a side: central and
 * peripheral vision) he sees with the existing delays, what is outside it he does not see and his picture of it ages
 * (SIGHT_COVER's head view, release-evidence's head cone). What his controller watches (the carrier he chases, via
 * PlaySim.lookAt) takes the head first. Under BALL_EST with defenders estimating (not the default), the ball estimate
 * keeps its own head (as with HEAD off): sharing it with this one raised staged zone YAC unexplained on the honest arm
 * (cover 3 19.0 to 26.2; two repairs did not move it), so unifying them is an open item, not part of this flag.
 *
 * The sequence, as taught (sources in docs/reviews/2026-11-17-zone-coached-rules.md):
 *  - underneath (flat, curl-flat): his side's #2 ("key #2", "eyes on #2 first"), then the QB at his landmark;
 *  - hook, middle hook, hole, robber, curl: #3 ("final 3 through"), else #2, then the QB;
 *  - deep thirds, halves, quarter-outside: #1's release ("read #1 to #2"), then the QB through #2;
 *  - quarter-inside, deep middle, Tampa middle: #2 ("read #2"; the post reads both #2s), then the QB.
 * The declare phase is EYES_KEY_SPAN after the snap (a stated choice: the 3-step / 5-yard declare most sources give,
 * read at 0.6 and 1.2 s via ZONE_EYES_KEY). Before the snap his head is on the passer. No outcome is decided here. */
import type { ZoneId } from '../playbook/types.js';
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';
import { lastReleaseBelief } from './release-belief.js';
import { shoulderPickOf } from './behaviors/defense.js';

export const ZONE_EYES = process.env.ZONE_EYES !== '0';
export const EYES_KEY_SPAN = Number(process.env.ZONE_EYES_KEY ?? 0.9);

/** The zone each defender was given at the snap (his own assignment, not the offense's). */
const zones = new WeakMap<Agent, ZoneId>();
export function setEyeZone(a: Agent, zone: ZoneId): void { zones.set(a, zone); }

/** Does this defender's head follow the zone sequence now (a zone defender playing a zone technique)? */
export function zoneEyesFor(a: Agent): boolean {
  if (!ZONE_EYES || a.team !== 'D' || !zones.has(a)) return false;
  const b = a.behavior as { kind?: string; zoneEyes?: boolean } | undefined;
  return b?.kind === 'zone' && b.zoneEyes !== false;
}

type Ref = 'S1' | 'S2' | 'S3' | 'W1' | 'W2' | 'W3';
function keyRefs(zone: ZoneId): Ref[] {
  const side = zone.endsWith('_w') || zone.includes('_w_') ? 'W' : 'S';
  const r = (...n: number[]) => n.map((k) => `${side}${k}` as Ref);
  if (zone.startsWith('flat') || zone.startsWith('curl_flat')) return r(2, 1);
  if (zone.startsWith('hook_s') || zone.startsWith('hook_w')) return r(3, 2);
  if (zone === 'hook_mid' || zone === 'hole' || zone === 'robber' || zone.startsWith('curl')) return ['S3', 'S2'];
  if (zone.startsWith('deep_third') || zone.startsWith('deep_half') || (zone.startsWith('quarter') && zone.endsWith('out'))) return r(1, 2);
  if (zone.startsWith('quarter')) return r(2, 1);
  return ['S2', 'W2'];
}

/** What the sequence wants him looking at this tick: his key in the declare phase, else the passer. */
export function zoneEyesTarget(a: Agent, sim: PlaySim): Agent | null {
  const zone = zones.get(a);
  if (!zone || !sim.qb) return null;
  // The throw, as he believes it: his eyes go from the passer's arm to the receiver his shoulder read picked ("eyes from
  // the elbow to the receiver, not the ball"); with no pick, they stay on the passer. A carrier he chases is asked for
  // through PlaySim.lookAt (a want), which takes the head first.
  if (lastReleaseBelief(sim, a)?.releasedAt !== undefined) return shoulderPickOf(a)?.R ?? sim.qb;
  if (sim.t < 0 || sim.t > EYES_KEY_SPAN) return sim.qb;
  for (const ref of keyRefs(zone)) {
    const slot = sim.offAlign.numbering[ref];
    const r = slot ? sim.slot(slot) : undefined;
    if (r && r !== sim.qb) return r;
  }
  return sim.qb;
}
