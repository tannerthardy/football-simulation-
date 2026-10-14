# Stalk collection: a proven information error and a quarantined input repair

The assigned Z/CB_S approach has a controller information error independent of
hand retention. The far-contact stalk movement branch at `blocking.ts:870–875`
uses the corner's live coordinates for its fit without consuming a target
picture. Changing an unseen target position while keeping the receiver's body,
job and presented picture identical changes its request. The same principle
applies whether the resulting run gains or loses yards.

This witness starts from the saved baseline Y case at controller/body state
2.35, the closest pre-contact Z/CB_S approach. Own body/profile and installed
target remain exact. Its original movement command reproduces the saved native
request exactly: (0,+4.774649) yd/s, at 2.083088-yd separation versus the .792727
stalk strike range. No hand joint, body touch or acquisition supplies the
corner's new position. The normal mind's nearby count does not provide exact
coordinates to this movement branch.

The .30-s-old presented picture is an explicit **synthetic available-input
control**, copied from the saved earlier corner state. It is not an actual
consumed WR picture: this branch asks for none. Likewise, shifting the current
corner by .25 yd tests input dependence, not a physically evolved native play.
Both poses stay far outside contact. No World, PlaySim, RNG or new roster runs.

| Comparison | Existing request | Shadow visual-input request |
| --- | --- | --- |
| Same held picture; hidden corner shift | Changes by .289613 yd/s | Exactly unchanged |
| Fresh picture matches current corner | (0,+4.774649) yd/s | Exactly identical |
| Visible quarter-yard shift with fresh picture | Changes by .289613 yd/s | Same response |

The opposing visible-change and fresh-picture controls matter: consistency is
not obtained by ignoring the target or changing speed/braking. The shadow
reads the same installed corner through the ordinary perception interface and
uses the existing fit, .85 speed fraction and through-speed 1.

The [proposed patch](stalk-visual-input-proposed.patch) changes only the
far-contact fit's position source. Physical engage eligibility and all contact,
release, strength, gap, stand-off and movement rules remain untouched. The patch
applies cleanly to the pinned source but is **not applied**: the user's current
controller hold remains in force. This is a reviewable correction prepared for
that checkpoint, not an installed production feature.

There is no protection-rescue claim. With the synthetic old picture, requested
lateral speed becomes 2.550517 rather than 4.774649 yd/s. That reduction could
worsen collection while correctly removing privileged information. Existing
stand-off 1.2 yd and the nonretreating x landmark also deserve later route
analysis; they have not been changed or proven wrong. Nor does the absence of
hand load prove that the WR's body gave no useful delay. Preserve legitimate
corner avoidance and assess actual access through runner arrival.

[Fixture](../../config/stalk-information-witness.json),
[probe](../../scripts/diag/zone/stalk-information-witness.ts) and
[receipt](stalk-information-receipt.json) record the exact raw-source pin,
commands, presented picture, hidden change, patch hash and settings. The fixture
is 5.7 KB. Original source audit/reference remains `develop`
`a1b16e666a9ee7d1bc1d2aecba141fc535863b24`; historical comparison stays
`4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`.

Tested diagnostics `d43da8848343f453504d1aebd69979dc95cb5b29`, runtime source
`e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54`, exact
accepted flags/components=1 and Node22.23.3. Native-request identity, hidden
invariance, visible response, fresh compatibility, immutable body/input and
patch applicability checks pass; typecheck passes. Recorded command cost is
10.03 seconds. Zero World steps, new plays, games or full-suite reruns.

```sh
npm run baseline:run -- --candidate --flag RUN_CONTACT_COMPONENTS=1 --receipt out/stalk-information/probe-checks.json -- node --import tsx scripts/diag/zone/stalk-information-witness.ts config/stalk-information-witness.json out/stalk-information/result.json
git apply --check docs/reviews/stalk-visual-input-proposed.patch
```

Once the controller/contact prerequisite is cleared, apply only this reviewed
input correction on its own candidate, verify the actual controller branch and
collect the smallest relevant same-input protection evidence. Keep all three
Ace controls, successful weak call and adverse effects visible. RT joining,
RG anchoring, attached-TE posture/track and experimental hand policies stay
separate; integration owns production transfer and exact combined verification.
