# SDD ledger — plan: docs/superpowers/plans/2026-08-04-staging-infra-trim.md
Task 1: BLOCKED — branch stale, missing origin/staging tip 02ddeb3 (38 commits)
Task 1: controller resolved — merged origin/staging (clean, disjoint files); currency check now OK
Task 1: complete (baseline captured /tmp/atlaes-baseline.txt; proxy=baxmckeu available, bastion=i-05276e3a510a4abfd, health 200 healthy, peak DatabaseConnections=2.0)
Task 2: complete (commits 70610d8..2ebf36b, review clean — spec OK, quality approved)
Task 2: minor (deferred): implementer report misattributes Task 1 STALE verdict as false alarm; controller merge 70610d8 was the real cause. No defect.
Task 2: minor (deferred): CI run took 35m39s vs typical 2-3min; slow RDS Proxy deletion, verified as real progress not a hang.
Task 2: RESULT — RDS Proxy destroyed. -$26.78/mo pre-tax (-$31.87 incl VAT). health 200, DatabaseConnections peak 1.0
Task 3: commit 14945e8 pushed to staging; CI run 30873969205 in progress. Implementer returned early without verifying (dispatched its own background poll); controller is waiting on CI then will verify.
Task 3: complete (commits 2ebf36b..14945e8, review clean — spec OK, quality approved)
Task 3: minor (deferred): implementer returned early before verifying; controller resumed it. No quality impact.
Task 3: minor (deferred): resources/network/index.ts lacks trailing newline (pre-existing).
Task 3: RESULT — bastion i-05276e3a510a4abfd terminated. -$3.57/mo + ~$3.72 IPv4 (-$8.67 incl VAT). health 200, 0 running EC2.
Task 4: NOTE — only 2 orphaned ENIs exist (mmnutsum), not the 4 the brief predicts. baxmckeu teardown was clean.
Task 4: complete (no commits — AWS cleanup only). 2 ENIs deleted, 2 stagin buckets deleted, 0 orphans remain. Controller independently verified end state.
Task 5: memory written (staging-cost-baseline.md + MEMORY.md pointer).
Task 5: PLAN DEFECT — Step 5 says open a PR to main. Our commits are already on origin/staging (deployed); origin/staging is 42 commits ahead of main, so a PR to main = full staging->main promotion, not our 2-line change. PR NOT created; surfaced to owner as a separate decision.
FINAL REVIEW: Approved. Net diff = 2 lines, matches spec. No repo reference to proxy/bastion/tunnel remains. Local dev path intact.
FINAL: all 4 deferred minors triaged "can stand".
FINAL: Important pre-existing (NOT caused by this work) — staging Stripe webhook Lambda crashing at module init since 2026-07-06: "ADMIN_MIGRATION_TOKEN must be set to a real secret in production". env.ts validates full Zod schema at import; Lambda never reached DB.
FINAL: hazard — origin/main is 42 commits behind and lacks proxy:false + bastion removal. Deploying from main would resurrect both (~$30/mo). Staging->main promotion is separate work.
