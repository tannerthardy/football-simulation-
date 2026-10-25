# Coverage match rules against source installs

Audited 2026-10-22 against branch `claude/great-mccarthy-85uf8b`, which
merges `develop` `d91c9014`. Engine source unchanged. The question: do the
zone/match rules in `src/sim/coverage/rules.ts` do what the teaching sheets
say they do, and which common checks are missing?

Sources:
- the user's HonestNFL library (`docs/references/honest-nfl/`; HNFL IDs;
  original images viewed where wording or diagrams mattered);
- the 2014 Michigan DB manual;
- the Notre Dame DB manual;
- Tom Olivadotti, *Coaching Pattern-Read Coverage* (paraphrased);
- a USA Football article on Saban's pattern-match Cover 3 (Ted Nguyen, 2018);
- an American Football Quarterly article on pattern-reading vs. trips.

Access details are in [external playbook sources](../references/nfl-playbook-sources.md).

Rule code lines in **bold** were re-read by hand for this review; the rest
come from a read-only subagent audit and are marked as such.

## 1. The corner leaves #1 far too early (highest impact)

**Code.** `under()` (`rules.ts:76–78`) is true for any in, out or stop route
shallower than its `maxDepth`. `c3Corner` (**`rules.ts:90–99`**) and the MOD
branch of `qCorner` (**`rules.ts:182–192`**) call `under(one, 9)`. They set
`state.mode = 'zoned'`, so the corner plays zone for the rest of the play once
#1 shows an in, out or stop route inside 9 yards.

**Sources.**
- HNFL-079 (quarters corner): "responsible for all routes by #1 unless an
  'In' or 'China' call is made". The call comes "once #1 truly declares
  themselves to be running shallow and not just getting us to zone off,
  then running upfield". The sheet also names a "no cover zone".
- Michigan DB: "Man any vertical stem by #1 past 5 yards."
- Saban Cover 3 (USA Football): the "Under" call must come within the first
  five yards of the route.
- Olivadotti: a no-cover zone of about 5 yards.

The subagent audit lists HNFL-029, 197, 027, 016 and 054 as agreeing.

**Effect.** Speed outs, 6–8 yd curls and stop-and-go routes put the corner
in zone, where he cannot carry the route back upfield. This applies to most
Cover 3 and two-high quarters snaps, whatever the formation.

**Proposed rule.** Release #1 only on a shallow route that has declared:
under or across inside about 5 yd, or failing to clear the no-cover zone.
Otherwise stay man on #1 through outs, curls and intermediate in-breakers.
Re-check before committing to zone, since a stop can turn upfield.

## 2. Trips answers read the wrong receiver first

- **Stubbie** (**`stubbieSafety`, `rules.ts:320–335`**): the code caps #2
  vertical first, then #3. HNFL-270 and the Book/Read sheets (HNFL-050, 309)
  read #3 first. In those sheets the apex plays man on #2 unless #3 goes to
  the flat, and the hook does not carry #3 vertically. Per the subagent, the
  code walls #2 only to 10 yd and the hook carries #3 to 15 yd.
- **Poach vs. Trix** (subagent): when #3 doesn't go vertical, the code's free
  safety plays the deep middle. HNFL-197, 030 and 021 have him zone his
  quarter and squeeze toward the backside X. `c3_hook` also carries #3 to
  15 yd, so two defenders take one vertical.
- **"Who becomes #3":** every rule reads receivers by their snap numbering
  (`ref()` → `readRef`, `reads.ts:134`). The sheets assign by "final #3" or
  "first to the flat". `ReleaseReader.sideNow()` (`reads.ts:145`) computes
  that, but no rule uses it.

## 3. Other mismatches

- **Quarter-flat apex** (**`quarterFlat`, `rules.ts:233–243`**): it reacts only
  to #2's quick out. HNFL-029, 197 and 030 take the first flat by #2 *or* #3,
  and #2 in or back when #3 goes away. Michigan's "push/pack" says the same
  (p. 20).
- **Squat/sink corner** (**`cloudCorner`, `rules.ts:280–293`**): the corner
  sinks into the flat as soon as any route declares there, and carries #1 in
  man only on a vertical under 13 yd. HNFL-099, 028, 334 and 097 sink only on
  the throw; with no flat threat, they convert to man on #1 for any route.
- **Palms trigger** (**`isQuickOut`, `reads.ts:166–169`**): outs under
  7.5 yd. HNFL-051 says under 5 yd. The rest of Palms matches.
- **Cover 6/8 half side and Cover 9** (subagent): no defender walls or
  matches #2 on the half side (HNFL-073, 097 "Wild"); Cover 9's seam-flat uses
  a carry with no hand-off where the sheets match, carry and deliver
  (HNFL-054, 203, 027).
- **Middle hook in Cover 2/6** (`mike_3`) reads only the back; the sheets
  match final #3. `c2_hook` walls #2 vertical but does not match #2 up and in.
- **Saban Rip/Liz vs. `c3_curl_flat`:** the code zones on any non-vertical #2
  release. Saban's match keeps matching unless the route stays under 5 yd.
  The HonestNFL audit found the code consistent with its sheets, so this is a
  system difference (match vs. spot-drop curl-flat), not a defect.
- **`invert_safety`** is defined in `types.ts:220` but no coverage uses it
  (**checked**).

Consistent with the sources (subagent): `q_safety`, `q_corner_meg`, `c3_seam`
in Cover 3 Seam, `c3_hook` and `mike_3` in Cover 3, `rat`, `robber`, and the
safety/corner logic of the Palms rules.

## 4. Missing checks, ranked by how often the formation occurs

Formation shares from the repo's 2022 tracking: 2×2 ≈ 40%, 3×1 ≈ 39%,
3×2 ≈ 12% of dropbacks. Bunch and stack shares are not measured.

1. **An owner for trips #3 vertical** in every two-high call and in Cover 9
   against 3×1. Cover 6, Cover 8, Cover 2 match, Tampa 2, Cover 9 and the
   quarters/2-man split have no 3×1 check (HNFL-197, 030, 073, 054, 203,
   097). For example: the free safety takes any #3 vertical, otherwise zones
   his quarter and squeezes X, and the Mike matches final #3 underneath. This
   fits the existing rule framework.
2. **Empty (3×2) checks** (HNFL-203 "Grab", 120, 197, 309). `formationKey`
   returns `'empty'`, but no coverage defines a check for it.
3. **Bunch: Box / Buster / Squat** (HNFL-053, 272, 069, 015). Box assigns by
   release order: the first out deep and low, the first in low and deep.
   Needs a bunch key and assignment by release order, which can build on
   `sideNow`.
4. **Push for Cover 3 match** (HNFL-203, 016). On a straight flat release by
   #3 or the back, the seam/flat defender chases it and the hook pushes to
   the new #3.
5. **Stack tools: Top Hat, Triangle, Clue** (HNFL-013, 014, 203).

Fix item 1, then the Stubbie and Poach rules, before adding new checks. Item 1
affects most snaps, and Stubbie and Poach are the engine's current answers to
3×1.

## What this does not establish

Behavior was not run. The findings compare rule logic to written rules. Per
[behavior review](../BEHAVIOR_REVIEW.md), any change needs a focused
reproducer (for example a speed out and a 7-yd curl against Cover 3 and
quarters), a mirrored control and film, not a completion-rate target. The
full subagent audit (about 400 lines, with per-rule sheet IDs) can be
regenerated on request; it is not committed.
