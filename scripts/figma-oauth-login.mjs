#!/usr/bin/env node
/**
 * One-shot Figma OAuth authorization-code login.
 *
 * Starts a local callback server, prints an authorize URL for the user to open
 * in a browser where they are already signed in to Figma, then exchanges the
 * returned code for an access token and writes it to .figma-token (gitignored).
 *
 * Usage:
 *   FIGMA_CLIENT_ID=... FIGMA_CLIENT_SECRET=... node scripts/figma-oauth-login.mjs [port]
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const CLIENT_ID = process.env.FIGMA_CLIENT_ID;
const CLIENT_SECRET = process.env.FIGMA_CLIENT_SECRET;
const PORT = Number(process.argv[2] || 8976);
const REDIRECT = `http://localhost:${PORT}/callback`;
const STATE = crypto.randomBytes(12).toString('hex');
const OUT = path.resolve(import.meta.dirname, '..', '.figma-token');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set FIGMA_CLIENT_ID and FIGMA_CLIENT_SECRET.');
  process.exit(2);
}

const authorizeUrl =
  `https://www.figma.com/oauth?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT)}` +
  `&scope=files:read&state=${STATE}&response_type=code`;

console.log('\nOpen this URL in a browser signed in to Figma:\n');
console.log(authorizeUrl);
console.log(`\nListening on ${REDIRECT} …`);
console.log('(If Figma shows a redirect-uri error, this URI is not registered');
console.log(' on the OAuth app — re-run with the correct port.)\n');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (!url.pathname.startsWith('/callback')) {
    res.writeHead(404).end('not found');
    return;
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const err = url.searchParams.get('error');

  const finish = (status, msg) => {
    res.writeHead(status, { 'Content-Type': 'text/plain' }).end(msg);
  };

  if (err) {
    console.error(`Authorization failed: ${err}`);
    finish(400, `Authorization failed: ${err}`);
    return server.close();
  }
  if (state !== STATE) {
    console.error('State mismatch — aborting.');
    finish(400, 'State mismatch');
    return server.close();
  }

  try {
    // Figma expects client credentials via HTTP Basic auth on the token call.
    const body = new URLSearchParams({
      redirect_uri: REDIRECT,
      code,
      grant_type: 'authorization_code',
    });
    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const tokenRes = await fetch('https://api.figma.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const json = await tokenRes.json();
    if (!tokenRes.ok || !json.access_token) {
      console.error(`Token exchange failed: ${JSON.stringify(json)}`);
      finish(500, 'Token exchange failed — see terminal.');
      return server.close();
    }
    fs.writeFileSync(OUT, json.access_token, { mode: 0o600 });
    console.log(`\nAccess token acquired (expires in ${json.expires_in}s).`);
    console.log(`Written to ${OUT}`);
    finish(200, 'Figma authorization complete. You can close this tab.');
  } catch (e) {
    console.error(`Token exchange error: ${e.message}`);
    finish(500, 'Error — see terminal.');
  }
  server.close();
});

server.listen(PORT);
setTimeout(() => {
  console.error('\nTimed out after 10 minutes with no callback.');
  server.close();
  process.exit(1);
}, 600_000).unref();
