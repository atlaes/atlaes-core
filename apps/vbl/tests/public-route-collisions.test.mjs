import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(testDir, '../app');
const publicDir = resolve(testDir, '../public');

function collectTopLevelRouteSegments(
  directory,
  routeSegments = [],
  found = new Set()
) {
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
