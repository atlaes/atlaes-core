# Staging Infrastructure Trim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut the `atlaes` staging AWS bill from ~$116/mo to ~$75/mo by removing the RDS Proxy and VPC bastion, then clearing orphaned resources.

**Architecture:** Two single-line changes to SST resource definitions, deployed separately so each can be verified in isolation. The application code is not touched — `packages/functions/src/utils/env.ts` resolves the database host at runtime from the SST link, so removing the proxy transparently repoints the app at the instance endpoint. Cleanup of orphaned ENIs and typo-stage S3 buckets runs afterwards via AWS CLI with no deploy.

**Tech Stack:** SST v3 (Pulumi-based) on AWS eu-central-1, PostgreSQL 16.6 on RDS, ECS Fargate, GitHub Actions, AWS CLI v2.

**Spec:** `docs/superpowers/specs/2026-08-04-staging-infra-trim-design.md`

## Global Constraints

- **AWS profile is mandatory:** every AWS CLI and SST command must run with `AWS_PROFILE=atlaes`. Without it the default profile targets the wrong account.
- **Region is `eu-central-1`** for all AWS CLI calls.
- **SST commands run from the repository root only**, never from `packages/functions/`. Use `npx sst` directly, not `pnpm sst:deploy` (that script changes the working directory).
- **Never `git stash`** in this repository — the stash is shared across worktrees.
- **Deploy only from a branch containing current `origin/staging`.** Deploying from a stale branch has previously rolled back staging infrastructure and unlinked SST secrets (`MistralApiKey`, `LettershopSftpPassword`).
- **Do not remove `assignPublicIp` from the Fargate service.** It looks like a $3.72/mo saving but forces a ~$32/mo NAT Gateway.
- **Do not delete anything tagged `sst:stage=production` or `sst:stage=kael`.** Those are flagged for the user's decision, not for this plan.
- `tsc` and `eslint` are broken repo-wide and there are ~29 pre-existing test failures. Do not treat these as regressions caused by this work.
- The `.husky/pre-commit` hook is not executable and will be skipped with a hint. This is expected.

## Testing note — how "tests" work in this plan

This is an infrastructure change, so there is no unit-test cycle. The TDD rhythm is
preserved in a different form: each task first **captures the assertion that must hold**,
then applies the change, then **runs that assertion against real AWS** and compares to the
recorded baseline. Do not skip the baseline capture — post-change verification is
meaningless without it.

---

### Task 1: Capture baseline and verify branch currency

Establishes the "before" state that Tasks 2 and 3 verify against, and confirms it is safe
to deploy from this branch.

**Files:**
- Create: `/tmp/atlaes-baseline.txt` (scratch, not committed)

**Interfaces:**
- Produces: a baseline file recording proxy existence, bastion instance ID, public IPv4 count, and a healthy `/api/health` response. Tasks 2, 3 and 5 read this to confirm changes landed.

- [ ] **Step 1: Confirm the working branch contains current `origin/staging`**

```bash
cd /Users/kael/Code/freelancing/Atlaes/.claude/worktrees/company-pension-page-design-7d4b5e
git fetch origin
git log --oneline -1 origin/staging
git merge-base --is-ancestor origin/staging HEAD && echo "OK: branch contains origin/staging" || echo "STALE: must merge origin/staging first"
```

Expected: `OK: branch contains origin/staging`.

If it prints `STALE`, stop and merge before continuing:

```bash
git merge origin/staging
```

Resolve any conflicts, then re-run the `merge-base` check until it prints `OK`.

- [ ] **Step 2: Capture the infrastructure baseline**

```bash
export AWS_PROFILE=atlaes AWS_REGION=eu-central-1
{
  echo "=== BASELINE $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
  echo "--- RDS proxies ---"
  aws rds describe-db-proxies --query 'DBProxies[].[DBProxyName,Status]' --output text
  echo "--- running EC2 ---"
  aws ec2 describe-instances \
    --query 'Reservations[].Instances[?State.Name==`running`].[InstanceId,InstanceType,PublicIpAddress]' \
    --output text
  echo "--- public IPv4 count ---"
  aws ec2 describe-addresses --query 'length(Addresses)' --output text
  echo "--- available (orphaned) ENIs ---"
  aws ec2 describe-network-interfaces --filters Name=status,Values=available \
    --query 'NetworkInterfaces[].[NetworkInterfaceId,Description]' --output text
} | tee /tmp/atlaes-baseline.txt
```

