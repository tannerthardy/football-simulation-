# Native raw versus applied movement evidence

Final baseline input remains source
`601b66e8e30123b20e1c5cfe9c5c883f41219180a5eaf26be8a477dff89b2a5b`.
No production code or tests changed. Only the original six native passing
inputs were rerun; all six endpoints and cleaned results exactly reproduce
`data/reviews/helper-fit-and-coverage/coverage/final.json.gz`, and observed/plain
results, complete RNG state and copied next RNG match on every input.

The new collector wraps each actual `behavior.update` once, including new
agent behavior assignments during a tick. It returns the original command
unchanged. It records exact numerical body/profile/energy/support at the raw
request, at World input and after World, together with raw controller output,
contained `sim.cmds` and final applied `intents`. It intercepts only existing
`see` calls. Call-stack provenance identifies `observedCatchWindow`'s actual
receiver pictures; no controller, perception, route read or live RNG is called
again by the observer. Internal CoverageDefender sub-techniques are not
separately wrapped; the outer actual controller result is retained.

Use `native-body-codec.mjs`'s `decodeBody` before free movement previews.
It preserves non-finite support clocks and own undefined optional fields.
The initial JSON-only collector packet is retained separately because its
support clock became null; use the **v2** packet for body comparisons.
Legacy `physicalInitial`/mind projections deliberately match the older saved
reference operator and do not claim a complete mind/Map checkpoint.

Final files:

- `native-tail-commands.ts`, `native-body-codec.mjs`.
- `six-tail-commands-baseline-v2.json.gz`, `.log`.
- `analyze-native-tail-commands.ts`.
- `six-tail-commands-baseline-analysis.json`, `.log`.
- `native-body-codec-receipt.json`, `native-command-source-guard.log`.

The analyst performs only the baseline's arithmetic catch-window/reach query
on the recorded actual pictures, profiles and flight points. It never runs a
PlaySim or invokes a controller/`see`/RNG. All **747** reconstructed static
fallback commands agree with the actual raw velocity with zero error. It
retains first fallbacks per defender on all six plays, selected exact cues and
movement, and body round-trip checks on **20,500** controller snapshots.

## Confirmed command ownership

Cover 2 right SS at 4.20 asks for (+3.919804,+6.866186) yd/s, and at 4.25
asks for (+4.792815,+6.849808). Containment leaves both unchanged; the applied
World velocity is (0,0) on both ticks. The original pursuit behavior therefore
**does not ask to stop**. Teammate spacing is the intervening unconstrained
refinement in this no-engagement/no-grip state. Do not fix chase braking on the
false assumption that these zero velocities are its raw command.

At the first SS late-air fallback, 2.75, raw=contained=applied
(-6.882634,-.009371). The actual observed window query selects Z at predicted
3.55, point (53.2336248563,10.2316883368), using the age-.20 consumed picture
(51.435256,8.666667), velocity (+5.032842,0). That same future point persists
through the last air step at 3.50. It is already a future landmark: adding a
receiver's velocity again can double-lead it.

PA post-dig right CB_W has **no** plausible receiver window at its inspected
3.40,4.20,4.45 fallbacks. Its selected `arrivalPoint` is
(54.654228,35.712323) through 4.20, then (58.262571,37.127322) at 4.45. The
ordinary left mirror initially selects blocking TE Y near the backfield ball
at 3.40, with predicted time equal to current time and zero remaining:
point (35.979415,28.417474), consumed Y (36.457011,28.538022), velocity
(-.502293,+.900988), high stance. At 4.20,4.45,4.60 it has no receiver window
and uses `arrivalPoint`. A speculative early candidate must not be treated as
the eventual catcher, a commanded route or guaranteed possession. This is an
important exclusion/control for changing every window fallback to follow the
candidate's velocity; the mirror otherwise acquires a real immediate wrap.

## Reuse

All arguments are explicit; engine imports resolve to the announced archive,
and the source is checked before and after collection independently of cwd.
The immutable parent reference is required. Output refuses to overwrite an
existing file. A deliberately wrong source hash rejects before output.

```sh
node --import tsx out/coverage-continuation/native-tail-commands.ts \
  out/helper-fit/promoted-source \
  601b66e8e30123b20e1c5cfe9c5c883f41219180a5eaf26be8a477dff89b2a5b \
  <new-output.json.gz> \
  data/reviews/helper-fit-and-coverage/coverage/final.json.gz

node --import tsx out/coverage-continuation/analyze-native-tail-commands.ts \
  out/helper-fit/promoted-source \
  out/coverage-continuation/six-tail-commands-baseline-v2.json.gz \
  <new-analysis.json>
```

The collector accepts a later frozen candidate source and retains parent
equality flags plus plain parity. The analyst intentionally accepts only the
original baseline query, so it cannot silently apply old branch formulas to a
changed controller. Compare raw/contained/applied candidate requests directly
or write a specifically guarded analyst for the changed branch.
