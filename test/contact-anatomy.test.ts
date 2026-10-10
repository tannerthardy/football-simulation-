import { describe, expect, it } from 'vitest';
import { measureContactAnatomy, type ContactAnatomyPlay } from '../scripts/contact-anatomy-measures.js';
import type { Frame, PlayEvent } from '../src/sim/types.js';

function play(kind: 'run' | 'pass' = 'run'): ContactAnatomyPlay {
  const frame = (t: number, x: number): Frame => ({ t, agents: [40, 0, 0, x, 0, 0, 80, 0, 0], ball: [x, 0, 1], carrier: 1 });
  const events: PlayEvent[] = [{ type: 'snap', t: 0, a: 0 },
    kind === 'run' ? { type: 'handoff', t: 1, a: 0, b: 1 } : { type: 'catch', t: 1, a: 1, pos: { x: 42.25, y: 0 } },
    { type: 'carrier_contact', t: 2, a: 1, b: 2, pos: { x: 43.25, y: 0 } },
    // The primary tackle actor is at x=80; it is not the carrier endpoint.
    { type: 'tackle', t: 2.5, a: 2, b: 1, pos: { x: 80, y: 0 } }];
  return { kind, outcome: 'tackle', yards: 6, stats: { completed: kind === 'pass', attempted: kind === 'pass',
    sacked: false, scramble: false, throwaway: false, pressured: false, dropped: false,
    tacklers: ['defender'], missedTackles: 0, brokenTackles: 0 },
    replay: { los: 40, firstDownX: 50, flip: false, players: [
      { team: 'O', slot: 'QB', name: 'QB', jersey: 1, pos: 'QB' },
      { team: 'O', slot: 'RB', name: 'Carrier', jersey: 2, pos: 'RB' },
      { team: 'D', slot: 'FS', name: 'Defender', jersey: 3, pos: 'S' }],
      events, frames: [frame(1, 42.2), frame(2, 43.2), frame(2.4, 44.8), frame(2.6, 45.2)] } };
}

describe('contact anatomy measurement definitions', () => {
  it('does not move actual first contact earlier for misses, hits or broken attempts', () => {
    const p = play();
    p.replay!.events.splice(2, 0, ...(['missed_tackle', 'hit', 'broken_tackle'] as const)
      .map(type => ({ type, t: 1.2, a: 2, b: 1, pos: { x: 41, y: 0 } })));
    const s = measureContactAnatomy(p)!;
    expect(s.metrics.handoffToContact).toBe(1);
    expect(s.metrics.yardsBeforeContact).toBe(3.25);
    expect(s.metrics.yardsAfterContact).toBeCloseTo(1.75, 10);
    expect(s.metrics.contactToTackle).toBe(.5);
  });

  it('excludes interception returns even when inconsistent legacy stats say completed', () => {
    const p = play('pass');
    p.stats!.interceptedBy = 'defender';
    expect(measureContactAnatomy(p)).toBeNull();
    delete p.stats!.interceptedBy;
    p.replay!.events.splice(2, 0, { type: 'interception', t: 1.5, a: 2 });
    expect(measureContactAnatomy(p)).toBeNull();
  });

  it('requires canonical actual contact, not a miss, hit or wrap alone', () => {
    const p = play();
    p.replay!.events[2] = { type: 'tackle_wrap', t: 2, a: 2, b: 1 };
    expect(measureContactAnatomy(p)).toBeNull();
  });

  it('measures only contact and tackle on the offensive catch recipient', () => {
    const p = play('pass');
    p.replay!.events.splice(2, 0, { type: 'carrier_contact', t: 1.2, a: 0, b: 2, pos: { x: 40, y: 0 } });
    const s = measureContactAnatomy(p)!;
    expect(s.carrier).toBe(1);
    expect(s.metrics.catchToContact).toBe(1);
    expect(s.metrics.yardsCatchToContact).toBe(1);
    p.replay!.events.at(-1)!.b = 0;
    expect(measureContactAnatomy(p)).toBeNull();
  });

  it('does not use contact before possession transfer, including equal-time event order', () => {
    const p = play();
    const contact = p.replay!.events.splice(2, 1)[0];
    contact.t = 1;
    p.replay!.events.splice(1, 0, contact);
    expect(measureContactAnatomy(p)).toBeNull();
    p.replay!.events.splice(1, 1);
    contact.t = .9;
    p.replay!.events.splice(2, 0, contact);
    expect(measureContactAnatomy(p)).toBeNull();
  });

  it('keeps actual carrier displacement separate from the tackler and official spot', () => {
    const s = measureContactAnatomy(play())!;
    expect(s.endpoints).toEqual({ officialGain: 6, carrierTerminalGain: 5, officialMinusCarrierTerminal: 1 });
    expect(s.metrics.yardsAfterContact).toBeCloseTo(1.75, 10);
  });

  it('excludes incomplete, nullified, fumbled and non-tackle endings', () => {
    const incomplete = play('pass'); incomplete.stats!.completed = false;
    const nullified = play(); nullified.nullified = true;
    const fumbled = play(); fumbled.replay!.events.splice(3, 0, { type: 'fumble', t: 2.1, a: 1 });
    const oob = play(); oob.outcome = 'oob';
    const chained = play('pass'); chained.replay!.events.splice(2, 0, { type: 'handoff', t: 1.2, a: 1, b: 0 });
    for (const p of [incomplete, nullified, fumbled, oob, chained]) expect(measureContactAnatomy(p)).toBeNull();
  });

  it('rejects unbracketed terminal samples instead of inventing an endpoint', () => {
    const p = play(); p.replay!.frames.pop();
    expect(measureContactAnatomy(p)).toBeNull();
  });
});
