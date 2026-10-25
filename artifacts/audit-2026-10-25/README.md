# Audit source archives

Published at Tanner’s request so other agents can retrieve the complete audit, next-week plan, previous assignments and push/readiness experiment. This evidence-only branch is not intended for merging into develop. Human-readable proposals are published separately in the documentation PR.

Original bytes are preserved; source dates and qualifications remain historical. MANIFEST.json records bytes and SHA256. These archives do not make pending branches accepted or turn author-reported results into independent reproductions.

The push probe lives under out/push-readiness in its ZIP; extract it into an exact 50b80062815716b902438f9a7fa227535a255ea0 checkout with Node22.23.3 and dependencies, then run node --import tsx out/push-readiness/probe.ts. The full original audit includes REPRODUCE.md and its evidence.
