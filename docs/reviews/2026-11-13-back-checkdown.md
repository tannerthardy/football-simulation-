# BACK_CHECKDOWN: the back is read where the concept puts him

Flag `BACK_CHECKDOWN` (off; experimental). Branch `rules/back-checkdown`, from develop at engine-51. Lane: Rules +
Coaching (read rules).

## Diagnosis

**The over-share.** Our backs drew 32% of targets against the NFL's 20% (BDB 2025 weeks 1–3, 600/3081). The flat alone
drew 18% against the NFL FLAT's 7.9% (`scripts/diag/backs/nfl_checkdown.py` and `rb_table.py` on rules/back-paths).

**The cause: the read compiler, not the progression.** Every hand-written progression lists the back last, but
READ_PLAN's installed plans moved him up:
- second or third on nearly every concept;
- first on flood from doubles and fade-flat from trips.

**Why the compiler promoted him.** The pure order (`candidates.ts pure`) is a beam search that reads routes in the
order their windows open, charging for any wait.
- The back's check route opens early (about 2.1 s).
- BACK_FRONT reads him with the start side.
- So he landed right after the first route, whatever the concept.

The rule "the back is a read like any route, placed by his window" is right for a back the concept gives a route
(HonestNFL 224: stick-flat-back). It is not right for a check-release.

## The coached rule

A back on a **check-release** (`concept.back === 'check'`) checks protection, then releases: he is the **check-down**,
read after the downfield progression. He is still the outlet a pressured QB comes off the plan to (QB_RHYTHM / READ_PLAN
outlet).

A back with a **called route** (swing, angle, flat, out, wheel) is a read the concept designed, and is placed by his
window as before. That covers:
- mesh's swing, part of its triangle;
- pa_flood's flat, the flood's low;
- seam_hitch's wheel;
- the angle in hitch_post and double_outs.

**The vertical peek is unchanged** (four_verts, verts_hitch, comebacks). It is coached as the start side's verticals as
one picture, "verticals, else the back" (HonestNFL 001, 112): the back is already the check-down after the downfield
read there.

**Why not motifs.** Judging "designed in" from the receivers' motifs, with the back added to them, was tried first and
rejected. The back releases to the weak side in these formations, and almost anything there forms a "high-low" or a
"triangle" with him. The concept's own assignment ('check' or a route) is the coach's statement, and the engine already
uses it (`assign.ts`).

**Integration's list, by this rule:**

| Concepts | The back | Effect |
|---|---|---|
| four_verts, verts_hitch, comebacks | check, but vertical peek | unchanged |
| hitches, smash, curl_flat, flood, fade_flat, dagger, drive, y_cross, levels, stick, sail_corner, corner_flat | check | read last |
| seam_hitch (wheel), hitch_post (angle), mesh (swing), pa_flood (back_flat) | called route | stay |

Two places where this reading differs from Integration's list:
- **hitch_post** was listed as isolation. Its angle is a called route, so it stays where it was.
- **flood and fade_flat.** Their designed flat belongs to a receiver (flood's S3, fade_flat's S2), not to the back's
  check-release, so the back is read last there.

## Read: league games, develop tree, 8 games, seed 101, off → on (`scripts/diag/backs/read-pass.ts`, `rb_share.py`)

| | Off | On | NFL |
|---|---|---|---|
| RB share of targets | 28.2% | 21.9% | 20% |
| Hitches shape (3+ hitches) | 29% | 12% | 12% (16% weeks 1–9) |
| Other dropbacks | 26% | 19% | 16–19% |
| Four-verts shape (3+ go/seam) | 50% | 57% | 19–34% (screens included), 19–29% without |
| Time to throw to the RB, p50 | 2.80 s | 3.00 s | 2.47 s |
| Completion rate | 74.8% | 70.8% | — |
| QB slides (scrambles) | 9 | 27 | — |

- **The four-verts shape** is the vertical peek, unchanged on purpose. Its share is the verticals not being thrown: his
  window is nearly flat in separation (P 0.12 at 0–1 yd, 0.21 at 3–5) and he reaches the back at 3.3 s against the
  NFL's 2.2. That is the next item (the belief tables on deep routes).
- **Adverse.** Scrambles rise (9 → 27) and completions fall: with the back no longer an early read, he holds the ball
  longer on concepts whose downfield reads aren't open. Part of that is the same window problem. It is kept here as the
  cost to re-read after the belief work.
- **Sample.** One seed, 8 games; the per-concept cells are small (n 18–31).

## Fixture

`test/back-checkdown.test.ts`, a panel of installed plans (concept × formation, reference stack):
- on, a check-release back is last on hitches, smash, flood, fade_flat, curl_flat and dagger;
- off, he was ahead of at least one read on each;
- mesh, seam_hitch, hitch_post, four_verts and verts_hitch keep their order.
