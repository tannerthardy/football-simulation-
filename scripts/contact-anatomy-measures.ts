/** Replay contact measurements. Only carrier_contact proves actual contact. */
import type { PlayLog } from '../src/game/game.js';
import type { Frame, PlayEvent } from '../src/sim/types.js';

export type ContactAnatomyPlay = Pick<PlayLog, 'kind' | 'outcome' | 'nullified' | 'stats' | 'replay' | 'yards'>;
export interface ContactAnatomySample {
  cohort: 'designedRuns' | 'completions';
  carrier: number;
  metrics: Record<string, number>;
  /** Official spot is deliberately separate from recorded body displacement. */
  endpoints: { officialGain: number; carrierTerminalGain: number; officialMinusCarrierTerminal: number };
}

/** Linear interpolation of rounded body coordinates, never the tackler's event
 * position or the dead-ball/forward-progress spot. Reject unbracketed times. */
function carrierX(frames: Frame[], carrier: number, t: number): number | null {
  const next = frames.findIndex(f => f.t >= t - 1e-7);
  if (next < 0) return null;
  const right = frames[next], x = right.agents[carrier * 3];
  if (!Number.isFinite(x)) return null;
  if (Math.abs(right.t - t) < 1e-7) return x;
  if (next === 0) return null;
  const left = frames[next - 1], before = left.agents[carrier * 3];
  if (!Number.isFinite(before) || right.t <= left.t) return null;
  return before + (x - before) * (t - left.t) / (right.t - left.t);
}

function eventCarrierX(event: PlayEvent, frames: Frame[], carrier: number): number | null {
  // event.pos belongs to a, not b: tackle.pos is usually the tackler.
  return event.a === carrier && Number.isFinite(event.pos?.x)
    ? event.pos!.x : carrierX(frames, carrier, event.t);
}

/** Event-complete, tackled-in-field carries without possession chains. The
 * strict exclusions reduce ambiguity; this is not an identical NFL cohort. */
export function measureContactAnatomy(play: ContactAnatomyPlay): ContactAnatomySample | null {
  const replay = play.replay, stats = play.stats;
  if (!replay || !stats || play.nullified || play.outcome !== 'tackle'
    || (play.kind !== 'run' && play.kind !== 'pass') || stats.scramble || stats.sacked
    || stats.interceptedBy || stats.fumbledBy || stats.fumbleRecoveredBy || stats.fumbleLost) return null;
  const events = replay.events;
  if (events.some(e => ['interception', 'fumble', 'recovery', 'pitch', 'pitch_catch'].includes(e.type))) return null;
  const cohort = play.kind === 'run' ? 'designedRuns' : 'completions';
  if (cohort === 'completions' && !stats.completed) return null;
  if (events.filter(e => e.type === 'handoff' || e.type === 'catch').length !== 1) return null;
  const transfers = events.filter(e => e.type === (cohort === 'designedRuns' ? 'handoff' : 'catch'));
  if (transfers.length !== 1) return null;
  const transfer = transfers[0], transferIndex = events.indexOf(transfer);
  const carrier = cohort === 'designedRuns' ? transfer.b : transfer.a;
  if (carrier === undefined || replay.players[carrier]?.team !== 'O') return null;
  // A different player's hit/whiff cannot shift this carrier's first contact.
  // Require acquisition to precede contact in both event order and time.
  const contactIndex = events.findIndex((e, i) => i > transferIndex && e.t >= transfer.t
    && e.type === 'carrier_contact' && e.a === carrier);
  if (contactIndex < 0) return null;
  const contact = events[contactIndex];
  const tackle = events.find((e, i) => i > contactIndex && e.t >= contact.t
    && e.type === 'tackle' && e.b === carrier);
  if (!tackle) return null;
  const snap = events.find(e => e.type === 'snap');
  if (!snap || snap.t > transfer.t) return null;
  const firstX = eventCarrierX(contact, replay.frames, carrier);
  const lastX = carrierX(replay.frames, carrier, tackle.t);
  if (firstX === null || lastX === null || !Number.isFinite(replay.los)) return null;
  const metrics: Record<string, number> = {
    contactToTackle: tackle.t - contact.t,
    yardsAfterContact: lastX - firstX,
  };
  if (cohort === 'designedRuns') {
    metrics.snapToHandoff = transfer.t - snap.t;
    metrics.handoffToContact = contact.t - transfer.t;
    metrics.yardsBeforeContact = firstX - replay.los;
  } else {
    const catchX = eventCarrierX(transfer, replay.frames, carrier);
    if (catchX === null) return null;
    metrics.catchToContact = contact.t - transfer.t;
    metrics.yardsCatchToContact = firstX - catchX;
  }
  const carrierTerminalGain = lastX - replay.los;
  return { cohort, carrier, metrics, endpoints: { officialGain: play.yards, carrierTerminalGain,
    officialMinusCarrierTerminal: play.yards - carrierTerminalGain } };
}
