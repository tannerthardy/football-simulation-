# Receiver routes: shared rules, separate pictures

An installed route is a job inside a concept. Beating one defender is useful
only if the receiver preserves the route's access, timing and relationship to
the other routes. The quarterback knows those rules, but does not know the
receiver's private decision or exactly what he has seen.

This implementation adds a bounded local read to the existing route runner.
It does not implement a universal route optimizer or a complete NFL receiver
model. Coaching sources below justify the relationships; the numerical
geometry boundaries are explicit model approximations, not NFL population
measurements.

## Installed choices

- **Stick/hook:** preserve the called sit landmark unless acquired underneath
  leverage leaves the installed run-away answer accessible. Check both the
  local key and acquired defenders farther along that exit. An outside cap
  can keep the stick sitting above its complementary flat. The legacy field
  `vsMan` names the installed alternative; no defensive call is read.
- **Tagged `seam_read`:** read the interior roof at eight yards, before the
  ten-yard break. Positive split-roof evidence permits a post. A roof shading
  the seam, or a very deep near roof, permits the installed underneath answer.
  An unavailable picture leaves the base seam. Outside corners alone do not
  establish a split-safety picture. Corner/sail is a separate install, not an
  automatic alternative.
- **Ordinary fixed routes:** keep their installed geometry. A completed
  outside route may turn upfield; the continuation generator must not insert
  a backward segment merely to return to its inner sideline margin. Genuine
  comebacks retain their called backward segment.

`seam_read` is available to explicit concept installation. It is not added to
the ordinary play caller's mix in this change. The diagnostic install reserves
the middle for one reader: strong #1 go, #2 seam read, #3 flat; weak #1 go and
#2 flat, with the back protecting. Installing several independent readers into
the same middle is not supported by this evidence.

## Receiver information and commitment

During the stem, the receiver looks downfield and across nearby leverage.
Look membership uses the delayed picture, not the defender's current hidden
position. This is a simple attention model; body facing is not treated as an
anatomically precise gaze measurement. A previously acquired key can remain
in short memory as the receiver advances past it. Its age increases, its
position is predicted only within the bounded half-second lifetime, and an
expired picture cannot authorize a new conversion.

Awareness affects the existing observation delay. A late read can miss a
rotation or a second defender. There is no roll that flips the true man/zone
label and no bonus that awards separation. The receiver commits at his own
installed depth, not at a timer after the snap. A jam delays reaching that
depth. After committing, a late rotation does not make him alternate between
two cuts. The shared World still must execute the turn and may fail to reach
the desired landmark in time.

The current read uses a finite set of geometric approximations: underneath
keys within four yards of break depth and five lateral yards, exit checks
over the installed branch, interior roofs within two yards outside the
quarter-field landmarks, and a deep-roof threshold fourteen yards beyond read depth. These
are narrow install choices to evaluate on film, not universal coaching laws
or measured human visual limits.

## Quarterback expectation

The QB's immutable installation includes the same alternatives. His existing
looks produce his own defensive memory and receiver pictures. A read-only
view of that memory can inform the route expectation without creating another
look, another decision, or another random draw. Hidden defender motion and
the receiver's private `path`, `idx` and `routeDecision` are not inputs.

Before the receiver reaches the read landmark in the QB's acquired picture,
new key evidence can revise the expected answer. Losing a look alone does
not imply a changed route. Once the picture shows the receiver has reached
the commitment depth, the QB preserves that inferred answer. A subsequent
receiver picture that uniquely supports another installed branch corrects
it. Motion incompatible with the menu retains the existing observed-motion
forecast fallback.

Thus agreement is useful but imperfect. A QB can anticipate the wrong answer
from an old safety picture while the receiver correctly reacts to a rotation.
He can also wait for enough visible motion to identify the answer. This change
does not import the pending throwing-motion/readiness policy from PR #408.

## Releases, screens and catches

The ordinary flat now gains width near the line before rolling to its same
3.5-yard-deep, 12-yard-wide outlet. Its first landmark is at the line, rather
than 1.5 yards beyond it. For an off-line receiver, the old absolute landmark
required a 2.7-yard downfield stem before the first width turn. Native command
traces isolate that installed geometry from contact, spacing and execution.
This is a flat-specific installation change; arrows, swings, shallow crosses,
vertical stems and physical speed limits retain their separate meanings.

Preserve the existing physical press technique: reachable hands apply bounded
push and steer, the receiver can move/swipe past the hand, and no tensile jam
hold follows him after escape. This work does not award a clean release or
increase speed, braking, grip strength or route ratings. Pre-contact shoulder
setup, mandatory release tags and recovery to a specific stem lane remain
separate opportunities for development; current physical press controls are
not evidence that every release is coached well.

