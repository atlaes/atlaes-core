# Staging Infrastructure Trim — Design

**Date:** 2026-08-04
**Status:** Approved for implementation
**Goal:** Cut the `atlaes` staging AWS bill from ~$116/mo to ~$75/mo (35%) by removing
infrastructure the staging workload does not use.

## Background

The `atlaes` AWS account (`112530848512`, eu-central-1) bills ~$116/mo and has done so
flatly since April 2026 — fixed infrastructure, not usage-driven. Of 140 tagged
resources, 130 are `staging`. There is no running production workload.

July 2026 costs, verified against Cost Explorer usage types. The table below sums to
$115.82 against a $115.91 invoice; the $0.09 gap is line items under $0.10 omitted for
readability:

| Cost | $/mo | Created by |
|---|---:|---|
| RDS Proxy | 26.78 | `proxy: true` — `resources/database/index.ts:5` |
| ALB | 20.09 | `loadBalancer` — `resources/services/index.ts:73` |
| Public IPv4 × 4 | 14.90 | 2× ALB, 1× bastion, 1× Fargate task |
| RDS `db.t4g.micro` | 14.14 | `sst.aws.Postgres` |
| Fargate vCPU + memory | 10.56 | backend service (256 CPU / 512 MB) |
| EC2 `t4g.nano` | 3.57 | `bastion: true` — `resources/network/index.ts:1` |
| RDS storage + backup | 3.03 | 20 GB gp3 |
| S3 / Secrets / Route53 / EBS / CodeBuild | 4.25 | misc |
| VAT 19% | 18.50 | |
| **Total** | **115.82** | |

63% of the pre-tax bill is plumbing (proxy + ALB + public IPs) rather than workload.

## Decisions and rationale

### 1. Remove RDS Proxy — saves $31.87/mo incl. VAT

The proxy costs **1.9× the database it fronts**. RDS Proxy bills per instance vCPU with
a 2-vCPU floor, so on a `db.t4g.micro` it is a flat ~$0.037/hr whether or not anything
connects.

RDS Proxy exists to stop connection storms from exhausting an instance's limit. This
workload cannot produce one:

- `packages/functions/src/utils/db.ts:8` opens `postgres(connectionString, { max: 10 })` —
  10 connections for the single Fargate task.
- The Stripe webhook Lambda (`resources/events/index.ts`) adds ~10 per warm execution
  environment, triggered only on `checkout.session.completed` — low volume.
- `db.t4g.micro` (1 GB) permits ~112 connections via RDS's
  `LEAST(DBInstanceClassMemory/9531392, 5000)` formula.

Realistic peak is ~40 connections against a ~112 limit — roughly 3× headroom.

**Why this is a one-line change:** `packages/functions/src/utils/env.ts:13-16` builds
`DATABASE_URL` at runtime by parsing `SST_RESOURCE_AtlaesDatabase` and interpolating
`dbResource.host`. SST populates that host from the link target, so flipping the flag
swaps the proxy endpoint for the instance endpoint with no application change. A repo
grep confirms no hardcoded `*.rds.amazonaws.com` endpoint anywhere in
`packages/`, `.github/`, or `resources/`.

### 2. Remove the VPC bastion — saves $8.67/mo incl. VAT

The unidentified `t4g.nano` (`i-05276e3a510a4abfd`, public IP 18.196.59.37) is the SST
VPC bastion. It has no `Name` tag because SST does not set one, which is why prior
analysis could not attribute it. Cost is $3.57 (instance) + ~$3.72 (public IPv4).

Its only purpose is `sst tunnel` — reaching the staging database from a developer
laptop. It is not used by CI: the only repo reference to `bastion` is its own definition,
and schema migrations run through `POST /api/migrations/run` over HTTPS, not the tunnel.
Local development uses Docker Postgres (the `dev:` block in
`resources/database/index.ts`), so the bastion is idle except for occasional manual
database inspection.

Re-adding it is a one-line deploy when needed.

### 3. Do NOT remove the Fargate task's public IP

`assignPublicIp: ENABLED` on the ECS service looks like a $3.72/mo saving but is
load-bearing. SST places the service in public subnets so it can reach Mistral, Stripe,
SES, and the Lettershop SFTP host directly. Moving it to private subnets would require a
NAT Gateway at ~$32/mo plus data processing — a 9× increase. **Explicitly out of scope.**

### 4. Rejected alternatives

