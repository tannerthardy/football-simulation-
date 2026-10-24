/** Stable PlaySim construction order, matching league/team.ts personnel pickers.
 * The same slot → player mapping must not change meaning with property order.
 * This is actor order, not depth-chart priority, alignment or football policy.
 */
import type { DefSlot, OffSlot } from '../playbook/types.js';
import type { Player } from '../players/types.js';

// Preserve pickOffense's QB, line and skill selection order (not field order).
export const OFFENSE_ACTOR_ORDER = ['QB', 'LT', 'RT', 'C', 'LG', 'RG', 'RB', 'Y', 'X', 'Z', 'H', 'F'] as const satisfies readonly OffSlot[];
// Preserve pickDefense: optional nose first, then edges/interior, backers, DBs.
export const DEFENSE_ACTOR_ORDER = ['NT', 'DE_W', 'DE_S', 'DT_S', 'DT_W', 'LB_M', 'LB_W', 'LB_S', 'CB_S', 'CB_W', 'NB', 'DB', 'FS', 'SS'] as const satisfies readonly DefSlot[];

function entries<S extends string>(lineup: Partial<Record<S, Player>>, order: readonly S[], side: string): Array<[S, Player]> {
  for (const slot of Object.keys(lineup)) {
    if (!order.includes(slot as S)) throw new Error(`Unsupported ${side} lineup slot: ${slot}`);
  }
  const result: Array<[S, Player]> = [];
  for (const slot of order) {
    // Partial records can omit a slot or explicitly leave it undefined. Own
    // fields only, as with Object.entries; never mutate or reassign the caller.
    const player = Object.hasOwn(lineup, slot) ? lineup[slot] : undefined;
    if (player === undefined) continue;
    if (player === null) throw new Error(`Invalid ${side} lineup player at ${slot}`);
    result.push([slot, player]);
  }
  return result;
}

export const orderedOffense = (lineup: Partial<Record<OffSlot, Player>>) => entries(lineup, OFFENSE_ACTOR_ORDER, 'offense');
export const orderedDefense = (lineup: Partial<Record<DefSlot, Player>>) => entries(lineup, DEFENSE_ACTOR_ORDER, 'defense');
