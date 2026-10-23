"""Accepted penalty clauses in final NFL/nflverse play descriptions.

The singular penalty_type field omits later accepted fouls. Descriptions also
retain overturned pre-review narratives, declined calls, offsetting calls and
superseded calls. Keep those distinctions rather than counting every mention.
"""
import re


CANONICAL_TYPES = (
    "offensiveHolding", "falseStart", "defensiveOffside", "neutralZoneInfraction",
    "encroachment", "defensivePassInterference", "defensiveHolding", "illegalContact",
    "roughingPasser", "unnecessaryRoughness", "faceMask", "delayOfGame",
    "intentionalGrounding", "other",
)

TYPE_MAP = {
    "offensive holding": "offensiveHolding",
    "false start": "falseStart",
    "defensive offside": "defensiveOffside",
    "neutral zone infraction": "neutralZoneInfraction",
    "encroachment": "encroachment",
    "defensive pass interference": "defensivePassInterference",
    "defensive holding": "defensiveHolding",
    "illegal contact": "illegalContact",
    "roughing the passer": "roughingPasser",
    "unnecessary roughness": "unnecessaryRoughness",
    "face mask": "faceMask",
    "delay of game": "delayOfGame",
    "defensive delay of game": "delayOfGame",
    "intentional grounding": "intentionalGrounding",
}

# Other named infractions observed in the pinned 2022/2023 REG inputs. New
# unrecognized names still count as accepted "other" but are audited unresolved.
OTHER_TYPES = {
    "chop block", "clipping", "defensive too many men on field", "delay of kickoff",
    "disqualification", "fair catch interference", "horse collar tackle", "illegal bat",
    "illegal blindside block", "illegal block above the waist", "illegal crackback",
    "illegal double-team block", "illegal formation", "illegal forward pass",
    "illegal kick/kicking loose ball", "illegal motion", "illegal peelback",
    "illegal shift", "illegal substitution", "illegal touch kick", "illegal touch pass",
    "illegal use of hands", "ineligible downfield kick", "ineligible downfield pass",
    "invalid fair catch signal", "kick catch interference", "leaping", "leverage",
    "low block", "lowering the head to make forcible contact", "offensive offside",
    "offensive pass interference", "offensive too many men on field", "offside on free kick",
    "player out of bounds on kick", "roughing the kicker", "running into the kicker",
    "taunting", "tripping", "unsportsmanlike conduct",
}

TEAMS = {
    "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN", "DET",
    "GB", "HOU", "IND", "JAX", "KC", "LA", "LAC", "LV", "MIA", "MIN", "NE",
    "NO", "NYG", "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS",
}

CLAUSE_START = re.compile(r"\bpenalty on\b", re.IGNORECASE)
REVERSED = re.compile(r"\bplay was REVERSED\.\s*", re.IGNORECASE)
CLAUSE = re.compile(r"\s*([A-Z]{2,3})(?:-[^,]*)?,\s*([^,]+),\s*(.*)", re.DOTALL)
STATUS = re.compile(r"\b(enforced|declined|offsetting|superseded)\b", re.IGNORECASE)


def parse_penalties(row):
    """Return accepted events plus declined/offsetting/superseded/unknown audits.

    Unresolved counts clauses lacking a complete team/type/acceptance identity,
    not a guessed number of accepted penalties. If acceptance is explicit but
    team or type is unknown, retain an accepted event with team=None or type=other
    and mark that clause unresolved. Do not use this to certify unseen infractions.
    """
    result = {"events": [], "declined": 0, "offsetting": 0, "superseded": 0, "unresolved": 0}
    # NFL descriptions may concatenate the initial ruling and its replacement.
    # The last reversal supplies the final narrative; matching old clauses would
    # double-count retained calls and count calls rescinded by the review.
    desc = REVERSED.split(row.get("desc") or "")[-1]
    starts = list(CLAUSE_START.finditer(desc))
    flagged = str(row.get("penalty", "")).lower() in ("1", "1.0", "true")
    if not starts:
        # Unflagged timeout notes can mention an earlier penalty/runoff without
        # containing a new penalty event. A flagged row needs an actual clause.
        if flagged:
            result["unresolved"] += 1
        return result
    clubs = {row.get("home_team"), row.get("away_team")} - {None, ""}
    for i, start in enumerate(starts):
        end = starts[i + 1].start() if i + 1 < len(starts) else len(desc)
        text = desc[start.end():end]
        clause = CLAUSE.fullmatch(text)
        if clause is None:
            result["unresolved"] += 1
            continue
        team, raw_type, tail = clause.groups()
        status = STATUS.search(tail)
        if status is None:
            result["unresolved"] += 1
            continue
        status = status.group(1).lower()
        if status != "enforced":
            result[status] += 1
            continue
        # The first disposition matters: an accepted grounding clause can be
        # followed by a sentence saying a team declined the ten-second runoff.
        raw_type = " ".join(raw_type.lower().split())
        unknown = False
        if team not in (clubs or TEAMS):
            team = None
            unknown = True
        kind = TYPE_MAP.get(raw_type, "other")
        if raw_type not in TYPE_MAP and raw_type not in OTHER_TYPES:
            unknown = True
        result["events"].append({"team": team, "type": kind})
        result["unresolved"] += int(unknown)
    return result