**Off-hours scheduling.** Only Fargate ($10.56), the RDS instance ($14.14), and the
bastion ($3.57) can stop — $28.27/mo total. The ALB, all public IPs, RDS Proxy, and
storage bill 24/7 regardless. At 50% downtime this saves ~$14/mo, not the $60–70
previously estimated. It also breaks staging for testers and needs a babysitting Lambda,
because stopped RDS instances auto-restart after 7 days. Poor value.

**Migrating the Hono backend from Fargate+ALB to Lambda.** Would save a further ~$45/mo
by eliminating the ALB, Fargate, and two ALB public IPs. Deferred: it is a genuine
migration requiring validation of cold starts, bundle size, VPC-attached Lambda
networking, and the OCR/PDF/SFTP paths — against the client project's only working
environment. May be revisited as a separate spec.

## Scope of work

### Code changes (2 lines, 2 files)

1. `resources/database/index.ts:5` — `proxy: true` → `proxy: false`
2. `resources/network/index.ts:1` — remove `{ bastion: true }`, leaving `new sst.aws.Vpc('AtlaesVpc')`

### Out-of-band cleanup (AWS CLI, no code)

3. Delete 2 orphaned ENIs left by the already-deleted proxy `...proxy-mmnutsum`. Both are
   status `available` with no attachment and no Elastic IP, so they cost nothing — this is
   hygiene, not savings.
4. Delete the 2 S3 buckets from the typo'd `stagin` stage, after confirming they are empty
   or contain only build assets:
   - `atlaes-stagin-vblappassetsbucket-wudmszkf`
   - `atlaes-stagin-atlaeswebsiteassetsbucket-homrohnn`

### Flagged, not actioned

These are reported to the user for a decision rather than deleted, because deleting them
is not unambiguously safe:

- **`production` stage (3 resources)** — 2 S3 asset buckets and 1 ECS task definition,
  left by an abandoned production deploy. No production ECS service or cluster exists.
  Task definitions are free; the buckets hold a little storage.
- **`kael` stage (5 resources)** — a personal developer stage (S3 buckets, a
  `VBLAppDevServerFunction` Lambda, a log group). May still be in active use by its owner.

Combined S3 storage across the whole account is $1.31/mo, so cleanup savings here are
negligible. The value is hygiene and avoiding future confusion.

## Rollout

Deploy via the existing pipeline: pushing to the `staging` branch triggers the
`deploy-staging.yml` GitHub Actions workflow.

**Branch hygiene is critical.** Deploying from a stale branch has previously rolled back
staging infrastructure and unlinked SST secrets (`MistralApiKey`,
`LettershopSftpPassword`). Confirm the branch contains current `main` before pushing, and
check `gh run list --branch staging` afterwards — a failed run means staging did not
update.

If deploying manually instead, run from the repository root with the correct profile:

```
AWS_PROFILE=atlaes npx sst deploy --stage staging
```

Never from `packages/functions/`, and never without `AWS_PROFILE=atlaes`.

## Verification

Infrastructure:
- `aws rds describe-db-proxies` returns no proxies
- `aws ec2 describe-instances` shows no running `t4g.nano`
- `aws ec2 describe-addresses` and instance public IPs total 3, down from 4

Application:
- `GET https://staging.api.atlaes.de/health` reports the database healthy (backed by
  `checkDatabaseConnection()` in `packages/functions/src/utils/db.ts`)
- One authenticated, database-backed API route returns real data
- A Stripe test-mode `checkout.session.completed` event still writes to the database,
  confirming the VPC-attached Lambda connects directly without the proxy

Billing (deferred, next cycle):
- `RDS:ProxyUsage` and `BoxUsage:t4g.nano` no longer appear in Cost Explorer usage types
- `PublicIPv4:InUseAddress` drops from 4 addresses to 3

## Rollback

Revert both lines and redeploy. RDS Proxy recreation takes ~5–10 minutes.

No data is at risk: both changes leave the database instance, its 20 GB of storage, and
its automated backups untouched. The proxy is a connection front-end only, and the
bastion holds no state.

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Brief connection interruption while the proxy is destroyed | Low | Staging only; no production traffic |
| Loss of `sst tunnel` database access | Low | Migrations run over HTTPS; re-add bastion with a one-line deploy |
| Deploying from a stale branch rolls back infra/secrets | **High** | Verify branch currency before push; check `gh run list` after |
| Connection exhaustion without the proxy | Low | ~40 peak vs ~112 limit; monitor `DatabaseConnections` after deploy |

## Expected outcome

$115.91/mo → **~$75/mo**, a 35% reduction (~$490/yr), from two lines of configuration.
