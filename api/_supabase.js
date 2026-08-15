const https = require('https');
const { URL } = require('url');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// This runs after the trading account already exists, so it must not be able
// to hold the response open. A short ceiling keeps a slow or unreachable
// Supabase from adding meaningful latency to a registration that has already
// succeeded.
const INSERT_TIMEOUT_MS = 5000;

function isConfigured() {
  return !!(SUPABASE_URL && SERVICE_ROLE_KEY);
}

// Inserts a single row via the PostgREST endpoint. Resolves on success and
// rejects on any failure; callers on the registration path are expected to
// swallow the rejection rather than surface it to the client.
function insertRow(table, row) {
  return new Promise((resolve, reject) => {
    if (!isConfigured()) {
      reject(new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured'));
      return;
    }

    let base;
    try {
      base = new URL(SUPABASE_URL);
    } catch (e) {
      reject(new Error('SUPABASE_URL is not a valid URL'));
      return;
    }

    const body = JSON.stringify([row]);
    const options = {
      hostname: base.hostname,
      port: base.port || 443,
      path: `/rest/v1/${encodeURIComponent(table)}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        // Nothing here needs the inserted row echoed back, and not asking for
        // it keeps the client's personal data out of the response entirely.
        Prefer: 'return=minimal'
      }
    };

    let settled = false;
    const fail = (err) => { if (!settled) { settled = true; reject(err); } };
    const done = (value) => { if (!settled) { settled = true; resolve(value); } };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          done({ statusCode: res.statusCode });
        } else {
          // PostgREST puts the reason in the body; carry it so a misnamed
          // column or missing table is diagnosable from the platform log.
          fail(new Error(`Supabase insert failed (${res.statusCode}): ${raw.slice(0, 300)}`));
        }
      });
    });
    req.setTimeout(INSERT_TIMEOUT_MS, () => {
      req.destroy(new Error('Supabase insert timed out'));
    });
    req.on('error', fail);
    req.write(body);
    req.end();
  });
}

module.exports = { insertRow, isConfigured };