Expected to record: one proxy `atlaes-staging-atlaesdatabaseproxy-baxmckeu` with status
`available`; one running `t4g.nano`; 2 Elastic IPs (the ALB pair — note the billed count of
4 also includes the bastion's and the Fargate task's auto-assigned IPs, which do not appear
in `describe-addresses`); and 2 orphaned ENIs from `...proxy-mmnutsum`.

- [ ] **Step 3: Capture the application baseline**

```bash
curl -s https://staging.api.atlaes.de/api/health | tee -a /tmp/atlaes-baseline.txt
echo
curl -s -o /dev/null -w 'HTTP %{http_code}\n' https://staging.api.atlaes.de/api/health
```

Expected: `HTTP 200` and a JSON body where `.services.database.status` is `"healthy"`.

**If this is not healthy before you start, stop.** You cannot distinguish a pre-existing
outage from damage caused by this change.

- [ ] **Step 4: Record the current connection count for comparison**

```bash
export AWS_PROFILE=atlaes AWS_REGION=eu-central-1
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=atlaes-staging-atlaesdatabaseinstance-twvfsmck \
  --start-time "$(date -u -v-2H +%Y-%m-%dT%H:%M:%SZ)" \
  --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --period 300 --statistics Maximum \
  --query 'sort_by(Datapoints,&Timestamp)[-6:].[Timestamp,Maximum]' --output text | tee -a /tmp/atlaes-baseline.txt
```

Expected: a handful of datapoints, each well under 112. Note the maximum — Task 2 compares
against it.

No commit for this task; it produces only scratch state.

---

### Task 2: Remove the RDS Proxy

The higher-risk of the two changes, deployed alone so a failed health check unambiguously
identifies the cause.

**Files:**
- Modify: `resources/database/index.ts:5`

**Interfaces:**
- Consumes: `/tmp/atlaes-baseline.txt` from Task 1.
- Produces: staging running without an RDS Proxy; the backend connecting directly to `atlaes-staging-atlaesdatabaseinstance-twvfsmck`. Task 4 sweeps the ENIs this leaves behind.

- [ ] **Step 1: Record the assertion that must hold after this change**

The proxy list must become empty and `/api/health` must stay 200. Confirm the current
(pre-change) state contradicts the first half, proving the check is meaningful:

```bash
export AWS_PROFILE=atlaes AWS_REGION=eu-central-1
aws rds describe-db-proxies --query 'length(DBProxies)' --output text
```

Expected now: `1`. After the deploy this must read `0`.

- [ ] **Step 2: Make the change**

In `resources/database/index.ts`, change line 5 from `proxy: true` to `proxy: false`.

The file becomes:

```typescript
import { vpc } from '../network';
   // PostgreSQL Database
export const postgres = new sst.aws.Postgres('AtlaesDatabase', {
      vpc,
      proxy: false,
      version: '16.6',
      dev: {
        username: 'vbl_user',
        password: 'vbl_password',
        database: 'vbl_development',
        port: 5432,
        host: 'localhost',
      },
    });
```

- [ ] **Step 3: Commit**

```bash
git add resources/database/index.ts
git commit -m "chore(infra): drop RDS Proxy from staging

The proxy costs \$26.78/mo, 1.9x the db.t4g.micro it fronts, and bills a
flat per-vCPU rate with a 2-vCPU floor whether or not anything connects.

It is unnecessary here: the single Fargate task opens a pool of 10 and
the low-volume Stripe webhook Lambda adds ~10 per warm environment,
against a ~112 connection limit. env.ts resolves the DB host at runtime
from the SST link, so no application change is needed."
```

- [ ] **Step 4: Deploy**

```bash
git push origin HEAD:staging
```

This triggers the `deploy-staging.yml` GitHub Actions workflow.

- [ ] **Step 5: Wait for the deploy and confirm it succeeded**

```bash
gh run list --branch staging --limit 3
```

Wait until the newest run shows `completed  success`. Watch it live if preferred:

```bash
gh run watch
```

**A failed run means staging did not update.** Read the logs before proceeding:

```bash
gh run view --log-failed
```

- [ ] **Step 6: Verify the proxy is gone**

```bash
export AWS_PROFILE=atlaes AWS_REGION=eu-central-1
aws rds describe-db-proxies --query 'length(DBProxies)' --output text
```

Expected: `0`.

- [ ] **Step 7: Verify the application still reaches the database**

```bash
curl -s -o /dev/null -w 'HTTP %{http_code}\n' https://staging.api.atlaes.de/api/health
curl -s https://staging.api.atlaes.de/api/health
```

