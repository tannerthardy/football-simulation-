698 pass plays (non-screen), 253557 defender-ticks (0.3 s to the release)

## Picture age (s) and line-of-sight state, by defender kind and time since snap (p25 / p50 / p75 of age; share not clear now)
| kind | t | n | age p25 / p50 / p75 | share blocked now |
|---|---|---|---|---|
| CB | 1.0 | 1396 | 0.20 / 0.25 / 0.30 | 0.24 |
| CB | 1.5 | 1396 | 0.20 / 0.25 / 0.40 | 0.17 |
| CB | 2.0 | 1328 | 0.20 / 0.25 / 0.75 | 0.13 |
| CB | 2.5 | 994 | 0.20 / 0.20 / 0.25 | 0.13 |
| NB | 1.0 | 609 | 0.20 / 0.20 / 0.25 | 0.16 |
| NB | 1.5 | 609 | 0.20 / 0.20 / 0.25 | 0.13 |
| NB | 2.0 | 580 | 0.20 / 0.20 / 0.25 | 0.12 |
| NB | 2.5 | 426 | 0.20 / 0.20 / 0.25 | 0.10 |
| S | 1.0 | 1393 | 0.20 / 0.20 / 0.25 | 0.15 |
| S | 1.5 | 1393 | 0.20 / 0.20 / 0.25 | 0.12 |
| S | 2.0 | 1325 | 0.20 / 0.20 / 0.25 | 0.11 |
| S | 2.5 | 991 | 0.20 / 0.20 / 0.25 | 0.10 |
| LB | 1.0 | 1369 | 0.20 / 0.20 / 0.25 | 0.17 |
| LB | 1.5 | 1369 | 0.20 / 0.20 / 0.25 | 0.15 |
| LB | 2.0 | 1298 | 0.20 / 0.20 / 0.25 | 0.15 |
| LB | 2.5 | 979 | 0.20 / 0.20 / 0.25 | 0.12 |

## Perimeter defenders (CB/NB 6+ yd wide of the passer, 0-7 yd deep): age by whether the line is clear now
  clear now: n 25244, age p25/50/75/90 0.20/0.25/0.30/0.60
  blocked now: n 5422, age p25/50/75/90 0.20/0.25/0.40/0.70
  share of perimeter ticks with the line blocked: 0.18
  who blocks (count of blocked ticks involving each):
    O:RT:head: 1292
    O:LT:head: 1239
    D:DE_S:head: 683
    D:DE_W:head: 565
    O:Y:head: 487
    O:RB:head: 454
    O:H:head: 443
    O:X:head: 177
    O:Z:head: 165
    O:RG:head: 111
    O:LG:head: 100
    D:LB_W:head: 58
  ticks with the line CLEAR now but the picture older than 0.5 s: 3187 of 25244 clear ticks (a picture aged by memory after a blackout, or the observation delay)

## Blocked-run length (consecutive ticks blocked) for perimeter defenders, seconds p50 / p90 / max
  n runs 1675: p50 0.10 / p90 0.30 / max 1.10

## Perimeter defenders: what the single head-point ray decides, against a body-wide target (shoulder height, or the head shifted 0.2 yd either side)
  head ray blocked: 0.177; also blocked to the shoulder: 0.177; blocked to the shoulder AND both sides of the head: 0.114
  all defenders (0.8-2.4 s): head ray blocked 0.149, fully blocked 0.074
