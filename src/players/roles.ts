/**
 * Football-Manager-style roles. A role describes *how* a player plays his
 * position; suitability (0–100) is a weighted blend of ratings and athletic
 * scores derived from measurables. Depth charts, scheme fit and play callers
 * all read these.
 */
import { clamp } from '../core/vec.js';
import type { Player, Position, RatingKey } from './types.js';

export type AthleticKey =
  | 'ath:speed'
  | 'ath:burst'
  | 'ath:agility'
  | 'ath:jump'
  | 'ath:height'
  | 'ath:weight'
  | 'ath:length';

export type RoleInput = RatingKey | AthleticKey;

export interface RoleDef {
  id: string;
  name: string;
  position: Position;
  weights: Array<[RoleInput, number]>;
  description: string;
}

/** Position-relative size baselines (mean, sd) for height/weight/arm z-scores. */
const SIZE_BASE: Record<Position, { h: [number, number]; w: [number, number]; arm: [number, number] }> = {
  QB: { h: [75, 1.6], w: [220, 11], arm: [32, 0.9] },
  RB: { h: [70.5, 1.6], w: [212, 12], arm: [31, 0.9] },
  FB: { h: [72, 1.3], w: [245, 9], arm: [31.5, 0.8] },
  WR: { h: [72.8, 2.2], w: [200, 13], arm: [32, 1.1] },
  TE: { h: [76.8, 1.3], w: [250, 9], arm: [33, 0.9] },
  OT: { h: [77.6, 1.2], w: [312, 9], arm: [34, 0.9] },
  OG: { h: [76.2, 1.1], w: [315, 9], arm: [33.2, 0.9] },
  C: { h: [75.2, 1.0], w: [305, 8], arm: [32.4, 0.8] },
  EDGE: { h: [76, 1.3], w: [258, 12], arm: [33.6, 0.9] },
  DT: { h: [75.2, 1.2], w: [305, 15], arm: [33, 0.9] },
  LB: { h: [73.5, 1.3], w: [237, 9], arm: [32.2, 0.9] },
  CB: { h: [71.6, 1.6], w: [192, 8], arm: [31.4, 0.9] },
  S: { h: [72.2, 1.4], w: [205, 8], arm: [31.6, 0.9] },
  K: { h: [72, 2], w: [195, 12], arm: [31, 1] },
  P: { h: [74, 2], w: [212, 12], arm: [32, 1] },
};

/** League-absolute athletic scores on a 1–99 scale. */
export function athleticScore(p: Player, key: AthleticKey, asPosition: Position = p.position): number {
  const m = p.measurables;
  const base = SIZE_BASE[asPosition];
  switch (key) {
    case 'ath:speed':
      return clamp(99 - (m.forty - 4.25) * 70, 1, 99);
    case 'ath:burst':
      return clamp(99 - (m.tenSplit - 1.45) * 160, 1, 99);
    case 'ath:agility':
      return clamp(0.5 * (99 - (m.threeCone - 6.5) * 45) + 0.5 * (99 - (m.shuttle - 3.9) * 75), 1, 99);
    case 'ath:jump':
      return clamp((m.vertical - 25) * 4.5, 1, 99);
    case 'ath:height':
      return clamp(50 + 16 * ((m.heightIn - base.h[0]) / base.h[1]), 1, 99);
    case 'ath:weight':
      return clamp(50 + 16 * ((m.weightLb - base.w[0]) / base.w[1]), 1, 99);
    case 'ath:length':
      return clamp(50 + 16 * ((m.armIn - base.arm[0]) / base.arm[1]), 1, 99);
  }
}

