/**
 * The film weirdness probe: five detectors over the games a scorecard run
 * already plays (see detectors.ts, docs/VALIDATION.md). Its metrics are rates;
 * the events themselves ride on each GameRec (`weird`) and are listed in the
 * report's "Watch these first" section and written to a JSON file.
 */
import type { Metric } from '../metrics.js';
import type { Probe } from '../probes.js';
import { weirdObserver } from './observe.js';

/** "Plays with at least one event" and "events per 100 eligible plays" for one detector. */
function pair(id: string, what: string, eligible: string, den: string): Metric[] {
  return [
    { id: `weird.${id}.plays`, label: `${what}: plays with one or more (% of ${eligible})`, scale: 100, unit: '%',
      probe: { num: `weird.${id}.playsHit`, den: `weird.${den}` } },
    { id: `weird.${id}.rate`, label: `${what}: events per 100 ${eligible}`, scale: 100,
      probe: { num: `weird.${id}.events`, den: `weird.${den}` } },
  ];
}

export const weirdProbe: Probe = {
  id: 'weird',
  collect: () => ({}),
  observe(ctx) {
    const o = weirdObserver(ctx);
    return {
      hooks: o.hooks,
      finish(res, rec) {
        const { events, sums, ms } = o.finish(res);
        rec.weird = { events, ms };
        return sums;
      },
    };
  },
  metrics: [
    ...pair('presnap', 'Pre-snap teammate contact', 'plays with pre-snap staging', 'staged'),
    { id: 'weird.presnap.control', label: 'Pre-snap teammate contact with no motion called (control, expect 0): events per 100 plays with staging and no motion', scale: 100,
      probe: { num: 'weird.presnap.noMotion', den: 'weird.stagedNoMotion' } },
    { id: 'weird.presnap.motionMan', label: 'Pre-snap contact involving the motion man (% of pre-snap contact events)', scale: 100, unit: '%',
      probe: { num: 'weird.presnap.motionMan', den: 'weird.presnap.events' } },
    ...pair('turned', 'Defender turned from a nearby runner', 'plays with a runner', 'runner'),
    ...pair('stuck', 'Blocker on a man out of the play', 'run plays with a runner', 'runRunner'),
    { id: 'weird.backpedal.frames', label: 'Unengaged OL running toward own backfield (candidate; % of OL frames)', scale: 100, unit: '%',
      probe: { num: 'weird.backpedal.frames', den: 'weird.olFrames' } },
    ...pair('backpedal', 'Unengaged OL running toward own backfield (candidate)', 'plays', 'plays'),
    { id: 'weird.slide.share', label: 'Sharp turns with no speed loss (candidate; % of 60°+ turns)', scale: 100, unit: '%',
      probe: { num: 'weird.slide.events', den: 'weird.slide.episodes' } },
    { id: 'weird.slide.rate', label: 'Sliding through a cut (candidate): events per 100 plays', scale: 100,
      probe: { num: 'weird.slide.events', den: 'weird.plays' } },
  ],
};
