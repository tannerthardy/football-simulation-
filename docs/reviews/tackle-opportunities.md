# Scorecard tackle-counter definitions

The raw `missed` row remains `(missed + broken) / official scrimmage plays`.
Repeated whiffs and lost grips can all contribute. The 0.11–0.16 reference
band remains historical context and now prints **source unverified: PFF,
definition unknown**. Its season, numerator, play population and treatment of
assists or blocked reaches have not been established. The label does not make
the simulator's raw counter comparable to that band.

The adjacent `failedTackleOpportunities` row reports **unique failed defenders
per official scrimmage play**, following the per-defender distinction in
[#205/TKL-1](https://github.com/tannerthardy/football-simulation-/blob/75c18f1425b731d9dcc22dea5bed8479a7128216/docs/KNOWN_PROBLEMS.md#tkl-1)
and its `scripts/diag/g1/finish.ts` observation tool:

- Start the eligible window at the first handoff, catch, pitch catch or
  declared scramble. Count attempts against that initial offensive carrier.
- Count each defender once if he whiffs or loses a grip in that window,
  regardless of repeated attempts or both event types.
- Exclude a defender credited in the final `PlayStats.tacklers` list. A lost
  assisting grip counts if its defender never receives that final credit;
  a defender who fails and later finishes does not count as failed.
- The denominator is all official non-nullified run/pass plays, including
  plays with no eligible carry. Pocket sack attempts, retained-snap QB keeps
  without a declared scramble, defensive returns and two-point tries are
  outside the numerator. No encounter-percentage or NFL reference band is
  assigned to this measure.

This native-event adaptation uses **all final credited tacklers**, rather than
`finish.ts`'s last tackle-or-wrap fallback. A lost final wrap followed by an
out-of-bounds ending remains a failure; surviving credited assists are
finishers too. Its cohort also uses the scorecard's official-play filter.
It therefore does not reproduce or upgrade Defense's historical 0.200 per
snap or 18% encounter estimate. Those results keep their original definitions.
This count does not measure a defender who never attempted a tackle, whether
an attempt was physically viable, the first lost pursuit opportunity, or a
contact's slowing cost; #205's trace tools answer those different questions.

An existing observation hook retains the native event ledger and player
identities for each scrimmage result. It returns the original result and
does not record replay frames, alter controller/physics state or draw RNG.
Counting occurs during compact-record conversion, after the simulation timer
stops. Hook bookkeeping remains part of elapsed `simulateGame` time. The
scorecard measurement-content identity records this changed producer.

`PlayRec.failedTackleOpportunities` is optional. A missing legacy count is
unavailable, never reconstructed from raw totals or treated as zero. A mixed
old/new population also remains unavailable, including its interval; a
bootstrap resample cannot manufacture completeness by omitting the old game.
In reports, `—` means unavailable or no eligible denominator. Saved JSON and
reports stay unchanged; derived reports identify their current renderer.