export const ROLES: RoleDef[] = [
  // Quarterbacks
  { id: 'QB_POCKET', name: 'Pocket Passer', position: 'QB', description: 'Wins from the pocket with timing, accuracy and protection reads.',
    weights: [['accShort', 2], ['accMid', 3], ['accDeep', 2], ['pocketPresence', 2], ['decisionMaking', 2], ['release', 1], ['awareness', 1], ['throwPower', 1]] },
  { id: 'QB_DUAL', name: 'Dual Threat', position: 'QB', description: 'Extends plays and punishes defenses with his legs.',
    weights: [['accShort', 1.5], ['accMid', 1.5], ['throwOnRun', 2], ['ath:speed', 2], ['elusiveness', 1.5], ['vision', 1], ['decisionMaking', 1], ['throwPower', 1]] },
  { id: 'QB_GUNSLINGER', name: 'Gunslinger', position: 'QB', description: 'Big arm, attacks tight windows downfield.',
    weights: [['throwPower', 3], ['accDeep', 2.5], ['accMid', 1.5], ['composure', 1], ['release', 1]] },
  { id: 'QB_MANAGER', name: 'Game Manager', position: 'QB', description: 'Protects the ball, takes what the defense gives.',
    weights: [['decisionMaking', 3], ['accShort', 2.5], ['awareness', 2], ['pocketPresence', 1], ['ballSecurity', 1]] },
  // Running backs
  { id: 'RB_POWER', name: 'Power Back', position: 'RB', description: 'Runs through contact between the tackles.',
    weights: [['breakTackle', 3], ['ath:weight', 1.5], ['strength', 1], ['ballSecurity', 1.5], ['vision', 1.5], ['balance', 1.5]] },
  { id: 'RB_ELUSIVE', name: 'Elusive Back', position: 'RB', description: 'Makes defenders miss in space.',
    weights: [['elusiveness', 3], ['ath:agility', 2], ['ath:burst', 1.5], ['vision', 1.5], ['ath:speed', 1]] },
  { id: 'RB_RECEIVING', name: 'Receiving Back', position: 'RB', description: 'Third-down weapon out of the backfield.',
    weights: [['hands', 2.5], ['routeRunning', 2.5], ['elusiveness', 1], ['ath:agility', 1], ['passBlock', 0.5]] },
  { id: 'RB_WORKHORSE', name: 'Workhorse', position: 'RB', description: 'Every-down back with vision and durability.',
    weights: [['vision', 2], ['patience', 1.5], ['breakTackle', 1.5], ['elusiveness', 1.5], ['ballSecurity', 1.5], ['stamina', 1.5], ['ath:speed', 1]] },
  { id: 'FB_LEAD', name: 'Lead Blocker', position: 'FB', description: 'Iso and lead blocker from the I.',
    weights: [['leadBlock', 3], ['runBlock', 2], ['strength', 2], ['ath:weight', 1]] },
  // Receivers
  { id: 'WR_X', name: 'X Receiver', position: 'WR', description: 'Boundary receiver who beats press and wins contested balls.',
    weights: [['contestedCatch', 2.5], ['releaseVsPress', 2.5], ['ath:height', 1.5], ['hands', 1.5], ['routeRunning', 1.5], ['ath:jump', 1]] },
  { id: 'WR_Z', name: 'Z Flanker', position: 'WR', description: 'Off-the-ball flanker; motion, speed and separation.',
    weights: [['routeRunning', 2], ['hands', 1.5], ['ath:speed', 2], ['ballTracking', 1.5], ['elusiveness', 1]] },
  { id: 'WR_SLOT', name: 'Slot Receiver', position: 'WR', description: 'Quick, precise route runner working the middle.',
    weights: [['routeRunning', 3], ['ath:agility', 2.5], ['hands', 2], ['elusiveness', 1.5], ['ath:burst', 1]] },
  { id: 'WR_DEEP', name: 'Deep Threat', position: 'WR', description: 'Takes the top off the defense.',
    weights: [['ath:speed', 3.5], ['ballTracking', 2], ['ath:burst', 1.5], ['hands', 1]] },
  // Tight ends
  { id: 'TE_Y', name: 'Inline Y', position: 'TE', description: 'Attached tight end; a sixth offensive lineman who can catch.',
    weights: [['runBlock', 3], ['passBlock', 2], ['strength', 1.5], ['ath:weight', 1], ['hands', 1]] },
  { id: 'TE_F', name: 'Move F', position: 'TE', description: 'Detached receiving tight end; matchup problem in the seams.',
    weights: [['routeRunning', 2.5], ['hands', 2], ['ath:speed', 2], ['contestedCatch', 1], ['ath:agility', 1]] },
  { id: 'TE_H', name: 'H-Back', position: 'TE', description: 'Motion/wing blocker who leaks into the flat.',
    weights: [['leadBlock', 2], ['runBlock', 1.5], ['hands', 1.5], ['routeRunning', 1]] },
  // Offensive line
  { id: 'OL_ZONE', name: 'Zone Blocker', position: 'OG', description: 'Athletic lineman who reaches and climbs.',
    weights: [['runBlock', 2], ['ath:agility', 2], ['ath:speed', 1.5], ['handTechnique', 1.5], ['awareness', 1]] },
  { id: 'OL_POWER', name: 'Power Blocker', position: 'OG', description: 'Downhill mauler for gap schemes.',
    weights: [['runBlock', 3], ['strength', 2.5], ['ath:weight', 1.5], ['handTechnique', 1]] },
  { id: 'OL_PASS', name: 'Pass Protector', position: 'OT', description: 'Kick-slide technician who mirrors edge rushers.',
    weights: [['passBlock', 3], ['handTechnique', 2], ['ath:agility', 1.5], ['balance', 1], ['strength', 1], ['awareness', 1]] },
  // Defensive line
  { id: 'EDGE_SPEED', name: 'Speed Rusher', position: 'EDGE', description: 'Bends the edge with get-off and flexibility.',
    weights: [['passRushFinesse', 3], ['ath:burst', 2.5], ['ath:speed', 1.5], ['ath:agility', 1.5]] },
  { id: 'EDGE_POWER', name: 'Power Rusher', position: 'EDGE', description: 'Converts speed to power; collapses the pocket.',
    weights: [['passRushPower', 3], ['strength', 2], ['blockShedding', 1.5], ['ath:burst', 1]] },
  { id: 'EDGE_RUN', name: 'Edge Setter', position: 'EDGE', description: 'Sets a hard edge against the run.',
    weights: [['blockShedding', 3], ['tackling', 2], ['strength', 1.5], ['playRecognition', 1.5], ['pursuit', 1]] },
  { id: 'DT_NOSE', name: 'Nose Tackle', position: 'DT', description: '0/1-technique space eater who absorbs doubles.',
    weights: [['blockShedding', 2.5], ['strength', 3], ['ath:weight', 2], ['tackling', 1], ['passRushPower', 1]] },
  { id: 'DT_3TECH', name: '3-Tech Penetrator', position: 'DT', description: 'One-gap disruptor who lives in the backfield.',
    weights: [['passRushFinesse', 2.5], ['passRushPower', 1.5], ['ath:burst', 2.5], ['ath:agility', 1.5]] },
  { id: 'DT_5TECH', name: 'Two-Gapper', position: 'DT', description: 'Long, strong 4i/5-tech who controls blockers.',
    weights: [['blockShedding', 2.5], ['strength', 2], ['passRushPower', 1.5], ['ath:length', 1.5]] },
  // Linebackers
  { id: 'LB_MIKE', name: 'Mike', position: 'LB', description: 'Signal caller and downhill run defender.',
    weights: [['tackling', 2.5], ['playRecognition', 2.5], ['blockShedding', 2], ['awareness', 1.5], ['hitPower', 1]] },
  { id: 'LB_WILL', name: 'Will', position: 'LB', description: 'Range and coverage; chases plays sideline to sideline.',
    weights: [['pursuit', 2], ['ath:speed', 2], ['zoneCoverage', 2], ['tackling', 1.5], ['manCoverage', 1], ['playRecognition', 1]] },
  { id: 'LB_SAM', name: 'Sam', position: 'LB', description: 'Strong-side linebacker who takes on tight ends.',
    weights: [['blockShedding', 2], ['tackling', 2], ['strength', 1], ['manCoverage', 1], ['passRushPower', 1]] },
  { id: 'LB_BLITZ', name: 'Blitzer', position: 'LB', description: 'Pressure specialist from the second level.',
    weights: [['passRushPower', 2], ['passRushFinesse', 2], ['ath:burst', 2], ['tackling', 1]] },
  // Defensive backs
  { id: 'CB_PRESS', name: 'Press Corner', position: 'CB', description: 'Jams at the line and lives in man coverage.',
    weights: [['press', 3], ['manCoverage', 2.5], ['ath:height', 1], ['ath:speed', 1.5], ['strength', 0.5]] },
  { id: 'CB_ZONE', name: 'Zone Corner', position: 'CB', description: 'Reads the quarterback and breaks on throws.',
    weights: [['zoneCoverage', 3], ['anticipation', 2], ['ballSkills', 2], ['playRecognition', 1.5]] },
  { id: 'CB_SLOT', name: 'Slot Corner', position: 'CB', description: 'Quick-twitch nickel who tackles in space.',
    weights: [['manCoverage', 2], ['ath:agility', 3], ['zoneCoverage', 1], ['tackling', 1.5], ['playRecognition', 1]] },
  { id: 'CB_ISLAND', name: 'Shutdown Corner', position: 'CB', description: 'Shadows the opponent\'s best receiver.',
    weights: [['manCoverage', 3], ['ath:speed', 2], ['ath:agility', 1.5], ['ballSkills', 1.5], ['press', 1]] },
  { id: 'S_BOX', name: 'Box Safety', position: 'S', description: 'Run supporter and tight-end eraser.',
    weights: [['tackling', 2.5], ['hitPower', 1.5], ['blockShedding', 1.5], ['playRecognition', 2], ['manCoverage', 1]] },
  { id: 'S_FREE', name: 'Single-High FS', position: 'S', description: 'Centerfielder with range over the top.',
    weights: [['zoneCoverage', 2.5], ['ath:speed', 2.5], ['ballSkills', 2], ['anticipation', 2], ['playRecognition', 1]] },
  { id: 'S_ROBBER', name: 'Robber', position: 'S', description: 'Lurks in the hole to jump crossers.',
    weights: [['zoneCoverage', 2], ['anticipation', 2.5], ['ballSkills', 2], ['tackling', 1], ['playRecognition', 1.5]] },
  // Specialists
  { id: 'K_KICKER', name: 'Kicker', position: 'K', description: 'Place kicker.', weights: [['kickPower', 2], ['kickAccuracy', 3], ['composure', 1]] },
  { id: 'P_PUNTER', name: 'Punter', position: 'P', description: 'Punter.', weights: [['puntPower', 2.5], ['puntAccuracy', 2.5]] },
];

