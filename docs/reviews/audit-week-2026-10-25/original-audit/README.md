# Gridiron Engine — deeper forensic review

The main recommendation changed: preserve role-specific cognition, repair demonstrated information/action/geometry contracts, and test adaptation again after one or two bounded repair cycles. A universal decision chooser has not yet earned its cost.

- **Start here:** [searchable complete report](Football-Sim-Deep-Audit.html), with the consolidated review, revised A01–A21 plan and seven technical appendices.
- **Print:** [complete PDF with technical appendices](Football-Sim-Deep-Audit-Complete.pdf), or the shorter [review and roadmap PDF](Football-Sim-Deep-Audit.pdf). Both have navigation bookmarks.
- **Source documents:** [REVIEW.md](REVIEW.md), [ROADMAP.md](ROADMAP.md), [REPRODUCE.md](REPRODUCE.md).
- **Film and figure:** [native replay](current-film.html), [mechanism comparison](figures/native-mechanisms.svg).
- **Everything:** [portable archive](Football-Sim-Deep-Audit.zip), including scripts, exact setup inputs, outputs, patches and checksums. Source code, dependencies and external NFL tracking data are not bundled.

Experiments use `c4a03f6463eacb23ce63d01bd32b4f8b547b9bc0`. Final freshness review includes `ccdb69cba81e07c578f607ff1bf8ce0efe2edc68` / PR #246, which adds VIEW-1 documentation only; engine code is identical. These are selected causal investigations and controlled panels, largely based on one exactly reproduced ordinary game. They are not population validation. Production source and approved plans were not edited.

The primary review synthesizes and challenges the specialists rather than merely concatenating their work. Evidence distinguishes defects, causal diagnoses, risks, alternatives and unknowns; failed interventions and adverse transfer cases are retained. Follow the reproduction guide for a selected experiment instead of rerunning everything.