Expected: `HTTP 200`, and `.services.database.status` equal to `"healthy"`.

This endpoint executes `SELECT 1` through the real connection pool
(`packages/functions/src/utils/db.ts`), so a 200 proves the backend is talking to the
instance endpoint directly.

If it returns 503, the Fargate task may still be rolling. Wait 2 minutes and retry. If it
is still 503, roll back — see Step 10.

- [ ] **Step 8: Verify connection counts are sane**

```bash
export AWS_PROFILE=atlaes AWS_REGION=eu-central-1
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=atlaes-staging-atlaesdatabaseinstance-twvfsmck \
  --start-time "$(date -u -v-30M +%Y-%m-%dT%H:%M:%SZ)" \
  --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --period 300 --statistics Maximum \
  --query 'sort_by(Datapoints,&Timestamp)[-6:].[Timestamp,Maximum]' --output text
```

Expected: maximum comfortably under 112, in the same range as the Task 1 baseline
(roughly 10–40). A number climbing toward 100 indicates a connection leak — roll back.

- [ ] **Step 9: Verify a real database-backed route**

The health check only runs `SELECT 1`. Confirm a route that reads actual tables:

```bash
curl -s -o /dev/null -w 'HTTP %{http_code}\n' https://staging.api.atlaes.de/api/vbl/pending-calculator-sessions
```

Expected: any of `200`, `401`, or `403` — all prove the request reached application logic.
A `500` or `502` indicates a database failure and requires rollback.

- [ ] **Step 10: Rollback procedure (only if verification failed)**

```bash
git revert --no-edit HEAD
git push origin HEAD:staging
gh run watch
```

Proxy recreation takes ~5–10 minutes. No data is at risk — the instance, its storage, and
its backups are untouched by this change.

---

### Task 3: Remove the VPC bastion

**Files:**
- Modify: `resources/network/index.ts:1`

**Interfaces:**
- Consumes: a verified-healthy staging from Task 2.
- Produces: staging with no bastion EC2 instance; `sst tunnel` no longer available.

- [ ] **Step 1: Record the assertion that must hold after this change**

```bash
export AWS_PROFILE=atlaes AWS_REGION=eu-central-1
aws ec2 describe-instances \
  --query 'length(Reservations[].Instances[?State.Name==`running`][])' --output text
```

Expected now: `1`. After the deploy this must read `0`.

- [ ] **Step 2: Make the change**

In `resources/network/index.ts`, remove the `{ bastion: true }` argument from the VPC.

The file becomes:

```typescript
    export const vpc = new sst.aws.Vpc('AtlaesVpc');

    // ECS Cluster for backend services
    export const cluster = new sst.aws.Cluster('AtlaesCluster', { vpc });
```

- [ ] **Step 3: Commit**

```bash
git add resources/network/index.ts
git commit -m "chore(infra): drop VPC bastion from staging

The unattributed t4g.nano was the SST VPC bastion: \$3.57/mo plus ~\$3.72
for its public IPv4. Its only use is 'sst tunnel' for manual database
inspection — CI runs migrations over HTTPS via POST /api/migrations/run,
and local development uses Docker Postgres.

Re-add with { bastion: true } and one deploy when direct DB access is
next needed."
```

- [ ] **Step 4: Deploy**

```bash
git push origin HEAD:staging
gh run watch
```

Wait for `completed  success`.

- [ ] **Step 5: Verify the bastion is gone**

```bash
export AWS_PROFILE=atlaes AWS_REGION=eu-central-1
aws ec2 describe-instances \
  --query 'Reservations[].Instances[?State.Name==`running`].[InstanceId,InstanceType]' --output text
```

Expected: no output (zero running instances).

- [ ] **Step 6: Verify the application is unaffected**

```bash
curl -s -o /dev/null -w 'HTTP %{http_code}\n' https://staging.api.atlaes.de/api/health
```

Expected: `HTTP 200`. The bastion is not in any application path, so this should be
unchanged from Task 2.

- [ ] **Step 7: Rollback procedure (only if verification failed)**

```bash
git revert --no-edit HEAD
git push origin HEAD:staging
gh run watch
```

---

### Task 4: Delete orphaned ENIs and `stagin`-stage buckets

Pure AWS CLI cleanup with no deploy and no cost saving — this is hygiene, so that future
cost analysis is not confused by leftovers.

**Files:** none — no code changes.

**Interfaces:**
- Consumes: completed Tasks 2 and 3 (the proxy teardown in Task 2 creates two *new* orphaned ENIs, so this must run afterwards).

