/** Diagnostic counterfactual run defenses (never set in production).
 * CF_FLOW=hold: nobody flows; CF_FLOW=over: everybody flows with the seen
 * line. See docs/reviews/counterfactual-defense.md. */
export const CF_FLOW: 'hold' | 'over' | null =
  process.env.CF_FLOW === 'hold' || process.env.CF_FLOW === 'over' ? process.env.CF_FLOW : null;
