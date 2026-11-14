# Play-action protections: boot, naked and their relatives

Researched 2026-11-12 for the concept queue (Integration: "the protection types as call structure, sourced from the
playbook references, boot/naked first"). These are coaching rules in our own words, with sources. They are not
implemented features or measured NFL facts. Systems differ: the same word means different things in different
installs, and this chapter names the system wherever it matters.

## What the engine has today

All three play-action concepts (`pa_post_dig`, `pa_flood`, `pa_shot`) share one generic protection:

- **QB:** he fakes for 0.7 s, then drops straight back to 8.3 yd (`dropSpec`, `'pa'`).
- **`'boot'` drop type:** it exists, but no concept uses it, and it is the same as `'pa'`.
- **Line:** the interior shows a low pad level for 0.35 s, then the drop-back protection runs.
- **Flex's work:** Flex has a play-action line state that ends on contact, the 1-yd depth limit or the rusher
  declaring (`pa-look.ts`, under PUNCH). That is the line's technique. This chapter is about the call: who is
  protected, from where, and who is left.

## The family

Each coached protection is part of the call, and four things change together: the launch point, who blocks the edge,
how many go out, and what the QB must read.

| Protection | The line | The boot-side edge | The QB | Typical routes |
|---|---|---|---|---|
| **Naked** | Blocks the run call toward the fake | Nobody: the boot-side end is unblocked by design | Boots away from the fake and reads the unblocked end | Flat, sail (corner/out at 10–15 yd), deep crosser from the backside |
| **Boot** (keep, waggle) | Blocks the run call toward the fake; on waggle a backside guard pulls | A pulling guard, a TE or a back | The same path, with a protector between him and the end | The same three levels |
| **Run-action, under center or pistol** | Fires out with run pad level on the pass-pro man, holds at the line, settles | Tackles and backs, as in the drop-back count | Fakes, then a straight drop | Shot concepts with 2–3 out |
| **Gap fake** (power/counter action) | Gap-run rules; the puller pulls | The pulling guard takes the end on the far side | A drop or counter boot | Varies |
| **Gun flash** | A normal pass set | As in the drop-back protection | A short mesh, then a normal drop | Normal concepts |

## Naked

**Source.** FootballXOs spread offense playbook, "Boot Pass Protection" (p. 99, eight fronts) and "Waggle" (p. 126).
It is a publisher's teaching sample (SHA-256 `92756b67…`; see [playbook sources](../references/nfl-playbook-sources.md)).
That playbook calls this protection "Boot". By our naming it is naked: no one blocks to the boot side.

**The line.** On every front shown, all five linemen block toward the run fake, the man or gap on their fake side.
A back crosses the QB to the fake side and takes the edge there.

**The tight end to the boot side** (Glazier, Chad Johnson, *Naked Bootlegs*, 2024; Gridiron Strategies, Sam Vaiana,
*Ace Right 121 Slam at 9*; Brian Hill, *Counter Boot and Stretch Pass*), two versions:
- he blocks down on the end, holds for a two count, and releases to the flat at 2–5 yd; or
- he bluffs the end and slides to the flat, gaining width before depth.

A wing taking the end "never chases" him (Hill).

**The QB:**
- He completes the fake before starting his path, carries it about two steps, and hides the ball on the far hip
  (Coach Grabowski, *General Bootleg Principles*, after Evashevski 1957; *Our Evolution of the Pistol Set*, AFQ 2012).
- His path runs roughly parallel to the line, with enough depth to avoid the backside end (Vaiana).
- From the gun: 2 steps of depth, then he squares and attacks the line (Hill).

**The unblocked end is his read:**
- **He crashes or chases the fake:** throw the flat (Dusty Evely, *When Open Isn't Open*, parts 1–2, 2023).
- **He comes straight at the QB:** don't panic; show the ball (Grabowski).
- **He widens or contains:** stop and throw back across: comeback, vertical, flat (Evely's "half-boot").
- **He is coming before the snap:** abort the fake and throw the quickest short route (Charlie Coiner, *Have A
  Bootleg Pass Pressure Plan*, FirstDown PlayBook 2022).

The spread playbook's concept pages say the same in one line: naked reads the contain player (pp. 80–82).

**The routes** (Waggle, p. 126): the backs fake, then release to the boot-side flat; Y runs a stem then a
corner/out at the sideline (the sail); the backside receiver runs a deep crosser; the other wide receiver clears.
Evely's read order: sail, crosser, flat, deep to shallow.

## Boot (a protector to the boot side)

Sources: Space Coyote, *Football Fundamentals: Play Action Pass Protection* (Breakdown Sports, 2014: a full chart
from one college system); FirstDown PlayBook, *Boots, Nakeds & Waggles*; Jason Tone, *Gun Wing-T Play Action Waggle*
(Glazier 2025); Coach Kou, *Full Slide vs G Pull Protection* (2025).

| Who | Rule |
|---|---|
| Line toward the fake | Block the run call; step laterally toward the fake and run defenders down the line; do not go downfield |
| Waggle puller (backside guard) | Pulls toward the boot side as the QB's protector, and either fits outside the TE protecting outside-in or kicks out the support player |
| Center | Blocks back for the puller (the playside A gap) |
| Tackle beside the puller | Takes the man on him, or steps down and hinges |
| TE to the boot side | Sells the block and pins the end late (FirstDown's waggle), or releases if a back has the end |
| G-pull variant | The guard pulls to the end on the far side; the guard and tackle there block down |
| Backs | The faking back checks, then runs his route; a fullback can take the end and settle in the flat (no deeper than 5 yd) as the hot read |

The QB's path, depth and reads are as for naked, but with a protector between him and the end. Sources differ on
whether the reads run high to low or low to high.

## Run-action and gap fakes (thin)

**Run-action** (Bill Walsh's 1985 49ers terms, via Queer Football Breakdowns, 2020; Space Coyote "Act"):
- the line and backs attack and hold at the line, and the slide goes away from the call;
- the front blocks the designed run without going downfield;
- the faking back attacks the A gap and check-releases.

No coaching source was found for a launch depth or for the "7+ in, 2–3 out" count.

**Gap fake:**
- the guard pulls to the far end (Kou), and the center blocks back for him (Kou; Chennis Berry, *Power Play*);
- the backside tackle secures inside, then hinges (Berry, as a run rule);
- counter boot: the QB reverses out, pauses, takes two steps of depth and attacks the line (Hill).

**Gun flash:** only weak sources; the fake does not change route timing (Space Coyote, "weak" fake).

## What the engine would need (proposal, not built)

1. **Each protection as call structure:** the line's direction (toward the fake), the boot-side edge (none, puller,
   TE or back), the QB's path and launch point, and the routes that go with it.
2. **Naked as a QB read of the unblocked end,** by what the QB sees of him: crash → flat; contain → pull up and throw
   back; pre-snap threat → quick throw. These are his own decisions, with Flex's no-throw seam (`noThrow`) for the
   pull-up.
3. **A fake that changes nothing about the defense by itself.** Defenders respond to what they see: the line's run
   look, the mesh, the back's path.

## Sources not reached

X&O Labs (403), Glazier Drive videos (paywalled), coachbdud.com (host not reachable), and several team installs
held behind sign-up gates. The 2002 Broncos offense (Shanahan, attributed team material) is downloadable. It should
be read as corroboration only, under the playbook-sources rules.