export const ROLE_BY_ID: Record<string, RoleDef> = Object.fromEntries(ROLES.map((r) => [r.id, r]));

/** Which roles are available to a position (OL roles shared by OT/OG/C). */
export function rolesForPosition(pos: Position): RoleDef[] {
  if (pos === 'OT' || pos === 'OG' || pos === 'C') return ROLES.filter((r) => r.id.startsWith('OL_'));
  return ROLES.filter((r) => r.position === pos);
}

export function roleInputValue(p: Player, key: RoleInput, asPosition?: Position): number {
  if (key.startsWith('ath:')) return athleticScore(p, key as AthleticKey, asPosition);
  return p.ratings[key as RatingKey];
}

export function roleSuitability(p: Player, role: RoleDef): number {
  let total = 0;
  let wsum = 0;
  for (const [key, w] of role.weights) {
    total += roleInputValue(p, key, role.position === 'OG' || role.position === 'OT' ? p.position : role.position) * w;
    wsum += w;
  }
  return total / wsum;
}

export interface RoleFit {
  role: RoleDef;
  score: number;
}

export function bestRoles(p: Player, pos: Position = p.position): RoleFit[] {
  return rolesForPosition(pos)
    .map((role) => ({ role, score: roleSuitability(p, role) }))
    .sort((a, b) => b.score - a.score);
}

/** Overall at a position = best role suitability, scaled by familiarity. */
export function overallAt(p: Player, pos: Position = p.position): number {
  const roles = bestRoles(p, pos);
  if (roles.length === 0) return 0;
  const fam = p.position === pos ? 1 : p.familiarity[pos] ?? 0.35;
  return roles[0].score * (0.7 + 0.3 * fam);
}