The route-continuation repair is shared by all installed routes, including
receiver screen paths. Screen installation, blocking release and RPO choice
from pending PR #403 remain separate. In particular, NFL Rule 8-3-1 is not the
college screen exemption: behind-line reception does not by itself remove
the prethrow ineligible-downfield restriction.

Two catching questions remain open and are not fixed by these route changes:

1. The intended receiver's `TrackBall` transition still uses hidden throw
   attribution and a true flight forecast. Its existing reaction delay does
   not establish that all tracking reach/height privileges wait for acquired
   evidence. An acquired-flight continuation needs its own controls.
2. A failed offensive catch opportunity currently deflects the ball. An
   opportunity envelope is not proof of actual hand contact. Distinguish
   untouched misses, touches, control attempts, completed catches and PBUs
   before changing catch probability or tip physics.

The receiver scramble drill also retains separate global/live-state reads.
This change removes the option and settled-window shortcuts; it does not
claim that every receiver information consumer is repaired.

## Reproduction and interpretation

Run the focused contracts with supported Node 22.23.3:

```sh
node node_modules/vitest/vitest.mjs run --project core \
  test/receiver-option-information.test.ts test/receiver-middle-read.test.ts \
  test/route-continuation.test.ts test/qb-receiver-forecast.test.ts \
  test/receiver-route-effort.test.ts test/press-contact.test.ts --maxWorkers=2
```

`scripts/diag/receiver-route-panel.ts` captures constructor bytes once, then
replays them with and without passive recording. It records stable actor
identity, actual route reads, the QB's already-computed expectation, command
ownership/rewrites, achieved body state and complete execution hashes. Its
middle-read mode explicitly installs the new route definition in both arms;
the unchanged baseline ignores the new read metadata. That is a custom native
concept comparison, not an ordinary-game recording.

Use `--capture --inputs <directory> --out <directory>` on the accepted base,
then replay with `--inputs <same directory> --out <new directory>` on the
candidate. Copy this diagnostic operator to the base checkout before capture;
do not copy candidate engine files. Add `--middle-read` for the separate
explicit seam install or `--flat-release` for the flat panel. Each recipe has
the original RNG input and four named shifts. `--cases <id>` and `--actor H`
permit a bounded actual-target follow-up without replacing the manifest.
Compare deserialized execution values across sources: V8 encodings can differ
for equivalent values and are not by themselves evidence of changed football.

Inspect the first changed request and achieved movement. An unused changed
waypoint is inactive evidence. A different completion or touchdown is neither
proof of improved route craft nor automatic failure. Preserve adverse cuts,
late throws, legitimate defensive wins and QB/receiver disagreements.

## Smallest next work

1. Separate acquired flight, a reachable opportunity and actual hand touch in
   catching. Start with the preserved untouched miss and high-catch/PBU
   controls; do not raise catch probability to hide a tracking miss.
2. Trace a settling option receiver's changing catch target and finite turn
   cost. Retain the QB's independent expectation and the adverse native
   incompletions; agreement on the branch is not a guarantee of an accurate
   throw or attainable catch.
3. Continue release-shape work by concept, with actual jam and traffic
   controls. The flat repair does not establish that every cross should be
   flat or every release slower. Re-run the NFL release comparison when the
   verified tracking host is available before building coverage cues on it.
4. Compose separately with screens/RPOs (#403) and QB readiness (#408). The
   latter's break prediction must follow the QB's expected branch, not a
   private receiver choice or permanently the base route. The former still
   owns screen blocking and legal lineman release.

## Sources

Read November 9, 2026. These are particular teaching systems and official
rules, not a claim that every NFL team uses the same read or threshold.

- [Chris Brown, Run and Shoot: seam read and Go](https://smartfootball.blogspot.com/2009/03/run-and-shoot-series-part-2-seam-read.html):
  near-safety key, 8–10-yard decision, post/under/seam distinctions and
  explicitly tagged corner/sail.
- [Brown, three verticals and converting patterns](https://smartfootball.blogspot.com/2005/08/three-verticals-and-converting-pass.html):
  a different middle-open/post, middle-closed/square-in installation. Do not
  collapse all systems into one unrestricted choice route.
- [Keith Grabowski, receiver release of defenders](https://blogs.usafootball.com/blog/292/wide-receiver-release-of-defenders):
  hard/soft shoulder, moving through access, eyes to the next key.
- [Ron Lewis, winning deep routes](https://blogs.usafootball.com/blog/3769/receiver-drills-to-win-deep-routes):
  recover the installed lane and timing after a reroute.
- [John Booth, intermediate and deep passing game](https://coachesinsider.com/football/intermediate-and-deep-passing-game-article/):
  flexible release with concept-specific exceptions and shared hot rules.
- [NFL Rulebook](https://operations.nfl.com/the-rules/nfl-rulebook/):
  Rules 8-1, 8-3 and 8-4 distinguish eligibility, pass/catch, ineligible advance
  and legal receiver contact.
