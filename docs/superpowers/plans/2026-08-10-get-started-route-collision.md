# Get Started Route Collision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the staging `/get-started` page by removing the SST public-asset route collision and prevent the same deployment failure from recurring.

**Architecture:** Keep public images on S3, but place them below the neutral top-level `/assets` prefix so CloudFront does not shadow an application route. Add a Node test that derives the VBL app's top-level URL segments from `app/**/page.*`, compares them with top-level public directories, and fails the build on any collision.

**Tech Stack:** Next.js 14 App Router, SST `Nextjs`, Node.js test runner, pnpm

---

## File Structure

- Create `apps/vbl/tests/public-route-collisions.test.mjs`: routing invariant test with no third-party dependencies.
- Modify `apps/vbl/package.json`: expose the invariant test and run it before every production build.
- Move `apps/vbl/public/get-started/*` to `apps/vbl/public/assets/get-started/*`: preserve image contents under a safe top-level prefix.
- Modify `apps/vbl/components/vbl/get-started/steps/EmploymentType.tsx`: reference the relocated images.

### Task 1: Add the failing public-route collision test

**Files:**
- Create: `apps/vbl/tests/public-route-collisions.test.mjs`
- Modify: `apps/vbl/package.json`

- [ ] **Step 1: Write the failing test**

Create `apps/vbl/tests/public-route-collisions.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(testDir, '../app');
const publicDir = resolve(testDir, '../public');

function collectTopLevelRouteSegments(directory, routeSegments = [], found = new Set()) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const hasPage = entries.some(
    (entry) => entry.isFile() && /^page\.(js|jsx|ts|tsx)$/.test(entry.name)
  );

  if (hasPage && routeSegments.length > 0) {
    found.add(routeSegments[0]);
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;

    const isRouteGroup = /^\(.+\)$/.test(entry.name);
    const isParallelRoute = entry.name.startsWith('@');
    const nextSegments =
      isRouteGroup || isParallelRoute
        ? routeSegments
        : [...routeSegments, entry.name];

    collectTopLevelRouteSegments(
      resolve(directory, entry.name),
      nextSegments,
      found
    );
  }

  return found;
}

test('top-level public directories do not shadow application routes', () => {
  const publicDirectories = readdirSync(publicDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const routeSegments = collectTopLevelRouteSegments(appDir);
  const collisions = publicDirectories
    .filter((directory) => routeSegments.has(directory))
    .sort();

  assert.deepEqual(
    collisions,
    [],
    `SST routes top-level public directories to S3, shadowing these app routes: ${collisions.join(', ')}`
  );
});
```

Add these scripts to `apps/vbl/package.json`:

```json
"build": "pnpm test:routing && NODE_ENV=production next build",
"test:routing": "node --test tests/public-route-collisions.test.mjs"
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run:

```bash
pnpm --filter vbl test:routing
```

Expected: one failed test naming `get-started` as the colliding route.

- [ ] **Step 3: Commit the regression test**

```bash
git add apps/vbl/package.json apps/vbl/tests/public-route-collisions.test.mjs
git commit -m "test(vbl): detect public directories that shadow routes"
```

### Task 2: Relocate the get-started assets

**Files:**
- Move: `apps/vbl/public/get-started/pension-type-arrow.svg` to `apps/vbl/public/assets/get-started/pension-type-arrow.svg`
- Move: `apps/vbl/public/get-started/pension-type-bav.png` to `apps/vbl/public/assets/get-started/pension-type-bav.png`
- Move: `apps/vbl/public/get-started/pension-type-public.svg` to `apps/vbl/public/assets/get-started/pension-type-public.svg`
- Move: `apps/vbl/public/get-started/pension-type-stage.svg` to `apps/vbl/public/assets/get-started/pension-type-stage.svg`
- Modify: `apps/vbl/components/vbl/get-started/steps/EmploymentType.tsx`

- [ ] **Step 1: Move the four files with Git**

```bash
mkdir -p apps/vbl/public/assets/get-started
git mv apps/vbl/public/get-started/* apps/vbl/public/assets/get-started/
```

- [ ] **Step 2: Update the four public URLs**

Replace the four `/get-started/pension-type-*` strings in `EmploymentType.tsx` with:

```tsx
icon: '/assets/get-started/pension-type-bav.png',
icon: '/assets/get-started/pension-type-public.svg',
icon: '/assets/get-started/pension-type-stage.svg',
src="/assets/get-started/pension-type-arrow.svg"
```

- [ ] **Step 3: Run the routing test and verify it passes**

Run:

```bash
pnpm --filter vbl test:routing
```

Expected: one passing test and no failures.

- [ ] **Step 4: Confirm every referenced asset exists**

Run:

```bash
for asset in $(rg -o "'/assets/get-started/[^']+'|\"/assets/get-started/[^\"]+\"" apps/vbl/components/vbl/get-started/steps/EmploymentType.tsx | tr -d "'\""); do
  test -f "apps/vbl/public$asset" || exit 1
done
```

Expected: exit code 0 with no output.

- [ ] **Step 5: Commit the fix**

```bash
git add apps/vbl/components/vbl/get-started/steps/EmploymentType.tsx apps/vbl/public/assets/get-started apps/vbl/public/get-started
git commit -m "fix(vbl): prevent get-started asset route collision"
```

### Task 3: Verify the production build and route output

**Files:**
- No additional changes.

- [ ] **Step 1: Install the locked dependencies**

Run:

```bash
pnpm install --frozen-lockfile
```

Expected: exit code 0.

- [ ] **Step 2: Build the VBL application**

Run:

```bash
pnpm --filter vbl build
```

Expected: exit code 0; the build's route table includes `/get-started`.

- [ ] **Step 3: Inspect the final diff and repository state**

Run:

```bash
git diff origin/staging...HEAD --check
git diff origin/staging...HEAD --stat
git status --short --branch
```

Expected: no whitespace errors; only the design, plan, test, package script, image relocation, and four URL changes appear.

- [ ] **Step 4: Deploy and perform live verification**

After this branch reaches `staging`, run:

```bash
curl -sS -D - -o /dev/null https://staging.vbl.atlaes.de/get-started
curl -sS -D - -o /dev/null https://staging.vbl.atlaes.de/assets/get-started/pension-type-public.svg
```

Expected: `/get-started` returns `200`, `content-type: text/html`, and `x-powered-by: Next.js`; the asset returns `200` with an image content type.