- [ ] **Step 1: List all orphaned ENIs**

```bash
export AWS_PROFILE=atlaes AWS_REGION=eu-central-1
aws ec2 describe-network-interfaces --filters Name=status,Values=available \
  --query 'NetworkInterfaces[].[NetworkInterfaceId,Description]' --output text
```

Expected: four entries — the two pre-existing ones from `...proxy-mmnutsum`
(`eni-01d8ee553c016dfb8`, `eni-007688eb1e221c7c8`) plus two newly orphaned by the
`...proxy-baxmckeu` teardown in Task 2.

**Only delete ENIs whose description contains `DBProxy`.** Anything else is unexpected —
stop and investigate rather than deleting it.

- [ ] **Step 2: Delete each orphaned DBProxy ENI**

```bash
export AWS_PROFILE=atlaes AWS_REGION=eu-central-1
for eni in $(aws ec2 describe-network-interfaces --filters Name=status,Values=available \
  --query 'NetworkInterfaces[?contains(Description,`DBProxy`)].NetworkInterfaceId' --output text); do
  echo "Deleting $eni"
  aws ec2 delete-network-interface --network-interface-id "$eni"
done
```

- [ ] **Step 3: Verify no orphaned ENIs remain**

```bash
export AWS_PROFILE=atlaes AWS_REGION=eu-central-1
aws ec2 describe-network-interfaces --filters Name=status,Values=available \
  --query 'NetworkInterfaces[].[NetworkInterfaceId,Description]' --output text
```

Expected: no output.

- [ ] **Step 4: Inspect the `stagin` typo-stage buckets before deleting**

```bash
export AWS_PROFILE=atlaes AWS_REGION=eu-central-1
aws s3 ls s3://atlaes-stagin-vblappassetsbucket-wudmszkf --recursive
echo "--- second bucket ---"
aws s3 ls s3://atlaes-stagin-atlaeswebsiteassetsbucket-homrohnn --recursive
```

Expected: the first is empty; the second holds 5 objects, which are static front-end build
assets from a deploy to the mistyped stage name. Neither bucket has versioning enabled.

Confirm the listing shows only build assets (hashed JS/CSS/image filenames) and no
application data before continuing.

- [ ] **Step 5: Delete both buckets**

```bash
export AWS_PROFILE=atlaes AWS_REGION=eu-central-1
aws s3 rb s3://atlaes-stagin-vblappassetsbucket-wudmszkf --force
aws s3 rb s3://atlaes-stagin-atlaeswebsiteassetsbucket-homrohnn --force
```

- [ ] **Step 6: Verify the `stagin` stage is gone**

```bash
export AWS_PROFILE=atlaes AWS_REGION=eu-central-1
aws resourcegroupstaggingapi get-resources --tag-filters Key=sst:stage \
  --query 'ResourceTagMappingList[].[Tags[?Key==`sst:stage`].Value|[0]]' --output text \
  | sort | uniq -c | sort -rn
```

Expected: `staging`, `kael` (5), and `production` (3) remain; `stagin` no longer appears.

Leave `kael` and `production` alone — they are flagged for the user's decision.

---

### Task 5: Confirm savings and record the outcome

**Files:**
- Modify: `/Users/kael/.claude/projects/-Users-kael-Code-freelancing-Atlaes/memory/MEMORY.md`
- Create: `/Users/kael/.claude/projects/-Users-kael-Code-freelancing-Atlaes/memory/staging-cost-baseline.md`

**Interfaces:**
- Consumes: completed Tasks 2–4.

**Sequencing:** Step 1 requires a 24-hour wait for billing data to settle. Do **not** block
on it — run Steps 2 through 5 immediately after Task 4, then return to Step 1 the next day.
Step 1 confirms the saving; it does not gate the work.

- [ ] **Step 1: Confirm the removed line items stopped accruing** *(next day)*

Run this at least 24 hours after Task 3 completes, so a full billing day has passed.
Cost Explorer data lags roughly a day, so an empty or partial result sooner is not a
failure signal — just retry later.

```bash
export AWS_PROFILE=atlaes AWS_REGION=eu-central-1
aws ce get-cost-and-usage \
  --time-period Start=$(date -u -v-1d +%Y-%m-%d),End=$(date -u +%Y-%m-%d) \
  --granularity DAILY --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=USAGE_TYPE \
  --query 'ResultsByTime[0].Groups[].[Keys[0],Metrics.UnblendedCost.Amount]' --output text \
  | sort -k2 -rn
```

