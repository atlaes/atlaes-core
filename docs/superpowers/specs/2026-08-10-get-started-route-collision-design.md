# Get Started Route Collision Fix

## Problem

Staging returns an Amazon S3 `AccessDenied` response for `/get-started`
instead of rendering the Next.js page. The latest staging change added a
top-level `public/get-started/` directory for four pension-selection images.
SST creates a CloudFront cache behavior for each top-level public directory,
so the new asset prefix sends `/get-started` to the private S3 asset origin.
The bucket has no object at that exact key, and the request never reaches the
Next.js route.

## Design

Move the four images from `public/get-started/` to
`public/assets/get-started/`. Update the four image references in
`EmploymentType.tsx` to use `/assets/get-started/...`.

Add a repository-level regression test that compares top-level directories in
`apps/vbl/public` with public app route segments. The test fails when the same
segment appears in both places. Route groups such as `(marketing)` do not
create URL segments and must be ignored.

## Alternatives Considered

1. Force `/get-started` to render dynamically. This does not remove the
   higher-priority CloudFront public-asset behavior, so it does not address the
   source of the collision.
2. Add a custom CloudFront routing override for `/get-started`. This adds
   infrastructure complexity for four images and leaves the risky directory
   layout in place.
3. Move the assets under a neutral prefix. This is the smallest change and
   follows SST's documented public-asset routing model. This is the selected
   approach.

## Verification

1. Run the new collision test before the move and confirm that it fails on
   `get-started`.
2. Move the images and update all references.
3. Re-run the collision test and the targeted get-started tests.
4. Build the VBL application and confirm that `/get-started` remains in the
   Next.js route manifest.
5. After deployment, request `/get-started` and confirm a `200` Next.js HTML
   response, then request each relocated asset and confirm a `200` image
   response.

## Scope

This change does not alter the eligibility flow, UI, image contents, or API
behavior. It changes only the public URL prefix and adds the routing regression
test.
