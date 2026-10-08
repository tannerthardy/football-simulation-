/**
 * Defensive fronts (technique alignments relative to offensive strength),
 * coverages and pressures.
 */
import type { Coverage, Front, Pressure } from './types.js';

const DL = 0.9; // DL depth off the ball
const LB = 4.6;

export const FRONTS: Front[] = [
  {
    id: 'over', name: '4-3 Over', personnel: ['base43', 'nickel', 'dime'],
    slots: {
      DE_S: { tech: '6', side: 'S', depth: DL },
      DT_S: { tech: '3', side: 'S', depth: DL },
      DT_W: { tech: '1', side: 'W', depth: DL },
      DE_W: { tech: '5', side: 'W', depth: DL },
      LB_S: { tech: '7', side: 'S', depth: LB - 0.5 },
      LB_M: { tech: '1', side: 'S', depth: LB + 0.4 },
      LB_W: { tech: '3', side: 'W', depth: LB },
    },
  },
  {
    id: 'under', name: '4-3 Under', personnel: ['base43', 'nickel'],
    slots: {
      DE_S: { tech: '5', side: 'S', depth: DL },
      DT_S: { tech: '1', side: 'S', depth: DL },
      DT_W: { tech: '3', side: 'W', depth: DL },
      DE_W: { tech: 'w9', side: 'W', depth: DL },
      LB_S: { tech: '9', side: 'S', depth: 1.0 },
      LB_M: { tech: '3', side: 'S', depth: LB + 0.3 },
      LB_W: { tech: '2', side: 'W', depth: LB },
    },
  },
  {
    id: 'wide9', name: 'Wide-9 Nickel', personnel: ['nickel', 'dime'],
    slots: {
      DE_S: { tech: 'w9', side: 'S', depth: DL },
      DT_S: { tech: '3', side: 'S', depth: DL },
      DT_W: { tech: '2i', side: 'W', depth: DL },
      DE_W: { tech: 'w9', side: 'W', depth: DL },
      LB_M: { tech: '2', side: 'S', depth: LB + 0.3 },
      LB_W: { tech: '2', side: 'W', depth: LB },
    },
  },
  {
    id: 'tite', name: '3-4 Tite', personnel: ['base34'],
    fits: { DT_S: { gap: 'B', side: 'S', technique: 'control' }, DT_W: { gap: 'B', side: 'W', technique: 'control' }, NT: { gap: 'A', side: 'W', technique: 'lag' } },
    slots: {
      DE_S: { tech: '9', side: 'S', depth: DL },
      DT_S: { tech: '4i', side: 'S', depth: DL },
      NT: { tech: '0', side: 'S', depth: DL },
      DT_W: { tech: '4i', side: 'W', depth: DL },
      DE_W: { tech: 'w9', side: 'W', depth: DL },
      LB_M: { tech: '3', side: 'S', depth: LB },
      LB_W: { tech: '3', side: 'W', depth: LB },
    },
  },
  {
    id: 'odd', name: '3-4 Odd', personnel: ['base34'],
    slots: {
      DE_S: { tech: '9', side: 'S', depth: DL },
      DT_S: { tech: '5', side: 'S', depth: DL },
      NT: { tech: '0', side: 'S', depth: DL },
      DT_W: { tech: '5', side: 'W', depth: DL },
      DE_W: { tech: 'w9', side: 'W', depth: DL },
      LB_M: { tech: '2', side: 'S', depth: LB },
      LB_W: { tech: '2', side: 'W', depth: LB },
    },
  },
  {
    id: 'bear', name: 'Bear (goal line)', personnel: ['goalline'],
    slots: {
      DE_S: { tech: '6', side: 'S', depth: DL },
      DT_S: { tech: '3', side: 'S', depth: DL },
      NT: { tech: '0', side: 'S', depth: DL },
      DT_W: { tech: '3', side: 'W', depth: DL },
      DE_W: { tech: '5', side: 'W', depth: DL },
      LB_S: { tech: '9', side: 'S', depth: 2.5 },
      LB_M: { tech: '2', side: 'S', depth: 3.5 },
      LB_W: { tech: '4', side: 'W', depth: 3.5 },
    },
  },
];

export { COVERAGES, COVERAGE_BY_ID } from './coverages.js';

export const PRESSURES: Pressure[] = [
  {
    id: 'mike_a', name: 'Mike A-Gap', blitzers: { LB_M: { gap: 'A', side: 'S' } },
    coverages: ['cover1', 'cover3', 'cover0'],
  },
  {
    id: 'will_b', name: 'Will B-Gap', blitzers: { LB_W: { gap: 'B', side: 'W' } },
    coverages: ['cover1', 'cover3'],
  },
  {
    id: 'double_a', name: 'Double-A Mug', blitzers: { LB_M: { gap: 'A', side: 'S' }, LB_W: { gap: 'A', side: 'W' } },
    coverages: ['cover0', 'cover1'],
  },
  {
    id: 'nickel_edge', name: 'Nickel Edge', blitzers: { NB: { gap: 'D', side: 'S' } },
    coverages: ['cover1', 'cover3'],
  },
  {
    id: 'fire_zone', name: 'Fire Zone (SS + Will, DE drops)', blitzers: { SS: { gap: 'C', side: 'S' }, LB_W: { gap: 'B', side: 'W' } },
    droppers: { DE_W: 'curl_flat_w' },
    coverages: ['cover3'],
  },
  {
    id: 'zero_6', name: 'Zero Blitz', blitzers: { LB_M: { gap: 'A', side: 'S' }, LB_W: { gap: 'B', side: 'W' }, SS: { gap: 'C', side: 'S' } },
    coverages: ['cover0'],
  },
];

export const FRONT_BY_ID: Record<string, Front> = Object.fromEntries(FRONTS.map((f) => [f.id, f]));
export const PRESSURE_BY_ID: Record<string, Pressure> = Object.fromEntries(PRESSURES.map((p) => [p.id, p]));
