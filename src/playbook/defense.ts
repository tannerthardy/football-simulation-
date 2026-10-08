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

export const COVERAGES: Coverage[] = [
  {
    id: 'cover0', name: 'Cover 0', shell: 'zero', man: true, press: true,
    roles: {
      CB_S: { kind: 'man', prefer: ['S1'] },
      CB_W: { kind: 'man', prefer: ['W1'] },
      NB: { kind: 'man', prefer: ['S2', 'W2'] },
      DB: { kind: 'man', prefer: ['W2', 'S3'] },
      SS: { kind: 'man', prefer: ['S3', 'W2', 'S2'] },
      FS: { kind: 'man', prefer: ['W2', 'S3', 'B'] },
      LB_S: { kind: 'man', prefer: ['S3', 'B'] },
      LB_M: { kind: 'man', prefer: ['B', 'B2'] },
      LB_W: { kind: 'man', prefer: ['B', 'W2'] },
    },
    underneath: [],
  },
  {
    id: 'cover1', name: 'Cover 1 (Man-Free)', shell: 'one-high', man: true, press: true,
    roles: {
      CB_S: { kind: 'man', prefer: ['S1'] },
      CB_W: { kind: 'man', prefer: ['W1'] },
      NB: { kind: 'man', prefer: ['S2', 'W2'] },
      DB: { kind: 'man', prefer: ['W2', 'S3'] },
      SS: { kind: 'man', prefer: ['S3', 'S2', 'W2'] },
      FS: { kind: 'zone', zone: 'deep_mid' },
      LB_S: { kind: 'man', prefer: ['S3', 'B'] },
      LB_M: { kind: 'zone', zone: 'robber' },
      LB_W: { kind: 'man', prefer: ['B', 'W2'] },
    },
    underneath: [],
  },
  {
    id: 'cover2', name: 'Cover 2', shell: 'two-high', man: false, press: false,
    roles: {
      CB_S: { kind: 'zone', zone: 'flat_s' },
      CB_W: { kind: 'zone', zone: 'flat_w' },
      SS: { kind: 'zone', zone: 'deep_half_s' },
      FS: { kind: 'zone', zone: 'deep_half_w' },
    },
    // Corners squat the flats; the hooks and the Mike's middle hook come first.
    underneath: ['hook_s', 'hook_w', 'hook_mid', 'curl_flat_s', 'curl_flat_w'],
  },
  {
    id: 'tampa2', name: 'Tampa 2', shell: 'two-high', man: false, press: false,
    roles: {
      CB_S: { kind: 'zone', zone: 'flat_s' },
      CB_W: { kind: 'zone', zone: 'flat_w' },
      SS: { kind: 'zone', zone: 'deep_half_s' },
      FS: { kind: 'zone', zone: 'deep_half_w' },
      LB_M: { kind: 'zone', zone: 'tampa_mid' },
    },
    underneath: ['hook_s', 'hook_w', 'curl_flat_s', 'curl_flat_w'],
  },
  {
    id: 'cover2man', name: '2-Man', shell: 'two-high', man: true, press: true,
    roles: {
      CB_S: { kind: 'man', prefer: ['S1'] },
      CB_W: { kind: 'man', prefer: ['W1'] },
      NB: { kind: 'man', prefer: ['S2', 'W2'] },
      DB: { kind: 'man', prefer: ['W2', 'S3'] },
      SS: { kind: 'zone', zone: 'deep_half_s' },
      FS: { kind: 'zone', zone: 'deep_half_w' },
      LB_S: { kind: 'man', prefer: ['S3', 'S2', 'B'] },
      LB_M: { kind: 'man', prefer: ['S3', 'B', 'W2'] },
      LB_W: { kind: 'man', prefer: ['B', 'W2'] },
    },
    underneath: [],
  },
  {
    id: 'cover3', name: 'Cover 3', shell: 'one-high', man: false, press: false,
    roles: {
      CB_S: { kind: 'zone', zone: 'deep_third_s' },
      CB_W: { kind: 'zone', zone: 'deep_third_w' },
      FS: { kind: 'zone', zone: 'deep_mid' },
    },
    // Three deep, four under: two curl-flat + two hooks; a fifth dropper takes the middle hook.
    underneath: ['curl_flat_s', 'curl_flat_w', 'hook_s', 'hook_w', 'hook_mid'],
  },
  {
    id: 'cover4', name: 'Cover 4 (Quarters)', shell: 'two-high', man: false, press: false,
    roles: {
      CB_S: { kind: 'zone', zone: 'quarter_s_out' },
      CB_W: { kind: 'zone', zone: 'quarter_w_out' },
      SS: { kind: 'zone', zone: 'quarter_s_in' },
      FS: { kind: 'zone', zone: 'quarter_w_in' },
    },
    underneath: ['curl_flat_s', 'curl_flat_w', 'hook_mid', 'hook_s', 'hook_w'],
  },
  {
    id: 'cover6', name: 'Cover 6', shell: 'two-high', man: false, press: false,
    roles: {
      CB_S: { kind: 'zone', zone: 'quarter_s_out' },
      SS: { kind: 'zone', zone: 'quarter_s_in' },
      FS: { kind: 'zone', zone: 'deep_half_w' },
      CB_W: { kind: 'zone', zone: 'flat_w' },
    },
    underneath: ['curl_flat_s', 'hook_mid', 'hook_w', 'hook_s'],
  },
];

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
export const COVERAGE_BY_ID: Record<string, Coverage> = Object.fromEntries(COVERAGES.map((c) => [c.id, c]));
export const PRESSURE_BY_ID: Record<string, Pressure> = Object.fromEntries(PRESSURES.map((p) => [p.id, p]));