Expected: no `EUC1-RDS:ProxyUsage` line and no `EUC1-BoxUsage:t4g.nano` line.
`EUC1-PublicIPv4:InUseAddress` should reflect 3 addresses rather than 4.

- [ ] **Step 2: Write the cost baseline memory file**

Create `staging-cost-baseline.md` with this content:

```markdown
---
name: staging-cost-baseline
description: atlaes staging AWS cost structure and what was trimmed 2026-08-04
metadata:
  type: project
---

atlaes AWS account 112530848512 (eu-central-1) billed ~$116/mo flat from Apr–Jul 2026 for
a staging-only environment. Trimmed to ~$75/mo on 2026-08-04 by setting `proxy: false` in
`resources/database/index.ts` and dropping `bastion: true` from `resources/network/index.ts`.

Key facts for future cost work:
- RDS Proxy cost $26.78/mo — 1.9x the db.t4g.micro it fronted. Unnecessary below ~100
  connections; the app peaks near 40 (pool `max: 10` per Fargate task plus the Stripe
  webhook Lambda).
- The unnamed `t4g.nano` is always the SST VPC bastion (`bastion: true`). SST sets no
  `Name` tag, so it looks like unidentified compute.
- **Do not remove `assignPublicIp` from the Fargate service.** It saves $3.72/mo but forces
  a ~$32/mo NAT Gateway, since SST puts the service in public subnets for outbound access
  to Mistral, Stripe, SES, and the Lettershop SFTP host.
- Off-hours scheduling is poor value: only Fargate ($10.56), the RDS instance ($14.14) and
  the bastion ($3.57) can stop. ALB, public IPs and storage bill 24/7. Real saving is
  ~$14/mo, not the $60–70 once estimated.
- Remaining lever: moving the Hono backend off Fargate+ALB to Lambda would save a further
  ~$45/mo. Deferred as a real migration — see
  `docs/superpowers/specs/2026-08-04-staging-infra-trim-design.md`.
- Still un-audited: `c4l` and `vista-dev` AWS profiles (SSO tokens expired).

See [[atlaes-repo-gotchas]] and [[drizzle-migration-infra]].
```

- [ ] **Step 3: Add the index pointer to MEMORY.md**

Add this line to `MEMORY.md` under the `## VBL Claim PDF / Lettershop` list of pointers:

```markdown
- [Staging cost baseline](staging-cost-baseline.md) — ~$116→~$75/mo trim 2026-08-04; RDS Proxy/bastion removed, why Fargate public IP must stay, scheduling is poor value
```

- [ ] **Step 4: Report the flagged items to the user**

Summarise for a decision — do not act on these:

- `sst:stage=production` (3 resources): 2 S3 asset buckets and 1 ECS task definition from
  an abandoned production deploy. No production cluster or service exists.
- `sst:stage=kael` (5 resources): a personal dev stage including a `VBLAppDevServerFunction`
  Lambda, S3 buckets and a log group.

Combined S3 storage across the account is $1.31/mo, so removing these saves almost nothing.

- [ ] **Step 5: Open the pull request**

```bash
gh pr create --base main \
  --title "chore(infra): trim staging AWS spend ~35%" \
  --body "Removes the RDS Proxy and VPC bastion from staging, cutting the bill from ~\$116/mo to ~\$75/mo.

The proxy cost \$26.78/mo — 1.9x the db.t4g.micro it fronted — and is unnecessary at ~40 peak connections against a ~112 limit. The bastion (the previously unattributed t4g.nano) served only 'sst tunnel'; CI runs migrations over HTTPS.

Also deletes orphaned DBProxy ENIs and two S3 buckets from a typo'd 'stagin' stage.

Verified after deploy: /api/health returns 200 with database healthy, DatabaseConnections in normal range, and a database-backed route reaches application logic.

Spec: docs/superpowers/specs/2026-08-04-staging-infra-trim-design.md
Plan: docs/superpowers/plans/2026-08-04-staging-infra-trim.md"
```

---

## Rollback summary

Both infrastructure changes are revertible with no data risk — the database instance, its
20 GB of storage, and its automated backups are untouched throughout.

| Change | Rollback | Time |
|---|---|---|
| RDS Proxy removed | `proxy: true`, redeploy | ~5–10 min |
| Bastion removed | restore `{ bastion: true }`, redeploy | ~3–5 min |
| ENIs deleted | none needed — they were unattached and free | — |
| `stagin` buckets deleted | none needed — build assets from a mistyped stage | — |
