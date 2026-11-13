# The finish after first contact: arrival or tackle? (Coverage, 2026-11-12)

Status: a diagnosis, handed to the tackle owner (Flex). There is no mechanism change here. The diag tools are `scripts/diag/pass-operators/finish.py` and `finish_split.py`, plus the sim-only `labels.carrierContacts` in `scripts/mechanics/sim-export.ts`.

## Question

Our completions gain about twice the NFL's yards after first contact (`finish.py`: p50 1.4–1.5 yd vs 0.7 yd with the nearest defender 1–3 yd away at arrival). Is that because our contacts happen in worse spots, which would make it an arrival problem? Or because the same contact gives up more, which would make it the tackle?

## Populations

- **NFL:** BDB 2025 weeks 1–3, `out/mechanics/nfl-plays.jsonl.gz`.
- **Sim:** sim-export seeds 101 and 201 (8 games each) on develop 8aae4dfb (engine-34), with `IN_STRIDE_CATCH` off and on.
- NFL and sim go through the same Python code.
- First contact is `events.first_contact`; if that is missing, the first frame with a defender's centre within 1.0 yd of the carrier.
- Each contact goes into a cell by three things, all measured at first contact:
  - the contacting defender's side relative to the carrier's heading (front / side / behind);
  - that defender's speed (under 4, 4–6, over 6 yd/s);
  - the carrier's speed (same bins).

## Completions

All completions with a contact: NFL n 4934; off 885; on 880.

**Standardised.** Mean yards after contact, clipped to −5..15. "NFL on our cells" applies the NFL's per-cell values to our mix of cells.

| | ours | NFL on our cells | NFL |
|---|---|---|---|
| off | 3.53 | 2.18 | 2.18 |
| on | 3.82 | 2.27 | 2.18 |

The cell mix explains none of the excess, so it sits inside the cells: the tackle.

**Fast cells.** Each entry gives yards after contact p50, then contact to the end of the play p50. Columns: NFL / off / on.

| cell | NFL | off | on |
|---|---|---|---|
| front, defender < 4 | 1.6, 1.0 s | 1.3, 1.0 s | 1.1, 1.1 s |
| behind, defender < 4 | 0.9, 1.0 s | 0.4, 0.9 s | 1.3, 0.9 s |
| side, defender 4–6 | 1.5, 0.8 s | 2.5, 1.2 s | 3.1, 1.1 s |
| behind, defender > 6 | 1.8, 0.7 s | 3.5, 1.0 s | 4.3, 1.0 s |
| side, carrier > 6 | 2.5, 0.8 s | 4.8, 1.2 s | 5.5, 1.3 s |
| behind, carrier > 6 | 2.4, 0.7 s | 5.0, 1.0 s | 5.1, 1.1 s |

- **Slow cells match.**
- **In fast cells we take about 1.4× as long to the end and give up about 2× the yards.** The yards per second go up too: behind with the defender over 6 is NFL 2.6 yd/s, ours 3.5–4.3 yd/s.
- **So it is both.** He stays up longer under the wrap, and he keeps more of his speed early while he is held, carried along rather than slowed.
- **Constant-deceleration check.** From about 5 yd/s, a constant deceleration over our 1.0 s would give about 2.5 yd; we see 3.5–4.3.

**How our plays end after first contact** (sim labels, off):

- Second defender: 46%, p50 2.2 yd.
- First contactor alone: 20%, p50 0.2 yd, 0.7 s.
- Dragged 2+ yd: 17%, p50 4.4 yd.
- Broke: 9%, p50 12.9 yd.
- Missed: 7%, p50 4.3 yd.

The first contactor wraps on 93% of plays, 90% within 0.3 s of contact. The problem is not a missed tackle: at speed, the wrap does not bring the carrier down until help arrives.

`IN_STRIDE_CATCH` raises the excess slightly because the catcher arrives faster. It does not cause it.

## Designed runs at the second level

Designed runs with first contact 3+ yd past the line: NFL n 1070; off 116; on 89.

- **Standardised:** ours 4.21 / 3.77; NFL on our cells 3.72 / 3.90; NFL 4.41.
  - Yards match in the cells we have.
  - Play over within 1 s: 26–39% vs NFL 50%. Contact to the end: 1.2–1.4 s vs 1.0 s.
- **Our run contacts are slow:** defender over 6 yd/s in 2–10% vs NFL 27%; carrier over 6 yd/s in 13–16% vs 49%.
  - So the fast cells where completions fail are almost empty on runs. The run read cannot confirm or reject one shared mechanism.
  - It agrees with the slow cells matching.
- **How runs end** (off): second defender 61%, missed 26%, broke 9%.

## For the tackle owner

The question: after a side or rear wrap on a 4–6+ yd/s carrier, how fast does his forward speed fall, and when does he go down? The NFL gives 0.9–2.5 yd in 0.7–0.8 s in these cells.

To reproduce:

```sh
python3 -I scripts/diag/pass-operators/finish_split.py nfl.jsonl.gz sim.jsonl.gz
python3 -I scripts/diag/pass-operators/finish_split.py --runs nfl.jsonl.gz sim.jsonl.gz
```
